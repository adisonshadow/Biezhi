import { AppDataSource } from '../../../config/database';
import { Workflow } from '../../../package/entities/Workflow';
import { WorkflowNode } from '../../../package/entities/WorkflowNode';
import { WorkflowConnection } from '../../../package/entities/WorkflowConnection';
import { Operator } from '../../../package/entities/Operator';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowService {
  /**
   * 创建工作流
   */
  async createWorkflow(data: any): Promise<any> {
    const workflow = new Workflow();
    workflow.id = data.id || `wf_${uuidv4().substring(0, 8)}`;
    workflow.name = data.name;
    workflow.description = data.description || null;
    workflow.version = data.version || null;
    workflow.author = data.author || null;
    workflow.license = data.license || null;
    workflow.category = data.category || null;
    workflow.tags = data.tags ? JSON.stringify(data.tags) : null;

    await AppDataSource.getRepository(Workflow).save(workflow);

    // 创建节点
    if (data.nodes && Array.isArray(data.nodes)) {
      for (const nodeData of data.nodes) {
        const node = new WorkflowNode();
        node.id = nodeData.id || `node_${uuidv4().substring(0, 8)}`;
        node.workflowId = workflow.id;
        node.operatorId = nodeData.operatorId;
        // 纯前端可视化算子可能没有 operatorType，允许为 null
        node.operatorType = nodeData.operatorType || null;
        node.nodeType = nodeData.nodeType || null;
        node.config = nodeData.config ? JSON.stringify(nodeData.config) : null;
        node.positionX = nodeData.positionX || null;
        node.positionY = nodeData.positionY || null;
        await AppDataSource.getRepository(WorkflowNode).save(node);
      }
    }

    // 创建连接
    if (data.connections && Array.isArray(data.connections)) {
      for (const connData of data.connections) {
        const connection = new WorkflowConnection();
        connection.id = connData.id || `conn_${uuidv4().substring(0, 8)}`;
        connection.workflowId = workflow.id;
        connection.fromNodeId = connData.from.node;
        connection.fromPort = connData.from.port;
        connection.toNodeId = connData.to.node;
        connection.toPort = connData.to.port;
        await AppDataSource.getRepository(WorkflowConnection).save(connection);
      }
    }

    return await this.getWorkflowById(workflow.id);
  }

  /**
   * 获取所有工作流
   */
  async listWorkflows(): Promise<any[]> {
    const workflows = await AppDataSource.getRepository(Workflow).find({
      relations: ['nodes', 'connections'],
      order: { createdAt: 'DESC' },
    });
    return workflows.map(wf => this.serializeWorkflow(wf));
  }

  /**
   * 搜索工作流
   */
  async searchWorkflows(query?: string): Promise<any[]> {
    const repository = AppDataSource.getRepository(Workflow);
    const queryBuilder = repository.createQueryBuilder('workflow');

    if (query) {
      queryBuilder.where('workflow.name LIKE :query', { query: `%${query}%` })
        .orWhere('workflow.description LIKE :query', { query: `%${query}%` });
    }

    const workflows = await queryBuilder.getMany();
    return workflows.map(wf => this.serializeWorkflow(wf));
  }

  /**
   * 根据ID获取工作流
   */
  async getWorkflowById(id: string): Promise<any | null> {
    const workflow = await AppDataSource.getRepository(Workflow).findOne({
      where: { id },
      relations: ['nodes', 'connections'],
    });

    if (!workflow) {
      return null;
    }

    return this.serializeWorkflow(workflow);
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(id: string, data: any): Promise<any | null> {
    const workflow = await AppDataSource.getRepository(Workflow).findOne({
      where: { id },
    });

    if (!workflow) {
      return null;
    }

    // 更新工作流基本信息（支持所有字段）
    if (data.name !== undefined) workflow.name = data.name;
    if (data.description !== undefined) workflow.description = data.description;
    if (data.version !== undefined) workflow.version = data.version;
    if (data.author !== undefined) workflow.author = data.author;
    if (data.license !== undefined) workflow.license = data.license;
    if (data.category !== undefined) workflow.category = data.category;
    if (data.tags !== undefined) workflow.tags = data.tags ? JSON.stringify(data.tags) : null;

    await AppDataSource.getRepository(Workflow).save(workflow);

    // 更新节点和连接
    if (data.nodes || data.connections) {
      // 删除旧节点和连接
      await AppDataSource.getRepository(WorkflowConnection).delete({ workflowId: id });
      await AppDataSource.getRepository(WorkflowNode).delete({ workflowId: id });

      // 创建新节点
      const nodeIds = new Set<string>();
      if (data.nodes && Array.isArray(data.nodes)) {
        for (const nodeData of data.nodes) {
          const node = new WorkflowNode();
          node.id = nodeData.id || `node_${uuidv4().substring(0, 8)}`;
          node.workflowId = id;
          node.operatorId = nodeData.operatorId;
          // 纯前端可视化算子可能没有 operatorType，允许为 null
        node.operatorType = nodeData.operatorType || null;
          node.nodeType = nodeData.nodeType || null;
          node.config = nodeData.config ? JSON.stringify(nodeData.config) : null;
          node.positionX = nodeData.positionX || null;
          node.positionY = nodeData.positionY || null;
          await AppDataSource.getRepository(WorkflowNode).save(node);
          nodeIds.add(node.id);
        }
      }

      // 创建新连接（确保引用的节点存在）
      if (data.connections && Array.isArray(data.connections)) {
        for (const connData of data.connections) {
          const fromNodeId = connData.from?.node;
          const toNodeId = connData.to?.node;
          
          // 验证节点ID是否存在
          if (!fromNodeId || !toNodeId) {
            throw new Error(`连接缺少节点ID: from=${fromNodeId}, to=${toNodeId}`);
          }
          
          if (!nodeIds.has(fromNodeId)) {
            throw new Error(`连接引用的源节点不存在: ${fromNodeId}`);
          }
          
          if (!nodeIds.has(toNodeId)) {
            throw new Error(`连接引用的目标节点不存在: ${toNodeId}`);
          }
          
          const connection = new WorkflowConnection();
          connection.id = connData.id || `conn_${uuidv4().substring(0, 8)}`;
          connection.workflowId = id;
          connection.fromNodeId = fromNodeId;
          connection.fromPort = connData.from?.port || 'output';
          connection.toNodeId = toNodeId;
          connection.toPort = connData.to?.port || 'input';
          await AppDataSource.getRepository(WorkflowConnection).save(connection);
        }
      }
    }

    return await this.getWorkflowById(id);
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    // 删除连接
    await AppDataSource.getRepository(WorkflowConnection).delete({ workflowId: id });
    // 删除节点
    await AppDataSource.getRepository(WorkflowNode).delete({ workflowId: id });
    // 删除工作流
    await AppDataSource.getRepository(Workflow).delete({ id });
  }

  /**
   * 验证工作流
   */
  async validateWorkflow(id: string): Promise<any> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const issues: any[] = [];
    const warnings: any[] = [];

    // 检查节点
    const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
    for (const node of workflow.nodes) {
      // 检查operator是否存在
      const operator = await AppDataSource.getRepository(Operator).findOne({
        where: { id: node.operatorId },
      });
      if (!operator) {
        issues.push({
          type: 'missing_operator',
          nodeId: node.id,
          message: `Operator ${node.operatorId} not found`,
        });
      }
    }

    // 检查连接
    for (const conn of workflow.connections) {
      if (!nodeIds.has(conn.fromNodeId)) {
        issues.push({
          type: 'invalid_connection',
          connectionId: conn.id,
          message: `From node ${conn.fromNodeId} not found`,
        });
      }
      if (!nodeIds.has(conn.toNodeId)) {
        issues.push({
          type: 'invalid_connection',
          connectionId: conn.id,
          message: `To node ${conn.toNodeId} not found`,
        });
      }
    }

    // 检查循环依赖
    const executionOrder = this.calculateExecutionOrder(workflow);
    if (executionOrder === null) {
      issues.push({
        type: 'circular_dependency',
        message: 'Circular dependency detected',
      });
    }

    return {
      isComplete: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * 获取执行顺序
   */
  async getExecutionOrder(id: string): Promise<string[]> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const order = this.calculateExecutionOrder(workflow);
    if (order === null) {
      throw new Error('Circular dependency detected');
    }

    return order;
  }

  /**
   * 计算执行顺序（拓扑排序）
   */
  private calculateExecutionOrder(workflow: any): string[] | null {
    const nodeIds = workflow.nodes.map((n: any) => n.id);
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    // 初始化
    for (const nodeId of nodeIds) {
      inDegree.set(nodeId, 0);
      graph.set(nodeId, []);
    }

    // 构建图
    for (const conn of workflow.connections) {
      const from = conn.fromNodeId;
      const to = conn.toNodeId;
      
      // 只处理存在的节点
      if (graph.has(from) && graph.has(to)) {
        graph.get(from)!.push(to);
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
      }
    }

    // 拓扑排序
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      for (const neighbor of graph.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 检查是否有循环依赖
    if (result.length !== nodeIds.length) {
      return null;
    }

    return result;
  }

  /**
   * 序列化工作流
   */
  private serializeWorkflow(workflow: Workflow): any {
    const nodes = (workflow.nodes || []).map((node: any) => ({
      id: node.id,
      operatorId: node.operatorId,
      operatorType: node.operatorType,
      nodeType: node.nodeType,
      config: node.config ? JSON.parse(node.config) : {},
      positionX: node.positionX,
      positionY: node.positionY,
    }));

    const connections = (workflow.connections || []).map((conn: any) => ({
      id: conn.id,
      from: {
        node: conn.fromNodeId,
        port: conn.fromPort,
      },
      to: {
        node: conn.toNodeId,
        port: conn.toPort,
      },
    }));

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      author: workflow.author,
      license: workflow.license,
      category: workflow.category,
      tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      nodes,
      connections,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }
}


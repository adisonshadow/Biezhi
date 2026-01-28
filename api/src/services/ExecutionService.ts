import { AppDataSource } from '../../../config/database';
import { WorkflowExecution, ExecutionStatus } from '../../../package/entities/WorkflowExecution';
import { WorkflowExecutionLog, LogLevel } from '../../../package/entities/WorkflowExecutionLog';
import { Operator } from '../../../package/entities/Operator';
import { WorkflowService } from './WorkflowService';
import { ResourceService } from './ResourceService';
import { 
  executionDataStore, 
  ExecutionMode, 
  NodeExecutionStatus, 
  ExecutionSessionStatus,
  type NodeExecutionData 
} from './WorkflowExecutionDataStore';
import { sseService } from './SSEService';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class ExecutionService {
  private workflowService: WorkflowService;
  private resourceService: ResourceService;
  private runningExecutions: Map<string, any> = new Map();

  constructor() {
    this.workflowService = new WorkflowService();
    this.resourceService = new ResourceService();
  }

  /**
   * 创建执行任务
   */
  async createExecution(workflowId: string, inputData?: any): Promise<any> {
    const execution = new WorkflowExecution();
    execution.id = `exec_${uuidv4().substring(0, 8)}`;
    execution.workflowId = workflowId;
    execution.status = ExecutionStatus.PENDING;
    execution.inputData = inputData ? JSON.stringify(inputData) : null;

    await AppDataSource.getRepository(WorkflowExecution).save(execution);
    return this.serializeExecution(execution);
  }

  /**
   * 获取所有执行任务
   */
  async listExecutions(status?: ExecutionStatus, workflowId?: string): Promise<any[]> {
    const queryBuilder = AppDataSource.getRepository(WorkflowExecution)
      .createQueryBuilder('execution')
      .orderBy('execution.createdAt', 'DESC');

    if (status) {
      queryBuilder.where('execution.status = :status', { status });
    }

    if (workflowId) {
      queryBuilder.andWhere('execution.workflowId = :workflowId', { workflowId });
    }

    const executions = await queryBuilder.getMany();
    return executions.map(exec => this.serializeExecution(exec));
  }

  /**
   * 根据ID获取执行任务
   */
  async getExecutionById(id: string): Promise<any | null> {
    const execution = await AppDataSource.getRepository(WorkflowExecution).findOne({
      where: { id },
      relations: ['logs'],
    });

    if (!execution) {
      return null;
    }

    return this.serializeExecution(execution);
  }

  /**
   * 启动执行任务
   */
  async startExecution(id: string): Promise<void> {
    const execution = await AppDataSource.getRepository(WorkflowExecution).findOne({
      where: { id },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status === ExecutionStatus.RUNNING) {
      throw new Error('Execution is already running');
    }

    // 更新状态
    execution.status = ExecutionStatus.RUNNING;
    execution.startedAt = new Date();
    await AppDataSource.getRepository(WorkflowExecution).save(execution);

    // 获取工作流
    const workflow = await this.workflowService.getWorkflowById(execution.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // 获取执行顺序
    const executionOrder = await this.workflowService.getExecutionOrder(execution.workflowId);

    // 异步执行工作流
    this.executeWorkflow(execution, workflow, executionOrder).catch(async (error) => {
      execution.status = ExecutionStatus.FAILED;
      execution.errorMessage = error.message;
      execution.completedAt = new Date();
      await AppDataSource.getRepository(WorkflowExecution).save(execution);
      await this.addLog(execution.id, LogLevel.ERROR, `Execution failed: ${error.message}`);
    });
  }

  /**
   * 停止执行任务
   */
  async stopExecution(id: string): Promise<void> {
    const execution = await AppDataSource.getRepository(WorkflowExecution).findOne({
      where: { id },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new Error('Execution is not running');
    }

    // 停止进程
    const process = this.runningExecutions.get(id);
    if (process) {
      process.kill();
      this.runningExecutions.delete(id);
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.completedAt = new Date();
    await AppDataSource.getRepository(WorkflowExecution).save(execution);
    await this.addLog(execution.id, LogLevel.WARN, 'Execution cancelled by user');
  }

  /**
   * 删除执行任务
   */
  async deleteExecution(id: string): Promise<void> {
    // 先停止（如果正在运行）
    const execution = await AppDataSource.getRepository(WorkflowExecution).findOne({
      where: { id },
    });

    if (execution && execution.status === ExecutionStatus.RUNNING) {
      await this.stopExecution(id);
    }

    // 删除日志
    await AppDataSource.getRepository(WorkflowExecutionLog).delete({ executionId: id });
    // 删除执行任务
    await AppDataSource.getRepository(WorkflowExecution).delete({ id });
  }

  /**
   * 获取执行日志
   */
  async getExecutionLogs(executionId: string): Promise<any[]> {
    const logs = await AppDataSource.getRepository(WorkflowExecutionLog).find({
      where: { executionId },
      order: { createdAt: 'ASC' },
    });

    return logs.map(log => ({
      id: log.id,
      nodeId: log.nodeId,
      level: log.level,
      message: log.message,
      data: log.data ? JSON.parse(log.data) : null,
      createdAt: log.createdAt,
    }));
  }

  /**
   * 执行工作流
   */
  private async executeWorkflow(execution: WorkflowExecution, workflow: any, executionOrder: string[]): Promise<void> {
    await this.addLog(execution.id, LogLevel.INFO, `Starting workflow execution: ${workflow.name}`);

    const nodeResults = new Map<string, any>();
    const inputData = execution.inputData ? JSON.parse(execution.inputData) : {};

    // 按顺序执行节点
    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find((n: any) => n.id === nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      await this.addLog(execution.id, LogLevel.INFO, `Executing node: ${nodeId}`, { nodeId });

      // 收集输入数据
      const nodeInputs: any = {};
      const connections = workflow.connections.filter((c: any) => c.to.node === nodeId);
      for (const conn of connections) {
        const fromNodeId = conn.from.node;
        const fromPort = conn.from.port;
        const toPort = conn.to.port;

        if (nodeResults.has(fromNodeId)) {
          const fromResult = nodeResults.get(fromNodeId);
          nodeInputs[toPort] = fromResult[fromPort] || fromResult;
        }
      }

      // 如果是入口节点，使用输入数据
      const isEntryNode = connections.length === 0;
      if (isEntryNode && inputData[nodeId]) {
        Object.assign(nodeInputs, inputData[nodeId]);
      }

      // 执行节点
      const result = await this.executeNode(node, nodeInputs);
      nodeResults.set(nodeId, result);

      await this.addLog(execution.id, LogLevel.INFO, `Node ${nodeId} completed`, { nodeId, result });
    }

    // 收集输出数据
    const outputNodes = workflow.nodes.filter((n: any) => n.nodeType === 'output' || !workflow.connections.some((c: any) => c.from.node === n.id));
    const outputData: any = {};
    for (const node of outputNodes) {
      outputData[node.id] = nodeResults.get(node.id);
    }

    // 更新执行结果
    execution.status = ExecutionStatus.SUCCESS;
    execution.outputData = JSON.stringify(outputData);
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - (execution.startedAt?.getTime() || 0);
    await AppDataSource.getRepository(WorkflowExecution).save(execution);

    await this.addLog(execution.id, LogLevel.INFO, 'Workflow execution completed successfully');
  }

  /**
   * 执行单个节点（公共方法，用于节点调试）
   */
  async executeSingleNode(operatorId: string, nodeConfig: any, inputs: any = {}): Promise<any> {
    // 获取算子信息
    const operator = await AppDataSource.getRepository(Operator).findOne({
      where: { id: operatorId },
    });

    if (!operator) {
      throw new Error(`Operator ${operatorId} not found`);
    }

    // 处理配置中的资源ID，转换为文件路径
    const processedConfig = await this.processResourceIds(nodeConfig, operator);

    // 构建节点对象
    const node = {
      id: `node_${Date.now()}`,
      operatorId: operator.id,
      operatorType: operator.operatorType,
      config: processedConfig,
    };

    // 执行节点
    return await this.executeNode(node, inputs);
  }

  /**
   * 一键执行工作流（完整执行）
   * @param workflowId 工作流ID
   * @param inputData 输入数据
   * @param useSSE 是否使用SSE推送（如果为false，则同步执行并返回所有结果）
   * @returns 如果useSSE为true，返回sessionId；否则返回所有节点执行结果
   */
  async executeFullWorkflow(
    workflowId: string, 
    inputData?: any,
    useSSE: boolean = true
  ): Promise<string | Map<string, any>> {
    // 获取工作流
    const workflow = await this.workflowService.getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // 创建新版本
    const version = executionDataStore.createVersion(workflowId);

    // 创建执行会话
    const session = executionDataStore.createSession(
      workflowId,
      ExecutionMode.FULL,
      version
    );

    // 获取执行顺序
    const executionOrder = await this.workflowService.getExecutionOrder(workflowId);

    if (useSSE) {
      // SSE模式：异步执行，通过SSE推送结果
      this.executeFullWorkflowAsync(session, workflow, executionOrder, inputData || {}).catch(async (error) => {
        executionDataStore.updateSession(session.sessionId, {
          status: ExecutionSessionStatus.FAILED,
        });
        sseService.sendError(session.sessionId, error.message);
        console.error(`Workflow execution failed: ${error.message}`, error);
      });
      return session.sessionId;
    } else {
      // 同步模式：等待执行完成，返回所有结果
      return await this.executeFullWorkflowSync(session, workflow, executionOrder, inputData || {});
    }
  }

  /**
   * 异步执行完整工作流（SSE模式）
   */
  private async executeFullWorkflowAsync(
    session: any,
    workflow: any,
    executionOrder: string[],
    inputData: any
  ): Promise<void> {
    const nodeResults = new Map<string, {
      success: boolean;
      outputData?: any;
      error?: string;
      duration?: number;
      status: NodeExecutionStatus;
    }>();

    try {
      // 初始化所有节点状态为 PENDING
      for (const nodeId of executionOrder) {
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.PENDING);
        sseService.sendNodeStatus(session.sessionId, session.workflowId, nodeId, NodeExecutionStatus.PENDING);
      }

      // 按顺序执行节点
      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find((n: any) => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        // 更新节点状态为 RUNNING
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.RUNNING);
        sseService.sendNodeStatus(session.sessionId, session.workflowId, nodeId, NodeExecutionStatus.RUNNING);

        try {
          // 收集输入数据
          const nodeInputs: any = {};
          const connections = workflow.connections.filter((c: any) => c.to.node === nodeId);
          
          for (const conn of connections) {
            const fromNodeId = conn.from.node;
            const fromPort = conn.from.port;
            const toPort = conn.to.port;

            // 从内存数据存储获取前置节点的输出
            const fromNodeData = executionDataStore.getNodeData(
              session.workflowId,
              session.dataVersion,
              fromNodeId
            );

            if (fromNodeData && fromNodeData.outputData) {
              if (typeof fromNodeData.outputData === 'object' && !Array.isArray(fromNodeData.outputData)) {
                nodeInputs[toPort] = fromNodeData.outputData[fromPort] || fromNodeData.outputData;
              } else {
                nodeInputs[toPort] = fromNodeData.outputData;
              }
            }
          }

          // 如果是入口节点，使用输入数据
          const isEntryNode = connections.length === 0;
          if (isEntryNode && inputData[nodeId]) {
            Object.assign(nodeInputs, inputData[nodeId]);
          }

          // 推送节点输入数据更新（通过 SSE）
          // 这对于可视化节点很重要，数据会直接推送到前端
          if (Object.keys(nodeInputs).length > 0) {
            sseService.sendNodeInputUpdate(
              session.sessionId,
              session.workflowId,
              nodeId,
              nodeInputs,
              'full'
            );
          }

          // 执行节点
          const startTime = Date.now();
          const result = await this.executeNode(node, nodeInputs);
          const duration = Date.now() - startTime;

          // 存储节点执行结果
          const nodeData: NodeExecutionData = {
            outputData: result,
            status: NodeExecutionStatus.SUCCESS,
            executionTime: Date.now(),
            duration,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.SUCCESS);

          // 推送节点结果
          const nodeResult = {
            success: true,
            outputData: result,
            duration,
            status: NodeExecutionStatus.SUCCESS,
          };
          nodeResults.set(nodeId, nodeResult);
          sseService.sendNodeResult(session.sessionId, session.workflowId, nodeId, nodeResult);

        } catch (error: any) {
          // 节点执行失败
          const nodeData: NodeExecutionData = {
            status: NodeExecutionStatus.FAILED,
            executionTime: Date.now(),
            error: error.message,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.FAILED);

          // 推送节点失败结果
          const nodeResult = {
            success: false,
            error: error.message,
            status: NodeExecutionStatus.FAILED,
          };
          nodeResults.set(nodeId, nodeResult);
          sseService.sendNodeResult(session.sessionId, session.workflowId, nodeId, nodeResult);
          
          // 根据策略决定是否继续执行
          // 这里暂时继续执行，后续可以根据节点重要性决定
        }
      }

      // 更新会话状态为完成
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.COMPLETED,
      });

      // 推送会话完成事件（包含所有节点结果）
      sseService.sendSessionComplete(
        session.sessionId,
        session.workflowId,
        ExecutionSessionStatus.COMPLETED,
        nodeResults
      );

    } catch (error: any) {
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.FAILED,
      });
      sseService.sendSessionComplete(
        session.sessionId,
        session.workflowId,
        ExecutionSessionStatus.FAILED,
        nodeResults
      );
      sseService.sendError(session.sessionId, error.message);
      throw error;
    }
  }

  /**
   * 同步执行完整工作流（返回所有结果）
   */
  private async executeFullWorkflowSync(
    session: any,
    workflow: any,
    executionOrder: string[],
    inputData: any
  ): Promise<Map<string, any>> {
    const nodeResults = new Map<string, any>();

    try {
      // 初始化所有节点状态为 PENDING
      for (const nodeId of executionOrder) {
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.PENDING);
      }

      // 按顺序执行节点
      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find((n: any) => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        // 更新节点状态为 RUNNING
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.RUNNING);

        try {
          // 收集输入数据
          const nodeInputs: any = {};
          const connections = workflow.connections.filter((c: any) => c.to.node === nodeId);
          
          for (const conn of connections) {
            const fromNodeId = conn.from.node;
            const fromPort = conn.from.port;
            const toPort = conn.to.port;

            // 从内存数据存储获取前置节点的输出
            const fromNodeData = executionDataStore.getNodeData(
              session.workflowId,
              session.dataVersion,
              fromNodeId
            );

            if (fromNodeData && fromNodeData.outputData) {
              if (typeof fromNodeData.outputData === 'object' && !Array.isArray(fromNodeData.outputData)) {
                nodeInputs[toPort] = fromNodeData.outputData[fromPort] || fromNodeData.outputData;
              } else {
                nodeInputs[toPort] = fromNodeData.outputData;
              }
            }
          }

          // 如果是入口节点，使用输入数据
          const isEntryNode = connections.length === 0;
          if (isEntryNode && inputData[nodeId]) {
            Object.assign(nodeInputs, inputData[nodeId]);
          }

          // 执行节点
          const startTime = Date.now();
          const result = await this.executeNode(node, nodeInputs);
          const duration = Date.now() - startTime;

          // 存储节点执行结果
          const nodeData: NodeExecutionData = {
            outputData: result,
            status: NodeExecutionStatus.SUCCESS,
            executionTime: Date.now(),
            duration,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.SUCCESS);

          // 保存节点结果
          nodeResults.set(nodeId, {
            success: true,
            outputData: result,
            duration,
            status: NodeExecutionStatus.SUCCESS,
          });

        } catch (error: any) {
          // 节点执行失败
          const nodeData: NodeExecutionData = {
            status: NodeExecutionStatus.FAILED,
            executionTime: Date.now(),
            error: error.message,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.FAILED);

          // 保存节点失败结果
          nodeResults.set(nodeId, {
            success: false,
            error: error.message,
            status: NodeExecutionStatus.FAILED,
          });
        }
      }

      // 更新会话状态为完成
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.COMPLETED,
      });

      return nodeResults;

    } catch (error: any) {
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.FAILED,
      });
      throw error;
    }
  }

  /**
   * 单节点执行
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param nodeConfig 节点配置
   * @param useSSE 是否使用SSE推送（如果为false，则同步执行并返回结果）
   * @returns 如果useSSE为true，返回sessionId；否则返回节点执行结果
   */
  async executeSingleNodeInWorkflow(
    workflowId: string,
    nodeId: string,
    nodeConfig: any,
    useSSE: boolean = true
  ): Promise<string | any> {
    // 获取工作流
    const workflow = await this.workflowService.getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const node = workflow.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // 获取最新版本（不创建新版本）
    const version = executionDataStore.getOrCreateLatestVersion(workflowId);

    // 创建执行会话
    const session = executionDataStore.createSession(
      workflowId,
      ExecutionMode.SINGLE_NODE,
      version,
      nodeId
    );

    if (useSSE) {
      // SSE模式：异步执行，通过SSE推送结果
      this.executeSingleNodeInWorkflowAsync(session, workflow, node, nodeConfig).catch(async (error) => {
        executionDataStore.updateSession(session.sessionId, {
          status: ExecutionSessionStatus.FAILED,
        });
        sseService.sendError(session.sessionId, error.message);
        console.error(`Single node execution failed: ${error.message}`, error);
      });
      return session.sessionId;
    } else {
      // 同步模式：等待执行完成，返回结果
      return await this.executeSingleNodeInWorkflowSync(session, workflow, node, nodeConfig);
    }
  }

  /**
   * 异步执行单个节点（SSE模式）
   */
  private async executeSingleNodeInWorkflowAsync(
    session: any,
    workflow: any,
    node: any,
    nodeConfig: any
  ): Promise<void> {
    try {
      // 更新节点状态为 RUNNING
      executionDataStore.updateNodeStatus(session.sessionId, node.id, NodeExecutionStatus.RUNNING);
      sseService.sendNodeStatus(session.sessionId, session.workflowId, node.id, NodeExecutionStatus.RUNNING);

      // 收集输入数据（从连接的节点获取）
      const nodeInputs: any = {};
      const connections = workflow.connections.filter((c: any) => c.to.node === node.id);

      for (const conn of connections) {
        const fromNodeId = conn.from.node;
        const fromPort = conn.from.port;
        const toPort = conn.to.port;

        // 从内存数据存储获取前置节点的输出
        const fromNodeData = executionDataStore.getNodeData(
          session.workflowId,
          session.dataVersion,
          fromNodeId
        );

        if (!fromNodeData) {
          throw new Error(`前置节点 ${fromNodeId} 的数据不存在，请先执行前置节点`);
        }

        if (fromNodeData.outputData) {
          if (typeof fromNodeData.outputData === 'object' && !Array.isArray(fromNodeData.outputData)) {
            nodeInputs[toPort] = fromNodeData.outputData[fromPort] || fromNodeData.outputData;
          } else {
            nodeInputs[toPort] = fromNodeData.outputData;
          }
        }
      }

      // 合并节点配置
      const mergedNode = {
        ...node,
        config: { ...node.config, ...nodeConfig },
      };

      // 执行节点
      const startTime = Date.now();
      const result = await this.executeNode(mergedNode, nodeInputs);
      const duration = Date.now() - startTime;

      // 存储节点执行结果（覆盖当前版本中的旧数据）
      const nodeData: NodeExecutionData = {
        outputData: result,
        status: NodeExecutionStatus.SUCCESS,
        executionTime: Date.now(),
        duration,
      };
      executionDataStore.setNodeData(
        session.workflowId,
        session.dataVersion,
        node.id,
        nodeData
      );
      executionDataStore.updateNodeStatus(session.sessionId, node.id, NodeExecutionStatus.SUCCESS);

      // 推送节点结果
      const nodeResult = {
        success: true,
        outputData: result,
        duration,
        status: NodeExecutionStatus.SUCCESS,
      };
      sseService.sendNodeResult(session.sessionId, session.workflowId, node.id, nodeResult);

      // 更新会话状态为完成
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.COMPLETED,
      });

      // 推送会话完成事件
      const nodeResults = new Map<string, any>();
      nodeResults.set(node.id, nodeResult);
      sseService.sendSessionComplete(
        session.sessionId,
        session.workflowId,
        ExecutionSessionStatus.COMPLETED,
        nodeResults
      );

    } catch (error: any) {
      // 节点执行失败
      const nodeData: NodeExecutionData = {
        status: NodeExecutionStatus.FAILED,
        executionTime: Date.now(),
        error: error.message,
      };
      executionDataStore.setNodeData(
        session.workflowId,
        session.dataVersion,
        node.id,
        nodeData
      );
      executionDataStore.updateNodeStatus(session.sessionId, node.id, NodeExecutionStatus.FAILED);

      // 推送节点失败结果
      const nodeResult = {
        success: false,
        error: error.message,
        status: NodeExecutionStatus.FAILED,
      };
      sseService.sendNodeResult(session.sessionId, session.workflowId, node.id, nodeResult);

      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.FAILED,
      });

      // 推送会话完成事件
      const nodeResults = new Map<string, any>();
      nodeResults.set(node.id, nodeResult);
      sseService.sendSessionComplete(
        session.sessionId,
        session.workflowId,
        ExecutionSessionStatus.FAILED,
        nodeResults
      );
      sseService.sendError(session.sessionId, error.message);
      throw error;
    }
  }

  /**
   * 同步执行单个节点（返回结果）
   */
  private async executeSingleNodeInWorkflowSync(
    session: any,
    workflow: any,
    node: any,
    nodeConfig: any
  ): Promise<any> {
    try {
      // 更新节点状态为 RUNNING
      executionDataStore.updateNodeStatus(session.sessionId, node.id, NodeExecutionStatus.RUNNING);

      // 收集输入数据（从连接的节点获取）
      const nodeInputs: any = {};
      const connections = workflow.connections.filter((c: any) => c.to.node === node.id);

      for (const conn of connections) {
        const fromNodeId = conn.from.node;
        const fromPort = conn.from.port;
        const toPort = conn.to.port;

        // 从内存数据存储获取前置节点的输出
        const fromNodeData = executionDataStore.getNodeData(
          session.workflowId,
          session.dataVersion,
          fromNodeId
        );

        if (!fromNodeData) {
          throw new Error(`前置节点 ${fromNodeId} 的数据不存在，请先执行前置节点`);
        }

        if (fromNodeData.outputData) {
          if (typeof fromNodeData.outputData === 'object' && !Array.isArray(fromNodeData.outputData)) {
            nodeInputs[toPort] = fromNodeData.outputData[fromPort] || fromNodeData.outputData;
          } else {
            nodeInputs[toPort] = fromNodeData.outputData;
          }
        }
      }

      // 合并节点配置
      const mergedNode = {
        ...node,
        config: { ...node.config, ...nodeConfig },
      };

      // 执行节点
      const startTime = Date.now();
      const result = await this.executeNode(mergedNode, nodeInputs);
      const duration = Date.now() - startTime;

      // 存储节点执行结果（覆盖当前版本中的旧数据）
      const nodeData: NodeExecutionData = {
        outputData: result,
        status: NodeExecutionStatus.SUCCESS,
        executionTime: Date.now(),
        duration,
      };
      executionDataStore.setNodeData(
        session.workflowId,
        session.dataVersion,
        node.id,
        nodeData
      );
      executionDataStore.updateNodeStatus(session.sessionId, node.id, NodeExecutionStatus.SUCCESS);

      // 更新会话状态为完成
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.COMPLETED,
      });

      return {
        success: true,
        outputData: result,
        duration,
        status: NodeExecutionStatus.SUCCESS,
      };

    } catch (error: any) {
      // 节点执行失败
      const nodeData: NodeExecutionData = {
        status: NodeExecutionStatus.FAILED,
        executionTime: Date.now(),
        error: error.message,
      };
      executionDataStore.setNodeData(
        session.workflowId,
        session.dataVersion,
        node.id,
        nodeData
      );
      executionDataStore.updateNodeStatus(session.sessionId, node.id, NodeExecutionStatus.FAILED);

      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.FAILED,
      });

      throw error;
    }
  }

  /**
   * 部分执行（从指定节点开始执行后续节点）
   * @param workflowId 工作流ID
   * @param startNodeIds 起始节点ID列表
   * @param nodeConfigs 节点配置映射
   * @param useSSE 是否使用SSE推送（如果为false，则同步执行并返回所有结果）
   * @returns 如果useSSE为true，返回sessionId；否则返回所有节点执行结果
   */
  async executePartialWorkflow(
    workflowId: string,
    startNodeIds: string[],
    nodeConfigs?: Map<string, any>,
    useSSE: boolean = true
  ): Promise<string | Map<string, any>> {
    // 获取工作流
    const workflow = await this.workflowService.getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // 获取最新版本（不创建新版本）
    const version = executionDataStore.getOrCreateLatestVersion(workflowId);

    // 确定执行范围：从选中节点开始，找到所有后续节点
    const executionNodes = this.getExecutionScope(workflow, startNodeIds);

    // 对执行范围内的节点进行拓扑排序
    const executionOrder = this.calculatePartialExecutionOrder(workflow, executionNodes);

    // 创建执行会话
    const session = executionDataStore.createSession(
      workflowId,
      ExecutionMode.PARTIAL,
      version,
      startNodeIds[0] // 使用第一个节点作为起始节点标识
    );

    if (useSSE) {
      // SSE模式：异步执行，通过SSE推送结果
      this.executePartialWorkflowAsync(session, workflow, executionOrder, nodeConfigs || new Map()).catch(async (error) => {
        executionDataStore.updateSession(session.sessionId, {
          status: ExecutionSessionStatus.FAILED,
        });
        sseService.sendError(session.sessionId, error.message);
        console.error(`Partial workflow execution failed: ${error.message}`, error);
      });
      return session.sessionId;
    } else {
      // 同步模式：等待执行完成，返回所有结果
      return await this.executePartialWorkflowSync(session, workflow, executionOrder, nodeConfigs || new Map());
    }
  }

  /**
   * 获取执行范围（从指定节点开始的所有后续节点）
   */
  private getExecutionScope(workflow: any, startNodeIds: string[]): Set<string> {
    const scope = new Set<string>(startNodeIds);
    const visited = new Set<string>();
    const queue = [...startNodeIds];

    // 广度优先遍历，找到所有后续节点
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // 找到所有以当前节点为源的连接
      const outgoingConnections = workflow.connections.filter((c: any) => c.from.node === nodeId);
      for (const conn of outgoingConnections) {
        const toNodeId = conn.to.node;
        if (!scope.has(toNodeId)) {
          scope.add(toNodeId);
          queue.push(toNodeId);
        }
      }
    }

    return scope;
  }

  /**
   * 计算部分执行的拓扑排序（仅考虑执行范围内的节点）
   */
  private calculatePartialExecutionOrder(workflow: any, executionNodes: Set<string>): string[] {
    const nodeIds = Array.from(executionNodes);
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    // 初始化
    for (const nodeId of nodeIds) {
      inDegree.set(nodeId, 0);
      graph.set(nodeId, []);
    }

      // 构建图（仅考虑执行范围内的连接）
      for (const conn of workflow.connections) {
        const from = conn.from.node;
        const to = conn.to.node;
        
        if (executionNodes.has(from) && executionNodes.has(to) && graph.has(from) && graph.has(to)) {
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

    return result;
  }

  /**
   * 异步执行部分工作流（SSE模式）
   */
  private async executePartialWorkflowAsync(
    session: any,
    workflow: any,
    executionOrder: string[],
    nodeConfigs: Map<string, any>
  ): Promise<void> {
    const nodeResults = new Map<string, {
      success: boolean;
      outputData?: any;
      error?: string;
      duration?: number;
      status: NodeExecutionStatus;
    }>();

    try {
      // 初始化执行范围内节点状态为 PENDING
      for (const nodeId of executionOrder) {
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.PENDING);
        sseService.sendNodeStatus(session.sessionId, session.workflowId, nodeId, NodeExecutionStatus.PENDING);
      }

      // 按拓扑顺序执行节点
      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find((n: any) => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        // 更新节点状态为 RUNNING
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.RUNNING);

        try {
          // 收集输入数据
          const nodeInputs: any = {};
          const connections = workflow.connections.filter((c: any) => c.to.node === nodeId);

          for (const conn of connections) {
            const fromNodeId = conn.from.node;
            const fromPort = conn.from.port;
            const toPort = conn.to.port;

            // 从内存数据存储获取前置节点的输出
            // 前置节点可能在执行范围内（从当前执行结果获取），也可能在执行范围外（从版本数据获取）
            console.log(`[Partial Execution] Getting data for node ${nodeId} from upstream node ${fromNodeId}, version=${session.dataVersion}`);
            
            // 先尝试直接从当前版本获取（如果前置节点在执行范围内）
            const isUpstreamInScope = executionOrder.includes(fromNodeId);
            let fromNodeData: NodeExecutionData | null = null;
            
            if (isUpstreamInScope) {
              // 前置节点在执行范围内，直接从当前版本获取
              const directData = executionDataStore.getNodeDataDirect(
                session.workflowId,
                session.dataVersion,
                fromNodeId
              );
              console.log(`[Partial Execution] Direct get from current version: exists=${!!directData}, status=${directData?.status}`);
              
              // 只使用 SUCCESS 状态的数据
              if (directData && directData.status === NodeExecutionStatus.SUCCESS) {
                fromNodeData = directData;
              } else if (directData) {
                console.log(`[Partial Execution] Upstream node ${fromNodeId} exists but status is ${directData.status}, not SUCCESS`);
              }
            }
            
            // 如果直接获取失败，尝试向前查找（可能前置节点不在执行范围内）
            if (!fromNodeData) {
              fromNodeData = executionDataStore.getNodeData(
                session.workflowId,
                session.dataVersion,
                fromNodeId
              );
              console.log(`[Partial Execution] Forward search: exists=${!!fromNodeData}, status=${fromNodeData?.status}`);
            }

            console.log(`[Partial Execution] Final result for upstream node ${fromNodeId}: exists=${!!fromNodeData}, status=${fromNodeData?.status}, hasOutputData=${!!(fromNodeData?.outputData)}`);

            if (!fromNodeData) {
              // 如果前置节点数据不存在，检查是否在执行范围内
              const isInExecutionScope = executionOrder.includes(fromNodeId);
              if (isInExecutionScope) {
                // 前置节点在执行范围内但数据不存在，说明前置节点可能还未执行或执行失败
                const upstreamIndex = executionOrder.indexOf(fromNodeId);
                const currentIndex = executionOrder.indexOf(nodeId);
                throw new Error(`前置节点 ${fromNodeId} 的数据不存在。当前节点索引=${currentIndex}, 前置节点索引=${upstreamIndex}。可能原因：1) 前置节点尚未执行；2) 前置节点执行失败`);
              } else {
                // 前置节点不在执行范围内，需要从版本数据获取，但数据不存在
                throw new Error(`前置节点 ${fromNodeId} 的数据不存在，请先执行前置节点或执行完整工作流`);
              }
            }

            if (fromNodeData && fromNodeData.outputData !== undefined) {
              if (typeof fromNodeData.outputData === 'object' && !Array.isArray(fromNodeData.outputData)) {
                nodeInputs[toPort] = fromNodeData.outputData[fromPort] || fromNodeData.outputData;
              } else {
                nodeInputs[toPort] = fromNodeData.outputData;
              }
            } else if (fromNodeData && fromNodeData.status === NodeExecutionStatus.SUCCESS && !fromNodeData.outputData) {
              // 节点执行成功但没有输出数据，可能是正常情况（某些节点可能没有输出）
              console.warn(`前置节点 ${fromNodeId} 执行成功但没有输出数据`);
            }
          }

          // 合并节点配置（如果有提供）
          const nodeConfig = nodeConfigs.get(nodeId);
          const mergedNode = nodeConfig ? { ...node, config: { ...node.config, ...nodeConfig } } : node;

          // 推送节点输入数据更新（通过 SSE）
          // 这对于可视化节点很重要，数据会直接推送到前端
          if (Object.keys(nodeInputs).length > 0) {
            sseService.sendNodeInputUpdate(
              session.sessionId,
              session.workflowId,
              nodeId,
              nodeInputs,
              'full'
            );
          }

          // 执行节点
          const startTime = Date.now();
          const result = await this.executeNode(mergedNode, nodeInputs);
          const duration = Date.now() - startTime;

          // 存储节点执行结果
          const nodeData: NodeExecutionData = {
            outputData: result,
            status: NodeExecutionStatus.SUCCESS,
            executionTime: Date.now(),
            duration,
          };
          
          console.log(`[Partial Execution] Storing node data: workflowId=${session.workflowId}, version=${session.dataVersion}, nodeId=${nodeId}, hasOutputData=${!!result}`);
          
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          
          // 验证数据是否已存储
          const storedData = executionDataStore.getNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId
          );
          console.log(`[Partial Execution] Verification: nodeId=${nodeId}, stored=${!!storedData}, hasOutputData=${!!(storedData?.outputData)}`);
          
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.SUCCESS);

          // 推送节点结果
          const nodeResult = {
            success: true,
            outputData: result,
            duration,
            status: NodeExecutionStatus.SUCCESS,
          };
          nodeResults.set(nodeId, nodeResult);
          sseService.sendNodeResult(session.sessionId, session.workflowId, nodeId, nodeResult);

        } catch (error: any) {
          // 节点执行失败
          const nodeData: NodeExecutionData = {
            status: NodeExecutionStatus.FAILED,
            executionTime: Date.now(),
            error: error.message,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.FAILED);

          // 推送节点失败结果
          const nodeResult = {
            success: false,
            error: error.message,
            status: NodeExecutionStatus.FAILED,
          };
          nodeResults.set(nodeId, nodeResult);
          sseService.sendNodeResult(session.sessionId, session.workflowId, nodeId, nodeResult);
        }
      }

      // 更新会话状态为完成
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.COMPLETED,
      });

      // 推送会话完成事件（包含所有节点结果）
      sseService.sendSessionComplete(
        session.sessionId,
        session.workflowId,
        ExecutionSessionStatus.COMPLETED,
        nodeResults
      );

    } catch (error: any) {
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.FAILED,
      });
      sseService.sendSessionComplete(
        session.sessionId,
        session.workflowId,
        ExecutionSessionStatus.FAILED,
        nodeResults
      );
      sseService.sendError(session.sessionId, error.message);
      throw error;
    }
  }

  /**
   * 同步执行部分工作流（返回所有结果）
   */
  private async executePartialWorkflowSync(
    session: any,
    workflow: any,
    executionOrder: string[],
    nodeConfigs: Map<string, any>
  ): Promise<Map<string, any>> {
    const nodeResults = new Map<string, any>();

    try {
      // 初始化执行范围内节点状态为 PENDING
      for (const nodeId of executionOrder) {
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.PENDING);
      }

      // 按拓扑顺序执行节点
      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find((n: any) => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        // 更新节点状态为 RUNNING
        executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.RUNNING);

        try {
          // 收集输入数据
          const nodeInputs: any = {};
          const connections = workflow.connections.filter((c: any) => c.to.node === nodeId);

          for (const conn of connections) {
            const fromNodeId = conn.from.node;
            const fromPort = conn.from.port;
            const toPort = conn.to.port;

            // 从内存数据存储获取前置节点的输出
            const fromNodeData = executionDataStore.getNodeData(
              session.workflowId,
              session.dataVersion,
              fromNodeId
            );

            if (!fromNodeData) {
              const isInExecutionScope = executionOrder.includes(fromNodeId);
              if (isInExecutionScope) {
                const upstreamIndex = executionOrder.indexOf(fromNodeId);
                const currentIndex = executionOrder.indexOf(nodeId);
                throw new Error(`前置节点 ${fromNodeId} 的数据不存在。当前节点索引=${currentIndex}, 前置节点索引=${upstreamIndex}。可能原因：1) 前置节点尚未执行；2) 前置节点执行失败`);
              } else {
                throw new Error(`前置节点 ${fromNodeId} 的数据不存在，请先执行前置节点或执行完整工作流`);
              }
            }

            if (fromNodeData.outputData !== undefined) {
              if (typeof fromNodeData.outputData === 'object' && !Array.isArray(fromNodeData.outputData)) {
                nodeInputs[toPort] = fromNodeData.outputData[fromPort] || fromNodeData.outputData;
              } else {
                nodeInputs[toPort] = fromNodeData.outputData;
              }
            }
          }

          // 合并节点配置（如果有提供）
          const nodeConfig = nodeConfigs.get(nodeId);
          const mergedNode = nodeConfig ? { ...node, config: { ...node.config, ...nodeConfig } } : node;

          // 执行节点
          const startTime = Date.now();
          const result = await this.executeNode(mergedNode, nodeInputs);
          const duration = Date.now() - startTime;

          // 存储节点执行结果
          const nodeData: NodeExecutionData = {
            outputData: result,
            status: NodeExecutionStatus.SUCCESS,
            executionTime: Date.now(),
            duration,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.SUCCESS);

          // 保存节点结果
          nodeResults.set(nodeId, {
            success: true,
            outputData: result,
            duration,
            status: NodeExecutionStatus.SUCCESS,
          });

        } catch (error: any) {
          // 节点执行失败
          const nodeData: NodeExecutionData = {
            status: NodeExecutionStatus.FAILED,
            executionTime: Date.now(),
            error: error.message,
          };
          executionDataStore.setNodeData(
            session.workflowId,
            session.dataVersion,
            nodeId,
            nodeData
          );
          executionDataStore.updateNodeStatus(session.sessionId, nodeId, NodeExecutionStatus.FAILED);

          // 保存节点失败结果
          nodeResults.set(nodeId, {
            success: false,
            error: error.message,
            status: NodeExecutionStatus.FAILED,
          });
        }
      }

      // 更新会话状态为完成
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.COMPLETED,
      });

      return nodeResults;

    } catch (error: any) {
      executionDataStore.updateSession(session.sessionId, {
        status: ExecutionSessionStatus.FAILED,
      });
      throw error;
    }
  }

  /**
   * 获取节点执行数据（用于查询，包括失败的数据）
   */
  getNodeExecutionData(workflowId: string, version: number | undefined, nodeId: string): NodeExecutionData | null {
    const targetVersion = version || executionDataStore.getLatestVersion(workflowId);
    // 使用 getNodeDataAnyStatus 以获取包括失败状态在内的所有数据
    return executionDataStore.getNodeDataAnyStatus(workflowId, targetVersion, nodeId);
  }

  /**
   * 获取执行会话状态
   */
  getExecutionSession(sessionId: string): any {
    return executionDataStore.getSession(sessionId);
  }

  /**
   * 处理配置中的资源ID，将资源ID转换为文件路径
   */
  private async processResourceIds(config: any, operator: any): Promise<any> {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const processedConfig = { ...config };
    let operatorParams = operator.operatorParams;

    // 解析 operatorParams（可能是 JSON 字符串）
    if (operatorParams && typeof operatorParams === 'string') {
      try {
        operatorParams = JSON.parse(operatorParams);
      } catch (e) {
        // 解析失败，跳过处理
        return processedConfig;
      }
    }

    if (operatorParams) {
      const params = Array.isArray(operatorParams)
        ? operatorParams
        : typeof operatorParams === 'object'
          ? Object.values(operatorParams)
          : [];

      for (const param of params) {
        const paramName = param.name;
        const paramValue = processedConfig[paramName];

        // 如果参数是文件类型
        if (param.ui?.component === 'file' || param.ui?.component === 'fileInput') {
          // 如果是上传中的临时值，抛出错误
          if (paramValue === '__uploading__') {
            throw new Error(`参数 ${param.label || paramName} 的文件正在上传中，请等待上传完成后再执行`);
          }
          
          // 如果值是资源ID（以 res_ 开头），转换为文件路径
          if (
            paramValue &&
            typeof paramValue === 'string' &&
            paramValue.startsWith('res_')
          ) {
            try {
              // 获取资源文件路径
              const filePath = await this.resourceService.getResourcePath(paramValue);
              processedConfig[paramName] = filePath;
            } catch (error: any) {
              throw new Error(`获取资源文件失败 (${paramName}): ${error.message}`);
            }
          }
          // 如果是文件对象或其他无效值，抛出错误
          else if (paramValue && typeof paramValue === 'object') {
            throw new Error(`参数 ${param.label || paramName} 需要上传文件，请先上传文件`);
          }
          // 如果是空值但参数是必填的，检查是否需要抛出错误
          else if (!paramValue && param.required) {
            throw new Error(`参数 ${param.label || paramName} 是必填项，请先上传文件`);
          }
        }
      }
    }

    return processedConfig;
  }

  /**
   * 执行节点
   */
  private async executeNode(node: any, inputs: any): Promise<any> {
    // 获取算子信息
    const operator = await AppDataSource.getRepository(Operator).findOne({
      where: { id: node.operatorId },
    });

    if (!operator) {
      throw new Error(`Operator ${node.operatorId} not found`);
    }

    // 合并配置：从 operatorParams 中提取默认值，然后与节点配置合并
    // operatorParams 是参数定义数组，需要从中提取默认值
    let defaultConfig: any = {};
    if (operator.operatorParams) {
      try {
        let operatorParams: any;
        if (typeof operator.operatorParams === 'string') {
          operatorParams = JSON.parse(operator.operatorParams);
        } else {
          operatorParams = operator.operatorParams;
        }
        
        // operatorParams 可能是数组（参数定义）或对象（旧格式）
        if (Array.isArray(operatorParams)) {
          // 从参数定义数组中提取默认值
          for (const param of operatorParams) {
            if (param.name && param.default !== undefined) {
              defaultConfig[param.name] = param.default;
            }
          }
        } else if (typeof operatorParams === 'object') {
          // 如果是对象，直接使用（兼容旧格式）
          defaultConfig = operatorParams;
        }
      } catch (e) {
        console.warn(`Failed to parse operatorParams for operator ${operator.id}:`, e);
      }
    }
    
    // 节点配置覆盖默认配置
    const mergedConfig = {
      ...defaultConfig,
      ...(node.config || {}),
    };

    // 配置已合并，准备执行节点

    // 处理配置中的资源ID，转换为文件路径
    const config = await this.processResourceIds(mergedConfig, operator);

    // 检查是否为纯前端可视化算子
    // 纯前端可视化算子：有 dataVisualization 配置，但没有 codePath、entryPoint、operatorType
    let dataVisualization: any = null;
    try {
      dataVisualization = operator.dataVisualization 
        ? (typeof operator.dataVisualization === 'string' 
            ? JSON.parse(operator.dataVisualization) 
            : operator.dataVisualization)
        : null;
    } catch (e) {
      console.warn(`Failed to parse dataVisualization for operator ${operator.id}:`, e);
    }

    const isPureFrontendVisualization = !!dataVisualization && 
      (!operator.codePath || !operator.entryPoint || !operator.operatorType);

    if (isPureFrontendVisualization) {
      // 纯前端可视化算子：不需要执行后端代码，直接返回空结果
      // 数据会通过 SSE 直接推送到前端，由前端可视化组件处理
      console.log(`[ExecutionService] 检测到纯前端可视化算子 ${operator.id}，跳过执行，数据将通过 SSE 推送到前端`);
      return {
        success: true,
        outputData: {}, // 纯前端可视化算子不产生输出
        status: 'SUCCESS',
        message: '纯前端可视化算子，数据通过 SSE 推送到前端'
      };
    }

    // 检查是否有必要的执行参数
    if (!operator.operatorType) {
      throw new Error(`算子 ${operator.id} 缺少 operatorType，无法执行。如果是纯前端可视化算子，请确保配置了 dataVisualization`);
    }

    if (!operator.codePath || !operator.entryPoint) {
      throw new Error(`算子 ${operator.id} 缺少 codePath 或 entryPoint，无法执行。如果是纯前端可视化算子，请确保配置了 dataVisualization`);
    }

    // 根据 operatorType 调用相应的执行器
    if (operator.operatorType === 'local_python') {
      return await this.executePythonOperator(operator, config, inputs, node.id);
    } else if (operator.operatorType === 'local_typescript') {
      return await this.executeTypeScriptOperator(operator, config, inputs);
    } else if (operator.operatorType === 'local_go') {
      // TODO: 实现 Go 算子执行
      throw new Error('Go operator execution not implemented yet');
    } else if (operator.operatorType === 'local_rust') {
      // TODO: 实现 Rust 算子执行
      throw new Error('Rust operator execution not implemented yet');
    } else {
      throw new Error(`Unsupported operator type: ${operator.operatorType}`);
    }
  }

  /**
   * 确保虚拟环境存在
   */
  private async ensureVenv(): Promise<string> {
    // 优先使用环境变量指定的虚拟环境路径
    const venvPath = process.env.BIEZHI_VENV_PATH || path.resolve(__dirname, '../../../venv');
    const venvPython = path.join(venvPath, 'bin', 'python3');
    
    // 如果虚拟环境存在，直接返回
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
    
    // 创建虚拟环境
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['-m', 'venv', venvPath], {
        stdio: 'inherit',
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`创建虚拟环境失败，退出码: ${code}`));
          return;
        }
        
        if (!fs.existsSync(venvPython)) {
          reject(new Error(`虚拟环境创建后 Python 可执行文件不存在: ${venvPython}`));
          return;
        }
        
        resolve(venvPython);
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`创建虚拟环境失败: ${error.message}`));
      });
    });
  }

  /**
   * 获取虚拟环境 Python 路径
   */
  private async getVenvPythonPath(): Promise<string> {
    try {
      return await this.ensureVenv();
    } catch (error: any) {
      // 如果创建失败，使用系统 Python（但会提示警告）
      console.warn(`虚拟环境创建失败，使用系统 Python: ${error.message}`);
      return 'python3';
    }
  }

  /**
   * 执行 Python 算子
   */
  private async executePythonOperator(operator: any, config: any, inputs: any, nodeId?: string): Promise<any> {
    // 获取算子路径
    const metadata = operator.metadata ? JSON.parse(operator.metadata) : {};
    let operatorPath = metadata.operatorPath;
    const isRelativePath = metadata.isRelativePath === true;

    if (!operatorPath) {
      throw new Error(`Operator path not found for operator ${operator.id}`);
    }

    // 获取项目根目录
    const projectRoot = path.resolve(__dirname, '../../../');

    // 如果是相对路径，转换为绝对路径
    if (isRelativePath) {
      operatorPath = path.resolve(projectRoot, operatorPath);
    } else {
      // 绝对路径，确保是解析后的绝对路径
      operatorPath = path.resolve(operatorPath);
    }

    // 使用统一的执行脚本（相对于项目根目录）
    // 在开发环境和生产环境中都能正确找到脚本
    const executeScriptPath = path.join(projectRoot, 'api/src/utils/execute_python_operator.py');
    
    if (!fs.existsSync(executeScriptPath)) {
      throw new Error(`执行脚本不存在: ${executeScriptPath}`);
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 获取虚拟环境 Python 路径
        const pythonExecutable = await this.getVenvPythonPath();

        // 检查必要参数
        if (!operator.codePath || !operator.entryPoint) {
          throw new Error(`算子 ${operator.id} 缺少 codePath 或 entryPoint`);
        }

        // 准备执行参数
        const execData = {
          operator_path: operatorPath,
          code_file: operator.codePath,
          entry_point: operator.entryPoint,
          config,
          inputs,
        };

        // 执行 Python 脚本（使用虚拟环境中的 Python）
        const pythonProcess = spawn(pythonExecutable, [executeScriptPath], {
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONPATH: operatorPath,
            ...(nodeId ? { BIEZHI_NODE_ID: nodeId } : {}),
          },
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // 将执行数据通过 stdin 传递给 Python 脚本
        pythonProcess.stdin.write(JSON.stringify(execData));
        pythonProcess.stdin.end();

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            // 尝试解析 stdout 中的 JSON 错误信息
            let errorMessage = '';
            try {
              const errorResult = JSON.parse(stdout.trim());
              if (errorResult.error) {
                errorMessage = errorResult.error;
                if (errorResult.error_type) {
                  errorMessage = `[${errorResult.error_type}] ${errorMessage}`;
                }
              } else {
                errorMessage = stdout.trim() || stderr.trim() || `Python process exited with code ${code}`;
              }
            } catch (e) {
              // 如果不是 JSON，使用原始输出
              errorMessage = stderr.trim() || stdout.trim() || `Python process exited with code ${code}`;
            }
            reject(new Error(errorMessage));
            return;
          }

          try {
            // 解析 JSON 输出
            const result = JSON.parse(stdout.trim());
            
            // 检查是否有错误
            if (result.error) {
              reject(new Error(result.error));
              return;
            }
            
            resolve(result);
          } catch (e) {
            // 如果不是 JSON，返回原始输出
            reject(new Error(`无法解析执行结果: ${stdout.trim()}\n错误: ${e.message}`));
          }
        });

        pythonProcess.on('error', (error) => {
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * 执行 TypeScript 算子
   */
  private async executeTypeScriptOperator(operator: any, config: any, inputs: any): Promise<any> {
    // 获取算子路径
    const metadata = operator.metadata ? JSON.parse(operator.metadata) : {};
    let operatorPath = metadata.operatorPath;
    const isRelativePath = metadata.isRelativePath === true;

    if (!operatorPath) {
      throw new Error(`Operator path not found for operator ${operator.id}`);
    }

    // 获取项目根目录
    const projectRoot = path.resolve(__dirname, '../../../');

    // 如果是相对路径，转换为绝对路径
    if (isRelativePath) {
      operatorPath = path.resolve(projectRoot, operatorPath);
    } else {
      // 绝对路径，确保是解析后的绝对路径
      operatorPath = path.resolve(operatorPath);
    }

    // 使用统一的执行脚本（相对于项目根目录）
    const executeScriptPath = path.join(projectRoot, 'api/src/utils/execute_typescript_operator.ts');
    
    if (!fs.existsSync(executeScriptPath)) {
      throw new Error(`执行脚本不存在: ${executeScriptPath}`);
    }

    // 检查必要参数
    if (!operator.codePath || !operator.entryPoint) {
      throw new Error(`算子 ${operator.id} 缺少 codePath 或 entryPoint`);
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 使用 ts-node 执行 TypeScript 脚本
        // 优先使用环境变量指定的 ts-node 路径，否则使用 npx ts-node
        // 或者使用项目本地的 ts-node（如果已安装）
        let tsNodeCommand: string;
        let tsNodeArgs: string[];
        
        if (process.env.BIEZHI_TS_NODE_PATH) {
          tsNodeCommand = process.env.BIEZHI_TS_NODE_PATH;
          tsNodeArgs = [executeScriptPath];
        } else {
          // 尝试使用项目本地的 ts-node
          const localTsNode = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');
          if (fs.existsSync(localTsNode)) {
            tsNodeCommand = localTsNode;
            // 使用 CommonJS 模式，指定编译器选项
            tsNodeArgs = [
              '--transpile-only',
              '--compiler-options', JSON.stringify({
                module: 'commonjs',
                esModuleInterop: true,
                skipLibCheck: true,
              }),
              executeScriptPath
            ];
          } else {
            // 使用 npx ts-node
            tsNodeCommand = 'npx';
            tsNodeArgs = [
              'ts-node',
              '--transpile-only',
              '--compiler-options', JSON.stringify({
                module: 'commonjs',
                esModuleInterop: true,
                skipLibCheck: true,
              }),
              executeScriptPath
            ];
          }
        }

        // 检查必要参数（已在 executeNode 中检查，这里再次确认）
        if (!operator.codePath || !operator.entryPoint) {
          throw new Error(`算子 ${operator.id} 缺少 codePath 或 entryPoint`);
        }

        // 准备执行参数
        const execData = {
          operator_path: operatorPath,
          code_file: operator.codePath,
          entry_point: operator.entryPoint,
          config,
          inputs,
        };

        // 执行 TypeScript 脚本
        const tsNodeProcess = spawn(tsNodeCommand, tsNodeArgs, {
          cwd: projectRoot,
          env: {
            ...process.env,
            NODE_ENV: 'production',
            NODE_PATH: `${operatorPath}:${path.join(projectRoot, 'ts_operator_sdk')}:${process.env.NODE_PATH || ''}`,
          },
        });

        let stdout = '';
        let stderr = '';

        tsNodeProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        tsNodeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // 将执行数据通过 stdin 传递给脚本
        tsNodeProcess.stdin.write(JSON.stringify(execData));
        tsNodeProcess.stdin.end();

        tsNodeProcess.on('close', (code) => {
          if (code !== 0) {
            // 尝试解析 stdout 中的 JSON 错误信息
            let errorMessage = '';
            try {
              const errorResult = JSON.parse(stdout.trim() || stderr.trim());
              if (errorResult.error) {
                errorMessage = errorResult.error;
                if (errorResult.error_type) {
                  errorMessage = `[${errorResult.error_type}] ${errorMessage}`;
                }
              } else {
                errorMessage = stderr.trim() || stdout.trim() || `TypeScript process exited with code ${code}`;
              }
            } catch (e) {
              // 如果不是 JSON，使用原始输出
              errorMessage = stderr.trim() || stdout.trim() || `TypeScript process exited with code ${code}`;
            }
            reject(new Error(errorMessage));
            return;
          }

          try {
            // 解析 JSON 输出
            const result = JSON.parse(stdout.trim());
            
            // 检查是否有错误
            if (result.error) {
              reject(new Error(result.error));
              return;
            }
            
            resolve(result);
          } catch (e) {
            // 如果不是 JSON，返回原始输出
            reject(new Error(`无法解析执行结果: ${stdout.trim()}\n错误: ${e.message}`));
          }
        });

        tsNodeProcess.on('error', (error) => {
          reject(new Error(`Failed to start TypeScript process: ${error.message}`));
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * 添加日志
   */
  private async addLog(executionId: string, level: LogLevel, message: string, data?: any): Promise<void> {
    const log = new WorkflowExecutionLog();
    log.id = `log_${uuidv4().substring(0, 8)}`;
    log.executionId = executionId;
    log.level = level;
    log.message = message;
    log.data = data ? JSON.stringify(data) : null;
    await AppDataSource.getRepository(WorkflowExecutionLog).save(log);
  }

  /**
   * 序列化执行任务
   */
  private serializeExecution(execution: WorkflowExecution): any {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      inputData: execution.inputData ? JSON.parse(execution.inputData) : null,
      outputData: execution.outputData ? JSON.parse(execution.outputData) : null,
      errorMessage: execution.errorMessage,
      duration: execution.duration,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    };
  }
}


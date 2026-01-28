/**
 * Delta计算和应用工具函数
 */
import type { Workflow, WorkflowNode, WorkflowConnection } from '../../types';
import type { WorkflowDelta } from './types';

/**
 * 计算两个工作流之间的增量Delta
 */
export function computeDelta(from: Workflow, to: Workflow): WorkflowDelta {
  const delta: WorkflowDelta = {};
  
  // 1. 计算节点变更
  const fromNodes = new Map(from.nodes?.map(n => [n.id, n]) || []);
  const toNodes = new Map(to.nodes?.map(n => [n.id, n]) || []);
  
  const addedNodes: WorkflowNode[] = [];
  const removedNodeIds: string[] = [];
  const updatedNodes: Array<{ id: string; changes: Partial<WorkflowNode> }> = [];
  
  // 检查新增和更新
  for (const [id, toNode] of toNodes) {
    const fromNode = fromNodes.get(id);
    if (!fromNode) {
      addedNodes.push(toNode);
    } else {
      const changes = computeNodeChanges(fromNode, toNode);
      if (Object.keys(changes).length > 0) {
        updatedNodes.push({ id, changes });
      }
    }
  }
  
  // 检查删除
  for (const [id] of fromNodes) {
    if (!toNodes.has(id)) {
      removedNodeIds.push(id);
    }
  }
  
  if (addedNodes.length > 0 || removedNodeIds.length > 0 || updatedNodes.length > 0) {
    delta.nodes = {
      ...(addedNodes.length > 0 && { added: addedNodes }),
      ...(removedNodeIds.length > 0 && { removed: removedNodeIds }),
      ...(updatedNodes.length > 0 && { updated: updatedNodes }),
    };
  }
  
  // 2. 计算连接变更
  const fromConnections = new Map(
    (from.connections || []).map(c => [`${c.from.node}:${c.from.port}:${c.to.node}:${c.to.port}`, c])
  );
  const toConnections = new Map(
    (to.connections || []).map(c => [`${c.from.node}:${c.from.port}:${c.to.node}:${c.to.port}`, c])
  );
  
  const addedConnections: WorkflowConnection[] = [];
  const removedConnections: Array<{ from: string; to: string; fromPort?: string; toPort?: string }> = [];
  const updatedConnections: Array<{ id: string; changes: Partial<WorkflowConnection> }> = [];
  
  // 检查新增和更新
  for (const [key, toConn] of toConnections) {
    const fromConn = fromConnections.get(key);
    if (!fromConn) {
      addedConnections.push(toConn);
    } else if (fromConn.id !== toConn.id) {
      // 连接ID变化，视为更新
      updatedConnections.push({
        id: toConn.id,
        changes: { id: toConn.id },
      });
    }
  }
  
  // 检查删除
  for (const [key, fromConn] of fromConnections) {
    if (!toConnections.has(key)) {
      removedConnections.push({
        from: fromConn.from.node,
        to: fromConn.to.node,
        fromPort: fromConn.from.port,
        toPort: fromConn.to.port,
      });
    }
  }
  
  if (addedConnections.length > 0 || removedConnections.length > 0 || updatedConnections.length > 0) {
    delta.connections = {
      ...(addedConnections.length > 0 && { added: addedConnections }),
      ...(removedConnections.length > 0 && { removed: removedConnections }),
      ...(updatedConnections.length > 0 && { updated: updatedConnections }),
    };
  }
  
  // 3. 计算元数据变更
  const metadataChanges: any = {};
  if (from.name !== to.name) metadataChanges.name = to.name;
  if (from.description !== to.description) metadataChanges.description = to.description;
  if (JSON.stringify(from.tags || []) !== JSON.stringify(to.tags || [])) {
    metadataChanges.tags = to.tags;
  }
  
  if (Object.keys(metadataChanges).length > 0) {
    delta.metadata = metadataChanges;
  }
  
  return delta;
}

/**
 * 计算节点变更
 */
function computeNodeChanges(from: WorkflowNode, to: WorkflowNode): Partial<WorkflowNode> {
  const changes: Partial<WorkflowNode> = {};
  
  if (from.operatorId !== to.operatorId) changes.operatorId = to.operatorId;
  if (from.operatorType !== to.operatorType) changes.operatorType = to.operatorType;
  if (from.nodeType !== to.nodeType) changes.nodeType = to.nodeType;
  if (from.positionX !== to.positionX) changes.positionX = to.positionX;
  if (from.positionY !== to.positionY) changes.positionY = to.positionY;
  
  // 配置变更（深度比较）
  if (JSON.stringify(from.config || {}) !== JSON.stringify(to.config || {})) {
    changes.config = to.config;
  }
  
  return changes;
}

/**
 * 应用Delta到工作流
 */
export function applyDelta(workflow: Workflow, delta: WorkflowDelta): Workflow {
  const result = JSON.parse(JSON.stringify(workflow)); // 深拷贝
  
  // 1. 应用节点变更
  if (delta.nodes) {
    // 删除节点
    if (delta.nodes.removed) {
      result.nodes = (result.nodes || []).filter(
        (n: WorkflowNode) => !delta.nodes!.removed!.includes(n.id)
      );
      // 同时删除相关连接
      result.connections = (result.connections || []).filter(
        (c: WorkflowConnection) => 
          !delta.nodes!.removed!.includes(c.from.node) &&
          !delta.nodes!.removed!.includes(c.to.node)
      );
    }
    
    // 添加节点
    if (delta.nodes.added) {
      result.nodes = [...(result.nodes || []), ...delta.nodes.added];
    }
    
    // 更新节点
    if (delta.nodes.updated) {
      for (const { id, changes } of delta.nodes.updated) {
        const node = result.nodes.find((n: WorkflowNode) => n.id === id);
        if (node) {
          Object.assign(node, changes);
        }
      }
    }
  }
  
  // 2. 应用连接变更
  if (delta.connections) {
    // 删除连接
    if (delta.connections.removed) {
      result.connections = (result.connections || []).filter(
        (c: WorkflowConnection) => {
          return !delta.connections!.removed!.some(
            (r: any) =>
              r.from === c.from.node &&
              r.to === c.to.node &&
              (r.fromPort === undefined || r.fromPort === c.from.port) &&
              (r.toPort === undefined || r.toPort === c.to.port)
          );
        }
      );
    }
    
    // 添加连接
    if (delta.connections.added) {
      result.connections = [...(result.connections || []), ...delta.connections.added];
    }
    
    // 更新连接
    if (delta.connections.updated) {
      for (const { id, changes } of delta.connections.updated) {
        const conn = result.connections.find((c: WorkflowConnection) => c.id === id);
        if (conn) {
          Object.assign(conn, changes);
        }
      }
    }
  }
  
  // 3. 应用元数据变更
  if (delta.metadata) {
    Object.assign(result, delta.metadata);
  }
  
  return result;
}

/**
 * 从基线和增量链重建工作流版本
 */
export function rebuildVersionFromBase(
  baseWorkflow: Workflow,
  deltas: WorkflowDelta[]
): Workflow {
  let workflow = JSON.parse(JSON.stringify(baseWorkflow));
  
  for (const delta of deltas) {
    workflow = applyDelta(workflow, delta);
  }
  
  return workflow;
}

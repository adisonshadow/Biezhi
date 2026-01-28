/**
 * AI操作Checkpoint辅助函数
 * 用于在AI Chat中处理Function Call的checkpoint创建和回滚
 */
import type { Workflow } from '../../types';
import type { VersionHistoryManager, CreateCheckpointOptions } from './types';
import { OperationPriority } from './types';

/**
 * 修改操作的Function列表
 */
export const WORKFLOW_MODIFY_FUNCTIONS = [
  'add_node_to_workflow',
  'remove_node_from_workflow',
  'update_node_config',
  'connect_nodes',
  'disconnect_nodes',
  'add_data_align_node',
  'update_workflow',
  'design_workflow',
  'optimize_workflow',
  'auto_configure_node',
];

/**
 * 检查Function是否是修改操作
 */
export function isModifyOperation(functionName: string): boolean {
  return WORKFLOW_MODIFY_FUNCTIONS.includes(functionName);
}

/**
 * 在AI操作后创建checkpoint
 */
export function createAICheckpoint(
  previousWorkflow: Workflow,
  updatedWorkflow: Workflow,
  versionHistory: VersionHistoryManager,
  functionName: string,
  parameters: any,
  messageId: string
): string | null {
  if (!versionHistory) return null;
  
  const delta = versionHistory.computeDelta(previousWorkflow, updatedWorkflow);
  
  // 如果Delta为空，不创建checkpoint
  if (Object.keys(delta).length === 0) {
    return null;
  }
  
  const checkpoint = versionHistory.createCheckpoint(
    delta,
    'AI',
    `AI_${functionName.toUpperCase()}`,
    {
      messageId,
      description: `AI执行: ${functionName}`,
      functionCall: {
        name: functionName,
        parameters,
      },
    }
  );
  
  return checkpoint.checkpointId;
}

/**
 * 回滚AI操作
 */
export async function rollbackAIOperation(
  messageId: string,
  checkpointId: string,
  currentWorkflow: Workflow,
  versionHistory: VersionHistoryManager
): Promise<Workflow | null> {
  if (!versionHistory) return null;
  
  // 1. 找到AI操作前的checkpoint（父checkpoint）
  const aiCheckpoint = versionHistory.getCheckpoint(checkpointId);
  if (!aiCheckpoint || !aiCheckpoint.parentCheckpointId) {
    throw new Error('无法找到回滚目标版本');
  }
  
  // 2. 获取AI操作前的版本
  const beforeCheckpoint = versionHistory.getCheckpoint(
    aiCheckpoint.parentCheckpointId
  );
  if (!beforeCheckpoint) {
    throw new Error('无法找到回滚目标版本');
  }
  
  // 3. 重建AI操作前的工作流版本
  const rollbackWorkflow = versionHistory.getVersionAtCheckpoint(
    beforeCheckpoint.checkpointId
  );
  
  if (!rollbackWorkflow) {
    throw new Error('无法重建工作流版本');
  }
  
  // 4. 创建回滚checkpoint（标记为AI操作的回滚）
  const rollbackDelta = versionHistory.computeDelta(currentWorkflow, rollbackWorkflow);
  versionHistory.createCheckpoint(
    rollbackDelta,
    'AI',
    'AI_ROLLBACK',
    {
      messageId,
      description: `回滚AI操作: ${aiCheckpoint.operationDescription || aiCheckpoint.operation}`,
    }
  );
  
  // 5. 保存到存储
  await versionHistory.saveToStorage();
  
  return rollbackWorkflow;
}

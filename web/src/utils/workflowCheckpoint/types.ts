import type { Workflow, WorkflowNode, WorkflowConnection } from '../../types';

/**
 * 工作流增量变更数据结构
 */
export interface WorkflowDelta {
  // 节点变更
  nodes?: {
    added?: WorkflowNode[];           // 新增的节点
    removed?: string[];                // 删除的节点ID
    updated?: Array<{                  // 更新的节点
      id: string;
      changes: Partial<WorkflowNode>;  // 变更的部分
    }>;
  };
  
  // 连接变更
  connections?: {
    added?: WorkflowConnection[];      // 新增的连接
    removed?: Array<{                  // 删除的连接
      from: string;
      to: string;
      fromPort?: string;
      toPort?: string;
    }>;
    updated?: Array<{                  // 更新的连接
      id: string;
      changes: Partial<WorkflowConnection>;
    }>;
  };
  
  // 工作流元数据变更
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Checkpoint数据结构
 */
export interface WorkflowCheckpoint {
  // 基础信息
  checkpointId: string;              // 唯一ID
  workflowId: string;                // 工作流ID
  version: number;                   // 版本号（相对于基线）
  parentCheckpointId?: string;       // 父checkpoint ID
  
  // 操作信息
  operationType: 'USER' | 'AI';      // 操作类型
  operation: string;                 // 操作名称（如 'add_node', 'update_config'）
  operationDescription?: string;     // 操作描述（如 '添加数据清洗节点'）
  
  // 关联信息
  messageId?: string;                // AI操作关联的消息ID
  userId?: string;                   // 操作者ID（用户或AI）
  functionCall?: {                   // AI操作的Function Call信息
    name: string;
    parameters: any;
  };
  
  // 版本数据
  delta: WorkflowDelta;              // 增量变更
  fullSnapshot?: Workflow;            // 完整快照（可选，用于快速访问）
  
  // 元数据
  createdAt: number;                 // 创建时间戳
  isBaseline: boolean;               // 是否为基线版本
  
  // 计算属性（运行时）
  canUndo?: boolean;                 // 是否可以Undo
  canRedo?: boolean;                 // 是否可以Redo
}

/**
 * 版本链数据结构
 */
export interface VersionChain {
  workflowId: string;
  baseCheckpointId: string;
  currentOffset: number;
  versionChain: string[];            // checkpointId数组
  discardedCheckpoints?: string[];   // 废弃的checkpoint ID列表
}

/**
 * 工作流缓存数据结构
 */
export interface WorkflowCache {
  workflowId: string;
  workflow: Workflow;
  lastModified: number;
  unsavedChanges: boolean;
}

/**
 * 操作优先级枚举
 */
export enum OperationPriority {
  // 立即创建checkpoint
  IMMEDIATE = 'IMMEDIATE',  // 添加/删除节点、连接/断开连接
  
  // 短延迟防抖（500ms）
  SHORT_DEBOUNCE = 'SHORT_DEBOUNCE',  // 节点位置移动、批量配置更新
  
  // 长延迟防抖（2秒）
  LONG_DEBOUNCE = 'LONG_DEBOUNCE',  // 节点配置输入（表单字段）
  
  // 不创建checkpoint
  NO_CHECKPOINT = 'NO_CHECKPOINT',  // 临时状态（如拖拽中）
}

/**
 * Checkpoint创建选项
 */
export interface CreateCheckpointOptions {
  messageId?: string;
  description?: string;
  functionCall?: {
    name: string;
    parameters: any;
  };
}

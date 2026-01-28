# 工作流设计器 Checkpoint 版本管理设计方案

## 📋 文档概述

本文档设计工作流设计器的版本管理系统，将用户操作与AI操作的checkpoints融合，实现浏览器端缓存、增量版本管理、Undo/Redo功能和智能防抖动机制。

---

## 📑 目录

1. [设计目标](#1-设计目标)
2. [核心概念](#2-核心概念)
3. [数据模型设计](#3-数据模型设计)
4. [浏览器端缓存机制](#4-浏览器端缓存机制)
5. [增量版本管理](#5-增量版本管理)
6. [操作类型与标记](#6-操作类型与标记)
7. [Undo/Redo 实现](#7-undoredo-实现)
8. [防抖动机制](#8-防抖动机制)
9. [与AI Chat的集成](#9-与ai-chat的集成)
10. [实现细节](#10-实现细节)
11. [使用场景示例](#11-使用场景示例)

---

## 1. 设计目标

### 1.1 核心目标

1. **浏览器端缓存**：用户未保存前，所有修改都缓存在浏览器端（IndexedDB/localStorage）
2. **操作区分**：清晰区分用户操作和AI操作，AI操作带有特殊标记
3. **增量版本管理**：checkpoints之间使用增量存储，而非全量快照
4. **版本导航**：Undo/Redo按钮实现版本的前后offset切换
5. **智能防抖动**：节点配置输入使用合理的防抖动策略，避免频繁创建版本

### 1.2 非目标

- 不涉及服务器端的持久化（保存到数据库后，版本管理逻辑切换到后端）
- 不处理并发编辑冲突（单用户场景）

---

## 2. 核心概念

### 2.1 Checkpoint（检查点）

Checkpoint是工作流在某个时间点的快照，包含：

- **Checkpoint ID**：唯一标识符（`checkpoint_${timestamp}_${random}`）
- **版本号（Version）**：相对于基线的版本偏移量（整数，可为负）
- **父版本ID**：指向父checkpoint（用于构建版本树）
- **操作类型**：USER（用户操作）或AI（AI操作）
- **操作描述**：简短的操作描述
- **增量数据（Delta）**：相对于父版本的变更集合
- **时间戳**：创建时间
- **关联消息ID**：如果是AI操作，关联AI Chat中的消息ID

### 2.2 版本偏移量（Version Offset）

版本偏移量用于Undo/Redo导航：

- **当前版本偏移量（currentOffset）**：当前显示的工作流版本相对于基线（baseVersion）的偏移
  - `currentOffset = 0`：表示当前版本
  - `currentOffset < 0`：表示历史版本（需要Undo）
  - `currentOffset > 0`：表示未来版本（需要Redo，但在正常操作中不存在）

### 2.3 基线版本（Base Version）

基线版本是最后一次保存到服务器的版本，或初始加载的版本：

- 用户点击"保存"时，当前版本成为新的基线
- 从服务器加载工作流时，加载的版本成为基线
- 基线版本的版本偏移量为0

### 2.4 增量Delta

增量Delta描述从一个版本到下一个版本的变更：

```typescript
interface WorkflowDelta {
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
```

---

## 3. 数据模型设计

### 3.1 Checkpoint数据结构

```typescript
interface WorkflowCheckpoint {
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
```

### 3.2 版本历史管理器

```typescript
interface VersionHistoryManager {
  // 状态
  workflowId: string;
  baseVersion: WorkflowCheckpoint;   // 基线版本
  checkpoints: Map<string, WorkflowCheckpoint>;  // 所有checkpoints
  currentOffset: number;             // 当前版本偏移量
  versionChain: string[];            // 版本链（checkpointId数组）
  
  // 方法
  createCheckpoint(
    delta: WorkflowDelta,
    operationType: 'USER' | 'AI',
    operation: string,
    metadata?: {
      messageId?: string;
      description?: string;
    }
  ): WorkflowCheckpoint;
  
  undo(): WorkflowCheckpoint | null;
  redo(): WorkflowCheckpoint | null;
  
  canUndo(): boolean;
  canRedo(): boolean;
  
  getCurrentVersion(): Workflow;
  getVersionAtOffset(offset: number): Workflow | null;
  
  applyDelta(workflow: Workflow, delta: WorkflowDelta): Workflow;
  computeDelta(from: Workflow, to: Workflow): WorkflowDelta;
  
  // 持久化
  saveToStorage(): Promise<void>;
  loadFromStorage(): Promise<void>;
  
  // 基线管理
  setBaseline(checkpoint: WorkflowCheckpoint): void;
  resetToBaseline(): void;
}
```

### 3.3 浏览器存储结构

**IndexedDB存储结构**：

```
DB: workflow_checkpoints
  ├── ObjectStore: checkpoints
  │   ├── Key: checkpointId
  │   └── Value: WorkflowCheckpoint
  │
  ├── ObjectStore: version_chains
  │   ├── Key: workflowId
  │   └── Value: {
  │         workflowId: string;
  │         baseCheckpointId: string;
  │         currentOffset: number;
  │         versionChain: string[];  // checkpointId数组
  │       }
  │
  └── ObjectStore: workflows_cache
      ├── Key: workflowId
      └── Value: {
            workflowId: string;
            workflow: Workflow;
            lastModified: number;
            unsavedChanges: boolean;
          }
```

---

## 4. 浏览器端缓存机制

### 4.1 缓存策略

**缓存时机**：
- 工作流加载后，立即缓存到IndexedDB
- 每次checkpoint创建时，同步更新缓存
- 用户操作（拖拽、连接等）触发checkpoint时，更新缓存

**缓存内容**：
- 完整的工作流对象（当前版本）
- 所有checkpoints（增量版本历史）
- 版本链信息

**缓存清理**：
- 用户保存后，保留最近50个checkpoints（可配置）
- 超过保留数量时，删除最旧的checkpoints
- 页面关闭时，保留缓存（不清理）

### 4.2 加载与恢复

**初始加载**：
```typescript
async function loadWorkflowWithHistory(workflowId: string): Promise<{
  workflow: Workflow;
  history: VersionHistoryManager;
}> {
  // 1. 从服务器加载最新版本（基线）
  const serverWorkflow = await api.getWorkflow(workflowId);
  
  // 2. 从IndexedDB加载版本历史
  const history = await loadVersionHistory(workflowId);
  
  // 3. 如果存在未保存的版本，询问用户是否恢复
  if (history.hasUnsavedChanges) {
    const shouldRestore = await confirmRestoreUnsavedChanges();
    if (shouldRestore) {
      // 恢复到最后编辑的版本
      return {
        workflow: history.getCurrentVersion(),
        history,
      };
    }
  }
  
  // 4. 以服务器版本为基线，重置历史
  history.resetToBaseline(serverWorkflow);
  
  return {
    workflow: serverWorkflow,
    history,
  };
}
```

**页面恢复**：
- 页面刷新或重新打开时，自动从IndexedDB恢复
- 显示提示："检测到未保存的更改，是否恢复？"

---

## 5. 增量版本管理

### 5.1 增量计算

**计算Delta**：
```typescript
function computeDelta(
  from: Workflow,
  to: Workflow
): WorkflowDelta {
  const delta: WorkflowDelta = {};
  
  // 1. 计算节点变更
  const fromNodes = new Map(from.nodes.map(n => [n.id, n]));
  const toNodes = new Map(to.nodes.map(n => [n.id, n]));
  
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
      added: addedNodes.length > 0 ? addedNodes : undefined,
      removed: removedNodeIds.length > 0 ? removedNodeIds : undefined,
      updated: updatedNodes.length > 0 ? updatedNodes : undefined,
    };
  }
  
  // 2. 计算连接变更（类似逻辑）
  // ...
  
  // 3. 计算元数据变更
  // ...
  
  return delta;
}
```

### 5.2 应用Delta

**应用增量变更**：
```typescript
function applyDelta(workflow: Workflow, delta: WorkflowDelta): Workflow {
  const result = JSON.parse(JSON.stringify(workflow)); // 深拷贝
  
  // 1. 应用节点变更
  if (delta.nodes) {
    // 删除节点
    if (delta.nodes.removed) {
      result.nodes = result.nodes.filter(
        n => !delta.nodes!.removed!.includes(n.id)
      );
      // 同时删除相关连接
      result.connections = result.connections.filter(
        c => !delta.nodes!.removed!.includes(c.from) &&
             !delta.nodes!.removed!.includes(c.to)
      );
    }
    
    // 添加节点
    if (delta.nodes.added) {
      result.nodes.push(...delta.nodes.added);
    }
    
    // 更新节点
    if (delta.nodes.updated) {
      for (const { id, changes } of delta.nodes.updated) {
        const node = result.nodes.find(n => n.id === id);
        if (node) {
          Object.assign(node, changes);
        }
      }
    }
  }
  
  // 2. 应用连接变更（类似逻辑）
  // ...
  
  // 3. 应用元数据变更
  if (delta.metadata) {
    Object.assign(result, delta.metadata);
  }
  
  return result;
}
```

### 5.3 版本重建

**从基线+增量链重建版本**：
```typescript
function rebuildVersionFromBase(
  baseWorkflow: Workflow,
  deltas: WorkflowDelta[]  // 从基线到目标版本的所有deltas
): Workflow {
  let workflow = JSON.parse(JSON.stringify(baseWorkflow));
  
  for (const delta of deltas) {
    workflow = applyDelta(workflow, delta);
  }
  
  return workflow;
}
```

---

## 6. 操作类型与标记

### 6.1 操作类型枚举

```typescript
enum OperationType {
  // 用户操作
  USER_ADD_NODE = 'USER_ADD_NODE',
  USER_REMOVE_NODE = 'USER_REMOVE_NODE',
  USER_UPDATE_NODE_CONFIG = 'USER_UPDATE_NODE_CONFIG',
  USER_UPDATE_NODE_POSITION = 'USER_UPDATE_NODE_POSITION',
  USER_CONNECT_NODES = 'USER_CONNECT_NODES',
  USER_DISCONNECT_NODES = 'USER_DISCONNECT_NODES',
  USER_UPDATE_WORKFLOW_METADATA = 'USER_UPDATE_WORKFLOW_METADATA',
  
  // AI操作
  AI_ADD_NODE = 'AI_ADD_NODE',
  AI_REMOVE_NODE = 'AI_REMOVE_NODE',
  AI_UPDATE_NODE_CONFIG = 'AI_UPDATE_NODE_CONFIG',
  AI_OPTIMIZE_WORKFLOW = 'AI_OPTIMIZE_WORKFLOW',
  AI_DESIGN_WORKFLOW = 'AI_DESIGN_WORKFLOW',
  AI_ADD_DATA_ALIGN_NODE = 'AI_ADD_DATA_ALIGN_NODE',
}
```

### 6.2 操作标记机制

**Checkpoint标记**：
```typescript
interface CheckpointMarker {
  // 操作来源
  source: 'USER' | 'AI';
  
  // 如果是AI操作
  aiMarker?: {
    messageId: string;               // 关联的消息ID
    functionCall?: {
      name: string;                  // Function名称
      parameters: any;               // 参数
    };
    canRollback: boolean;            // 是否可以在AI Chat中回滚
  };
  
  // 操作描述
  description: string;               // 如 '用户添加了数据清洗节点'
  
  // 视觉标记（用于UI显示）
  visualMarker?: {
    color: string;                   // 标记颜色（AI操作可用不同颜色）
    icon?: string;                   // 图标
    badge?: string;                  // 徽章文字
  };
}
```

**UI显示**：
- 在版本历史面板中，AI操作的checkpoint显示特殊图标或颜色
- 在Undo/Redo按钮旁边显示操作类型提示
- 在AI Chat中，显示可回滚的操作列表

---

## 7. Undo/Redo 实现

### 7.1 版本导航逻辑

**版本链结构**：
```
基线版本 (offset=0)
  ↓
Checkpoint 1 (offset=-1, USER操作)
  ↓
Checkpoint 2 (offset=-2, AI操作)
  ↓
Checkpoint 3 (offset=-3, USER操作)
  ↓
当前版本 (offset=-4, USER操作)
```

**Undo操作**：
```typescript
function undo(): WorkflowCheckpoint | null {
  if (!canUndo()) {
    return null;
  }
  
  // 当前版本偏移量 -1
  this.currentOffset -= 1;
  
  // 获取目标版本的checkpoint
  const targetCheckpointId = this.versionChain[this.versionChain.length - 1 + this.currentOffset];
  const checkpoint = this.checkpoints.get(targetCheckpointId);
  
  if (!checkpoint) {
    return null;
  }
  
  // 重建工作流版本
  const targetWorkflow = this.getVersionAtOffset(this.currentOffset);
  
  // 更新当前工作流状态
  this.currentWorkflow = targetWorkflow;
  
  // 保存到缓存
  this.saveToStorage();
  
  return checkpoint;
}
```

**Redo操作**：
```typescript
function redo(): WorkflowCheckpoint | null {
  if (!canRedo()) {
    return null;
  }
  
  // 当前版本偏移量 +1
  this.currentOffset += 1;
  
  // 获取目标版本的checkpoint
  const targetCheckpointId = this.versionChain[this.versionChain.length - 1 + this.currentOffset];
  const checkpoint = this.checkpoints.get(targetCheckpointId);
  
  if (!checkpoint) {
    return null;
  }
  
  // 重建工作流版本
  const targetWorkflow = this.getVersionAtOffset(this.currentOffset);
  
  // 更新当前工作流状态
  this.currentWorkflow = targetWorkflow;
  
  // 保存到缓存
  this.saveToStorage();
  
  return checkpoint;
}
```

### 7.2 版本分支处理

**场景**：用户在Undo后进行了新操作

```
版本链：
  基线 → C1 → C2 → C3 → C4 (当前)
  
用户Undo到C2：
  基线 → C1 → C2 (当前, offset=-2)
  
用户在C2基础上添加节点（创建C5）：
  基线 → C1 → C2 → C5 (当前, offset=-3)
  
注意：C3和C4被标记为废弃，但保留在历史中（用于重新访问）
```

**实现**：
```typescript
function createCheckpointAfterUndo(
  delta: WorkflowDelta,
  operationType: 'USER' | 'AI'
): WorkflowCheckpoint {
  // 检查是否在历史版本上创建新checkpoint
  if (this.currentOffset < -1) {
    // 标记后续版本为废弃
    this.markFutureVersionsAsDiscarded();
    
    // 重置currentOffset到最新位置
    // 但保留历史链用于查看
  }
  
  return this.createCheckpoint(delta, operationType, operation);
}
```

### 7.3 UI集成

**Undo/Redo按钮状态**：
```typescript
const canUndo = versionHistory.canUndo();
const canRedo = versionHistory.canRedo();

<Button
  icon={<BiUndo />}
  disabled={!canUndo}
  onClick={handleUndo}
  title={canUndo ? `撤销: ${versionHistory.getUndoDescription()}` : '无法撤销'}
/>

<Button
  icon={<BiRedo />}
  disabled={!canRedo}
  onClick={handleRedo}
  title={canRedo ? `重做: ${versionHistory.getRedoDescription()}` : '无法重做'}
/>
```

**快捷键支持**：
- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z` 或 `Cmd/Ctrl + Y`: Redo

---

## 8. 防抖动机制

### 8.1 节点配置防抖动策略

**问题**：用户输入节点配置时，每次输入都触发checkpoint会导致版本历史爆炸

**解决方案**：分层防抖动机制

#### 8.1.1 操作分类

```typescript
enum OperationPriority {
  // 立即创建checkpoint
  IMMEDIATE = 'IMMEDIATE',  // 添加/删除节点、连接/断开连接
  
  // 短延迟防抖（500ms）
  SHORT_DEBOUNCE = 'SHORT_DEBOUNCE',  // 节点位置移动、批量配置更新
  
  // 长延迟防抖（2秒）
  LONG_DEBOUNCE = 'LONG_DEBOUNCE',  // 节点配置输入（表单字段）
  
  // 不创建checkpoint
  NO_CHECKPOINT = 'NO_CHECKPOINT',  // 临时状态（如拖拽中）
}
```

#### 8.1.2 防抖动实现

```typescript
class CheckpointDebouncer {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // 配置防抖动延迟
  private delays = {
    [OperationPriority.IMMEDIATE]: 0,
    [OperationPriority.SHORT_DEBOUNCE]: 500,
    [OperationPriority.LONG_DEBOUNCE]: 2000,
    [OperationPriority.NO_CHECKPOINT]: -1,
  };
  
  scheduleCheckpoint(
    operationId: string,  // 操作唯一标识（如 'node_config_${nodeId}'）
    priority: OperationPriority,
    callback: () => void
  ): void {
    // 不创建checkpoint的操作
    if (priority === OperationPriority.NO_CHECKPOINT) {
      return;
    }
    
    // 立即执行
    if (priority === OperationPriority.IMMEDIATE) {
      callback();
      return;
    }
    
    // 清除之前的定时器
    const existingTimer = this.debounceTimers.get(operationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // 设置新的定时器
    const delay = this.delays[priority];
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(operationId);
    }, delay);
    
    this.debounceTimers.set(operationId, timer);
  }
  
  // 强制立即执行（用户离开输入框或按Enter）
  flush(operationId?: string): void {
    if (operationId) {
      const timer = this.debounceTimers.get(operationId);
      if (timer) {
        clearTimeout(timer);
        // 立即执行（需要保存回调引用）
      }
      this.debounceTimers.delete(operationId);
    } else {
      // 执行所有待处理的checkpoint
      this.debounceTimers.forEach((timer) => {
        clearTimeout(timer);
        // 立即执行
      });
      this.debounceTimers.clear();
    }
  }
  
  // 取消所有待处理的checkpoint
  cancel(operationId?: string): void {
    if (operationId) {
      const timer = this.debounceTimers.get(operationId);
      if (timer) {
        clearTimeout(timer);
      }
      this.debounceTimers.delete(operationId);
    } else {
      this.debounceTimers.forEach((timer) => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  }
}
```

### 8.2 节点配置更新流程

**场景1：用户输入节点配置字段**

```typescript
// 节点配置面板组件
function NodeConfigPanel({ node, onConfigChange }) {
  const debouncer = useRef(new CheckpointDebouncer());
  
  const handleFieldChange = (field: string, value: any) => {
    // 1. 立即更新UI（乐观更新）
    const updatedConfig = {
      ...node.config,
      [field]: value,
    };
    onConfigChange(node.id, updatedConfig);  // 更新本地状态
    
    // 2. 防抖动创建checkpoint
    debouncer.current.scheduleCheckpoint(
      `node_config_${node.id}`,
      OperationPriority.LONG_DEBOUNCE,  // 2秒防抖
      () => {
        // 创建checkpoint
        const delta = computeDelta(
          previousWorkflow,
          currentWorkflow
        );
        versionHistory.createCheckpoint(
          delta,
          'USER',
          'USER_UPDATE_NODE_CONFIG',
          {
            description: `更新节点 ${node.name} 的配置`,
          }
        );
      }
    );
  };
  
  // 用户离开输入框时，立即创建checkpoint
  const handleFieldBlur = () => {
    debouncer.current.flush(`node_config_${node.id}`);
  };
  
  // 组件卸载时，取消待处理的checkpoint
  useEffect(() => {
    return () => {
      debouncer.current.cancel(`node_config_${node.id}`);
    };
  }, [node.id]);
  
  // ...
}
```

**场景2：用户拖拽节点**

```typescript
// Canvas组件
function Canvas({ workflow, onNodesChange }) {
  const debouncer = useRef(new CheckpointDebouncer());
  const isDragging = useRef(false);
  
  const handleNodeDragStart = () => {
    isDragging.current = true;
  };
  
  const handleNodeDrag = (nodeId: string, position: { x: number; y: number }) => {
    // 仅更新UI，不创建checkpoint
    updateNodePosition(nodeId, position);
  };
  
  const handleNodeDragEnd = (nodeId: string) => {
    isDragging.current = false;
    
    // 拖拽结束后，创建checkpoint（短延迟防抖，合并连续拖拽）
    debouncer.current.scheduleCheckpoint(
      `node_position_${nodeId}`,
      OperationPriority.SHORT_DEBOUNCE,  // 500ms防抖
      () => {
        const delta = computeDelta(previousWorkflow, currentWorkflow);
        versionHistory.createCheckpoint(
          delta,
          'USER',
          'USER_UPDATE_NODE_POSITION',
          {
            description: `移动节点位置`,
          }
        );
      }
    );
  };
  
  // ...
}
```

**场景3：用户添加节点**

```typescript
// 添加节点操作
function handleAddNode(operatorId: string, position: { x: number; y: number }) {
  // 立即创建checkpoint（高优先级操作）
  const newNode = createNode(operatorId, position);
  const updatedWorkflow = {
    ...workflow,
    nodes: [...workflow.nodes, newNode],
  };
  
  const delta = computeDelta(workflow, updatedWorkflow);
  versionHistory.createCheckpoint(
    delta,
    'USER',
    'USER_ADD_NODE',
    {
      description: `添加节点: ${getOperatorName(operatorId)}`,
    }
  );
  
  setWorkflow(updatedWorkflow);
}
```

### 8.3 智能合并策略

**场景**：用户在短时间内进行了多个配置更新

**策略**：如果checkpoint创建间隔很短（< 3秒），且操作类型相同，合并为单个checkpoint

```typescript
class SmartCheckpointMerger {
  private lastCheckpointTime: number = 0;
  private lastOperationType: string | null = null;
  private readonly MERGE_WINDOW = 3000;  // 3秒
  
  shouldMerge(
    newOperationType: string,
    newDelta: WorkflowDelta
  ): boolean {
    const now = Date.now();
    const timeSinceLastCheckpoint = now - this.lastCheckpointTime;
    
    // 如果操作类型相同，且在合并窗口内，考虑合并
    if (
      this.lastOperationType === newOperationType &&
      timeSinceLastCheckpoint < this.MERGE_WINDOW
    ) {
      // 检查是否可以安全合并（避免冲突）
      if (this.canSafelyMerge(newDelta)) {
        return true;
      }
    }
    
    this.lastCheckpointTime = now;
    this.lastOperationType = newOperationType;
    return false;
  }
  
  private canSafelyMerge(newDelta: WorkflowDelta): boolean {
    // 检查delta是否只影响不同的节点/连接
    // 如果影响相同的节点，不合并（避免丢失中间状态）
    // 实现细节...
    return true;
  }
}
```

---

## 9. 与AI Chat的集成

### 9.1 AI操作Checkpoint创建

**在AI Chat中**：
```typescript
// AIChatPanel中执行Function Call
async function executeAIFunctionCall(functionName: string, parameters: any) {
  const isModifyOperation = WORKFLOW_MODIFY_FUNCTIONS.includes(functionName);
  
  if (isModifyOperation) {
    // 1. 保存当前工作流状态（作为AI操作前的checkpoint）
    const beforeCheckpoint = versionHistory.createCheckpoint(
      computeDelta(previousWorkflow, currentWorkflow),
      'USER',  // 保存用户当前状态
      'USER_AUTO_SAVE',
      {
        description: 'AI操作前自动保存',
      }
    );
    
    // 2. 执行AI操作
    const result = await api.callFunction(functionName, parameters);
    
    // 3. 应用AI修改到工作流
    const updatedWorkflow = applyAIModifications(currentWorkflow, result);
    
    // 4. 创建AI操作的checkpoint
    const aiCheckpoint = versionHistory.createCheckpoint(
      computeDelta(currentWorkflow, updatedWorkflow),
      'AI',
      `AI_${functionName.toUpperCase()}`,
      {
        messageId: currentMessageId,
        description: `AI执行: ${functionName}`,
        functionCall: {
          name: functionName,
          parameters,
        },
      }
    );
    
    // 5. 关联checkpoint到消息
    updateMessageMetadata(currentMessageId, {
      checkpointId: aiCheckpoint.checkpointId,
      hasWorkflowChanges: true,
    });
    
    setWorkflow(updatedWorkflow);
  }
}
```

### 9.2 AI操作回滚

**从AI Chat回滚**：
```typescript
async function handleAIChatRollback(messageId: string, checkpointId: string) {
  // 1. 找到AI操作前的checkpoint
  const aiCheckpoint = versionHistory.getCheckpoint(checkpointId);
  const beforeCheckpoint = versionHistory.getCheckpoint(
    aiCheckpoint.parentCheckpointId!
  );
  
  // 2. 回滚到AI操作前的版本
  const rollbackWorkflow = versionHistory.getVersionAtCheckpoint(
    beforeCheckpoint.checkpointId
  );
  
  // 3. 创建回滚checkpoint（标记为AI操作的回滚）
  const rollbackCheckpoint = versionHistory.createCheckpoint(
    computeDelta(currentWorkflow, rollbackWorkflow),
    'AI',
    'AI_ROLLBACK',
    {
      messageId,
      description: `回滚AI操作: ${aiCheckpoint.operationDescription}`,
      rollbackTarget: checkpointId,
    }
  );
  
  // 4. 更新工作流
  setWorkflow(rollbackWorkflow);
}
```

**从Undo/Redo回滚**：
- AI操作创建的checkpoint也可以被Undo/Redo
- 在版本历史中，AI操作的checkpoint显示特殊标记
- Undo到AI操作前的版本时，提示用户也可以从AI Chat回滚

### 9.3 双向同步

**AI Chat回滚 vs Undo/Redo**：

```
场景：
  用户操作 → AI操作 → 用户操作 → AI操作
  (C1)      (C2)      (C3)      (C4)
  
如果用户在Undo到C1后，从AI Chat回滚C2：
  - Undo历史被重置
  - 当前版本变为C1
  - C3和C4被标记为废弃
```

---

## 10. 实现细节

### 10.1 IndexedDB封装

```typescript
class CheckpointStorage {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('workflow_checkpoints', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建checkpoints store
        if (!db.objectStoreNames.contains('checkpoints')) {
          const checkpointStore = db.createObjectStore('checkpoints', {
            keyPath: 'checkpointId',
          });
          checkpointStore.createIndex('workflowId', 'workflowId');
          checkpointStore.createIndex('version', 'version');
        }
        
        // 创建version_chains store
        if (!db.objectStoreNames.contains('version_chains')) {
          db.createObjectStore('version_chains', {
            keyPath: 'workflowId',
          });
        }
        
        // 创建workflows_cache store
        if (!db.objectStoreNames.contains('workflows_cache')) {
          db.createObjectStore('workflows_cache', {
            keyPath: 'workflowId',
          });
        }
      };
    });
  }
  
  async saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void> {
    // 实现保存逻辑
  }
  
  async loadCheckpoints(workflowId: string): Promise<WorkflowCheckpoint[]> {
    // 实现加载逻辑
  }
  
  async saveVersionChain(chain: VersionChain): Promise<void> {
    // 实现保存版本链逻辑
  }
  
  async loadVersionChain(workflowId: string): Promise<VersionChain | null> {
    // 实现加载版本链逻辑
  }
}
```

### 10.2 性能优化

**1. 延迟计算完整快照**：
- 只在需要时（如快速访问）才计算完整快照
- 大部分情况下只存储和应用增量

**2. 版本链压缩**：
- 如果版本链过长（> 100），考虑压缩旧版本
- 保留关键checkpoint，合并中间的小变更

**3. 批量操作优化**：
- 批量节点操作（如批量删除）合并为单个delta

### 10.3 错误处理

**数据一致性**：
- 如果delta应用失败，回滚到上一个有效版本
- 记录错误日志，便于排查

**存储失败**：
- IndexedDB写入失败时，降级到内存存储
- 定期重试写入
- 提示用户保存到服务器

---

## 11. 使用场景示例

### 11.1 场景1：用户编辑工作流

**步骤**：
1. 用户添加节点A → 立即创建checkpoint C1（USER操作）
2. 用户配置节点A的字段1 → 2秒后创建checkpoint C2（USER操作，防抖）
3. 用户配置节点A的字段2 → 合并到C2（智能合并）
4. 用户添加节点B → 立即创建checkpoint C3（USER操作）
5. 用户Undo → 回退到C2

**结果**：
- 版本链：基线 → C1 → C2 → C3（当前offset=-3）
- Undo后：基线 → C1 → C2（当前offset=-2）
- 节点B被移除，节点A保留字段1和字段2的配置

### 11.2 场景2：AI优化工作流

**步骤**：
1. 用户在offset=-2的位置（C2）
2. 用户在AI Chat中："帮我优化这个工作流"
3. AI执行优化，删除节点A，添加节点C → 创建checkpoint C4（AI操作）
4. 用户发现不满意，点击AI Chat的回滚按钮 → 回滚到C2
5. 创建回滚checkpoint C5（AI操作）

**结果**：
- 版本链：基线 → C1 → C2 → C4 → C5（当前offset=-5）
- 当前版本回到C2的状态
- C4标记为已回滚，但保留在历史中

### 11.3 场景3：用户Undo后继续编辑

**步骤**：
1. 版本链：基线 → C1 → C2 → C3 → C4（当前offset=-4）
2. 用户Undo两次 → 回到C2（offset=-2）
3. 用户添加节点D → 创建checkpoint C5（USER操作）
4. C3和C4被标记为废弃，但保留在历史中

**结果**：
- 版本链：基线 → C1 → C2 → C5（当前offset=-3）
- 废弃链：C3 → C4（仍可访问，但不影响主链）
- 如果用户Redo，没有可用版本（C3和C4已废弃）

### 11.4 场景4：保存后重置基线

**步骤**：
1. 用户在工作流中进行了多次编辑（多个checkpoints）
2. 用户点击"保存"按钮
3. 工作流保存到服务器
4. 当前版本成为新的基线

**结果**：
- 基线版本更新为当前版本
- 版本偏移量重置为0
- 历史checkpoints保留（用于查看历史）
- 新的编辑从offset=-1开始

---

## 12. 实施建议

### 12.1 开发阶段

**Phase 1: 基础框架**
- [ ] 实现Checkpoint数据模型
- [ ] 实现IndexedDB存储
- [ ] 实现基础的版本历史管理器

**Phase 2: 增量管理**
- [ ] 实现Delta计算和应用
- [ ] 实现版本重建
- [ ] 测试增量正确性

**Phase 3: Undo/Redo**
- [ ] 实现版本导航
- [ ] 集成到UI（Undo/Redo按钮）
- [ ] 处理版本分支

**Phase 4: 防抖动**
- [ ] 实现防抖动机制
- [ ] 集成到各个操作点
- [ ] 优化合并策略

**Phase 5: AI集成**
- [ ] AI操作checkpoint创建
- [ ] AI Chat回滚集成
- [ ] 双向同步

### 12.2 测试要点

- 增量计算正确性（各种操作场景）
- Undo/Redo的正确性
- 版本分支处理
- 防抖动效果（不丢失操作，不创建过多checkpoints）
- IndexedDB存储和恢复
- AI操作与用户操作的混合场景

---

## 13. 总结

本文档设计了完整的工作流设计器checkpoint版本管理系统，包括：

1. **浏览器端缓存**：使用IndexedDB缓存所有未保存的版本历史
2. **增量版本管理**：使用Delta而非全量快照，节省存储空间
3. **操作区分**：清晰标记用户操作和AI操作
4. **Undo/Redo**：基于版本偏移量的版本导航
5. **智能防抖动**：分层防抖动策略，平衡响应性和版本历史数量

该方案能够有效支持工作流设计器的版本管理需求，同时保持性能和用户体验。

---

## 附录

### A. 数据结构总结

- `WorkflowCheckpoint`: Checkpoint数据结构
- `WorkflowDelta`: 增量变更数据结构
- `VersionHistoryManager`: 版本历史管理器接口
- `CheckpointDebouncer`: 防抖动管理器
- `CheckpointStorage`: IndexedDB存储封装

### B. 参考文档

- [AI_WORKFLOW_ASSISTANT_DESIGN.md](./AI_WORKFLOW_ASSISTANT_DESIGN.md) - AI助手设计文档（包含checkpoint设计）
- [WORKFLOW_EXECUTION_UPGRADE_DESIGN.md](./WORKFLOW_EXECUTION_UPGRADE_DESIGN.md) - 工作流执行升级设计（包含数据版本管理）

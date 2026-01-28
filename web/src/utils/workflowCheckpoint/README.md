# 工作流 Checkpoint 版本管理系统

## 概述

工作流 Checkpoint 版本管理系统实现了浏览器端的增量版本管理，支持用户操作和AI操作的checkpoint创建、Undo/Redo功能，以及与AI Chat的回滚集成。

## 核心组件

### 1. 类型定义 (`types.ts`)

- `WorkflowDelta`: 增量变更数据结构
- `WorkflowCheckpoint`: Checkpoint数据结构
- `VersionChain`: 版本链数据结构
- `OperationPriority`: 操作优先级枚举

### 2. CheckpointStorage (`CheckpointStorage.ts`)

IndexedDB存储封装，提供：
- `saveCheckpoint()`: 保存checkpoint
- `loadCheckpoints()`: 加载checkpoints
- `saveVersionChain()`: 保存版本链
- `loadVersionChain()`: 加载版本链

### 3. VersionHistoryManager (`VersionHistoryManager.ts`)

版本历史管理器，提供：
- `createCheckpoint()`: 创建checkpoint
- `undo()`: 撤销操作
- `redo()`: 重做操作
- `getCurrentVersion()`: 获取当前版本
- `setBaseline()`: 设置基线版本

### 4. CheckpointDebouncer (`CheckpointDebouncer.ts`)

防抖动管理器，支持：
- `IMMEDIATE`: 立即创建checkpoint
- `SHORT_DEBOUNCE`: 500ms延迟
- `LONG_DEBOUNCE`: 2秒延迟
- `NO_CHECKPOINT`: 不创建checkpoint

### 5. Delta工具 (`deltaUtils.ts`)

- `computeDelta()`: 计算两个工作流之间的增量
- `applyDelta()`: 应用增量到工作流
- `rebuildVersionFromBase()`: 从基线和增量链重建版本

### 6. AI Checkpoint辅助 (`aiCheckpointHelper.ts`)

- `isModifyOperation()`: 检查Function是否是修改操作
- `createBeforeAICheckpoint()`: 在AI操作前创建checkpoint
- `createAICheckpoint()`: 在AI操作后创建checkpoint
- `rollbackAIOperation()`: 回滚AI操作

## 使用方法

### 在 WorkflowDesigner 中使用

```typescript
import { useWorkflowCheckpoint } from '../hooks/useWorkflowCheckpoint';
import { OperationPriority } from '../utils/workflowCheckpoint';

const {
  versionHistory,
  canUndo,
  canRedo,
  initialize,
  createCheckpoint,
  undo,
  redo,
  setBaseline,
} = useWorkflowCheckpoint(workflowId);

// 初始化
useEffect(() => {
  if (workflow) {
    initialize(workflow);
  }
}, [workflow]);

// 创建checkpoint（用户操作）
const handleAddNode = (operator: Operator) => {
  const updatedWorkflow = { ...workflow, nodes: [...workflow.nodes, newNode] };
  setWorkflow(updatedWorkflow);
  
  createCheckpoint(
    updatedWorkflow,
    'USER',
    'USER_ADD_NODE',
    OperationPriority.IMMEDIATE,
    { description: `添加节点: ${operator.name}` }
  );
};

// Undo/Redo
const handleUndo = () => {
  const restoredWorkflow = undo();
  if (restoredWorkflow) {
    setWorkflow(restoredWorkflow);
  }
};
```

### 在 AIChatPanel 中使用

```typescript
// AI操作后创建checkpoint
const handleAIFunctionCall = async (functionName: string, parameters: any) => {
  const previousWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // 执行Function Call
  const result = await api.executeFunction(functionName, parameters);
  
  // 应用修改
  const updatedWorkflow = applyAIModifications(workflow, result);
  
  // 创建checkpoint
  const checkpointId = createCheckpoint(
    updatedWorkflow,
    'AI',
    `AI_${functionName.toUpperCase()}`,
    OperationPriority.IMMEDIATE,
    {
      messageId: currentMessageId,
      description: `AI执行: ${functionName}`,
      functionCall: { name: functionName, parameters },
    }
  );
  
  // 保存checkpoint ID到消息映射
  messageCheckpointsRef.current.set(currentMessageId, checkpointId);
};
```

## 操作优先级

- **IMMEDIATE**: 立即创建checkpoint（添加/删除节点、连接）
- **SHORT_DEBOUNCE**: 500ms延迟（节点位置移动）
- **LONG_DEBOUNCE**: 2秒延迟（节点配置输入）
- **NO_CHECKPOINT**: 不创建checkpoint（拖拽中）

## AI操作回滚

当AI执行修改操作后，用户消息右侧会显示回滚按钮。点击后：
1. 找到AI操作前的checkpoint
2. 重建工作流版本
3. 创建回滚checkpoint
4. 更新工作流状态

## 注意事项

1. Checkpoint存储在IndexedDB中，页面刷新后可以恢复
2. 保存工作流后，当前版本成为新的基线
3. Undo后继续编辑会创建新的分支，旧分支被标记为废弃
4. AI操作和用户操作共享同一个版本历史

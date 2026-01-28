# AIChatPanel Checkpoint集成实现说明

## 实现概述

已成功实现AI操作checkpoint自动创建机制和版本回滚UI功能。

## 核心功能

### 1. AI操作Checkpoint自动创建机制

**实现位置**：`AIChatPanel.tsx` - `useEffect`处理Function Calls

**工作流程**：
1. 监听messages变化，检测assistant消息中的tool_calls
2. 检测是否有修改操作的Function Calls（使用`isModifyOperation`判断）
3. 如果有修改操作，保存当前工作流状态（`workflowBeforeAI`）
4. 执行所有Function Calls
5. 如果Function Calls中包含修改操作且成功修改了工作流：
   - 创建AI操作的checkpoint（使用`createAICheckpoint`）
   - 保存checkpoint ID到`messageCheckpointsRef`
   - 更新消息metadata到`messageMetadataRef`
   - 保存到IndexedDB存储
   - 更新工作流状态

**关键代码**：
```typescript
// 检测修改操作
const hasModifyOperations = toolCalls.some((tc: any) => {
  const functionName = tc.function?.name || tc.name;
  return isModifyOperation(functionName);
});

// 保存操作前状态
const workflowBeforeAI = hasModifyOperations && workflow 
  ? JSON.parse(JSON.stringify(workflow)) 
  : null;

// 执行Function Calls后创建checkpoint
if (hasWorkflowModification && finalUpdatedWorkflow && workflowBeforeAI && versionHistory) {
  const checkpointId = createAICheckpoint(
    workflowBeforeAI,
    finalUpdatedWorkflow,
    versionHistory,
    operationName,
    { function_calls: functionCallResults },
    messageId
  );
  // 保存metadata...
}
```

### 2. 消息Metadata机制

**实现位置**：`AIChatPanel.tsx` - `messageMetadataRef`

**数据结构**：
```typescript
interface MessageMetadata {
  checkpoint_id?: string;
  has_workflow_changes?: boolean;
  operation_type?: 'USER' | 'AI';
  function_calls?: Array<{
    name: string;
    parameters: any;
    result?: any;
  }>;
}
```

**存储位置**：
- `messageCheckpointsRef`: Map<messageId, checkpointId>
- `messageMetadataRef`: Map<messageId, MessageMetadata>

**使用场景**：
- 在Bubble.List的items中，为每个消息添加metadata
- 在assistant消息的footer中，根据metadata显示回滚按钮

### 3. 版本回滚UI

**实现位置**：`AIChatPanel.tsx` - `roleConfig.assistant.footer`

**显示逻辑**：
- 在assistant消息的footer中显示
- 检查消息的metadata中是否有`has_workflow_changes`和`checkpoint_id`
- 如果有，显示回滚按钮（带danger样式）
- 点击回滚按钮，调用`handleRollback`函数

**UI组件**：
```typescript
footer: (message: any) => {
  const messageId = typeof message?.key === 'string' ? message.key : String(message?.key || message?.id || '');
  const metadata = message?.metadata || messageMetadataRef.current.get(messageId);
  const checkpointId = metadata?.checkpoint_id || messageCheckpointsRef.current.get(messageId);
  const hasWorkflowChanges = metadata?.has_workflow_changes || !!checkpointId;
  
  if (hasWorkflowChanges && checkpointId && versionHistory) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* 其他按钮 */}
        <Button
          type="text"
          size="small"
          icon={<RollbackOutlined />}
          onClick={() => handleRollback(messageId, checkpointId)}
          title="回滚到修改前版本"
          danger
        />
      </div>
    );
  }
  // ...
}
```

### 4. 回滚操作实现

**实现位置**：`AIChatPanel.tsx` - `handleRollback`

**工作流程**：
1. 显示确认对话框
2. 用户确认后，调用`rollbackAIOperation`函数
3. 找到AI操作前的checkpoint（父checkpoint）
4. 重建AI操作前的工作流版本
5. 创建回滚checkpoint
6. 保存到存储
7. 更新工作流状态
8. 显示成功提示

**关键代码**：
```typescript
const handleRollback = (messageId: string, checkpointId: string) => {
  Modal.confirm({
    title: '确认回滚',
    content: '确定要回滚到修改前的版本吗？这将撤销该消息导致的所有工作流修改。',
    onOk: async () => {
      const rollbackWorkflow = await rollbackAIOperation(
        messageId,
        checkpointId,
        workflow,
        versionHistory
      );
      if (rollbackWorkflow) {
        onWorkflowUpdate(rollbackWorkflow);
        message.success('工作流已回滚到修改前的版本');
      }
    },
  });
};
```

## 修改操作的Function列表

在`aiCheckpointHelper.ts`中定义了修改操作的Function列表：

```typescript
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
```

这些Function在执行时会自动创建checkpoint。

## 使用场景示例

### 场景1：AI添加节点

1. 用户在AI Chat中："添加一个数据清洗节点"
2. AI调用`add_node_to_workflow` Function
3. 系统自动检测到这是修改操作
4. 保存当前工作流状态
5. 执行Function Call，添加节点
6. 创建AI操作的checkpoint
7. 更新消息metadata
8. 在assistant消息footer中显示回滚按钮

### 场景2：用户点击回滚

1. 用户在assistant消息中看到回滚按钮
2. 点击回滚按钮
3. 显示确认对话框
4. 用户确认后，系统找到AI操作前的checkpoint
5. 重建AI操作前的工作流版本
6. 创建回滚checkpoint
7. 更新工作流状态
8. 工作流恢复到AI操作前的状态

## 注意事项

1. **Checkpoint创建时机**：在Function Call执行后创建，确保能获取到更新后的工作流
2. **Metadata存储**：使用Ref存储，不触发React重渲染
3. **批量Function Calls**：多个修改操作的Function Calls会合并到同一个checkpoint中
4. **回滚操作**：回滚会创建新的checkpoint，保留历史记录
5. **存储持久化**：所有checkpoint存储在IndexedDB中，页面刷新后可以恢复

## 相关文件

- `AIChatPanel.tsx` - 主实现文件
- `aiCheckpointHelper.ts` - Checkpoint辅助函数
- `VersionHistoryManager.ts` - 版本历史管理器
- `CheckpointStorage.ts` - IndexedDB存储封装

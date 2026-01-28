# Function Calling 基础框架

## 概述

基于火山引擎 Function Calling API 实现的工作流AI助手Function Calling框架。

参考文档：https://www.volcengine.com/docs/82379/1262342?lang=zh

## 架构

### 后端（API）

- **FunctionService**: Function注册和执行服务
- **FunctionController**: Function API控制器
- **Functions定义**: 在 `api/src/functions/index.ts` 中定义和注册所有Functions

### 前端

- **functionCalling.ts**: Function类型定义和API调用工具
- **functionCallingHelper.ts**: Function Calling集成辅助工具
- **AIChatPanel**: AI聊天面板，需要集成Function Calling

## 已实现的Functions

1. **get_workflow_detail**: 获取工作流详细信息
2. **search_operators**: 搜索算子

## 添加新的Function

### 1. 在后端定义Function

在 `api/src/functions/index.ts` 中添加新的Function定义：

```typescript
const myNewFunction: FunctionDefinition = {
  schema: {
    name: 'my_function',
    description: '函数描述',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: '参数1描述',
        },
      },
      required: ['param1'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    // 实现Function逻辑
    return {
      success: true,
      data: { /* 返回数据 */ },
    };
  },
};

// 在registerFunctions函数中注册
functionRegistry.register(myNewFunction);
```

### 2. 后端会自动暴露

Function注册后会自动：
- 通过 `/api/ai/functions/schemas` 暴露Schema
- 通过 `/api/ai/functions/execute` 支持执行

## 前端集成

### 获取Function Schemas

```typescript
import { getFunctionSchemas, convertSchemasToTools } from './AI/workflow/functionCalling';

const schemas = await getFunctionSchemas();
const tools = convertSchemasToTools(schemas);
```

### 执行Function Call

```typescript
import { executeFunctionCall } from './AI/workflow/functionCalling';

const result = await executeFunctionCall(
  { name: 'get_workflow_detail', arguments: { workflow_id: 'wf_123' } },
  { workflowId: 'wf_123' }
);
```

### 在AIChatPanel中集成

需要在Provider创建时配置tools参数（如果SDK支持），并在消息处理中处理Function Calls。

## API端点

- `GET /api/ai/functions/schemas` - 获取所有Function Schemas
- `POST /api/ai/functions/execute` - 执行单个Function Call
- `POST /api/ai/functions/execute-batch` - 批量执行Function Calls

## 下一步

- [ ] 在AIChatPanel中完整集成Function Calling
- [ ] 实现更多基础Functions（如add_node_to_workflow等）
- [ ] 实现版本回滚相关Functions
- [ ] 添加Function调用日志和追踪

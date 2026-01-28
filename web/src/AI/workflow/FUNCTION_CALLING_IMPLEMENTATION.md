# Function Calling 基础框架实现总结

## ✅ 已完成

### 1. 核心框架

- ✅ **类型定义** (`web/src/AI/workflow/functionCalling.ts`)
  - FunctionSchema、FunctionCall、FunctionCallResult等类型定义
  - 前端API调用工具函数

- ✅ **后端服务** (`api/src/services/FunctionService.ts`)
  - Function注册表
  - Function执行服务
  - 批量执行支持

- ✅ **后端控制器** (`api/src/controllers/FunctionController.ts`)
  - GET `/api/ai/functions/schemas` - 获取所有Function Schemas
  - POST `/api/ai/functions/execute` - 执行单个Function Call
  - POST `/api/ai/functions/execute-batch` - 批量执行Function Calls

- ✅ **后端路由** (`api/src/routes/function.ts`)
  - 路由定义和Swagger文档

### 2. 基础Functions

- ✅ **get_workflow_detail**
  - 获取工作流详细信息
  - 支持包含算子信息和验证结果

- ✅ **search_operators**
  - 搜索算子
  - 支持按名称、标签、类型、输入输出类型过滤

### 3. 前端工具

- ✅ **Function Calling工具类** (`web/src/AI/workflow/functionCalling.ts`)
  - Schema获取（带缓存）
  - Function执行
  - Schema转换为tools格式

- ✅ **Function Calling辅助工具** (`web/src/AI/workflow/functionCallingHelper.ts`)
  - Function Call提取
  - 结果格式化
  - 批量处理

### 4. API集成

- ✅ **前端API客户端** (`web/src/services/api.ts`)
  - getFunctionSchemas()
  - executeFunction()
  - executeFunctions()

## 🔄 待完成

### 1. AIChatPanel集成

需要在AIChatPanel中：

1. **初始化时加载Function Schemas**
   ```typescript
   useEffect(() => {
     initializeFunctionCalling().then(tools => {
       // 将tools传递给Provider
     });
   }, []);
   ```

2. **在Provider中配置tools参数**
   - 根据Ant Design X SDK的实际API调整
   - 如果SDK不支持，需要自定义请求处理

3. **处理Function Call响应**
   - 检测消息中的Function Calls
   - 执行Functions
   - 将结果返回给AI模型

### 2. 更多Functions实现

根据设计文档，还需要实现：
- add_node_to_workflow
- update_node_config
- auto_configure_node
- add_data_align_node
- optimize_workflow
- create_operator
- rollback_workflow_version
- 等等...

### 3. 版本回滚支持

- create_workflow_checkpoint
- rollback_workflow_version
- get_workflow_version_history

### 4. 选中对象支持

- get_selected_objects_detail

## 📝 使用示例

### 后端添加新Function

```typescript
// api/src/functions/index.ts
const myFunction: FunctionDefinition = {
  schema: {
    name: 'my_function',
    description: '我的函数',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '参数1' },
      },
      required: ['param1'],
    },
  },
  handler: async (args) => {
    return { success: true, data: { result: 'ok' } };
  },
};

// 在registerFunctions()中注册
functionRegistry.register(myFunction);
```

### 前端调用Function

```typescript
import { executeFunctionCall } from './AI/workflow/functionCalling';

const result = await executeFunctionCall(
  { 
    name: 'get_workflow_detail', 
    arguments: { workflow_id: 'wf_123', include_operators: true } 
  },
  { workflowId: 'wf_123' }
);

if (result.success) {
  console.log('Workflow:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## 🔍 测试

### 测试Function Schema获取

```bash
curl http://localhost:3991/api/ai/functions/schemas
```

### 测试Function执行

```bash
curl -X POST http://localhost:3991/api/ai/functions/execute \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "get_workflow_detail",
    "arguments": {
      "workflow_id": "wf_123",
      "include_operators": true
    }
  }'
```

## 📚 参考文档

- 火山引擎Function Calling: https://www.volcengine.com/docs/82379/1262342?lang=zh
- 设计文档: `Docs/AI_WORKFLOW_ASSISTANT_DESIGN.md`

/**
 * Function Calling 辅助工具
 * 用于在AIChatPanel中集成Function Calling
 */

import { 
  getFunctionSchemas, 
  executeFunctionCall, 
  executeFunctionCalls,
  convertSchemasToTools,
  type FunctionCall,
  type FunctionCallResult,
  type FunctionCallContext,
} from './functionCalling';

/**
 * 检测消息中是否包含Function Call
 */
export function extractFunctionCalls(message: any): FunctionCall[] {
  // 根据不同的AI模型返回格式，解析Function Calls
  // OpenAI格式: message.tool_calls
  // 其他格式可能在message.content或其他字段中
  
  if (!message) return [];
  
  // 检查tool_calls字段（OpenAI格式）
  if (message.tool_calls && Array.isArray(message.tool_calls)) {
    return message.tool_calls.map((toolCall: any) => ({
      name: toolCall.function?.name || toolCall.name,
      arguments: typeof toolCall.function?.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function?.arguments || toolCall.arguments || {},
      id: toolCall.id,
    }));
  }
  
  // 检查function_call字段（旧版OpenAI格式）
  if (message.function_call) {
    return [{
      name: message.function_call.name,
      arguments: typeof message.function_call.arguments === 'string'
        ? JSON.parse(message.function_call.arguments)
        : message.function_call.arguments || {},
    }];
  }
  
  return [];
}

/**
 * 将Function Call结果格式化为AI模型可以理解的格式
 */
export function formatFunctionCallResult(functionCall: FunctionCall, result: FunctionCallResult): any {
  // 返回tool_call格式的结果，用于添加到消息历史中
  return {
    role: 'tool',
    tool_call_id: functionCall.id,
    name: functionCall.name,
    content: result.success 
      ? JSON.stringify(result.data)
      : JSON.stringify(result.error),
  };
}

/**
 * 初始化Function Calling
 * 加载Function Schemas并返回tools配置
 */
export async function initializeFunctionCalling(): Promise<any[]> {
  try {
    const schemas = await getFunctionSchemas();
    return convertSchemasToTools(schemas);
  } catch (error) {
    console.error('Failed to initialize function calling:', error);
    return [];
  }
}

/**
 * 处理Function Calls
 * 执行Function Calls并返回格式化的结果
 */
export async function handleFunctionCalls(
  functionCalls: FunctionCall[],
  context?: FunctionCallContext
): Promise<any[]> {
  if (functionCalls.length === 0) {
    return [];
  }

  try {
    // 批量执行Function Calls
    const results = await executeFunctionCalls(functionCalls, context);
    
    // 格式化为工具响应格式
    return functionCalls.map((call, index) => {
      const result = results[index];
      return formatFunctionCallResult(call, result);
    });
  } catch (error: any) {
    console.error('Failed to handle function calls:', error);
    // 返回错误结果
    return functionCalls.map(call => formatFunctionCallResult(call, {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: error.message || 'Failed to execute function',
      },
    }));
  }
}

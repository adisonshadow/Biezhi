/**
 * Function Calling 基础框架
 * 参考：https://www.volcengine.com/docs/82379/1262342?lang=zh
 * 
 * 注意：实际Function执行在后端，前端只负责：
 * 1. 获取Function Schema并传递给AI模型
 * 2. 处理AI返回的Function Call请求
 * 3. 调用后端API执行Function
 * 4. 将结果返回给AI模型继续对话
 */

import { api } from '../../services/api';

/**
 * Function Schema定义（与后端共享类型定义）
 */
export interface FunctionParameter {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number | boolean)[];
  items?: FunctionParameter; // 用于array类型
  properties?: Record<string, FunctionParameter>; // 用于object类型
  required?: boolean;
  default?: any;
}

export interface FunctionSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required?: string[];
  };
}

/**
 * Function Call请求
 */
export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
  id?: string; // 可选的调用ID，用于追踪
}

/**
 * Function Call响应
 */
export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  execution_time_ms?: number;
}

/**
 * Function调用上下文
 */
export interface FunctionCallContext {
  workflowId?: string;
  userId?: string;
  messageId?: string;
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  [key: string]: any;
}

/**
 * 从后端获取所有Functions的Schema
 */
let cachedSchemas: FunctionSchema[] | null = null;
let schemaFetchTime: number = 0;
const SCHEMA_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export async function getFunctionSchemas(): Promise<FunctionSchema[]> {
  // 使用缓存
  const now = Date.now();
  if (cachedSchemas && (now - schemaFetchTime) < SCHEMA_CACHE_TTL) {
    return cachedSchemas;
  }

  try {
    const response = await api.getFunctionSchemas();
    if (response.success && response.data) {
      cachedSchemas = response.data;
      schemaFetchTime = now;
      return cachedSchemas || [];
    }
    throw new Error('Failed to fetch function schemas');
  } catch (error: any) {
    console.error('Failed to fetch function schemas:', error);
    // 如果缓存存在，返回缓存
    if (cachedSchemas) {
      return cachedSchemas;
    }
    throw error;
  }
}

/**
 * 清除Schema缓存
 */
export function clearSchemaCache(): void {
  cachedSchemas = null;
  schemaFetchTime = 0;
}

/**
 * 执行Function Call（通过后端API）
 */
export async function executeFunctionCall(
  functionCall: FunctionCall,
  context?: FunctionCallContext
): Promise<FunctionCallResult> {
  try {
    const result = await api.executeFunction(functionCall.name, functionCall.arguments, context);
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error.message || 'Failed to execute function',
      },
    };
  }
}

/**
 * 批量执行Function Calls
 */
export async function executeFunctionCalls(
  functionCalls: FunctionCall[],
  context?: FunctionCallContext
): Promise<FunctionCallResult[]> {
  try {
    const result = await api.executeFunctions(
      functionCalls.map(call => ({ name: call.name, arguments: call.arguments })),
      context
    );
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    throw new Error('Invalid response format');
  } catch (error: any) {
    // 如果批量执行失败，尝试逐个执行
    console.warn('Batch execution failed, falling back to individual execution:', error);
    return Promise.all(functionCalls.map(call => executeFunctionCall(call, context)));
  }
}

/**
 * 将Function Schema转换为AI模型需要的格式（OpenAI/DeepSeek格式）
 */
export function convertSchemasToTools(schemas: FunctionSchema[]): any[] {
  return schemas.map(schema => ({
    type: 'function',
    function: {
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
    },
  }));
}

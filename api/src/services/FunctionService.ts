/**
 * Function Calling 服务
 * 负责注册、管理和执行Functions
 */

// 类型定义（与前端共享）
export interface FunctionParameter {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number | boolean)[];
  items?: FunctionParameter;
  properties?: Record<string, FunctionParameter>;
  additionalProperties?: boolean | FunctionParameter; // JSON Schema 支持：允许额外的属性
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

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
  id?: string;
}

export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[]; // 修复建议
  };
  execution_time_ms?: number;
}

export interface FunctionCallContext {
  workflowId?: string;
  userId?: string;
  messageId?: string;
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  [key: string]: any;
}

export interface FunctionDefinition {
  schema: FunctionSchema;
  handler: (args: Record<string, any>, context?: FunctionCallContext) => Promise<FunctionCallResult>;
}

/**
 * Function注册表（后端版本）
 */
class FunctionRegistry {
  private functions: Map<string, FunctionDefinition> = new Map();

  register(functionDef: FunctionDefinition): void {
    if (this.functions.has(functionDef.schema.name)) {
      console.warn(`Function ${functionDef.schema.name} is already registered, overwriting...`);
    }
    this.functions.set(functionDef.schema.name, functionDef);
  }

  get(name: string): FunctionDefinition | undefined {
    return this.functions.get(name);
  }

  getAllSchemas(): FunctionSchema[] {
    return Array.from(this.functions.values()).map(fn => fn.schema);
  }

  has(name: string): boolean {
    return this.functions.has(name);
  }

  async execute(
    name: string, 
    args: Record<string, any>, 
    context?: FunctionCallContext
  ): Promise<FunctionCallResult> {
    const functionDef = this.functions.get(name);
    if (!functionDef) {
      return {
        success: false,
        error: {
          code: 'FUNCTION_NOT_FOUND',
          message: `Function ${name} is not registered`,
        },
      };
    }

    try {
      const startTime = Date.now();
      const result = await functionDef.handler(args, context);
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        execution_time_ms: executionTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Unknown error occurred',
          details: error.stack,
        },
      };
    }
  }

  /**
   * 批量执行Function Calls
   */
  async executeBatch(
    functionCalls: FunctionCall[],
    context?: FunctionCallContext
  ): Promise<FunctionCallResult[]> {
    return Promise.all(
      functionCalls.map(call => this.execute(call.name, call.arguments, context))
    );
  }
}

// 创建全局注册表实例
export const functionRegistry = new FunctionRegistry();

/**
 * Function Service
 */
export class FunctionService {
  /**
   * 清理Schema，移除properties内部的required字段（不符合JSON Schema规范）
   */
  private cleanSchema(schema: FunctionSchema): FunctionSchema {
    const cleaned = JSON.parse(JSON.stringify(schema)); // 深拷贝
    
    if (cleaned.parameters?.properties) {
      // 移除所有properties内部的required字段
      for (const key in cleaned.parameters.properties) {
        const prop = cleaned.parameters.properties[key];
        if (prop && typeof prop === 'object') {
          delete prop.required;
          // 递归清理嵌套的properties
          if (prop.properties) {
            this.cleanNestedProperties(prop.properties);
          }
          if (prop.items && prop.items.properties) {
            this.cleanNestedProperties(prop.items.properties);
          }
        }
      }
    }
    
    return cleaned;
  }

  /**
   * 递归清理嵌套的properties
   */
  private cleanNestedProperties(properties: Record<string, FunctionParameter>): void {
    for (const key in properties) {
      const prop = properties[key];
      if (prop && typeof prop === 'object') {
        delete prop.required;
        if (prop.properties) {
          this.cleanNestedProperties(prop.properties);
        }
        if (prop.items && prop.items.properties) {
          this.cleanNestedProperties(prop.items.properties);
        }
      }
    }
  }

  /**
   * 获取所有Functions的Schema（已清理格式）
   */
  getAllSchemas(): FunctionSchema[] {
    const schemas = functionRegistry.getAllSchemas();
    return schemas.map(schema => this.cleanSchema(schema));
  }

  /**
   * 执行单个Function Call
   */
  async executeFunction(
    functionCall: FunctionCall,
    context?: FunctionCallContext
  ): Promise<FunctionCallResult> {
    return functionRegistry.execute(functionCall.name, functionCall.arguments, context);
  }

  /**
   * 批量执行Function Calls
   */
  async executeFunctions(
    functionCalls: FunctionCall[],
    context?: FunctionCallContext
  ): Promise<FunctionCallResult[]> {
    return functionRegistry.executeBatch(functionCalls, context);
  }
}

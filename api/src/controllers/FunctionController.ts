import { Context } from 'koa';
import { FunctionService } from '../services/FunctionService';
import type { FunctionCall, FunctionCallContext } from '../services/FunctionService';

const functionService = new FunctionService();

/**
 * Function Controller
 */
export class FunctionController {
  /**
   * 获取所有Functions的Schema
   */
  async getSchemas(ctx: Context) {
    try {
      const schemas = functionService.getAllSchemas();
      ctx.body = {
        success: true,
        data: schemas,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * 执行Function Call
   */
  async executeFunction(ctx: Context) {
    try {
      const { function_name, arguments: args, context: callContext } = ctx.request.body as {
        function_name: string;
        arguments?: Record<string, any>;
        context?: FunctionCallContext;
      };

      if (!function_name) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'function_name is required',
          },
        };
        return;
      }

      const functionCall: FunctionCall = {
        name: function_name,
        arguments: args || {},
      };

      // 从请求中提取上下文信息（如workflowId等）
      const context: FunctionCallContext = {
        ...callContext,
        // 可以从ctx.state中获取用户信息等
        userId: (ctx as any).state?.userId,
      };

      const result = await functionService.executeFunction(functionCall, context);

      if (!result.success) {
        ctx.status = 400;
      }

      ctx.body = result;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * 批量执行Function Calls
   */
  async executeFunctions(ctx: Context) {
    try {
      const { function_calls, context: callContext } = ctx.request.body as {
        function_calls: FunctionCall[];
        context?: FunctionCallContext;
      };

      if (!function_calls || !Array.isArray(function_calls)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'function_calls must be an array',
          },
        };
        return;
      }

      const context: FunctionCallContext = {
        ...callContext,
        userId: (ctx as any).state?.userId,
      };

      const results = await functionService.executeFunctions(function_calls, context);

      ctx.body = {
        success: true,
        data: results,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }
}

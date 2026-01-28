/// <reference path="../types.d.ts" />
import { Context } from 'koa';
import { AppDataSource } from '../../../config/database';
import { WorkflowExecution, ExecutionStatus } from '../../../package/entities/WorkflowExecution';
import { WorkflowExecutionLog, LogLevel } from '../../../package/entities/WorkflowExecutionLog';
import { ExecutionService } from '../services/ExecutionService';
import { sseService } from '../services/SSEService';
import { v4 as uuidv4 } from 'uuid';

export class ExecutionController {
  private service: ExecutionService;

  constructor() {
    this.service = new ExecutionService();
  }

  /**
   * 创建执行任务
   * POST /api/executions
   */
  async create(ctx: Context) {
    try {
      const { workflowId, inputData } = ctx.request.body as any;
      const execution = await this.service.createExecution(workflowId, inputData);
      ctx.status = 201;
      ctx.body = execution;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取所有执行任务
   * GET /api/executions?status=xxx&workflowId=xxx
   */
  async list(ctx: Context) {
    try {
      const { status, workflowId } = ctx.query;
      const executions = await this.service.listExecutions(
        status as ExecutionStatus | undefined,
        workflowId as string | undefined
      );
      ctx.body = executions;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取执行任务详情
   * GET /api/executions/:id
   */
  async getById(ctx: Context) {
    try {
      const { id } = ctx.params;
      const execution = await this.service.getExecutionById(id);
      if (!execution) {
        ctx.status = 404;
        ctx.body = { error: 'Execution not found' };
        return;
      }
      ctx.body = execution;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 启动执行任务
   * POST /api/executions/:id/start
   */
  async start(ctx: Context) {
    try {
      const { id } = ctx.params;
      await this.service.startExecution(id);
      ctx.body = { message: 'Execution started' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 停止执行任务
   * POST /api/executions/:id/stop
   */
  async stop(ctx: Context) {
    try {
      const { id } = ctx.params;
      await this.service.stopExecution(id);
      ctx.body = { message: 'Execution stopped' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 删除执行任务
   * DELETE /api/executions/:id
   */
  async delete(ctx: Context) {
    try {
      const { id } = ctx.params;
      await this.service.deleteExecution(id);
      ctx.status = 200;
      ctx.body = { message: 'Execution deleted successfully' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取执行日志
   * GET /api/executions/:id/logs
   */
  async getLogs(ctx: Context) {
    try {
      const { id } = ctx.params;
      const logs = await this.service.getExecutionLogs(id);
      ctx.body = logs;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 执行单个节点（用于节点调试）
   * POST /api/executions/node/execute
   */
  async executeNode(ctx: Context) {
    try {
      const { operatorId, config, inputs } = ctx.request.body as any;

      if (!operatorId) {
        ctx.status = 400;
        ctx.body = { error: 'operatorId is required' };
        return;
      }

      const result = await this.service.executeSingleNode(operatorId, config || {}, inputs || {});
      ctx.body = {
        success: true,
        result,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 一键执行工作流
   * POST /api/executions/workflow/:workflowId/execute-full?stream=true
   * 如果 stream=true，使用SSE推送结果；否则同步执行并返回所有结果
   */
  async executeFullWorkflow(ctx: Context) {
    try {
      const { workflowId } = ctx.params;
      const { inputData } = ctx.request.body as any;
      const useSSE = ctx.query.stream === 'true' || ctx.query.stream === true;

      if (useSSE) {
        // SSE模式：返回sessionId，通过SSE推送结果
        const sessionId = await this.service.executeFullWorkflow(workflowId, inputData, true) as string;
        ctx.body = {
          success: true,
          sessionId,
        };
      } else {
        // 同步模式：等待执行完成，返回所有结果
        const nodeResults = await this.service.executeFullWorkflow(workflowId, inputData, false) as Map<string, any>;
        // 将Map转换为对象以便序列化
        const results: Record<string, any> = {};
        nodeResults.forEach((result, nodeId) => {
          results[nodeId] = result;
        });
        ctx.body = {
          success: true,
          results,
        };
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 单节点执行
   * POST /api/executions/workflow/:workflowId/node/:nodeId/execute?stream=true
   * 如果 stream=true，使用SSE推送结果；否则同步执行并返回结果
   */
  async executeSingleNodeInWorkflow(ctx: Context) {
    try {
      const { workflowId, nodeId } = ctx.params;
      const { config } = ctx.request.body as any;
      const useSSE = ctx.query.stream === 'true' || ctx.query.stream === true;

      if (useSSE) {
        // SSE模式：返回sessionId，通过SSE推送结果
        const sessionId = await this.service.executeSingleNodeInWorkflow(workflowId, nodeId, config || {}, true) as string;
        ctx.body = {
          success: true,
          sessionId,
        };
      } else {
        // 同步模式：等待执行完成，返回结果
        const result = await this.service.executeSingleNodeInWorkflow(workflowId, nodeId, config || {}, false);
        ctx.body = {
          success: true,
          result,
        };
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 部分执行（从指定节点开始执行）
   * POST /api/executions/workflow/:workflowId/execute-partial?stream=true
   * 如果 stream=true，使用SSE推送结果；否则同步执行并返回所有结果
   */
  async executePartialWorkflow(ctx: Context) {
    try {
      const { workflowId } = ctx.params;
      const { nodeIds, nodeConfigs } = ctx.request.body as any;
      const useSSE = ctx.query.stream === 'true' || ctx.query.stream === true;

      if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
        ctx.status = 400;
        ctx.body = { error: 'nodeIds is required and must be a non-empty array' };
        return;
      }

      // 将 nodeConfigs 转换为 Map
      const configMap = new Map<string, any>();
      if (nodeConfigs && typeof nodeConfigs === 'object') {
        for (const [nodeId, config] of Object.entries(nodeConfigs)) {
          configMap.set(nodeId, config);
        }
      }

      if (useSSE) {
        // SSE模式：返回sessionId，通过SSE推送结果
        const sessionId = await this.service.executePartialWorkflow(workflowId, nodeIds, configMap, true) as string;
        ctx.body = {
          success: true,
          sessionId,
        };
      } else {
        // 同步模式：等待执行完成，返回所有结果
        const nodeResults = await this.service.executePartialWorkflow(workflowId, nodeIds, configMap, false) as Map<string, any>;
        // 将Map转换为对象以便序列化
        const results: Record<string, any> = {};
        nodeResults.forEach((result, nodeId) => {
          results[nodeId] = result;
        });
        ctx.body = {
          success: true,
          results,
        };
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取节点执行数据
   * GET /api/executions/workflow/:workflowId/node/:nodeId/data
   */
  async getNodeExecutionData(ctx: Context) {
    try {
      const { workflowId, nodeId } = ctx.params;
      const { version } = ctx.query;

      const versionNumber = version ? parseInt(version as string, 10) : undefined;
      const data = await this.service.getNodeExecutionData(workflowId, versionNumber, nodeId);
      
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: 'Node execution data not found' };
        return;
      }

      ctx.body = {
        success: true,
        data,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取执行会话状态
   * GET /api/executions/session/:sessionId
   */
  async getExecutionSession(ctx: Context) {
    try {
      const { sessionId } = ctx.params;
      const session = await this.service.getExecutionSession(sessionId);
      
      if (!session) {
        ctx.status = 404;
        ctx.body = { error: 'Execution session not found' };
        return;
      }

      // 将 Map 转换为普通对象以便序列化
      const serializedSession = {
        ...session,
        nodeStatuses: session.nodeStatuses ? Object.fromEntries(session.nodeStatuses) : {},
      };

      ctx.body = {
        success: true,
        session: serializedSession,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * SSE流式推送执行结果
   * GET /api/executions/session/:sessionId/stream
   */
  async streamExecutionSession(ctx: Context) {
    try {
      const { sessionId } = ctx.params;
      const session = await this.service.getExecutionSession(sessionId);
      
      if (!session) {
        ctx.status = 404;
        ctx.body = { error: 'Execution session not found' };
        return;
      }

      // 设置SSE响应头（必须在写入响应之前设置）
      ctx.status = 200;
      ctx.type = 'text/event-stream';
      ctx.set('Cache-Control', 'no-cache');
      ctx.set('Connection', 'keep-alive');
      ctx.set('X-Accel-Buffering', 'no'); // 禁用nginx缓冲
      ctx.set('Access-Control-Allow-Origin', '*'); // 允许跨域
      ctx.set('Access-Control-Allow-Headers', 'Cache-Control');

      // 告诉Koa不要自动处理响应，由我们自己控制流式响应
      // @ts-ignore - Koa内部属性
      ctx.respond = false;

      // 手动写入响应头
      ctx.res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // 注册SSE连接
      sseService.registerConnection(sessionId, ctx);

      // 如果会话已完成，立即发送最终结果
      if (session.status !== 'RUNNING') {
        // 获取所有节点结果
        const nodeResults = new Map<string, any>();
        if (session.nodeStatuses) {
          for (const [nodeId, status] of session.nodeStatuses.entries()) {
            const nodeData = await this.service.getNodeExecutionData(
              session.workflowId,
              session.dataVersion,
              nodeId
            );
            if (nodeData) {
              nodeResults.set(nodeId, {
                success: status === 'SUCCESS',
                outputData: nodeData.outputData,
                error: nodeData.error,
                duration: nodeData.duration,
                status,
              });
            }
          }
        }
        sseService.sendSessionComplete(
          sessionId,
          session.workflowId,
          session.status,
          nodeResults
        );
        // 延迟关闭连接
        setTimeout(() => {
          sseService.closeSession(sessionId);
        }, 100);
      }
    } catch (error: any) {
      console.error('SSE stream error:', error);
      // 如果响应已经开始，尝试发送错误
      try {
        if (!ctx.res.headersSent) {
          ctx.status = 500;
          ctx.body = { error: error.message };
        } else {
          // 响应已经开始，直接写入错误
          const errorEvent = JSON.stringify({
            type: 'error',
            error: error.message,
            timestamp: Date.now(),
          });
          ctx.res.write(`data: ${errorEvent}\n\n`);
          ctx.res.end();
        }
      } catch (writeError) {
        console.error('Failed to write error to SSE stream:', writeError);
      }
    }
  }
}


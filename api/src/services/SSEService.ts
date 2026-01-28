/**
 * SSE (Server-Sent Events) 服务
 * 用于实时推送工作流执行过程中的状态和结果
 */

import { Context } from 'koa';
import { NodeExecutionStatus, ExecutionSessionStatus } from './WorkflowExecutionDataStore';

export interface SSEEvent {
  type: 'session_start' | 'node_status' | 'node_result' | 'node_input_update' | 'session_complete' | 'error' | 'heartbeat';
  sessionId?: string;
  workflowId?: string;
  nodeId?: string;
  status?: NodeExecutionStatus | ExecutionSessionStatus;
  data?: any;
  error?: string;
  timestamp: number;
}

export class SSEService {
  private connections: Map<string, Set<Context>> = new Map();

  /**
   * 注册SSE连接
   */
  registerConnection(sessionId: string, ctx: Context): void {
    if (!this.connections.has(sessionId)) {
      this.connections.set(sessionId, new Set());
    }
    this.connections.get(sessionId)!.add(ctx);

    // 发送初始连接确认
    this.sendEvent(ctx, {
      type: 'session_start',
      sessionId,
      timestamp: Date.now(),
    });

    // 当连接关闭时清理
    ctx.req.on('close', () => {
      this.unregisterConnection(sessionId, ctx);
    });

    ctx.req.on('error', (error) => {
      console.error('SSE connection error:', error);
      this.unregisterConnection(sessionId, ctx);
    });
  }

  /**
   * 注销SSE连接
   */
  unregisterConnection(sessionId: string, ctx: Context): void {
    const connections = this.connections.get(sessionId);
    if (connections) {
      connections.delete(ctx);
      if (connections.size === 0) {
        this.connections.delete(sessionId);
      }
    }
  }

  /**
   * 发送事件到指定会话的所有连接
   */
  sendToSession(sessionId: string, event: SSEEvent): void {
    const connections = this.connections.get(sessionId);
    if (connections) {
      connections.forEach(ctx => {
        this.sendEvent(ctx, event);
      });
    }
  }

  /**
   * 发送事件到单个连接
   */
  private sendEvent(ctx: Context, event: SSEEvent): void {
    try {
      const data = JSON.stringify(event);
      ctx.res.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Failed to send SSE event:', error);
    }
  }

  /**
   * 发送节点状态更新
   */
  sendNodeStatus(
    sessionId: string,
    workflowId: string,
    nodeId: string,
    status: NodeExecutionStatus
  ): void {
    this.sendToSession(sessionId, {
      type: 'node_status',
      sessionId,
      workflowId,
      nodeId,
      status,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送节点输入数据更新
   */
  sendNodeInputUpdate(
    sessionId: string,
    workflowId: string,
    nodeId: string,
    inputData: Record<string, any>,
    updateType: 'full' | 'incremental' = 'full'
  ): void {
    this.sendToSession(sessionId, {
      type: 'node_input_update',
      sessionId,
      workflowId,
      nodeId,
      data: {
        inputData,
        updateType,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 发送节点执行结果
   */
  sendNodeResult(
    sessionId: string,
    workflowId: string,
    nodeId: string,
    result: {
      success: boolean;
      outputData?: any;
      error?: string;
      duration?: number;
    }
  ): void {
    this.sendToSession(sessionId, {
      type: 'node_result',
      sessionId,
      workflowId,
      nodeId,
      status: result.success ? NodeExecutionStatus.SUCCESS : NodeExecutionStatus.FAILED,
      data: result.outputData,
      error: result.error,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送会话完成事件（包含所有节点结果）
   */
  sendSessionComplete(
    sessionId: string,
    workflowId: string,
    status: ExecutionSessionStatus,
    nodeResults: Map<string, {
      success: boolean;
      outputData?: any;
      error?: string;
      duration?: number;
      status: NodeExecutionStatus;
    }>
  ): void {
    // 将Map转换为对象以便序列化
    const results: Record<string, any> = {};
    nodeResults.forEach((result, nodeId) => {
      results[nodeId] = result;
    });

    this.sendToSession(sessionId, {
      type: 'session_complete',
      sessionId,
      workflowId,
      status,
      data: results,
      timestamp: Date.now(),
    });

    // 发送完成后关闭连接
    setTimeout(() => {
      this.closeSession(sessionId);
    }, 100);
  }

  /**
   * 发送错误事件
   */
  sendError(sessionId: string, error: string): void {
    this.sendToSession(sessionId, {
      type: 'error',
      sessionId,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(sessionId: string): void {
    this.sendToSession(sessionId, {
      type: 'heartbeat',
      sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * 关闭会话的所有连接
   */
  closeSession(sessionId: string): void {
    const connections = this.connections.get(sessionId);
    if (connections) {
      connections.forEach(ctx => {
        try {
          ctx.res.end();
        } catch (error) {
          console.error('Failed to close SSE connection:', error);
        }
      });
      this.connections.delete(sessionId);
    }
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnections(sessionId?: string): number {
    if (sessionId) {
      return this.connections.get(sessionId)?.size || 0;
    }
    let total = 0;
    this.connections.forEach(connections => {
      total += connections.size;
    });
    return total;
  }
}

// 单例实例
export const sseService = new SSEService();


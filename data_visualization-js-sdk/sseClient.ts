/**
 * Data Visualization SSE 客户端
 * 专门用于接收节点输入数据更新的 SSE 连接
 */

import type { NodeInputUpdateEvent } from './types';

export interface DataVisualizationSSECallbacks {
  onNodeInputUpdate?: (event: NodeInputUpdateEvent) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * 数据可视化专用的 SSE 客户端
 */
export class DataVisualizationSSEClient {
  private eventSource: EventSource | null = null;
  private workflowId: string;
  private nodeId: string;
  private callbacks: DataVisualizationSSECallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private baseUrl: string;

  constructor(
    workflowId: string,
    nodeId: string,
    callbacks: DataVisualizationSSECallbacks,
    baseUrl: string = ''
  ) {
    this.workflowId = workflowId;
    this.nodeId = nodeId;
    this.callbacks = callbacks;
    this.baseUrl = baseUrl;
  }

  /**
   * 连接 SSE 流
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('[DataVisualizationSSE] 连接已存在');
      return;
    }

    // 构建 SSE URL
    const url = `${this.baseUrl}/api/executions/workflow/${this.workflowId}/node/${this.nodeId}/data-visualization/stream`;
    
    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('[DataVisualizationSSE] 连接已建立', { workflowId: this.workflowId, nodeId: this.nodeId });
        this.reconnectAttempts = 0;
        if (this.callbacks.onConnect) {
          this.callbacks.onConnect();
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: NodeInputUpdateEvent = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (error) {
          console.error('[DataVisualizationSSE] 解析数据失败:', error, event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[DataVisualizationSSE] 连接错误:', error);
        
        // 如果连接关闭，尝试重连
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error('[DataVisualizationSSE] 创建连接失败:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(`连接失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * 处理 SSE 事件
   */
  private handleEvent(event: NodeInputUpdateEvent): void {
    // 验证事件类型
    if (event.type !== 'full' && event.type !== 'incremental') {
      console.warn('[DataVisualizationSSE] 未知的更新类型:', event.type);
      return;
    }

    // 验证节点 ID 是否匹配
    if (event.nodeId !== this.nodeId) {
      console.warn('[DataVisualizationSSE] 节点 ID 不匹配:', event.nodeId, '期望:', this.nodeId);
      return;
    }

    if (this.callbacks.onNodeInputUpdate) {
      this.callbacks.onNodeInputUpdate(event);
    }
  }

  /**
   * 重连
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DataVisualizationSSE] 重连次数已达上限，停止重连');
      if (this.callbacks.onError) {
        this.callbacks.onError('连接失败，已停止重连');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`[DataVisualizationSSE] 重连中... (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms后重试`);
    
    this.reconnectTimer = setTimeout(() => {
      this.disconnect();
      this.connect();
    }, delay);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

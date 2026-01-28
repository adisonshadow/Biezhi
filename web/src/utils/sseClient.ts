/**
 * SSE客户端工具类
 * 用于连接和执行会话的SSE流，实时接收执行结果
 */

export interface SSEEvent {
  type: 'session_start' | 'node_status' | 'node_result' | 'session_complete' | 'error' | 'heartbeat';
  sessionId?: string;
  workflowId?: string;
  nodeId?: string;
  status?: string;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface SSECallbacks {
  onNodeStatus?: (nodeId: string, status: string) => void;
  onNodeResult?: (nodeId: string, result: {
    success: boolean;
    outputData?: any;
    error?: string;
    duration?: number;
    status: string;
  }) => void;
  onNodeInputUpdate?: (nodeId: string, inputData: Record<string, any>, updateType: 'full' | 'incremental') => void;
  onSessionComplete?: (results: Record<string, any>) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private sessionId: string;
  private callbacks: SSECallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(sessionId: string, callbacks: SSECallbacks) {
    this.sessionId = sessionId;
    this.callbacks = callbacks;
  }

  /**
   * 连接SSE流
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('SSE connection already exists');
      return;
    }

    const url = `/api/executions/session/${this.sessionId}/stream`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE连接已建立', this.sessionId);
      this.reconnectAttempts = 0;
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        this.handleEvent(data);
      } catch (error) {
        console.error('解析SSE数据失败:', error, event.data);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      
      // 如果连接关闭，尝试重连
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.reconnect();
      }
    };
  }

  /**
   * 处理SSE事件
   */
  private handleEvent(event: SSEEvent): void {
    switch (event.type) {
      case 'session_start':
        console.log('会话开始:', event.sessionId);
        break;

      case 'node_status':
        if (event.nodeId && event.status && this.callbacks.onNodeStatus) {
          this.callbacks.onNodeStatus(event.nodeId, event.status);
        }
        break;

      case 'node_result':
        if (event.nodeId && this.callbacks.onNodeResult) {
          this.callbacks.onNodeResult(event.nodeId, {
            success: event.status === 'SUCCESS',
            outputData: event.data,
            error: event.error,
            status: event.status || 'UNKNOWN',
          });
        }
        break;

      case 'node_input_update':
        if (event.nodeId && this.callbacks.onNodeInputUpdate && event.data) {
          // event.data 应该包含 inputData 和 updateType
          const inputData = event.data.inputData || event.data;
          const updateType = event.data.updateType || 'full';
          this.callbacks.onNodeInputUpdate(event.nodeId, inputData, updateType);
        }
        break;

      case 'session_complete':
        if (this.callbacks.onSessionComplete && event.data) {
          // event.data 包含所有节点的执行结果
          this.callbacks.onSessionComplete(event.data);
        }
        // 会话完成，关闭连接
        this.disconnect();
        break;

      case 'error':
        if (this.callbacks.onError && event.error) {
          this.callbacks.onError(event.error);
        }
        break;

      case 'heartbeat':
        // 心跳消息，保持连接活跃
        break;

      default:
        console.warn('未知的SSE事件类型:', event.type);
    }
  }

  /**
   * 重连
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE重连次数已达上限，停止重连');
      if (this.callbacks.onError) {
        this.callbacks.onError('连接失败，已停止重连');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`SSE重连中... (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms后重试`);
    
    setTimeout(() => {
      this.disconnect();
      this.connect();
    }, delay);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
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


/**
 * Data Visualization JS SDK 核心实现
 * 基于 postMessage 通信，用于 iframe 内部
 */

import type {
  DataVisualizationSDK,
  SDKOptions,
  FullUpdateCallback,
  IncrementalUpdateCallback,
  NodeInfo,
} from './types';

/**
 * 主应用发送的消息格式
 */
interface DataMessage {
  type: 'data_update' | 'config_update' | 'node_info';
  payload: {
    data?: Record<string, any>;
    config?: any;
    nodeInfo?: NodeInfo;
    updateType?: 'full' | 'incremental';
    version?: number;
  };
}

/**
 * Data Visualization SDK 实现类
 * 在 iframe 内部使用，通过 postMessage 接收主应用的数据
 */
export class DataVisualizationSDKImpl implements DataVisualizationSDK {
  private currentData: Record<string, any> = {};
  private currentConfig: any = null;
  private dataVersion: number = 0;
  private fullUpdateCallbacks: FullUpdateCallback[] = [];
  private incrementalUpdateCallbacks: IncrementalUpdateCallback[] = [];
  private nodeInfo: NodeInfo | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private isInitialized: boolean = false;

  constructor(options?: SDKOptions) {
    // 如果提供了选项，初始化节点信息
    if (options) {
      this.nodeInfo = {
        nodeId: options.nodeId,
        operatorId: options.operatorId,
        operatorName: options.operatorName,
        workflowId: options.workflowId || '',
      };
    }

    // 初始化 postMessage 监听
    this.initPostMessageListener();
  }

  /**
   * 初始化 postMessage 监听器
   */
  private initPostMessageListener(): void {
    if (this.messageHandler) {
      return;
    }

    this.messageHandler = (event: MessageEvent) => {
      // 验证消息来源（可选，根据实际需求调整）
      // 注意：在 iframe 中，event.origin 是主应用的 origin
      
      try {
        const message: DataMessage = event.data;
        
        if (!message || !message.type) {
          return;
        }

        switch (message.type) {
          case 'data_update':
            this.handleDataUpdate(message.payload);
            break;
          
          case 'config_update':
            this.handleConfigUpdate(message.payload);
            break;
          
          case 'node_info':
            this.handleNodeInfoUpdate(message.payload);
            break;
        }
      } catch (error) {
        console.error('[DataVisualizationSDK] 处理消息失败:', error);
      }
    };

    window.addEventListener('message', this.messageHandler);

    // 发送就绪消息，通知主应用 iframe 已准备好
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ready'
      }, '*'); // iframe 可能不知道主应用的 origin，主应用需在接收时验证
    }

    this.isInitialized = true;
  }

  /**
   * 处理数据更新
   */
  private handleDataUpdate(payload: DataMessage['payload']): void {
    if (!payload.data) {
      return;
    }

    const updateType = payload.updateType || 'full';
    const version = payload.version || Date.now();

    this.dataVersion = version;

    if (updateType === 'full') {
      // 全量更新：替换所有数据
      this.currentData = { ...payload.data };
      
      // 调用所有全量更新回调
      this.fullUpdateCallbacks.forEach((callback) => {
        try {
          callback(this.getAllInputData());
        } catch (error) {
          console.error('[DataVisualizationSDK] 全量更新回调执行失败:', error);
        }
      });
    } else {
      // 增量更新：合并到当前数据
      this.currentData = { ...this.currentData, ...payload.data };
      
      // 调用所有增量更新回调
      this.incrementalUpdateCallbacks.forEach((callback) => {
        try {
          callback(payload.data!);
        } catch (error) {
          console.error('[DataVisualizationSDK] 增量更新回调执行失败:', error);
        }
      });
    }
  }

  /**
   * 处理配置更新
   */
  private handleConfigUpdate(payload: DataMessage['payload']): void {
    if (payload.config !== undefined) {
      this.currentConfig = payload.config;
    }
  }

  /**
   * 处理节点信息更新
   */
  private handleNodeInfoUpdate(payload: DataMessage['payload']): void {
    if (payload.nodeInfo) {
      this.nodeInfo = payload.nodeInfo;
    }
  }

  /**
   * 获取节点的输入数据
   */
  getInputData(portName?: string): any {
    if (portName) {
      return this.currentData[portName];
    }
    return this.currentData;
  }

  /**
   * 获取所有输入数据
   */
  getAllInputData(): Record<string, any> {
    return { ...this.currentData };
  }

  /**
   * 获取节点配置
   */
  getConfig(): any {
    return this.currentConfig;
  }

  /**
   * 监听全量数据更新
   */
  onDataUpdate(callback: (data: Record<string, any>, type: 'full' | 'incremental') => void): () => void {
    // 兼容旧的 API
    const fullCallback: FullUpdateCallback = (data) => callback(data, 'full');
    const incrementalCallback: IncrementalUpdateCallback = (data) => callback(data, 'incremental');
    
    this.fullUpdateCallbacks.push(fullCallback);
    this.incrementalUpdateCallbacks.push(incrementalCallback);
    
    // 立即调用一次，传递当前数据
    if (Object.keys(this.currentData).length > 0) {
      try {
        callback(this.getAllInputData(), 'full');
      } catch (error) {
        console.error('[DataVisualizationSDK] 数据更新回调执行失败:', error);
      }
    }
    
    // 返回取消订阅函数
    return () => {
      const fullIndex = this.fullUpdateCallbacks.indexOf(fullCallback);
      if (fullIndex > -1) {
        this.fullUpdateCallbacks.splice(fullIndex, 1);
      }
      const incrementalIndex = this.incrementalUpdateCallbacks.indexOf(incrementalCallback);
      if (incrementalIndex > -1) {
        this.incrementalUpdateCallbacks.splice(incrementalIndex, 1);
      }
    };
  }

  /**
   * 监听全量数据更新（兼容旧 API）
   */
  onFullUpdate(callback: FullUpdateCallback): () => void {
    this.fullUpdateCallbacks.push(callback);
    
    // 立即调用一次，传递当前数据
    if (Object.keys(this.currentData).length > 0) {
      try {
        callback(this.getAllInputData());
      } catch (error) {
        console.error('[DataVisualizationSDK] 全量更新回调执行失败:', error);
      }
    }
    
    // 返回取消订阅函数
    return () => {
      const index = this.fullUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.fullUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 监听增量数据更新（兼容旧 API）
   */
  onIncrementalUpdate(callback: IncrementalUpdateCallback): () => void {
    this.incrementalUpdateCallbacks.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const index = this.incrementalUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.incrementalUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 获取节点元信息
   */
  getNodeInfo(): NodeInfo {
    if (!this.nodeInfo) {
      throw new Error('节点信息未初始化，请等待主应用发送 node_info 消息');
    }
    return { ...this.nodeInfo };
  }

  /**
   * 获取当前数据版本
   */
  getDataVersion(): number {
    return this.dataVersion;
  }

  /**
   * 请求调整 iframe 尺寸
   */
  requestResize(size: { width?: number; height?: number }): void {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'resize_request',
        payload: { size }
      }, '*');
    }
  }

  /**
   * 请求数据刷新
   */
  requestDataRefresh(): void {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'data_request',
        payload: { requestType: 'refresh' }
      }, '*');
    }
  }

  /**
   * 断开连接（清理资源）
   */
  disconnect(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.fullUpdateCallbacks = [];
    this.incrementalUpdateCallbacks = [];
    this.isInitialized = false;
  }
}

/**
 * 创建 SDK 实例的工厂函数
 * 在 iframe 内部使用，会自动初始化 postMessage 监听
 */
export function createDataVisualizationSDK(options?: SDKOptions): DataVisualizationSDK {
  return new DataVisualizationSDKImpl(options);
}

/**
 * 获取或创建全局 SDK 实例（用于 iframe 内部）
 * 如果已存在全局实例，则返回它；否则创建新实例
 */
export function getOrCreateGlobalSDK(options?: SDKOptions): DataVisualizationSDK {
  if (typeof window !== 'undefined' && (window as any).__DATA_VISUALIZATION_SDK__) {
    return (window as any).__DATA_VISUALIZATION_SDK__;
  }
  
  const sdk = createDataVisualizationSDK(options);
  
  if (typeof window !== 'undefined') {
    (window as any).__DATA_VISUALIZATION_SDK__ = sdk;
  }
  
  return sdk;
}

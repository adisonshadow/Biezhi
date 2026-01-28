/**
 * Data Visualization JS SDK 类型定义
 */

/**
 * 节点输入数据更新事件
 */
export interface NodeInputUpdateEvent {
  type: 'full' | 'incremental';
  inputData: Record<string, any>;
  version: number;
  nodeId: string;
  workflowId: string;
  timestamp: number;
}

/**
 * 节点元信息
 */
export interface NodeInfo {
  nodeId: string;
  operatorId: string;
  operatorName: string;
  workflowId: string;
}

/**
 * 全量更新回调函数
 */
export type FullUpdateCallback = (data: Record<string, any>) => void;

/**
 * 增量更新回调函数
 */
export type IncrementalUpdateCallback = (data: Record<string, any>) => void;

/**
 * 取消订阅函数
 */
export type Unsubscribe = () => void;

/**
 * Data Visualization SDK 接口
 */
export interface DataVisualizationSDK {
  /**
   * 获取节点的输入数据
   * @param portName 输入端口名称（可选，不传则返回所有输入数据）
   * @returns 输入数据
   */
  getInputData(portName?: string): any;

  /**
   * 获取所有输入数据
   * @returns 所有输入端口的数据对象
   */
  getAllInputData(): Record<string, any>;

  /**
   * 获取节点配置
   * @returns 节点配置对象
   */
  getConfig(): any;

  /**
   * 监听数据更新（统一接口，包含更新类型）
   * @param callback 更新回调函数，接收数据对象和更新类型
   * @returns 取消订阅函数
   */
  onDataUpdate(callback: (data: Record<string, any>, type: 'full' | 'incremental') => void): Unsubscribe;

  /**
   * 监听全量数据更新
   * @param callback 更新回调函数，接收完整的数据对象
   * @returns 取消订阅函数
   */
  onFullUpdate(callback: FullUpdateCallback): Unsubscribe;

  /**
   * 监听增量数据更新
   * @param callback 更新回调函数，接收增量数据对象
   * @returns 取消订阅函数
   */
  onIncrementalUpdate(callback: IncrementalUpdateCallback): Unsubscribe;

  /**
   * 获取节点元信息
   * @returns 节点元信息对象
   */
  getNodeInfo(): NodeInfo;

  /**
   * 获取当前数据版本
   * @returns 数据版本号
   */
  getDataVersion(): number;

  /**
   * 请求调整 iframe 尺寸
   * @param size 尺寸对象，包含 width 和/或 height
   */
  requestResize(size: { width?: number; height?: number }): void;

  /**
   * 请求数据刷新
   */
  requestDataRefresh(): void;

  /**
   * 断开连接（清理资源）
   */
  disconnect(): void;
}

/**
 * SDK 配置选项
 * 在 iframe 内部使用时，这些选项是可选的，因为节点信息会通过 postMessage 接收
 */
export interface SDKOptions {
  nodeId?: string;
  operatorId?: string;
  operatorName?: string;
  workflowId?: string;
  // 以下选项已废弃（不再使用 SSE，改为 postMessage）
  /** @deprecated 不再使用 SSE，改为 postMessage 通信 */
  sseUrl?: string;
  /** @deprecated 不再使用 SSE，改为 postMessage 通信 */
  autoConnect?: boolean;
}

/**
 * Data Visualization JS SDK
 * 用于在工作流节点中实现数据可视化功能
 * 
 * @packageDocumentation
 */

// 导入类型用于全局声明
import type { DataVisualizationSDK } from './types';

// 导出类型
export type {
  DataVisualizationSDK,
  SDKOptions,
  NodeInfo,
  NodeInputUpdateEvent,
  FullUpdateCallback,
  IncrementalUpdateCallback,
  Unsubscribe,
} from './types';

// 导出核心类
export { DataVisualizationSDKImpl, createDataVisualizationSDK, getOrCreateGlobalSDK } from './sdk';

// 导出 SSE 客户端
export { DataVisualizationSSEClient } from './sseClient';
export type { DataVisualizationSSECallbacks } from './sseClient';

// 导出 React Hook（可选）
export { useDataVisualization } from './react';

// 导出工具函数
export {
  parseDataVisualizationConfig,
  validateSDKOptions,
  isSDKAvailable,
  getGlobalSDK,
  setGlobalSDK,
} from './utils';

/**
 * SDK 版本号
 */
export const VERSION = '1.0.0';

/**
 * 全局类型声明扩展
 * 允许在 window 对象上访问 SDK
 */
declare global {
  interface Window {
    __DATA_VISUALIZATION_SDK__?: DataVisualizationSDK;
  }
}

// 如果是在浏览器环境中，可以自动注入到全局
if (typeof window !== 'undefined') {
  // 这里不自动创建实例，而是等待外部注入
  // 外部代码应该这样使用：
  // window.__DATA_VISUALIZATION_SDK__ = createDataVisualizationSDK(options);
}

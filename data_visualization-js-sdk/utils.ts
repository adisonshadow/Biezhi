/**
 * Data Visualization JS SDK 工具函数
 */

/**
 * 解析 data_visualization 配置
 * 支持字符串（JSON）和对象格式
 */
export function parseDataVisualizationConfig(
  config: string | object | null | undefined
): {
  entry_file: string;
  use_babel?: boolean;
  always_expand?: boolean;
  icon?: string;
  color?: string;
  allow_fullscreen?: boolean;
  size?: {
    width?: string | number;
    height?: string | number;
  };
} | null {
  if (!config) {
    return null;
  }

  let parsed: any;

  if (typeof config === 'string') {
    try {
      parsed = JSON.parse(config);
    } catch (error) {
      console.error('[DataVisualizationSDK] 解析配置失败:', error);
      return null;
    }
  } else {
    parsed = config;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  // 验证必需字段
  if (!parsed.entry_file) {
    console.warn('[DataVisualizationSDK] 配置缺少 entry_file');
    return null;
  }

  return {
    entry_file: parsed.entry_file,
    use_babel: parsed.use_babel ?? true,
    always_expand: parsed.always_expand ?? false,
    icon: parsed.icon,
    color: parsed.color,
    allow_fullscreen: parsed.allow_fullscreen ?? false,
    size: parsed.size || {
      width: 'auto',
      height: 120,
    },
  };
}

/**
 * 验证 SDK 选项
 */
export function validateSDKOptions(options: {
  nodeId: string;
  operatorId: string;
  operatorName: string;
  workflowId?: string;
}): { valid: boolean; error?: string } {
  if (!options.nodeId || typeof options.nodeId !== 'string') {
    return { valid: false, error: 'nodeId 必须是非空字符串' };
  }

  if (!options.operatorId || typeof options.operatorId !== 'string') {
    return { valid: false, error: 'operatorId 必须是非空字符串' };
  }

  if (!options.operatorName || typeof options.operatorName !== 'string') {
    return { valid: false, error: 'operatorName 必须是非空字符串' };
  }

  return { valid: true };
}

/**
 * 检查 SDK 是否可用
 */
export function isSDKAvailable(): boolean {
  return typeof window !== 'undefined' && window.__DATA_VISUALIZATION_SDK__ !== undefined;
}

/**
 * 获取全局 SDK 实例
 */
export function getGlobalSDK(): any {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any).__DATA_VISUALIZATION_SDK__;
}

/**
 * 设置全局 SDK 实例
 */
export function setGlobalSDK(sdk: any): void {
  if (typeof window !== 'undefined') {
    (window as any).__DATA_VISUALIZATION_SDK__ = sdk;
  }
}

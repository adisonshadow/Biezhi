/**
 * BzOperator 基类
 * 所有算子必须继承自此类
 */

export type OperatorConfig = Record<string, any>;
export type OperatorInputs = Record<string, any>;
export type OperatorOutputs = Record<string, any>;
export type ApiConfig = {
  api_key: string;
  api_url?: string;
  [key: string]: any;
};
export type DatabaseConfig = {
  host?: string;
  port?: number | string;
  database?: string;
  user?: string;
  password?: string;
};

/**
 * Biezhi 算子基类
 * 
 * 所有算子必须继承此类并实现 execute 方法。
 * 可选实现 setup, validate_inputs, cleanup 方法。
 */
export abstract class BzOperator {
  protected config: OperatorConfig;

  /**
   * 初始化算子
   * 
   * @param config - 算子配置参数字典，包含 operator_params 中定义的所有参数
   */
  constructor(config?: OperatorConfig) {
    this.config = config || {};
    // 调用 setup 方法（如果存在）
    this.setup();
  }

  /**
   * 初始化算子，在构造函数中调用
   * 
   * 子类可以重写此方法进行初始化操作
   */
  setup(): void {
    // 默认实现为空，子类可以重写
  }

  /**
   * 执行算子核心逻辑，必须实现
   * 
   * @param inputs - 输入数据字典，包含从上游算子传递的数据
   * @returns 输出数据字典，包含算子的输出结果
   * @throws 如果子类未实现此方法，会抛出错误
   */
  abstract execute(inputs: OperatorInputs): OperatorOutputs | Promise<OperatorOutputs>;

  /**
   * 验证输入数据，可选重写
   * 
   * @param inputs - 输入数据字典
   * @returns 验证是否通过
   */
  validateInputs(inputs: OperatorInputs): boolean {
    return true;
  }

  /**
   * 清理资源，可选重写
   * 
   * 在算子执行完成后调用，用于释放资源
   */
  cleanup(): void {
    // 默认实现为空，子类可以重写
  }

  /**
   * 获取 API 配置（如 OpenAI、Claude 等）
   * 
   * @param provider - API 提供商名称（如 'openai', 'claude'）
   * @returns API 配置字典，如果不存在返回 undefined
   * 
   * @remarks
   * 此方法从环境变量或配置文件中读取 API 配置
   * 当前实现从环境变量读取，格式：{PROVIDER}_API_KEY, {PROVIDER}_API_URL 等
   */
  getApiConfig(provider: string): ApiConfig | undefined {
    // 从环境变量读取配置
    const prefix = provider.toUpperCase();
    const apiKey = process.env[`${prefix}_API_KEY`];
    const apiUrl = process.env[`${prefix}_API_URL`];

    if (!apiKey) {
      return undefined;
    }

    const config: ApiConfig = {
      api_key: apiKey,
    };

    if (apiUrl) {
      config.api_url = apiUrl;
    }

    // 读取其他可能的配置项
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(`${prefix}_`)) {
        const configKey = key.replace(`${prefix}_`, '').toLowerCase();
        config[configKey] = value;
      }
    }

    return config;
  }

  /**
   * 获取数据库配置
   * 
   * @param dbType - 数据库类型（如 'postgresql', 'mysql', 'sqlite'）
   * @returns 数据库配置字典，如果不存在返回 undefined
   * 
   * @remarks
   * 此方法从环境变量读取数据库配置
   * 格式：{DB_TYPE}_HOST, {DB_TYPE}_PORT, {DB_TYPE}_DATABASE, {DB_TYPE}_USER, {DB_TYPE}_PASSWORD
   */
  getDatabaseConfig(dbType: string): DatabaseConfig | undefined {
    const prefix = dbType.toUpperCase();
    const host = process.env[`${prefix}_HOST`];
    const port = process.env[`${prefix}_PORT`];
    const database = process.env[`${prefix}_DATABASE`];
    const user = process.env[`${prefix}_USER`];
    const password = process.env[`${prefix}_PASSWORD`];

    if (!host && !database) {
      return undefined;
    }

    const config: DatabaseConfig = {};
    
    if (host) {
      config.host = host;
    }
    if (port) {
      config.port = port.match(/^\d+$/) ? parseInt(port, 10) : port;
    }
    if (database) {
      config.database = database;
    }
    if (user) {
      config.user = user;
    }
    if (password) {
      config.password = password;
    }

    return Object.keys(config).length > 0 ? config : undefined;
  }

  /**
   * 获取全局变量
   * 
   * @param name - 变量名称
   * @param defaultValue - 默认值，如果变量不存在
   * @returns 变量值或默认值
   * 
   * @remarks
   * 此方法从环境变量读取全局变量
   * 格式：BIEZHI_{NAME}
   * 如果值是 JSON 字符串，会自动解析
   */
  getGlobalVariable<T = any>(name: string, defaultValue?: T): T | undefined {
    const envName = `BIEZHI_${name.toUpperCase()}`;
    const value = process.env[envName];

    if (value === undefined) {
      return defaultValue;
    }

    // 尝试解析 JSON（如果是 JSON 字符串）
    try {
      return JSON.parse(value) as T;
    } catch {
      // 如果不是 JSON，返回原始字符串值
      return value as T;
    }
  }
}


/**
 * TypeScript SDK 使用示例
 * 
 * 此文件展示了如何继承 BzOperator 基类来创建自定义算子
 */

import { BzOperator, OperatorInputs, OperatorOutputs } from './index';

/**
 * 示例算子：数据转换算子
 */
class DataTransformOperator extends BzOperator {
  private transformType: string = 'uppercase';

  setup(): void {
    // 从配置中获取转换类型
    this.transformType = this.config.transformType || 'uppercase';
    console.log(`数据转换算子初始化完成，转换类型: ${this.transformType}`);
  }

  validateInputs(inputs: OperatorInputs): boolean {
    // 验证输入数据
    if (!inputs.data) {
      console.error('输入数据中缺少 data 字段');
      return false;
    }
    return true;
  }

  execute(inputs: OperatorInputs): OperatorOutputs {
    // 验证输入
    if (!this.validateInputs(inputs)) {
      throw new Error('输入数据验证失败');
    }

    let result: any;

    // 根据转换类型处理数据
    switch (this.transformType) {
      case 'uppercase':
        result = typeof inputs.data === 'string' 
          ? inputs.data.toUpperCase() 
          : JSON.stringify(inputs.data).toUpperCase();
        break;
      case 'lowercase':
        result = typeof inputs.data === 'string' 
          ? inputs.data.toLowerCase() 
          : JSON.stringify(inputs.data).toLowerCase();
        break;
      default:
        result = inputs.data;
    }

    return {
      transformedData: result,
      originalData: inputs.data,
      transformType: this.transformType,
    };
  }

  cleanup(): void {
    console.log('数据转换算子清理完成');
  }
}

/**
 * 示例算子：使用 API 配置的算子
 */
class ApiOperator extends BzOperator {
  private apiConfig: any;

  setup(): void {
    // 获取 API 配置
    this.apiConfig = this.getApiConfig('openai');
    if (!this.apiConfig) {
      console.warn('未找到 OpenAI API 配置');
    }
  }

  async execute(inputs: OperatorInputs): Promise<OperatorOutputs> {
    if (!this.apiConfig) {
      throw new Error('API 配置不存在');
    }

    // 这里可以调用实际的 API
    // const response = await fetch(this.apiConfig.api_url, {
    //   headers: {
    //     'Authorization': `Bearer ${this.apiConfig.api_key}`,
    //   },
    // });

    return {
      success: true,
      message: 'API 调用成功',
      apiKey: this.apiConfig.api_key,
    };
  }
}

/**
 * 示例算子：使用数据库配置的算子
 */
class DatabaseOperator extends BzOperator {
  private dbConfig: any;

  setup(): void {
    // 获取数据库配置
    this.dbConfig = this.getDatabaseConfig('postgresql');
    if (!this.dbConfig) {
      console.warn('未找到 PostgreSQL 数据库配置');
    }
  }

  execute(inputs: OperatorInputs): OperatorOutputs {
    if (!this.dbConfig) {
      throw new Error('数据库配置不存在');
    }

    // 这里可以连接数据库并执行查询
    // const connection = new Connection(this.dbConfig);

    return {
      success: true,
      message: '数据库操作成功',
      host: this.dbConfig.host,
      database: this.dbConfig.database,
    };
  }
}

/**
 * 示例算子：使用全局变量的算子
 */
class GlobalVariableOperator extends BzOperator {
  private debugMode: boolean = false;

  setup(): void {
    // 获取全局变量
    this.debugMode = this.getGlobalVariable('debug_mode', false) || false;
    console.log(`调试模式: ${this.debugMode}`);
  }

  execute(inputs: OperatorInputs): OperatorOutputs {
    const result: OperatorOutputs = {
      data: inputs.data,
      processed: true,
    };

    if (this.debugMode) {
      console.log('调试信息:', JSON.stringify(inputs, null, 2));
    }

    return result;
  }
}

// 使用示例
if (require.main === module) {
  // 示例 1: 基本使用
  const transformOp = new DataTransformOperator({ transformType: 'uppercase' });
  const result1 = transformOp.execute({ data: 'hello world' });
  console.log('转换结果:', result1);

  // 示例 2: 使用 API 配置
  const apiOp = new ApiOperator();
  apiOp.execute({}).then(result2 => {
    console.log('API 结果:', result2);
  });

  // 示例 3: 使用数据库配置
  const dbOp = new DatabaseOperator();
  const result3 = dbOp.execute({});
  console.log('数据库结果:', result3);

  // 示例 4: 使用全局变量
  const globalOp = new GlobalVariableOperator();
  const result4 = globalOp.execute({ data: 'test' });
  console.log('全局变量结果:', result4);
}

export {
  DataTransformOperator,
  ApiOperator,
  DatabaseOperator,
  GlobalVariableOperator,
};


#!/usr/bin/env node
/**
 * 基于 lodash 的通用数据过滤器
 * 支持对任意来源的数据进行过滤操作
 */

import * as _ from 'lodash';
import { BzOperator, OperatorInputs, OperatorOutputs } from '../../ts_operator_sdk';

interface FilterCondition {
  [key: string]: any;
}

class DataFilterOperator extends BzOperator {
  private filterType: string = 'filter';
  private filterCondition: string = '';
  private customFunction: string = '';
  private deepClone: boolean = true;

  setup(): void {
    // 从配置中获取参数
    this.filterType = this.config.filter_type || 'filter';
    this.filterCondition = this.config.filter_condition || '';
    this.customFunction = this.config.custom_function || '';
    this.deepClone = this.config.deep_clone !== undefined ? this.config.deep_clone : true;
  }

  validateInputs(inputs: OperatorInputs): boolean {
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

    // 重新从配置中读取 filterType（防止 setup() 中的值丢失，可能是由于模块缓存问题）
    const filterType = this.config.filter_type || this.filterType || 'filter';
    const inputData = inputs.data;
    let result: any;

    try {
      switch (filterType) {
        case 'filter':
          result = this.filterArray(inputData);
          break;
        case 'pick':
          result = this.pickFields(inputData);
          break;
        case 'omit':
          result = this.omitFields(inputData);
          break;
        case 'uniq':
          result = this.uniqData(inputData);
          break;
        case 'compact':
          result = this.compactData(inputData);
          break;
        case 'compact_falsy':
          result = this.compactFalsy(inputData);
          break;
        case 'custom':
          result = this.customFilter(inputData);
          break;
        default:
          throw new Error(`不支持的过滤类型: ${this.filterType}`);
      }

      // 深度克隆结果（如果需要）
      if (this.deepClone) {
        result = _.cloneDeep(result);
      }

      return {
        filtered_data: result,
        original_count: this.getDataLength(inputData),
        filtered_count: this.getDataLength(result),
        filter_type: filterType,
      };
    } catch (error: any) {
      console.error(`数据过滤失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 数组过滤
   */
  private filterArray(data: any): any {
    if (!Array.isArray(data)) {
      throw new Error('filter 类型需要数组数据');
    }

    if (!this.filterCondition) {
      return data;
    }

    let condition: FilterCondition;
    try {
      condition = JSON.parse(this.filterCondition);
    } catch (e) {
      throw new Error(`过滤条件格式错误: ${e}`);
    }

    return _.filter(data, (item) => {
      return this.matchCondition(item, condition);
    });
  }

  /**
   * 匹配条件
   */
  private matchCondition(item: any, condition: FilterCondition): boolean {
    for (const [key, value] of Object.entries(condition)) {
      const itemValue = _.get(item, key);
      
      // 支持操作符
      if (typeof value === 'string' && value.startsWith('>')) {
        const numValue = parseFloat(value.substring(1));
        if (typeof itemValue !== 'number' || itemValue <= numValue) {
          return false;
        }
      } else if (typeof value === 'string' && value.startsWith('<')) {
        const numValue = parseFloat(value.substring(1));
        if (typeof itemValue !== 'number' || itemValue >= numValue) {
          return false;
        }
      } else if (typeof value === 'string' && value.startsWith('>=')) {
        const numValue = parseFloat(value.substring(2));
        if (typeof itemValue !== 'number' || itemValue < numValue) {
          return false;
        }
      } else if (typeof value === 'string' && value.startsWith('<=')) {
        const numValue = parseFloat(value.substring(2));
        if (typeof itemValue !== 'number' || itemValue > numValue) {
          return false;
        }
      } else if (typeof value === 'string' && value.startsWith('!=')) {
        if (itemValue == value.substring(2)) {
          return false;
        }
      } else if (typeof value === 'string' && value.startsWith('===')) {
        if (itemValue !== value.substring(3)) {
          return false;
        }
      } else if (typeof value === 'string' && value.startsWith('!==')) {
        if (itemValue === value.substring(3)) {
          return false;
        }
      } else if (typeof value === 'string' && value.includes('*')) {
        // 通配符匹配
        const pattern = value.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (!regex.test(String(itemValue))) {
          return false;
        }
      } else {
        // 精确匹配
        if (itemValue != value) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 选择字段 (pick)
   */
  private pickFields(data: any): any {
    // 重新从配置中读取 filterCondition（防止 setup() 中的值丢失）
    const filterCondition = this.config.filter_condition || this.filterCondition || '';
    
    if (!filterCondition) {
      throw new Error('pick 类型需要指定字段列表');
    }

    let fields: string[];
    try {
      fields = JSON.parse(filterCondition);
      if (!Array.isArray(fields)) {
        throw new Error('字段列表必须是数组');
      }
    } catch (e: any) {
      throw new Error(`字段列表格式错误: ${e.message}`);
    }

    if (Array.isArray(data)) {
      return data.map((item) => _.pick(item, fields));
    } else if (typeof data === 'object' && data !== null) {
      return _.pick(data, fields);
    } else {
      throw new Error('pick 类型需要对象或对象数组数据');
    }
  }

  /**
   * 排除字段 (omit)
   */
  private omitFields(data: any): any {
    if (!this.filterCondition) {
      throw new Error('omit 类型需要指定要排除的字段列表');
    }

    let fields: string[];
    try {
      fields = JSON.parse(this.filterCondition);
      if (!Array.isArray(fields)) {
        throw new Error('字段列表必须是数组');
      }
    } catch (e) {
      throw new Error(`字段列表格式错误: ${e}`);
    }

    if (Array.isArray(data)) {
      return data.map((item) => _.omit(item, fields));
    } else if (typeof data === 'object' && data !== null) {
      return _.omit(data, fields);
    } else {
      throw new Error('omit 类型需要对象或对象数组数据');
    }
  }

  /**
   * 去重 (uniq)
   */
  private uniqData(data: any): any {
    if (!Array.isArray(data)) {
      throw new Error('uniq 类型需要数组数据');
    }

    if (this.filterCondition) {
      // 根据指定字段去重
      try {
        const field = JSON.parse(this.filterCondition);
        if (typeof field === 'string') {
          return _.uniqBy(data, field);
        }
      } catch (e) {
        // 忽略解析错误，使用默认去重
      }
    }

    // 默认去重
    return _.uniq(data);
  }

  /**
   * 移除空值 (compact)
   */
  private compactData(data: any): any {
    if (!Array.isArray(data)) {
      throw new Error('compact 类型需要数组数据');
    }

    return _.compact(data);
  }

  /**
   * 移除假值 (compact falsy)
   */
  private compactFalsy(data: any): any {
    if (!Array.isArray(data)) {
      throw new Error('compact_falsy 类型需要数组数据');
    }

    return data.filter((item) => Boolean(item));
  }

  /**
   * 自定义过滤函数
   */
  private customFilter(data: any): any {
    if (!this.customFunction) {
      throw new Error('custom 类型需要提供自定义过滤函数');
    }

    if (!Array.isArray(data)) {
      throw new Error('custom 类型需要数组数据');
    }

    try {
      // 创建过滤函数
      // 注意：这里使用 Function 构造函数，在生产环境中应该使用更安全的方式
      const filterFunc = new Function('item', `return (${this.customFunction})(item);`);
      
      return data.filter((item) => {
        try {
          return filterFunc(item);
        } catch (e) {
          console.error(`过滤函数执行错误: ${e}`);
          return false;
        }
      });
    } catch (e) {
      throw new Error(`自定义过滤函数格式错误: ${e}`);
    }
  }

  /**
   * 获取数据长度
   */
  private getDataLength(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    } else {
      return 1;
    }
  }

  cleanup(): void {
    // 清理资源
  }
}

// 导出算子类
export default DataFilterOperator;

// 为了兼容性，也导出为命名导出
export { DataFilterOperator };

// 如果直接运行此文件，执行测试
if (require.main === module) {
  // 测试用例
  const testData = [
    { name: 'Alice', age: 25, status: 'active' },
    { name: 'Bob', age: 30, status: 'inactive' },
    { name: 'Charlie', age: 18, status: 'active' },
    { name: 'David', age: 35, status: 'active' },
  ];

  console.log('测试数据:', JSON.stringify(testData, null, 2));

  // 测试 1: 基本过滤
  const operator1 = new DataFilterOperator({
    filter_type: 'filter',
    filter_condition: JSON.stringify({ age: '>18', status: 'active' }),
    deep_clone: true,
  });

  const result1 = operator1.execute({ data: testData });
  console.log('\n测试 1 - 过滤年龄>18且状态为active:');
  console.log(JSON.stringify(result1, null, 2));

  // 测试 2: pick 字段
  const operator2 = new DataFilterOperator({
    filter_type: 'pick',
    filter_condition: JSON.stringify(['name', 'age']),
    deep_clone: true,
  });

  const result2 = operator2.execute({ data: testData });
  console.log('\n测试 2 - 选择 name 和 age 字段:');
  console.log(JSON.stringify(result2, null, 2));

  // 测试 3: 去重
  const operator3 = new DataFilterOperator({
    filter_type: 'uniq',
    deep_clone: true,
  });

  const duplicateData = [1, 2, 2, 3, 3, 3, 4];
  const result3 = operator3.execute({ data: duplicateData });
  console.log('\n测试 3 - 去重:');
  console.log(JSON.stringify(result3, null, 2));
}


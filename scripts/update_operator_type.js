/**
 * 更新算子的 operatorType
 * 使用方法: node scripts/update_operator_type.js <operator_name> <new_operator_type>
 * 例如: node scripts/update_operator_type.js data_filter_ts local_typescript
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3991/api';

async function updateOperatorType(operatorName, newOperatorType) {
  try {
    // 1. 先搜索算子
    console.log(`🔍 搜索算子: ${operatorName}...`);
    const searchResponse = await axios.get(`${API_BASE_URL}/operators/search`, {
      params: { name: operatorName }
    });

    const operators = searchResponse.data;
    
    if (operators.length === 0) {
      console.error(`❌ 未找到算子: ${operatorName}`);
      process.exit(1);
    }

    // 查找完全匹配的算子
    const operator = operators.find(op => op.name === operatorName);
    
    if (!operator) {
      console.error(`❌ 未找到完全匹配的算子: ${operatorName}`);
      console.log(`找到的相似算子:`);
      operators.forEach(op => {
        console.log(`  - ${op.name} (ID: ${op.id}, operatorType: ${op.operatorType})`);
      });
      process.exit(1);
    }

    console.log(`📦 找到算子: ${operator.name} (ID: ${operator.id})`);
    console.log(`   当前 operatorType: ${operator.operatorType}`);

    if (operator.operatorType === newOperatorType) {
      console.log(`✅ 算子已经是 ${newOperatorType}，无需更新`);
      return;
    }

    // 2. 更新算子
    console.log(`\n🔄 更新 operatorType 为: ${newOperatorType}...`);
    const updateResponse = await axios.put(
      `${API_BASE_URL}/operators/${operator.id}`,
      { operatorType: newOperatorType }
    );

    console.log(`✅ 更新成功！`);
    console.log(`   新 operatorType: ${updateResponse.data.operatorType}`);
    
  } catch (error) {
    if (error.response) {
      console.error(`❌ 更新失败: ${error.response.data.error || error.message}`);
      console.error(`   状态码: ${error.response.status}`);
    } else {
      console.error(`❌ 更新失败: ${error.message}`);
    }
    process.exit(1);
  }
}

// 主函数
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('用法: node scripts/update_operator_type.js <operator_name> <new_operator_type>');
  console.error('例如: node scripts/update_operator_type.js data_filter_ts local_typescript');
  process.exit(1);
}

const [operatorName, newOperatorType] = args;

// 验证 operatorType
const validTypes = ['local_python', 'local_typescript', 'local_go', 'local_rust'];
if (!validTypes.includes(newOperatorType)) {
  console.error(`❌ 无效的 operatorType: ${newOperatorType}`);
  console.error(`   有效值: ${validTypes.join(', ')}`);
  process.exit(1);
}

updateOperatorType(operatorName, newOperatorType);


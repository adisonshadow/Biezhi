/**
 * 注册所有算子到数据库
 * 使用方法: node scripts/register_operators.js
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const API_BASE_URL = 'http://localhost:3000/api';

// 算子目录列表
const operators = [
  {
    name: 'file_selector_processor',
    path: path.join(__dirname, '../Commom_operators/file_selector_processor')
  },
  {
    name: 'dataframe_filter',
    path: path.join(__dirname, '../Commom_operators/dataframe_filter')
  },
  {
    name: 'data_cleaner',
    path: path.join(__dirname, '../Commom_operators/data_cleaner')
  },
  {
    name: 'data_analyzer',
    path: path.join(__dirname, '../Commom_operators/data_analyzer')
  },
  {
    name: 'data_saver',
    path: path.join(__dirname, '../Commom_operators/data_saver')
  },
  {
    name: 'json_file_importer',
    path: path.join(__dirname, '../Commom_operators/json_file_importer')
  }
];

async function registerOperator(operatorPath) {
  try {
    const yamlPath = path.join(operatorPath, 'operator.yaml');
    
    if (!fs.existsSync(yamlPath)) {
      console.error(`❌ 算子配置文件不存在: ${yamlPath}`);
      return null;
    }
    
    // 读取YAML配置
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(yamlContent);
    
    // 添加metadata
    config.metadata = {
      operatorPath: operatorPath
    };
    
    // 注册算子
    const response = await axios.post(`${API_BASE_URL}/operators`, config);
    
    console.log(`✅ 成功注册算子: ${config.name} (ID: ${response.data.id})`);
    return response.data;
    
  } catch (error) {
    if (error.response) {
      console.error(`❌ 注册失败: ${error.response.data.error || error.message}`);
    } else {
      console.error(`❌ 注册失败: ${error.message}`);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 开始注册算子...\n');
  
  const results = [];
  
  for (const operator of operators) {
    console.log(`📦 注册算子: ${operator.name}`);
    const result = await registerOperator(operator.path);
    if (result) {
      results.push(result);
    }
    console.log('');
  }
  
  console.log(`\n✨ 注册完成！成功注册 ${results.length}/${operators.length} 个算子`);
  
  if (results.length > 0) {
    console.log('\n已注册的算子ID:');
    results.forEach(r => {
      console.log(`  - ${r.id}: ${r.name || 'unknown'}`);
    });
  }
}

main().catch(console.error);


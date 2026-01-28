/**
 * 更新算子的 operatorParams
 * 使用方法: node scripts/update_operator_params.js [operator_id]
 * 如果不提供 operator_id，会更新所有算子
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const yaml = require('yaml');

const API_BASE_URL = 'http://localhost:3000/api';

// 算子目录映射
const operatorPaths = {
  'file_selector_processor': path.join(__dirname, '../Commom_operators/file_selector_processor'),
  'dataframe_filter': path.join(__dirname, '../Commom_operators/dataframe_filter'),
  'data_cleaner': path.join(__dirname, '../Commom_operators/data_cleaner'),
  'data_analyzer': path.join(__dirname, '../Commom_operators/data_analyzer'),
  'data_saver': path.join(__dirname, '../Commom_operators/data_saver'),
};

async function updateOperatorParams(operatorId, operatorName) {
  try {
    const operatorPath = operatorPaths[operatorName];
    if (!operatorPath) {
      console.error(`❌ 未找到算子路径: ${operatorName}`);
      return null;
    }

    const yamlPath = path.join(operatorPath, 'operator.yaml');
    if (!fs.existsSync(yamlPath)) {
      console.error(`❌ 算子配置文件不存在: ${yamlPath}`);
      return null;
    }

    // 读取YAML配置
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.parse(yamlContent);

    // 获取 operator_params
    const operatorParams = config.operator_params || config.operatorParams || [];

    if (operatorParams.length === 0) {
      console.log(`⚠️  算子 ${operatorName} 没有 operator_params，跳过`);
      return null;
    }

    // 更新算子
    const result = await httpRequest('PUT', `/operators/${operatorId}`, {
      operatorParams: operatorParams,
    });

    if (result.success) {
      console.log(`✅ 成功更新算子: ${operatorName} (ID: ${operatorId})`);
      console.log(`   参数数量: ${operatorParams.length}`);
      return result.data;
    } else {
      console.error(`❌ 更新失败: ${result.error}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ 更新失败: ${error.message}`);
    return null;
  }
}

// HTTP 请求辅助函数
function httpRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: parsed });
          } else {
            resolve({ success: false, error: parsed.error || `HTTP ${res.statusCode}` });
          }
        } catch (e) {
          resolve({ success: false, error: `解析响应失败: ${e.message}` });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function main() {
  const operatorId = process.argv[2];

  if (operatorId) {
    // 更新指定算子
    console.log(`🚀 更新算子: ${operatorId}\n`);
    
    // 先获取算子信息
    const result = await httpRequest('GET', `/operators/${operatorId}`);
    if (result.success) {
      const operator = result.data;
      await updateOperatorParams(operatorId, operator.name);
    } else {
      console.error(`❌ 获取算子信息失败: ${result.error}`);
    }
  } else {
    // 更新所有算子
    console.log('🚀 更新所有算子的 operatorParams...\n');

    const result = await httpRequest('GET', '/operators');
    if (result.success) {
      const operators = result.data;

      for (const operator of operators) {
        await updateOperatorParams(operator.id, operator.name);
        console.log('');
      }

      console.log('✨ 更新完成！');
    } else {
      console.error(`❌ 获取算子列表失败: ${result.error}`);
    }
  }
}

main().catch(console.error);


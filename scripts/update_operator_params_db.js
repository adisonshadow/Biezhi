/**
 * 直接更新数据库中的 operatorParams
 * 使用方法: node scripts/update_operator_params_db.js [operator_id]
 * 如果不提供 operator_id，会更新所有算子
 * 
 * 这个脚本直接操作数据库，不需要 API 服务运行
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const yaml = require('yaml');

const DB_PATH = path.join(__dirname, '../config/database.db');

// 算子目录映射
const operatorPaths = {
  'file_selector_processor': path.join(__dirname, '../Commom_operators/file_selector_processor'),
  'dataframe_filter': path.join(__dirname, '../Commom_operators/dataframe_filter'),
  'data_cleaner': path.join(__dirname, '../Commom_operators/data_cleaner'),
  'data_analyzer': path.join(__dirname, '../Commom_operators/data_analyzer'),
  'data_saver': path.join(__dirname, '../Commom_operators/data_saver'),
};

function updateOperatorParams(operatorId, operatorName) {
  return new Promise((resolve, reject) => {
    const operatorPath = operatorPaths[operatorName];
    if (!operatorPath) {
      console.error(`❌ 未找到算子路径: ${operatorName}`);
      resolve(null);
      return;
    }

    const yamlPath = path.join(operatorPath, 'operator.yaml');
    if (!fs.existsSync(yamlPath)) {
      console.error(`❌ 算子配置文件不存在: ${yamlPath}`);
      resolve(null);
      return;
    }

    // 读取YAML配置
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.parse(yamlContent);

    // 获取 operator_params
    const operatorParams = config.operator_params || config.operatorParams || [];

    if (operatorParams.length === 0) {
      console.log(`⚠️  算子 ${operatorName} 没有 operator_params，跳过`);
      resolve(null);
      return;
    }

    // 打开数据库
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error(`❌ 打开数据库失败: ${err.message}`);
        reject(err);
        return;
      }
    });

    // 更新数据库
    const operatorParamsJson = JSON.stringify(operatorParams);
    db.run(
      'UPDATE operators SET operatorParams = ? WHERE id = ?',
      [operatorParamsJson, operatorId],
      function(err) {
        if (err) {
          console.error(`❌ 更新失败: ${err.message}`);
          db.close();
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`✅ 成功更新算子: ${operatorName} (ID: ${operatorId})`);
            console.log(`   参数数量: ${operatorParams.length}`);
          } else {
            console.log(`⚠️  未找到算子: ${operatorId}`);
          }
          db.close();
          resolve({ id: operatorId, name: operatorName });
        }
      }
    );
  });
}

function getOperatorById(operatorId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.get(
      'SELECT id, name FROM operators WHERE id = ?',
      [operatorId],
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

function getAllOperators() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.all('SELECT id, name FROM operators', [], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function main() {
  const operatorId = process.argv[2];

  try {
    if (operatorId) {
      // 更新指定算子
      console.log(`🚀 更新算子: ${operatorId}\n`);
      
      const operator = await getOperatorById(operatorId);
      if (operator) {
        await updateOperatorParams(operator.id, operator.name);
      } else {
        console.error(`❌ 未找到算子: ${operatorId}`);
      }
    } else {
      // 更新所有算子
      console.log('🚀 更新所有算子的 operatorParams...\n');

      const operators = await getAllOperators();
      
      for (const operator of operators) {
        await updateOperatorParams(operator.id, operator.name);
        console.log('');
      }

      console.log('✨ 更新完成！');
    }
  } catch (error) {
    console.error(`❌ 操作失败: ${error.message}`);
    process.exit(1);
  }
}

main();


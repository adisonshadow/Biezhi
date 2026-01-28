/**
 * 修复数据库表结构，使 codePath、entryPoint、operatorType 可以为 NULL
 * 用于支持纯前端可视化算子
 * 
 * 使用方法：
 * node scripts/fix_operator_nullable.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../config/database.db');

if (!fs.existsSync(dbPath)) {
  console.error(`数据库文件不存在: ${dbPath}`);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('打开数据库失败:', err);
    process.exit(1);
  }
  console.log('已连接到数据库');
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('开始事务失败:', err);
      process.exit(1);
    }
  });

  console.log('开始修复 operators 表...');
  
  // 创建新表
  db.run(`
    CREATE TABLE operators_new (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      version VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      author VARCHAR(100) NOT NULL,
      license VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      category VARCHAR(100) NOT NULL,
      tags TEXT,
      codePath VARCHAR(500),
      entryPoint VARCHAR(200),
      operatorType VARCHAR(50),
      inputs TEXT,
      outputs TEXT,
      operatorParams TEXT,
      executionConfig TEXT,
      dataVisualization TEXT,
      mockdata TEXT,
      metadata TEXT,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建新表失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 创建新表成功');
  });

  // 复制数据
  db.run('INSERT INTO operators_new SELECT * FROM operators', (err) => {
    if (err) {
      console.error('复制数据失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 复制数据成功');
  });

  // 删除旧表
  db.run('DROP TABLE operators', (err) => {
    if (err) {
      console.error('删除旧表失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 删除旧表成功');
  });

  // 重命名新表
  db.run('ALTER TABLE operators_new RENAME TO operators', (err) => {
    if (err) {
      console.error('重命名表失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 重命名表成功');
  });

  console.log('开始修复 workflow_nodes 表...');
  
  // 创建新表
  db.run(`
    CREATE TABLE workflow_nodes_new (
      id VARCHAR(100) PRIMARY KEY,
      workflowId VARCHAR(100) NOT NULL,
      operatorId VARCHAR(100) NOT NULL,
      operatorType VARCHAR(50),
      nodeType VARCHAR(50),
      config TEXT,
      positionX INTEGER,
      positionY INTEGER,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建新表失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 创建新表成功');
  });

  // 复制数据
  db.run('INSERT INTO workflow_nodes_new SELECT * FROM workflow_nodes', (err) => {
    if (err) {
      console.error('复制数据失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 复制数据成功');
  });

  // 删除旧表
  db.run('DROP TABLE workflow_nodes', (err) => {
    if (err) {
      console.error('删除旧表失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 删除旧表成功');
  });

  // 重命名新表
  db.run('ALTER TABLE workflow_nodes_new RENAME TO workflow_nodes', (err) => {
    if (err) {
      console.error('重命名表失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 重命名表成功');
  });

  // 提交事务
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('提交事务失败:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✓ 所有修改已提交');
    console.log('数据库修复完成！');
    db.close();
  });
});

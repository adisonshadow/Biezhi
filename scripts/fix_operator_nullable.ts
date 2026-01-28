/**
 * 修复数据库表结构，使 codePath、entryPoint、operatorType 可以为 NULL
 * 用于支持纯前端可视化算子
 * 
 * 使用方法：
 * npx ts-node scripts/fix_operator_nullable.ts
 * 或
 * npm run fix-db
 */

import { AppDataSource } from '../config/database';

async function fixDatabase() {
  try {
    console.log('正在连接数据库...');
    await AppDataSource.initialize();
    console.log('✓ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 禁用外键检查
      await queryRunner.query('PRAGMA foreign_keys = OFF');
      console.log('✓ 已禁用外键检查');

      console.log('\n开始修复 operators 表...');
      
      // 创建新表（codePath、entryPoint、operatorType 可以为 NULL）
      await queryRunner.query(`
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
      `);
      console.log('✓ 创建新表成功');

      // 复制数据
      await queryRunner.query('INSERT INTO operators_new SELECT * FROM operators');
      console.log('✓ 复制数据成功');

      // 删除旧表
      await queryRunner.query('DROP TABLE operators');
      console.log('✓ 删除旧表成功');

      // 重命名新表
      await queryRunner.query('ALTER TABLE operators_new RENAME TO operators');
      console.log('✓ 重命名表成功');

      console.log('\n开始修复 workflow_nodes 表...');
      
      // 创建新表
      await queryRunner.query(`
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
      `);
      console.log('✓ 创建新表成功');

      // 复制数据
      await queryRunner.query('INSERT INTO workflow_nodes_new SELECT * FROM workflow_nodes');
      console.log('✓ 复制数据成功');

      // 删除旧表
      await queryRunner.query('DROP TABLE workflow_nodes');
      console.log('✓ 删除旧表成功');

      // 重命名新表
      await queryRunner.query('ALTER TABLE workflow_nodes_new RENAME TO workflow_nodes');
      console.log('✓ 重命名表成功');

      // 重新启用外键检查
      await queryRunner.query('PRAGMA foreign_keys = ON');
      console.log('✓ 已重新启用外键检查');

      // 提交事务
      await queryRunner.commitTransaction();
      console.log('\n✓ 所有修改已提交');
      console.log('数据库修复完成！');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('修复失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixDatabase();

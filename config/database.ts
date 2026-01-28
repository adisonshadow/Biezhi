import { DataSource } from 'typeorm';
import { Operator } from '../package/entities/Operator';
import { Workflow } from '../package/entities/Workflow';
import { WorkflowNode } from '../package/entities/WorkflowNode';
import { WorkflowConnection } from '../package/entities/WorkflowConnection';
import { WorkflowExecution } from '../package/entities/WorkflowExecution';
import { WorkflowExecutionLog } from '../package/entities/WorkflowExecutionLog';
import { Resource } from '../package/entities/Resource';
import * as path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: false, // 开发环境自动同步，生产环境应设为false
  logging: process.env.NODE_ENV === 'development',
  entities: [
    Operator,
    Workflow,
    WorkflowNode,
    WorkflowConnection,
    WorkflowExecution,
    WorkflowExecutionLog,
    Resource,
  ],
});

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');
    return AppDataSource;
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}


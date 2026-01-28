#!/usr/bin/env node

import 'reflect-metadata';
import { Command } from 'commander';
import { OperatorCommands } from './commands/operator';
import { WorkflowCommands } from './commands/workflow';
import { ExecutionCommands } from './commands/execution';
import { initializeDatabase } from '../config/database';

const program = new Command();

program
  .name('biezhi-cli')
  .description('Biezhi CLI工具')
  .version('2.0.0');

// 初始化数据库连接
async function init() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 注册命令
async function setupCommands() {
  await init();
  
  // 算子命令
  const operatorCommands = new OperatorCommands();
  operatorCommands.register(program);

  // 工作流命令
  const workflowCommands = new WorkflowCommands();
  workflowCommands.register(program);

  // 执行命令
  const executionCommands = new ExecutionCommands();
  executionCommands.register(program);
}

setupCommands().then(() => {
  program.parse(process.argv);
}).catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});


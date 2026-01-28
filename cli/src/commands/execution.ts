import { Command } from 'commander';
import { AppDataSource } from '../../config/database';
import { WorkflowExecution, ExecutionStatus } from '../../package/entities/WorkflowExecution';
import { ExecutionService } from '../../api/src/services/ExecutionService';

export class ExecutionCommands {
  private service: ExecutionService;

  constructor() {
    this.service = new ExecutionService();
  }

  register(program: Command) {
    const executionCmd = program
      .command('execution')
      .description('执行任务管理命令');

    // 列出所有执行任务
    executionCmd
      .command('list')
      .description('列出所有执行任务')
      .option('-s, --status <status>', '按状态过滤')
      .option('-w, --workflow <workflowId>', '按工作流ID过滤')
      .action(async (options: any) => {
        try {
          const executions = await this.service.listExecutions(
            options.status as ExecutionStatus | undefined,
            options.workflow
          );
          console.log(`\n找到 ${executions.length} 个执行任务:\n`);
          executions.forEach(exec => {
            const statusIcon = exec.status === ExecutionStatus.SUCCESS ? '✅' :
                              exec.status === ExecutionStatus.FAILED ? '❌' :
                              exec.status === ExecutionStatus.RUNNING ? '🔄' :
                              exec.status === ExecutionStatus.CANCELLED ? '⏹️' : '⏳';
            console.log(`  ${statusIcon} ${exec.id.padEnd(15)} ${exec.workflowId.padEnd(15)} ${exec.status}`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 创建执行任务
    executionCmd
      .command('create <workflowId>')
      .description('创建执行任务')
      .action(async (workflowId: string) => {
        try {
          const execution = await this.service.createExecution(workflowId);
          console.log(`✅ 执行任务创建成功: ${execution.id}`);
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 启动执行任务
    executionCmd
      .command('start <id>')
      .description('启动执行任务')
      .action(async (id: string) => {
        try {
          await this.service.startExecution(id);
          console.log(`✅ 执行任务 ${id} 已启动`);
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 停止执行任务
    executionCmd
      .command('stop <id>')
      .description('停止执行任务')
      .action(async (id: string) => {
        try {
          await this.service.stopExecution(id);
          console.log(`✅ 执行任务 ${id} 已停止`);
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 获取执行日志
    executionCmd
      .command('logs <id>')
      .description('获取执行日志')
      .action(async (id: string) => {
        try {
          const logs = await this.service.getExecutionLogs(id);
          console.log(`\n执行日志 (${logs.length} 条):\n`);
          logs.forEach(log => {
            const levelIcon = log.level === 'error' ? '❌' :
                            log.level === 'warn' ? '⚠️' :
                            log.level === 'info' ? 'ℹ️' : '🔍';
            console.log(`  ${levelIcon} [${log.createdAt}] ${log.message}`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 删除执行任务
    executionCmd
      .command('delete <id>')
      .description('删除执行任务')
      .action(async (id: string) => {
        try {
          await this.service.deleteExecution(id);
          console.log(`✅ 执行任务 ${id} 已删除`);
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });
  }
}


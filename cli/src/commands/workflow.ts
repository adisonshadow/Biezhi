import { Command } from 'commander';
import { AppDataSource } from '../../config/database';
import { WorkflowService } from '../../api/src/services/WorkflowService';

export class WorkflowCommands {
  private service: WorkflowService;

  constructor() {
    this.service = new WorkflowService();
  }

  register(program: Command) {
    const workflowCmd = program
      .command('workflow')
      .description('工作流管理命令');

    // 列出所有工作流
    workflowCmd
      .command('list')
      .description('列出所有工作流')
      .action(async () => {
        try {
          const workflows = await this.service.listWorkflows();
          console.log(`\n找到 ${workflows.length} 个工作流:\n`);
          workflows.forEach(wf => {
            console.log(`  ${wf.id.padEnd(15)} ${wf.name.padEnd(30)} ${wf.nodes?.length || 0} 个节点`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 获取工作流详情
    workflowCmd
      .command('get <id>')
      .description('获取工作流详情')
      .action(async (id: string) => {
        try {
          const workflow = await this.service.getWorkflowById(id);
          if (!workflow) {
            console.error(`错误: 工作流 ${id} 不存在`);
            process.exit(1);
          }
          console.log('\n工作流详情:');
          console.log(JSON.stringify(workflow, null, 2));
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 验证工作流
    workflowCmd
      .command('validate <id>')
      .description('验证工作流')
      .action(async (id: string) => {
        try {
          const result = await this.service.validateWorkflow(id);
          console.log('\n验证结果:');
          console.log(`  完整性: ${result.isComplete ? '✅' : '❌'}`);
          console.log(`  问题数: ${result.issues.length}`);
          console.log(`  警告数: ${result.warnings.length}`);
          
          if (result.issues.length > 0) {
            console.log('\n问题:');
            result.issues.forEach((issue: any) => {
              console.log(`  - ${issue.type}: ${issue.message}`);
            });
          }
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 获取执行顺序
    workflowCmd
      .command('execution-order <id>')
      .description('获取工作流执行顺序')
      .action(async (id: string) => {
        try {
          const order = await this.service.getExecutionOrder(id);
          console.log('\n执行顺序:');
          order.forEach((nodeId, index) => {
            console.log(`  ${index + 1}. ${nodeId}`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });
  }
}


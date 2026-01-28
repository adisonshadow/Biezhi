import { Command } from 'commander';
import { AppDataSource } from '../../config/database';
import { Operator } from '../../package/entities/Operator';
import { OperatorService } from '../../api/src/services/OperatorService';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class OperatorCommands {
  private service: OperatorService;

  constructor() {
    this.service = new OperatorService();
  }

  register(program: Command) {
    const operatorCmd = program
      .command('operator')
      .description('算子管理命令');

    // 注册算子
    operatorCmd
      .command('register <path>')
      .description('注册算子')
      .option('-i, --id <id>', '算子ID（可选）')
      .action(async (operatorPath: string, options: any) => {
        try {
          const yamlPath = path.join(operatorPath, 'operator.yaml');
          if (!fs.existsSync(yamlPath)) {
            console.error(`错误: 未找到operator.yaml文件: ${yamlPath}`);
            process.exit(1);
          }

          const config = yaml.parse(fs.readFileSync(yamlPath, 'utf-8'));
          const id = options.id || `op_${uuidv4().substring(0, 8)}`;

          // 检查ID是否已存在
          const existing = await AppDataSource.getRepository(Operator).findOne({
            where: { id },
          });

          if (existing) {
            console.error(`错误: 算子ID ${id} 已存在`);
            process.exit(1);
          }

          const operator = new Operator();
          operator.id = id;
          operator.name = config.name;
          operator.version = config.version;
          operator.description = config.description;
          operator.author = config.author;
          operator.license = config.license;
          operator.type = config.type || 'unknown';
          operator.category = config.category || '未分类';
          operator.tags = JSON.stringify(config.tags || []);
          operator.codePath = config.code_path || 'main.py';
          operator.entryPoint = config.entry_point || '';
          operator.operatorType = config.operator_type || 'local_python';
          operator.inputs = config.inputs ? JSON.stringify(config.inputs) : null;
          operator.outputs = config.outputs ? JSON.stringify(config.outputs) : null;
          operator.operatorParams = config.operator_params ? JSON.stringify(config.operator_params) : null;
          operator.executionConfig = config.execution ? JSON.stringify(config.execution) : null;
          operator.dataVisualization = config.data_visualization ? JSON.stringify(config.data_visualization) : null;
          operator.mockdata = config.mockdata ? JSON.stringify(config.mockdata) : null;
          operator.metadata = config.metadata ? JSON.stringify(config.metadata || {}) : null;

          await AppDataSource.getRepository(Operator).save(operator);
          console.log(`✅ 算子注册成功: ${id}`);
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 列出所有算子
    operatorCmd
      .command('list')
      .description('列出所有算子')
      .action(async () => {
        try {
          const operators = await AppDataSource.getRepository(Operator).find({
            order: { createdAt: 'DESC' },
          });

          console.log(`\n找到 ${operators.length} 个算子:\n`);
          operators.forEach(op => {
            console.log(`  ${op.id.padEnd(15)} ${op.name.padEnd(30)} ${op.type}`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 搜索算子
    operatorCmd
      .command('search <query>')
      .description('搜索算子')
      .option('-t, --tag <tag>', '按标签搜索')
      .option('-y, --type <type>', '按类型搜索')
      .action(async (query: string, options: any) => {
        try {
          const results = await this.service.search(query, options.tag, options.type);
          console.log(`\n找到 ${results.length} 个匹配的算子:\n`);
          results.forEach(op => {
            console.log(`  ${op.id.padEnd(15)} ${op.name.padEnd(30)} ${op.type}`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 获取算子详情
    operatorCmd
      .command('get <id>')
      .description('获取算子详情')
      .action(async (id: string) => {
        try {
          const operator = await AppDataSource.getRepository(Operator).findOne({
            where: { id },
          });

          if (!operator) {
            console.error(`错误: 算子 ${id} 不存在`);
            process.exit(1);
          }

          const serialized = this.service.serializeOperator(operator);
          console.log('\n算子详情:');
          console.log(JSON.stringify(serialized, null, 2));
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 删除算子
    operatorCmd
      .command('delete <id>')
      .description('删除算子')
      .action(async (id: string) => {
        try {
          const operator = await AppDataSource.getRepository(Operator).findOne({
            where: { id },
          });

          if (!operator) {
            console.error(`错误: 算子 ${id} 不存在`);
            process.exit(1);
          }

          await AppDataSource.getRepository(Operator).remove(operator);
          console.log(`✅ 算子 ${id} 已删除`);
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });

    // 统计信息
    operatorCmd
      .command('stats')
      .description('显示算子统计信息')
      .action(async () => {
        try {
          const stats = await this.service.getStats();
          console.log('\n算子统计:');
          console.log(`  总数: ${stats.total}`);
          console.log('\n按类型:');
          stats.byType.forEach((item: any) => {
            console.log(`    ${item.type.padEnd(20)} ${item.count}`);
          });
          console.log('\n按分类:');
          stats.byCategory.forEach((item: any) => {
            console.log(`    ${item.category.padEnd(20)} ${item.count}`);
          });
        } catch (error: any) {
          console.error(`错误: ${error.message}`);
          process.exit(1);
        }
      });
  }
}


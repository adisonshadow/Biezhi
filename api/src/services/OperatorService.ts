import { AppDataSource } from '../../../config/database';
import { Operator } from '../../../package/entities/Operator';

export class OperatorService {
  /**
   * 序列化算子对象
   */
  serializeOperator(operator: Operator): any {
    return {
      id: operator.id,
      name: operator.name,
      version: operator.version,
      description: operator.description,
      author: operator.author,
      license: operator.license,
      type: operator.type,
      category: operator.category,
      tags: operator.tags ? JSON.parse(operator.tags) : [],
      codePath: operator.codePath,
      entryPoint: operator.entryPoint,
      operatorType: operator.operatorType,
      inputs: operator.inputs ? JSON.parse(operator.inputs) : [],
      outputs: operator.outputs ? JSON.parse(operator.outputs) : [],
      operatorParams: operator.operatorParams ? JSON.parse(operator.operatorParams) : [],
      executionConfig: operator.executionConfig ? JSON.parse(operator.executionConfig) : {},
      dataVisualization: operator.dataVisualization ? JSON.parse(operator.dataVisualization) : null,
      mockdata: operator.mockdata ? JSON.parse(operator.mockdata) : null,
      metadata: operator.metadata ? JSON.parse(operator.metadata) : {},
      createdAt: operator.createdAt,
      updatedAt: operator.updatedAt,
    };
  }

  /**
   * 根据ID获取算子
   */
  async getOperatorById(id: string): Promise<Operator | null> {
    const repository = AppDataSource.getRepository(Operator);
    return await repository.findOne({
      where: { id },
    });
  }

  /**
   * 搜索算子
   */
  async search(name?: string, tag?: string, type?: string): Promise<any[]> {
    const repository = AppDataSource.getRepository(Operator);
    const queryBuilder = repository.createQueryBuilder('operator');

    if (name) {
      queryBuilder.andWhere('operator.name LIKE :name', { name: `%${name}%` });
    }

    if (tag) {
      queryBuilder.andWhere('operator.tags LIKE :tag', { tag: `%${tag}%` });
    }

    if (type) {
      queryBuilder.andWhere('operator.type = :type', { type });
    }

    const operators = await queryBuilder.getMany();
    return operators.map(op => this.serializeOperator(op));
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<any> {
    const repository = AppDataSource.getRepository(Operator);
    const total = await repository.count();

    const byType = await repository
      .createQueryBuilder('operator')
      .select('operator.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('operator.type')
      .getRawMany();

    const byCategory = await repository
      .createQueryBuilder('operator')
      .select('operator.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('operator.category')
      .getRawMany();

    return {
      total,
      byType: byType.map((item: any) => ({ type: item.type, count: parseInt(item.count) })),
      byCategory: byCategory.map((item: any) => ({ category: item.category, count: parseInt(item.count) })),
    };
  }
}


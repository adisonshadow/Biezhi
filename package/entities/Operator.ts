import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'adb-typeorm';

@Entity('operators')
export class Operator {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @Column('varchar', { length: 200 })
  name!: string;

  @Column('varchar', { length: 50 })
  version!: string;

  @Column('text')
  description!: string;

  @Column('varchar', { length: 100 })
  author!: string;

  @Column('varchar', { length: 50 })
  license!: string;

  @Column('varchar', { length: 50 })
  type!: string; // data_collector, data_processing, data_analysis, etc.

  @Column('varchar', { length: 100 })
  category!: string;

  @Column('text', { nullable: true })
  tags?: string; // JSON array string

  @Column('varchar', { length: 500, nullable: true })
  codePath?: string; // 代码文件路径（纯前端可视化算子可为空）

  @Column('varchar', { length: 200, nullable: true })
  entryPoint?: string; // 入口类名或函数名（纯前端可视化算子可为空）

  @Column('varchar', { length: 50, nullable: true })
  operatorType?: string; // local_python, local_go, local_rust（纯前端可视化算子可为空）

  @Column('text', { nullable: true })
  inputs?: string; // JSON array string

  @Column('text', { nullable: true })
  outputs?: string; // JSON array string

  @Column('text', { nullable: true })
  operatorParams?: string; // JSON object string

  @Column('text', { nullable: true })
  executionConfig?: string; // JSON object string

  @Column('text', { nullable: true })
  dataVisualization?: string; // JSON object string

  @Column('text', { nullable: true })
  mockdata?: string; // JSON object string

  @Column('text', { nullable: true })
  metadata?: string; // JSON object string

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


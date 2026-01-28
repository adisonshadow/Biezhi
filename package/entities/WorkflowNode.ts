import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'adb-typeorm';
import { ManyToOne, JoinColumn } from 'typeorm';
import { Workflow } from './Workflow';
import { Operator } from './Operator';

@Entity('workflow_nodes')
export class WorkflowNode {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @ManyToOne(() => Workflow, workflow => workflow.nodes)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @Column('varchar', { length: 100 })
  workflowId!: string;

  @ManyToOne(() => Operator)
  @JoinColumn({ name: 'operatorId' })
  operator!: Operator;

  @Column('varchar', { length: 100 })
  operatorId!: string;

  @Column('varchar', { length: 50, nullable: true })
  operatorType?: string; // local_python, local_go, local_rust（纯前端可视化算子可为空）

  @Column('varchar', { length: 50, nullable: true })
  nodeType?: string; // processor, output, input

  @Column('text', { nullable: true })
  config?: string; // JSON object string - 节点配置参数

  @Column('integer', { nullable: true })
  positionX?: number; // UI位置X坐标

  @Column('integer', { nullable: true })
  positionY?: number; // UI位置Y坐标

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


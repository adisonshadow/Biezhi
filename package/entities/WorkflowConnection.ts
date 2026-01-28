import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'adb-typeorm';
import { ManyToOne, JoinColumn } from 'typeorm';
import { Workflow } from './Workflow';
import { WorkflowNode } from './WorkflowNode';

@Entity('workflow_connections')
export class WorkflowConnection {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @ManyToOne(() => Workflow, workflow => workflow.connections)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @Column('varchar', { length: 100 })
  workflowId!: string;

  @ManyToOne(() => WorkflowNode)
  @JoinColumn({ name: 'fromNodeId' })
  fromNode!: WorkflowNode;

  @Column('varchar', { length: 100 })
  fromNodeId!: string;

  @Column('varchar', { length: 100 })
  fromPort!: string; // 输出端口名称

  @ManyToOne(() => WorkflowNode)
  @JoinColumn({ name: 'toNodeId' })
  toNode!: WorkflowNode;

  @Column('varchar', { length: 100 })
  toNodeId!: string;

  @Column('varchar', { length: 100 })
  toPort!: string; // 输入端口名称

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


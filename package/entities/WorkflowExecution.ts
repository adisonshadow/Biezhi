import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'adb-typeorm';
import { ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Workflow } from './Workflow';
import { WorkflowExecutionLog } from './WorkflowExecutionLog';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @ManyToOne(() => Workflow, workflow => workflow.executions)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @Column('varchar', { length: 100 })
  workflowId!: string;

  @Column('varchar', { length: 50 })
  status!: ExecutionStatus;

  @Column('text', { nullable: true })
  inputData?: string; // JSON object string - 输入数据

  @Column('text', { nullable: true })
  outputData?: string; // JSON object string - 输出数据

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('integer', { nullable: true })
  duration?: number; // 执行时长（毫秒）

  @Column('datetime', { nullable: true })
  startedAt?: Date;

  @Column('datetime', { nullable: true })
  completedAt?: Date;

  @OneToMany(() => WorkflowExecutionLog, log => log.execution)
  logs!: WorkflowExecutionLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'adb-typeorm';
import { ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowExecution } from './WorkflowExecution';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

@Entity('workflow_execution_logs')
export class WorkflowExecutionLog {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @ManyToOne(() => WorkflowExecution, execution => execution.logs)
  @JoinColumn({ name: 'executionId' })
  execution!: WorkflowExecution;

  @Column('varchar', { length: 100 })
  executionId!: string;

  @Column('varchar', { length: 100, nullable: true })
  nodeId?: string; // 关联的节点ID

  @Column('varchar', { length: 50 })
  level!: LogLevel;

  @Column('text')
  message!: string;

  @Column('text', { nullable: true })
  data?: string; // JSON object string - 附加数据

  @CreateDateColumn()
  createdAt!: Date;
}


import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'adb-typeorm';
import { OneToMany } from 'typeorm';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnection } from './WorkflowConnection';
import { WorkflowExecution } from './WorkflowExecution';

@Entity('workflows')
export class Workflow {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @Column('varchar', { length: 200 })
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 50, nullable: true })
  version?: string;

  @Column('varchar', { length: 100, nullable: true })
  author?: string;

  @Column('varchar', { length: 50, nullable: true })
  license?: string;

  @Column('varchar', { length: 100, nullable: true })
  category?: string;

  @Column('text', { nullable: true })
  tags?: string; // JSON array string

  @OneToMany(() => WorkflowNode, node => node.workflow)
  nodes!: WorkflowNode[];

  @OneToMany(() => WorkflowConnection, connection => connection.workflow)
  connections!: WorkflowConnection[];

  @OneToMany(() => WorkflowExecution, execution => execution.workflow)
  executions!: WorkflowExecution[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


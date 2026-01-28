/**
 * 版本历史管理器
 */
import type { Workflow, WorkflowNode, WorkflowConnection } from '../../types';
import type { WorkflowCheckpoint, VersionChain, CreateCheckpointOptions } from './types';
import { CheckpointStorage } from './CheckpointStorage';
import { computeDelta, applyDelta, rebuildVersionFromBase } from './deltaUtils';

export class VersionHistoryManager {
  private storage: CheckpointStorage;
  private workflowId: string;
  private baseCheckpoint: WorkflowCheckpoint | null = null;
  private checkpoints: Map<string, WorkflowCheckpoint> = new Map();
  private currentOffset: number = 0;
  private versionChain: string[] = [];
  private discardedCheckpoints: Set<string> = new Set();
  private baseWorkflow: Workflow | null = null;

  constructor(workflowId: string, storage: CheckpointStorage) {
    this.workflowId = workflowId;
    this.storage = storage;
  }

  /**
   * 初始化版本历史管理器
   */
  async init(baseWorkflow: Workflow): Promise<void> {
    this.baseWorkflow = JSON.parse(JSON.stringify(baseWorkflow));
    
    // 从存储加载版本历史
    await this.loadFromStorage();
    
    // 如果没有基线checkpoint，创建一个
    if (!this.baseCheckpoint) {
      this.baseCheckpoint = this.createBaselineCheckpoint(baseWorkflow);
      await this.saveToStorage();
    }
  }

  /**
   * 创建基线checkpoint
   */
  private createBaselineCheckpoint(workflow: Workflow): WorkflowCheckpoint {
    const checkpointId = `checkpoint_baseline_${Date.now()}`;
    return {
      checkpointId,
      workflowId: this.workflowId,
      version: 0,
      operationType: 'USER',
      operation: 'BASELINE',
      operationDescription: '基线版本',
      delta: {},
      createdAt: Date.now(),
      isBaseline: true,
    };
  }

  /**
   * 创建checkpoint
   */
  createCheckpoint(
    delta: import('./types').WorkflowDelta,
    operationType: 'USER' | 'AI',
    operation: string,
    options?: CreateCheckpointOptions
  ): WorkflowCheckpoint {
    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parentCheckpointId = this.versionChain.length > 0
      ? this.versionChain[this.versionChain.length - 1]
      : this.baseCheckpoint?.checkpointId;
    
    const checkpoint: WorkflowCheckpoint = {
      checkpointId,
      workflowId: this.workflowId,
      version: this.currentOffset - 1,
      parentCheckpointId,
      operationType,
      operation,
      operationDescription: options?.description || operation,
      messageId: options?.messageId,
      functionCall: options?.functionCall,
      delta,
      createdAt: Date.now(),
      isBaseline: false,
    };

    // 添加到checkpoints
    this.checkpoints.set(checkpointId, checkpoint);
    
    // 如果当前在历史版本上创建新checkpoint，标记后续版本为废弃
    if (this.currentOffset < -1) {
      const currentIndex = this.versionChain.length + this.currentOffset;
      const discardedIds = this.versionChain.slice(currentIndex + 1);
      discardedIds.forEach(id => this.discardedCheckpoints.add(id));
      // 截断版本链
      this.versionChain = this.versionChain.slice(0, currentIndex + 1);
    }
    
    // 添加到版本链
    this.versionChain.push(checkpointId);
    this.currentOffset = -this.versionChain.length;
    
    return checkpoint;
  }

  /**
   * Undo操作
   */
  undo(): WorkflowCheckpoint | null {
    if (!this.canUndo()) {
      return null;
    }
    
    this.currentOffset += 1;
    
    // 获取目标版本的checkpoint
    const targetIndex = this.versionChain.length + this.currentOffset;
    if (targetIndex < 0) {
      // 回退到基线
      this.currentOffset = 0;
      return this.baseCheckpoint || null;
    }
    
    const targetCheckpointId = this.versionChain[targetIndex];
    const checkpoint = this.checkpoints.get(targetCheckpointId);
    
    return checkpoint || null;
  }

  /**
   * Redo操作
   */
  redo(): WorkflowCheckpoint | null {
    if (!this.canRedo()) {
      return null;
    }
    
    this.currentOffset -= 1;
    
    // 获取目标版本的checkpoint
    const targetIndex = this.versionChain.length + this.currentOffset;
    const targetCheckpointId = this.versionChain[targetIndex];
    const checkpoint = this.checkpoints.get(targetCheckpointId);
    
    return checkpoint || null;
  }

  /**
   * 是否可以Undo
   */
  canUndo(): boolean {
    return this.currentOffset < 0 || (this.currentOffset === 0 && this.versionChain.length > 0);
  }

  /**
   * 是否可以Redo
   */
  canRedo(): boolean {
    return this.currentOffset < -1;
  }

  /**
   * 获取当前版本的工作流
   */
  getCurrentVersion(): Workflow {
    if (!this.baseWorkflow) {
      throw new Error('Base workflow not initialized');
    }
    
    if (this.currentOffset === 0) {
      return JSON.parse(JSON.stringify(this.baseWorkflow));
    }
    
    // 获取从基线到当前版本的所有deltas
    const targetIndex = this.versionChain.length + this.currentOffset;
    const deltas = this.versionChain
      .slice(0, targetIndex + 1)
      .map(id => this.checkpoints.get(id)?.delta)
      .filter((delta): delta is import('./types').WorkflowDelta => delta !== undefined);
    
    return rebuildVersionFromBase(this.baseWorkflow, deltas);
  }

  /**
   * 获取指定偏移量的版本
   */
  getVersionAtOffset(offset: number): Workflow | null {
    if (!this.baseWorkflow) {
      return null;
    }
    
    if (offset === 0) {
      return JSON.parse(JSON.stringify(this.baseWorkflow));
    }
    
    const targetIndex = this.versionChain.length + offset;
    if (targetIndex < -1 || targetIndex >= this.versionChain.length) {
      return null;
    }
    
    const deltas = this.versionChain
      .slice(0, targetIndex + 1)
      .map(id => this.checkpoints.get(id)?.delta)
      .filter((delta): delta is import('./types').WorkflowDelta => delta !== undefined);
    
    return rebuildVersionFromBase(this.baseWorkflow, deltas);
  }

  /**
   * 获取指定checkpoint的版本
   */
  getVersionAtCheckpoint(checkpointId: string): Workflow | null {
    if (!this.baseWorkflow) {
      return null;
    }
    
    if (checkpointId === this.baseCheckpoint?.checkpointId) {
      return JSON.parse(JSON.stringify(this.baseWorkflow));
    }
    
    // 找到checkpoint在版本链中的位置
    const checkpointIndex = this.versionChain.indexOf(checkpointId);
    if (checkpointIndex === -1) {
      return null;
    }
    
    const deltas = this.versionChain
      .slice(0, checkpointIndex + 1)
      .map(id => this.checkpoints.get(id)?.delta)
      .filter((delta): delta is import('./types').WorkflowDelta => delta !== undefined);
    
    return rebuildVersionFromBase(this.baseWorkflow, deltas);
  }

  /**
   * 获取checkpoint
   */
  getCheckpoint(checkpointId: string): WorkflowCheckpoint | undefined {
    if (checkpointId === this.baseCheckpoint?.checkpointId) {
      return this.baseCheckpoint;
    }
    return this.checkpoints.get(checkpointId);
  }

  /**
   * 设置基线版本
   */
  setBaseline(checkpoint: WorkflowCheckpoint): void {
    this.baseCheckpoint = checkpoint;
    const baselineWorkflow = this.getVersionAtCheckpoint(checkpoint.checkpointId);
    if (baselineWorkflow) {
      this.baseWorkflow = baselineWorkflow;
    }
    this.currentOffset = 0;
    // 保留历史checkpoints，但重置版本链
    this.versionChain = [];
    this.discardedCheckpoints.clear();
  }

  /**
   * 重置到基线
   */
  resetToBaseline(): void {
    this.currentOffset = 0;
  }

  /**
   * 计算Delta
   */
  computeDelta(from: Workflow, to: Workflow): import('./types').WorkflowDelta {
    return computeDelta(from, to);
  }

  /**
   * 应用Delta
   */
  applyDelta(workflow: Workflow, delta: import('./types').WorkflowDelta): Workflow {
    return applyDelta(workflow, delta);
  }

  /**
   * 保存到存储
   */
  async saveToStorage(): Promise<void> {
    // 保存所有checkpoints
    const checkpointsArray = Array.from(this.checkpoints.values());
    if (this.baseCheckpoint) {
      checkpointsArray.push(this.baseCheckpoint);
    }
    await this.storage.saveCheckpoints(checkpointsArray);
    
    // 保存版本链
    const chain: VersionChain = {
      workflowId: this.workflowId,
      baseCheckpointId: this.baseCheckpoint?.checkpointId || '',
      currentOffset: this.currentOffset,
      versionChain: this.versionChain,
      discardedCheckpoints: Array.from(this.discardedCheckpoints),
    };
    await this.storage.saveVersionChain(chain);
    
    // 保存当前工作流缓存
    const currentWorkflow = this.getCurrentVersion();
    await this.storage.saveWorkflowCache({
      workflowId: this.workflowId,
      workflow: currentWorkflow,
      lastModified: Date.now(),
      unsavedChanges: this.currentOffset !== 0 || this.versionChain.length > 0,
    });
  }

  /**
   * 从存储加载
   */
  async loadFromStorage(): Promise<void> {
    // 加载checkpoints
    const checkpoints = await this.storage.loadCheckpoints(this.workflowId);
    for (const checkpoint of checkpoints) {
      this.checkpoints.set(checkpoint.checkpointId, checkpoint);
      if (checkpoint.isBaseline) {
        this.baseCheckpoint = checkpoint;
      }
    }
    
    // 加载版本链
    const chain = await this.storage.loadVersionChain(this.workflowId);
    if (chain) {
      this.versionChain = chain.versionChain;
      this.currentOffset = chain.currentOffset;
      if (chain.discardedCheckpoints) {
        chain.discardedCheckpoints.forEach(id => this.discardedCheckpoints.add(id));
      }
    }
    
    // 如果有基线checkpoint，重建baseWorkflow
    if (this.baseCheckpoint && this.baseCheckpoint.fullSnapshot) {
      this.baseWorkflow = this.baseCheckpoint.fullSnapshot;
    }
  }

  /**
   * 获取Undo描述
   */
  getUndoDescription(): string {
    if (this.currentOffset === 0 && this.versionChain.length > 0) {
      const checkpoint = this.checkpoints.get(this.versionChain[0]);
      return checkpoint?.operationDescription || '撤销';
    }
    const targetIndex = this.versionChain.length + this.currentOffset;
    if (targetIndex >= 0) {
      const checkpoint = this.checkpoints.get(this.versionChain[targetIndex]);
      return checkpoint?.operationDescription || '撤销';
    }
    return '撤销';
  }

  /**
   * 获取Redo描述
   */
  getRedoDescription(): string {
    const targetIndex = this.versionChain.length + this.currentOffset - 1;
    if (targetIndex >= 0 && targetIndex < this.versionChain.length) {
      const checkpoint = this.checkpoints.get(this.versionChain[targetIndex]);
      return checkpoint?.operationDescription || '重做';
    }
    return '重做';
  }

  /**
   * 检查是否有未保存的更改
   */
  hasUnsavedChanges(): boolean {
    return this.currentOffset !== 0 || this.versionChain.length > 0;
  }

  /**
   * 获取当前版本偏移量
   */
  getCurrentOffset(): number {
    return this.currentOffset;
  }
}

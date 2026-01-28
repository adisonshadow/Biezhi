/**
 * Checkpoint防抖动管理器
 */
import { OperationPriority } from './types';

type CheckpointCallback = () => void;

export class CheckpointDebouncer {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, CheckpointCallback> = new Map();
  
  // 配置防抖动延迟
  private delays = {
    [OperationPriority.IMMEDIATE]: 0,
    [OperationPriority.SHORT_DEBOUNCE]: 500,
    [OperationPriority.LONG_DEBOUNCE]: 2000,
    [OperationPriority.NO_CHECKPOINT]: -1,
  };
  
  /**
   * 调度checkpoint创建
   */
  scheduleCheckpoint(
    operationId: string,
    priority: OperationPriority,
    callback: CheckpointCallback
  ): void {
    // 不创建checkpoint的操作
    if (priority === OperationPriority.NO_CHECKPOINT) {
      return;
    }
    
    // 立即执行
    if (priority === OperationPriority.IMMEDIATE) {
      callback();
      return;
    }
    
    // 清除之前的定时器
    const existingTimer = this.debounceTimers.get(operationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // 保存回调
    this.callbacks.set(operationId, callback);
    
    // 设置新的定时器
    const delay = this.delays[priority];
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(operationId);
      this.callbacks.delete(operationId);
    }, delay);
    
    this.debounceTimers.set(operationId, timer);
  }
  
  /**
   * 强制立即执行（用户离开输入框或按Enter）
   */
  flush(operationId?: string): void {
    if (operationId) {
      const timer = this.debounceTimers.get(operationId);
      const callback = this.callbacks.get(operationId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(operationId);
      }
      if (callback) {
        callback();
        this.callbacks.delete(operationId);
      }
    } else {
      // 执行所有待处理的checkpoint
      this.callbacks.forEach((callback) => {
        callback();
      });
      this.debounceTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.debounceTimers.clear();
      this.callbacks.clear();
    }
  }
  
  /**
   * 取消所有待处理的checkpoint
   */
  cancel(operationId?: string): void {
    if (operationId) {
      const timer = this.debounceTimers.get(operationId);
      if (timer) {
        clearTimeout(timer);
      }
      this.debounceTimers.delete(operationId);
      this.callbacks.delete(operationId);
    } else {
      this.debounceTimers.forEach((timer) => clearTimeout(timer));
      this.debounceTimers.clear();
      this.callbacks.clear();
    }
  }
  
  /**
   * 检查是否有待处理的checkpoint
   */
  hasPending(operationId?: string): boolean {
    if (operationId) {
      return this.debounceTimers.has(operationId);
    }
    return this.debounceTimers.size > 0;
  }
}

/**
 * Workflow Checkpoint Hook
 * 用于在WorkflowDesigner中管理checkpoint版本历史
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Workflow } from '../types';
import {
  CheckpointStorage,
  VersionHistoryManager,
  CheckpointDebouncer,
  OperationPriority,
  type CreateCheckpointOptions,
} from '../utils/workflowCheckpoint';

export function useWorkflowCheckpoint(workflowId: string | undefined) {
  const [versionHistory, setVersionHistory] = useState<VersionHistoryManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const debouncerRef = useRef<CheckpointDebouncer | null>(null);
  const storageRef = useRef<CheckpointStorage | null>(null);
  const previousWorkflowRef = useRef<Workflow | null>(null);
  const isInitializingRef = useRef(false);

  /**
   * 初始化checkpoint系统
   */
  const initialize = useCallback(async (baseWorkflow: Workflow) => {
    if (!workflowId || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    try {
      // 初始化存储
      const storage = new CheckpointStorage();
      await storage.init();
      storageRef.current = storage;

      // 初始化版本历史管理器
      const history = new VersionHistoryManager(workflowId, storage);
      await history.init(baseWorkflow);
      setVersionHistory(history);

      // 初始化防抖动管理器
      debouncerRef.current = new CheckpointDebouncer();

      // 更新Undo/Redo状态
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());

      previousWorkflowRef.current = JSON.parse(JSON.stringify(baseWorkflow));
    } catch (error) {
      console.error('Failed to initialize checkpoint system:', error);
    } finally {
      isInitializingRef.current = false;
    }
  }, [workflowId]);

  /**
   * 创建checkpoint（带防抖动）
   */
  const createCheckpoint = useCallback((
    currentWorkflow: Workflow,
    operationType: 'USER' | 'AI',
    operation: string,
    priority: OperationPriority = OperationPriority.IMMEDIATE,
    options?: CreateCheckpointOptions
  ): string | null => {
    if (!versionHistory || !previousWorkflowRef.current) return null;

    // 如果是立即执行的，直接创建checkpoint
    if (priority === OperationPriority.IMMEDIATE) {
      const delta = versionHistory.computeDelta(previousWorkflowRef.current, currentWorkflow);
      if (Object.keys(delta).length === 0) {
        return null;
      }
      
      const checkpoint = versionHistory.createCheckpoint(delta, operationType, operation, options);
      setCanUndo(versionHistory.canUndo());
      setCanRedo(versionHistory.canRedo());
      versionHistory.saveToStorage().catch(err => {
        console.error('Failed to save checkpoint:', err);
      });
      previousWorkflowRef.current = JSON.parse(JSON.stringify(currentWorkflow));
      return checkpoint.checkpointId;
    }

    // 其他优先级使用防抖动
    const operationId = `${operation}_${Date.now()}`;
    let checkpointId: string | null = null;

    debouncerRef.current?.scheduleCheckpoint(
      operationId,
      priority,
      () => {
        if (!versionHistory || !previousWorkflowRef.current) return;

        // 计算Delta
        const delta = versionHistory.computeDelta(previousWorkflowRef.current, currentWorkflow);
        
        // 如果Delta为空，不创建checkpoint
        if (Object.keys(delta).length === 0) {
          return;
        }

        // 创建checkpoint
        const checkpoint = versionHistory.createCheckpoint(delta, operationType, operation, options);
        checkpointId = checkpoint.checkpointId;
        
        // 更新状态
        setCanUndo(versionHistory.canUndo());
        setCanRedo(versionHistory.canRedo());
        
        // 保存到存储
        versionHistory.saveToStorage().catch(err => {
          console.error('Failed to save checkpoint:', err);
        });

        // 更新previousWorkflow
        previousWorkflowRef.current = JSON.parse(JSON.stringify(currentWorkflow));
      }
    );

    return checkpointId;
  }, [versionHistory]);

  /**
   * Undo操作
   */
  const undo = useCallback(() => {
    if (!versionHistory || !canUndo) return null;

    const checkpoint = versionHistory.undo();
    if (checkpoint) {
      const restoredWorkflow = versionHistory.getCurrentVersion();
      setCanUndo(versionHistory.canUndo());
      setCanRedo(versionHistory.canRedo());
      
      // 保存到存储
      versionHistory.saveToStorage().catch(err => {
        console.error('Failed to save after undo:', err);
      });

      return restoredWorkflow;
    }
    return null;
  }, [versionHistory, canUndo]);

  /**
   * Redo操作
   */
  const redo = useCallback(() => {
    if (!versionHistory || !canRedo) return null;

    const checkpoint = versionHistory.redo();
    if (checkpoint) {
      const restoredWorkflow = versionHistory.getCurrentVersion();
      setCanUndo(versionHistory.canUndo());
      setCanRedo(versionHistory.canRedo());
      
      // 保存到存储
      versionHistory.saveToStorage().catch(err => {
        console.error('Failed to save after redo:', err);
      });

      return restoredWorkflow;
    }
    return null;
  }, [versionHistory, canRedo]);

  /**
   * 设置基线（保存后调用）
   */
  const setBaseline = useCallback((checkpoint: import('../utils/workflowCheckpoint/types').WorkflowCheckpoint) => {
    if (!versionHistory) return;
    
    versionHistory.setBaseline(checkpoint);
    setCanUndo(versionHistory.canUndo());
    setCanRedo(versionHistory.canRedo());
    
    // 保存到存储
    versionHistory.saveToStorage().catch(err => {
      console.error('Failed to save baseline:', err);
    });
  }, [versionHistory]);

  /**
   * 获取Undo描述
   */
  const getUndoDescription = useCallback(() => {
    return versionHistory?.getUndoDescription() || '撤销';
  }, [versionHistory]);

  /**
   * 获取Redo描述
   */
  const getRedoDescription = useCallback(() => {
    return versionHistory?.getRedoDescription() || '重做';
  }, [versionHistory]);

  /**
   * 检查是否有未保存的更改
   */
  const hasUnsavedChanges = useCallback(() => {
    return versionHistory?.hasUnsavedChanges() || false;
  }, [versionHistory]);

  /**
   * 强制刷新待处理的checkpoint（保存前调用）
   */
  const flushPendingCheckpoints = useCallback(() => {
    debouncerRef.current?.flush();
  }, []);

  /**
   * 更新previousWorkflow（用于外部直接更新workflow时）
   */
  const updatePreviousWorkflow = useCallback((workflow: Workflow) => {
    previousWorkflowRef.current = JSON.parse(JSON.stringify(workflow));
  }, []);

  return {
    versionHistory,
    canUndo,
    canRedo,
    initialize,
    createCheckpoint,
    undo,
    redo,
    setBaseline,
    getUndoDescription,
    getRedoDescription,
    hasUnsavedChanges,
    flushPendingCheckpoints,
    updatePreviousWorkflow,
  };
}

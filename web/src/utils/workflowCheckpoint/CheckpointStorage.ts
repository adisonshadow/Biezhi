/**
 * Checkpoint存储封装（IndexedDB）
 */
import type { WorkflowCheckpoint, VersionChain, WorkflowCache } from './types';

const DB_NAME = 'workflow_checkpoints';
const DB_VERSION = 1;

export class CheckpointStorage {
  private db: IDBDatabase | null = null;

  /**
   * 初始化IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建checkpoints store
        if (!db.objectStoreNames.contains('checkpoints')) {
          const checkpointStore = db.createObjectStore('checkpoints', {
            keyPath: 'checkpointId',
          });
          checkpointStore.createIndex('workflowId', 'workflowId');
          checkpointStore.createIndex('version', 'version');
        }
        
        // 创建version_chains store
        if (!db.objectStoreNames.contains('version_chains')) {
          db.createObjectStore('version_chains', {
            keyPath: 'workflowId',
          });
        }
        
        // 创建workflows_cache store
        if (!db.objectStoreNames.contains('workflows_cache')) {
          db.createObjectStore('workflows_cache', {
            keyPath: 'workflowId',
          });
        }
      };
    });
  }

  /**
   * 保存checkpoint
   */
  async saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readwrite');
      const store = transaction.objectStore('checkpoints');
      const request = store.put(checkpoint);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 批量保存checkpoints
   */
  async saveCheckpoints(checkpoints: WorkflowCheckpoint[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readwrite');
      const store = transaction.objectStore('checkpoints');
      
      let completed = 0;
      const total = checkpoints.length;
      
      if (total === 0) {
        resolve();
        return;
      }
      
      checkpoints.forEach((checkpoint) => {
        const request = store.put(checkpoint);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 加载指定工作流的所有checkpoints
   */
  async loadCheckpoints(workflowId: string): Promise<WorkflowCheckpoint[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readonly');
      const store = transaction.objectStore('checkpoints');
      const index = store.index('workflowId');
      const request = index.getAll(workflowId);
      
      request.onsuccess = () => {
        const checkpoints = request.result as WorkflowCheckpoint[];
        resolve(checkpoints);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取单个checkpoint
   */
  async getCheckpoint(checkpointId: string): Promise<WorkflowCheckpoint | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readonly');
      const store = transaction.objectStore('checkpoints');
      const request = store.get(checkpointId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['checkpoints'], 'readwrite');
      const store = transaction.objectStore('checkpoints');
      const request = store.delete(checkpointId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存版本链
   */
  async saveVersionChain(chain: VersionChain): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['version_chains'], 'readwrite');
      const store = transaction.objectStore('version_chains');
      const request = store.put(chain);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 加载版本链
   */
  async loadVersionChain(workflowId: string): Promise<VersionChain | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['version_chains'], 'readonly');
      const store = transaction.objectStore('version_chains');
      const request = store.get(workflowId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存工作流缓存
   */
  async saveWorkflowCache(cache: WorkflowCache): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows_cache'], 'readwrite');
      const store = transaction.objectStore('workflows_cache');
      const request = store.put(cache);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 加载工作流缓存
   */
  async loadWorkflowCache(workflowId: string): Promise<WorkflowCache | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows_cache'], 'readonly');
      const store = transaction.objectStore('workflows_cache');
      const request = store.get(workflowId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除工作流的所有数据
   */
  async deleteWorkflowData(workflowId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['checkpoints', 'version_chains', 'workflows_cache'],
        'readwrite'
      );
      
      let completed = 0;
      const total = 3;
      
      // 删除checkpoints
      const checkpointStore = transaction.objectStore('checkpoints');
      const checkpointIndex = checkpointStore.index('workflowId');
      const checkpointRequest = checkpointIndex.openKeyCursor(IDBKeyRange.only(workflowId));
      
      checkpointRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          checkpointStore.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          completed++;
          if (completed === total) {
            resolve();
          }
        }
      };
      checkpointRequest.onerror = () => reject(checkpointRequest.error);
      
      // 删除版本链
      const chainStore = transaction.objectStore('version_chains');
      const chainRequest = chainStore.delete(workflowId);
      chainRequest.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      chainRequest.onerror = () => reject(request.error);
      
      // 删除缓存
      const cacheStore = transaction.objectStore('workflows_cache');
      const cacheRequest = cacheStore.delete(workflowId);
      cacheRequest.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      cacheRequest.onerror = () => reject(request.error);
    });
  }
}

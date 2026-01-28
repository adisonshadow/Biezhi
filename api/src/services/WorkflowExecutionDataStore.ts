/**
 * 工作流执行数据存储服务
 * 负责在内存中管理工作流的执行数据，包括版本管理和节点执行结果
 */

export enum NodeExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export enum ExecutionSessionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ExecutionMode {
  FULL = 'FULL', // 一键执行工作流
  SINGLE_NODE = 'SINGLE_NODE', // 单节点执行
  PARTIAL = 'PARTIAL', // 部分执行
}

export interface NodeExecutionData {
  outputData?: any; // 节点输出数据（按端口组织）
  status: NodeExecutionStatus;
  executionTime: number; // 执行时间戳
  duration?: number; // 执行时长（毫秒）
  error?: string; // 错误信息
  metadata?: any; // 执行元数据
}

export interface VersionData {
  version: number; // 版本号
  workflowId: string;
  nodeData: Map<string, NodeExecutionData>; // 节点ID -> 节点执行数据
  createdAt: number; // 创建时间戳
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}

export interface ExecutionSession {
  sessionId: string;
  workflowId: string;
  mode: ExecutionMode;
  startNodeId?: string; // 起始节点ID（部分执行时使用）
  dataVersion: number; // 使用的数据版本
  status: ExecutionSessionStatus;
  createdAt: number;
  completedAt?: number;
  nodeStatuses: Map<string, NodeExecutionStatus>; // 节点ID -> 节点状态
}

/**
 * 内存数据存储
 * 数据结构：工作流ID -> 版本号 -> 节点ID -> 节点执行数据
 */
export class WorkflowExecutionDataStore {
  // 工作流ID -> 版本号 -> 节点ID -> 节点执行数据
  private dataStore: Map<string, Map<number, Map<string, NodeExecutionData>>> = new Map();
  
  // 工作流ID -> 当前最大版本号
  private maxVersions: Map<string, number> = new Map();
  
  // 执行会话存储
  private sessions: Map<string, ExecutionSession> = new Map();
  
  // 工作流ID -> 会话ID列表
  private workflowSessions: Map<string, string[]> = new Map();

  /**
   * 创建新版本
   */
  createVersion(workflowId: string): number {
    const currentMax = this.maxVersions.get(workflowId) || 0;
    const newVersion = currentMax + 1;
    this.maxVersions.set(workflowId, newVersion);
    
    // 初始化版本数据
    if (!this.dataStore.has(workflowId)) {
      this.dataStore.set(workflowId, new Map());
    }
    const workflowVersions = this.dataStore.get(workflowId)!;
    workflowVersions.set(newVersion, new Map());
    
    return newVersion;
  }

  /**
   * 获取最新版本号
   */
  getLatestVersion(workflowId: string): number {
    const maxVersion = this.maxVersions.get(workflowId);
    if (maxVersion === undefined) {
      // 如果不存在版本，创建初始版本
      return this.createVersion(workflowId);
    }
    return maxVersion;
  }

  /**
   * 获取或创建最新版本
   */
  getOrCreateLatestVersion(workflowId: string): number {
    if (!this.maxVersions.has(workflowId)) {
      return this.createVersion(workflowId);
    }
    return this.maxVersions.get(workflowId)!;
  }

  /**
   * 设置节点执行数据
   */
  setNodeData(workflowId: string, version: number, nodeId: string, data: NodeExecutionData): void {
    if (!this.dataStore.has(workflowId)) {
      this.dataStore.set(workflowId, new Map());
    }
    const workflowVersions = this.dataStore.get(workflowId)!;
    
    if (!workflowVersions.has(version)) {
      workflowVersions.set(version, new Map());
    }
    const versionData = workflowVersions.get(version)!;
    versionData.set(nodeId, data);
  }

  /**
   * 获取节点执行数据
   * 优先从指定版本获取，如果不存在则从更早的版本获取
   * 只返回状态为 SUCCESS 的数据（用于节点间数据传递）
   */
  getNodeData(workflowId: string, version: number, nodeId: string): NodeExecutionData | null {
    const workflowVersions = this.dataStore.get(workflowId);
    if (!workflowVersions) {
      console.log(`[DataStore] getNodeData: workflowId=${workflowId} not found in dataStore`);
      return null;
    }

    // 从指定版本开始，向前查找
    for (let v = version; v >= 1; v--) {
      const versionData = workflowVersions.get(v);
      if (versionData && versionData.has(nodeId)) {
        const data = versionData.get(nodeId)!;
        console.log(`[DataStore] getNodeData: found nodeId=${nodeId} in version=${v}, status=${data.status}, hasOutputData=${!!data.outputData}`);
        // 只返回成功的数据（用于节点间数据传递）
        if (data.status === NodeExecutionStatus.SUCCESS) {
          return data;
        } else {
          console.log(`[DataStore] getNodeData: nodeId=${nodeId} in version=${v} has status=${data.status}, not SUCCESS, skipping`);
        }
      } else {
        if (v === version) {
          console.log(`[DataStore] getNodeData: nodeId=${nodeId} not found in version=${v}`);
        }
      }
    }

    console.log(`[DataStore] getNodeData: nodeId=${nodeId} not found in any version from ${version} down to 1`);
    return null;
  }

  /**
   * 获取节点执行数据（包括失败的数据，用于查询和显示）
   */
  getNodeDataAnyStatus(workflowId: string, version: number, nodeId: string): NodeExecutionData | null {
    const workflowVersions = this.dataStore.get(workflowId);
    if (!workflowVersions) {
      return null;
    }

    // 从指定版本开始，向前查找
    for (let v = version; v >= 1; v--) {
      const versionData = workflowVersions.get(v);
      if (versionData && versionData.has(nodeId)) {
        return versionData.get(nodeId)!;
      }
    }

    return null;
  }

  /**
   * 直接获取指定版本的节点数据（不向前查找，用于调试）
   */
  getNodeDataDirect(workflowId: string, version: number, nodeId: string): NodeExecutionData | null {
    const workflowVersions = this.dataStore.get(workflowId);
    if (!workflowVersions) {
      return null;
    }

    const versionData = workflowVersions.get(version);
    if (versionData && versionData.has(nodeId)) {
      return versionData.get(nodeId)!;
    }

    return null;
  }

  /**
   * 获取版本中所有节点数据
   */
  getVersionData(workflowId: string, version: number): Map<string, NodeExecutionData> {
    const workflowVersions = this.dataStore.get(workflowId);
    if (!workflowVersions) {
      return new Map();
    }
    return workflowVersions.get(version) || new Map();
  }

  /**
   * 获取所有版本列表
   */
  getVersions(workflowId: string): number[] {
    const workflowVersions = this.dataStore.get(workflowId);
    if (!workflowVersions) {
      return [];
    }
    return Array.from(workflowVersions.keys()).sort((a, b) => b - a); // 降序
  }

  /**
   * 创建执行会话
   */
  createSession(
    workflowId: string,
    mode: ExecutionMode,
    dataVersion: number,
    startNodeId?: string
  ): ExecutionSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: ExecutionSession = {
      sessionId,
      workflowId,
      mode,
      startNodeId,
      dataVersion,
      status: ExecutionSessionStatus.RUNNING,
      createdAt: Date.now(),
      nodeStatuses: new Map(),
    };

    this.sessions.set(sessionId, session);
    
    if (!this.workflowSessions.has(workflowId)) {
      this.workflowSessions.set(workflowId, []);
    }
    this.workflowSessions.get(workflowId)!.push(sessionId);

    return session;
  }

  /**
   * 获取执行会话
   */
  getSession(sessionId: string): ExecutionSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 更新执行会话
   */
  updateSession(sessionId: string, updates: Partial<ExecutionSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      if (updates.status && updates.status !== ExecutionSessionStatus.RUNNING) {
        session.completedAt = Date.now();
      }
    }
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(sessionId: string, nodeId: string, status: NodeExecutionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.nodeStatuses.set(nodeId, status);
    }
  }

  /**
   * 获取工作流的所有活跃会话
   */
  getActiveSessions(workflowId: string): ExecutionSession[] {
    const sessionIds = this.workflowSessions.get(workflowId) || [];
    return sessionIds
      .map(id => this.sessions.get(id))
      .filter((session): session is ExecutionSession => 
        session !== undefined && session.status === ExecutionSessionStatus.RUNNING
      );
  }

  /**
   * 清理旧版本（保留最近N个版本）
   */
  cleanupOldVersions(workflowId: string, keepCount: number = 10): void {
    const workflowVersions = this.dataStore.get(workflowId);
    if (!workflowVersions) {
      return;
    }

    const versions = Array.from(workflowVersions.keys()).sort((a, b) => b - a);
    const versionsToDelete = versions.slice(keepCount);

    for (const version of versionsToDelete) {
      workflowVersions.delete(version);
    }
  }

  /**
   * 删除指定版本
   */
  deleteVersion(workflowId: string, version: number): void {
    const workflowVersions = this.dataStore.get(workflowId);
    if (workflowVersions) {
      workflowVersions.delete(version);
    }
  }

  /**
   * 清除工作流的所有数据
   */
  clearWorkflow(workflowId: string): void {
    this.dataStore.delete(workflowId);
    this.maxVersions.delete(workflowId);
    
    const sessionIds = this.workflowSessions.get(workflowId) || [];
    for (const sessionId of sessionIds) {
      this.sessions.delete(sessionId);
    }
    this.workflowSessions.delete(workflowId);
  }
}

// 单例实例
export const executionDataStore = new WorkflowExecutionDataStore();


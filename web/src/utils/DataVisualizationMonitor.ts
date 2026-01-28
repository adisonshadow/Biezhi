/**
 * Data Visualization Monitor
 * 数据可视化节点管理器
 * 
 * 负责维护节点 ID → DataVisualizationContainer 的映射关系
 * 当接收到 SSE 的 node_input_update 事件时，直接寻址到对应的容器并推送数据
 */

export interface DataVisualizationContainerRef {
  /**
   * 向 iframe 推送数据
   * 由 DataVisualizationMonitor 调用
   */
  pushDataToIframe(inputData: Record<string, any>, updateType: 'full' | 'incremental'): void;
}

export class DataVisualizationMonitor {
  private visualizationNodes: Map<string, DataVisualizationContainerRef> = new Map();

  /**
   * 注册可视化节点
   * 在 DataVisualizationContainer 挂载时自动调用
   */
  registerNode(nodeId: string, container: DataVisualizationContainerRef): void {
    this.visualizationNodes.set(nodeId, container);
    console.log(`[DataVisualizationMonitor] 注册节点: ${nodeId}`);
  }

  /**
   * 注销可视化节点
   * 在 DataVisualizationContainer 卸载时调用
   */
  unregisterNode(nodeId: string): void {
    this.visualizationNodes.delete(nodeId);
    console.log(`[DataVisualizationMonitor] 注销节点: ${nodeId}`);
  }

  /**
   * 根据节点 ID 寻址到对应的容器并推送数据
   * 当接收到 SSE 的 node_input_update 事件时调用
   */
  pushDataToNode(
    nodeId: string,
    inputData: Record<string, any>,
    updateType: 'full' | 'incremental' = 'full'
  ): void {
    const container = this.visualizationNodes.get(nodeId);
    if (container) {
      console.log(`[DataVisualizationMonitor] 推送数据到节点 ${nodeId}:`, {
        hasData: Object.keys(inputData).length > 0,
        dataKeys: Object.keys(inputData),
        updateType,
        dataSize: JSON.stringify(inputData).length
      });
      container.pushDataToIframe(inputData, updateType);
    } else {
      console.warn(`[DataVisualizationMonitor] 节点 ${nodeId} 未注册，无法推送数据。已注册节点:`, Array.from(this.visualizationNodes.keys()));
    }
  }

  /**
   * 批量推送数据更新
   */
  pushDataUpdates(
    updates: Array<{
      nodeId: string;
      inputData: Record<string, any>;
      updateType?: 'full' | 'incremental';
    }>
  ): void {
    updates.forEach(({ nodeId, inputData, updateType = 'full' }) => {
      this.pushDataToNode(nodeId, inputData, updateType);
    });
  }

  /**
   * 检查节点是否已注册
   */
  isNodeRegistered(nodeId: string): boolean {
    return this.visualizationNodes.has(nodeId);
  }

  /**
   * 获取所有已注册的节点 ID
   */
  getRegisteredNodeIds(): string[] {
    return Array.from(this.visualizationNodes.keys());
  }

  /**
   * 清空所有注册的节点（用于工作流切换或清理）
   */
  clear(): void {
    this.visualizationNodes.clear();
    console.log('[DataVisualizationMonitor] 清空所有注册节点');
  }
}

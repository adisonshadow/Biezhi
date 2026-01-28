/**
 * Data Visualization JS SDK 使用示例
 * 
 * 这些示例展示了如何在不同场景下使用 SDK
 */

import { createDataVisualizationSDK } from './index';

// ============================================
// 示例 1: 基础使用（CommonJS 环境）
// ============================================

/**
 * 在 CommonJS 模块中使用 SDK
 * 假设 SDK 已经通过 window.__DATA_VISUALIZATION_SDK__ 注入
 */
function example1_CommonJS() {
  // 从全局获取 SDK 实例
  const sdk = (window as any).__DATA_VISUALIZATION_SDK__;

  if (!sdk) {
    console.error('SDK 未初始化');
    return;
  }

  // 获取输入数据
  const inputData = sdk.getInputData('data');
  console.log('输入数据:', inputData);

  // 获取所有输入数据
  const allData = sdk.getAllInputData();
  console.log('所有输入数据:', allData);

  // 获取节点信息
  const nodeInfo = sdk.getNodeInfo();
  console.log('节点信息:', nodeInfo);

  // 监听全量更新
  const unsubscribeFull = sdk.onFullUpdate((data) => {
    console.log('全量更新:', data);
    // 在这里更新可视化
  });

  // 监听增量更新
  const unsubscribeIncremental = sdk.onIncrementalUpdate((data) => {
    console.log('增量更新:', data);
    // 在这里更新可视化
  });

  // 清理（在组件卸载时调用）
  // unsubscribeFull();
  // unsubscribeIncremental();
}

// ============================================
// 示例 2: React 组件使用
// ============================================

/**
 * 在 React 组件中使用 SDK（使用 Hook）
 */
function example2_ReactComponent() {
  // 这应该在 React 组件中使用
  /*
  import React, { useEffect } from 'react';
  import { useDataVisualization } from 'data-visualization-js-sdk/react';

  function MyVisualization() {
    const sdk = window.__DATA_VISUALIZATION_SDK__;
    const { inputData, getInputData, onIncrementalUpdate, nodeInfo } = useDataVisualization(sdk);

    useEffect(() => {
      if (!sdk) return;

      const unsubscribe = onIncrementalUpdate((data) => {
        console.log('增量更新:', data);
      });

      return unsubscribe;
    }, [sdk, onIncrementalUpdate]);

    return (
      <div>
        <h3>{nodeInfo?.operatorName}</h3>
        <div>可视化内容</div>
      </div>
    );
  }
  */
}

// ============================================
// 示例 3: 手动创建 SDK 实例（用于测试）
// ============================================

/**
 * 手动创建 SDK 实例（通常用于测试或开发）
 */
function example3_ManualCreation() {
  const sdk = createDataVisualizationSDK({
    nodeId: 'node_123',
    operatorId: 'operator_456',
    operatorName: 'My Operator',
    workflowId: 'workflow_789',
    autoConnect: true, // 自动连接 SSE
  });

  // 使用 SDK
  sdk.onFullUpdate((data) => {
    console.log('数据更新:', data);
  });

  // 清理
  // sdk.disconnect();
}

// ============================================
// 示例 4: 图表可视化示例
// ============================================

/**
 * 使用 SDK 创建实时图表可视化
 */
function example4_ChartVisualization() {
  const sdk = (window as any).__DATA_VISUALIZATION_SDK__;

  if (!sdk) return;

  // 获取初始数据
  let chartData = sdk.getInputData('data') || [];

  // 监听数据更新
  sdk.onFullUpdate((data) => {
    chartData = data.data || [];
    // 更新图表
    updateChart(chartData);
  });

  sdk.onIncrementalUpdate((incrementalData) => {
    if (incrementalData.data) {
      chartData = [...chartData, ...incrementalData.data];
      // 增量更新图表
      appendChartData(incrementalData.data);
    }
  });
}

function updateChart(data: any[]) {
  // 实现图表更新逻辑
  console.log('更新图表:', data);
}

function appendChartData(data: any[]) {
  // 实现图表增量更新逻辑
  console.log('追加图表数据:', data);
}

// 导出示例函数（如果需要）
export {
  example1_CommonJS,
  example2_ReactComponent,
  example3_ManualCreation,
  example4_ChartVisualization,
};

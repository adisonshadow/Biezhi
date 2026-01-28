# Data Visualization JS SDK

用于在工作流节点中实现数据可视化功能的 JavaScript SDK。

## 功能特性

- 📊 **数据访问**：访问节点的输入数据
- 🔄 **实时更新**：通过 SSE 实时接收数据更新（全量更新和增量更新）
- ⚛️ **React 支持**：提供 React Hook 方便在 React 组件中使用
- 🔌 **自动连接**：自动管理 SSE 连接和重连

## 安装

```bash
# 在项目中使用
import { createDataVisualizationSDK } from 'data-visualization-js-sdk';
```

## 快速开始

### 基础使用（CommonJS）

```javascript
const sdk = window.__DATA_VISUALIZATION_SDK__;

// 获取输入数据
const inputData = sdk.getInputData('data');

// 监听全量更新
const unsubscribe = sdk.onFullUpdate((data) => {
  console.log('全量更新:', data);
  // 更新可视化
});

// 清理
unsubscribe();
```

### React 组件使用

```tsx
import React from 'react';
import { useDataVisualization } from 'data-visualization-js-sdk/react';

function MyVisualization() {
  const sdk = window.__DATA_VISUALIZATION_SDK__;
  const { inputData, getInputData, onIncrementalUpdate } = useDataVisualization(sdk);
  
  React.useEffect(() => {
    const unsubscribe = onIncrementalUpdate((data) => {
      console.log('增量更新:', data);
    });
    return unsubscribe;
  }, [onIncrementalUpdate]);
  
  return <div>{/* 可视化内容 */}</div>;
}
```

## API 文档

### DataVisualizationSDK

#### getInputData(portName?: string): any

获取节点的输入数据。

- `portName` (可选): 输入端口名称，不传则返回所有输入数据
- 返回: 输入数据

#### getAllInputData(): Record<string, any>

获取所有输入数据。

- 返回: 所有输入端口的数据对象

#### onFullUpdate(callback: FullUpdateCallback): Unsubscribe

监听全量数据更新。

- `callback`: 更新回调函数，接收完整的数据对象
- 返回: 取消订阅函数

#### onIncrementalUpdate(callback: IncrementalUpdateCallback): Unsubscribe

监听增量数据更新。

- `callback`: 更新回调函数，接收增量数据对象
- 返回: 取消订阅函数

#### getNodeInfo(): NodeInfo

获取节点元信息。

- 返回: 节点元信息对象

#### getDataVersion(): number

获取当前数据版本。

- 返回: 数据版本号

#### disconnect(): void

断开连接（清理资源）。

## 使用示例

### 示例 1: 基础数据访问

```javascript
const sdk = window.__DATA_VISUALIZATION_SDK__;

// 获取特定端口的数据
const data = sdk.getInputData('input_port_1');

// 获取所有输入数据
const allData = sdk.getAllInputData();

// 获取节点信息
const nodeInfo = sdk.getNodeInfo();
console.log('节点ID:', nodeInfo.nodeId);
console.log('算子名称:', nodeInfo.operatorName);
```

### 示例 2: 监听数据更新

```javascript
const sdk = window.__DATA_VISUALIZATION_SDK__;

// 监听全量更新
sdk.onFullUpdate((data) => {
  console.log('全量更新，所有数据:', data);
  // 重新渲染整个可视化
});

// 监听增量更新
sdk.onIncrementalUpdate((incrementalData) => {
  console.log('增量更新，新增/修改的数据:', incrementalData);
  // 只更新变化的部分
});
```

### 示例 3: React 组件

```tsx
import React, { useEffect } from 'react';
import { useDataVisualization } from 'data-visualization-js-sdk/react';
import { LineChart } from 'echarts';

function DataChart() {
  const sdk = window.__DATA_VISUALIZATION_SDK__;
  const { inputData, onIncrementalUpdate } = useDataVisualization(sdk);
  const [chartData, setChartData] = React.useState(inputData?.data || []);

  useEffect(() => {
    if (!sdk) return;

    const unsubscribe = onIncrementalUpdate((newData) => {
      if (newData.data) {
        setChartData((prev) => [...prev, ...newData.data]);
      }
    });

    return unsubscribe;
  }, [sdk, onIncrementalUpdate]);

  return <LineChart data={chartData} />;
}

export default DataChart;
```

## 注意事项

1. SDK 实例需要通过全局变量 `window.__DATA_VISUALIZATION_SDK__` 访问
2. 确保在使用前 SDK 已被正确注入
3. 记得在组件卸载时取消订阅，避免内存泄漏
4. SSE 连接会自动管理，无需手动处理

## 版本

当前版本: 1.0.0

## 许可证

MIT

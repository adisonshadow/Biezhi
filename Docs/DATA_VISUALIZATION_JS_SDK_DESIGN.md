# 数据可视化架构设计文档（基于 iframe 沙箱方案）

## 📋 文档概述

本文档描述了基于 iframe 沙箱的数据可视化架构设计方案。该方案通过 iframe 提供安全隔离的可视化环境，支持多种前端技术栈，并通过标准化的数据通信机制实现数据实时更新。

## 设计理念更新

基于新的设计思路，我们对数据可视化架构进行了重大优化：

1. **iframe 沙箱隔离**：每个可视化组件运行在独立的 iframe 中，确保安全性和稳定性
2. **入口文件标准化**：`entry_file` 指向标准的 web 入口文件（HTML、JS、dist 目录等）
3. **统一数据通信**：通过 `window.postMessage` 实现主应用与 iframe 的数据通信
4. **SDK 可选化**：`data-visualization-js-sdk` 作为辅助工具，而非强制依赖
5. **Python 模式兼容**：Python 生成的 HTML 可以直接在 iframe 中运行，实现架构统一
6. **节点注册机制**：工作流初始化时，自动检测并注册有 `data_visualization` 配置的节点到 DataVisualizationMonitor
7. **直接寻址推送**：数据更新时，通过 `nodeId` 直接寻址到对应的 DataVisualizationContainer，无需遍历
8. **职责清晰分离**：SSE 负责后端→前端的数据更新通知，postMessage 负责前端内部的 iframe 通信

---

## 📑 目录导航

1. [设计目标](#1-设计目标)
2. [架构设计](#2-架构设计)
3. [数据通信协议设计](#3-数据通信协议设计)
4. [前端集成方案](#4-前端集成方案)
5. [后端服务设计](#5-后端服务设计)
6. [数据流设计](#6-数据流设计)
7. [实现细节](#7-实现细节)
8. [使用示例](#8-使用示例)
9. [未来升级方向](#9-未来升级方向)

---

## 1. 设计目标

### 1.1 核心功能

- **安全隔离**：每个可视化组件运行在独立的 iframe 沙箱中，确保系统稳定性
- **标准化入口**：`entry_file` 指向标准的 web 入口文件，支持多种构建工具和框架
- **实时数据更新**：通过 `postMessage` 实现主应用与 iframe 的数据通信
- **技术栈无关**：支持 React、Vue、Angular、原生 JS 等多种前端技术
- **Python 模式统一**：Python 生成的 HTML 可以直接在 iframe 中运行

### 1.2 技术约束

- 使用 iframe 作为沙箱隔离机制
- 通过 `window.postMessage` 实现数据通信
- 支持静态 HTML 文件和动态构建产物（dist 目录）
- `data-visualization-js-sdk` 作为可选辅助工具
- 可视化组件渲染在用户配置下方

---

## 2. 架构设计

### 2.1 整体架构（基于 iframe 沙箱）

```
┌─────────────────────────────────────────────────────────────┐
│                      Workflow Designer                       │
│  (工作流设计器)                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CustomNode Component                    │   │
│  │  (自定义节点组件)                                     │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │    InlineNodeConfig (用户配置模块)            │    │   │
│  │  └───────────────────┬───────────────────────────┘    │   │
│  │                      │                                │   │
│  │  ┌───────────────────▼───────────────────────────┐    │   │
│  │  │    DataVisualizationContainer (可视化容器)     │    │   │
│  │  │  (节点初始化信息/配置/数据均通过此容器转发)     │    │   │
│  │  │  ┌────────────────────────────────────────┐   │    │   │
│  │  │  │          iframe (沙箱环境)              │   │    │   │
│  │  │  │  ┌──────────────────────────────────┐  │   │    │   │
│  │  │  │  │  entry_file (HTML/JS/Python生成)  │  │   │    │   │
│  │  │  │  └──────────────────────────────────┘  │   │    │   │
│  │  │  └────────────────────────────────────────┘   │    │   │
│  │  └───────────────────┬───────────────────────────┘    │   │
│  └───────────────────────┼───────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │    DataVisualizationMonitor (可视化节点管理器)         │   │
│  │  - 初始化：注册 nodeID → DVC 映射                      │   │
│  │  - 数据更新：根据nodeID直接寻址对应DVC                │   │
│  │  - 通信：通过DVC向iframe postMessage                  │   │
│  └───────────────────────┬───────────────────────────────┘   │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            │ SSE 接收：node_input_update 事件
                            │ (后端推送节点输入数据更新)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        后端服务                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      ExecutionService (执行服务)                      │   │
│  │  - 执行节点逻辑，生成上游输出作为当前节点输入         │   │
│  └───────────────────┬───────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────▼───────────────────────────────────┐   │
│  │      DataVisualizationService (数据可视化服务)       │   │
│  │  - 管理节点数据状态                                    │   │
│  │  - 主动SSE推送节点输入数据更新到前端设计器            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
- 后端 DataVisualizationService → Workflow Designer → DataVisualizationMonitor（符合 “前端接收后端推送，再由管理器寻址” 的逻辑）。
- 明确 “检测 data_visualization 项→注册映射→挂载容器” 链路
- iframe 是 DataVisualizationContainer 的内嵌组件，entry_file 是 iframe 的加载内容
- DataVisualizationMonitor 是 Workflow Designer 的核心管理模块，负责全局映射，而非独立于设计器外
- 通信链路
  - “配置变更” 链路：用户配置→节点→容器→iframe（postMessage）
  - “节点初始化” 链路：节点信息→容器→iframe（postMessage）
  - “数据更新” 完整链路：后端生成数据→SSE 推前端→管理器寻址→容器→iframe（postMessage）
- 注意：
  - 后端 SSE 推送目标是前端设计器，而非直接到管理器；管理器通过 “nodeID 映射” 寻址容器，而非被动接收后端数据
  - 可视化容器是节点的子组件，iframe 是容器的内嵌层，管理器是设计器的全局模块
  - 覆盖 “初始化注册、配置变更、数据更新” 三大场景，均通过 postMessage 完成前端内 iframe 通信，SSE 仅负责后端→前端的数据更新通知。

### 2.2 组件层次（基于 iframe）

1. **CustomNode**：工作流节点容器
   - 负责渲染节点整体结构
   - 包含 InlineNodeConfig 和 DataVisualizationContainer

2. **InlineNodeConfig**：用户配置表单
   - 渲染算子的 `operator_params` 配置项

3. **DataVisualizationContainer**：数据可视化容器（基于 iframe）
   - 检查算子是否配置了 `data_visualization`
   - 创建并管理 iframe 沙箱环境
   - 加载 `entry_file` 到 iframe 中
   - 通过 `postMessage` 实现数据通信
   - 管理 iframe 生命周期
   - **工作流初始化时自动注册到 DataVisualizationMonitor**

4. **DataVisualizationMonitor**：可视化节点管理器
   - 工作流初始化时，扫描所有节点，将有 `data_visualization` 配置的节点注册到映射表
   - 维护 `节点 ID → DataVisualizationContainer` 的映射关系
   - 当接收到 SSE 的 `node_input_update` 事件时，直接寻址到对应的容器
   - 通过容器向 iframe 推送数据更新

5. **iframe 沙箱环境**：
   - 运行可视化组件的独立环境
   - 支持各种前端技术栈
   - 通过 `window.postMessage` 与主应用通信

6. **data-visualization-js-sdk**（可选）：
   - 提供便捷的数据访问 API
   - 封装 `postMessage` 通信细节
   - 作为辅助工具，非强制依赖

---

## 3. 数据通信协议设计

### 3.1 标准数据通信协议

基于 iframe 沙箱方案，我们使用标准化的 `postMessage` 协议实现主应用与可视化组件的数据通信。

#### 主应用 → iframe 的数据格式

```typescript
interface DataMessage {
  type: 'data_update' | 'config_update' | 'node_info';
  payload: {
    // 数据更新
    data?: Record<string, any>;
    // 配置更新
    config?: any;
    // 节点信息
    nodeInfo?: {
      nodeId: string;
      operatorId: string;
      operatorName: string;
      workflowId: string;
    };
    // 更新类型
    updateType?: 'full' | 'incremental';
    // 版本号
    version?: number;
  };
}
```

#### iframe → 主应用的消息格式

```typescript
interface IframeMessage {
  type: 'ready' | 'error' | 'resize_request' | 'data_request';
  payload?: {
    // 错误信息
    error?: string;
    // 尺寸调整
    size?: { width: number; height: number };
    // 数据请求
    requestType?: 'initial' | 'refresh';
  };
}
```

### 3.2 可选 SDK 设计

`data-visualization-js-sdk` 作为可选辅助工具，封装通信细节：

```typescript
/**
 * 可选的数据可视化 SDK
 * 开发者可以选择使用 SDK 或直接通过 window 通信
 */
interface DataVisualizationSDK {
  /**
   * 获取节点的输入数据
   */
  getInputData(portName?: string): any;

  /**
   * 监听数据更新
   */
  onDataUpdate(callback: (data: Record<string, any>, type: 'full' | 'incremental') => void): () => void;

  /**
   * 获取节点配置
   */
  getConfig(): any;

  /**
   * 获取节点信息
   */
  getNodeInfo(): {
    nodeId: string;
    operatorId: string;
    operatorName: string;
    workflowId: string;
  };

  /**
   * 请求调整 iframe 尺寸
   */
  requestResize(size: { width?: number; height?: number }): void;
}
```

### 3.3 无 SDK 的直接通信方式

开发者也可以不使用 SDK，直接通过 `window` 对象通信：

```javascript
// iframe 内部代码（不使用 SDK）
window.addEventListener('message', (event) => {
  if (event.data.type === 'data_update') {
    const data = event.data.payload.data;
    // 处理数据更新
    renderChart(data);
  }
});

// 发送就绪消息
// 注意：iframe 向主应用发送消息时，也应验证 origin（在主应用端验证）
window.parent.postMessage({
  type: 'ready'
}, '*'); // iframe 可能不知道主应用的 origin，主应用需在接收时验证
```

### 3.4 宽高配置和 iframe 自适应

#### 配置说明

算子可视化配置中的宽高作用在 `DataVisualizationContainer` 容器上，iframe 则自适应宽高与容器保持一致：

```yaml
# operator.yaml 配置示例
visualization:
  width: 800px    # 容器宽度
  height: 600px   # 容器高度
  aspectRatio: 4/3 # 可选：宽高比约束
  entryFile: preview/main.html
```

#### CSS 实现

```css
/* DataVisualizationContainer 样式 */
.data-visualization-container {
  width: var(--container-width, 100%);
  height: var(--container-height, 400px);
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

/* iframe 自适应 */
.data-visualization-container iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
```

### 3.5 静态文件访问配置

#### 方案一：Vite 配置（推荐）

通过配置 web 的 Vite，让算子目录可以静态访问，无需移动算子目录：

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/static/operators': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/static\/operators/, '/operators')
      }
    }
  },
  resolve: {
    alias: {
      '@operators': path.resolve(__dirname, '../Commom_operators'),
      '@custom-operators': path.resolve(__dirname, '../Custom_operators')
    }
  }
}
```

#### 方案二：后端静态文件服务

```python
# Flask/后端服务
@app.route('/operators/<operator_type>/<operator_id>/<path:filename>')
def serve_operator_file(operator_type: str, operator_id: str, filename: str):
    """提供算子静态文件服务"""
    if operator_type == 'common':
        base_path = '/Users/yanfang/dev/Biezhi2/Commom_operators'
    elif operator_type == 'custom':
        base_path = '/Users/yanfang/dev/Biezhi2/Custom_operators'
    else:
        return jsonify({'error': 'Invalid operator type'}), 400
    
    file_path = os.path.join(base_path, operator_id, 'preview', filename)
    
    if os.path.exists(file_path):
        return send_file(file_path)
    else:
        return jsonify({'error': 'File not found'}), 404
```

### 3.6 算子编译检查和提示机制

如果算子需要编译（如 React、Vue 项目），应在注册算子时检查并提示：

```python
# 算子注册检查逻辑
def validate_operator_compilation(operator_path: str) -> Dict[str, Any]:
    """检查算子是否需要编译"""
    preview_path = os.path.join(operator_path, 'preview')
    
    # 检查是否存在 package.json
    package_json_path = os.path.join(preview_path, 'package.json')
    if os.path.exists(package_json_path):
        with open(package_json_path, 'r') as f:
            package_info = json.load(f)
            
        # 检查是否需要编译
        requires_compilation = any([
            'build' in package_info.get('scripts', {}),
            'dev' in package_info.get('scripts', {}),
            'vite' in package_info.get('devDependencies', {}),
            'webpack' in package_info.get('devDependencies', {})
        ])
        
        return {
            'requires_compilation': requires_compilation,
            'package_info': package_info,
            'build_scripts': package_info.get('scripts', {}),
            'message': '此算子需要编译后才能使用，请运行构建命令。'
        }
    
    return {'requires_compilation': False}
```

### 3.7 工作流初始化节点注册机制

**DataVisualizationMonitor** 是 Workflow Designer 的核心管理模块，负责可视化节点的注册和数据推送：

#### 初始化阶段：节点注册

工作流初始化时，扫描所有节点，检测是否有 `data_visualization` 配置，如有则注册到映射表：

```typescript
// Workflow Designer 中的 DataVisualizationMonitor
class DataVisualizationMonitor {
  private visualizationNodes: Map<string, DataVisualizationContainer> = new Map();
  
  /**
   * 注册可视化节点
   * 在 DataVisualizationContainer 挂载时自动调用
   */
  registerNode(nodeId: string, container: DataVisualizationContainer): void {
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
  pushDataToNode(nodeId: string, inputData: Record<string, any>, updateType: 'full' | 'incremental' = 'full'): void {
    const container = this.visualizationNodes.get(nodeId);
    if (container) {
      // 通过容器向 iframe 推送数据
      container.pushDataToIframe(inputData, updateType);
    } else {
      console.warn(`[DataVisualizationMonitor] 节点 ${nodeId} 未注册，无法推送数据`);
    }
  }
  
  /**
   * 批量推送数据更新
   */
  pushDataUpdates(updates: Array<{nodeId: string, inputData: Record<string, any>, updateType?: 'full' | 'incremental'}>): void {
    updates.forEach(({nodeId, inputData, updateType = 'full'}) => {
      this.pushDataToNode(nodeId, inputData, updateType);
    });
  }
  
  /**
   * 检查节点是否已注册
   */
  isNodeRegistered(nodeId: string): boolean {
    return this.visualizationNodes.has(nodeId);
  }
}

#### DataVisualizationContainer 中的实现

```typescript
// DataVisualizationContainer 中的实现
class DataVisualizationContainer {
  private monitor: DataVisualizationMonitor;
  
  componentDidMount() {
    // 挂载时注册到管理器
    this.monitor = getDataVisualizationMonitor(); // 获取全局管理器实例
    this.monitor.registerNode(this.props.nodeId, this);
  }
  
  componentWillUnmount() {
    // 卸载时注销
    if (this.monitor) {
      this.monitor.unregisterNode(this.props.nodeId);
    }
  }
  
  /**
   * 向 iframe 推送数据
   * 由 DataVisualizationMonitor 调用
   */
  pushDataToIframe(inputData: Record<string, any>, updateType: 'full' | 'incremental' = 'full'): void {
    if (!this.iframe || !this.iframe.contentWindow) {
      return;
    }
    
    try {
      // 向 iframe contentWindow 写数据
      // 注意：使用 window.location.origin 而非 '*'，提升安全性
      this.iframe.contentWindow.postMessage({
        type: 'data_update',
        payload: {
          data: inputData,
          updateType,
          version: Date.now(),
        }
      }, window.location.origin);
    } catch (error) {
      console.error('[DataVisualizationContainer] 推送数据到 iframe 失败:', error);
    }
  }
}
```

#### iframe 内部的数据接收处理

```javascript
// iframe 内部代码
window.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'data_update':
      // 处理数据更新
      handleDataUpdate(payload.data);
      break;
      
    case 'data_push_complete':
      // 数据推送完成，可以开始渲染
      onDataPushComplete();
      break;
  }
});

// 数据推送完成回调函数
function onDataPushComplete() {
  console.log('数据推送完成，开始渲染图表');
  // 执行渲染逻辑
  renderChart();
}
```

### 3.8 通信协议示例

#### 主应用发送数据到 iframe

```javascript
// DataVisualizationContainer 中
// 注意：使用 window.location.origin 而非 '*'，提升安全性
iframe.contentWindow.postMessage({
  type: 'data_update',
  payload: {
    data: nodeInputData,
    updateType: 'full',
    version: Date.now(),
    nodeInfo: {
      nodeId: node.id,
      operatorId: operator.id,
      operatorName: operator.name,
      workflowId: workflowId
    }
  }
}, window.location.origin);
```

#### iframe 接收数据并响应

```javascript
// iframe 内部（使用 SDK）
import { DataVisualizationSDK } from 'data-visualization-js-sdk';

const sdk = new DataVisualizationSDK();
sdk.onDataUpdate((data, type) => {
  console.log(`收到${type}更新:`, data);
  renderChart(data);
});

// 或者不使用 SDK
window.addEventListener('message', (event) => {
  if (event.data.type === 'data_update') {
    const { data, updateType, nodeInfo } = event.data.payload;
    console.log(`收到${updateType}更新:`, data);
    renderChart(data);
  }
});
```

---

## 4. 前端集成方案（基于 iframe）

### 4.1 CustomNode 组件修改

在 `CustomNode.tsx` 中添加基于 iframe 的数据可视化容器：

```typescript
// CustomNode.tsx
import DataVisualizationContainer from './DataVisualizationContainer';

const CustomNode: React.FC<NodeProps<any>> = ({ data, selected, id }) => {
  // ... 现有代码 ...
  
  const operator = nodeData.operator;
  const hasDataVisualization = operator?.dataVisualization;
  
  return (
    <BaseNode>
      <BaseNodeHeader>
        {/* 节点头部 */}
      </BaseNodeHeader>
      <BaseNodeContent>
        {/* 用户配置 */}
        {hasOperatorParams() && (
          <InlineNodeConfig
            operator={operator}
            config={nodeData.config}
            onConfigChange={handleConfigChange}
          />
        )}
        
        {/* 数据可视化容器（iframe 沙箱） - 渲染在用户配置下方 */}
        {hasDataVisualization && (
          <DataVisualizationContainer
            nodeId={id as string}
            operator={operator}
            workflowId={nodeData.workflowId}
            config={nodeData.config}
            nodeInputData={nodeData.inputData} // 传入节点输入数据
          />
        )}
      </BaseNodeContent>
    </BaseNode>
  );
};
```

### 4.2 DataVisualizationContainer 组件（基于 iframe）

新建基于 iframe 的 `DataVisualizationContainer.tsx` 组件：

```typescript
// DataVisualizationContainer.tsx
interface DataVisualizationContainerProps {
  nodeId: string;
  operator: Operator;
  workflowId?: string;
  config?: any;
  nodeInputData?: Record<string, any>;
}

const DataVisualizationContainer: React.FC<DataVisualizationContainerProps> = ({
  nodeId,
  operator,
  workflowId,
  config,
  nodeInputData,
}) => {
  const [visualizationConfig, setVisualizationConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSize, setIframeSize] = useState({ width: '100%', height: '400px' });

  useEffect(() => {
    // 解析 data_visualization 配置
    const dataVizConfig = parseDataVisualizationConfig(operator.dataVisualization);
    setVisualizationConfig(dataVizConfig);
    
    // 初始化 iframe
    initializeIframe(dataVizConfig);
    
    return () => {
      // 清理事件监听器
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [nodeId, operator, workflowId]);

  // 监听数据变化，推送到 iframe
  useEffect(() => {
    if (nodeInputData && iframeRef.current?.contentWindow) {
      sendDataToIframe(nodeInputData, 'full');
    }
  }, [nodeInputData]);

  // 监听配置变化
  useEffect(() => {
    if (config && iframeRef.current?.contentWindow) {
      sendConfigToIframe(config);
    }
  }, [config]);

  const initializeIframe = async (vizConfig: any) => {
    try {
      setIsLoading(true);
      
      // 1. 获取 entry_file 的 URL
      const entryFileUrl = await getEntryFileUrl(operator.id, vizConfig.entry_file);
      
      // 2. 设置 iframe 尺寸
      setIframeSize({
        width: vizConfig.size?.width || '100%',
        height: vizConfig.size?.height || '400px'
      });
      
      // 3. 监听 iframe 消息
      window.addEventListener('message', handleIframeMessage);
      
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleIframeMessage = (event: MessageEvent) => {
    // 验证消息来源
    if (event.source !== iframeRef.current?.contentWindow) return;
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'ready':
        // iframe 加载完成，发送初始数据
        if (nodeInputData) {
          sendDataToIframe(nodeInputData, 'full');
        }
        if (config) {
          sendConfigToIframe(config);
        }
        sendNodeInfoToIframe();
        break;
        
      case 'resize_request':
        // iframe 请求调整尺寸
        if (payload?.size) {
          setIframeSize(payload.size);
        }
        break;
        
      case 'error':
        setError(payload?.error || 'iframe 内部错误');
        break;
        
      case 'data_request':
        // iframe 请求数据刷新
        if (nodeInputData) {
          sendDataToIframe(nodeInputData, 'full');
        }
        break;
    }
  };

  const sendDataToIframe = (data: Record<string, any>, updateType: 'full' | 'incremental') => {
    // 使用 window.location.origin 而非 '*'，提升安全性
    iframeRef.current?.contentWindow?.postMessage({
      type: 'data_update',
      payload: {
        data,
        updateType,
        version: Date.now(),
      }
    }, window.location.origin);
  };

  const sendConfigToIframe = (config: any) => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'config_update',
      payload: { config }
    }, window.location.origin);
  };

  const sendNodeInfoToIframe = () => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'node_info',
      payload: {
        nodeInfo: {
          nodeId,
          operatorId: operator.id,
          operatorName: operator.name,
          workflowId: workflowId || '',
        }
      }
    }, window.location.origin);
  };

  return (
    <div className="data-visualization-container">
      {isLoading && <div>加载可视化组件...</div>}
      {error && <div>错误: {error}</div>}
      
      <iframe
        ref={iframeRef}
        src={visualizationConfig?.entry_file ? getEntryFileUrl(operator.id, visualizationConfig.entry_file) : undefined}
        style={{
          width: iframeSize.width,
          height: iframeSize.height,
          border: 'none',
          borderRadius: '8px',
          display: isLoading || error ? 'none' : 'block'
        }}
        sandbox="allow-scripts allow-same-origin"
        title={`数据可视化 - ${operator.name}`}
      />
    </div>
  );
};
```

### 4.3 数据接收和推送机制

数据流采用**三层架构**，通过 DataVisualizationMonitor 实现统一管理：

#### 完整数据流

1. **后端通过 SSE 推送数据**：后端通过 SSE 推送 `node_input_update` 事件到 Web 前端
2. **Workflow Designer 接收 SSE 数据**：SSEClient 接收事件，更新 `nodeInputDataMap` 状态
3. **DataVisualizationMonitor 寻址推送**：根据 `nodeId` 从映射表中寻址到对应的 `DataVisualizationContainer`
4. **DataVisualizationContainer 转发到 iframe**：通过 `postMessage` 发送数据到 iframe

```typescript
// WorkflowDesigner.tsx 中的数据流实现

// 1. 创建 DataVisualizationMonitor 实例（全局单例）
const dataVizMonitor = useMemo(() => new DataVisualizationMonitor(), []);

// 2. 通过 SSE 接收后端数据
const sseClient = new SSEClient(sessionId, {
  onNodeInputUpdate: (nodeId: string, inputData: Record<string, any>, updateType: 'full' | 'incremental') => {
    // 更新节点输入数据状态
    setNodeInputDataMap(prev => {
      const newMap = new Map(prev);
      if (updateType === 'full') {
        newMap.set(nodeId, inputData);
      } else {
        // 增量更新：合并到现有数据
        const existing = newMap.get(nodeId) || {};
        newMap.set(nodeId, { ...existing, ...inputData });
      }
      return newMap;
    });
    
    // 通过 DataVisualizationMonitor 寻址并推送数据
    dataVizMonitor.pushDataToNode(nodeId, inputData, updateType);
  },
  // ... 其他回调
});

// 3. DataVisualizationContainer 在挂载时自动注册
// componentDidMount 时调用 monitor.registerNode(nodeId, this)
// componentWillUnmount 时调用 monitor.unregisterNode(nodeId)
```

#### 关键设计点

- **DataVisualizationMonitor 是 Workflow Designer 的内部模块**，不是独立服务
- **初始化时注册**：DataVisualizationContainer 挂载时自动注册到管理器
- **数据更新时寻址**：通过 `nodeId` 直接寻址到对应的容器，无需遍历
- **所有通信通过 postMessage**：配置变更、节点初始化、数据更新都通过 postMessage 完成
- **SSE 仅负责后端→前端的数据更新通知**，不直接与 iframe 通信

---

## 5. 后端服务设计

### 5.1 数据管理服务

后端服务负责管理节点数据状态，并通过 SSE 向 Web 前端推送数据更新：

```python
# DataManager 类
class DataManager:
    def __init__(self):
        self.node_data_states = {}
        self.sse_clients = {}  # 管理 SSE 客户端连接
        
    def update_node_data(self, node_id: str, data: Dict[str, Any], workflow_id: str = None):
        """更新节点数据并通过 SSE 推送到 Web 前端"""
        if node_id not in self.node_data_states:
            self.node_data_states[node_id] = {
                'data': {},
                'version': 0,
                'last_updated': datetime.now()
            }
        
        self.node_data_states[node_id]['data'] = data
        self.node_data_states[node_id]['version'] += 1
        self.node_data_states[node_id]['last_updated'] = datetime.now()
        
        # 通过 SSE 推送数据更新到 Web 前端
        self.push_data_update_via_sse(node_id, data, workflow_id)
    
    def push_data_update_via_sse(self, node_id: str, data: Dict[str, Any], workflow_id: str = None):
        """通过 SSE 推送数据更新到 Web 前端"""
        # 查找订阅该节点的 SSE 客户端
        session_key = f"{workflow_id}_{node_id}" if workflow_id else node_id
        
        if session_key in self.sse_clients:
            sse_client = self.sse_clients[session_key]
            # 发送 SSE 事件
            sse_client.send({
                'type': 'node_input_update',
                'nodeId': node_id,
                'workflowId': workflow_id,
                'updateType': 'full',
                'inputData': data,
                'version': self.node_data_states[node_id]['version'],
                'timestamp': datetime.now().timestamp()
            })
    
    def get_node_data(self, node_id: str) -> Optional[Dict[str, Any]]:
        """获取节点数据"""
        if node_id in self.node_data_states:
            return self.node_data_states[node_id]['data']
        return None
    
    def get_node_data_version(self, node_id: str) -> int:
        """获取节点数据版本"""
        if node_id in self.node_data_states:
            return self.node_data_states[node_id]['version']
        return 0
```

### 5.2 SSE 端点实现

提供 SSE 端点，用于 Web 前端订阅节点数据更新：

```python
@app.route('/api/data-viz/stream')
def data_viz_stream():
    """SSE 端点：推送节点数据更新到 Web 前端"""
    workflow_id = request.args.get('workflow_id')
    node_id = request.args.get('node_id')
    
    def generate():
        # 创建 SSE 连接
        session_key = f"{workflow_id}_{node_id}" if workflow_id else node_id
        sse_client = SSEClient(session_key)
        data_manager.sse_clients[session_key] = sse_client
        
        try:
            # 发送初始数据（如果有）
            current_data = data_manager.get_node_data(node_id)
            if current_data:
                yield f"data: {json.dumps({
                    'type': 'node_input_update',
                    'nodeId': node_id,
                    'workflowId': workflow_id,
                    'updateType': 'full',
                    'inputData': current_data,
                    'version': data_manager.get_node_data_version(node_id)
                })}\n\n"
            
            # 保持连接，等待后续更新
            while True:
                # 这里会通过 data_manager.push_data_update_via_sse 发送更新
                time.sleep(1)
        finally:
            # 清理连接
            if session_key in data_manager.sse_clients:
                del data_manager.sse_clients[session_key]
    
    return Response(generate(), mimetype='text/event-stream')
```

### 5.3 静态文件服务

提供静态文件服务，用于加载可视化组件：

```python
@app.route('/static/operators/<operator_id>/<path:filename>')
def serve_operator_static(operator_id: str, filename: str):
    """提供算子静态文件服务"""
    operator_path = get_operator_path(operator_id)
    static_file_path = os.path.join(operator_path, 'preview', filename)
    
    if os.path.exists(static_file_path):
        return send_file(static_file_path)
    else:
        return jsonify({'error': 'File not found'}), 404
```

### 5.4 数据查询接口

提供简单的数据查询接口，供前端获取最新数据：

```python
@app.route('/api/node-data/<node_id>')
def get_node_data(node_id: str):
    """获取节点数据"""
    data_manager = get_data_manager()
    data = data_manager.get_node_data(node_id)
    version = data_manager.get_node_data_version(node_id)
    
    if data is not None:
        return jsonify({
            'data': data,
            'version': version,
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({'error': 'Node data not found'}), 404
```

---

## 6. 数据流设计

### 6.1 数据流架构说明

数据流采用**两层通信机制**，职责清晰分离：

1. **后端 → Web 前端**：通过 **SSE (Server-Sent Events)** 推送节点计算数据
2. **Web 前端 → iframe**：通过 **postMessage** 将数据传递给可视化组件

### 6.2 完整数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                        后端服务                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         ExecutionService (执行节点逻辑)                │  │
│  │  - 执行算子计算                                        │  │
│  │  - 生成节点输入数据（上游节点的输出）                  │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │ 节点输入数据                              │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      DataVisualizationService (数据管理服务)           │  │
│  │  - 管理节点数据状态                                    │  │
│  │  - 通过 SSE 推送节点输入数据更新                       │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────────┘
                  │ SSE 推送：node_input_update 事件
                  │ 职责：后端 → Web 前端
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Designer                         │
│                    (工作流设计器)                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           SSEClient (SSE 客户端)                      │  │
│  │  - 接收后端推送的节点输入数据更新                      │  │
│  │  - 更新 nodeInputDataMap 状态                         │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │ 触发 onNodeInputUpdate 回调              │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    DataVisualizationMonitor (可视化节点管理器)        │  │
│  │  - 维护 nodeId → DataVisualizationContainer 映射       │  │
│  │  - 根据 nodeId 直接寻址到对应的容器                    │  │
│  │  - 调用容器的 pushDataToIframe 方法                    │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │ 寻址并调用容器方法                        │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    DataVisualizationContainer (可视化容器)            │  │
│  │  - 接收管理器的推送请求                                │  │
│  │  - 通过 postMessage 推送数据到 iframe                 │  │
│  └──────────────┬───────────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────────┘
                  │ postMessage 通信
                  │ 职责：Web 前端 → iframe
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    iframe 沙箱环境                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        可视化组件 (entry_file)                        │  │
│  │  - 接收 postMessage 数据                              │  │
│  │  - 渲染可视化图表                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 通信机制职责划分

#### SSE (后端 → Web 前端)

**职责**：后端向 Web 前端推送节点计算数据

- **触发时机**：
  - 节点执行完成，生成新的输入数据
  - 节点输入数据更新（全量或增量）
  
- **数据格式**：
```json
{
  "type": "node_input_update",
  "nodeId": "node_123",
  "workflowId": "workflow_456",
  "updateType": "full",
  "inputData": {
    "input_port_1": { /* 数据 */ },
    "input_port_2": { /* 数据 */ }
  },
  "version": 1,
  "timestamp": 1234567890
}
```

- **实现位置**：
  - Web 前端的 `SSEClient` 监听 SSE 事件
  - 触发 `onNodeInputUpdate` 回调，更新 `nodeInputDataMap` 状态
  - 同时调用 `DataVisualizationMonitor.pushDataToNode()` 寻址并推送数据

#### postMessage (Web 前端 → iframe)

**职责**：Web 前端将数据传递给 iframe 中的可视化组件

- **触发时机**：
  - iframe 加载完成，发送 `ready` 消息后（初始化时一次性发送所有信息）
  - 接收到 SSE 的 `node_input_update` 事件时（通过 DataVisualizationMonitor 寻址推送）
  - 节点配置更新时（通过 DataVisualizationContainer 直接推送）
  
- **数据格式**：
```typescript
{
  type: 'data_update',
  payload: {
    data: nodeInputData,  // 从 SSE 接收到的数据
    updateType: 'full' | 'incremental',
    version: number,
    nodeInfo: { ... }
  }
}
```

- **实现位置**：
  - `DataVisualizationMonitor` 根据 `nodeId` 寻址到对应的 `DataVisualizationContainer`
  - `DataVisualizationContainer` 通过 `postMessage` 发送数据到 iframe

### 6.4 数据更新类型

#### 全量更新 (Full Update)

- **触发时机**：
  - 节点首次执行完成
  - 节点输入数据完全替换
  - Web 前端首次连接 SSE 时

- **数据格式**：
```json
{
  "type": "full",
  "inputData": {
    "input_port_1": { /* 完整数据 */ },
    "input_port_2": { /* 完整数据 */ }
  },
  "version": 1,
  "nodeId": "node_123",
  "workflowId": "workflow_456",
  "timestamp": 1234567890
}
```

#### 增量更新 (Incremental Update)

- **触发时机**：
  - 节点输入数据部分更新
  - 流式数据追加

- **数据格式**：
```json
{
  "type": "incremental",
  "inputData": {
    "input_port_1": { /* 增量数据 */ }
  },
  "version": 2,
  "nodeId": "node_123",
  "workflowId": "workflow_456",
  "timestamp": 1234567891
}
```

### 6.5 数据流示例

```typescript
// 1. 后端通过 SSE 推送数据
// SSE Event: node_input_update
{
  type: "node_input_update",
  nodeId: "node_123",
  inputData: { data: [1, 2, 3, 4, 5] },
  updateType: "full",
  version: 1
}

// 2. Web 前端 SSEClient 接收数据，更新状态并触发推送
const [nodeInputDataMap, setNodeInputDataMap] = useState<Map<string, Record<string, any>>>(new Map());
const dataVizMonitor = useMemo(() => new DataVisualizationMonitor(), []);

sseClient.onNodeInputUpdate = (nodeId: string, inputData: Record<string, any>, updateType: 'full' | 'incremental') => {
  // 更新状态
  setNodeInputDataMap(prev => {
    const newMap = new Map(prev);
    if (updateType === 'full') {
      newMap.set(nodeId, inputData);
    } else {
      const existing = newMap.get(nodeId) || {};
      newMap.set(nodeId, { ...existing, ...inputData });
    }
    return newMap;
  });
  
  // 通过 DataVisualizationMonitor 寻址并推送
  dataVizMonitor.pushDataToNode(nodeId, inputData, updateType);
};

// 3. DataVisualizationMonitor 寻址到对应的容器并推送
class DataVisualizationMonitor {
  pushDataToNode(nodeId: string, inputData: Record<string, any>, updateType: 'full' | 'incremental') {
    const container = this.visualizationNodes.get(nodeId);
    if (container) {
      container.pushDataToIframe(inputData, updateType);
    }
  }
}

// 4. DataVisualizationContainer 通过 postMessage 发送到 iframe
class DataVisualizationContainer {
  pushDataToIframe(inputData: Record<string, any>, updateType: 'full' | 'incremental') {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'data_update',
      payload: {
        data: inputData,
        updateType,
        version: Date.now()
      }
    }, window.location.origin);
  }
}

// 5. iframe 内部接收数据并渲染
window.addEventListener('message', (event) => {
  if (event.data.type === 'data_update') {
    const data = event.data.payload.data;
    renderChart(data);
  }
});
```

---

## 7. 实现细节

### 7.1 代码加载和执行

#### 方案 A：动态 import（推荐用于 React 组件）

```typescript
const executeWithBabel = async (code: string, container: HTMLElement) => {
  // 1. 使用 Babel 编译代码
  const compiledCode = await babel.transform(code, {
    presets: ['react', 'typescript'],
    plugins: ['transform-modules-commonjs'],
  });
  
  // 2. 创建模块执行环境
  const moduleExports = {};
  const module = { exports: moduleExports };
  const require = createRequireFunction();
  
  // 3. 执行编译后的代码
  const fn = new Function('module', 'exports', 'require', compiledCode.code);
  fn(module, moduleExports, require);
  
  // 4. 获取导出的组件
  const Component = moduleExports.default || moduleExports;
  
  // 5. 使用 React 渲染组件
  if (React.isValidElement(Component) || typeof Component === 'function') {
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(Component));
  }
};
```

#### 方案 B：直接执行（用于 CommonJS）

```typescript
const executeDirectly = async (code: string, container: HTMLElement) => {
  // 1. 创建执行环境
  const moduleExports = {};
  const module = { exports: moduleExports };
  const require = createRequireFunction();
  
  // 2. 执行代码
  const fn = new Function('module', 'exports', 'require', code);
  fn(module, moduleExports, require);
  
  // 3. 获取导出内容并渲染
  const result = moduleExports.default || moduleExports;
  if (typeof result === 'function') {
    result(container);
  } else if (result instanceof HTMLElement) {
    container.appendChild(result);
  }
};
```

### 7.2 沙箱隔离

为了安全，可视化代码应该在沙箱环境中执行：

```typescript
function createRequireFunction() {
  // 创建受限的 require 函数
  // 只允许加载特定的模块（如 React、图表库等）
  const allowedModules = ['react', 'react-dom', 'echarts', 'd3'];
  
  return (moduleName: string) => {
    if (allowedModules.includes(moduleName)) {
      return require(moduleName);
    }
    throw new Error(`不允许加载模块: ${moduleName}`);
  };
}
```

### 7.3 错误处理

```typescript
const loadVisualizationComponent = async (config: any) => {
  try {
    // ... 加载逻辑
  } catch (err: any) {
    console.error('加载可视化组件失败:', err);
    setError(`加载失败: ${err.message}`);
    
    // 显示友好的错误信息
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div class="visualization-error">
          <p>可视化组件加载失败</p>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
};
```

### 7.4 性能优化

1. **懒加载**：只在节点展开或可见时加载可视化组件
2. **代码缓存**：缓存编译后的代码，避免重复编译
3. **防抖更新**：对频繁的数据更新进行防抖处理
4. **虚拟滚动**：对于大量数据的可视化，使用虚拟滚动

---

## 8. 使用示例

### 8.1 基础示例（CommonJS）

```javascript
// preview/main.tsx
const sdk = window.__DATA_VISUALIZATION_SDK__;

// 获取输入数据
const inputData = sdk.getInputData('data');

// 创建可视化
function render(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  
  // 使用输入数据绘制图表
  drawChart(canvas, inputData);
  
  // 监听数据更新
  sdk.onFullUpdate((newData) => {
    drawChart(canvas, newData.data);
  });
}

module.exports = render;
```

### 8.2 React 组件示例

```tsx
// preview/main.tsx
import React, { useEffect, useState } from 'react';
import { LineChart } from 'echarts';

const sdk = window.__DATA_VISUALIZATION_SDK__;

function MyVisualization() {
  const [data, setData] = useState(sdk.getInputData('data') || []);
  
  useEffect(() => {
    // 监听全量更新
    const unsubscribe = sdk.onFullUpdate((newData) => {
      setData(newData.data || []);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <div>
      <LineChart data={data} />
    </div>
  );
}

export default MyVisualization;
```

### 8.3 使用 React Hook（如果提供）

```tsx
// preview/main.tsx
import React from 'react';
import { useDataVisualization } from 'data-visualization-js-sdk/react';
import { BarChart } from 'echarts';

function MyVisualization() {
  const { inputData, onFullUpdate } = useDataVisualization();
  const [data, setData] = React.useState(inputData?.data || []);
  
  React.useEffect(() => {
    const unsubscribe = onFullUpdate((newData) => {
      setData(newData.data || []);
    });
    return unsubscribe;
  }, [onFullUpdate]);
  
  return <BarChart data={data} />;
}

export default MyVisualization;
```

---

## 9. 总结

### 9.1 设计优势（基于 iframe 沙箱）

1. **安全性**：iframe 沙箱提供天然的安全隔离，防止恶意代码影响主应用
2. **标准化**：基于标准的 `postMessage` 协议，兼容各种前端技术栈
3. **灵活性**：支持多种开发模式（使用 SDK 或直接通信），降低开发门槛
4. **独立性**：每个可视化组件运行在独立环境中，互不干扰
5. **兼容性**：支持 Python 生成的 HTML 和现代前端构建产物

### 9.2 架构改进亮点

基于用户提出的建议，新的架构设计具有以下改进：

1. **iframe 沙箱隔离**：可视化组件运行在独立环境中，确保主应用安全
2. **统一入口文件**：无论是 Python 生成的 HTML 还是前端构建产物，都通过统一的入口文件加载
3. **可选 SDK 设计**：开发者可以选择使用 SDK 简化开发，也可以直接使用 `postMessage` 通信
4. **简化后端服务**：不再需要复杂的 SSE 机制，后端专注于数据管理
5. **更好的兼容性**：支持各种前端技术栈，包括传统的 ES5/ES6 项目

### 9.3 实施计划（基于 iframe 架构）

#### 阶段 1：基础框架
- [ ] 创建基于 iframe 的 DataVisualizationContainer 组件
- [ ] 定义标准化的 `postMessage` 通信协议
- [ ] 集成到 CustomNode 中

#### 阶段 2：数据通信
- [ ] 实现主应用与 iframe 的双向通信机制
- [ ] 开发可选的数据可视化 SDK
- [ ] 完善错误处理和生命周期管理

#### 阶段 3：功能完善
- [ ] 支持动态尺寸调整
- [ ] 添加性能优化和缓存机制
- [ ] 完善开发文档和示例

### 9.4 注意事项

1. **跨域安全**：需要合理配置 iframe 的 `sandbox` 属性，平衡安全与功能
2. **性能考虑**：大量 iframe 可能影响性能，需要合理管理生命周期
3. **通信验证**：需要验证 `postMessage` 的来源，防止恶意消息
4. **错误处理**：完善的错误处理机制确保 iframe 内外的稳定性
5. **移动端适配**：需要考虑移动端 iframe 的显示和交互体验

---

## 9. 未来升级方向

本章节列出了未来可以考虑的架构改进方向，这些改进将进一步提升系统的安全性、性能和开发体验。

### 9.1 安全性增强

#### postMessage 来源验证
- **改进点**：使用具体的 `targetOrigin` 替代 `'*'`，验证消息来源
- **实现**：在发送消息时使用 `window.location.origin`，接收时验证 `event.origin`
- **收益**：防止跨域恶意消息攻击

#### iframe sandbox 权限细化
- **改进点**：根据实际需求最小化 sandbox 权限
- **实现**：明确禁用不需要的权限（如 `allow-top-navigation`），按需添加必要权限
- **收益**：提升安全隔离级别

#### 消息签名验证
- **改进点**：为重要消息添加签名或 token 验证
- **实现**：在消息中添加签名字段，接收端验证消息完整性
- **收益**：防止消息被篡改

### 9.2 性能优化

#### iframe 生命周期管理
- **改进点**：实现 iframe 池化和懒加载机制
- **实现**：
  - 节点不可见时卸载 iframe
  - 使用 Intersection Observer 实现懒加载
  - 限制同时活跃的 iframe 数量
- **收益**：减少内存占用，提升页面性能

#### 数据更新频率控制
- **改进点**：对高频数据更新进行节流/防抖
- **实现**：
  - 实现数据更新队列
  - 添加更新频率限制（如每秒最多 N 次）
  - 支持批量更新合并
- **收益**：避免过度渲染，提升性能

#### 内存泄漏防护
- **改进点**：完善事件监听器清理机制
- **实现**：
  - 组件卸载时清理所有事件监听器
  - 使用 WeakMap 管理 iframe 引用
  - 实现 iframe 生命周期监控
- **收益**：防止内存泄漏，提升稳定性

### 9.3 通信协议增强

#### 协议版本管理
- **改进点**：添加通信协议版本号，支持版本协商
- **实现**：在消息中添加 `protocolVersion` 字段，实现向后兼容策略
- **收益**：支持协议平滑升级

#### 消息类型扩展
- **改进点**：添加更多消息类型（心跳、状态查询等）
- **实现**：
  - `heartbeat` 类型用于连接保活
  - `status_query` 用于查询 iframe 状态
  - `version_check` 用于协议版本协商
- **收益**：增强通信能力，支持更多场景

#### 大数据传输优化
- **改进点**：支持数据分片传输和压缩
- **实现**：
  - 支持数据分片传输
  - 支持二进制数据（ArrayBuffer）
  - 提供数据压缩选项
- **收益**：提升大数据量场景下的传输效率

### 9.4 开发体验提升

#### TypeScript 类型完善
- **改进点**：提供完整的 TypeScript 类型定义
- **实现**：
  - 为 SDK 提供完整的类型声明
  - 为通信协议提供类型定义
  - 提供配置 schema 类型
- **收益**：提升开发体验，减少类型错误

#### 调试工具支持
- **改进点**：提供开发模式下的调试工具
- **实现**：
  - 支持在 iframe 中注入 DevTools
  - 提供日志收集机制
  - 提供可视化调试面板
- **收益**：简化问题排查，提升开发效率

#### 配置验证机制
- **改进点**：在算子注册时进行配置验证
- **实现**：
  - 提供配置 schema 验证
  - 在算子注册时进行配置检查
  - 提供配置错误提示
- **收益**：提前发现问题，减少运行时错误

### 9.5 功能扩展

#### 响应式设计支持
- **改进点**：添加响应式尺寸配置，支持移动端适配
- **实现**：支持响应式断点和自适应尺寸
- **收益**：提升移动端用户体验

#### 主题定制支持
- **改进点**：允许 iframe 接收主题信息
- **实现**：在通信协议中添加主题信息传递
- **收益**：支持暗色模式等主题切换

#### 多语言支持
- **改进点**：在通信协议中支持语言信息传递
- **实现**：添加语言字段，支持国际化
- **收益**：支持多语言可视化组件

### 9.6 监控和可观测性

#### 性能监控
- **改进点**：添加性能监控指标
- **实现**：
  - 记录 iframe 加载时间
  - 统计通信错误率
  - 监控数据更新延迟
- **收益**：便于性能分析和优化

#### 错误追踪
- **改进点**：完善错误收集和上报机制
- **实现**：
  - 收集 iframe 内部错误
  - 记录通信失败原因
  - 提供错误统计面板
- **收益**：快速定位和解决问题

### 9.7 测试支持

#### 测试工具和示例
- **改进点**：提供测试工具和示例
- **实现**：
  - 提供单元测试示例
  - 提供集成测试方案
  - 提供 E2E 测试指南
- **收益**：提升代码质量，降低回归风险

---

**注意**：以上升级方向为未来规划，当前版本以稳定性和基本功能为主。具体实施时需根据实际需求和优先级进行选择。

---

## 附录

### A. 配置示例

```yaml
# operator.yaml
data_visualization:
  entry_file: "./preview/main.tsx"
  use_babel: true
  always_expand: true
  icon: "line-chart"
  color: "#52c41a"
  allow_fullscreen: true
  size:
    width: "auto"
    height: 120
```

### B. SSE 事件格式

```typescript
// 全量更新事件
{
  type: 'node_input_update',
  nodeId: 'node_123',
  workflowId: 'workflow_456',
  updateType: 'full',
  inputData: { /* ... */ },
  version: 1,
  timestamp: 1234567890
}

// 增量更新事件
{
  type: 'node_input_update',
  nodeId: 'node_123',
  workflowId: 'workflow_456',
  updateType: 'incremental',
  inputData: { /* ... */ },
  version: 2,
  timestamp: 1234567891
}
```



# Workflow Engine SSE API 使用文档

## 概述

Workflow Engine SSE API 提供了实时的工作流执行数据流推送功能，支持通过 Server-Sent Events (SSE) 实时获取工作流执行过程中的所有 input/output、stderr、stdout 数据。

## 功能特性

- 🚀 **实时数据流**: 通过 SSE 实时推送工作流执行数据
- 📊 **多类型日志**: 支持 stdout、stderr、output 等多种日志类型
- 🔍 **智能过滤**: 支持按节点ID和日志类型过滤
- 💾 **历史数据**: 提供历史数据查询和缓冲区管理
- 🔄 **自动重连**: 前端支持自动重连机制
- 📈 **统计监控**: 提供详细的执行统计信息

## 快速开始

### 1. 安装依赖

```bash
cd workflow-engine
pip install -r requirements.txt
```

### 2. 启动服务器

```bash
# 开发模式
python api_server.py --reload

# 生产模式
python api_server.py --host 0.0.0.0 --port 8000
```

### 3. 访问API文档

打开浏览器访问: http://localhost:8000/docs

## API 接口

### 基础信息

- **基础URL**: `http://localhost:18151`
- **API版本**: v1.0.0
- **数据格式**: JSON
- **流式数据**: Server-Sent Events (SSE)

### 核心接口

#### 1. 执行工作流

```http
POST http://localhost:18151/api/workflows/execute
Content-Type: application/json

{
  "workflow_path": "/path/to/workflow.yaml",
  "workflow_id": "wf_12345",
  "inputs": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**响应**:
```json
{
  "workflow_id": "wf_12345",
  "status": "running",
  "message": "工作流执行已开始"
}
```

#### 2. SSE 实时数据流

```http
GET http://localhost:18151/api/workflows/{workflow_id}/stream?node_filter=node1&log_types=stdout,stderr
Accept: text/event-stream
```

**SSE 数据格式**:
```
data: {"type": "workflow_status", "workflow_id": "wf_12345", "status": "running", "timestamp": "2024-01-01T12:00:00"}

data: {"type": "node_log", "workflow_id": "wf_12345", "node_id": "node1", "log_type": "stdout", "content": "Processing data...", "timestamp": "2024-01-01T12:00:01"}

data: {"type": "node_output", "workflow_id": "wf_12345", "node_id": "node1", "content": "{\"result\": \"success\"}", "timestamp": "2024-01-01T12:00:02"}
```

#### 3. 获取工作流状态

```http
GET http://localhost:18151/api/workflows/{workflow_id}
```

**响应**:
```json
{
  "workflow_id": "wf_12345",
  "status": "completed",
  "execution_time": 15.5,
  "node_count": 3,
  "completed_nodes": 3,
  "error": null
}
```

#### 4. 获取历史数据

```http
GET http://localhost:18151/api/workflows/{workflow_id}/history?limit=100
```

**响应**:
```json
{
  "workflow_id": "wf_12345",
  "history": [
    {
      "type": "workflow_status",
      "workflow_id": "wf_12345",
      "status": "running",
      "timestamp": "2024-01-01T12:00:00"
    }
  ],
  "count": 1
}
```

## 前端集成

### JavaScript/TypeScript 示例

#### 1. 基础 SSE 连接

```typescript
class WorkflowStreamClient {
  private eventSource: EventSource | null = null;
  private workflowId: string;

  constructor(workflowId: string) {
    this.workflowId = workflowId;
  }

  connect(nodeFilter?: string, logTypes?: string[]) {
    const url = new URL(`/api/workflows/${this.workflowId}/stream`, window.location.origin);
    
    if (nodeFilter) {
      url.searchParams.set('node_filter', nodeFilter);
    }
    
    if (logTypes && logTypes.length > 0) {
      url.searchParams.set('log_types', logTypes.join(','));
    }

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      console.log('SSE连接已建立');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleStreamData(data);
      } catch (error) {
        console.error('解析SSE数据失败:', error);
      }
    };

    this.eventSource.onerror = () => {
      console.error('SSE连接错误');
      this.reconnect();
    };
  }

  private handleStreamData(data: any) {
    switch (data.type) {
      case 'workflow_status':
        this.handleWorkflowStatus(data);
        break;
      case 'node_log':
        this.handleNodeLog(data);
        break;
      case 'node_output':
        this.handleNodeOutput(data);
        break;
      case 'node_status':
        this.handleNodeStatus(data);
        break;
      case 'heartbeat':
        // 心跳消息，保持连接活跃
        break;
    }
  }

  private handleWorkflowStatus(data: any) {
    console.log(`工作流状态: ${data.status}`);
    // 更新UI状态
  }

  private handleNodeLog(data: any) {
    console.log(`节点 ${data.node_id} ${data.log_type}: ${data.content}`);
    // 显示日志到UI
  }

  private handleNodeOutput(data: any) {
    console.log(`节点 ${data.node_id} 输出:`, data.content);
    // 处理输出数据
  }

  private handleNodeStatus(data: any) {
    console.log(`节点 ${data.node_id} 状态: ${data.status}`);
    // 更新节点状态
  }

  private reconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    // 指数退避重连
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
```

#### 2. React Hook 示例

```typescript
import { useState, useEffect, useRef } from 'react';

interface StreamData {
  type: 'workflow_status' | 'node_log' | 'node_output' | 'node_status';
  workflow_id: string;
  node_id?: string;
  log_type?: 'stdout' | 'stderr' | 'output';
  content?: string;
  status?: string;
  timestamp: string;
}

export const useWorkflowStream = (
  workflowId: string, 
  nodeFilter?: string, 
  logTypes?: string[]
) => {
  const [data, setData] = useState<StreamData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workflowId) return;

    const url = new URL(`/api/workflows/${workflowId}/stream`, window.location.origin);
    if (nodeFilter) {
      url.searchParams.set('node_filter', nodeFilter);
    }
    if (logTypes && logTypes.length > 0) {
      url.searchParams.set('log_types', logTypes.join(','));
    }

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const streamData: StreamData = JSON.parse(event.data);
        setData(prev => [...prev, streamData]);
      } catch (err) {
        setError('数据解析失败');
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('连接错误');
    };

    return () => {
      eventSource.close();
    };
  }, [workflowId, nodeFilter, logTypes]);

  const clearData = () => setData([]);

  return { 
    data, 
    isConnected, 
    error, 
    clearData 
  };
};
```

#### 3. React 组件示例

```typescript
import React from 'react';
import { Box, VStack, Text, Badge, Divider, Button } from '@chakra-ui/react';
import { useWorkflowStream } from './useWorkflowStream';

interface Props {
  workflowId: string;
  nodeFilter?: string;
  logTypes?: string[];
}

export const WorkflowExecutionPanel: React.FC<Props> = ({ 
  workflowId, 
  nodeFilter, 
  logTypes 
}) => {
  const { data, isConnected, error, clearData } = useWorkflowStream(
    workflowId, 
    nodeFilter, 
    logTypes
  );

  return (
    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
      <VStack align="stretch" spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold">工作流执行日志</Text>
          <Box>
            <Badge colorScheme={isConnected ? 'green' : 'red'} mr={2}>
              {isConnected ? '已连接' : '未连接'}
            </Badge>
            <Button size="sm" onClick={clearData}>
              清空日志
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Text color="red.500" fontSize="sm">
            错误: {error}
          </Text>
        )}
        
        <Divider />
        
        <Box maxH="400px" overflowY="auto">
          {data.map((item, index) => (
            <Box key={index} p={2} bg="gray.50" borderRadius="sm" mb={1}>
              <Text fontSize="sm" color="gray.600">
                [{item.timestamp}] {item.type}
              </Text>
              {item.node_id && (
                <Text fontSize="xs" color="blue.600">
                  节点: {item.node_id}
                </Text>
              )}
              {item.log_type && (
                <Badge size="xs" colorScheme="blue" mr={2}>
                  {item.log_type}
                </Badge>
              )}
              {item.content && (
                <Text fontSize="sm" fontFamily="mono" mt={1}>
                  {item.content}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      </VStack>
    </Box>
  );
};
```

## 数据格式说明

### 工作流状态数据

```json
{
  "type": "workflow_status",
  "workflow_id": "wf_12345",
  "status": "running|completed|failed",
  "timestamp": "2024-01-01T12:00:00",
  "metadata": {
    "execution_time": 15.5,
    "node_count": 3,
    "completed_nodes": 2
  }
}
```

### 节点日志数据

```json
{
  "type": "node_log",
  "workflow_id": "wf_12345",
  "node_id": "node1",
  "log_type": "stdout|stderr",
  "content": "日志内容",
  "timestamp": "2024-01-01T12:00:00"
}
```

### 节点输出数据

```json
{
  "type": "node_output",
  "workflow_id": "wf_12345",
  "node_id": "node1",
  "content": "{\"result\": \"success\"}",
  "timestamp": "2024-01-01T12:00:00",
  "metadata": {
    "output_keys": ["result"],
    "data_size": 20
  }
}
```

### 节点状态数据

```json
{
  "type": "node_status",
  "workflow_id": "wf_12345",
  "node_id": "node1",
  "status": "running|completed|failed",
  "timestamp": "2024-01-01T12:00:00",
  "metadata": {
    "execution_time": 2.5
  }
}
```

## 高级功能

### 1. 过滤参数

#### 节点过滤
```http
GET http://localhost:18151/api/workflows/wf_12345/stream?node_filter=node1
```

#### 日志类型过滤
```http
GET http://localhost:18151/api/workflows/wf_12345/stream?log_types=stdout,stderr
```

#### 组合过滤
```http
GET http://localhost:18151/api/workflows/wf_12345/stream?node_filter=node1&log_types=stdout
```

### 2. 历史数据管理

#### 获取历史数据
```http
GET http://localhost:18151/api/workflows/wf_12345/history?limit=50
```

#### 清理缓冲区
```http
POST http://localhost:18151/api/workflows/wf_12345/clear
```

### 3. 统计信息

```http
GET http://localhost:18151/api/statistics
```

**响应**:
```json
{
  "workflow_engine": {
    "total_executions": 10,
    "successful_executions": 8,
    "failed_executions": 2
  },
  "sse_service": {
    "active_connections": 2,
    "max_connections": 100,
    "total_messages_sent": 1500
  },
  "operator_manager": {
    "total_operators": 25
  }
}
```

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `404`: 工作流不存在
- `500`: 服务器内部错误

### 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

### SSE 连接错误处理

```typescript
eventSource.onerror = (event) => {
  console.error('SSE连接错误:', event);
  
  // 实现重连逻辑
  setTimeout(() => {
    connect();
  }, 1000);
};
```

## 性能优化

### 1. 连接管理

- 最大连接数: 100 (可配置)
- 缓冲区大小: 1000 (可配置)
- 自动清理过期数据

### 2. 数据压缩

- 支持 gzip 压缩
- 批量发送减少网络开销

### 3. 内存管理

- 自动清理历史数据
- 限制缓冲区大小
- 定期垃圾回收

## 安全考虑

### 1. CORS 配置

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 限制具体域名
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### 2. 认证授权

```python
# 添加JWT token验证
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(token: str = Depends(security)):
    # 验证token逻辑
    pass
```

### 3. 速率限制

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/workflows/{workflow_id}/stream")
@limiter.limit("10/minute")
async def stream_workflow_execution(request: Request, ...):
    # 限制每分钟最多10个连接
    pass
```

## 故障排除

### 1. 连接问题

**问题**: SSE连接无法建立
**解决方案**:
- 检查服务器是否正常运行
- 确认端口是否被占用
- 检查防火墙设置

### 2. 数据丢失

**问题**: 部分日志数据丢失
**解决方案**:
- 检查缓冲区大小设置
- 确认网络连接稳定性
- 查看服务器日志

### 3. 性能问题

**问题**: 连接过多导致性能下降
**解决方案**:
- 调整最大连接数限制
- 优化数据推送频率
- 增加服务器资源

## 示例项目

完整的前端示例项目请参考 `examples/frontend-integration/` 目录。

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持基础SSE流式推送
- 提供完整的API接口
- 支持节点过滤和日志类型过滤

## 技术支持

如有问题或建议，请提交 Issue 或联系开发团队。

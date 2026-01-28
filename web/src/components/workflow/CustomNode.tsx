import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import { Tag, Space, Dropdown, Button, Tooltip, message, Modal, Badge } from 'antd';
import { 
  MoreOutlined, 
  PlayCircleOutlined, 
  LoadingOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Operator } from '../../types';
import InlineNodeConfig from './InlineNodeConfig';
import DataVisualizationContainer from './DataVisualizationContainer';
import { api } from '../../services/api';
import { SSEClient } from '../../utils/sseClient';
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from './BaseNode';
import { NodeStatusIndicator } from './NodeStatusIndicator';
// import { NodeStatusIndicator } from "@/components/node-status-indicator";

interface CustomNodeData {
  label: string;
  operator?: Operator;
  config?: any;
  nodeType?: string;
  workflowId?: string; // 工作流ID，用于执行相关API
  onConfigChange?: (nodeId: string, config: any) => void;
  onExecutionResult?: (nodeId: string, result: {
    success: boolean;
    data?: any;
    error?: string;
    operatorId?: string;
    operatorType?: string;
    operatorName?: string;
  }) => void;
  executionResults?: Map<string, {
    success: boolean;
    data?: any;
    error?: string;
    operatorId?: string;
    operatorType?: string;
    operatorName?: string;
    timestamp?: string;
  }>;
  connections?: Array<{
    id: string;
    from: { node: string; port: string };
    to: { node: string; port: string };
  }>;
  nodeInputData?: Record<string, any>; // 节点输入数据（从 SSE 接收，上游节点的输出）
}

type NodeStatus = 'unconfigured' | 'configured' | 'error' | 'executing' | 'success' | 'failed';

const CustomNode: React.FC<NodeProps<any>> = ({ data, selected, id }) => {
  const nodeData = data as CustomNodeData;
  const operator = nodeData.operator;
  const { updateNodeData, deleteElements, updateNode } = useReactFlow();
  const [messageApi, contextHolder] = message.useMessage();
  const [executing, setExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'success' | 'loading' | 'error' | 'initial'>('initial');
  const debugLoggedRef = useRef(false);

  // 解析 dataVisualization 配置
  const dataVizConfig = useMemo(() => {
    if (!operator?.dataVisualization) return null;
    try {
      const config = typeof operator.dataVisualization === 'string' 
        ? JSON.parse(operator.dataVisualization) 
        : operator.dataVisualization;
      return config;
    } catch (e) {
      console.error('[CustomNode] 解析 dataVisualization 配置失败:', e);
      return null;
    }
  }, [operator?.dataVisualization]);

  // 检查是否允许 resize
  const allowResize = dataVizConfig?.allow_resize === true;

  // 获取初始尺寸（优先使用节点 config 中的尺寸，否则使用算子的默认尺寸）
  const initialSize = useMemo(() => {
    // 优先从节点 config 中读取（用户调整后的尺寸）
    const nodeConfigSize = nodeData.config?.dataVisualizationSize;
    if (nodeConfigSize) {
      return {
        width: typeof nodeConfigSize.width === 'number' ? nodeConfigSize.width : undefined,
        height: typeof nodeConfigSize.height === 'number' ? nodeConfigSize.height : undefined,
      };
    }

    // 否则使用算子的默认尺寸
    if (dataVizConfig?.size) {
      const width = dataVizConfig.size.width;
      const height = dataVizConfig.size.height;
      return {
        width: typeof width === 'number' ? width : (width === '100%' || width === 'auto' ? undefined : parseInt(String(width)) || undefined),
        height: typeof height === 'number' ? height : parseInt(String(height)) || undefined,
      };
    }
    return { width: undefined, height: undefined };
  }, [dataVizConfig?.size, nodeData.config?.dataVisualizationSize]);

  const handleConfigChange = (newConfig: any) => {
    console.log('CustomNode: 节点配置变化', { nodeId: id, newConfig });
    
    // 更新节点数据
    updateNodeData(id as string, { ...nodeData, config: newConfig });
    
    // 调用外部回调
    if (nodeData.onConfigChange) {
      nodeData.onConfigChange(id as string, newConfig);
    }
  };


  // 使用SSE连接接收执行结果
  const connectExecutionSSE = (sessionId: string, targetNodeId?: string) => {
    const sseClient = new SSEClient(sessionId, {
      onNodeStatus: (nodeId: string, status: string) => {
        // 可以在这里更新节点状态（如果需要）
        if (!targetNodeId || nodeId === targetNodeId) {
          console.log(`节点 ${nodeId} 状态更新: ${status}`);
        }
      },
      onNodeResult: (nodeId: string, result: {
        success: boolean;
        outputData?: any;
        error?: string;
        duration?: number;
        status: string;
      }) => {
        // 处理单个节点的执行结果
        if (!targetNodeId || nodeId === targetNodeId) {
          if (nodeData.onExecutionResult) {
            nodeData.onExecutionResult(nodeId, {
              success: result.success,
              data: result.outputData,
              error: result.error,
              operatorId: operator?.id,
              operatorType: operator?.operatorType,
              operatorName: operator?.name,
            });
          }
        }
      },
      onSessionComplete: (results: Record<string, any>) => {
        // 所有节点执行完成
        console.log('执行完成，所有节点结果:', results);
        setExecuting(false);
        
        // 处理所有节点的结果（部分执行时可能有多个节点）
        Object.entries(results).forEach(([nodeId, result]: [string, any]) => {
          if (nodeData.onExecutionResult) {
            nodeData.onExecutionResult(nodeId, {
              success: result.success,
              data: result.outputData,
              error: result.error,
              operatorId: operator?.id,
              operatorType: operator?.operatorType,
              operatorName: operator?.name,
            });
          }
        });
      },
      onError: (error: string) => {
        console.error('SSE连接错误:', error);
        messageApi.error(`执行错误: ${error}`);
        setExecuting(false);
      },
      onConnect: () => {
        console.log('SSE连接已建立');
      },
      onDisconnect: () => {
        console.log('SSE连接已断开');
      },
    });

    sseClient.connect();
    return sseClient;
  };

  // 部分执行（从当前节点开始执行后续节点）
  const handleExecutePartial = async () => {
    if (!operator) {
      messageApi.error('算子信息不存在');
      return;
    }

    if (!nodeData.workflowId) {
      messageApi.error('工作流ID不存在，请先保存工作流');
      return;
    }

    setExecuting(true);
    setExecutionStatus('loading');

    try {
      // 使用SSE模式执行
      const result = await api.executePartialWorkflowStream(
        nodeData.workflowId,
        [id as string],
        { [id as string]: nodeData.config || {} }
      );

      if (result.success && result.sessionId) {
        messageApi.success('部分执行已启动');
        setExecutionStatus('success');

        // 连接SSE流接收实时结果
        connectExecutionSSE(result.sessionId);

        // 3秒后恢复初始状态
        setTimeout(() => {
          setExecutionStatus('initial');
        }, 3000);
      } else {
        throw new Error(result.error || '执行失败');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '执行失败';
      messageApi.error(`执行失败: ${errorMessage}`);
      setExecutionStatus('error');

      // 3秒后恢复初始状态
      setTimeout(() => {
        setExecutionStatus('initial');
      }, 3000);
    } finally {
      setExecuting(false);
    }
  };

  // 单节点执行
  const handleExecuteSingle = async () => {
    if (!operator) {
      messageApi.error('算子信息不存在');
      return;
    }

    if (!nodeData.workflowId) {
      messageApi.error('工作流ID不存在，请先保存工作流');
      return;
    }

    setExecuting(true);
    setExecutionStatus('loading');

    // 通知开始执行
    if (nodeData.onExecutionResult) {
      nodeData.onExecutionResult(id as string, {
        success: false,
        data: null,
        operatorId: operator.id,
        operatorType: operator.operatorType || undefined, // 纯前端可视化算子可能没有
        operatorName: operator.name,
      });
    }

    try {
      // 使用SSE模式执行
      const result = await api.executeSingleNodeInWorkflowStream(
        nodeData.workflowId,
        id as string,
        nodeData.config || {}
      );

      if (result.success && result.sessionId) {
        messageApi.success('节点执行已启动');
        setExecutionStatus('success');

        // 连接SSE流接收实时结果
        connectExecutionSSE(result.sessionId, id as string);

        // 3秒后恢复初始状态
        setTimeout(() => {
          setExecutionStatus('initial');
        }, 3000);
      } else {
        throw new Error(result.error || '执行失败');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '执行失败';
      messageApi.error(`执行失败: ${errorMessage}`);
      setExecutionStatus('error');
      
      // 通知执行失败
      if (nodeData.onExecutionResult) {
        nodeData.onExecutionResult(id as string, {
          success: false,
          error: errorMessage,
          operatorId: operator.id,
          operatorType: operator.operatorType || undefined, // 纯前端可视化算子可能没有
          operatorName: operator.name,
        });
      }

      // 3秒后恢复初始状态
      setTimeout(() => {
        setExecutionStatus('initial');
      }, 3000);
    } finally {
      setExecuting(false);
    }
  };

  // 检查是否有配置参数
  const hasOperatorParams = () => {
    if (!operator) {
      // 只在第一次检测到问题时输出日志
      if (!debugLoggedRef.current) {
        console.warn(`[CustomNode ${id}] operator is missing`);
        debugLoggedRef.current = true;
      }
      return false;
    }
    
    const params = operator.operatorParams;
    
    if (params === null || params === undefined) {
      // 只在第一次检测到问题时输出日志
      if (!debugLoggedRef.current) {
        console.warn(`[CustomNode ${id}] operatorParams is null/undefined for operator:`, operator.name);
        debugLoggedRef.current = true;
      }
      return false;
    }
    
    // 如果是字符串，尝试解析
    if (typeof params === 'string') {
      try {
        const parsed = JSON.parse(params);
        if (Array.isArray(parsed)) {
          return parsed.length > 0;
        }
        if (typeof parsed === 'object') {
          return Object.keys(parsed).length > 0;
        }
        return false;
      } catch (e) {
        console.error('Failed to parse operatorParams as JSON:', e);
        return false;
      }
    }
    
    if (Array.isArray(params)) {
      return params.length > 0;
    }
    
    if (typeof params === 'object') {
      return Object.keys(params).length > 0;
    }
    
    return false;
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除节点 "${nodeData.label}" 吗？删除后相关的连接也会被删除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        // 删除节点及其相关连接
        deleteElements({ nodes: [{ id: id as string }] });
        messageApi.success('节点已删除');
      },
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'execute-single',
      label: '单节点执行',
      icon: <PlayCircleOutlined />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleExecuteSingle();
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleDelete();
      },
    },
  ];

  const getOperatorTypeColor = (type?: string) => {
    const colorMap: Record<string, string> = {
      local_python: 'blue',
      local_typescript: 'purple',
      local_go: 'green',
      local_rust: 'orange',
    };
    return colorMap[type || ''] || 'default';
  };

  // 获取输入输出端口
  const inputs = operator?.inputs || [];
  const outputs = operator?.outputs || [];

  // 计算节点状态
  const nodeStatus = useMemo<NodeStatus>(() => {
    if (executing) return 'executing';
    
    // 检查配置是否完整
    if (!operator) return 'unconfigured';
    
    const params = operator.operatorParams;
    if (!params || (Array.isArray(params) && params.length === 0)) {
      return 'configured'; // 没有配置参数，视为已配置
    }
    
    // 检查必需参数是否已填写
    const requiredParams = Array.isArray(params) 
      ? params.filter((p: any) => p.required)
      : [];
    
    if (requiredParams.length === 0) {
      return 'configured';
    }
    
    // 检查所有必需参数是否都有值
    const config = nodeData.config || {};
    const allRequiredFilled = requiredParams.every((param: any) => {
      const value = config[param.name];
      return value !== undefined && value !== null && value !== '';
    });
    
    if (allRequiredFilled) {
      return 'configured';
    }
    
    return 'unconfigured';
  }, [executing, operator, nodeData.config]);

  // 获取状态指示器
  const getStatusIndicator = () => {
    switch (nodeStatus) {
      case 'executing':
        return (
          <Badge 
            status="processing" 
            color="blue"
            text={<span style={{ fontSize: 11, color: '#1890ff' }}>执行中</span>}
          />
        );
      case 'configured':
        return (
          <Tooltip title="配置完整">
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
          </Tooltip>
        );
      case 'error':
        return (
          <Tooltip title="配置错误">
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
          </Tooltip>
        );
      case 'unconfigured':
      default:
        return (
          <Tooltip title="未配置">
            <ExclamationCircleOutlined style={{ color: '#d9d9d9', fontSize: 12 }} />
          </Tooltip>
        );
    }
  };

  // 确定状态指示器的状态
  const indicatorStatus = useMemo(() => {
    if (executionStatus === 'loading') return 'loading';
    if (executionStatus === 'success') return 'success';
    if (executionStatus === 'error') return 'error';
    return 'initial';
  }, [executionStatus]);

  // 使用 ref 跟踪是否正在 resize
  const isResizingRef = useRef(false);

  // 处理节点 resize（resize 过程中）
  const handleResize = useCallback((params: { width: number; height: number }) => {
    if (!allowResize) return;

    // 标记正在 resize
    isResizingRef.current = true;

    const { width, height } = params;
    
    // 更新节点尺寸（实时更新）
    // 使用 requestAnimationFrame 确保在下一个渲染周期更新，避免在渲染过程中触发状态更新
    requestAnimationFrame(() => {
      updateNode(id as string, (node) => ({
        ...node,
        style: {
          ...node.style,
          width,
          height,
        },
      }));
    });
  }, [allowResize, id, updateNode]);

  // 处理节点 resize 结束（保存到节点配置）
  const handleResizeEnd = useCallback((params: { width: number; height: number }) => {
    if (!allowResize) return;

    const { width, height } = params;
    
    // 清除 resize 标记
    isResizingRef.current = false;
    
    // 使用双重 requestAnimationFrame 确保在所有渲染完成后执行
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 将尺寸保存到节点的 config 中（节点级别的配置）
        const updatedConfig = {
          ...nodeData.config,
          dataVisualizationSize: {
            width,
            height,
          },
        };

        // 通过 handleConfigChange 保存配置（会触发工作流保存）
        handleConfigChange(updatedConfig);

        console.log('[CustomNode] Resize 完成，新尺寸已保存到节点配置:', { width, height });
      });
    });
  }, [allowResize, nodeData.config, handleConfigChange]);

  return (
    <>
      {contextHolder}
      <NodeStatusIndicator status={indicatorStatus} variant="border">
        <BaseNode 
          selected={selected}
          style={{
            width: initialSize.width,
            height: initialSize.height,
            minWidth: allowResize ? 200 : undefined,
            minHeight: allowResize ? 150 : undefined,
          }}
        >
          {allowResize && (
            <NodeResizer
              color="#1890ff"
              isVisible={selected}
              minWidth={200}
              minHeight={150}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
            />
          )}
        <BaseNodeHeader>
        <BaseNodeHeaderTitle>
          {getStatusIndicator()}
          <span 
            style={{ 
              fontSize: 14, 
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={nodeData.label}
          >
            {nodeData.label}
          </span>
        </BaseNodeHeaderTitle>
        <Space>
          {operator && operator.operatorType && (
            <Tag color={getOperatorTypeColor(operator.operatorType)} style={{ margin: 0 }}>
              {operator.operatorType}
            </Tag>
          )}
          {/* 执行按钮 - 部分执行 */}
          <Tooltip title="从当前节点执行（部分执行）">
            <Button 
              type="text" 
              size="small" 
              icon={executing ? <LoadingOutlined /> : <PlayCircleOutlined />}
              loading={executing}
              onClick={(e) => {
                e.stopPropagation();
                handleExecutePartial();
              }}
              disabled={!operator || executing || !nodeData.workflowId}
              className="nodrag"
            />
          </Tooltip>
          <Dropdown 
            menu={{ items: menuItems }} 
            trigger={['click']}
            onOpenChange={(open) => {
              // 阻止点击下拉菜单时选中节点
              if (open) {
                // 可以在这里添加其他逻辑
              }
            }}
          >
            <Button 
              type="text" 
              size="small" 
              icon={<MoreOutlined />}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="nodrag"
            />
          </Dropdown>
        </Space>
      </BaseNodeHeader>
      <BaseNodeContent>
        {/* 输入端口 */}
        {inputs.length > 0 && (
          <div style={{ marginBottom: outputs.length > 0 ? 8 : 0 }}>
            {inputs.map((input: any, idx: number) => (
              <div 
                key={idx} 
                style={{ 
                  position: 'relative', 
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 20,
                }}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.name || `input_${idx}`}
                  style={{
                    width: 12,
                    height: 12,
                    border: '2px solid #fff',
                    backgroundColor: '#1890ff',
                  }}
                />
                <Tooltip 
                  title={input.description || input.type || ''}
                  placement="right"
                >
                  <div style={{ 
                    fontSize: 12, 
                    marginLeft: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flex: 1,
                  }}>
                    <span style={{ fontWeight: input.required ? 500 : 400 }}>
                      {input.name || `Input ${idx + 1}`}
                    </span>
                    {input.required && (
                      <span style={{ color: '#ff4d4f', fontSize: 10 }}>*</span>
                    )}
                    {input.type && (
                      <Tag 
                        style={{ 
                          margin: 0, 
                          fontSize: 10, 
                          padding: '0 4px',
                          lineHeight: '16px',
                        }}
                      >
                        {input.type}
                      </Tag>
                    )}
                  </div>
                </Tooltip>
              </div>
            ))}
          </div>
        )}

        {/* 输出端口 */}
        {outputs.length > 0 && (
          <div>
            {outputs.map((output: any, idx: number) => (
              <div 
                key={idx} 
                style={{ 
                  position: 'relative', 
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: 20,
                }}
              >
                <Tooltip 
                  title={output.description || output.type || ''}
                  placement="left"
                >
                  <div style={{ 
                    fontSize: 12, 
                    marginRight: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flex: 1,
                    justifyContent: 'flex-end',
                  }}>
                    {output.type && (
                      <Tag 
                        style={{ 
                          margin: 0, 
                          fontSize: 10, 
                          padding: '0 4px',
                          lineHeight: '16px',
                        }}
                      >
                        {output.type}
                      </Tag>
                    )}
                    <span style={{ fontWeight: 500 }}>
                      {output.name || `Output ${idx + 1}`}
                    </span>
                  </div>
                </Tooltip>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.name || `output_${idx}`}
                  style={{
                    width: 12,
                    height: 12,
                    border: '2px solid #fff',
                    backgroundColor: '#52c41a',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {inputs.length === 0 && outputs.length === 0 && (
          <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '8px 0' }}>
            无端口
          </div>
        )}

        {/* 内联配置面板 */}
        {operator && hasOperatorParams() && (
          <InlineNodeConfig
            operator={operator}
            config={nodeData.config}
            onConfigChange={handleConfigChange}
          />
        )}

        {/* 数据可视化容器 - 渲染在用户配置下方 */}
        {operator && operator.dataVisualization && (
          <DataVisualizationContainer
            nodeId={id as string}
            operator={operator}
            workflowId={nodeData.workflowId}
            config={nodeData.config}
            nodeInputData={nodeData.nodeInputData}
          />
        )}
      </BaseNodeContent>
    </BaseNode>
    </NodeStatusIndicator>
    </>
  );
};

export default CustomNode;


import React, { useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  MarkerType,
  ControlButton,
  useReactFlow
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import CustomNode from './CustomNode';
import type { Workflow, WorkflowNode, WorkflowConnection, Operator } from '../../types';

interface CustomNodeData {
  label?: string;
  operator?: Operator;
  config?: any;
  nodeType?: string;
  onConfigChange?: (nodeId: string, config: any) => void;
}

interface CanvasProps {
  workflow: Workflow;
  operators: Operator[];
  onNodesChange: (nodes: WorkflowNode[], isConfigChange?: boolean) => void;
  onConnectionsChange: (connections: WorkflowConnection[]) => void;
  onExecutionResult?: (nodeId: string, result: {
    success: boolean;
    data?: any;
    error?: string;
    operatorId?: string;
    operatorType?: string;
    operatorName?: string;
  }) => void;
  onSelectionChange?: (selectedNodeIds: string[], selectedEdgeIds: string[]) => void;
  executionResults?: Map<string, {
    success: boolean;
    data?: any;
    error?: string;
    operatorId?: string;
    operatorType?: string;
    operatorName?: string;
    timestamp?: string;
  }>;
  nodeInputDataMap?: Map<string, Record<string, any>>;
  showMiniMap?: boolean;
}

export interface CanvasRef {
  calculateBottomRightPosition: () => { x: number; y: number };
  calculateNewNodePosition: (selectedNodeIds: string[]) => { x: number; y: number };
}

const nodeTypes: NodeTypes = {
  custom: CustomNode as any,
};

// 内部组件：用于访问 ReactFlow 实例
const CanvasInner: React.FC<{
  children: React.ReactNode;
  onReady?: (ref: CanvasRef) => void;
}> = ({ children, onReady }) => {
  const { getViewport, screenToFlowPosition, getNodes } = useReactFlow();
  
  const calculateNewNodePosition = useCallback((selectedNodeIds: string[]): { x: number; y: number } => {
    const nodes = getNodes();
    
    // 1. 空画布，新节点位置在窗口左上（50px, 50px）
    if (!nodes || nodes.length === 0) {
      const flowPosition = screenToFlowPosition({ x: 50, y: 50 });
      return flowPosition;
    }
    
    // 2. 如果有选中节点，新节点位置在选中节点右边 80px
    if (selectedNodeIds && selectedNodeIds.length > 0) {
      const selectedNode = nodes.find(n => selectedNodeIds.includes(n.id));
      if (selectedNode) {
        const nodeWidth = (selectedNode.style?.width as number) || 200;
        return {
          x: selectedNode.position.x + nodeWidth + 80,
          y: selectedNode.position.y,
        };
      }
    }
    
    // 3. 窗口中心点的右下（50px, 50px）
    const container = document.querySelector('.react-flow') as HTMLElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const screenX = centerX + 50;
      const screenY = centerY + 50;
      const flowPosition = screenToFlowPosition({ x: screenX, y: screenY });
      return flowPosition;
    }
    
    // 降级方案：使用视口中心
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = viewportWidth / 2 + 50;
    const centerY = viewportHeight / 2 + 50;
    return screenToFlowPosition({ x: centerX, y: centerY });
  }, [screenToFlowPosition, getNodes]);
  
  const calculateBottomRightPosition = useCallback((): { x: number; y: number } => {
    const viewport = getViewport();
    const container = document.querySelector('.react-flow') as HTMLElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const marginX = 50;
      const marginY = 50;
      const screenX = rect.width - marginX;
      const screenY = rect.height - marginY;
      return screenToFlowPosition({ x: screenX, y: screenY });
    }
    
    // 降级方案
    const nodeWidth = 200;
    const nodeHeight = 150;
    const marginX = 50;
    const marginY = 50;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const flowX = viewport.x + (viewportWidth / viewport.zoom) - nodeWidth - marginX;
    const flowY = viewport.y + (viewportHeight / viewport.zoom) - nodeHeight - marginY;
    return { x: flowX, y: flowY };
  }, [getViewport, screenToFlowPosition]);
  
  const calculateBottomRightPositionRef = useRef(calculateBottomRightPosition);
  const calculateNewNodePositionRef = useRef(calculateNewNodePosition);
  
  calculateBottomRightPositionRef.current = calculateBottomRightPosition;
  calculateNewNodePositionRef.current = calculateNewNodePosition;
  
  React.useEffect(() => {
    if (onReady) {
      onReady({
        calculateBottomRightPosition: () => calculateBottomRightPositionRef.current(),
        calculateNewNodePosition: (selectedNodeIds: string[]) => calculateNewNodePositionRef.current(selectedNodeIds),
      });
    }
  }, [onReady]);
  
  return <>{children}</>;
};

const Canvas = forwardRef<CanvasRef, CanvasProps>(function ({
  showMiniMap = true,
  workflow,
  operators,
  onNodesChange,
  onConnectionsChange,
  onExecutionResult,
  onSelectionChange,
  executionResults = new Map(),
  nodeInputDataMap = new Map(),
}, ref) {
  const canvasRef = useRef<CanvasRef | null>(null);

  // 使用 ref 存储最新的值，避免闭包问题
  const executionResultsRef = useRef(executionResults);
  const nodeInputDataMapRef = useRef(nodeInputDataMap);
  const onNodesChangeRef = useRef(onNodesChange);
  const onConnectionsChangeRef = useRef(onConnectionsChange);
  const workflowRef = useRef(workflow);
  const operatorsRef = useRef(operators);
  
  useEffect(() => {
    executionResultsRef.current = executionResults;
  }, [executionResults]);
  
  useEffect(() => {
    nodeInputDataMapRef.current = nodeInputDataMap;
  }, [nodeInputDataMap]);
  
  useEffect(() => {
    onNodesChangeRef.current = onNodesChange;
  }, [onNodesChange]);
  
  useEffect(() => {
    onConnectionsChangeRef.current = onConnectionsChange;
  }, [onConnectionsChange]);
  
  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow]);
  
  useEffect(() => {
    operatorsRef.current = operators;
  }, [operators]);

  // 暴露 ref 方法
  useImperativeHandle(ref, () => ({
    calculateBottomRightPosition: () => {
      if (canvasRef.current) {
        return canvasRef.current.calculateBottomRightPosition();
      }
      return { x: 800, y: 600 };
    },
    calculateNewNodePosition: (selectedNodeIds: string[]) => {
      if (canvasRef.current) {
        return canvasRef.current.calculateNewNodePosition(selectedNodeIds);
      }
      return { x: 50, y: 50 };
    },
  }), []);

  // 默认 edge 样式
  const defaultEdgeStyle = useMemo(() => ({
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 10,
      color: '#b37feb',
    },
    style: {
      strokeWidth: 3,
      stroke: '#b37feb',
    },
  }), []);

  // 初始化节点和边
  const initialNodes: Node[] = useMemo(() => {
    return (workflow.nodes || []).map((node: WorkflowNode) => {
      const operator = operators.find(op => op.id === node.operatorId);
      
      let nodeStyle: React.CSSProperties | undefined;
      if (operator?.dataVisualization) {
        try {
          const dataVizConfig = typeof operator.dataVisualization === 'string'
            ? JSON.parse(operator.dataVisualization)
            : operator.dataVisualization;
          
          const nodeConfigSize = node.config?.dataVisualizationSize;
          const size = nodeConfigSize || dataVizConfig?.size;
          
          if (size) {
            const width = typeof size.width === 'number' ? size.width : 
                         (size.width === '100%' || size.width === 'auto' ? undefined : parseInt(String(size.width)) || undefined);
            const height = typeof size.height === 'number' ? size.height : parseInt(String(size.height)) || undefined;
            
            if (width !== undefined || height !== undefined) {
              nodeStyle = { width, height };
            }
          }
        } catch (e) {
          // 解析失败，忽略
        }
      }
      
      return {
        id: node.id,
        type: 'custom',
        position: {
          x: node.positionX || 0,
          y: node.positionY || 0,
        },
        style: nodeStyle,
        data: {
          label: operator?.name || node.operatorId,
          operator,
          config: node.config || {},
          nodeType: node.nodeType,
          executionResults: executionResultsRef.current,
          connections: workflow.connections || [],
        },
      };
    });
  }, [workflow.nodes, workflow.connections, operators]);

  const initialEdges: Edge[] = useMemo(() => {
    return (workflow.connections || []).map((conn: WorkflowConnection) => ({
      id: conn.id,
      source: conn.from.node,
      target: conn.to.node,
      sourceHandle: conn.from.port,
      targetHandle: conn.to.port,
      ...defaultEdgeStyle,
    }));
  }, [workflow.connections, defaultEdgeStyle]);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // 使用 ref 跟踪状态，避免循环更新
  const isExternalUpdateRef = useRef(false);
  const isResizingRef = useRef(false);
  const lastWorkflowNodesStrRef = useRef<string>('');
  const lastWorkflowConnectionsStrRef = useRef<string>('');
  const lastOperatorsStrRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算稳定的依赖项：使用节点和连接的数量和关键字段
  const workflowNodesHash = useMemo(() => {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return '[]';
    }
    return JSON.stringify(workflow.nodes.map(n => ({
      id: n.id,
      operatorId: n.operatorId,
      positionX: n.positionX,
      positionY: n.positionY,
      config: n.config,
    })));
  }, [workflow.nodes]);

  const workflowConnectionsHash = useMemo(() => {
    if (!workflow.connections || workflow.connections.length === 0) {
      return '[]';
    }
    return JSON.stringify(workflow.connections.map(c => ({
      id: c.id,
      from: c.from,
      to: c.to,
    })));
  }, [workflow.connections]);

  const operatorsHash = useMemo(() => {
    return JSON.stringify(operators.map(op => ({
      id: op.id,
      name: op.name,
      operatorParams: op.operatorParams,
      dataVisualization: op.dataVisualization,
    })));
  }, [operators]);

  // 从外部 workflow 同步到内部 nodes/edges（带防抖和空画布优化）
  useEffect(() => {
    // 清除之前的定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // 防抖处理
    updateTimeoutRef.current = setTimeout(() => {
      const currentWorkflow = workflowRef.current;
      const currentOperators = operatorsRef.current;
      
      const workflowNodesStr = workflowNodesHash;
      const workflowConnectionsStr = workflowConnectionsHash;
      const operatorsStr = operatorsHash;
      
      // 快速空画布检测
      const isEmptyCanvas = workflowNodesStr === '[]';
      const wasEmptyCanvas = lastWorkflowNodesStrRef.current === '[]';
      
      // 空画布稳定状态：如果当前和上次都是空画布，完全跳过
      if (isEmptyCanvas && wasEmptyCanvas) {
        // 只更新ref记录，不执行任何setState
        if (workflowNodesStr !== lastWorkflowNodesStrRef.current) {
          lastWorkflowNodesStrRef.current = workflowNodesStr;
        }
        if (workflowConnectionsStr !== lastWorkflowConnectionsStrRef.current) {
          lastWorkflowConnectionsStrRef.current = workflowConnectionsStr;
        }
        if (operatorsStr !== lastOperatorsStrRef.current) {
          lastOperatorsStrRef.current = operatorsStr;
        }
        return;
      }
      
      // 检查是否有实际变化
      const hasWorkflowChanged = 
        workflowNodesStr !== lastWorkflowNodesStrRef.current ||
        workflowConnectionsStr !== lastWorkflowConnectionsStrRef.current;
      const hasOperatorsChanged = operatorsStr !== lastOperatorsStrRef.current;
      
      // 如果没有变化，跳过
      if (!hasWorkflowChanged && !hasOperatorsChanged) {
        return;
      }
      
      // 标记为外部更新，避免触发同步循环
      isExternalUpdateRef.current = true;
      
      // 更新ref记录
      lastWorkflowNodesStrRef.current = workflowNodesStr;
      lastWorkflowConnectionsStrRef.current = workflowConnectionsStr;
      lastOperatorsStrRef.current = operatorsStr;
      
      // 空画布的特殊处理
      if (isEmptyCanvas) {
        // 只在当前节点/边状态不是空时才更新
        const currentNodesEmpty = nodes.length === 0;
        const currentEdgesEmpty = edges.length === 0;
        
        if (!currentNodesEmpty) {
          setNodes([]);
        }
        if (!currentEdgesEmpty) {
          setEdges([]);
        }
      } else {
        // 非空画布的正常更新逻辑
        const newNodes: Node[] = (currentWorkflow.nodes || []).map((node: WorkflowNode) => {
          const operator = currentOperators.find(op => op.id === node.operatorId);
          
          let nodeStyle: React.CSSProperties | undefined;
          if (operator?.dataVisualization) {
            try {
              const dataVizConfig = typeof operator.dataVisualization === 'string'
                ? JSON.parse(operator.dataVisualization)
                : operator.dataVisualization;
              
              const nodeConfigSize = node.config?.dataVisualizationSize;
              const size = nodeConfigSize || dataVizConfig?.size;
              
              if (size) {
                const width = typeof size.width === 'number' ? size.width : 
                             (size.width === '100%' || size.width === 'auto' ? undefined : parseInt(String(size.width)) || undefined);
                const height = typeof size.height === 'number' ? size.height : parseInt(String(size.height)) || undefined;
                
                if (width !== undefined || height !== undefined) {
                  nodeStyle = { width, height };
                }
              }
            } catch (e) {
              // 解析失败，忽略
            }
          }
          
          return {
            id: node.id,
            type: 'custom',
            position: {
              x: node.positionX || 0,
              y: node.positionY || 0,
            },
            style: nodeStyle,
            data: {
              label: operator?.name || node.operatorId,
              operator,
              config: node.config || {},
              nodeType: node.nodeType,
              executionResults: executionResultsRef.current,
              connections: currentWorkflow.connections || [],
              nodeInputData: nodeInputDataMapRef.current.get(node.id),
            },
          };
        });
        
        setNodes(newNodes);

        const newEdges: Edge[] = (currentWorkflow.connections || []).map((conn: WorkflowConnection) => ({
          id: conn.id,
          source: conn.from.node,
          target: conn.to.node,
          sourceHandle: conn.from.port,
          targetHandle: conn.to.port,
          ...defaultEdgeStyle,
        }));
        
        setEdges(newEdges);
      }
      
      // 延迟重置外部更新标志
      setTimeout(() => {
        isExternalUpdateRef.current = false;
      }, 200);
    }, 100); // 100ms 防抖
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [workflowNodesHash, workflowConnectionsHash, operatorsHash, nodes.length, edges.length, setNodes, setEdges, defaultEdgeStyle]);

  // 同步节点变化到父组件（仅在用户操作时）
  useEffect(() => {
    // 如果是外部更新或正在 resize，不触发回调
    if (isExternalUpdateRef.current || isResizingRef.current) {
      return;
    }

    // 空画布的特殊处理
    const isEmptyCanvas = nodes.length === 0;
    const wasEmptyCanvas = lastWorkflowNodesStrRef.current === '[]';
    
    if (isEmptyCanvas && wasEmptyCanvas) {
      // 空画布且之前也是空画布，完全跳过
      return;
    }

    const workflowNodes: WorkflowNode[] = nodes.map(node => {
      const nodeData = node.data as CustomNodeData;
      return {
        id: node.id,
        operatorId: nodeData.operator?.id || '',
        operatorType: nodeData.operator?.operatorType,
        nodeType: nodeData.nodeType,
        config: nodeData.config || {},
        positionX: node.position.x,
        positionY: node.position.y,
      };
    });
    
    const nodesStr = JSON.stringify(workflowNodes);
    
    if (nodesStr !== lastWorkflowNodesStrRef.current) {
      onNodesChangeRef.current(workflowNodes, false);
      lastWorkflowNodesStrRef.current = nodesStr;
    }
  }, [nodes]);

  // 同步连接变化到父组件（仅在用户操作时）
  useEffect(() => {
    // 如果是外部更新，不触发回调
    if (isExternalUpdateRef.current) {
      return;
    }

    const workflowConnections: WorkflowConnection[] = edges.map(edge => ({
      id: edge.id,
      from: {
        node: edge.source,
        port: edge.sourceHandle || 'output',
      },
      to: {
        node: edge.target,
        port: edge.targetHandle || 'input',
      },
    }));
    
    const connectionsStr = JSON.stringify(workflowConnections);
    if (connectionsStr !== lastWorkflowConnectionsStrRef.current) {
      onConnectionsChangeRef.current(workflowConnections);
      lastWorkflowConnectionsStrRef.current = connectionsStr;
    }
  }, [edges]);

  // 处理连接创建
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const newEdge: Edge = {
        id: `edge_${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        ...defaultEdgeStyle,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, defaultEdgeStyle]
  );

  // 处理节点删除
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedNodeIds = new Set(deleted.map((d) => d.id));
      setNodes((nds) => nds.filter((node) => !deletedNodeIds.has(node.id)));
      setEdges((eds) => 
        eds.filter((edge) => 
          !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)
        )
      );
    },
    [setNodes, setEdges]
  );

  // 处理边删除
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      setEdges((eds) => eds.filter((edge) => !deleted.find((d) => d.id === edge.id)));
    },
    [setEdges]
  );

  // 处理节点配置更新（使用 useCallback，依赖项尽可能少）
  const handleNodeConfigChange = useCallback(
    (nodeId: string, config: any) => {
      const isResizeUpdate = config?.dataVisualizationSize !== undefined;

      if (isResizeUpdate) {
        isResizingRef.current = true;
      }

      setNodes((nds) => {
        const updatedNodes = nds.map((node) => {
          if (node.id === nodeId) {
            const nodeData = node.data as CustomNodeData;
            return {
              ...node,
              data: {
                ...nodeData,
                config,
              },
            };
          }
          return node;
        });

        const workflowNodes: WorkflowNode[] = updatedNodes.map(node => {
          const nodeData = node.data as CustomNodeData;
          return {
            id: node.id,
            operatorId: nodeData.operator?.id || '',
            operatorType: nodeData.operator?.operatorType,
            nodeType: nodeData.nodeType,
            config: nodeData.config || {},
            positionX: node.position.x,
            positionY: node.position.y,
          };
        });

        isExternalUpdateRef.current = true;
        requestAnimationFrame(() => {
          onNodesChangeRef.current(workflowNodes, true);
          setTimeout(() => {
            isExternalUpdateRef.current = false;
            if (isResizeUpdate) {
              isResizingRef.current = false;
            }
          }, 200);
        });

        return updatedNodes;
      });
    },
    [setNodes]
  );

  // 更新节点数据，添加配置更新回调和执行结果回调（添加所有依赖）
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        workflowId: workflow.id,
        onConfigChange: handleNodeConfigChange,
        onExecutionResult,
        executionResults: executionResultsRef.current,
        connections: workflow.connections || [],
        nodeInputData: nodeInputDataMapRef.current.get(node.id),
      },
    }));
  }, [nodes, workflow.id, workflow.connections, handleNodeConfigChange, onExecutionResult]);

  // 处理选中状态变化
  const onSelectionChangeInternal = useCallback(
    (params: { nodes: Node[]; edges: Edge[] }) => {
      if (onSelectionChange) {
        const selectedNodeIds = params.nodes.map((n) => n.id);
        const selectedEdgeIds = params.edges.map((e) => e.id);
        onSelectionChange(selectedNodeIds, selectedEdgeIds);
      }
    },
    [onSelectionChange]
  );

  // 处理画布点击（取消选中）
  const onPaneClick = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange([], []);
    }
  }, [onSelectionChange]);

  // 画布截图：截取当前视口并下载为 PNG
  const handleDownloadImage = useCallback((e: React.MouseEvent) => {
    const flowEl = (e.currentTarget as HTMLElement).closest('.react-flow') as HTMLElement;
    if (!flowEl) return;
    toPng(flowEl, {
      backgroundColor: '#1a1a1a',
      pixelRatio: 2,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `workflow-${workflow.name || workflow.id || 'canvas'}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('画布截图失败:', err));
  }, [workflow.id, workflow.name]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChangeInternal}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        colorMode='dark'
        defaultEdgeOptions={defaultEdgeStyle}
      >
        <CanvasInner onReady={(ref) => { canvasRef.current = ref; }}>
          <Background />
          <Controls position='top-left'>
            <ControlButton onClick={handleDownloadImage} title="画布截图">
              截图
            </ControlButton>
          </Controls>
          {showMiniMap && <MiniMap />}
        </CanvasInner>
      </ReactFlow>
    </div>
  );
});

export default Canvas;

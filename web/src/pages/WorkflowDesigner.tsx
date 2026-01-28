import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, Space, message, Modal, Form, Input, Tag, Tooltip, Splitter } from 'antd';
import AIChatPanel from '../components/workflow/AIChatPanel';

import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';


import { 
  BiSolidDockBottom,
  BiSolidHot,
  BiSolidSave,
  BiSolidDockRight,
  BiSolidPlusCircle,
  BiUndo,
  BiRedo,
  BiTrash,
  BiWrench,
} from "react-icons/bi";

import { IoChevronBackOutline } from "react-icons/io5";

import { api } from '../services/api';
import type { Workflow, WorkflowNode, WorkflowConnection, Operator } from '../types';
import Canvas, { type CanvasRef } from '../components/workflow/Canvas';
import DebugConsole from '../components/workflow/DebugConsole';
// import ValidationPanel from '../components/workflow/ValidationPanel';
import AddNodeModal from '../components/workflow/AddNodeModal';
import SettingsPanel, { loadSettings, type WorkflowDesignerSettings } from '../components/workflow/SettingsPanel';
import { SSEClient } from '../utils/sseClient';
import { generateWorkflowDetailPrompt, generateWorkflowDetailPromptSimple } from '../AI/workflow/workflowUtils';
import { useWorkflowCheckpoint } from '../hooks/useWorkflowCheckpoint';
import { OperationPriority } from '../utils/workflowCheckpoint';
import { DataVisualizationMonitor } from '../utils/DataVisualizationMonitor';
import { DataVisualizationProvider } from '../contexts/DataVisualizationContext';

const WorkflowDesigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 从 localStorage 读取默认设置
  const initialSettings = loadSettings();
  const [debugMode, setDebugMode] = useState(initialSettings.defaultOpenDebugPanel);
  const [showAIPanel, setShowAIPanel] = useState(initialSettings.defaultOpenAIPanel);
  const [showMiniMap, setShowMiniMap] = useState(initialSettings.showMiniMap);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditWorkflowModal, setShowEditWorkflowModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [form] = Form.useForm();
  const [executionResults, setExecutionResults] = useState<Map<string, any>>(new Map());
  const [nodeInputDataMap, setNodeInputDataMap] = useState<Map<string, Record<string, any>>>(new Map());
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  
  // 创建 DataVisualizationMonitor 实例（全局单例）
  const dataVizMonitorRef = useRef<DataVisualizationMonitor | null>(null);
  if (!dataVizMonitorRef.current) {
    dataVizMonitorRef.current = new DataVisualizationMonitor();
  }
  const dataVizMonitor = dataVizMonitorRef.current;
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [aiInputValue, setAiInputValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState(false);
  const canvasRef = useRef<CanvasRef>(null); // Canvas ref，用于计算节点位置
  
  // Checkpoint版本管理
  const {
    versionHistory,
    canUndo,
    canRedo,
    initialize: initializeCheckpoint,
    createCheckpoint,
    undo: handleUndo,
    redo: handleRedo,
    setBaseline: setCheckpointBaseline,
    getUndoDescription,
    getRedoDescription,
    hasUnsavedChanges,
    flushPendingCheckpoints,
    updatePreviousWorkflow,
  } = useWorkflowCheckpoint(id);

  useEffect(() => {
    if (id) {
      loadWorkflow();
    } else {
      // 新建工作流
      // 清空之前的可视化节点注册
      dataVizMonitor.clear();
      const newWorkflow = {
        name: '新工作流',
        nodes: [],
        connections: [],
      };
      console.log('🆕 创建新工作流对象:', newWorkflow);
      setWorkflow(newWorkflow);
    }
    loadOperators();
  }, [id]);

  // 将 workflow_id 绑定到 window，供 AI 和系统使用
  // 使用 ref 来存储当前 workflow_id，避免依赖不稳定的 workflow 对象
  const currentWorkflowIdRef = useRef<string | undefined>(undefined);

  // 绑定 workflow_id 到 window，供 AI 和系统使用（正确依赖，避免无限循环）
  useEffect(() => {
    const newWorkflowId = workflow?.id || id;
    if (newWorkflowId !== currentWorkflowIdRef.current) {
      currentWorkflowIdRef.current = newWorkflowId;
      if (newWorkflowId) {
        (window as any).workflow_id = newWorkflowId;
        console.log('✅ workflow_id 已绑定到 window.workflow_id:', newWorkflowId);
      } else {
        delete (window as any).workflow_id;
      }
    }
    // 清理函数：组件卸载时清除
    return () => {
      delete (window as any).workflow_id;
    };
  }, [workflow?.id, id]);

  // 优化：operators 的 id 映射，避免频繁 operators.find
  const operatorsMap = useMemo(() => {
    const map: Record<string, Operator> = {};
    operators.forEach(op => {
      map[op.id] = op;
    });
    return map;
  }, [operators]);

  // 暴露控制台测试函数
  useEffect(() => {
    // 只在工作流设计页面暴露这些函数
    (window as any).generateWorkflowPromptFull = () => {
      if (!workflow) {
        console.error('❌ 当前没有工作流数据');
        return null;
      }

      const prompt = generateWorkflowDetailPrompt(workflow, operatorsMap);
      console.log('========================================');
      console.log('  完整工作流提示词');
      console.log('========================================\n');
      console.log(prompt);
      console.log('\n========================================\n');
      return prompt;
    };

    (window as any).generateWorkflowPromptSimple = () => {
      if (!workflow) {
        console.error('❌ 当前没有工作流数据');
        return null;
      }

      const prompt = generateWorkflowDetailPromptSimple(workflow);
      console.log('========================================');
      console.log('  简化工作流提示词');
      console.log('========================================\n');
      console.log(prompt);
      console.log('\n========================================\n');
      return prompt;
    };

    // 清理函数
    return () => {
      delete (window as any).generateWorkflowPromptFull;
      delete (window as any).generateWorkflowPromptSimple;
    };
  }, [workflow, operatorsMap]);

  const loadWorkflow = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 清空之前的可视化节点注册
      dataVizMonitor.clear();
      
      const data = await api.getWorkflow(id);
      console.log('📥 从API加载工作流:', data.id, data.name);
      setWorkflow(data);
      
      // 初始化checkpoint系统
      await initializeCheckpoint(data);
      updatePreviousWorkflow(data);
    } catch (error: any) {
      messageApi.error(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadOperators = async () => {
    try {
      const data = await api.listOperators();
      setOperators(data);
    } catch (error: any) {
      messageApi.error(`加载算子列表失败: ${error.message}`);
    }
  };

  // 清理节点配置中的文件对象，只保留资源ID
  const cleanNodeConfig = (config: any, operator?: Operator): any => {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const cleanedConfig: any = {};
    const operatorParams = operator?.operatorParams;
    
    if (operatorParams) {
      const params = Array.isArray(operatorParams)
        ? operatorParams
        : typeof operatorParams === 'object'
          ? Object.values(operatorParams)
          : [];

      for (const param of params) {
        const paramName = param.name;
        const paramValue = config[paramName];

        // 如果参数是文件类型
        if (param.ui?.component === 'file' || param.ui?.component === 'fileInput') {
          // 如果值是字符串且以 res_ 开头，保留它（资源ID）
          if (typeof paramValue === 'string' && paramValue.startsWith('res_')) {
            cleanedConfig[paramName] = paramValue;
          } 
          // 如果是上传中的临时值，清理它（设置为 undefined）
          else if (paramValue === '__uploading__') {
            cleanedConfig[paramName] = undefined;
          }
          // 如果值是文件对象，清理它（设置为 undefined）
          else if (paramValue && typeof paramValue === 'object') {
            cleanedConfig[paramName] = undefined;
          } 
          // 其他情况保留原值
          else {
            cleanedConfig[paramName] = paramValue;
          }
        } else {
          // 其他参数直接复制
          cleanedConfig[paramName] = paramValue;
        }
      }

      // 复制其他不在 operatorParams 中的配置项
      for (const key in config) {
        if (!cleanedConfig.hasOwnProperty(key)) {
          cleanedConfig[key] = config[key];
        }
      }
    } else {
      // 如果没有 operatorParams，直接返回配置
      return config;
    }

    return cleanedConfig;
  };

  const handleSave = async () => {
    console.log('WorkflowDesigner: 开始保存工作流');
    
    if (!workflow) {
      console.log('WorkflowDesigner: 工作流为空，跳过保存');
      return;
    }
    
    // 刷新待处理的checkpoint
    flushPendingCheckpoints();
    
    setSaving(true);
    try {
      // 清理节点配置中的文件对象
      const cleanedWorkflow = {
        ...workflow,
        nodes: workflow.nodes?.map(node => {
          const operator = operatorsMap[node.operatorId];
          return {
            ...node,
            config: cleanNodeConfig(node.config, operator),
          };
        }),
      };

      console.log('WorkflowDesigner: 清理后的工作流', cleanedWorkflow);

      let savedWorkflow: Workflow;
      if (workflow.id) {
        console.log('WorkflowDesigner: 调用 updateWorkflow API');
        savedWorkflow = await api.updateWorkflow(workflow.id, cleanedWorkflow);
        messageApi.success('工作流已保存');
      } else {
        console.log('WorkflowDesigner: 调用 createWorkflow API');
        const created = await api.createWorkflow(cleanedWorkflow);
        savedWorkflow = created;
        setWorkflow(created);
        navigate(`/workflows/${created.id}`, { replace: true });
        messageApi.success('工作流已创建');
      }
      
      // 设置基线checkpoint
      if (versionHistory) {
        // 创建新的基线checkpoint
        const baselineCheckpoint = versionHistory.createCheckpoint(
          {},
          'USER',
          'BASELINE',
          { description: '保存后的基线版本' }
        );
        baselineCheckpoint.isBaseline = true;
        setCheckpointBaseline(baselineCheckpoint);
        updatePreviousWorkflow(savedWorkflow);
      }
      
      console.log('WorkflowDesigner: 工作流保存完成');
    } catch (error: any) {
      console.error('WorkflowDesigner: 保存失败', error.message);
      messageApi.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!workflow || !workflow.id) {
      messageApi.warning('请先保存工作流');
      return;
    }
    try {
      const result = await api.validateWorkflow(workflow.id);
      setValidationResult(result);
      if (result.isComplete) {
        messageApi.success('工作流验证通过');
      } else {
        messageApi.warning(`发现 ${result.issues.length} 个问题`);
      }
    } catch (error: any) {
      messageApi.error(`验证失败: ${error.message}`);
    }
  };

  const handleDeploy = async () => {
    if (!workflow || !workflow.id) {
      messageApi.warning('请先保存工作流');
      return;
    }
    // 先验证
    try {
      const result = await api.validateWorkflow(workflow.id);
      if (!result.isComplete) {
        Modal.warning({
          title: '工作流验证失败',
          content: `发现 ${result.issues.length} 个问题，请先修复后再部署`,
        });
        return;
      }
      // 创建执行任务
      const execution = await api.createExecution(workflow.id);
      messageApi.success('工作流已部署为执行任务');
      navigate(`/executions/${execution.id}`);
    } catch (error: any) {
      messageApi.error(`部署失败: ${error.message}`);
    }
  };

  // 使用 ref 存储最新的 workflow 和 operators，避免闭包问题
  const workflowRef = useRef<Workflow | null>(null);
  const operatorsRef = useRef<Operator[]>([]);
  
  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow]);
  
  useEffect(() => {
    operatorsRef.current = operators;
  }, [operators]);

  // 使用SSE连接接收执行结果
  const connectExecutionSSE = (sessionId: string) => {
    const sseClient = new SSEClient(sessionId, {
      onNodeStatus: (nodeId: string, status: string) => {
        // 可以在这里更新节点状态（如果需要）
        console.log(`节点 ${nodeId} 状态更新: ${status}`);
      },
      onNodeInputUpdate: (nodeId: string, inputData: Record<string, any>, updateType: 'full' | 'incremental') => {
        // 接收节点输入数据更新（上游节点的输出数据）
        console.log(`[onNodeInputUpdate] 节点 ${nodeId} 输入数据更新 (${updateType}):`, {
          hasData: Object.keys(inputData).length > 0,
          dataKeys: Object.keys(inputData),
          dataSize: JSON.stringify(inputData).length,
          dataPreview: JSON.stringify(inputData).substring(0, 200)
        });
        
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
        // 注意：这里推送的是最新的 inputData，即使 iframe 还没 ready，也会在 ready 后通过 Monitor 推送
        console.log(`[onNodeInputUpdate] 准备通过 Monitor 推送数据到节点 ${nodeId}`);
        dataVizMonitor.pushDataToNode(nodeId, inputData, updateType);
      },
      onNodeResult: (nodeId: string, result: {
        success: boolean;
        outputData?: any;
        error?: string;
        duration?: number;
        status: string;
      }) => {
        // 处理单个节点的执行结果
        // 使用 ref 获取最新的值，避免闭包问题
        const currentWorkflow = workflowRef.current;
        const currentOperators = operatorsRef.current;
        const node = currentWorkflow?.nodes?.find(n => n.id === nodeId);
        const operator = currentOperators.find(op => op.id === node?.operatorId);
        
        console.log(`[onNodeResult] 节点 ${nodeId}:`, {
          nodeId,
          operatorId: node?.operatorId,
          operatorName: operator?.name,
          foundOperator: !!operator
        });
        
        handleExecutionResult(nodeId, {
          success: result.success,
          data: result.outputData,
          error: result.error,
          operatorId: operator?.id,
          operatorType: operator?.operatorType,
          operatorName: operator?.name,
        });
      },
      onSessionComplete: (results: Record<string, any>) => {
        // 所有节点执行完成，results包含所有节点的结果
        console.log('工作流执行完成，所有节点结果:', results);
        messageApi.success('工作流执行完成');
        setExecutingWorkflow(false);
        
        // 使用 ref 获取最新的值，避免闭包问题
        const currentWorkflow = workflowRef.current;
        const currentOperators = operatorsRef.current;
        
        // 处理所有节点的结果
        Object.entries(results).forEach(([nodeId, result]: [string, any]) => {
          const node = currentWorkflow?.nodes?.find(n => n.id === nodeId);
          const operator = currentOperators.find(op => op.id === node?.operatorId);
          
          console.log(`[onSessionComplete] 节点 ${nodeId}:`, {
            nodeId,
            operatorId: node?.operatorId,
            operatorName: operator?.name,
            foundOperator: !!operator
          });
          
          handleExecutionResult(nodeId, {
            success: result.success,
            data: result.outputData,
            error: result.error,
            operatorId: operator?.id,
            operatorType: operator?.operatorType,
            operatorName: operator?.name,
          });
        });
      },
      onError: (error: string) => {
        console.error('SSE连接错误:', error);
        messageApi.error(`执行错误: ${error}`);
        setExecutingWorkflow(false);
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

  const handleExecuteFullWorkflow = async () => {
    if (!workflow || !workflow.id) {
      messageApi.warning('请先保存工作流');
      return;
    }

    setExecutingWorkflow(true);
    try {
      // 使用SSE模式执行
      const result = await api.executeFullWorkflowStream(workflow.id);
      if (result.success && result.sessionId) {
        messageApi.success('工作流执行已启动');
        // 连接SSE流接收实时结果
        connectExecutionSSE(result.sessionId);
      } else {
        setExecutingWorkflow(false);
      }
    } catch (error: any) {
      messageApi.error(`执行失败: ${error.message}`);
      setExecutingWorkflow(false);
    }
  };

  const handleAddNode = (operator: Operator) => {
    if (!workflow) return;
    
    // 计算节点位置（根据规则）
    let positionX = 50; // 默认值
    let positionY = 50; // 默认值
    
    if (canvasRef.current) {
      try {
        // 使用新的位置计算方法（Canvas 内部会获取当前节点和选中状态）
        const position = canvasRef.current.calculateNewNodePosition(selectedNodeIds);
        positionX = position.x;
        positionY = position.y;
      } catch (error) {
        console.warn('无法计算画布位置，使用默认值:', error);
      }
    }
    
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      operatorId: operator.id,
      operatorType: operator.operatorType, // 可选字段，纯前端可视化算子可能没有
      config: {},
      positionX,
      positionY,
    };
    const updatedWorkflow = {
      ...workflow,
      nodes: [...(workflow.nodes || []), newNode],
    };
    setWorkflow(updatedWorkflow);
    
    // 创建checkpoint（立即）
    createCheckpoint(
      updatedWorkflow,
      'USER',
      'USER_ADD_NODE',
      OperationPriority.IMMEDIATE,
      { description: `添加节点: ${operator.name}` }
    );

    // 自动保存（立即，添加节点很重要）
    autoSaveWorkflow(updatedWorkflow, true);
  };

  const handleAISend = async () => {
    if (!aiInputValue.trim()) return;

    const userMessage = aiInputValue.trim();
    setAiMessages([...aiMessages, { role: 'user', content: userMessage }]);
    setAiInputValue('');
    setAiLoading(true);

    // TODO: 调用AI API创建算子
    // 这里先模拟
    setTimeout(() => {
      const aiResponse = `我理解您想要创建一个算子。这是一个示例响应。\n\n实际实现需要：\n1. 调用AI API\n2. 生成算子配置\n3. 创建算子并添加到画布`;
      setAiMessages((prev) => [...prev, { role: 'ai', content: aiResponse }]);
      setAiLoading(false);
      messageApi.info('AI创建算子功能待实现');
    }, 1000);
  };

  const handleAIClear = () => {
    setAiMessages([]);
  };

  // 用户操作自动保存的防抖动定时器
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveWorkflowRef = useRef<Workflow | null>(null);

  // 使用 useCallback 包装 autoSaveWorkflow，并正确指定依赖
  const autoSaveWorkflow = useCallback(async (workflowToSave: Workflow, immediate = false) => {
    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // 保存待保存的工作流
    pendingSaveWorkflowRef.current = workflowToSave;

    const doSave = async () => {
      const workflowToSave = pendingSaveWorkflowRef.current;
      if (!workflowToSave || !workflowToSave.id) {
        return;
      }

      try {
        // 清理节点配置中的文件对象
        const cleanedWorkflow = {
          ...workflowToSave,
          nodes: workflowToSave.nodes?.map(node => {
            const operator = operatorsMap[node.operatorId];
            return {
              ...node,
              config: cleanNodeConfig(node.config, operator),
            };
          }),
        };

        await api.updateWorkflow(workflowToSave.id, cleanedWorkflow);
        console.log('✅ 用户操作后自动保存成功');
        // 不显示提示，避免打扰用户
        pendingSaveWorkflowRef.current = null;
      } catch (error: any) {
        console.error('❌ 用户操作后自动保存失败:', error);
        messageApi.error(`自动保存失败: ${error.message}`);
      }
    };

    if (immediate) {
      // 立即保存（失去焦点时）
      await doSave();
    } else {
      // 防抖动：2秒后保存
      autoSaveTimerRef.current = setTimeout(() => {
        doSave();
      }, 2000);
    }
  }, [operatorsMap, messageApi]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // 监听窗口失去焦点，立即保存待保存的工作流
  useEffect(() => {
    const handleWindowBlur = () => {
      if (pendingSaveWorkflowRef.current) {
        // 清除防抖动定时器
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
        // 立即保存
        autoSaveWorkflow(pendingSaveWorkflowRef.current, true);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [autoSaveWorkflow]);

  // 使用 useCallback 包装 handleUpdateNodes
  const handleUpdateNodes = useCallback((nodes: WorkflowNode[], isConfigChange = false) => {
    if (!workflow) return;

    // 检查 nodes 是否真的变化了（避免不必要的更新）
    const nodesStr = JSON.stringify(nodes);
    const currentNodesStr = JSON.stringify(workflow.nodes || []);
    if (nodesStr === currentNodesStr && !isConfigChange) {
      // 内容相同且不是配置变化，不需要更新
      return;
    }

    const updatedWorkflow = {
      ...workflow,
      nodes,
    };
    setWorkflow(updatedWorkflow);

    if (isConfigChange) {
      // 节点配置变化：创建checkpoint（短延迟防抖）
      createCheckpoint(
        updatedWorkflow,
        'USER',
        'USER_UPDATE_NODE_CONFIG',
        OperationPriority.SHORT_DEBOUNCE,
        { description: '更新节点配置' }
      );
      // 自动保存（防抖动，2秒后保存）
      autoSaveWorkflow(updatedWorkflow);
    } else {
      // 节点位置变化：创建checkpoint（短延迟防抖）
      createCheckpoint(
        updatedWorkflow,
        'USER',
        'USER_UPDATE_NODE_POSITION',
        OperationPriority.SHORT_DEBOUNCE,
        { description: '更新节点位置' }
      );
      // 自动保存（防抖动，2秒后保存）
      autoSaveWorkflow(updatedWorkflow);
    }
  }, [workflow, createCheckpoint, autoSaveWorkflow]);

  // 使用 useCallback 包装 handleUpdateConnections
  const handleUpdateConnections = useCallback((connections: WorkflowConnection[]) => {
    if (!workflow) return;

    // 检查 connections 是否真的变化了（避免不必要的更新）
    const connectionsStr = JSON.stringify(connections);
    const currentConnectionsStr = JSON.stringify(workflow.connections || []);
    if (connectionsStr === currentConnectionsStr) {
      // 内容相同，不需要更新
      return;
    }

    const updatedWorkflow = {
      ...workflow,
      connections,
    };
    setWorkflow(updatedWorkflow);

    // 创建checkpoint（立即，连接变更很重要）
    createCheckpoint(
      updatedWorkflow,
      'USER',
      'USER_CONNECT_NODES',
      OperationPriority.IMMEDIATE,
      { description: '更新连接关系' }
    );

    // 自动保存（立即，连接变更很重要）
    autoSaveWorkflow(updatedWorkflow, true);
  }, [workflow, createCheckpoint, autoSaveWorkflow]);

  // 使用 useCallback 包装 handleExecutionResult
  const handleExecutionResult = useCallback((nodeId: string, result: {
    success: boolean;
    data?: any;
    error?: string;
    operatorId?: string;
    operatorType?: string;
    operatorName?: string;
  }) => {
    setExecutionResults(prev => {
      const newMap = new Map(prev);
      newMap.set(nodeId, {
        ...result,
        timestamp: new Date().toISOString(),
      });
      return newMap;
    });
  }, []);

  // 使用 useCallback 包装 handleSelectionChange
  const handleSelectionChange = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    setSelectedEdgeIds(edgeIds);
  }, []);

  const handleDeleteSelectedNodes = () => {
    if (!workflow || selectedNodeIds.length === 0) return;
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedNodeIds.length} 个节点吗？删除后相关的连接也会被删除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const nodeIdsSet = new Set(selectedNodeIds);
        const updatedNodes = workflow.nodes?.filter(node => !nodeIdsSet.has(node.id)) || [];
        const updatedConnections = workflow.connections?.filter(
          conn => !nodeIdsSet.has(conn.from.node) && !nodeIdsSet.has(conn.to.node)
        ) || [];
        
        const updatedWorkflow = {
          ...workflow,
          nodes: updatedNodes,
          connections: updatedConnections,
        };
        setWorkflow(updatedWorkflow);
        
        // 创建checkpoint（立即）
        createCheckpoint(
          updatedWorkflow,
          'USER',
          'USER_REMOVE_NODE',
          OperationPriority.IMMEDIATE,
          { description: `删除 ${selectedNodeIds.length} 个节点` }
        );
        
        // 自动保存（立即）
        autoSaveWorkflow(updatedWorkflow, true);
        
        setSelectedNodeIds([]);
        messageApi.success(`已删除 ${selectedNodeIds.length} 个节点`);
      },
    });
  };

  const handleDeleteSelectedEdges = () => {
    if (!workflow || selectedEdgeIds.length === 0) return;
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedEdgeIds.length} 个连接吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const edgeIdsSet = new Set(selectedEdgeIds);
        const updatedConnections = workflow.connections?.filter(
          conn => !edgeIdsSet.has(conn.id)
        ) || [];
        
        const updatedWorkflow = {
          ...workflow,
          connections: updatedConnections,
        };
        setWorkflow(updatedWorkflow);
        
        // 创建checkpoint（立即）
        createCheckpoint(
          updatedWorkflow,
          'USER',
          'USER_DISCONNECT_NODES',
          OperationPriority.IMMEDIATE,
          { description: `删除 ${selectedEdgeIds.length} 个连接` }
        );

        // 自动保存（立即）
        autoSaveWorkflow(updatedWorkflow, true);
        
        // 自动保存（立即）
        autoSaveWorkflow(updatedWorkflow, true);
        
        setSelectedEdgeIds([]);
        messageApi.success(`已删除 ${selectedEdgeIds.length} 个连接`);
      },
    });
  };

  const getValidationStatus = () => {
    if (!validationResult) return null;
    if (validationResult.isComplete) {
      return { icon: <CheckCircleOutlined />, color: 'success', text: '完整' };
    }
    if (validationResult.issues.length > 0) {
      return { icon: <CloseCircleOutlined />, color: 'error', text: '有错误' };
    }
    if (validationResult.warnings.length > 0) {
      return { icon: <ExclamationCircleOutlined />, color: 'warning', text: '有警告' };
    }
    return null;
  };

  const validationStatus = getValidationStatus();

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!workflow) {
    return <div>工作流不存在</div>;
  }

  return (
    <>
      {contextHolder}
      <DataVisualizationProvider monitor={dataVizMonitor}>
        <Layout style={{ height: '100vh' }}>
      {/* 工具栏 */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgb(240 240 240 / 14%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Button type='text' icon={<IoChevronBackOutline />} onClick={() => navigate('/')}>
            Workflows
          </Button>
          <Button
            type="text"
            onClick={() => {
              // 重置表单数据
              form.setFieldsValue({
                name: workflow.name,
                description: workflow.description,
                version: workflow.version,
                author: workflow.author,
                category: workflow.category,
                tags: workflow.tags?.join(', '),
              });
              setShowEditWorkflowModal(true);
            }}
          >
            {workflow.name}
          </Button>
        </Space>

        <Space>
          <Tooltip title={canUndo ? getUndoDescription() : '无法撤销'}>
            <Button
              type='text'
              className='panel-icon-btn'
              icon={<BiUndo />}
              disabled={!canUndo}
              onClick={() => {
                const restoredWorkflow = handleUndo();
                if (restoredWorkflow) {
                  setWorkflow(restoredWorkflow);
                  updatePreviousWorkflow(restoredWorkflow);
                }
              }}
            />
          </Tooltip>
          <Tooltip title={canRedo ? getRedoDescription() : '无法重做'}>
            <Button
              type='text'
              className='panel-icon-btn'
              icon={<BiRedo />}
              disabled={!canRedo}
              onClick={() => {
                const restoredWorkflow = handleRedo();
                if (restoredWorkflow) {
                  setWorkflow(restoredWorkflow);
                  updatePreviousWorkflow(restoredWorkflow);
                }
              }}
            />
          </Tooltip>
          <Button
            type='text'
            onClick={() => setShowAddNodeModal(true)}
          >
            <BiSolidPlusCircle />
          </Button>
          {selectedNodeIds.length > 0 && (
            <Button
              danger
              icon={<BiTrash />}
              onClick={handleDeleteSelectedNodes}
            >
              删除节点 ({selectedNodeIds.length})
            </Button>
          )}
          {selectedEdgeIds.length > 0 && (
            <Button
              danger
              icon={<BiTrash />}
              onClick={handleDeleteSelectedEdges}
            >
              删除连接 ({selectedEdgeIds.length})
            </Button>
          )}
          
          <Tooltip title="一键执行工作流">
            <Button
              type='text'
              className='panel-icon-btn'
              icon={<PlayCircleOutlined />}
              loading={executingWorkflow}
              onClick={handleExecuteFullWorkflow}
              disabled={!workflow?.id || executingWorkflow}
            />
          </Tooltip>

          <Tooltip title="保存工作流">
            <Button
              type='text'
              className='panel-icon-btn'
              loading={saving}
              onClick={handleSave}
            >
              <BiSolidSave />
            </Button>
          </Tooltip>

          <Tooltip title="部署工作流">
            <Button
              type='text'
              className='panel-icon-btn'
              onClick={handleDeploy}
            >
              <BiSolidHot />
            </Button>
          </Tooltip>
          

          <Space.Compact>
            <Tooltip title={debugMode ? '隐藏调试面板' : '显示调试面板'}>
              <Button
                type='text'
                className='panel-icon-btn'
                onClick={() => setDebugMode(!debugMode)}
              >
                <BiSolidDockBottom />
              </Button>
            </Tooltip>
            <Tooltip title={showAIPanel ? '隐藏AI对话面板' : '显示AI对话面板'}>
              <Button
                type='text'
                className='panel-icon-btn'
                onClick={() => setShowAIPanel(!showAIPanel)}
              >
                <BiSolidDockRight />
              </Button>
            </Tooltip>
          </Space.Compact>

          <Button
            type='text'
            className='panel-icon-btn'
            icon={<BiWrench />}
            onClick={() => setShowSettings(true)}
          />
          
          
          {validationStatus && (
            <Tooltip title={`验证状态: ${validationStatus.text}`}>
              <Tag
                icon={validationStatus.icon}
                color={validationStatus.color}
                style={{ cursor: 'pointer' }}
                onClick={handleValidate}
              >
                {validationStatus.text}
              </Tag>
            </Tooltip>
          )}
        </Space>
      </div>

      {/* 主内容区域：使用 Splitter 布局 */}
      <Splitter style={{ height: 'calc(100vh - 48px)' }}>
        {/* 左侧区域 */}
        <Splitter.Panel defaultSize="70%" min="50%" max="85%">
          {debugMode ? (
            <Splitter orientation="vertical" style={{ height: '100%' }}>
              {/* 上方：画布 */}
              <Splitter.Panel defaultSize="70%" min="50%" max="95%">
                <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                  <Canvas
                    ref={canvasRef}
                    workflow={workflow}
                    operators={operators}
                    onNodesChange={handleUpdateNodes}
                    onConnectionsChange={handleUpdateConnections}
                    onExecutionResult={handleExecutionResult}
                    onSelectionChange={handleSelectionChange}
                    executionResults={executionResults}
                    nodeInputDataMap={nodeInputDataMap}
                    showMiniMap={showMiniMap}
                  />
                </div>
              </Splitter.Panel>
              
              {/* 下方：调试控制台 */}
              <Splitter.Panel min="5%" max="50%">
                <div style={{ height: '100%' }}>
                  <DebugConsole executionResults={executionResults} />
                </div>
              </Splitter.Panel>
            </Splitter>
          ) : (
            <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Canvas
                ref={canvasRef}
                workflow={workflow}
                operators={operators}
                onNodesChange={handleUpdateNodes}
                onConnectionsChange={handleUpdateConnections}
                onExecutionResult={handleExecutionResult}
                onSelectionChange={handleSelectionChange}
                executionResults={executionResults}
                nodeInputDataMap={nodeInputDataMap}
                showMiniMap={showMiniMap}
              />
            </div>
          )}
        </Splitter.Panel>

        {/* 右侧面板 */}
        {showAIPanel && (
          <Splitter.Panel 
            defaultSize={400} min={300} max={600}
            // collapsible={{ start: true, end: true, showCollapsibleIcon: true }}
            >
            <div
              style={{
                height: '100%',
                background: '#ffffff08',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AIChatPanel
                workflow={workflow}
                workflowId={id}
                versionHistory={versionHistory}
                createCheckpoint={createCheckpoint}
                onWorkflowUpdate={async (updatedWorkflow) => {
                  setWorkflow(updatedWorkflow);
                  updatePreviousWorkflow(updatedWorkflow);
                  
                  // AI修改workflow后自动保存
                  if (updatedWorkflow.id) {
                    try {
                      // 清理节点配置中的文件对象
                      const cleanedWorkflow = {
                        ...updatedWorkflow,
                        nodes: updatedWorkflow.nodes?.map(node => {
                          const operator = operatorsMap[node.operatorId];
                          return {
                            ...node,
                            config: cleanNodeConfig(node.config, operator),
                          };
                        }),
                      };
                      
                      await api.updateWorkflow(updatedWorkflow.id, cleanedWorkflow);
                      console.log('✅ AI修改后自动保存成功');
                      // 不显示提示，避免打扰用户
                    } catch (error: any) {
                      console.error('❌ AI修改后自动保存失败:', error);
                      messageApi.error(`自动保存失败: ${error.message}`);
                    }
                  }
                }}
                selectedNodeIds={selectedNodeIds}
                selectedEdgeIds={selectedEdgeIds}
                operators={operators}
                onClearSelection={() => {
                  setSelectedNodeIds([]);
                  setSelectedEdgeIds([]);
                }}
                onAIFunctionCallResult={(functionName, parameters, messageId, previousWorkflow, updatedWorkflow) => {
                  // 创建AI操作的checkpoint
                  const checkpointId = createCheckpoint(
                    updatedWorkflow,
                    'AI',
                    `AI_${functionName.toUpperCase()}`,
                    OperationPriority.IMMEDIATE,
                    {
                      messageId,
                      description: `AI执行: ${functionName}`,
                      functionCall: {
                        name: functionName,
                        parameters,
                      },
                    }
                  );
                  return checkpointId;
                }}
              />
            </div>
          </Splitter.Panel>
        )}
      </Splitter>

      {/* 添加节点Modal */}
      <AddNodeModal
        visible={showAddNodeModal}
        onClose={() => setShowAddNodeModal(false)}
        onAddNode={handleAddNode}
        operators={operators}
        onOperatorsReload={loadOperators}
      />

      {/* 编辑工作流信息Modal */}
      <Modal
        title="编辑工作流信息"
        open={showEditWorkflowModal}
        onCancel={() => setShowEditWorkflowModal(false)}
        onOk={() => form.submit()}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            setWorkflow({
              ...workflow,
              ...values,
              tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
            });
            setShowEditWorkflowModal(false);
            messageApi.success('工作流信息已更新');
          }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入工作流名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="version" label="版本">
            <Input />
          </Form.Item>
          <Form.Item name="author" label="作者">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 设置面板 */}
      <Modal
        title="设置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={800}
      >
        <SettingsPanel
          onSettingsChange={(settings: WorkflowDesignerSettings) => {
            // 当设置变化时，立即应用新的设置
            setDebugMode(settings.defaultOpenDebugPanel);
            setShowAIPanel(settings.defaultOpenAIPanel);
            setShowMiniMap(settings.showMiniMap);
          }}
        />
        </Modal>
      </Layout>
      </DataVisualizationProvider>
    </>
  );
};

export default WorkflowDesigner;

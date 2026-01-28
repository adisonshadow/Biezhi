import React, { useState, useRef, useMemo } from 'react';

import { Button, Collapse, Flex, GetProp, GetRef, Select, message, Popover, Space, Tag, Typography } from 'antd';
import { 
  Actions,
  Bubble,
  BubbleListProps,
  Conversations,
  Sender,
  SenderProps,
  XProvider,
  Suggestion,
  Think,
  Prompts,
  Welcome,
  Attachments,
  type AttachmentsProps,
  CodeHighlighter,
 } from "@ant-design/x";
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown';

import {
  AbstractChatProvider,
  DeepSeekChatProvider,
  DefaultMessageInfo,
  // SSEFields,
  useXChat,
  useXConversations,
  XModelMessage,
  XModelParams,
  XModelResponse,
  XRequest,
} from '@ant-design/x-sdk';
import type { SSEFields, TransformMessage, XRequestOptions } from '@ant-design/x-sdk';

import dayjs from 'dayjs';

import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  CopyOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { BsStars } from "react-icons/bs";

import { BubbleListRef } from '@ant-design/x/es/bubble';
import '@ant-design/x-markdown/themes/dark.css';
import './AIChatPanel.css';
import { loadLLMConfigs, getDefaultLLMConfig, getLLMConfigById, type LLMModelConfig } from './ModelSettingsPanel';
import type { Workflow } from '../../types';
import type { VersionHistoryManager } from '../../utils/workflowCheckpoint';
import { OperationPriority } from '../../utils/workflowCheckpoint';
import { RollbackOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import { rollbackAIOperation } from '../../utils/workflowCheckpoint/aiCheckpointHelper';
import { getFunctionSchemas, convertSchemasToTools, executeFunctionCall, type FunctionCall, type FunctionCallContext } from '../../AI/workflow/functionCalling';
import { formatFunctionCallResult } from '../../AI/workflow/functionCallingHelper';
import { formatSelectedObjectsContext } from '../../AI/workflow/prompts/selectedObjectsPrompt';
import { generateSystemPrompt } from '../../AI/workflow/prompts/systemPrompt';
import { isModifyOperation, createAICheckpoint } from '../../utils/workflowCheckpoint/aiCheckpointHelper';
import SelectedObjectsPanel from './SelectedObjectsPanel';
// import FunctionCallStatus from './FunctionCallStatus';
import ToolCallsStreamDisplay from './ToolCallsStreamDisplay';

interface AIChatPanelProps {
  // 工作流相关
  workflow?: Workflow | null;
  workflowId?: string;
  versionHistory?: VersionHistoryManager | null;
  createCheckpoint?: (
    currentWorkflow: Workflow,
    operationType: 'USER' | 'AI',
    operation: string,
    priority?: OperationPriority,
    options?: import('../../utils/workflowCheckpoint').CreateCheckpointOptions
  ) => string | null;
  onWorkflowUpdate?: (workflow: Workflow) => void;
  selectedNodeIds?: string[];
  selectedEdgeIds?: string[];
  operators?: import('../../types').Operator[];
  onClearSelection?: () => void;
  onAIFunctionCallResult?: (
    functionName: string,
    parameters: any,
    messageId: string,
    previousWorkflow: Workflow,
    updatedWorkflow: Workflow
  ) => string | null;
  
  // 当用户发送消息时，调用此函数
  onMessageSend?: (message: string) => void;
  // 当AI返回有Function时，调用此函数
  onFunctionCall?: (functionName: string, functionParams: any) => void;
  // 将选中节点作为参数传递给AI
  tellNodesSelected?: (nodeIds: string[]) => void;
  // 将选中连接作为参数传递给AI
  tellEdgesSelected?: (edgeIds: string[]) => void;
  // 将选中端口作为参数传递给AI
  tellPortsSelected?: (portIds: string[]) => void;
  // 将节点执行结果作为参数传递给AI
  tellNodeExecutionResult?: (nodeId: string, result: any) => void;
}

const ThinkComponent = React.memo((props: ComponentProps) => {
  const [title, setTitle] = React.useState(`deep thinking...`);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (props.streamStatus === 'done') {
      setTitle('complete thinking');
      setLoading(false);
    }
  }, [props.streamStatus]);

  return (
    <Think title={title} loading={loading}>
      {props.children}
    </Think>
  );
});

// 自定义代码组件，使用CodeHighlighter
const CodeComponent: React.FC<ComponentProps> = (props) => {
  const { className, children } = props;
  const lang = className?.match(/language-(\w+)/)?.[1] || '';

  if (typeof children !== 'string') return null;
  return <CodeHighlighter lang={lang}>{children}</CodeHighlighter>;
};

// 自定义段落组件，用于识别工作流信息块并应用样式
const ParagraphComponent: React.FC<ComponentProps> = (props) => {
  const { children } = props;
  
  // 检查是否是工作流信息块
  const isWorkflowInfo = React.useMemo(() => {
    // 处理字符串类型
    if (typeof children === 'string') {
      return children.includes('当前工作流（画布）') || 
             children.includes('工作流名称') || 
             children.includes('工作流ID') ||
             children.includes('节点数量') ||
             children.includes('连接数量') ||
             children.includes('节点列表') ||
             children.includes('连接列表');
    }
    // 处理React元素类型，检查其文本内容
    if (React.isValidElement(children) || (Array.isArray(children) && children.length > 0)) {
      const textContent = React.Children.toArray(children)
        .map(child => {
          if (typeof child === 'string') return child;
          if (React.isValidElement(child) && child.props?.children) {
            return React.Children.toArray(child.props.children).join('');
          }
          return '';
        })
        .join('');
      return textContent.includes('当前工作流（画布）') || 
             textContent.includes('工作流名称') || 
             textContent.includes('工作流ID') ||
             textContent.includes('节点数量') ||
             textContent.includes('连接数量') ||
             textContent.includes('节点列表') ||
             textContent.includes('连接列表');
    }
    return false;
  }, [children]);

  if (isWorkflowInfo) {
    return (
      <div style={{
        backgroundColor: 'rgba(64, 64, 64, 0.8)',
        fontSize: '12px',
        padding: '8px 12px',
        borderRadius: '4px',
        margin: '4px 0',
        lineHeight: '1.6',
      }}>
        {children}
      </div>
    );
  }

  return <p>{children}</p>;
};

/**
 * 自定义 Chat Provider，支持保留 tool_calls 字段
 * 继承 AbstractChatProvider，重写 transformMessage 方法以保留 tool_calls
 */
class CustomToolCallsChatProvider<
  ChatMessage extends XModelMessage = XModelMessage,
  Input extends XModelParams = XModelParams,
  Output extends Partial<Record<SSEFields, XModelResponse>> = Partial<Record<SSEFields, XModelResponse>>
> extends AbstractChatProvider<ChatMessage, Input, Output> {
  transformParams(requestParams: Partial<Input>, options: XRequestOptions<Input, Output>): Input {
    // 参考 DeepSeekChatProvider 的实现
    const result = {
      ...(options?.params || {}),
      ...requestParams,
      messages: this.getMessages(),
    };
    return result as unknown as Input;
  }

  transformLocalMessage(requestParams: Partial<Input>): ChatMessage[] {
    // 参考 DeepSeekChatProvider 的实现
    return (requestParams?.messages || []) as ChatMessage[];
  }

  transformMessage(info: TransformMessage<ChatMessage, Output>): ChatMessage {
    const { originMessage, chunk, chunks, responseHeaders } = info || {};
    
    let currentContent = '';
    let role = 'assistant';
    let toolCalls: any[] | undefined = undefined;
    const accumulatedToolCalls: Map<number, any> = new Map();
    
    try {
      // 处理单个 chunk（参考 DeepSeekChatProvider 的实现）
      if (chunk) {
        let message: any = null;
        
        // 检查是否是 SSE 格式
        if (responseHeaders?.get('content-type')?.includes('text/event-stream')) {
          // SSE 格式：chunk.data 是字符串，需要解析 JSON
          if (chunk && (chunk as any).data?.trim() !== '[DONE]') {
            try {
              message = JSON.parse((chunk as any).data);
            } catch (e) {
              console.debug('transformMessage: 解析 SSE data 失败', e);
            }
          }
        } else {
          // 非 SSE 格式：直接使用 chunk
          message = chunk;
        }
        
        if (message) {
          // 处理 choices 数组
          if (message.choices && Array.isArray(message.choices)) {
            message.choices.forEach((choice: any) => {
              // 处理 delta（增量更新）
              if (choice.delta) {
                if (choice.delta.content) {
                  currentContent += choice.delta.content;
                }
                if (choice.delta.role) {
                  role = choice.delta.role;
                }
                
                // 处理 delta.tool_calls（流式增量）
                if (choice.delta.tool_calls && Array.isArray(choice.delta.tool_calls)) {
                  choice.delta.tool_calls.forEach((deltaTc: any) => {
                    const index = deltaTc.index !== undefined ? deltaTc.index : accumulatedToolCalls.size;
                    
                    if (!accumulatedToolCalls.has(index)) {
                      accumulatedToolCalls.set(index, {
                        id: deltaTc.id || '',
                        type: deltaTc.type || 'function',
                        function: {
                          name: '',
                          arguments: '',
                        },
                      });
                    }
                    
                    const tc = accumulatedToolCalls.get(index)!;
                    if (deltaTc.id) tc.id = deltaTc.id;
                    if (deltaTc.function?.name) tc.function.name = deltaTc.function.name;
                    if (deltaTc.function?.arguments) {
                      tc.function.arguments = (tc.function.arguments || '') + deltaTc.function.arguments;
                    }
                  });
                }
              }
              
              // 处理 message（完整消息）
              if (choice.message) {
                if (choice.message.content) {
                  currentContent = choice.message.content;
                }
                if (choice.message.role) {
                  role = choice.message.role;
                }
                
                // 处理 message.tool_calls（完整消息）
                if (choice.message.tool_calls && Array.isArray(choice.message.tool_calls)) {
                  choice.message.tool_calls.forEach((tc: any, index: number) => {
                    accumulatedToolCalls.set(index, tc);
                  });
                }
              }
              
              // 处理 choice.tool_calls（直接）
              if (choice.tool_calls && Array.isArray(choice.tool_calls)) {
                choice.tool_calls.forEach((tc: any, index: number) => {
                  accumulatedToolCalls.set(index, tc);
                });
              }
            });
          }
          
          // 检查根级别的 tool_calls（某些 API 格式）
          if (message.tool_calls && Array.isArray(message.tool_calls)) {
            message.tool_calls.forEach((tc: any, index: number) => {
              accumulatedToolCalls.set(index, tc);
            });
          }
        }
      }
      
      // 处理 chunks 数组（流式传输时累积）
      if (chunks && Array.isArray(chunks) && chunks.length > 0) {
        for (const c of chunks) {
          let message: any = null;
          
          // 检查是否是 SSE 格式
          if (responseHeaders?.get('content-type')?.includes('text/event-stream')) {
            if (c && (c as any).data?.trim() !== '[DONE]') {
              try {
                message = JSON.parse((c as any).data);
              } catch (e) {
                console.debug('transformMessage: 解析 chunks SSE data 失败', e);
              }
            }
          } else {
            message = c;
          }
          
          if (message && message.choices && Array.isArray(message.choices)) {
            message.choices.forEach((choice: any) => {
              // 处理 delta（增量更新）
              if (choice.delta) {
                if (choice.delta.content) {
                  currentContent += choice.delta.content;
                }
                if (choice.delta.role) {
                  role = choice.delta.role;
                }
                
                // 处理 delta.tool_calls（流式增量）
                if (choice.delta.tool_calls && Array.isArray(choice.delta.tool_calls)) {
                  choice.delta.tool_calls.forEach((deltaTc: any) => {
                    const index = deltaTc.index !== undefined ? deltaTc.index : accumulatedToolCalls.size;
                    
                    if (!accumulatedToolCalls.has(index)) {
                      accumulatedToolCalls.set(index, {
                        id: deltaTc.id || '',
                        type: deltaTc.type || 'function',
                        function: {
                          name: '',
                          arguments: '',
                        },
                      });
                    }
                    
                    const tc = accumulatedToolCalls.get(index)!;
                    if (deltaTc.id) tc.id = deltaTc.id;
                    if (deltaTc.function?.name) tc.function.name = deltaTc.function.name;
                    if (deltaTc.function?.arguments) {
                      tc.function.arguments = (tc.function.arguments || '') + deltaTc.function.arguments;
                    }
                  });
                }
              }
              
              // 处理 message（完整消息，覆盖增量）
              if (choice.message) {
                if (choice.message.content) {
                  currentContent = choice.message.content;
                }
                if (choice.message.role) {
                  role = choice.message.role;
                }
                
                // 处理 message.tool_calls（完整消息，覆盖增量）
                if (choice.message.tool_calls && Array.isArray(choice.message.tool_calls)) {
                  choice.message.tool_calls.forEach((tc: any, index: number) => {
                    accumulatedToolCalls.set(index, tc);
                  });
                }
              }
            });
          }
        }
      }
      
      // 如果有累积的 tool_calls，使用它们
      if (accumulatedToolCalls.size > 0) {
        toolCalls = Array.from(accumulatedToolCalls.values());
      }
    } catch (error) {
      console.error('transformMessage error', error);
    }
    
    // 构建 content
    // useXChat 会使用 transformMessage 返回的 content 来更新消息
    // 我们需要返回累积后的完整内容
    // originMessage.content 是之前已经累积的内容，currentContent 是当前chunk的增量
    const originMessageContent = originMessage?.content 
      ? (typeof originMessage.content === 'string' 
          ? originMessage.content 
          : (originMessage.content as any)?.text || '')
      : '';
    
    // 构建累积后的完整内容
    // 如果 originMessage 存在，说明是流式传输中的累积，需要追加 currentContent
    // 如果 originMessage 不存在，说明是第一次，直接使用 currentContent
    // 为了避免重复，检查 currentContent 是否已经包含在 originMessageContent 的末尾
    let content = '';
    if (originMessageContent) {
      if (currentContent) {
        // 检查 currentContent 是否已经包含在 originMessageContent 的末尾
        // 如果 originMessageContent 以 currentContent 结尾，说明已经包含，不追加
        if (originMessageContent.endsWith(currentContent)) {
          content = originMessageContent;
        } else {
          // 追加新的增量
          content = originMessageContent + currentContent;
        }
      } else {
        // 没有新的增量，返回已有的内容
        content = originMessageContent;
      }
    } else {
      // 第一次，只有 currentContent
      content = currentContent || '';
    }
    
    // 构建返回的消息，保留 tool_calls
    const result: ChatMessage = {
      ...(originMessage || {}),
      content: content || '',
      role: role || 'assistant',
    } as ChatMessage;
    
    // 如果有新的 tool_calls，添加到消息中（覆盖之前的）
    if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
      (result as any).tool_calls = toolCalls;
    } else if (originMessage && (originMessage as any).tool_calls) {
      // 如果没有新的 tool_calls，但 originMessage 有，保留它们
      (result as any).tool_calls = (originMessage as any).tool_calls;
    }
    
    return result;
  }
}

/**
 * 创建 Provider，使用指定的模型配置和Function Calling工具
 * 使用自定义的 CustomToolCallsChatProvider 以支持 tool_calls
 */
const createProvider = (modelConfig: LLMModelConfig | null, tools?: any[]): CustomToolCallsChatProvider => {
  // 如果没有模型配置，使用默认值
  const baseURL = modelConfig?.baseURL || 'https://api.x.ant.design/api/big_model_glm-4.5-flash';
  const model = modelConfig?.model || 'glm-4.5-flash';
  const apiKey = modelConfig?.apiKey || '';

  // 构建请求 URL
  // 直接使用 baseURL，不进行拼接，因为用户可能已经提供了完整的 URL
  const requestURL = baseURL;

  // 构建请求参数
  const requestParams: any = {
    stream: true,
    thinking: {
      type: 'disabled',
    },
    model: model,
  };

  // 如果提供了tools，添加到参数中
  if (tools && tools.length > 0) {
    requestParams.tools = tools;
  }

  // 如果启用了 dangerouslyAllowBrowser，添加到参数中
  if (modelConfig?.dangerouslyAllowBrowser !== false) {
    requestParams.dangerouslyAllowBrowser = true;
  }

  return new CustomToolCallsChatProvider({
    request: XRequest<XModelParams, Partial<Record<SSEFields, XModelResponse>>>(
      requestURL,
      {
        manual: true,
        params: requestParams,
        headers: apiKey ? {
          'Authorization': `Bearer ${apiKey}`,
        } : undefined,
      },
    ),
  });
};

/**
 * Provider 缓存，key 为 conversationKey_modelId
 */
const providerCaches = new Map<string, CustomToolCallsChatProvider>();
const providerFactory = (conversationKey: string, modelConfig: LLMModelConfig | null) => {
  const modelId = modelConfig?.id || 'default';
  const cacheKey = `${conversationKey}_${modelId}`;
  
  if (!providerCaches.get(cacheKey)) {
    providerCaches.set(cacheKey, createProvider(modelConfig));
  }
  return providerCaches.get(cacheKey)!;
};

interface CopilotProps {
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
}


const MOCK_QUESTIONS = [
  '帮我优化一下工作流',
  '为工作流添加一些数据可视化节点',
];

// 根据选中状态生成动态建议
const generateSuggestions = (
  selectedNodeIds: string[],
  selectedEdgeIds: string[]
): Array<{ label: string; value: string }> => {
  const suggestions: Array<{ label: string; value: string }> = [];
  
  // 如果有1个节点，显示"完善节点配置"
  if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
    suggestions.push({ label: '完善节点配置', value: '完善节点配置' });
  }
  
  // 如果有2个节点，显示"自动对齐数据"
  if (selectedNodeIds.length === 2 && selectedEdgeIds.length === 0) {
    suggestions.push({ label: '自动对齐数据', value: '自动对齐数据' });
  }
  
  // 如果有边，显示"检查连接"
  if (selectedEdgeIds.length > 0) {
    suggestions.push({ label: '检查连接', value: '检查连接' });
  }
  
  return suggestions;
};

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  workflow,
  workflowId: propWorkflowId,
  versionHistory,
  createCheckpoint,
  onWorkflowUpdate,
  selectedNodeIds = [],
  selectedEdgeIds = [],
  operators = [],
  onClearSelection,
  onAIFunctionCallResult,
}) => {
  // 优先使用 workflow.id，其次使用 propWorkflowId，最后从 window.workflow_id 获取
  const workflowId = workflow?.id || propWorkflowId || (typeof window !== 'undefined' ? (window as any).workflow_id : undefined);
  
  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const messageCheckpointsRef = useRef<Map<string, string>>(new Map()); // messageId -> checkpointId
  const messageMetadataRef = useRef<Map<string, {
    checkpoint_id?: string;
    has_workflow_changes?: boolean;
    operation_type?: 'USER' | 'AI';
    function_calls?: Array<{
      name: string;
      parameters: any;
      result?: any;
    }>;
    has_error?: boolean;
    error_message?: string;
  }>>(new Map()); // messageId -> metadata
  const [, forceUpdate] = React.useState({}); // 用于强制更新
  const messageItemsRef = useRef<Map<string, any>>(new Map()); // messageId -> messageItem (包含 tool_calls)
  const messagesRef = useRef<any[]>([]); // 存储最新的 messages，供 contentRender 使用
  const [functionTools, setFunctionTools] = React.useState<any[]>([]);
  const [loadingTools, setLoadingTools] = React.useState(false);
  const systemPromptSentRef = React.useRef<Map<string, boolean>>(new Map()); // 跟踪每个会话是否已发送系统提示词
  const isAbortedRef = useRef<boolean>(false); // 跟踪是否已停止请求
  const loggedMessageIdsRef = useRef<Set<string>>(new Set()); // 跟踪已经输出过日志的 messageId，避免重复输出
  const errorHistoryRef = useRef<Map<string, number>>(new Map()); // 跟踪每个错误消息出现的次数，key: errorMessage, value: count

  // ==================== State ====================
  const {
    conversations,
    activeConversationKey,
    setActiveConversationKey,
    addConversation,
    getConversation,
    setConversation,
  } = useXConversations({
    defaultConversations: [{ key: '1', label: 'new session', group: 'Today' }],
    defaultActiveConversationKey: '1',
  });
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [files, setFiles] = useState<GetProp<AttachmentsProps, 'items'>>([]);

  const [inputValue, setInputValue] = useState('');

  // 模型选择状态
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() => {
    const defaultConfig = getDefaultLLMConfig();
    return defaultConfig?.id || null;
  });
  
  // 获取模型配置列表（每次渲染时重新加载，以便获取最新配置）
  const modelConfigs = loadLLMConfigs();
  
  // 获取当前选中的模型配置
  const currentModelConfig = selectedModelId 
    ? getLLMConfigById(selectedModelId) 
    : (modelConfigs.defaultId ? getLLMConfigById(modelConfigs.defaultId) : getDefaultLLMConfig());

  const listRef = useRef<BubbleListRef>(null);

  // ==================== 加载Function Schemas ====================
  React.useEffect(() => {
    const loadFunctionSchemas = async () => {
      setLoadingTools(true);
      try {
        const schemas = await getFunctionSchemas();
        const tools = convertSchemasToTools(schemas);
        setFunctionTools(tools);
      } catch (error) {
        console.error('Failed to load function schemas:', error);
      } finally {
        setLoadingTools(false);
      }
    };
    
    loadFunctionSchemas();
  }, []);

  // ==================== Runtime ====================
  // 当模型、会话或tools改变时，重新创建 provider
  // 清除旧的缓存，确保使用最新的配置
  const currentProvider = React.useMemo(() => {
    if (currentModelConfig) {
      // 清除该会话和模型的所有旧缓存
      const cacheKey = `${activeConversationKey}_${currentModelConfig.id}`;
      providerCaches.delete(cacheKey);
    }
    // 使用带tools的provider
    const modelId = currentModelConfig?.id || 'default';
    const cacheKey = `${activeConversationKey}_${modelId}`;
    
    if (!providerCaches.get(cacheKey)) {
      providerCaches.set(cacheKey, createProvider(currentModelConfig, functionTools));
    }
    return providerCaches.get(cacheKey)!;
  }, [activeConversationKey, currentModelConfig?.id, currentModelConfig?.baseURL, functionTools]);

  // 自定义 parser 来处理流式 tool_calls 数据
  const customParser = React.useCallback((message: any) => {
    // console.log('customParser: 处理消息', { message });
    
    // 检查是否有 tool_calls 数据
    if (message?.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      // console.log('customParser: 检测到 tool_calls', {
      //   toolCalls: message.tool_calls,
      //   toolCallsLength: message.tool_calls.length,
      //   messageContent: message.content
      // });
    }
    
    // 返回原始消息，让 useXChat 自动处理流式合并
    return message;
  }, []);

  const { onRequest, messages, isRequesting, abort } = useXChat({
    provider: currentProvider, // 使用选中的模型配置
    conversationKey: activeConversationKey,
    parser: customParser, // 添加自定义 parser
    requestPlaceholder: () => {
      return {
        content: 'no data',
        role: 'assistant',
      };
    },
    requestFallback: (_, { error, errorInfo, messageInfo }) => {
      if (error.name === 'AbortError') {
        return {
          content: messageInfo?.message?.content || 'request aborted',
          role: 'assistant',
        };
      }
      return {
        content: errorInfo?.error?.message || 'request failed',
        role: 'assistant',
      };
    },
  });
  
  // 使用 useMemo 稳定 items 数组引用，避免无限循环
  // 注意：messages 数组可能每次都是新引用，但 useMemo 会根据依赖项决定是否重新计算
  // 我们在 useMemo 内部读取 ref 的当前值，这样即使 ref 变化也不会触发重新计算
  const filteredAndMappedMessages = React.useMemo(() => {
    // 更新 messagesRef，供 contentRender 使用
    messagesRef.current = messages || [];
    
    if (!messages || messages.length === 0) return [];
    
    return messages.filter((i) => {
      // 过滤掉系统提示词消息和错误消息
      const message = i.message;
      // 确保 content 是字符串类型
      const contentStr = typeof message?.content === 'string' 
        ? message.content 
        : (message?.content ? String(message.content) : '');
      const role = message?.role;
      
      // 隐藏系统角色消息（系统提示词）
      if (role === 'system') {
        return false;
      }
      
      // 隐藏以 [系统提示] 开头的 assistant 消息（兼容旧代码）
      if (role === 'assistant' && contentStr && contentStr.startsWith('[系统提示]')) {
        return false;
      }
      
      // 隐藏错误消息（messages 参数非法等）
      if (contentStr && (contentStr.includes('参数非法') || contentStr.includes('messages 参数非法'))) {
        return false;
      }
      
      return true;
    }).map((i) => {
      const messageId = typeof i.id === 'string' ? i.id : String(i.id);
      // 在 useMemo 内部读取 ref 的当前值
      const metadata = messageMetadataRef.current.get(messageId);
      const checkpointId = messageCheckpointsRef.current.get(messageId);
      
      const message = i.message;
      // 如果消息有tool_calls但没有content，生成一个占位符content
      let content = message?.content || '';
      
      // 检查 MessageInfo 的 extra 字段是否有 tool_calls 数据
      const extraToolCalls = (i as any)?.extra?.tool_calls;
      const messageToolCalls = (message as any)?.tool_calls;
      
      // 优先使用 extra 字段的 tool_calls，如果没有则使用 message 中的
      const toolCalls = extraToolCalls || messageToolCalls;
      
      // 调试：检查 tool_calls 是否存在（只在有 tool_calls 时输出）
      if (messageId && i.status === 'loading' && message?.role === 'assistant' && toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        console.log('filteredAndMappedMessages: 检测到 tool_calls', {
          messageId,
          toolCalls,
          toolCallsLength: toolCalls.length,
          messageStatus: i.status,
          messageRole: message?.role,
          source: extraToolCalls ? 'extra' : 'message',
          hasExtra: !!extraToolCalls,
          hasMessageToolCalls: !!messageToolCalls,
        });
      }
      
      if (!content && toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        // 生成tool_calls的描述性文本
        const functionNames = toolCalls.map((tc: any) => {
          const funcName = tc.function?.name || tc.name;
          return funcName || '未知函数';
        }).join('、');
        content = `正在执行函数调用：${functionNames}...`;
      }
      
      // Function Call 状态信息将通过 FunctionCallStatus 组件渲染，不再添加到 content 中
      
      // 构建返回的消息对象，确保不将非标准属性传递到 DOM
      const messageItem: any = {
        ...message,
        content: content, // 使用处理后的content
        key: i.id,
        status: i.status,
        loading: i.status === 'loading',
        // 添加 tool_calls 信息，供 contentRender 使用（用于流式显示）
        tool_calls: toolCalls,
        // 添加metadata信息，供footer和contentRender使用
        metadata: metadata || (checkpointId ? {
          checkpoint_id: checkpointId,
          has_workflow_changes: true,
          operation_type: 'AI' as const,
          function_calls: [],
        } : undefined),
      };
      
      // 存储到 ref 中，供 contentRender 使用
      messageItemsRef.current.set(messageId, messageItem);
      
      return messageItem;
    });
  }, [messages]);

  // ==================== 处理Function Calls ====================
  // 检查错误是否应该阻止继续发送给 AI
  const shouldStopOnError = React.useCallback((result: any): boolean => {
    if (!result || result.success) {
      return false; // 成功或没有错误，不阻止
    }
    
    const error = result.error;
    if (!error || !error.code) {
      return false; // 没有错误代码，不阻止
    }
    
    // 严重错误代码列表，这些错误不应该继续发送给 AI
    const criticalErrorCodes = [
      'API_ERROR',           // API 错误（如 400, 500 等）
      'NETWORK_ERROR',       // 网络错误
      'TIMEOUT_ERROR',       // 超时错误
      'AUTHENTICATION_ERROR', // 认证错误
      'PERMISSION_ERROR',    // 权限错误
      'VALIDATION_ERROR',    // 验证错误（通常是参数错误，重试无意义）
      'EXECUTION_ERROR',     // 执行错误（系统级错误，通常不应该重试）
    ];
    
    // 检查错误代码
    if (criticalErrorCodes.includes(error.code)) {
      return true; // 严重错误，应该停止
    }
    
    // 检查错误消息中是否包含特定关键词
    const errorMessage = (error.message || '').toLowerCase();
    const criticalErrorKeywords = [
      'status code 400',
      'status code 500',
      'request failed',
      'bad request',
      'internal server error',
      'unexpected end of json',  // JSON 解析错误
      'json',                    // JSON 相关错误
      'parse error',             // 解析错误
      'syntax error',            // 语法错误
      'invalid json',            // 无效 JSON
      'malformed',               // 格式错误
    ];
    
    // 检查是否包含严重错误关键词
    if (criticalErrorKeywords.some(keyword => errorMessage.includes(keyword))) {
      return true; // 包含严重错误关键词，应该停止
    }
    
    // 检查是否重复出现相同的错误（连续出现2次以上相同错误，应该停止）
    const errorKey = `${error.code}:${errorMessage}`;
    const errorCount = errorHistoryRef.current.get(errorKey) || 0;
    if (errorCount >= 2) {
      console.warn('processFunctionCalls: 检测到重复错误，停止继续', {
        errorKey,
        errorCount,
      });
      return true; // 重复错误，应该停止
    }
    
    // 记录错误出现次数
    errorHistoryRef.current.set(errorKey, errorCount + 1);
    
    return false; // 其他错误，允许继续
  }, []);

  // 监听messages变化，检测并处理Function Calls
  React.useEffect(() => {
    const processFunctionCalls = async () => {
      // 如果已停止，不再处理
      if (isAbortedRef.current) {
        // 减少日志输出，避免刷屏（只在第一次检测到停止时输出）
        // console.log('processFunctionCalls: 已停止，跳过处理');
        return;
      }
      
      if (!messages || messages.length === 0) return;
      if (!versionHistory || !workflow) return;
      
      // 获取最后一条assistant消息
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.message?.role !== 'assistant') {
        // 减少日志输出，避免刷屏
        // console.log('processFunctionCalls: 最后一条消息不是 assistant', {
        //   hasLastMessage: !!lastMessage,
        //   role: lastMessage?.message?.role,
        // });
        return;
      }
      
      // 检查流式传输是否已完成（状态不是 'loading'）
      // 如果还在流式传输中，等待完成
      if (lastMessage.status === 'loading') {
        // 减少日志输出，避免刷屏
        // console.log('processFunctionCalls: 消息还在流式传输中，等待完成', {
        //   status: lastMessage.status,
        //   message: lastMessage.message,
        // });
        return;
      }
      
      // 检查是否有tool_calls
      const toolCalls = (lastMessage.message as any)?.tool_calls;
      if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
        // 只在有 tool_calls 但为空时输出日志，避免大量日志
        if ((lastMessage.message as any)?.tool_calls !== undefined) {
          console.log('processFunctionCalls: tool_calls 为空或无效', {
            messageId: lastMessage.id,
            hasToolCalls: !!toolCalls,
            toolCallsType: typeof toolCalls,
            toolCallsIsArray: Array.isArray(toolCalls),
            toolCallsLength: Array.isArray(toolCalls) ? toolCalls.length : undefined,
            messageKeys: Object.keys(lastMessage.message || {}),
          });
        }
        return;
      }
      
      // 验证 tool_calls 是否完整（至少要有 function.name 和 id）
      const validToolCalls = toolCalls.filter((tc: any) => {
        const hasName = !!(tc.function?.name || tc.name);
        const hasId = !!tc.id;
        return hasName && hasId;
      });
      
      if (validToolCalls.length === 0) {
        console.log('processFunctionCalls: tool_calls 不完整，等待完整', {
          messageId: lastMessage.id,
          toolCallsCount: toolCalls.length,
          toolCalls: toolCalls.map((tc: any) => ({
            hasName: !!(tc.function?.name || tc.name),
            hasId: !!tc.id,
            name: tc.function?.name || tc.name,
            id: tc.id,
          })),
        });
        return;
      }
      
      // 检查是否已经处理过（通过检查是否有对应的tool响应）
      const hasToolResponse = messages.some(msg => 
        msg.message?.role === 'tool' && 
        validToolCalls.some((tc: any) => tc.id === (msg.message as any)?.tool_call_id)
      );
      if (hasToolResponse) {
        console.log('processFunctionCalls: 已经处理过，跳过', {
          messageId: lastMessage.id,
        });
        return; // 已经处理过
      }
      
      console.log('processFunctionCalls: 开始处理 Function Calls', {
        messageId: lastMessage.id,
        toolCallsCount: validToolCalls.length,
        toolCalls: validToolCalls.map((tc: any) => ({
          id: tc.id,
          name: tc.function?.name || tc.name,
          hasArguments: !!(tc.function?.arguments || tc.arguments),
          argumentsPreview: (tc.function?.arguments || tc.arguments || '').substring(0, 50),
        })),
      });
      
      const messageId = typeof lastMessage.id === 'string' ? lastMessage.id : String(lastMessage.id);
      
      // 检测是否有修改操作的Function Calls
      const hasModifyOperations = validToolCalls.some((tc: any) => {
        const functionName = tc.function?.name || tc.name;
        return isModifyOperation(functionName);
      });
      
      // 如果有修改操作，保存当前工作流状态（用于创建checkpoint）
      // 注意：这里不创建checkpoint，而是保存状态，真正的checkpoint在AI操作后创建
      const workflowBeforeAI = hasModifyOperations && workflow ? JSON.parse(JSON.stringify(workflow)) : null;
      
      // 处理Function Calls
      const functionCallResults: Array<{
        name: string;
        parameters: any;
        result?: any;
      }> = [];
      
      let hasWorkflowModification = false;
      let finalUpdatedWorkflow: Workflow | null = null;
      
      // 使用验证过的 tool_calls
      for (const toolCall of validToolCalls) {
        // 在执行前再次检查是否已停止
        if (isAbortedRef.current) {
          console.log('processFunctionCalls: 已停止，中断Function Call执行');
          return;
        }
        
        try {
          // 解析参数
          let parsedArguments = typeof toolCall.function?.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function?.arguments || toolCall.arguments || {};
          
          // 获取实际的工作流ID（优先使用 workflow.id，其次使用 propWorkflowId，最后从 window.workflow_id 获取）
          const actualWorkflowId = workflow?.id || workflowId || (typeof window !== 'undefined' ? (window as any).workflow_id : undefined);
          
          // 修复占位符：将"当前工作流ID"等占位符替换为实际值
          const fixPlaceholders = (obj: any): any => {
            if (typeof obj === 'string') {
              // 检查是否是占位符文本
              const placeholderPatterns = [
                '当前工作流ID',
                '当前工作流id',
                'workflow_id',
                'default',
                'current workflow id',
                'current workflow',
              ];
              const lowerObj = obj.toLowerCase();
              if (placeholderPatterns.some(pattern => obj === pattern || lowerObj === pattern.toLowerCase())) {
                return actualWorkflowId || '';
              }
              return obj;
            } else if (Array.isArray(obj)) {
              return obj.map(item => fixPlaceholders(item));
            } else if (obj && typeof obj === 'object') {
              const fixed: any = {};
              for (const key in obj) {
                fixed[key] = fixPlaceholders(obj[key]);
              }
              return fixed;
            }
            return obj;
          };
          
          parsedArguments = fixPlaceholders(parsedArguments);
          
          // 如果workflow_id字段存在但为空或者是占位符，用实际的workflowId替换
          if (parsedArguments.workflow_id && (
            parsedArguments.workflow_id === '当前工作流ID' ||
            parsedArguments.workflow_id === '当前工作流id' ||
            parsedArguments.workflow_id === 'workflow_id' ||
            parsedArguments.workflow_id === 'default' ||
            parsedArguments.workflow_id.toLowerCase() === 'current workflow id' ||
            parsedArguments.workflow_id.toLowerCase() === 'current workflow'
          )) {
            parsedArguments.workflow_id = actualWorkflowId || '';
          }
          // 如果workflow_id字段不存在但需要，自动添加
          if (!parsedArguments.workflow_id && actualWorkflowId) {
            // 检查这个函数是否需要workflow_id参数
            const functionName = toolCall.function?.name || toolCall.name;
            const functionsRequiringWorkflowId = [
              'add_node_to_workflow',
              'remove_node_from_workflow',
              'update_node_config',
              'auto_configure_node',
              'get_workflow_detail',
              'get_node_detail',
              'get_node_upstream_data_features',
              'update_workflow_connection',
              'remove_workflow_connection',
              'get_selected_objects_detail',
            ];
            if (functionsRequiringWorkflowId.includes(functionName)) {
              parsedArguments.workflow_id = actualWorkflowId;
            }
          }
          
          const functionCall: FunctionCall = {
            name: toolCall.function?.name || toolCall.name,
            arguments: parsedArguments,
            id: typeof toolCall.id === 'string' ? toolCall.id : String(toolCall.id),
          };
          
          // 构建上下文（使用实际的工作流ID）
          const context: FunctionCallContext = {
            workflowId: actualWorkflowId || undefined,
            selectedNodeIds,
            selectedEdgeIds,
            messageId,
          };
          
          // 执行Function Call
          const result = await executeFunctionCall(functionCall, context);
          
          // 执行后检查是否已停止
          if (isAbortedRef.current) {
            console.log('processFunctionCalls: 已停止，中断Function Call处理');
            return;
          }
          
          // 如果Function修改了工作流，记录更新后的工作流
          if (result.success && result.data?.workflow) {
            finalUpdatedWorkflow = result.data.workflow;
            
            // 如果是修改操作，标记为有工作流修改
            if (isModifyOperation(functionCall.name)) {
              hasWorkflowModification = true;
            }
          }
          
          // 记录Function Call结果（即使失败也要记录，用于显示）
          functionCallResults.push({
            name: functionCall.name,
            parameters: functionCall.arguments,
            result: result.success ? result.data : result.error,
          });
          
          // 检查是否是严重错误，如果是则不发送给 AI
          if (shouldStopOnError(result)) {
            console.warn('processFunctionCalls: 检测到严重错误，停止发送给 AI', {
              functionName: functionCall.name,
              error: result.error,
            });
            
            // 更新消息metadata，记录错误信息
            const currentMessageId = typeof lastMessage.id === 'string' ? lastMessage.id : String(lastMessage.id);
            const currentMetadata = messageMetadataRef.current.get(currentMessageId) || {};
            messageMetadataRef.current.set(currentMessageId, {
              ...currentMetadata,
              function_calls: functionCallResults,
              has_error: true,
              error_message: result.error?.message || '未知错误',
            });
            
            // 设置停止标志，防止继续处理
            isAbortedRef.current = true;
            
            // 不发送给 AI，但记录错误用于显示
            // 错误信息将通过系统消息显示
            return;
          }
          
          // 格式化结果并添加到消息历史中
          const formattedResult = formatFunctionCallResult(functionCall, result);
          
          // 检查格式化后的内容是否包含严重错误（content 是 JSON 字符串）
          try {
            const contentObj = JSON.parse(formattedResult.content);
            if (contentObj && contentObj.code && shouldStopOnError({ success: false, error: contentObj })) {
              console.warn('processFunctionCalls: 检测到严重错误（从 content 中），停止发送给 AI', {
                functionName: functionCall.name,
                error: contentObj,
              });
              
              // 更新消息metadata，记录错误信息
              const currentMessageId = typeof lastMessage.id === 'string' ? lastMessage.id : String(lastMessage.id);
              const currentMetadata = messageMetadataRef.current.get(currentMessageId) || {};
              messageMetadataRef.current.set(currentMessageId, {
                ...currentMetadata,
                function_calls: functionCallResults,
                has_error: true,
                error_message: contentObj.message || '未知错误',
              });
              
              // 设置停止标志，防止继续处理
              isAbortedRef.current = true;
              
              // 不发送给 AI，但记录错误用于显示
              return;
            }
          } catch (e) {
            // content 不是 JSON 格式，忽略
          }
          
          console.log('processFunctionCalls: 发送 tool 响应', {
            functionName: functionCall.name,
            toolCallId: formattedResult.tool_call_id,
            resultSuccess: result.success,
          });
          
          // 检查是否已停止，如果已停止则不发送tool响应
          if (isAbortedRef.current) {
            console.log('processFunctionCalls: 已停止，不发送tool响应');
            return;
          }
          
          // 将tool响应添加到消息历史中
          // 注意：发送 tool 响应后，AI 会自动继续对话
          // 再次检查是否已停止（防止在准备发送时被停止）
          if (!isAbortedRef.current) {
            onRequest({
              messages: [
                { role: 'tool', content: formattedResult.content, tool_call_id: formattedResult.tool_call_id, name: formattedResult.name } as any,
              ],
            });
          } else {
            console.log('processFunctionCalls: 在发送前检测到已停止，取消发送tool响应');
          }
        } catch (error: any) {
          console.error('Failed to execute function call:', error);
          
          // 检查是否已停止
          if (isAbortedRef.current) {
            console.log('processFunctionCalls: 已停止，不发送错误响应');
            return;
          }
          
          const errorResultData = {
            success: false,
            error: {
              code: 'EXECUTION_ERROR',
              message: error.message || 'Failed to execute function',
            },
          };
          
          // 记录错误结果
          functionCallResults.push({
            name: toolCall.function?.name || toolCall.name,
            parameters: typeof toolCall.function?.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function?.arguments || toolCall.arguments || {},
            result: errorResultData.error,
          });
          
          // 检查是否是严重错误
          if (shouldStopOnError(errorResultData)) {
            console.warn('processFunctionCalls: 检测到严重执行错误，停止发送给 AI', {
              functionName: toolCall.function?.name || toolCall.name,
              error: errorResultData.error,
            });
            
            // 更新消息metadata，记录错误信息
            const currentMessageId = typeof lastMessage.id === 'string' ? lastMessage.id : String(lastMessage.id);
            const currentMetadata = messageMetadataRef.current.get(currentMessageId) || {};
            messageMetadataRef.current.set(currentMessageId, {
              ...currentMetadata,
              function_calls: functionCallResults,
              has_error: true,
              error_message: errorResultData.error.message,
            });
            
            // 设置停止标志，防止继续处理
            isAbortedRef.current = true;
            
            // 不发送给 AI，但记录错误用于显示
            return;
          }
          
          const errorResult = formatFunctionCallResult(toolCall, errorResultData);
          
          // 再次检查是否已停止
          if (!isAbortedRef.current) {
            onRequest({
              messages: [
                { role: 'tool', content: errorResult.content, tool_call_id: errorResult.tool_call_id, name: errorResult.name } as any,
              ],
            });
          } else {
            console.log('processFunctionCalls: 在发送错误响应前检测到已停止，取消发送');
          }
        }
      }
      
      // 如果Function Calls中有修改操作，且成功修改了工作流，创建checkpoint并更新
      if (hasWorkflowModification && finalUpdatedWorkflow && workflowBeforeAI && versionHistory && onWorkflowUpdate) {
        // 创建AI操作的checkpoint（基于所有修改操作）
        // 使用第一个修改操作的名字作为操作名称，或者使用组合名称
        const modifyOperations = functionCallResults.filter(fc => isModifyOperation(fc.name));
        const operationName = modifyOperations.length > 0 
          ? modifyOperations[0].name 
          : 'AI_FUNCTION_CALLS';
        
        const checkpointId = createAICheckpoint(
          workflowBeforeAI,
          finalUpdatedWorkflow,
          versionHistory,
          operationName,
          { function_calls: functionCallResults },
          messageId
        );
        
        if (checkpointId) {
          messageCheckpointsRef.current.set(messageId, checkpointId);
          
          // 更新消息metadata
          messageMetadataRef.current.set(messageId, {
            checkpoint_id: checkpointId,
            has_workflow_changes: true,
            operation_type: 'AI',
            function_calls: functionCallResults,
          });
          
          // 保存到存储
          await versionHistory.saveToStorage();
        }
        
        // 更新工作流
        onWorkflowUpdate(finalUpdatedWorkflow);
      } else if (finalUpdatedWorkflow && onWorkflowUpdate) {
        // 即使没有修改操作，如果有工作流更新，也更新（可能是查询操作返回了工作流信息）
        onWorkflowUpdate(finalUpdatedWorkflow);
      }
    };
    
    processFunctionCalls();
  }, [messages, workflow, workflowId, selectedNodeIds, selectedEdgeIds, onWorkflowUpdate, versionHistory, onRequest, shouldStopOnError]);
  
  // 当会话切换时，重置停止标志和日志记录
  React.useEffect(() => {
    isAbortedRef.current = false;
    loggedMessageIdsRef.current.clear(); // 清除已记录的日志，新会话重新开始记录
    errorHistoryRef.current.clear(); // 清除错误历史记录
  }, [activeConversationKey]);

  // ==================== Event ====================
  const handleUserSubmit = async (val: string) => {
    // 重置停止标志，允许新的对话
    isAbortedRef.current = false;
    
    let userMessage = val;
    
    // 如果是首次对话，需要将系统提示词包含在请求中，但不显示在对话中
    const isFirstMessage = !systemPromptSentRef.current.get(activeConversationKey);
    let systemPromptToSend: string | undefined;
    if (isFirstMessage) {
      systemPromptToSend = generateSystemPrompt();
      systemPromptSentRef.current.set(activeConversationKey, true);
    }
    
    // 始终注入画布（工作流）上下文，如果有选中对象，再额外注入选中对象上下文
    const hasSelectedObjects = (selectedNodeIds && selectedNodeIds.length > 0) || (selectedEdgeIds && selectedEdgeIds.length > 0);
    const contextParts: string[] = [];
    
    // 1. 始终获取并注入画布（工作流）信息
    try {
      if (workflowId) {
        const context: FunctionCallContext = {
          workflowId: workflowId,
        };
        
        const result = await executeFunctionCall(
          {
            name: 'get_workflow_detail',
            arguments: {
              workflow_id: workflowId,
              include_operators: true,
              include_validation: false,
            },
          },
          context
        );
        
        if (result.success && result.data) {
          const workflow = result.data;
          const workflowContext = `## 当前工作流（画布）

**工作流名称**：${workflow.name || '未命名'}
**工作流ID**：${workflow.id || '未知'}
**节点数量**：${workflow.nodes?.length || 0}
**连接数量**：${workflow.connections?.length || 0}
${workflow.description ? `**描述**：${workflow.description}` : ''}

${workflow.nodes && workflow.nodes.length > 0 ? `**节点列表**：
${workflow.nodes.map((node: any, idx: number) => `  ${idx + 1}. ${node.label || node.id} (${node.operatorId || '未指定算子'})`).join('\n')}` : '**节点列表**：暂无节点'}

${workflow.connections && workflow.connections.length > 0 ? `**连接列表**：
${workflow.connections.map((conn: any, idx: number) => `  ${idx + 1}. ${conn.from?.node || '未知'} → ${conn.to?.node || '未知'}`).join('\n')}` : '**连接列表**：暂无连接'}`;
          
          contextParts.push(workflowContext);
        }
      }
    } catch (error) {
      console.error('Failed to get workflow detail:', error);
    }
    
    // 2. 如果有选中对象，额外获取并注入选中对象信息
    if (hasSelectedObjects) {
      try {
        const context: FunctionCallContext = {
          workflowId: workflowId,
          selectedNodeIds,
          selectedEdgeIds,
        };
        
        const result = await executeFunctionCall(
          {
            name: 'get_selected_objects_detail',
            arguments: {
              workflow_id: workflowId || '',
              node_ids: selectedNodeIds || [],
              edge_ids: selectedEdgeIds || [],
              include_operator_info: true,
              include_connections: true,
            },
          },
          context
        );
        
        if (result.success && result.data) {
          const selectedObjectsContext = formatSelectedObjectsContext(result.data);
          contextParts.push(selectedObjectsContext);
        }
      } catch (error) {
        console.error('Failed to get selected objects detail:', error);
      }
    }
    
    // 3. 组合所有上下文
    if (contextParts.length > 0) {
      userMessage = `${contextParts.join('\n\n')}\n\n用户消息：${val}`;
    }
    
    // 在用户消息前添加提醒（确保AI遵循要求）
    // 如果不是首次对话，在消息前添加系统提示词的关键要求
    if (!isFirstMessage) {
      // 如果不是首次对话，在消息前添加关键提醒
      userMessage = `[重要提醒：在调用任何函数前，必须先输出描述性文字说明你正在做什么，禁止只返回tool_calls而不包含content]\n\n${userMessage}`;
    }
    
    // 构建要发送的消息列表
    const messagesToSend: any[] = [];
    
    // 如果是首次对话，需要包含系统提示词
    // 检查API是否支持system role（通过检查baseURL）
    const currentModelConfig = (selectedModelId && getLLMConfigById(selectedModelId)) || getDefaultLLMConfig();
    const baseURL = currentModelConfig?.baseURL || '';
    const isAntDesignXProxy = baseURL.includes('api.x.ant.design') || baseURL.includes('x.ant.design');
    
    if (systemPromptToSend) {
      // Ant Design X 代理可能支持 system role，其他API可能不支持
      // 如果不支持，将系统提示词作为第一条user消息的一部分
      if (isAntDesignXProxy) {
        // Ant Design X 代理支持 system role
        messagesToSend.push({ role: 'system', content: systemPromptToSend });
      } else {
        // 其他API可能不支持system role，将系统提示词添加到用户消息中
        // 但这样会在对话中显示，所以我们需要在过滤时隐藏包含系统提示词的消息
        // 更好的方式：将系统提示词作为第一条assistant消息发送，然后在过滤时隐藏
        // 或者：不发送system消息，而是在每次请求时都包含系统提示词（但这会导致重复）
        // 暂时使用system role，如果API不支持会返回错误，我们会在过滤时隐藏错误消息
        try {
          messagesToSend.push({ role: 'system', content: systemPromptToSend });
        } catch (e) {
          // 如果API不支持，fallback到将系统提示词添加到用户消息
          userMessage = `${systemPromptToSend}\n\n${userMessage}`;
        }
      }
    }
    
    // 添加用户消息
    messagesToSend.push({ role: 'user', content: userMessage });
    
    // 检查是否已停止（虽然已经重置，但双重检查确保安全）
    if (!isAbortedRef.current) {
      onRequest({
        messages: messagesToSend,
      });
      listRef.current?.scrollTo({ top: 'bottom' });
    } else {
      console.log('handleUserSubmit: 检测到已停止，取消发送请求');
      message.warning('对话已停止，请重新开始');
    }

    // session title mock
    const conversation = getConversation(activeConversationKey);
    if (conversation?.label === 'new session') {
      setConversation(activeConversationKey, { ...conversation, label: val?.slice(0, 20) });
    }
  };

  // 处理AI操作回滚（使用 useCallback 稳定引用）
  const handleRollback = React.useCallback((messageId: string, checkpointId: string) => {
    if (!versionHistory || !workflow || !onWorkflowUpdate) {
      message.error('无法回滚：缺少必要的上下文');
      return;
    }

    Modal.confirm({
      title: '确认回滚',
      content: '确定要回滚到修改前的版本吗？这将撤销该消息导致的所有工作流修改。',
      okText: '确认回滚',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const rollbackWorkflow = await rollbackAIOperation(
            messageId,
            checkpointId,
            workflow,
            versionHistory
          );
          
          if (rollbackWorkflow) {
            onWorkflowUpdate(rollbackWorkflow);
            message.success('工作流已回滚到修改前的版本');
          } else {
            message.error('回滚失败：无法重建工作流版本');
          }
        } catch (error: any) {
          message.error('回滚失败：' + error.message);
        }
      },
    });
  }, [versionHistory, workflow, onWorkflowUpdate]);

  // 创建role配置（使用 useMemo 稳定引用，避免无限循环）
  const roleConfig: BubbleListProps['role'] = React.useMemo(() => ({
    assistant: {
      placement: 'start',
      variant: 'borderless',
      footer: (message: any) => {
        // 在assistant消息中显示回滚按钮（如果该消息包含工作流修改）
        const messageId = typeof message?.key === 'string' ? message.key : String(message?.key || message?.id || '');
        const metadata = message?.metadata || messageMetadataRef.current.get(messageId);
        const checkpointId = metadata?.checkpoint_id || messageCheckpointsRef.current.get(messageId);
        
        // 检查是否包含工作流修改
        const hasWorkflowChanges = metadata?.has_workflow_changes || !!checkpointId;
        
        // 公共按钮
        const commonButtons = (
          <>
            <Button type="text" size="small" icon={<ReloadOutlined />} title="重新生成" />
            <Button type="text" size="small" icon={<CopyOutlined />} title="复制" />
            {/* <Button type="text" size="small" icon={<LikeOutlined />} title="点赞" />
            <Button type="text" size="small" icon={<DislikeOutlined />} title="点踩" /> */}
          </>
        );
        
        // 如果有工作流修改且有checkpoint，添加回滚按钮
        if (hasWorkflowChanges && checkpointId && versionHistory) {
          return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {commonButtons}
              <Button
                type="text"
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => handleRollback(messageId, checkpointId)}
                title="回滚到修改前版本"
                danger
              />
            </div>
          );
        }
        
        // 普通消息的footer
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {commonButtons}
          </div>
        );
      },
      contentRender(content: string, message?: any) {
        // 移除 content.replace，让 XMarkdown 正确处理 markdown 格式
        // const newContent = content.replace(/\n\n/g, '<br/><br/>');
        const newContent = content;
        
        // 获取 Function Call 信息
        // 从 message.metadata 或 messageMetadataRef 中获取
        const messageId = message?.key || message?.id;
        const metadata = message?.metadata || (messageId ? messageMetadataRef.current.get(String(messageId)) : null);
        const functionCalls = metadata?.function_calls;
        
        // 获取流式传输中的 tool_calls（用于实时显示）
        // 优先从 messagesRef 中获取最新的 tool_calls（流式传输时实时更新）
        let streamingToolCalls: any[] | undefined;
        let isStreaming = false;
        
        // 从 messagesRef 中查找对应的消息，获取最新的 tool_calls
        if (messageId && messagesRef.current) {
          const foundMessage = messagesRef.current.find((msg: any) => {
            const msgId = typeof msg.id === 'string' ? msg.id : String(msg.id || '');
            return msgId === String(messageId);
          });
          if (foundMessage) {
            streamingToolCalls = (foundMessage.message as any)?.tool_calls;
            isStreaming = foundMessage.status === 'loading';
            
            // 调试：检查是否从 messagesRef 中找到了 tool_calls（每个 messageId 只输出一次）
            if (streamingToolCalls && Array.isArray(streamingToolCalls) && streamingToolCalls.length > 0) {
              const logKey = `${messageId}_messagesRef`;
              if (!loggedMessageIdsRef.current.has(logKey)) {
                loggedMessageIdsRef.current.add(logKey);
                console.log('contentRender: 从 messagesRef 获取到 tool_calls', {
                  messageId,
                  source: 'messagesRef',
                  toolCallsCount: streamingToolCalls.length,
                  isStreaming,
                });
              }
            }
          }
        }
        
        // 如果 messages 中没有，尝试从 messageItemsRef 中获取
        if (!streamingToolCalls && messageId) {
          const fullMessage = messageItemsRef.current.get(String(messageId));
          if (fullMessage) {
            streamingToolCalls = fullMessage.tool_calls;
            isStreaming = fullMessage.loading || fullMessage.status === 'loading';
            
            // 调试：检查是否从 messageItemsRef 中找到了 tool_calls（每个 messageId 只输出一次）
            if (streamingToolCalls && Array.isArray(streamingToolCalls) && streamingToolCalls.length > 0) {
              const logKey = `${messageId}_messageItemsRef`;
              if (!loggedMessageIdsRef.current.has(logKey)) {
                loggedMessageIdsRef.current.add(logKey);
                console.log('contentRender: 从 messageItemsRef 获取到 tool_calls', {
                  messageId,
                  source: 'messageItemsRef',
                  toolCallsCount: streamingToolCalls.length,
                  isStreaming,
                });
              }
            }
          }
        }
        
        // 最后尝试从 message 参数中获取
        if (!streamingToolCalls) {
          streamingToolCalls = message?.tool_calls;
          isStreaming = message?.loading || message?.status === 'loading';
          
          // 调试：检查是否从 message 参数中找到了 tool_calls（每个 messageId 只输出一次）
          if (streamingToolCalls && Array.isArray(streamingToolCalls) && streamingToolCalls.length > 0) {
            const logKey = `${messageId}_messageParam`;
            if (!loggedMessageIdsRef.current.has(logKey)) {
              loggedMessageIdsRef.current.add(logKey);
              console.log('contentRender: 从 message 参数获取到 tool_calls', {
                messageId,
                source: 'messageParam',
                toolCallsCount: streamingToolCalls.length,
                isStreaming,
              });
            }
          }
        }
        
        // 获取对应的 tool 响应数据
        // 优先从 metadata 中的 function_calls 获取（包含执行结果）
        // 其次从 messages 中获取 tool 响应
        const toolResponses: Array<{ tool_call_id?: string; name?: string; content?: string }> = [];
        
        // 从 metadata 中的 function_calls 构建响应数据
        // 优先使用 metadata 中的数据，因为它包含完整的执行结果（包括错误）
        if (messageId && functionCalls && Array.isArray(functionCalls) && streamingToolCalls) {
          streamingToolCalls.forEach((toolCall: any) => {
            const toolCallId = toolCall.id;
            const functionName = toolCall.function?.name || toolCall.name;
            
            // 查找对应的 function call 结果
            const functionCallResult = functionCalls.find((fc: any) => fc.name === functionName);
            if (functionCallResult && functionCallResult.result !== undefined) {
              // 构建响应内容
              let responseContent = '';
              if (functionCallResult.result) {
                try {
                  // 如果 result 是对象，转换为 JSON 字符串
                  if (typeof functionCallResult.result === 'object') {
                    responseContent = JSON.stringify(functionCallResult.result, null, 2);
                  } else {
                    responseContent = String(functionCallResult.result);
                  }
                } catch (e) {
                  responseContent = String(functionCallResult.result);
                }
              }
              
              // 如果响应内容为空，但 result 存在，说明可能是空对象或空字符串
              // 这种情况下也应该显示响应（即使是空的）
              toolResponses.push({
                tool_call_id: toolCallId,
                name: functionName,
                content: responseContent || (functionCallResult.result !== null && functionCallResult.result !== undefined ? JSON.stringify(functionCallResult.result) : ''),
              });
            }
          });
        }
        
        // 如果 metadata 中没有，从 messages 中获取 tool 响应
        if (toolResponses.length === 0 && messageId && streamingToolCalls && messagesRef.current) {
          // 找到当前 assistant 消息之后的所有 tool 响应
          const currentMessageIndex = messagesRef.current.findIndex((msg: any) => {
            const msgId = typeof msg.id === 'string' ? msg.id : String(msg.id || '');
            return msgId === String(messageId);
          });
          
          if (currentMessageIndex >= 0) {
            // 获取当前消息之后的所有 tool 响应
            const toolCallIds = new Set(
              streamingToolCalls.map((tc: any) => tc.id).filter((id: any) => id)
            );
            
            for (let i = currentMessageIndex + 1; i < messagesRef.current.length; i++) {
              const msg = messagesRef.current[i];
              if (msg.message?.role === 'tool' && (msg.message as any)?.tool_call_id) {
                const toolCallId = (msg.message as any).tool_call_id;
                if (toolCallIds.has(toolCallId)) {
                  toolResponses.push({
                    tool_call_id: toolCallId,
                    name: (msg.message as any).name,
                    content: typeof msg.message.content === 'string' 
                      ? msg.message.content 
                      : String(msg.message.content || ''),
                  });
                }
              }
            }
          }
        }
        
        // 调试日志（开发时使用）- 每个 messageId 只输出一次
        if (messageId && streamingToolCalls && Array.isArray(streamingToolCalls) && streamingToolCalls.length > 0) {
          const logKey = `${messageId}_ToolCallsStreamDisplay`;
          if (!loggedMessageIdsRef.current.has(logKey)) {
            loggedMessageIdsRef.current.add(logKey);
            console.log('ToolCallsStreamDisplay: 准备显示 tool_calls', {
              messageId,
              toolCallsCount: streamingToolCalls.length,
              toolResponsesCount: toolResponses.length,
              toolCalls: streamingToolCalls.map((tc: any) => ({
                name: tc.function?.name || tc.name,
                hasArguments: !!(tc.function?.arguments || tc.arguments),
                argumentsLength: (tc.function?.arguments || tc.arguments || '').length,
              })),
              isStreaming,
            });
          }
        }
        
        // 检查是否有错误消息需要显示
        const errorMessage = metadata?.error_message;
        const hasError = metadata?.has_error;
        
        return (
          <>
            <XMarkdown
              content={newContent}
              components={{
                think: ThinkComponent,
                code: CodeComponent,
                p: ParagraphComponent,
              }}
            />
            {/* 显示流式传输中的 tool_calls */}
            {streamingToolCalls && Array.isArray(streamingToolCalls) && streamingToolCalls.length > 0 && (
              <ToolCallsStreamDisplay 
                toolCalls={streamingToolCalls} 
                toolResponses={toolResponses}
                isStreaming={isStreaming && !hasError} // 如果有错误，不再显示为流式传输中
              />
            )}
            {/* 显示错误系统消息 */}
            {hasError && errorMessage && (
              <Bubble.System
                variant="borderless"
                content={
                  <Space>
                    <span className='text-xs'>⚠️ 函数执行失败：{errorMessage}，已停止继续对话</span>
                    {/* <Typography.Link 
                      onClick={() => {
                        // 清除错误消息
                        if (messageId) {
                          const currentMetadata = messageMetadataRef.current.get(String(messageId));
                          if (currentMetadata) {
                            messageMetadataRef.current.set(String(messageId), {
                              ...currentMetadata,
                              has_error: false,
                              error_message: undefined,
                            });
                            // 触发重新渲染
                            forceUpdate({});
                          }
                        }
                      }}
                    >
                      确定
                    </Typography.Link> */}
                  </Space>
                }
              />
            )}
            {/* 显示已完成的 Function Call 状态 */}
            {/* 暂时隐藏 FunctionCallStatus，因为 ToolCallsStreamDisplay 已经显示状态 */}
            {/* {functionCalls && Array.isArray(functionCalls) && functionCalls.length > 0 && (
              <FunctionCallStatus functionCalls={functionCalls} />
            )} */}
          </>
        );
      },
    },
    user: {
      placement: 'end',
      contentRender(content: string, message?: any) {
        // 检查消息是否包含 contextParts（格式：contextParts + "---\n\n用户消息：用户实际消息"）
        // 或者可能包含系统提醒（格式：[重要提醒：...]\n\ncontextParts + "---\n\n用户消息：用户实际消息"）
        const userMessageSeparator = '\n\n用户消息：';
        const separatorIndex = content.indexOf(userMessageSeparator);
        
        if (separatorIndex >= 0) {
          // 分离 contextParts 和用户消息
          const contextPartsContent = content.substring(0, separatorIndex);
          const actualUserMessage = content.substring(separatorIndex + userMessageSeparator.length);
          
          // 检查是否还有系统提醒（格式：[重要提醒：...]\n\n）
          let systemReminder = '';
          let displayContextParts = contextPartsContent;
          const reminderMatch = contextPartsContent.match(/^\[重要提醒：([^\]]+)\]\n\n(.*)$/s);
          if (reminderMatch) {
            systemReminder = reminderMatch[1];
            displayContextParts = reminderMatch[2] || '';
          }
          
          return (
            <>
              {systemReminder && (
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '8px 12px', 
                  backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  ⚠️ {systemReminder}
                </div>
              )}
              {displayContextParts && (
                <Collapse
                  size="small"
                  defaultActiveKey={[]}
                  items={[{
                    key: 'context',
                    label: '上下文',
                    children: (
                      <XMarkdown
                        content={displayContextParts}
                        components={{
                          code: CodeComponent,
                          p: ParagraphComponent,
                        }}
                      />
                    ),
                  }]}
                  style={{ marginBottom: '10px' }}
                />
              )}
              {actualUserMessage && (
                <div style={{ 
                  marginTop: displayContextParts ? '12px' : '0', 
                  paddingTop: displayContextParts ? '12px' : '0', 
                  borderTop: displayContextParts ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' 
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px', color: 'rgba(255, 255, 255, 0.9)' }}>用户消息：</div>
                  <div>{actualUserMessage}</div>
                </div>
              )}
            </>
          );
        }
        
        // 如果没有分隔符，检查是否只有系统提醒
        const reminderOnlyMatch = content.match(/^\[重要提醒：([^\]]+)\]\n\n(.*)$/s);
        if (reminderOnlyMatch) {
          return (
            <>
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px 12px', 
                backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '4px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                ⚠️ {reminderOnlyMatch[1]}
              </div>
              <div>{reminderOnlyMatch[2]}</div>
            </>
          );
        }
        
        // 如果没有分隔符，说明是普通用户消息，直接显示
        return <div>{content}</div>;
      },
    },
  }), [handleRollback, versionHistory, activeConversationKey]); // roleConfig 依赖 handleRollback、versionHistory 和 activeConversationKey

  const onPasteFile = (files: FileList) => {
    for (const file of files) {
      attachmentsRef.current?.upload(file);
    }
    setAttachmentsOpen(true);
  };

  // ==================== Nodes ====================
  const chatHeader = (
    <div className="chatHeader">
      <div className="headerTitle flex flex-row items-center gap-2"><BsStars /> AI 助手</div>
      <Space size={0}>
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            if (messages?.length) {
              const timeNow = dayjs().valueOf().toString();
              addConversation({ key: timeNow, label: 'New session', group: 'Today' });
              setActiveConversationKey(timeNow);
            } else {
              message.error('这已经是一个新对话了');
            }
          }}
          className="headerButton"
        />
        <Popover
          placement="bottom"
          styles={{ container: { padding: 0, maxHeight: 600 } }}
          content={
            <Conversations
              items={conversations?.map((i) =>
                i.key === activeConversationKey ? { ...i, label: `[current] ${i.label}` } : i,
              )}
              activeKey={activeConversationKey}
              groupable
              onActiveChange={setActiveConversationKey}
              styles={{ item: { padding: '0 8px' } }}
              className="conversations"
            />
          }
        >
          <Button type="text" icon={<CommentOutlined />} className="headerButton" />
        </Popover>
      </Space>
    </div>
  );
  const chatList = (
    <div className="chatList">
      {messages?.length ? (
        /** 消息列表 */
        <Bubble.List
          ref={listRef}
          style={{ paddingInline: 16 }}
          items={filteredAndMappedMessages}
          role={roleConfig as BubbleListProps['role']}
        />
      ) : (
        /** 没有消息时的 welcome */
        <>
          {/* <Welcome
            variant="borderless"
            title="👋 你好，我是 AI 助手"
            description="基于 Ant Design X"
            className="chatWelcome"
          /> */}

          <Prompts
            vertical
            title="我能帮助你"
            items={MOCK_QUESTIONS.map((i) => ({ key: i, description: i }))}
            onItemClick={(info) => handleUserSubmit(info?.data?.description as string)}
            style={{
              marginInline: 16,
            }}
            styles={{
              title: { fontSize: 14 },
            }}
          />
        </>
      )}
    </div>
  );
  const sendHeader = (
    <Sender.Header
      title="上传文件"
      styles={{ content: { padding: 0 } }}
      open={attachmentsOpen}
      onOpenChange={setAttachmentsOpen}
      forceRender
    >
      <Attachments
        ref={attachmentsRef}
        beforeUpload={() => false}
        items={files}
        onChange={({ fileList }) => setFiles(fileList)}
        placeholder={(type) =>
          type === 'drop'
            ? { title: '拖拽文件到这里' }
            : {
                icon: <CloudUploadOutlined />,
                title: '上传文件',
                description: '点击或拖拽文件到此区域上传',
              }
        }
      />
    </Sender.Header>
  );
  // 处理模型选择变化
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    // 清除所有会话的所有 provider 缓存，确保使用最新配置
    providerCaches.clear();
    message.success('模型已切换，新对话将使用新模型');
  };

  const chatSender = (
    <Flex vertical gap={12} className="chatSend">
      <Flex gap={12} align="center">
        <Select
          value={selectedModelId || modelConfigs.defaultId}
          onChange={handleModelChange}
          style={{ minWidth: 120 }}
          variant='filled'
          size='small'
          placeholder="选择模型"
          options={modelConfigs.configs.map(config => ({
            label: (
              <Space>
                <span>{config.name}</span>
                {/* {config.id === modelConfigs.defaultId && (
                  <Tag color="green">默认</Tag>
                )} */}
              </Space>
            ),
            value: config.id,
          }))}
        />
        {/* <Button
          icon={<ProductOutlined />}
          onClick={() => handleUserSubmit('帮我优化节点的配置')}
        >
          优化配置
        </Button> */}
        <Button size='small' variant='text' icon={<AppstoreAddOutlined />} />
      </Flex>
      {/** 输入框 */}
      <Suggestion 
        items={React.useMemo(() => generateSuggestions(selectedNodeIds || [], selectedEdgeIds || []), [selectedNodeIds, selectedEdgeIds])} 
        onSelect={(itemVal) => setInputValue(itemVal)}
      >
        {({ onTrigger, onKeyDown }) => (
          <Sender
            loading={isRequesting}
            value={inputValue}
            onChange={(v) => {
              onTrigger(v === '/');
              setInputValue(v);
            }}
            onSubmit={() => {
              handleUserSubmit(inputValue);
              setInputValue('');
            }}
            onCancel={() => {
              // 设置停止标志
              isAbortedRef.current = true;
              // 停止请求
              abort();
              message.info('已停止对话');
            }}
            allowSpeech
            placeholder="提问或输入使用技能"
            onKeyDown={onKeyDown}
            header={sendHeader}
            prefix={
              <Button
                type="text"
                icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                onClick={() => setAttachmentsOpen(!attachmentsOpen)}
              />
            }
            onPasteFile={onPasteFile}
          />
        )}
      </Suggestion>
    </Flex>
  );

  return (
   <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/** 对话区 - header */}
      {chatHeader}

      {/** 对话区 - 消息列表 */}
      {chatList}

      {/** 选中对象面板 */}
      <SelectedObjectsPanel
        selectedNodeIds={selectedNodeIds || []}
        selectedEdgeIds={selectedEdgeIds || []}
        workflow={workflow || null}
        operators={operators}
        onRemoveNode={(nodeId) => {
          // 从选中列表中移除节点 - 通过父组件更新
          // 需要父组件提供更新函数，暂时不实现
          console.log('Remove node:', nodeId);
        }}
        onRemoveEdge={(edgeId) => {
          // 从选中列表中移除边 - 通过父组件更新
          // 需要父组件提供更新函数，暂时不实现
          console.log('Remove edge:', edgeId);
        }}
        onClearAll={onClearSelection}
      />

      {/** 对话区 - 输入框 */}
      {chatSender}

    </div>
  );
};

export default AIChatPanel;


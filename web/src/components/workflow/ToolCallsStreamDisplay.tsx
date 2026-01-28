/**
 * Tool Calls 流式显示组件
 * 用于实时显示流式传输过程中的 tool_calls
 */

import React from 'react';
import { Tag, Space, Spin, Collapse } from 'antd';
import { LoadingOutlined, CodeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
  name?: string;
  arguments?: string;
}

interface ToolResponse {
  tool_call_id?: string;
  name?: string;
  content?: string;
}

interface ToolCallsStreamDisplayProps {
  toolCalls?: ToolCall[];
  toolResponses?: ToolResponse[]; // tool 响应数据
  isStreaming?: boolean;
}

/**
 * Tool Calls 流式显示组件
 * 实时显示流式传输中的 tool_calls，包括函数名、参数、响应和状态
 */
const ToolCallsStreamDisplay: React.FC<ToolCallsStreamDisplayProps> = ({ 
  toolCalls, 
  toolResponses = [],
  isStreaming = false 
}) => {
  if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
    return null;
  }

  // 创建 tool_call_id 到 toolResponse 的映射
  const responseMap = new Map<string, ToolResponse>();
  toolResponses.forEach((response) => {
    if (response.tool_call_id) {
      responseMap.set(response.tool_call_id, response);
    }
  });

  // 计算整体状态：如果有任何失败，显示失败；如果全部成功，显示成功；否则显示调用中
  const overallStatus = React.useMemo(() => {
    if (!toolCalls || toolCalls.length === 0) return null;
    
    let hasError = false;
    let hasSuccess = false;
    let allHaveResponse = true;
    
    toolCalls.forEach((toolCall: any) => {
      const toolCallId = toolCall.id;
      const response = toolCallId ? responseMap.get(toolCallId) : null;
      
      if (response && response.content) {
        try {
          const responseContent = JSON.parse(response.content || '{}');
          if (responseContent.code || responseContent.error) {
            hasError = true;
          } else {
            hasSuccess = true;
          }
        } catch (e) {
          const contentLower = (response.content || '').toLowerCase();
          if (contentLower.includes('error') || contentLower.includes('失败')) {
            hasError = true;
          } else if (response.content.trim() !== '') {
            hasSuccess = true;
          }
        }
      } else {
        allHaveResponse = false;
      }
    });
    
    if (hasError) {
      return { type: 'error', text: '调用失败', color: '#ff4d4f', icon: <CloseCircleOutlined style={{ fontSize: '12px' }} /> };
    } else if (allHaveResponse && hasSuccess) {
      return { type: 'success', text: '调用成功', color: '#52c41a', icon: <CheckCircleOutlined style={{ fontSize: '12px' }} /> };
    } else if (isStreaming) {
      return { type: 'loading', text: '调用中...', color: 'rgba(255, 255, 255, 0.6)', icon: <LoadingOutlined style={{ fontSize: '12px' }} spin /> };
    }
    return null;
  }, [toolCalls, toolResponses, isStreaming, responseMap]);

  return (
    <div
      style={{
        fontSize: '12px',
        lineHeight: '1.5',
        padding: '12px',
        backgroundColor: 'rgba(64, 64, 64, 0.6)', // 深灰色背景
        borderRadius: '6px',
        marginTop: '12px',
        border: '1px solid rgba(128, 128, 128, 0.3)',
      }}
    >
      <div style={{ 
        marginBottom: '8px', 
        fontWeight: 500, 
        color: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CodeOutlined style={{ fontSize: '14px' }} />
          <span>函数调用</span>
          {isStreaming && !overallStatus && (
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)' }} spin />} 
              size="small"
            />
          )}
        </div>
        {overallStatus && (
          <span style={{ 
            fontSize: '11px', 
            color: overallStatus.color,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {overallStatus.icon}
            {overallStatus.text}
          </span>
        )}
      </div>
      <Space orientation="vertical" size={8} style={{ width: '100%' }}>
        {toolCalls.map((toolCall, index) => {
          const functionName = toolCall.function?.name || toolCall.name || '未知函数';
          const argumentsStr = toolCall.function?.arguments || toolCall.arguments || '';
          const toolCallId = toolCall.id;
          
          // 获取对应的响应
          const response = toolCallId ? responseMap.get(toolCallId) : null;
          
          // 判断状态（用于响应内容的样式）
          let status: 'loading' | 'success' | 'error' = 'loading';
          
          if (response && response.content) {
            // 有响应内容，尝试解析判断状态
            try {
              const responseContent = JSON.parse(response.content || '{}');
              // 检查是否有错误字段
              if (responseContent.code || responseContent.error || (responseContent.message && responseContent.code)) {
                status = 'error';
              } else {
                status = 'success';
              }
            } catch (e) {
              // 如果解析失败，检查是否是错误消息
              const contentLower = (response.content || '').toLowerCase();
              if (contentLower.includes('error') || 
                  contentLower.includes('失败') || 
                  contentLower.includes('exception') ||
                  contentLower.includes('code') && contentLower.includes('message')) {
                status = 'error';
              } else if (response.content.trim() !== '') {
                status = 'success';
              } else if (isStreaming) {
                status = 'loading';
              }
            }
          } else if (isStreaming) {
            status = 'loading';
          }
          
          // 尝试解析参数（如果可能）
          let parsedArgs: any = null;
          let argsDisplay = '';
          if (argumentsStr) {
            try {
              // 如果参数是完整的 JSON，尝试解析
              parsedArgs = JSON.parse(argumentsStr);
              argsDisplay = JSON.stringify(parsedArgs, null, 2);
            } catch (e) {
              // 如果解析失败，说明还在流式传输中，直接显示原始字符串
              argsDisplay = argumentsStr;
            }
          }

          // 解析响应内容用于显示
          let responseDisplay = '';
          let responseParsed: any = null;
          if (response?.content) {
            try {
              responseParsed = JSON.parse(response.content);
              responseDisplay = JSON.stringify(responseParsed, null, 2);
            } catch (e) {
              responseDisplay = response.content;
            }
          }

          return (
            <div
              key={toolCall.id || index}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* 函数名和状态 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '6px',
                marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <Tag 
                    color="default" 
                    style={{ 
                      fontSize: '11px',
                      padding: '2px 6px',
                      margin: 0,
                      backgroundColor: 'rgba(128, 128, 128, 0.3)',
                      borderColor: 'rgba(128, 128, 128, 0.5)',
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    {functionName}
                  </Tag>
                  {/* 删除状态图标和文字，因为标题右边已经显示了整体状态 */}
                  {/* {statusIcon}
                  <span style={{ 
                    fontSize: '11px', 
                    color: statusColor,
                    fontWeight: 500,
                  }}>
                    {statusText}
                  </span> */}
                </div>
              </div>

              {/* 请求参数 */}
              {argumentsStr && (
                <Collapse
                  size="small"
                  items={[{
                    key: 'request',
                    label: '请求参数',
                    children: (
                      <div
                        style={{
                          padding: '2px 4px',
                          // backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          // borderRadius: '3px',
                          fontSize: '11px',
                          fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                          color: 'rgba(255, 255, 255, 0.8)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          // border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {argsDisplay}
                        {isStreaming && !response && (
                          <span style={{ 
                            display: 'inline-block',
                            width: '6px',
                            height: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            marginLeft: '2px',
                            animation: 'blink 1s infinite',
                          }} />
                        )}
                      </div>
                    ),
                  }]}
                  style={{
                    backgroundColor: 'transparent',
                    marginBottom: response ? '8px' : '0',
                  }}
                  styles={{
                    header: {
                      backgroundColor: 'transparent',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  } as any}
                />
              )}

              {/* 响应内容（默认折叠） */}
              {response && responseDisplay && (
                <Collapse
                  size="small"
                  defaultActiveKey={[]}
                  items={[{
                    key: 'response',
                    label: `响应内容${status === 'error' ? ' (失败)' : ' (成功)'}`,
                    children: (
                      <div
                        style={{
                          padding: '2px 4px',
                          // backgroundColor: status === 'error' 
                          //   ? 'rgba(255, 77, 79, 0.1)' 
                          //   : 'rgba(82, 196, 26, 0.1)',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                          // color: status === 'error' 
                          //   ? 'rgba(255, 77, 79, 0.9)' 
                          //   : 'rgba(82, 196, 26, 0.9)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          // border: `1px solid ${status === 'error' ? 'rgba(255, 77, 79, 0.3)' : 'rgba(82, 196, 26, 0.3)'}`,
                        }}
                      >
                        {responseDisplay}
                      </div>
                    ),
                  }]}
                  style={{
                    backgroundColor: 'transparent',
                  }}
                  styles={{
                    header: {
                      backgroundColor: 'transparent',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: status === 'error' 
                        ? 'rgba(255, 77, 79, 0.8)' 
                        : 'rgba(82, 196, 26, 0.8)',
                    },
                  } as any}
                />
              )}
            </div>
          );
        })}
      </Space>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ToolCallsStreamDisplay;

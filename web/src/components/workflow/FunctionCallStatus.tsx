/**
 * Function Call 状态显示组件
 * 用于在 AI 对话中显示函数调用信息和执行状态
 */

import React from 'react';
import { Tag, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';

interface FunctionCallInfo {
  name: string;
  parameters?: any;
  result?: any;
}

interface FunctionCallStatusProps {
  functionCalls: FunctionCallInfo[];
}

/**
 * Function Call 状态组件
 * 以小字号和固定高度显示函数调用信息
 */
const FunctionCallStatus: React.FC<FunctionCallStatusProps> = ({ functionCalls }) => {
  if (!functionCalls || functionCalls.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        fontSize: '12px',
        lineHeight: '1.4',
        maxHeight: '120px',
        overflowY: 'auto',
        padding: '8px 12px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
        marginTop: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ marginBottom: '6px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>
        函数调用状态：
      </div>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {functionCalls.map((fc, index) => {
          // 判断执行状态
          const hasError = fc.result && (fc.result.code || fc.result.message);
          const isSuccess = fc.result !== undefined && fc.result !== null && !hasError;
          const isPending = fc.result === undefined || fc.result === null;

          // 获取状态信息
          let statusIcon: React.ReactNode;
          let statusText: string;
          let statusColor: string;

          if (hasError) {
            statusIcon = <CloseCircleOutlined style={{ fontSize: '12px' }} />;
            const errorMsg = fc.result?.message || fc.result?.code || '执行失败';
            statusText = `${fc.name} 执行失败：${errorMsg}`;
            statusColor = '#ff4d4f';
          } else if (isSuccess) {
            statusIcon = <CheckCircleOutlined style={{ fontSize: '12px' }} />;
            statusText = `${fc.name} 执行成功`;
            statusColor = '#52c41a';
          } else {
            statusIcon = <LoadingOutlined style={{ fontSize: '12px' }} />;
            statusText = `${fc.name} 执行中...`;
            statusColor = '#1890ff';
          }

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: statusColor, display: 'flex', alignItems: 'center' }}>
                {statusIcon}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.75)', flex: 1 }}>
                {statusText}
              </span>
              {fc.parameters && (
                <Tag
                  size="small"
                  style={{
                    fontSize: '10px',
                    padding: '0 4px',
                    height: '18px',
                    lineHeight: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  查看参数
                </Tag>
              )}
            </div>
          );
        })}
      </Space>
    </div>
  );
};

export default FunctionCallStatus;

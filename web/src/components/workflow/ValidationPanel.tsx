import React from 'react';
import { Card, Tag, Button, Empty, Space } from 'antd';
import { CloseOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface ValidationPanelProps {
  result: {
    isComplete: boolean;
    issues: Array<{
      type: string;
      message: string;
      nodeId?: string;
      connectionId?: string;
    }>;
    warnings: Array<{
      type: string;
      message: string;
    }>;
  };
  onClose: () => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ result, onClose }) => {
  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>验证结果</span>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        </div>
      }
      style={{ margin: '16px' }}
    >
      {result.isComplete ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <div style={{ marginTop: 16, color: '#52c41a' }}>工作流验证通过</div>
        </div>
      ) : (
        <div>
          {result.issues.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                错误 ({result.issues.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.issues.map((issue, index) => (
                  <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Space wrap style={{ marginBottom: 4 }}>
                      <Tag color="red">{issue.type}</Tag>
                      {issue.nodeId && <Tag>节点: {issue.nodeId}</Tag>}
                      {issue.connectionId && <Tag>连接: {issue.connectionId}</Tag>}
                    </Space>
                    <div style={{ marginTop: 4, fontSize: 14 }}>{issue.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                警告 ({result.warnings.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.warnings.map((warning, index) => (
                  <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Tag color="orange" style={{ marginBottom: 4 }}>{warning.type}</Tag>
                    <div style={{ marginTop: 4, fontSize: 14 }}>{warning.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.issues.length === 0 && result.warnings.length === 0 && (
            <Empty description="无验证结果" />
          )}
        </div>
      )}
    </Card>
  );
};

export default ValidationPanel;


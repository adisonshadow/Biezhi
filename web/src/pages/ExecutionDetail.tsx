import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Tag, Timeline, message } from 'antd';
import { api } from '../services/api';
import type { Execution, ExecutionLog } from '../types';

const ExecutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadExecution();
      loadLogs();
    }
  }, [id]);

  const loadExecution = async () => {
    setLoading(true);
    try {
      const data = await api.getExecution(id!);
      setExecution(data);
    } catch (error: any) {
      message.error(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await api.getExecutionLogs(id!);
      setLogs(data);
    } catch (error: any) {
      message.error(`加载日志失败: ${error.message}`);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '等待中' },
      running: { color: 'processing', text: '运行中' },
      success: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
      cancelled: { color: 'warning', text: '已取消' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  if (!execution) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Card title="执行任务详情" loading={loading}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="ID">{execution.id}</Descriptions.Item>
          <Descriptions.Item label="工作流ID">{execution.workflowId}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(execution.status)}</Descriptions.Item>
          <Descriptions.Item label="持续时间">
            {execution.duration ? `${execution.duration}ms` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {execution.completedAt ? new Date(execution.completedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          {execution.errorMessage && (
            <Descriptions.Item label="错误信息" span={2}>
              {execution.errorMessage}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="执行日志" style={{ marginTop: 16 }}>
        <Timeline>
          {logs.map((log) => (
            <Timeline.Item
              key={log.id}
              color={
                log.level === 'error' ? 'red' :
                log.level === 'warn' ? 'orange' :
                log.level === 'info' ? 'blue' : 'gray'
              }
            >
              <div>
                <strong>[{log.level.toUpperCase()}]</strong> {log.message}
                <div style={{ color: '#999', fontSize: '12px', marginTop: 4 }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

      {execution.outputData && (
        <Card title="输出数据" style={{ marginTop: 16 }}>
          <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
            {JSON.stringify(execution.outputData, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default ExecutionDetail;


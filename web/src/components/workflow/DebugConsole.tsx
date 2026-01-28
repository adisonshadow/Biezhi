import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Input, Button, Space, Tag, Collapse, Empty, message } from 'antd';
import { 
  SearchOutlined, 
  ClearOutlined, 
  FileTextOutlined, 
  DatabaseOutlined, 
  DashboardOutlined,
  CopyOutlined
} from '@ant-design/icons';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  operatorId?: string;
  operatorType?: string;
  operatorName?: string;
  message: string;
  data?: any;
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  operatorId?: string;
  operatorType?: string;
  operatorName?: string;
  timestamp: string;
}

interface DebugConsoleProps {
  executionResults?: Map<string, ExecutionResult>;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ executionResults = new Map() }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [activeKey, setActiveKey] = useState<string>('logs');

  const getLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      debug: 'default',
      info: 'blue',
      warn: 'orange',
      error: 'red',
    };
    return colorMap[level] || 'default';
  };

  // 将执行结果转换为日志条目
  useEffect(() => {
    const newLogs: LogEntry[] = [];
    
    executionResults.forEach((result, nodeId) => {
      if (result.success) {
        // 执行成功日志
        newLogs.push({
          id: `log_${nodeId}_success`,
          timestamp: result.timestamp,
          level: 'info',
          nodeId,
          operatorId: result.operatorId,
          operatorType: result.operatorType,
          operatorName: result.operatorName,
          message: `节点执行成功`,
          data: result.data,
        });
      } else if (result.error) {
        // 执行失败日志
        newLogs.push({
          id: `log_${nodeId}_error`,
          timestamp: result.timestamp,
          level: 'error',
          nodeId,
          operatorId: result.operatorId,
          operatorType: result.operatorType,
          operatorName: result.operatorName,
          message: `节点执行失败: ${result.error}`,
          data: { error: result.error },
        });
      } else {
        // 执行开始日志
        newLogs.push({
          id: `log_${nodeId}_start`,
          timestamp: result.timestamp,
          level: 'info',
          nodeId,
          operatorId: result.operatorId,
          operatorType: result.operatorType,
          operatorName: result.operatorName,
          message: `开始执行节点`,
        });
      }
    });
    
    // 按时间戳排序，最新的在前
    newLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setLogs(newLogs);
  }, [executionResults]);

  const filteredLogs = logs.filter(log => {
    const matchSearch = !searchText || 
      log.message.toLowerCase().includes(searchText.toLowerCase()) ||
      log.nodeId?.toLowerCase().includes(searchText.toLowerCase()) ||
      log.operatorName?.toLowerCase().includes(searchText.toLowerCase());
    const matchLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchSearch && matchLevel;
  });

  // 获取所有执行结果数据（用于数据标签页）
  const executionDataEntries = useMemo(() => {
    const entries: Array<{ nodeId: string; result: ExecutionResult }> = [];
    executionResults.forEach((result, nodeId) => {
      if (result.success && result.data !== undefined) {
        entries.push({ nodeId, result });
      }
    });
    // 按时间戳排序，最新的在前
    entries.sort((a, b) => 
      new Date(b.result.timestamp).getTime() - new Date(a.result.timestamp).getTime()
    );
    return entries;
  }, [executionResults]);

  // 根据 activeKey 渲染不同的 tabBarExtraContent
  const renderTabBarExtraContent = () => {
    if (activeKey === 'logs') {
      return (
        <Space>
          <Input
            placeholder="搜索日志"
            prefix={<SearchOutlined />}
            value={searchText}
            size="small"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Space.Compact>
            <Button
              size="small"
              onClick={() => setLevelFilter('all')}
              type={levelFilter === 'all' ? 'primary' : 'default'}
            >
              全部
            </Button>
            <Button
              size="small"
              onClick={() => setLevelFilter('info')}
              type={levelFilter === 'info' ? 'primary' : 'default'}
            >
              信息
            </Button>
            <Button
              size="small"
              onClick={() => setLevelFilter('warn')}
              type={levelFilter === 'warn' ? 'primary' : 'default'}
            >
              警告
            </Button>
            <Button
              size="small"
              onClick={() => setLevelFilter('error')}
              type={levelFilter === 'error' ? 'primary' : 'default'}
            >
              错误
            </Button>
          </Space.Compact>
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={() => setLogs([])}
          >
            清除
          </Button>
        </Space>
      );
    }
    return null;
  };

  const tabItems = [
    {
      key: 'logs',
      label: '日志',
      icon: <FileTextOutlined />,
      children: (
        <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无日志</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredLogs.map((log) => (
                <div key={log.id} style={{ padding: '12px', borderRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </span>
                    <Tag color={getLevelColor(log.level)}>{log.level.toUpperCase()}</Tag>
                    {log.nodeId && (
                      <Tag color="blue" style={{ margin: 0 }}>
                        节点: {log.nodeId}
                      </Tag>
                    )}
                    {log.operatorName && (
                      <Tag color="green" style={{ margin: 0 }}>
                        算子: {log.operatorName}
                      </Tag>
                    )}
                    {log.operatorType && (
                      <Tag color="orange" style={{ margin: 0 }}>
                        类型: {log.operatorType}
                      </Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: log.data ? 8 : 0 }}>
                    {log.message}
                  </div>
                  {log.data && (
                    <Collapse size="small" style={{ marginTop: 8 }}>
                      <Collapse.Panel 
                        key="details"
                        header={
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span>详细信息</span>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                const content = JSON.stringify(log.data, null, 2);
                                navigator.clipboard.writeText(content).then(() => {
                                  message.success('已复制到剪贴板');
                                }).catch(() => {
                                  message.error('复制失败');
                                });
                              }}
                              style={{ marginRight: -8 }}
                            />
                          </div>
                        }
                      >
                        <pre style={{ 
                          fontSize: 11, 
                          margin: 0, 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflow: 'auto',
                        }}>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </Collapse.Panel>
                    </Collapse>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'data',
      label: '数据',
      icon: <DatabaseOutlined />,
      children: (
        <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
          {executionDataEntries.length === 0 ? (
            <Empty description="暂无执行数据" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {executionDataEntries.map(({ nodeId, result }) => {
                // 检查 result.data 是否是对象且不是数组
                const isObject = result.data !== null && 
                                 typeof result.data === 'object' && 
                                 !Array.isArray(result.data);
                const dataEntries = isObject ? Object.entries(result.data) : null;
                
                // 如果是对象且有多个字段，分别显示每个字段
                if (isObject && dataEntries && dataEntries.length > 0) {
                  return (
                    <div key={nodeId} style={{ 
                      padding: '16px', 
                      // border: '1px solid #f0f0f0', 
                      borderRadius: 4,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Tag color="blue" style={{ margin: 0 }}>
                          节点ID: {nodeId}
                        </Tag>
                        {result.operatorName && (
                          <Tag color="green" style={{ margin: 0 }}>
                            算子: {result.operatorName}
                          </Tag>
                        )}
                        {result.operatorId && (
                          <Tag color="cyan" style={{ margin: 0 }}>
                            ID: {result.operatorId}
                          </Tag>
                        )}
                        {result.operatorType && (
                          <Tag color="orange" style={{ margin: 0 }}>
                            类型: {result.operatorType}
                          </Tag>
                        )}
                        <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                          {new Date(result.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <Collapse size="small" style={{ marginTop: 8 }}>
                        {dataEntries.map(([key, value]) => (
                          <Collapse.Panel 
                            key={key}
                            header={
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span>{key}</span>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<CopyOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const content = JSON.stringify(value, null, 2);
                                    navigator.clipboard.writeText(content).then(() => {
                                      message.success('已复制到剪贴板');
                                    }).catch(() => {
                                      message.error('复制失败');
                                    });
                                  }}
                                  style={{ marginRight: -8 }}
                                />
                              </div>
                            }
                          >
                            <pre style={{ 
                              fontSize: 11, 
                              margin: 0, 
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: '200px',
                              overflow: 'auto',
                            }}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          </Collapse.Panel>
                        ))}
                      </Collapse>
                    </div>
                  );
                }
                
                // 否则按原来的方式显示
                return (
                  <div key={nodeId} style={{ 
                    padding: '16px', 
                    // border: '1px solid #f0f0f0', 
                    borderRadius: 4,
                    // background: '#fff',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Tag color="blue" style={{ margin: 0 }}>
                        节点ID: {nodeId}
                      </Tag>
                      {result.operatorName && (
                        <Tag color="green" style={{ margin: 0 }}>
                          算子: {result.operatorName}
                        </Tag>
                      )}
                      {result.operatorId && (
                        <Tag color="cyan" style={{ margin: 0 }}>
                          ID: {result.operatorId}
                        </Tag>
                      )}
                      {result.operatorType && (
                        <Tag color="orange" style={{ margin: 0 }}>
                          类型: {result.operatorType}
                        </Tag>
                      )}
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                        {new Date(result.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <Collapse size="small" style={{ marginTop: 8 }}>
                      <Collapse.Panel 
                        key="data"
                        header={
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span>数据</span>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                const content = JSON.stringify(result.data, null, 2);
                                navigator.clipboard.writeText(content).then(() => {
                                  message.success('已复制到剪贴板');
                                }).catch(() => {
                                  message.error('复制失败');
                                });
                              }}
                              style={{ marginRight: -8 }}
                            />
                          </div>
                        }
                      >
                        <pre style={{ 
                          fontSize: 11, 
                          margin: 0, 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflow: 'auto',
                        }}>
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </Collapse.Panel>
                    </Collapse>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'performance',
      label: '性能',
      icon: <DashboardOutlined />,
      children: (
        <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
          <div>性能视图待实现</div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="debug-console-wrapper">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        size='small'
        items={tabItems}
        tabBarExtraContent={renderTabBarExtraContent()}
        style={{ height: '100%' }}
      />
      <style>{`
        .debug-console-wrapper .ant-tabs {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .debug-console-wrapper .ant-tabs-nav {
          padding: 0 20px !important;
          flex-shrink: 0 !important;
        }
        .debug-console-wrapper .ant-tabs-content-holder {
          flex: 1 !important;
          overflow: hidden !important;
        }
        .debug-console-wrapper .ant-tabs-content {
          height: 100% !important;
        }
        .debug-console-wrapper .ant-tabs-tabpane {
          height: 100% !important;
          overflow: auto !important;
        }
        /* 确保不活动的 tab 被隐藏 */
        .debug-console-wrapper .ant-tabs-tabpane:not(.ant-tabs-tabpane-active) {
          display: none !important;
        }
        .debug-console-wrapper .ant-tabs-tabpane-active {
          display: block !important;
        }
      `}</style>
    </div>
  );
};

export default DebugConsole;


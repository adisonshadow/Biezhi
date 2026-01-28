import React, { useState } from 'react';
import { Modal, Tabs, Input, Tag, Empty, Space, Button, message, Form, Flex, Dropdown, Checkbox } from 'antd';
import { SearchOutlined, SendOutlined, ClearOutlined } from '@ant-design/icons';
import type { Operator } from '../../types';
import { api } from '../../services/api';
// import { Icon } from '@iconify/react';
import type { MenuProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

interface AddNodeModalProps {
  visible: boolean;
  onClose: () => void;
  onAddNode: (operator: Operator) => void;
  operators: Operator[];
  onOperatorsReload?: () => void;
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({
  visible,
  onClose,
  onAddNode,
  operators,
  onOperatorsReload,
}) => {
  const [activeTab, setActiveTab] = useState('operators');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [aiInputValue, setAiInputValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm] = Form.useForm();

  const handleOperatorSelect = (operator: Operator) => {
    onAddNode(operator);
    onClose();
    // 重置状态
    setSearchText('');
    setSelectedCategory('');
  };

  const handleAiSend = async () => {
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
      message.info('AI创建算子功能待实现');
    }, 1000);
  };

  const handleAiClear = () => {
    setAiMessages([]);
  };

  const handleClose = () => {
    onClose();
    // 重置状态
    setSearchText('');
    setSelectedCategory('');
    setAiMessages([]);
    setAiInputValue('');
    registerForm.resetFields();
    setShowRegisterModal(false);
  };

  const handleRegisterOperator = async (values: { operatorPath: string; useRelativePath?: boolean }) => {
    const path = values.operatorPath?.trim();
    if (!path) {
      message.warning('请输入算子目录路径');
      return;
    }

    setRegisterLoading(true);
    try {
      const result = await api.registerOperator(path, undefined, values.useRelativePath);
      message.success(`算子注册成功: ${result.name || result.id}`);
      registerForm.resetFields();
      setShowRegisterModal(false);
      
      // 重新加载算子列表
      if (onOperatorsReload) {
        onOperatorsReload();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '注册失败';
      message.error(`注册失败: ${errorMessage}`);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeleteOperator = async (operator: Operator) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除算子 "${operator.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.deleteOperator(operator.id);
          message.success('算子已删除');
          // 重新加载算子列表
          if (onOperatorsReload) {
            onOperatorsReload();
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || '删除失败';
          message.error(`删除失败: ${errorMessage}`);
        }
      },
    });
  };

  const handleReregisterOperator = async (operator: Operator) => {
    const operatorPath = operator.metadata?.operatorPath;
    
    Modal.confirm({
      title: '确认重新注册',
      content: operatorPath 
        ? `确定要重新注册算子 "${operator.name}" 吗？这将从原路径重新读取配置并更新算子信息。`
        : `确定要重新注册算子 "${operator.name}" 吗？请确保在请求中提供了算子路径。`,
      okText: '重新注册',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await api.reregisterOperator(operator.id, operatorPath);
          message.success(`算子重新注册成功: ${result.id || operator.name}`);
          // 重新加载算子列表
          if (onOperatorsReload) {
            onOperatorsReload();
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || '重新注册失败';
          message.error(`重新注册失败: ${errorMessage}`);
        }
      },
    });
  };

  const filteredOperators = operators.filter(op => {
    const matchSearch = !searchText || 
      op.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (op.description && op.description.toLowerCase().includes(searchText.toLowerCase()));
    const matchCategory = !selectedCategory || op.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const categories = Array.from(new Set(operators.map(op => op.category).filter(Boolean))) as string[];

  const getOperatorTypeColor = (type?: string) => {
    const colorMap: Record<string, string> = {
      local_python: 'blue',
      local_typescript: 'purple',
      local_go: 'green',
      local_rust: 'orange',
    };
    return colorMap[type] || 'default';
  };

  return (
    <Modal
      title="添加节点"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={800}
      // style={{ top: 20 }}
      centered
      styles={{ body: { padding: 0, height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' } }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
        tabBarStyle={{ marginBottom: 0, padding: '0 16px' }}
        items={[
          {
            key: 'operators',
            label: '从已注册的算子添加',
            children: (
              <div style={{ 
                padding: '16px', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0
              }}>
                <div style={{ marginBottom: 16 }}>
                  <Flex justify='space-between'>
                    <Input
                      placeholder="搜索算子"
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                      style={{ width: '200px' }}
                    />
                    <Button
                      type="default"
                      // icon={<Icon icon="ri:insert-row-top" />}
                      onClick={() => {
                        registerForm.resetFields();
                        setShowRegisterModal(true);
                      }}
                      title="从本地注册新算子"
                    >
                      注册算子
                    </Button>
                  </Flex>
                </div>

                {categories.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Space wrap>
                      <Tag
                        color={!selectedCategory ? 'blue' : 'default'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedCategory('')}
                      >
                        全部
                      </Tag>
                      {categories.map(cat => (
                        <Tag
                          key={cat}
                          color={selectedCategory === cat ? 'blue' : 'default'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                <div 
                  style={{ 
                    // flex: 1, 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    // minHeight: 0,
                    // maxHeight: '100%',
                    // paddingRight: 4,
                    // marginRight: -4,
                    height: 'calc(100vh - 160px - 120px)',
                  }}
                >
                  {filteredOperators.length === 0 ? (
                    <Empty description="没有找到算子" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredOperators.map((operator) => {
                        const menuItems: MenuProps['items'] = [
                          {
                            key: 'delete',
                            label: '移除',
                            danger: true,
                            onClick: (e) => {
                              e.domEvent.stopPropagation();
                              handleDeleteOperator(operator);
                            },
                          },
                          {
                            key: 'reregister',
                            label: '重新注册',
                            onClick: (e) => {
                              e.domEvent.stopPropagation();
                              handleReregisterOperator(operator);
                            },
                          },
                        ];

                        return (
                          <div
                            key={operator.id}
                            className='node-panel-item'
                            onClick={() => handleOperatorSelect(operator)}
                            style={{ position: 'relative' }}
                          >
                            <Dropdown
                              menu={{ items: menuItems }}
                              trigger={['click']}
                            >
                              <Button
                                type="text"
                                // icon={<Icon icon="nrk:more" />}
                                icon={<MoreOutlined />}
                                size="small"
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  zIndex: 10,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Dropdown>
                            <div>
                              <div style={{ marginBottom: 4 }}>
                                <Space>
                                  <span style={{ fontWeight: 500 }}>{operator.name}</span>
                                  {operator.operatorType && (
                                    <Tag color={getOperatorTypeColor(operator.operatorType)}>
                                      {operator.operatorType}
                                    </Tag>
                                  )}
                                </Space>
                              </div>
                            {operator.description && (
                              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                                {operator.description.length > 50
                                  ? `${operator.description.substring(0, 50)}...`
                                  : operator.description}
                              </div>
                            )}
                            {operator.tags && operator.tags.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                {operator.tags.slice(0, 3).map((tag, idx) => (
                                  <Tag key={idx} style={{ marginTop: 4 }}>
                                    {tag}
                                  </Tag>
                                ))}
                              </div>
                            )}
                          </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'ai',
            label: '从AI中添加',
            children: (
              <div style={{ 
                padding: '16px', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* 消息区域 */}
                <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
                  {aiMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
                      开始与AI对话，创建新算子
                    </div>
                  ) : (
                    aiMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: 16,
                          textAlign: msg.role === 'user' ? 'right' : 'left',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-block',
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                            color: msg.role === 'user' ? '#fff' : '#000',
                            maxWidth: '80%',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 输入区域 */}
                <div>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input.TextArea
                      value={aiInputValue}
                      onChange={(e) => setAiInputValue(e.target.value)}
                      placeholder="描述您想要创建的算子..."
                      rows={3}
                      onPressEnter={(e) => {
                        if (e.shiftKey) {
                          return;
                        }
                        e.preventDefault();
                        handleAiSend();
                      }}
                    />
                  </Space.Compact>
                  <Space style={{ marginTop: 8, justifyContent: 'flex-end', width: '100%' }}>
                    <Button icon={<ClearOutlined />} onClick={handleAiClear}>
                      清除
                    </Button>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleAiSend}
                      loading={aiLoading}
                    >
                      发送
                    </Button>
                  </Space>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* 注册算子Modal */}
      <Modal
        title="从本地注册算子"
        open={showRegisterModal}
        onCancel={() => {
          setShowRegisterModal(false);
          registerForm.resetFields();
        }}
        onOk={() => registerForm.submit()}
        okText="注册"
        cancelText="取消"
        confirmLoading={registerLoading}
        width={500}
      >
        <Form
          form={registerForm}
          layout="vertical"
          onFinish={handleRegisterOperator}
        >
          <Form.Item
            name="operatorPath"
            label="算子目录路径"
            rules={[{ required: true, message: '请输入算子目录路径' }]}
          >
            <Input
              placeholder="请输入算子目录路径"
              onPressEnter={() => {
                registerForm.submit();
              }}
            />
          </Form.Item>
          <Form.Item
            name="useRelativePath"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>使用相对路径</Checkbox>
          </Form.Item>
          <div style={{ fontSize: 12, color: '#999', marginTop: -8, marginBottom: 8 }}>
            绝对路径示例: /Users/yanfang/dev/Biezhi2/Commom_operators/my_operator
            <br />
            相对路径示例: Commom_operators/my_operator（相对于项目根目录）
            <br />
            注意：目录中需包含 operator.yaml 文件
          </div>
        </Form>
      </Modal>
    </Modal>
  );
};

export default AddNodeModal;


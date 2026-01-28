import React, { useState } from 'react';
import { Form, Input, Button, Space, Typography, Divider, message, List, Modal, Tag, Popconfirm, Switch } from 'antd';
import { SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// localStorage key
const LLM_CONFIG_KEY = 'llm_model_configs';
const DEFAULT_MODEL_KEY = 'llm_default_model_id';

// 模型配置类型定义
export interface LLMModelConfig {
  id: string;
  name: string; // 配置名称，用于标识
  baseURL: string;
  model: string;
  apiKey: string;
  dangerouslyAllowBrowser?: boolean; // 允许在浏览器中使用，默认 true
}

// 模型配置列表类型
export interface LLMModelConfigs {
  configs: LLMModelConfig[];
  defaultId?: string; // 默认使用的模型配置ID
}

// 默认配置
const createDefaultConfig = (): LLMModelConfig => ({
  id: `config_${Date.now()}`,
  name: '默认配置',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  apiKey: '',
  dangerouslyAllowBrowser: true, // 默认选中
});

// 从 localStorage 读取配置列表
export const loadLLMConfigs = (): LLMModelConfigs => {
  try {
    const stored = localStorage.getItem(LLM_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 兼容旧版本的单配置格式
      if (parsed.baseURL && !parsed.configs) {
        return {
          configs: [{
            id: 'default',
            name: '默认配置',
            baseURL: parsed.baseURL,
            model: parsed.model || 'gpt-3.5-turbo',
            apiKey: parsed.apiKey || '',
            dangerouslyAllowBrowser: parsed.dangerouslyAllowBrowser !== undefined ? parsed.dangerouslyAllowBrowser : true,
          }],
          defaultId: 'default',
        };
      }
      // 为旧配置添加默认值
      if (parsed.configs) {
        parsed.configs = parsed.configs.map((config: LLMModelConfig) => ({
          ...config,
          dangerouslyAllowBrowser: config.dangerouslyAllowBrowser !== undefined ? config.dangerouslyAllowBrowser : true,
        }));
      }
      return parsed;
    }
  } catch (error) {
    console.error('读取模型配置失败:', error);
  }
  // 返回一个默认配置
  const defaultConfig = createDefaultConfig();
  return {
    configs: [defaultConfig],
    defaultId: defaultConfig.id,
  };
};

// 保存配置列表到 localStorage
export const saveLLMConfigs = (configs: LLMModelConfigs): boolean => {
  try {
    localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(configs));
    if (configs.defaultId) {
      localStorage.setItem(DEFAULT_MODEL_KEY, configs.defaultId);
    }
    return true;
  } catch (error) {
    console.error('保存模型配置失败:', error);
    return false;
  }
};

// 获取默认模型配置
export const getDefaultLLMConfig = (): LLMModelConfig | null => {
  const configs = loadLLMConfigs();
  if (configs.defaultId) {
    return configs.configs.find(c => c.id === configs.defaultId) || configs.configs[0] || null;
  }
  return configs.configs[0] || null;
};

// 根据ID获取模型配置
export const getLLMConfigById = (id: string): LLMModelConfig | null => {
  const configs = loadLLMConfigs();
  return configs.configs.find(c => c.id === id) || null;
};

interface ModelSettingsPanelProps {
  onConfigChange?: (configs: LLMModelConfigs) => void;
}

const ModelSettingsPanel: React.FC<ModelSettingsPanelProps> = ({ onConfigChange }) => {
  const [configs, setConfigs] = useState<LLMModelConfigs>(loadLLMConfigs());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMModelConfig | null>(null);
  const [form] = Form.useForm<LLMModelConfig>();
  const [loading, setLoading] = useState(false);

  // 刷新配置列表
  const refreshConfigs = () => {
    const loaded = loadLLMConfigs();
    setConfigs(loaded);
    onConfigChange?.(loaded);
  };

  // 打开添加/编辑模态框
  const handleOpenModal = (config?: LLMModelConfig) => {
    if (config) {
      setEditingConfig(config);
      form.setFieldsValue(config);
    } else {
      setEditingConfig(null);
      form.setFieldsValue(createDefaultConfig());
    }
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingConfig(null);
    form.resetFields();
  };

  // 保存配置（新增或编辑）
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const currentConfigs = loadLLMConfigs();
      
      if (editingConfig) {
        // 编辑现有配置
        const index = currentConfigs.configs.findIndex(c => c.id === editingConfig.id);
        if (index >= 0) {
          currentConfigs.configs[index] = { ...values, id: editingConfig.id };
        }
      } else {
        // 添加新配置
        const newConfig: LLMModelConfig = {
          ...values,
          id: `config_${Date.now()}`,
        };
        currentConfigs.configs.push(newConfig);
        // 如果是第一个配置，设为默认
        if (currentConfigs.configs.length === 1) {
          currentConfigs.defaultId = newConfig.id;
        }
      }

      if (saveLLMConfigs(currentConfigs)) {
        message.success(editingConfig ? '配置已更新' : '配置已添加');
        refreshConfigs();
        handleCloseModal();
      } else {
        message.error('保存配置失败');
      }
    } catch (error) {
      console.error('保存配置错误:', error);
      message.error('请检查表单输入');
    } finally {
      setLoading(false);
    }
  };

  // 删除配置
  const handleDelete = (id: string) => {
    const currentConfigs = loadLLMConfigs();
    const index = currentConfigs.configs.findIndex(c => c.id === id);
    if (index >= 0) {
      currentConfigs.configs.splice(index, 1);
      // 如果删除的是默认配置，选择第一个作为默认
      if (currentConfigs.defaultId === id) {
        currentConfigs.defaultId = currentConfigs.configs[0]?.id;
      }
      if (saveLLMConfigs(currentConfigs)) {
        message.success('配置已删除');
        refreshConfigs();
      } else {
        message.error('删除配置失败');
      }
    }
  };

  // 设置默认配置
  const handleSetDefault = (id: string) => {
    const currentConfigs = loadLLMConfigs();
    currentConfigs.defaultId = id;
    if (saveLLMConfigs(currentConfigs)) {
      message.success('已设置默认模型');
      refreshConfigs();
    } else {
      message.error('设置默认模型失败');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>大语言模型配置</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            管理多个 OpenAI 兼容协议的大语言模型配置
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          添加模型
        </Button>
      </div>
      <Divider />

      <List
        dataSource={configs.configs}
        locale={{ emptyText: '暂无模型配置，请添加一个' }}
        renderItem={(config) => (
          <List.Item
            actions={[
              config.id === configs.defaultId && (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  默认
                </Tag>
              ),
              config.id !== configs.defaultId && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleSetDefault(config.id)}
                >
                  设为默认
                </Button>
              ),
              <Button
                type="link"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleOpenModal(config)}
              >
                编辑
              </Button>,
              <Popconfirm
                title="确定要删除这个模型配置吗？"
                onConfirm={() => handleDelete(config.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                >
                  删除
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{config.name}</Text>
                  {config.id === configs.defaultId && (
                    <Tag color="green">默认</Tag>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <Text strong>API 地址：</Text>
                    {config.baseURL}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <Text strong>模型名称：</Text>
                    {config.model}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <Text strong>API 密钥：</Text>
                    {config.apiKey ? '••••••••' : '未设置'}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title={editingConfig ? '编辑模型配置' : '添加模型配置'}
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            label="配置名称"
            name="name"
            rules={[
              { required: true, message: '请输入配置名称' },
            ]}
            tooltip="用于标识此配置的名称，例如：OpenAI GPT-4、本地模型等"
          >
            <Input
              placeholder="例如：OpenAI GPT-4"
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="API 地址"
            name="baseURL"
            rules={[
              { required: true, message: '请输入 API 地址' },
              { type: 'url', message: '请输入有效的 URL 地址' },
            ]}
            tooltip="OpenAI 兼容 API 的基地址，例如：https://api.openai.com/v1"
          >
            <Input
              placeholder="https://api.openai.com/v1"
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="模型名称"
            name="model"
            rules={[
              { required: true, message: '请输入模型名称' },
            ]}
            tooltip="要使用的模型名称，例如：gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview 等"
          >
            <Input
              placeholder="gpt-3.5-turbo"
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="API 密钥"
            name="apiKey"
            rules={[
              { required: true, message: '请输入 API 密钥' },
            ]}
            tooltip="您的 API 密钥，将安全地保存在本地浏览器中"
          >
            <Input.Password
              placeholder="sk-..."
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="允许在浏览器中使用"
            name="dangerouslyAllowBrowser"
            valuePropName="checked"
            tooltip="启用此选项后，将在 OpenAI 兼容请求中添加 dangerouslyAllowBrowser: true 参数"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                {editingConfig ? '更新配置' : '添加配置'}
              </Button>
              <Button onClick={handleCloseModal}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelSettingsPanel;
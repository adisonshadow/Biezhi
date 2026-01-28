import React, { useState } from 'react';
import { Menu, Switch, Space, Typography, Divider } from 'antd';
import type { MenuProps } from 'antd';
import ModelSettingsPanel from './ModelSettingsPanel';

const { Title, Text } = Typography;

// 配置项的 localStorage key
const SETTINGS_KEY = 'workflow_designer_settings';

// 设置类型定义
export interface WorkflowDesignerSettings {
  defaultOpenDebugPanel: boolean;
  defaultOpenAIPanel: boolean;
  showMiniMap: boolean;
}

// 默认设置
const defaultSettings: WorkflowDesignerSettings = {
  defaultOpenDebugPanel: false,
  defaultOpenAIPanel: false,
  showMiniMap: true,
};

// 从 localStorage 读取设置
export const loadSettings = (): WorkflowDesignerSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('读取设置失败:', error);
  }
  return defaultSettings;
};

// 保存设置到 localStorage
export const saveSettings = (settings: Partial<WorkflowDesignerSettings>) => {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('保存设置失败:', error);
    return null;
  }
};

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: 'user-preferences',
    label: '用户喜好',
    type: 'group',
    children: [
      {
        key: 'workflow-designer',
        label: '工作流设计界面',
      },
      {
        key: 'canvas',
        label: '画布',
        disabled: true, // 暂不实现
      },
    ],
  },
  {
    key: 'ai',
    label: 'AI',
    type: 'group',
    children: [
      {
        key: 'model-settings',
        label: '模型设置',
      },
    ],
  },
];

interface SettingsPanelProps {
  onSettingsChange?: (settings: WorkflowDesignerSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSettingsChange }) => {
  const [selectedKey, setSelectedKey] = useState<string>('workflow-designer');
  const [settings, setSettings] = useState<WorkflowDesignerSettings>(loadSettings());

  // 当设置变化时，保存并通知父组件
  const updateSetting = <K extends keyof WorkflowDesignerSettings>(
    key: K,
    value: WorkflowDesignerSettings[K]
  ) => {
    const newSettings = saveSettings({ [key]: value });
    if (newSettings) {
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    }
  };

  // 渲染工作流设计界面面板
  const renderWorkflowDesignerPanel = () => {
    return (
      <div>
        <Title level={5}>工作流设计界面</Title>
        <Divider />
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>默认打开调试面板</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                打开工作流设计器时，默认显示底部的调试控制台
              </Text>
            </div>
            <Switch
              checked={settings.defaultOpenDebugPanel}
              onChange={(checked) => updateSetting('defaultOpenDebugPanel', checked)}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>默认打开AI对话面板</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                打开工作流设计器时，默认显示右侧的AI对话面板
              </Text>
            </div>
            <Switch
              checked={settings.defaultOpenAIPanel}
              onChange={(checked) => updateSetting('defaultOpenAIPanel', checked)}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>显示小地图</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                在画布右下角显示工作流的小地图导航
              </Text>
            </div>
            <Switch
              checked={settings.showMiniMap}
              onChange={(checked) => updateSetting('showMiniMap', checked)}
            />
          </div>
        </Space>
      </div>
    );
  };

  // 渲染模型设置面板
  const renderModelSettingsPanel = () => {
    return <ModelSettingsPanel />;
  };

  // 根据选中的菜单项渲染对应的面板
  const renderContent = () => {
    switch (selectedKey) {
      case 'workflow-designer':
        return renderWorkflowDesignerPanel();
      case 'model-settings':
        return renderModelSettingsPanel();
      default:
        return (
          <div>
            <Text type="secondary">该设置项暂未实现</Text>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '500px' }}>
      {/* 左侧导航 */}
      <div style={{ width: 200, paddingRight: 10 }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
          style={{ border: 'none', height: '100%' }}
        />
      </div>

      {/* 右侧内容面板 */}
      <div style={{ flex: 1, paddingLeft: 24, paddingRight: 16, overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPanel;


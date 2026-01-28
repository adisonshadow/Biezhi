import React from 'react';
import { Card, Tag, Space, Dropdown, Button } from 'antd';
import { EditOutlined, ExportOutlined, DeleteOutlined, MoreOutlined, ClockCircleOutlined, TagOutlined, PushpinOutlined, RocketOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Workflow } from '../../types';
import './WorkflowCard.css';

interface WorkflowCardProps {
  workflow: Workflow;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onEdit, onDelete, onExport }) => {
  const getStatusInfo = () => {
    // TODO: 需要检查是否有执行任务来确定状态
    // 这里简化处理
    const hasNodes = workflow.nodes && workflow.nodes.length > 0;
    if (!hasNodes) {
      return { color: 'default', text: '未部署' };
    }
    return { color: 'success', text: '已部署' };
  };

  const statusInfo = getStatusInfo();

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: onEdit,
    },
    {
      key: 'export',
      label: '导出',
      icon: <ExportOutlined />,
      onClick: onExport,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <Card
      hoverable
      // style={{ height: '100%' }}
      onClick={onEdit}
      actions={[
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          编辑
        </Button>,
        <Button
          type="text"
          icon={<RocketOutlined />}
        >
          部署
        </Button>,
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button
            type="text"
            icon={<MoreOutlined />}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </Dropdown>,
      ]}
    >
      <Card.Meta
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ flex: 1, marginRight: 8 }}>{workflow.name}</span>
          </div>
        }
        description={
          <div>
            {workflow.description && (
              <div style={{ marginBottom: 8, color: '#666', fontSize: '12px' }}>
                {workflow.description.length > 50
                  ? `${workflow.description.substring(0, 50)}...`
                  : workflow.description}
              </div>
            )}
            <Space size="small" wrap>
              <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
              {workflow.version && <Tag icon={<PushpinOutlined />}>v{workflow.version}</Tag>}
              {workflow.category && <Tag icon={<TagOutlined />}>{workflow.category}</Tag>}
              {workflow.updatedAt && (
                <Tag icon={<ClockCircleOutlined />}>{new Date(workflow.updatedAt).toLocaleDateString()}</Tag>
              )}
              {workflow.tags && workflow.tags.length > 0 && (
                workflow.tags.slice(0, 2).map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))
              )}
            </Space>
            {/* <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
              {workflow.createdAt && (
                <div>{new Date(workflow.createdAt).toLocaleDateString()}</div>
              )}
            </div> */}
          </div>
        }
      />
    </Card>
  );
};

export default WorkflowCard;


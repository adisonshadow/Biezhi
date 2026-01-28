import React, { useState, useEffect } from 'react';
import { Row, Col, Input, Button, Space, Select, message, Modal, Form, Upload, Radio, Table, Tag } from 'antd';
// import { Card, Masonry } from 'antd';

import { PlusOutlined, ImportOutlined, SettingOutlined, AppstoreOutlined, UnorderedListOutlined, EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Workflow } from '../types';
import WorkflowCard from '../components/workflow/WorkflowCard';

const { Search } = Input;
const { Option } = Select;

const WorkflowList: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    filterAndSortWorkflows();
  }, [workflows, searchText, categoryFilter, sortBy]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await api.listWorkflows();
      setWorkflows(data);
    } catch (error: any) {
      message.error(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortWorkflows = () => {
    let filtered = [...workflows];

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(wf => 
        wf.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (wf.description && wf.description.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // 分类过滤
    if (categoryFilter) {
      filtered = filtered.filter(wf => wf.category === categoryFilter);
    }

    // 状态过滤（这里简化处理，实际应该检查是否有执行任务）
    // TODO: 需要API支持获取工作流状态

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        case 'updatedAt':
        default:
          return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
      }
    });

    setFilteredWorkflows(filtered);
  };

  const handleCreate = async (values: any) => {
    try {
      const workflow = await api.createWorkflow({
        name: values.name,
        description: values.description,
        version: values.version || '1.0.0',
        author: values.author,
        category: values.category,
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
        nodes: [],
        connections: [],
      });
      message.success('工作流创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      navigate(`/workflows/${workflow.id}`);
    } catch (error: any) {
      message.error(`创建失败: ${error.message}`);
    }
  };

  const handleImport = async (values: any) => {
    try {
      let workflowData;
      if (values.file && Array.isArray(values.file) && values.file.length > 0) {
        // 文件上传导入
        const file = values.file[0].originFileObj;
        const text = await file.text();
        workflowData = JSON.parse(text);
      } else if (values.jsonContent) {
        // JSON内容导入
        workflowData = JSON.parse(values.jsonContent);
      } else {
        message.error('请提供导入内容');
        return;
      }

      // 验证并创建工作流（移除id，让后端生成新的）
      const { id, createdAt, updatedAt, ...dataWithoutId } = workflowData;
      const workflow = await api.importWorkflow(dataWithoutId);
      message.success('工作流导入成功');
      setImportModalVisible(false);
      form.resetFields();
      loadWorkflows();
      navigate(`/workflows/${workflow.id}`);
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个工作流吗？',
      onOk: async () => {
        try {
          await api.deleteWorkflow(id);
          message.success('删除成功');
          loadWorkflows();
        } catch (error: any) {
          message.error(`删除失败: ${error.message}`);
        }
      },
    });
  };

  const handleExport = async (workflow: Workflow) => {
    if (!workflow.id) {
      message.warning('工作流尚未保存，无法导出');
      return;
    }
    try {
      const workflowData = await api.exportWorkflow(workflow.id);
      const jsonStr = JSON.stringify(workflowData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name}_${workflow.version || '1.0.0'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      message.error(`导出失败: ${error.message}`);
    }
  };

  // 获取所有分类
  const categories = Array.from(new Set(workflows.map(wf => wf.category).filter(Boolean))) as string[];

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                创建新工作流
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                导入工作流
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsVisible(true)}
              >
                设置
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="搜索工作流"
                allowClear
                style={{ width: 200 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={(value) => setSearchText(value)}
              />
              <Select
                placeholder="分类"
                style={{ width: 120 }}
                allowClear
                value={categoryFilter}
                onChange={setCategoryFilter}
              >
                {categories.map(cat => (
                  <Option key={cat} value={cat}>{cat}</Option>
                ))}
              </Select>
              <Select
                placeholder="排序"
                style={{ width: 120 }}
                value={sortBy}
                onChange={setSortBy}
              >
                <Option value="updatedAt">修改时间</Option>
                <Option value="createdAt">创建时间</Option>
                <Option value="name">名称</Option>
              </Select>
              <Radio.Group
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="card">
                  <AppstoreOutlined />
                </Radio.Button>
                <Radio.Button value="list">
                  <UnorderedListOutlined />
                </Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 工作流列表 */}
      {viewMode === 'card' ? (
        <Row gutter={[16, 16]}>
          {filteredWorkflows.map(workflow => (
            <Col key={workflow.id} xs={24} sm={12} md={8} lg={6}>
              <WorkflowCard
                workflow={workflow}
                onEdit={() => navigate(`/workflows/${workflow.id}`)}
                onDelete={() => handleDelete(workflow.id!)}
                onExport={() => handleExport(workflow)}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          dataSource={filteredWorkflows}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              key: 'name',
              width: 200,
              ellipsis: true,
              render: (text: string, record: Workflow) => (
                <a
                  onClick={() => navigate(`/workflows/${record.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {text}
                </a>
              ),
            },
            {
              title: '描述',
              dataIndex: 'description',
              key: 'description',
              ellipsis: true,
              render: (text: string) => text || '-',
            },
            {
              title: '分类',
              dataIndex: 'category',
              key: 'category',
              width: 120,
              render: (text: string) => text ? <Tag>{text}</Tag> : '-',
            },
            {
              title: '状态',
              key: 'status',
              width: 100,
              render: (_: any, record: Workflow) => {
                const hasNodes = record.nodes && record.nodes.length > 0;
                const statusInfo = hasNodes 
                  ? { color: 'success', text: '已部署' }
                  : { color: 'default', text: '未部署' };
                return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
              },
            },
            {
              title: '版本',
              dataIndex: 'version',
              key: 'version',
              width: 100,
              render: (text: string) => text || '-',
            },
            {
              title: '作者',
              dataIndex: 'author',
              key: 'author',
              width: 120,
              render: (text: string) => text || '-',
            },
            {
              title: '标签',
              dataIndex: 'tags',
              key: 'tags',
              width: 200,
              render: (tags: string[]) => {
                if (!tags || tags.length === 0) return '-';
                return (
                  <Space size={[4, 8]} wrap>
                    {tags.map((tag, index) => (
                      <Tag key={index}>{tag}</Tag>
                    ))}
                  </Space>
                );
              },
            },
            {
              title: '节点数',
              key: 'nodeCount',
              width: 100,
              align: 'center',
              render: (_: any, record: Workflow) => record.nodes?.length || 0,
            },
            
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              key: 'updatedAt',
              width: 180,
              render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              key: 'createdAt',
              width: 180,
              render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
            },

            {
              title: '操作',
              key: 'action',
              width: 250,
              fixed: 'right',
              render: (_: any, record: Workflow) => (
                <Space size="small">
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/workflows/${record.id}`)}
                    size="small"
                  >
                    编辑
                  </Button>
                  <Button
                    type="link"
                    icon={<ExportOutlined />}
                    onClick={() => handleExport(record)}
                    size="small"
                  >
                    导出
                  </Button>
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record.id!)}
                    size="small"
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
          scroll={{ x: 1400 }}
        />
      )}

      {/* 创建工作流对话框 */}
      <Modal
        title="创建新工作流"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[{ required: true, message: '请输入工作流名称' }]}
          >
            <Input placeholder="请输入工作流名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="version"
            label="版本号"
            initialValue="1.0.0"
          >
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作者"
          >
            <Input placeholder="请输入作者" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
          >
            <Select placeholder="请选择分类" allowClear>
              {categories.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="用逗号分隔多个标签" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入工作流对话框 */}
      <Modal
        title="导入工作流"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImport}
        >
          <Form.Item
            name="file"
            label="上传文件"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList || [];
            }}
          >
            <Upload
              accept=".json"
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="jsonContent"
            label="或粘贴JSON内容"
          >
            <Input.TextArea
              rows={10}
              placeholder="粘贴工作流JSON内容..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 设置面板 */}
      <Modal
        title="设置"
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={800}
      >
        <div>设置面板待实现（大模型配置等）</div>
      </Modal>
    </div>
  );
};

export default WorkflowList;


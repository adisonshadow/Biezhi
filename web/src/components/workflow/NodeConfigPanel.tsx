import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Radio,
  Slider,
  Checkbox,
  Upload,
  Button,
  Space,
  message,
  Collapse,
} from 'antd';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import type { Operator } from '../../types';
import type { UploadFile, UploadProps } from 'antd';
import { api } from '../../services/api';

const { Panel } = Collapse;

interface NodeConfigPanelProps {
  visible: boolean;
  operator?: Operator;
  config?: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

// 文件上传组件 - 按照 Ant Design 官方示例实现
interface FileUploadInputProps {
  name: string;
  componentProps?: any;
  form: any;
  uploadingRefs: React.MutableRefObject<Record<string, boolean>>;
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({ name, componentProps, form, uploadingRefs }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const loadedRef = React.useRef<string | null>(null);
  const initialValueRef = React.useRef<string | null>(null);
  
  // 使用 Form.useWatch 监听表单值变化（资源ID）
  const currentValue = Form.useWatch(name, form);

  // 组件挂载时获取初始值
  useEffect(() => {
    const initialValue = form.getFieldValue(name);
    if (initialValue && typeof initialValue === 'string') {
      initialValueRef.current = initialValue;
    }
  }, [form, name]);

  // 根据表单值（资源ID）加载文件信息并设置 fileList
  useEffect(() => {
    const loadFileInfo = async () => {
      // 优先使用当前值，如果没有则使用初始值
      const valueToLoad = currentValue || initialValueRef.current;
      
      if (!valueToLoad || typeof valueToLoad !== 'string') {
        setFileList((prev) => {
          if (prev.length > 0) {
            loadedRef.current = null;
            return [];
          }
          return prev;
        });
        return;
      }

      // 避免重复加载相同的资源
      if (loadedRef.current === valueToLoad) {
        return;
      }

      loadedRef.current = valueToLoad;

      try {
        const resource = await api.getResource(valueToLoad);
        const fileName = resource.fileName || resource.name || '已上传文件';
        const displayName = fileName.includes('/') || fileName.includes('\\') 
          ? fileName.split(/[/\\]/).pop() || fileName
          : fileName;
        
        setFileList([{
          uid: valueToLoad,
          name: displayName,
          status: 'done' as const,
          response: valueToLoad,
        }]);
      } catch (error: any) {
        console.error('获取资源信息失败:', error);
        setFileList([{
          uid: valueToLoad,
          name: '已上传文件',
          status: 'done' as const,
          response: valueToLoad,
        }]);
      }
    };

    loadFileInfo();
  }, [currentValue]);

  const handleChange: UploadProps['onChange'] = async (info) => {
    let newFileList = [...info.fileList];

    // 限制只能上传一个文件
    newFileList = newFileList.slice(-1);

    // 处理文件上传
    if (newFileList.length > 0) {
      const file = newFileList[0];

      // 如果文件被移除
      if (file.status === 'removed') {
        setFileList([]);
        form.setFieldValue(name, undefined);
        return;
      }

      // 如果是新文件，开始上传
      if (file.originFileObj && file.status !== 'uploading' && file.status !== 'done') {
        // 检查是否正在上传，避免重复上传
        if (uploadingRefs.current[name]) {
          return;
        }

        try {
          uploadingRefs.current[name] = true;
          
          // 更新文件状态为 uploading
          setFileList([{
            ...file,
            status: 'uploading',
          }]);

          // 手动上传文件
          const result = await api.uploadFile(file.originFileObj as File);
          
          // 从文件路径中提取文件名
          const fileName = result.fileName || file.name || '已上传文件';
          const displayName = fileName.includes('/') || fileName.includes('\\') 
            ? fileName.split(/[/\\]/).pop() || fileName
            : fileName;

          // 更新文件状态为 done
          const uploadedFile: UploadFile = {
            ...file,
            uid: result.id,
            name: displayName,
            status: 'done',
            response: result.id,
          };

          setFileList([uploadedFile]);
          
          // 更新表单值为资源ID
          form.setFieldValue(name, result.id);
          
          message.success(`文件上传成功: ${displayName}`);
        } catch (error: any) {
          // 上传失败，移除文件
          setFileList([]);
          form.setFieldValue(name, undefined);
          message.error(`文件上传失败: ${error.message}`);
        } finally {
          uploadingRefs.current[name] = false;
        }
      } else {
        // 更新文件列表
        setFileList(newFileList);
      }
    } else {
      setFileList([]);
    }
  };

  const uploadProps: UploadProps = {
    fileList,
    maxCount: 1,
    beforeUpload: () => false,
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true,
    },
    onChange: handleChange,
    ...componentProps,
  };

  return (
    <Upload {...uploadProps}>
      <Button icon={<UploadOutlined />}>
        {componentProps?.placeholder || '选择文件'}
      </Button>
    </Upload>
  );
};

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  visible,
  operator,
  config = {},
  onSave,
  onClose,
}) => {
  const [form] = Form.useForm();
  const uploadingRefs = React.useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (visible && config) {
      // 重置表单值，确保所有字段都能正确初始化
      form.resetFields();
      form.setFieldsValue(config);
    }
  }, [visible, config, form]);

  const handleSave = async () => {
    console.log('NodeConfigPanel: 开始保存配置');
    
    try {
      const values = await form.validateFields();
      console.log('NodeConfigPanel: 表单验证成功', values);
      
      onSave(values);
      message.success('配置已保存');
      onClose();
      
      console.log('NodeConfigPanel: 配置保存完成');
    } catch (error: any) {
      console.error('NodeConfigPanel: 表单验证失败', {
        error: error.message,
        errorFields: error?.errorFields
      });
    }
  };

  // 构建验证规则
  const buildValidationRules = (param: any): any[] => {
    const { label, required, validation } = param;
    // validation 在下面的逻辑中使用
    const rules: any[] = [];
    
    if (required) {
      rules.push({ required: true, message: `${label || param.name}是必填项` });
    }
    
    if (validation) {
      // 字符串验证
      if (validation.type === 'string') {
        if (validation.min !== undefined) {
          rules.push({ 
            min: validation.min, 
            message: validation.message || `最小长度为${validation.min}` 
          });
        }
        if (validation.max !== undefined) {
          rules.push({ 
            max: validation.max, 
            message: validation.message || `最大长度为${validation.max}` 
          });
        }
        if (validation.pattern) {
          rules.push({ 
            pattern: new RegExp(validation.pattern), 
            message: validation.message || '格式不正确' 
          });
        }
      }
      
      // 数字验证
      if (validation.type === 'number' || validation.type === 'integer') {
        if (validation.min !== undefined) {
          rules.push({ 
            type: 'number', 
            min: validation.min, 
            message: validation.message || `最小值为${validation.min}` 
          });
        }
        if (validation.max !== undefined) {
          rules.push({ 
            type: 'number', 
            max: validation.max, 
            message: validation.message || `最大值为${validation.max}` 
          });
        }
        if (validation.step !== undefined) {
          // step 验证通过 InputNumber 的 step 属性处理
        }
      }
      
      // 布尔值验证
      if (validation.type === 'boolean') {
        rules.push({ 
          type: 'boolean', 
          message: validation.message || '必须是布尔值' 
        });
      }
    }
    
    return rules;
  };

  const renderFormItem = (param: any) => {
    const { name, label, description, default: defaultValue, ui } = param;
    const component = ui?.component || 'input';

    // 获取初始值
    const initialValue = config[name] !== undefined ? config[name] : defaultValue;

    // 构建验证规则
    const rules = buildValidationRules(param);

    // 提取 itemProps 和 componentProps
    const { itemProps = {}, componentProps = {}, options } = ui || {};
    
    // 合并 Form.Item 的基础属性（不包含 key）
    const formItemProps = {
      name,
      label,
      rules,
      tooltip: description,
      initialValue,
      ...itemProps, // itemProps 可以覆盖基础属性
    };

    switch (component) {
      case 'input':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input {...componentProps} />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input.TextArea rows={4} {...componentProps} />
          </Form.Item>
        );

      case 'inputNumber':
        return (
          <Form.Item key={name} {...formItemProps}>
            <InputNumber
              style={{ width: '100%' }}
              {...componentProps}
            />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Select {...componentProps}>
              {options?.map((option: any) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'radio':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Radio.Group {...componentProps}>
              {options?.map((option: any) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        );

      case 'switch':
        return (
          <Form.Item
            key={name}
            {...formItemProps}
            valuePropName="checked"
            initialValue={initialValue ?? false}
          >
            <Switch {...componentProps} />
          </Form.Item>
        );

      case 'slider':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Slider {...componentProps} />
          </Form.Item>
        );

      case 'checkbox':
        return (
          <Form.Item
            key={name}
            {...formItemProps}
            valuePropName="checked"
            initialValue={initialValue ?? false}
          >
            <Checkbox {...componentProps}>{label}</Checkbox>
          </Form.Item>
        );

      case 'fileInput':
        // 文件上传组件 - 按照 Ant Design 官方示例实现
        return (
          <Form.Item
            key={name}
            {...formItemProps}
            getValueFromEvent={(e) => {
              // 从 fileList 中提取资源ID
              if (Array.isArray(e)) {
                const file = e[0];
                return file?.response || undefined;
              }
              if (e?.fileList && e.fileList.length > 0) {
                const file = e.fileList[0];
                return file?.response || undefined;
              }
              return undefined;
            }}
          >
            <FileUploadInput
              name={name}
              componentProps={componentProps}
              form={form}
              uploadingRefs={uploadingRefs}
            />
          </Form.Item>
        );

      case 'file':
        // 文件路径输入（兼容旧配置）
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input {...componentProps} />
          </Form.Item>
        );

      case 'collapse':
        // collapse 用于分组，不渲染表单项，而是返回分组容器
        // 注意：这个需要在外部处理，这里返回 null
        return null;

      default:
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input {...componentProps} />
          </Form.Item>
        );
    }
  };

  // 处理 operatorParams，确保它是数组格式
  const getOperatorParams = (): any[] => {
    const params = operator?.operatorParams;
    if (!params) return [];
    // 如果是数组，直接返回
    if (Array.isArray(params)) return params;
    // 如果是对象，尝试转换为数组
    if (typeof params === 'object') {
      // 如果是空对象，返回空数组
      if (Object.keys(params).length === 0) return [];
      // 否则尝试将对象值转换为数组
      return Object.values(params);
    }
    return [];
  };

  const operatorParams = getOperatorParams();
  const hasParams = operatorParams.length > 0;
  
  // 条件渲染包装函数 - 处理 showWhen
  const renderFormItemWithCondition = (param: any) => {
    const formItem = renderFormItem(param);
    const showWhen = param.ui?.showWhen;

    // 如果没有 showWhen 配置，直接返回表单项
    if (!showWhen) {
      return formItem;
    }

    const { field, value: expectedValue } = showWhen;

    // 使用 Form.Item 的 shouldUpdate 实现条件渲染
    return (
      <Form.Item
        key={`${param.name}-condition`}
        noStyle
        shouldUpdate={(prevValues, curValues) => {
          return prevValues[field] !== curValues[field];
        }}
      >
        {({ getFieldValue }) => {
          const fieldValue = getFieldValue(field);
          if (fieldValue === expectedValue) {
            return formItem;
          }
          return null;
        }}
      </Form.Item>
    );
  };

  // 处理分组（collapse）
  const renderFormWithGroups = () => {
    interface GroupType {
      name: string;
      params: any[];
    }
    const groups: GroupType[] = [];
    const ungrouped: any[] = [];
    let currentGroup: GroupType | null = null;
    
    for (const param of operatorParams) {
      if (param.ui?.component === 'collapse') {
        // 这是一个分组标记，保存当前分组（如果有）
        if (currentGroup !== null && currentGroup.params.length > 0) {
          groups.push(currentGroup);
        }
        // 创建新分组
        currentGroup = {
          name: param.label || param.name || '未命名分组',
          params: [],
        };
      } else {
        // 普通参数
        if (currentGroup !== null) {
          // 属于当前分组
          currentGroup.params.push(param);
        } else {
          // 不属于任何分组
          ungrouped.push(param);
        }
      }
    }
    
    // 保存最后一个分组（如果有）
    if (currentGroup !== null && currentGroup.params.length > 0) {
      groups.push(currentGroup);
    }
    
    return (
      <Form form={form} layout="vertical" variant="filled">
        {/* 渲染未分组的表单项 */}
        {ungrouped.map((param: any) => renderFormItemWithCondition(param))}
        
        {/* 渲染分组的表单项 */}
        {groups.map((group, index) => (
          <Collapse key={`group-${index}`} defaultActiveKey={[`group-${index}`]} style={{ marginBottom: 16 }}>
            <Panel header={group.name} key={`group-${index}`}>
              {group.params.map((param: any) => renderFormItemWithCondition(param))}
            </Panel>
          </Collapse>
        ))}
      </Form>
    );
  };

  return (
    <Drawer
      title={`配置节点: ${operator?.name || '未知算子'}`}
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      {hasParams ? (
        renderFormWithGroups()
      ) : (
        <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
          该算子无需配置参数
        </div>
      )}
    </Drawer>
  );
};

export default NodeConfigPanel;


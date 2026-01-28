import React, { useEffect, useState } from 'react';
import {
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
  Collapse,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { Operator } from '../../types';
import type { UploadFile, UploadProps } from 'antd';
import { api } from '../../services/api';

const { Panel } = Collapse;

interface InlineNodeConfigProps {
  operator?: Operator;
  config?: any;
  onConfigChange: (config: any) => void;
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
  
  // 使用 Form.useWatch 监听表单值变化（资源ID）
  const currentValue = Form.useWatch(name, form);

  // 根据表单值（资源ID）加载文件信息并设置 fileList
  useEffect(() => {
    const loadFileInfo = async () => {
      if (!currentValue || typeof currentValue !== 'string' || !currentValue.startsWith('res_')) {
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
      if (loadedRef.current === currentValue) {
        return;
      }

      loadedRef.current = currentValue;

      try {
        const resource = await api.getResource(currentValue);
        const fileName = resource.fileName || resource.name || '已上传文件';
        const displayName = fileName.includes('/') || fileName.includes('\\') 
          ? fileName.split(/[/\\]/).pop() || fileName
          : fileName;
        
        setFileList([{
          uid: currentValue,
          name: displayName,
          status: 'done' as const,
          response: currentValue,
        }]);
      } catch (error: any) {
        console.error('获取资源信息失败:', error);
        setFileList([{
          uid: currentValue,
          name: '已上传文件',
          status: 'done' as const,
          response: currentValue,
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
          
          // 更新表单值为资源ID（getValueFromEvent 会从 fileList 中提取）
          // 需要手动触发 onChange 来更新表单值
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
      <Button icon={<UploadOutlined />} size="small">
        {componentProps?.placeholder || '选择文件'}
      </Button>
    </Upload>
  );
};


const InlineNodeConfig: React.FC<InlineNodeConfigProps> = ({
  operator,
  config = {},
  onConfigChange,
}) => {
  const [form] = Form.useForm();
  const uploadingRefs = React.useRef<Record<string, boolean>>({});
  const previousConfigRef = React.useRef<string>('');

  useEffect(() => {
    // 使用 JSON.stringify 比较 config 是否真的变化了，避免对象引用导致的无限循环
    const configStr = JSON.stringify(config || {});
    if (configStr !== previousConfigRef.current) {
      previousConfigRef.current = configStr;
      if (config) {
        form.setFieldsValue(config);
      }
    }
  }, [config]); // 移除 form 作为依赖项，因为它是稳定的

  // 构建验证规则
  const buildValidationRules = (param: any): any[] => {
    const { label, required, validation } = param;
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
    const { name, label, description, ui } = param;
    const component = ui?.component || 'input';

    // 构建验证规则
    const rules = buildValidationRules(param);

    // 提取 itemProps 和 componentProps
    const { itemProps = {}, componentProps = {}, options } = ui || {};
    
    // 合并 Form.Item 的基础属性（不包含 key 和 initialValue）
    const formItemProps = {
      name,
      label,
      rules,
      tooltip: description,
      style: { marginBottom: 8 },
      ...itemProps, // itemProps 可以覆盖基础属性
    };

    switch (component) {
      case 'input':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input size="small" {...componentProps} />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input.TextArea rows={2} size="small" {...componentProps} />
          </Form.Item>
        );

      case 'inputNumber':
        return (
          <Form.Item key={name} {...formItemProps}>
            <InputNumber
              style={{ width: '100%' }}
              size="small"
              {...componentProps}
            />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item key={name} {...formItemProps}>
            <Select size="small" {...componentProps}>
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
            <Radio.Group size="small" {...componentProps}>
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
          >
            <Switch size="small" {...componentProps} />
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
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input size="small" {...componentProps} />
          </Form.Item>
        );

      case 'collapse':
        return null;

      default:
        return (
          <Form.Item key={name} {...formItemProps}>
            <Input size="small" {...componentProps} />
          </Form.Item>
        );
    }
  };

  // 处理 operatorParams，确保它是数组格式
  const getOperatorParams = (): any[] => {
    if (!operator) {
      return [];
    }
    
    const params = operator.operatorParams;
    
    if (params === null || params === undefined) {
      return [];
    }
    
    // 如果是字符串，尝试解析
    if (typeof params === 'string') {
      try {
        const parsed = JSON.parse(params);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (typeof parsed === 'object') {
          if (Object.keys(parsed).length === 0) return [];
          return Object.values(parsed);
        }
        return [];
      } catch (e) {
        console.error('Failed to parse operatorParams as JSON:', e);
        return [];
      }
    }
    
    if (Array.isArray(params)) {
      return params;
    }
    
    if (typeof params === 'object') {
      if (Object.keys(params).length === 0) return [];
      return Object.values(params);
    }
    
    return [];
  };

  const operatorParams = getOperatorParams();
  const hasParams = operatorParams.length > 0;
  
  // 构建 initialValues
  const initialValues = React.useMemo(() => {
    const values: any = {};
    operatorParams.forEach((param: any) => {
      if (param.ui?.component !== 'collapse') {
        const value = config[param.name] !== undefined ? config[param.name] : param.default;
        if (value !== undefined) {
          values[param.name] = value;
        }
      }
    });
    return values;
  }, [config, operatorParams]);
  
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
    const groups: Array<{ name: string; params: any[] }> = [];
    const ungrouped: any[] = [];
    let currentGroup: { name: string; params: any[] } | null = null;
    
    for (const param of operatorParams) {
      if (param.ui?.component === 'collapse') {
        if (currentGroup && currentGroup.params.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = {
          name: param.label || param.name || '未命名分组',
          params: [],
        };
      } else {
        if (currentGroup) {
          currentGroup.params.push(param);
        } else {
          ungrouped.push(param);
        }
      }
    }
    
    if (currentGroup !== null && currentGroup.params.length > 0) {
      groups.push(currentGroup);
    }
    
    return (
      <Form 
        form={form} 
        layout="horizontal" 
        variant="filled"
        size="small"
        initialValues={initialValues}
        onValuesChange={(_changedValues, allValues) => {
          // 实时更新配置
          onConfigChange(allValues);
        }}
      >
        {ungrouped.map((param: any) => renderFormItemWithCondition(param))}
        
        {groups.map((group, index) => (
          <Collapse key={`group-${index}`} size="small" style={{ marginBottom: 8 }}>
            <Panel header={group.name} key={`group-${index}`}>
              {group.params.map((param: any) => renderFormItemWithCondition(param))}
            </Panel>
          </Collapse>
        ))}
      </Form>
    );
  };

  if (!hasParams) {
    return null;
  }

  return (
    <div
      style={{
        maxHeight: '200px',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px',
        // borderTop: '1px solid #f0f0f0',
        // background: '#fafafa',
      }}
      className='nodrag nopan nowheel'
    >
      {renderFormWithGroups()}
    </div>
  );
};

export default InlineNodeConfig;


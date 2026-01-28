import React, { useState } from 'react';
import { Input, Tag, Empty, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { Operator } from '../../types';

interface NodePanelProps {
  operators: Operator[];
  onAddNode: (operator: Operator) => void;
}

const NodePanel: React.FC<NodePanelProps> = ({ operators, onAddNode }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索算子"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
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

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredOperators.length === 0 ? (
          <Empty description="没有找到算子" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredOperators.map((operator) => (
              <div
                key={operator.id}
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  transition: 'all 0.2s',
                }}
                onClick={() => onAddNode(operator)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1890ff';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f0f0f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ marginBottom: 4 }}>
                    <Space>
                      <span style={{ fontWeight: 500 }}>{operator.name}</span>
                      {operator.operatorType && (
                        <Tag color={getOperatorTypeColor(operator.operatorType)} size="small">
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
                        <Tag key={idx} size="small" style={{ marginTop: 4 }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodePanel;


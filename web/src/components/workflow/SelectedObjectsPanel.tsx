/**
 * 选中对象面板组件
 * 显示在AIChatPanel的Sender上方，显示用户选中的节点和边
 */
import React from 'react';
import { Tag, Button, Space, Flex } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { Workflow, Operator } from '../../types';

interface SelectedObjectsPanelProps {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  workflow: Workflow | null;
  operators: Operator[];
  onRemoveNode?: (nodeId: string) => void;
  onRemoveEdge?: (edgeId: string) => void;
  onClearAll?: () => void;
}

const SelectedObjectsPanel: React.FC<SelectedObjectsPanelProps> = ({
  selectedNodeIds,
  selectedEdgeIds,
  workflow,
  operators,
  onRemoveNode,
  onRemoveEdge,
  onClearAll,
}) => {

  // 获取节点信息
  const getNodeInfo = (nodeId: string) => {
    const node = workflow?.nodes?.find(n => n.id === nodeId);
    if (!node) return null;
    
    const operator = operators.find(op => op.id === node.operatorId);
    return {
      node,
      operator,
      displayName: operator?.name || node.id,
    };
  };

  // 获取边信息
  const getEdgeInfo = (edgeId: string) => {
    const edge = workflow?.connections?.find(c => c.id === edgeId);
    if (!edge) return null;
    
    const fromNode = workflow?.nodes?.find(n => n.id === edge.from?.node);
    const toNode = workflow?.nodes?.find(n => n.id === edge.to?.node);
    const fromOperator = fromNode ? operators.find(op => op.id === fromNode.operatorId) : null;
    const toOperator = toNode ? operators.find(op => op.id === toNode.operatorId) : null;
    
    return {
      edge,
      fromNodeName: fromOperator?.name || fromNode?.id || edge.from?.node || '未知',
      toNodeName: toOperator?.name || toNode?.id || edge.to?.node || '未知',
    };
  };

  return (
    <div
      style={{
        padding: '8px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      <Flex justify="space-between" align="center" gap={8}>
        <Space size={[8, 8]} wrap>
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)' }}>
            已选中:
          </span>
          
          {/* 始终显示"画布"标签 */}
          <Tag
            color="default"
            style={{
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            画布
          </Tag>
          
          {/* 节点标签 */}
          {selectedNodeIds.map((nodeId) => {
            const nodeInfo = getNodeInfo(nodeId);
            if (!nodeInfo) return null;
            
            return (
              <Tag
                key={`node-${nodeId}`}
                // closable={!!onRemoveNode}
                // onClose={() => onRemoveNode?.(nodeId)}
                color="blue"
                style={{
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {nodeInfo.displayName}
              </Tag>
            );
          })}
          
          {/* 边标签 */}
          {selectedEdgeIds.map((edgeId) => {
            const edgeInfo = getEdgeInfo(edgeId);
            if (!edgeInfo) return null;
            
            return (
              <Tag
                key={`edge-${edgeId}`}
                // closable={!!onRemoveEdge}
                // onClose={() => onRemoveEdge?.(edgeId)}
                color="green"
                style={{
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {edgeInfo.fromNodeName} → {edgeInfo.toNodeName}
              </Tag>
            );
          })}
        </Space>
        
        {/* 清除全部按钮 */}
        {/* {onClearAll && (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) && (
          <Button
            type="text"
            size="small"
            onClick={onClearAll}
            style={{
              fontSize: '12px',
              padding: '0 8px',
              height: '24px',
            }}
          >
            清除全部
          </Button>
        )} */}
      </Flex>
    </div>
  );
};

export default SelectedObjectsPanel;

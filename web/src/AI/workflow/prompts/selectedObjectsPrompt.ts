/**
 * 选中对象提示词模版
 */

/**
 * 格式化选中对象上下文信息
 * 
 * @param data 选中对象的详细信息
 * @returns 格式化后的提示词文本
 */
export function formatSelectedObjectsContext(data: {
  nodes?: Array<{
    node_id: string;
    operator_id: string;
    operator_name?: string;
    operator_type?: string;
    node_type?: string;
    config?: any;
    operator_info?: any;
    connections?: {
      incoming?: Array<{
        edge_id: string;
        from_node: string;
        from_port?: string;
        to_port?: string;
      }>;
      outgoing?: Array<{
        edge_id: string;
        to_node: string;
        to_port?: string;
        from_port?: string;
      }>;
    };
  }>;
  edges?: Array<{
    edge_id: string;
    from_node: string;
    to_node: string;
    from_port?: string;
    to_port?: string;
    from_node_info?: {
      node_id: string;
      operator_name: string;
      operator_id: string;
    };
    to_node_info?: {
      node_id: string;
      operator_name: string;
      operator_id: string;
    };
  }>;
}): string {
  const lines: string[] = [];
  
  lines.push('## 当前选中的对象');
  lines.push('');
  
  if (data.nodes && data.nodes.length > 0) {
    lines.push(`### 选中的节点 (${data.nodes.length}个)`);
    lines.push('');
    data.nodes.forEach((node, index) => {
      lines.push(`#### 节点${index + 1}: ${node.node_id}`);
      lines.push(`- **算子**: ${node.operator_name || '未知'} (${node.operator_id})`);
      lines.push(`- **算子类型**: ${node.operator_type || '未设置'}`);
      if (node.node_type) {
        lines.push(`- **节点类型**: ${node.node_type}`);
      }
      if (node.config && Object.keys(node.config).length > 0) {
        lines.push(`- **配置**:`);
        lines.push('```json');
        lines.push(JSON.stringify(node.config, null, 2));
        lines.push('```');
      }
      
      // 连接关系
      if (node.connections) {
        if (node.connections.incoming && node.connections.incoming.length > 0) {
          lines.push(`- **输入连接** (${node.connections.incoming.length}条):`);
          node.connections.incoming.forEach((conn) => {
            lines.push(`  - ${conn.from_node}[${conn.from_port || 'output'}] → ${node.node_id}[${conn.to_port || 'input'}]`);
          });
        }
        if (node.connections.outgoing && node.connections.outgoing.length > 0) {
          lines.push(`- **输出连接** (${node.connections.outgoing.length}条):`);
          node.connections.outgoing.forEach((conn) => {
            lines.push(`  - ${node.node_id}[${conn.from_port || 'output'}] → ${conn.to_node}[${conn.to_port || 'input'}]`);
          });
        }
      }
      
      lines.push('');
    });
  }
  
  if (data.edges && data.edges.length > 0) {
    lines.push(`### 选中的边 (${data.edges.length}条)`);
    lines.push('');
    data.edges.forEach((edge, index) => {
      lines.push(`#### 连接${index + 1}: ${edge.edge_id}`);
      lines.push(`- **源节点**: ${edge.from_node_info?.operator_name || edge.from_node} (${edge.from_node})`);
      lines.push(`- **目标节点**: ${edge.to_node_info?.operator_name || edge.to_node} (${edge.to_node})`);
      lines.push(`- **连接**: ${edge.from_node}[${edge.from_port || 'output'}] → ${edge.to_node}[${edge.to_port || 'input'}]`);
      lines.push('');
    });
  }
  
  if ((!data.nodes || data.nodes.length === 0) && (!data.edges || data.edges.length === 0)) {
    lines.push('当前没有选中任何对象。');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 生成选中对象上下文注入的提示词
 * 
 * @returns 选中对象上下文注入的提示词文本
 */
export function generateSelectedObjectsContextPrompt(): string {
  const lines: string[] = [];

  lines.push('# 选中对象上下文注入说明');
  lines.push('');
  lines.push('## 功能说明');
  lines.push('');
  lines.push('当用户在画布上选中节点或边时，这些信息会自动注入到AI对话的上下文中。');
  lines.push('这样AI可以更好地理解用户当前关注的对象，提供更精准的建议和操作。');
  lines.push('');
  lines.push('## 使用场景');
  lines.push('');
  lines.push('1. **用户选中节点后提问**');
  lines.push('   - 用户选中某个节点，然后问："这个节点的配置是什么？"');
  lines.push('   - AI会自动知道用户指的是哪个节点，无需用户再次说明');
  lines.push('');
  lines.push('2. **用户选中多个节点后请求操作**');
  lines.push('   - 用户选中多个节点，然后说："优化这些节点的配置"');
  lines.push('   - AI会针对选中的节点进行操作');
  lines.push('');
  lines.push('3. **用户选中连接后询问**');
  lines.push('   - 用户选中某个连接，然后问："这个连接的数据流是什么？"');
  lines.push('   - AI会提供该连接的详细信息');
  lines.push('');
  lines.push('## 上下文信息包含');
  lines.push('');
  lines.push('### 节点信息');
  lines.push('- 节点ID和算子信息');
  lines.push('- 节点配置参数');
  lines.push('- 节点的输入和输出连接');
  lines.push('- 算子详细信息（如果可用）');
  lines.push('');
  lines.push('### 边信息');
  lines.push('- 连接ID');
  lines.push('- 源节点和目标节点信息');
  lines.push('- 端口信息');
  lines.push('');
  lines.push('## AI处理建议');
  lines.push('');
  lines.push('1. **优先使用选中对象**');
  lines.push('   - 如果用户选中了对象，优先针对选中的对象进行操作');
  lines.push('   - 如果用户的问题涉及特定对象，但未选中，可以提示用户选中');
  lines.push('');
  lines.push('2. **理解用户意图**');
  lines.push('   - 结合选中对象和用户问题，理解用户的真实意图');
  lines.push('   - 如果选中了多个对象，考虑是否需要批量操作');
  lines.push('');
  lines.push('3. **提供精准建议**');
  lines.push('   - 基于选中对象的详细信息，提供针对性的建议');
  lines.push('   - 考虑对象的连接关系和上下文');
  lines.push('');

  return lines.join('\n');
}

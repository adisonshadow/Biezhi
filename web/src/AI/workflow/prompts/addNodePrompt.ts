/**
 * 添加节点提示词模版
 */

/**
 * 生成添加节点到工作流的提示词，用于AI会话上下文
 * 
 * @returns 添加节点的提示词文本
 */
export function generateAddNodePrompt(): string {
  const lines: string[] = [];

  lines.push('# AI 添加节点到工作流指南');
  lines.push('');
  lines.push('## 使用 add_node_to_workflow 函数');
  lines.push('');
  lines.push('当你需要向工作流添加节点时，使用 `add_node_to_workflow` 函数。');
  lines.push('');
  lines.push('## 函数参数说明');
  lines.push('');
  lines.push('### 必需参数');
  lines.push('- `workflow_id`: 工作流ID');
  lines.push('');
  lines.push('### 可选参数');
  lines.push('- `operator_id`: 要添加的算子ID（如果不提供，AI会根据description自动搜索）');
  lines.push('- `description`: 节点功能描述（当operator_id未提供时推荐使用），例如："添加一个数据清洗节点"');
  lines.push('- `position_after_node`: 插入位置：在此节点之后插入');
  lines.push('- `position_before_node`: 插入位置：在此节点之前插入');
  lines.push('- `connect_from`: 连接来源节点ID（可选，AI可以自动推断）');
  lines.push('- `connect_to`: 连接目标节点ID（可选，AI可以自动推断）');
  lines.push('- `auto_config`: 是否自动配置节点参数（默认true）');
  lines.push('- `node_id`: 节点ID（可选，不提供则自动生成）');
  lines.push('- `position_x`: 节点X坐标（可选）');
  lines.push('- `position_y`: 节点Y坐标（可选）');
  lines.push('');
  lines.push('## 最佳实践');
  lines.push('');
  lines.push('1. **选择合适的算子**');
  lines.push('   - 如果用户明确指定了算子名称，使用 `operator_id` 参数');
  lines.push('   - 如果用户只描述了功能需求，使用 `description` 参数，让AI自动搜索合适的算子');
  lines.push('   - 可以使用 `search_operators` 函数先搜索可用的算子');
  lines.push('');
  lines.push('2. **确定插入位置**');
  lines.push('   - 优先使用 `position_after_node` 或 `position_before_node` 指定位置');
  lines.push('   - 如果用户提到"在某个节点之后/之前"，使用对应的参数');
  lines.push('   - 如果没有指定位置，AI会根据工作流结构自动推断最佳位置');
  lines.push('');
  lines.push('3. **建立连接关系**');
  lines.push('   - 如果用户明确指定了连接关系，使用 `connect_from` 和 `connect_to` 参数');
  lines.push('   - 否则，AI会根据节点类型和数据流自动推断连接关系');
  lines.push('   - 确保连接符合数据流的方向（从上游到下游）');
  lines.push('');
  lines.push('4. **自动配置节点**');
  lines.push('   - 默认 `auto_config` 为 true，AI会自动配置节点参数');
  lines.push('   - 如果节点需要特殊配置，可以在添加节点后使用 `auto_configure_node` 函数');
  lines.push('');
  lines.push('## 示例场景');
  lines.push('');
  lines.push('### 场景1：添加数据清洗节点');
  lines.push('```');
  lines.push('用户："在数据收集节点之后添加一个数据清洗节点"');
  lines.push('AI调用：add_node_to_workflow({');
  lines.push('  workflow_id: "wf_123",');
  lines.push('  description: "数据清洗节点",');
  lines.push('  position_after_node: "node_data_collector",');
  lines.push('  auto_config: true');
  lines.push('})');
  lines.push('```');
  lines.push('');
  lines.push('### 场景2：添加指定算子');
  lines.push('```');
  lines.push('用户："添加一个数据分析算子，ID是 op_abc123"');
  lines.push('AI调用：add_node_to_workflow({');
  lines.push('  workflow_id: "wf_123",');
  lines.push('  operator_id: "op_abc123",');
  lines.push('  auto_config: true');
  lines.push('})');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

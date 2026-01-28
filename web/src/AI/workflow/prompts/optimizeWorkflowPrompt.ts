/**
 * 优化工作流提示词模版
 */

/**
 * 生成优化工作流的提示词，用于AI会话上下文
 * 
 * @returns 优化工作流的提示词文本
 */
export function generateOptimizeWorkflowPrompt(): string {
  const lines: string[] = [];

  lines.push('# AI 优化工作流指南');
  lines.push('');
  lines.push('## 使用 optimize_workflow 函数');
  lines.push('');
  lines.push('当你需要优化工作流时，使用 `optimize_workflow` 函数。');
  lines.push('优化工作流包括但不限于：');
  lines.push('- 删除冗余节点');
  lines.push('- 合并相似功能的节点');
  lines.push('- 优化节点配置');
  lines.push('- 添加数据对齐节点');
  lines.push('- 优化连接关系');
  lines.push('- 提高执行效率');
  lines.push('');
  lines.push('## 函数参数说明');
  lines.push('');
  lines.push('### 必需参数');
  lines.push('- `workflow_id`: 工作流ID');
  lines.push('');
  lines.push('### 可选参数');
  lines.push('- `optimization_goals`: 优化目标数组，例如：["performance", "simplicity", "cost"]');
  lines.push('- `constraints`: 约束条件，例如：{"max_nodes": 10, "required_nodes": ["node_1", "node_2"]}');
  lines.push('- `auto_apply`: 是否自动应用优化（默认false，只提供建议）');
  lines.push('');
  lines.push('## 优化策略');
  lines.push('');
  lines.push('1. **性能优化**');
  lines.push('   - 识别并删除不必要的节点');
  lines.push('   - 合并可以合并的操作');
  lines.push('   - 优化数据流路径');
  lines.push('');
  lines.push('2. **简化工作流**');
  lines.push('   - 减少节点数量');
  lines.push('   - 简化连接关系');
  lines.push('   - 移除重复功能');
  lines.push('');
  lines.push('3. **数据对齐**');
  lines.push('   - 识别需要数据对齐的节点');
  lines.push('   - 自动添加数据对齐节点');
  lines.push('   - 确保数据格式兼容');
  lines.push('');
  lines.push('4. **配置优化**');
  lines.push('   - 优化节点参数配置');
  lines.push('   - 调整执行顺序');
  lines.push('   - 提高资源利用率');
  lines.push('');
  lines.push('## 最佳实践');
  lines.push('');
  lines.push('1. **分析当前工作流**');
  lines.push('   - 先使用 `get_workflow_detail` 获取完整的工作流信息');
  lines.push('   - 识别潜在的问题和优化点');
  lines.push('   - 考虑用户的具体需求');
  lines.push('');
  lines.push('2. **制定优化方案**');
  lines.push('   - 明确优化目标（性能、简化、成本等）');
  lines.push('   - 考虑约束条件（不能删除的节点、必须保留的功能等）');
  lines.push('   - 制定分步优化计划');
  lines.push('');
  lines.push('3. **执行优化**');
  lines.push('   - 如果 `auto_apply` 为 false，先向用户展示优化建议');
  lines.push('   - 获得用户确认后，再执行优化操作');
  lines.push('   - 如果 `auto_apply` 为 true，直接执行优化');
  lines.push('');
  lines.push('4. **验证优化结果**');
  lines.push('   - 确保优化后的工作流仍然完整');
  lines.push('   - 验证所有连接关系正确');
  lines.push('   - 检查节点配置是否合理');
  lines.push('');
  lines.push('## 注意事项');
  lines.push('');
  lines.push('- 优化前会自动创建checkpoint，用户可以通过回滚功能恢复');
  lines.push('- 优化操作会修改工作流结构，建议先保存当前版本');
  lines.push('- 如果优化涉及删除节点，确保不会影响工作流的完整性');
  lines.push('');

  return lines.join('\n');
}

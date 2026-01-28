/**
 * 自动配置节点提示词模版
 */

/**
 * 生成自动配置节点的提示词，用于AI会话上下文
 * 
 * @returns 自动配置节点的提示词文本
 */
export function generateAutoConfigureNodePrompt(): string {
  const lines: string[] = [];

  lines.push('# AI 自动配置节点指南');
  lines.push('');
  lines.push('## 使用 auto_configure_node 函数');
  lines.push('');
  lines.push('当你需要根据上下文自动配置节点参数时，使用 `auto_configure_node` 函数。');
  lines.push('这个函数会基于以下信息智能填充节点配置：');
  lines.push('- 算子的参数定义和默认值');
  lines.push('- 上游节点的输出数据');
  lines.push('- 工作流的整体上下文');
  lines.push('- 用户提供的配置覆盖');
  lines.push('');
  lines.push('## 函数参数说明');
  lines.push('');
  lines.push('### 必需参数');
  lines.push('- `workflow_id`: 工作流ID（**必须提供，不能省略**）');
  lines.push('  - **获取方式**：');
  lines.push('    * 从工作流详情中获取（调用 `get_workflow_detail` 获取工作流信息）');
  lines.push('    * 从 `window.workflow_id` 全局变量中获取（如果可用）');
  lines.push('    * 从上下文信息中获取');
  lines.push('  - **禁止**：绝对不要使用占位符文本（如"当前工作流ID"、"default"、"workflow_id"等）');
  lines.push('- `node_id`: 要配置的节点ID');
  lines.push('');
  lines.push('### 可选参数');
  lines.push('- `config_overrides`: 部分配置覆盖（可选），AI会在此基础上进行智能填充');
  lines.push('- `based_on_upstream_data`: 是否基于上游节点的输出数据进行配置（默认true）');
  lines.push('');
  lines.push('## 配置策略');
  lines.push('');
  lines.push('1. **使用算子默认值**');
  lines.push('   - 从算子的 `operatorParams` 中获取参数的默认值');
  lines.push('   - 如果参数有默认值，直接使用');
  lines.push('');
  lines.push('2. **基于上游数据**');
  lines.push('   - 如果 `based_on_upstream_data` 为 true，分析上游节点的输出');
  lines.push('   - **重要：对于弱类型数据（不固定结构）**：');
  lines.push('     * 如果上游节点输出类型是 `list`、`dict`、`object` 等弱类型，必须先调用 `get_node_upstream_data_structure` 获取实际的数据结构片段');
  lines.push('     * **获取 workflow_id**：在调用 `get_node_upstream_data_structure` 前，必须先获取 `workflow_id`：');
  lines.push('       - 从工作流详情中获取（调用 `get_workflow_detail` 获取工作流信息）');
  lines.push('       - 从 `window.workflow_id` 全局变量中获取（如果可用）');
  lines.push('       - 从上下文信息中获取');
  lines.push('       - **禁止**：绝对不要使用占位符文本（如"当前工作流ID"、"default"等）');
  lines.push('     * 调用示例：`get_node_upstream_data_structure({ workflow_id: "wf_12345", node_id: "node_xxx" })`');
  lines.push('     * 分析数据结构，了解字段名称、类型、嵌套结构等');
  lines.push('     * 基于实际数据结构配置节点参数（如字段映射、过滤条件等）');
  lines.push('   - **对于强类型数据**：');
  lines.push('     * 如果上游节点输出是强类型（如 `pandas.DataFrame`），可以使用 `get_node_upstream_data_features` 获取数据特征');
  lines.push('     * **同样需要先获取 workflow_id**：调用 `get_node_upstream_data_features` 时也必须提供 `workflow_id`');
  lines.push('     * 根据数据格式和类型，自动配置相关参数');
  lines.push('     * 例如：如果上游输出是CSV格式，自动配置文件路径参数');
  lines.push('');
  lines.push('3. **应用用户覆盖**');
  lines.push('   - 如果用户提供了 `config_overrides`，优先使用用户指定的值');
  lines.push('   - 在用户值的基础上，填充其他未指定的参数');
  lines.push('');
  lines.push('4. **智能推断**');
  lines.push('   - 根据节点在工作流中的位置推断配置');
  lines.push('   - 考虑节点的连接关系和上下文');
  lines.push('   - 确保配置符合工作流的整体逻辑');
  lines.push('');
  lines.push('## 最佳实践');
  lines.push('');
  lines.push('1. **在添加节点后自动配置**');
  lines.push('   - 使用 `add_node_to_workflow` 时，设置 `auto_config: true`');
  lines.push('   - 节点添加后会自动调用配置函数');
  lines.push('');
  lines.push('2. **手动配置特定节点**');
  lines.push('   - 如果节点需要特殊配置，单独调用 `auto_configure_node`');
  lines.push('   - 通过 `config_overrides` 提供部分配置值');
  lines.push('');
  lines.push('3. **基于用户需求配置**');
  lines.push('   - 理解用户的具体需求');
  lines.push('   - 将需求转换为配置参数');
  lines.push('   - 使用 `config_overrides` 应用用户需求');
  lines.push('');
  lines.push('## 示例场景');
  lines.push('');
  lines.push('### 场景1：自动配置新添加的节点');
  lines.push('```');
  lines.push('用户："添加一个数据清洗节点，自动配置"');
  lines.push('AI调用：add_node_to_workflow({');
  lines.push('  workflow_id: "wf_123",');
  lines.push('  description: "数据清洗节点",');
  lines.push('  auto_config: true  // 自动配置');
  lines.push('})');
  lines.push('```');
  lines.push('');
  lines.push('### 场景2：手动配置节点参数');
  lines.push('```');
  lines.push('用户："配置数据清洗节点，设置清洗规则为去除空值"');
  lines.push('AI调用：auto_configure_node({');
  lines.push('  workflow_id: "wf_123",');
  lines.push('  node_id: "node_data_cleaner",');
  lines.push('  config_overrides: {');
  lines.push('    remove_empty: true');
  lines.push('  }');
  lines.push('})');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

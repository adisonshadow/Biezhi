/**
 * 创建算子提示词模版
 */

/**
 * 生成创建算子的提示词，用于AI会话上下文
 * 
 * @returns 创建算子的提示词文本
 */
export function generateCreateOperatorPrompt(): string {
  const lines: string[] = [];

  lines.push('# AI 创建算子指南');
  lines.push('');
  lines.push('## 重要原则');
  lines.push('');
  lines.push('1. **只有 Custom_operators 目录下的算子才可以编辑**');
  lines.push('   - 如非正在创建算子，如无特别必要，不要直接修改别的算子');
  lines.push('   - 只能使用文件操作接口编辑 Custom_operators 目录下的算子');
  lines.push('');
  lines.push('2. **创建算子的流程**');
  lines.push('   - 第一步：调用 `/api/operators/create` 接口，创建 operator.yaml 文件');
  lines.push('     - 此接口只创建 operator.yaml，不自动注册算子');
  lines.push('     - operator.yaml 必须包含 `file_structure` 信息块，用于描述算子目录下各文件的作用');
  lines.push('     - `file_structure` 格式示例：');
  lines.push('       ```yaml');
  lines.push('       file_structure:');
  lines.push('         "main.py": "算子的主要代码文件，包含算子的核心逻辑"');
  lines.push('         "requirements.txt": "Python依赖包列表"');
  lines.push('         "test_data.json": "测试数据文件"');
  lines.push('         "preview/main.tsx": "数据可视化前端组件入口文件"');
  lines.push('       ```');
  lines.push('   - 第二步：使用文件操作接口添加或编辑文件');
  lines.push('     - `/api/operators/file/add/:filename` - 添加新文件');
  lines.push('     - `/api/operators/file/edit/:filename` - 编辑现有文件（包括 operator.yaml）');
  lines.push('     - `/api/operators/file/delete/:filename` - 删除文件（不能删除 operator.yaml）');
  lines.push('     - path 参数以算子目录为 root，例如：`path/preview/main.tsx` 表示在算子目录下的 `preview/main.tsx`');
  lines.push('   - 第三步：当所有文件创建完成后，调用 `/api/operators` 接口注册算子');
  lines.push('');
  lines.push('3. **AI 创建算子的最佳实践**');
  lines.push('   - AI 创建算子代码的时间比较长，并且不可能一次完成');
  lines.push('   - 应该分步进行：先创建 operator.yaml，然后逐步添加其他文件');
  lines.push('   - 每次只创建或修改一个文件，确保文件内容的正确性');
  lines.push('   - 在 `file_structure` 中详细描述每个文件的作用，帮助后续快速理解算子结构');
  lines.push('');
  lines.push('4. **operator.yaml 中 file_structure 的重要性**');
  lines.push('   - `file_structure` 信息块用于描述算子目录下各文件的作用');
  lines.push('   - 这个信息块帮助AI快速理解这个算子的文件结构和作用');
  lines.push('   - 应该在创建 operator.yaml 时就包含完整的 `file_structure`');
  lines.push('   - 如果后续添加了新文件，应该更新 `file_structure`（通过 edit 接口）');
  lines.push('');
  lines.push('5. **文件操作接口的使用规范**');
  lines.push('   - 所有文件操作接口都需要提供 `operatorPath` 参数（相对于项目根目录的路径）');
  lines.push('   - `operatorPath` 必须以 `Custom_operators/` 开头');
  lines.push('   - 如果文件路径包含子目录，使用 path 参数指定（相对于算子目录）');
  lines.push('   - 示例：添加 `preview/main.tsx` 文件，filename 为 `main.tsx`，path 为 `preview`');
  lines.push('');

  return lines.join('\n');
}

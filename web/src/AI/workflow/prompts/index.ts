/**
 * 提示词模版统一导出
 */

// 工作流详情提示词
export {
  generateWorkflowDetailPrompt,
  generateWorkflowDetailPromptSimple,
} from './workflowDetailPrompt';

// 创建算子提示词
export { generateCreateOperatorPrompt } from './createOperatorPrompt';

// 添加节点提示词
export { generateAddNodePrompt } from './addNodePrompt';

// 优化工作流提示词
export { generateOptimizeWorkflowPrompt } from './optimizeWorkflowPrompt';

// 选中对象提示词
export {
  formatSelectedObjectsContext,
  generateSelectedObjectsContextPrompt,
} from './selectedObjectsPrompt';

// 自动配置节点提示词
export { generateAutoConfigureNodePrompt } from './autoConfigureNodePrompt';

// 系统提示词
export { generateSystemPrompt } from './systemPrompt';

/**
 * workflowUtils.ts - 工作流AI助手工具函数
 * 
 * 注意：提示词模版函数已迁移到 prompts/ 目录下的独立文件中
 * 这里保留向后兼容的导出
 */

// 重新导出提示词模版函数（保持向后兼容）
export {
  generateWorkflowDetailPrompt,
  generateWorkflowDetailPromptSimple,
  generateCreateOperatorPrompt,
  generateAddNodePrompt,
  generateOptimizeWorkflowPrompt,
  formatSelectedObjectsContext,
  generateSelectedObjectsContextPrompt,
  generateAutoConfigureNodePrompt,
} from './prompts';

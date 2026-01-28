/**
 * 工作流详情提示词模版
 */
import type { Workflow, Operator } from '../../../types';

/**
 * 生成工作流详情的提示词，用于AI会话上下文
 * 
 * @param workflow 工作流数据
 * @param operatorsMap 算子信息映射，key为operatorId，value为Operator对象
 * @returns 格式化的工作流详情提示词文本
 */
export function generateWorkflowDetailPrompt(
  workflow: Workflow,
  operatorsMap?: Map<string, Operator> | Record<string, Operator>
): string {
  const lines: string[] = [];

  // ==================== 工作流基本信息 ====================
  lines.push('# 工作流详情');
  lines.push('');
  
  lines.push('## 工作流基本信息');
  lines.push('');
  lines.push(`- **工作流ID**: ${workflow.id || '未设置'}`);
  lines.push(`- **工作流名称**: ${workflow.name}`);
  if (workflow.description) {
    lines.push(`- **描述**: ${workflow.description}`);
  }
  if (workflow.version) {
    lines.push(`- **版本**: ${workflow.version}`);
  }
  if (workflow.category) {
    lines.push(`- **分类**: ${workflow.category}`);
  }
  if (workflow.tags && workflow.tags.length > 0) {
    lines.push(`- **标签**: ${workflow.tags.join(', ')}`);
  }
  lines.push('');

  // ==================== 节点信息 ====================
  lines.push('## 节点列表');
  lines.push('');
  
  if (!workflow.nodes || workflow.nodes.length === 0) {
    lines.push('当前工作流没有节点。');
    lines.push('');
  } else {
    // 将Map转换为Record格式以便统一处理
    const operatorsRecord: Record<string, Operator> = {};
    if (operatorsMap) {
      if (operatorsMap instanceof Map) {
        operatorsMap.forEach((value, key) => {
          operatorsRecord[key] = value;
        });
      } else {
        Object.assign(operatorsRecord, operatorsMap);
      }
    }

    workflow.nodes.forEach((node, index) => {
      lines.push(`### 节点 ${index + 1}: ${node.id}`);
      lines.push('');
      
      // 节点基本信息
      lines.push('#### 节点基本信息');
      lines.push(`- **节点ID**: ${node.id}`);
      lines.push(`- **算子ID**: ${node.operatorId}`);
      lines.push(`- **算子类型**: ${node.operatorType || '未设置'}`);
      if (node.nodeType) {
        lines.push(`- **节点类型**: ${node.nodeType}`);
      }
      if (node.positionX !== undefined && node.positionY !== undefined) {
        lines.push(`- **位置**: (${node.positionX}, ${node.positionY})`);
      }
      lines.push('');

      // 算子详细信息
      const operator = operatorsRecord[node.operatorId];
      if (operator) {
        lines.push('#### 算子信息');
        lines.push(`- **算子名称**: ${operator.name}`);
        lines.push(`- **版本**: ${operator.version}`);
        lines.push(`- **描述**: ${operator.description}`);
        lines.push(`- **类型**: ${operator.type}`);
        lines.push(`- **分类**: ${operator.category}`);
        if (operator.tags && operator.tags.length > 0) {
          lines.push(`- **标签**: ${operator.tags.join(', ')}`);
        }
        // 纯前端可视化算子可能没有这些字段
        if (operator.codePath || operator.entryPoint || operator.operatorType) {
          if (operator.codePath) {
            lines.push(`- **代码路径**: ${operator.codePath}`);
          }
          if (operator.entryPoint) {
            lines.push(`- **入口点**: ${operator.entryPoint}`);
          }
          if (operator.operatorType) {
            lines.push(`- **执行类型**: ${operator.operatorType}`);
          }
          lines.push('');
        } else {
          // 纯前端可视化算子
          lines.push(`- **可视化类型**: 纯前端可视化（无后端执行代码）`);
          if (operator.dataVisualization?.entry_file) {
            lines.push(`- **可视化入口文件**: ${operator.dataVisualization.entry_file}`);
          }
          lines.push('');
        }

        // 算子输入定义
        if (operator.inputs && operator.inputs.length > 0) {
          lines.push('#### 算子输入定义');
          operator.inputs.forEach((input: any) => {
            lines.push(`- **${input.name}** (${input.type || 'unknown'})`);
            if (input.description) {
              lines.push(`  - 描述: ${input.description}`);
            }
            if (input.required !== undefined) {
              lines.push(`  - 必需: ${input.required ? '是' : '否'}`);
            }
            if (input.default !== undefined) {
              lines.push(`  - 默认值: ${JSON.stringify(input.default)}`);
            }
          });
          lines.push('');
        }

        // 算子输出定义
        if (operator.outputs && operator.outputs.length > 0) {
          lines.push('#### 算子输出定义');
          operator.outputs.forEach((output: any) => {
            lines.push(`- **${output.name}** (${output.type || 'unknown'})`);
            if (output.description) {
              lines.push(`  - 描述: ${output.description}`);
            }
          });
          lines.push('');
        }

        // 算子参数定义
        if (operator.operatorParams) {
          lines.push('#### 算子参数定义');
          let operatorParams: any[] = [];
          if (Array.isArray(operator.operatorParams)) {
            operatorParams = operator.operatorParams;
          } else if (typeof operator.operatorParams === 'object') {
            operatorParams = Object.entries(operator.operatorParams).map(([name, value]: [string, any]) => ({
              name,
              ...value,
            }));
          }

          if (operatorParams.length > 0) {
            operatorParams.forEach((param: any) => {
              lines.push(`- **${param.name || param.label || '未知参数'}** (${param.type || 'unknown'})`);
              if (param.label && param.label !== param.name) {
                lines.push(`  - 标签: ${param.label}`);
              }
              if (param.description) {
                lines.push(`  - 描述: ${param.description}`);
              }
              if (param.required !== undefined) {
                lines.push(`  - 必需: ${param.required ? '是' : '否'}`);
              }
              if (param.default !== undefined) {
                lines.push(`  - 默认值: ${JSON.stringify(param.default)}`);
              }
            });
            lines.push('');
          }
        }

        // 执行配置
        if (operator.executionConfig) {
          lines.push('#### 执行配置');
          lines.push('```json');
          lines.push(JSON.stringify(operator.executionConfig, null, 2));
          lines.push('```');
          lines.push('');
        }
      } else {
        lines.push('#### 算子信息');
        lines.push('⚠️ 未找到对应的算子信息（operatorId: ' + node.operatorId + '）');
        lines.push('');
      }

      // 节点配置
      if (node.config) {
        lines.push('#### 节点配置参数');
        lines.push('```json');
        lines.push(JSON.stringify(node.config, null, 2));
        lines.push('```');
        lines.push('');
      } else {
        lines.push('#### 节点配置参数');
        lines.push('无自定义配置（使用算子默认配置）');
        lines.push('');
      }
    });
  }

  // ==================== 连接关系 ====================
  lines.push('## 连接关系');
  lines.push('');
  
  if (!workflow.connections || workflow.connections.length === 0) {
    lines.push('当前工作流没有连接关系。');
    lines.push('');
  } else {
    lines.push('| 源节点 | 源端口 | 目标节点 | 目标端口 |');
    lines.push('|--------|--------|----------|----------|');
    
    workflow.connections.forEach((connection) => {
      const fromNode = connection.from?.node || '未知';
      const fromPort = connection.from?.port || '未知';
      const toNode = connection.to?.node || '未知';
      const toPort = connection.to?.port || '未知';
      lines.push(`| ${fromNode} | ${fromPort} | ${toNode} | ${toPort} |`);
    });
    lines.push('');
  }

  // ==================== 工作流结构总结 ====================
  lines.push('## 工作流结构总结');
  lines.push('');
  lines.push(`- **节点总数**: ${workflow.nodes?.length || 0}`);
  lines.push(`- **连接总数**: ${workflow.connections?.length || 0}`);
  
  // 统计节点类型
  if (workflow.nodes && workflow.nodes.length > 0) {
    const nodeTypeCount: Record<string, number> = {};
    workflow.nodes.forEach((node) => {
      const type = node.nodeType || '未分类';
      nodeTypeCount[type] = (nodeTypeCount[type] || 0) + 1;
    });
    
    if (Object.keys(nodeTypeCount).length > 0) {
      lines.push('- **节点类型分布**:');
      Object.entries(nodeTypeCount).forEach(([type, count]) => {
        lines.push(`  - ${type}: ${count}个`);
      });
    }
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * 生成工作流详情的提示词（简化版，不包含算子详细信息）
 * 
 * @param workflow 工作流数据
 * @returns 格式化的工作流详情提示词文本
 */
export function generateWorkflowDetailPromptSimple(workflow: Workflow): string {
  return generateWorkflowDetailPrompt(workflow);
}

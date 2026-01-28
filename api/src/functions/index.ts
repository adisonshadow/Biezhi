/**
 * Function定义和注册
 * 在这里定义所有可用的Functions并注册到系统
 */

import { functionRegistry } from '../services/FunctionService';
import { WorkflowService } from '../services/WorkflowService';
import { OperatorService } from '../services/OperatorService';
import { ExecutionService } from '../services/ExecutionService';
import type { FunctionDefinition, FunctionCallResult, FunctionCallContext } from '../services/FunctionService';

const workflowService = new WorkflowService();
const operatorService = new OperatorService();

/**
 * get_workflow_detail - 获取工作流详情
 * 
 * 重要说明：
 * - 返回的节点信息中包含 node.userConfig（节点的用户配置）
 * - 如果 include_operators 为 true，还会包含 operator.operatorParams（算子的配置项定义）
 * - 注意区分：node.userConfig 是节点的用户配置值，operator.operatorParams 是算子的配置项定义（元数据）
 */
const getWorkflowDetailFunction: FunctionDefinition = {
  schema: {
    name: 'get_workflow_detail',
    description: '获取工作流的详细信息，包括节点、连接、配置等。用于AI了解当前工作流状态。返回的节点信息包含节点的用户配置（node.userConfig），如果包含算子信息，还会包含算子的配置项定义（operator.operatorParams）。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID',
          required: true,
        },
        include_operators: {
          type: 'boolean',
          description: '是否包含算子详细信息（默认true）',
          default: true,
        },
        include_validation: {
          type: 'boolean',
          description: '是否包含验证结果（默认true）',
          default: true,
        },
      },
      required: ['workflow_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const { workflow_id, include_operators = true, include_validation = true } = args;

      if (!workflow_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id is required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 构建返回数据
      // 确保节点包含 userConfig 字段
      const nodes = (workflow.nodes || []).map((node: any) => ({
        ...node,
        userConfig: node.userConfig || node.config || {}, // 确保有 userConfig 字段
      }));

      const result: any = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        category: workflow.category,
        tags: workflow.tags || [],
        nodes,
        connections: workflow.connections || [],
      };

      // 如果需要包含算子信息
      if (include_operators && workflow.nodes) {
        const operatorsMap: Record<string, any> = {};
        for (const node of workflow.nodes) {
          if (node.operatorId && !operatorsMap[node.operatorId]) {
            try {
              const operator = await operatorService.getOperatorById(node.operatorId);
              if (operator) {
                operatorsMap[node.operatorId] = operatorService.serializeOperator(operator);
              }
            } catch (error) {
              console.warn(`Failed to load operator ${node.operatorId}:`, error);
            }
          }
        }
        result.operators = operatorsMap;
      }

      // 如果需要包含验证结果
      if (include_validation) {
        try {
          const validation = await workflowService.validateWorkflow(workflow_id);
          result.validation = validation;
        } catch (error) {
          console.warn(`Failed to validate workflow ${workflow_id}:`, error);
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      // 记录详细错误信息用于调试
      console.error('get_workflow_detail error:', {
        workflow_id: args?.workflow_id,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to get workflow detail',
          details: {
            workflow_id: args?.workflow_id,
            error_type: error.name || 'UnknownError',
          },
          suggestions: [
            '请检查工作流ID是否正确',
            '检查数据库连接是否正常',
            '如果问题持续存在，请联系管理员',
          ],
        },
      };
    }
  },
};

/**
 * search_operators - 搜索算子
 */
const searchOperatorsFunction: FunctionDefinition = {
  schema: {
    name: 'search_operators',
    description: '搜索符合条件的算子。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词（名称、描述、标签等）',
        },
        operator_type: {
          type: 'string',
          description: '算子类型过滤',
          enum: ['data_collector', 'data_processing', 'data_analysis', 'data_visualtion', 'data_align', 'all'],
        },
        tags: {
          type: 'array',
          description: '标签过滤',
          items: {
            type: 'string',
          },
        },
        input_type: {
          type: 'string',
          description: '所需输入类型（用于兼容性检查）',
        },
        output_type: {
          type: 'string',
          description: '所需输出类型（用于兼容性检查）',
        },
        limit: {
          type: 'integer',
          description: '返回结果数量限制（默认10）',
          default: 10,
        },
      },
      required: [],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        query,
        operator_type,
        tags,
        input_type,
        output_type,
        limit = 10,
      } = args;

      // 构建搜索条件
      let name: string | undefined;
      let tag: string | undefined;
      let type: string | undefined;

      if (query) {
        name = query;
      }

      if (tags && Array.isArray(tags) && tags.length > 0) {
        tag = tags[0]; // 目前只支持单个标签搜索
      }

      if (operator_type && operator_type !== 'all') {
        type = operator_type;
      }

      // 搜索算子
      const operators = await operatorService.search(name, tag, type);

      // 过滤结果
      let filteredOperators = operators;

      // 按输入输出类型过滤（简单匹配）
      if (input_type || output_type) {
        filteredOperators = operators.filter((op: any) => {
          if (input_type && op.inputs) {
            const hasMatchingInput = op.inputs.some((input: any) => 
              input.type && input.type.includes(input_type)
            );
            if (!hasMatchingInput) return false;
          }
          if (output_type && op.outputs) {
            const hasMatchingOutput = op.outputs.some((output: any) => 
              output.type && output.type.includes(output_type)
            );
            if (!hasMatchingOutput) return false;
          }
          return true;
        });
      }

      // 限制返回数量
      const limitedOperators = filteredOperators.slice(0, limit);

      // 序列化算子
      const serializedOperators = limitedOperators.map((op: any) => 
        operatorService.serializeOperator(op)
      );

      return {
        success: true,
        data: {
          operators: serializedOperators,
          total: filteredOperators.length,
          returned: serializedOperators.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to search operators',
        },
      };
    }
  },
};

/**
 * add_node_to_workflow - 添加节点到工作流
 * 
 * 重要说明：
 * - 添加节点后，如果 auto_config 为 true，会自动调用 auto_configure_node 来配置节点的用户配置
 * - 配置流程遵循"节点配置最佳实践"（见 FUNCTION_CALL_DESIGN.md 第6章）
 */
const addNodeToWorkflowFunction: FunctionDefinition = {
  schema: {
    name: 'add_node_to_workflow',
    description: '向工作流添加一个节点。AI会自动选择合适的算子、配置节点的用户配置、建立连接。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID',
          required: true,
        },
        operator_id: {
          type: 'string',
          description: '要添加的算子ID（可选，如果不提供，AI会根据description自动搜索）',
        },
        description: {
          type: 'string',
          description: '节点功能描述（当operator_id未提供时必需），例如：添加一个数据清洗节点',
        },
        position_after_node: {
          type: 'string',
          description: '插入位置：在此节点之后插入（可选）',
        },
        position_before_node: {
          type: 'string',
          description: '插入位置：在此节点之前插入（可选）',
        },
        connect_from: {
          type: 'string',
          description: '连接来源节点ID（可选，AI可以自动推断）',
        },
        connect_to: {
          type: 'string',
          description: '连接目标节点ID（可选，AI可以自动推断）',
        },
        auto_config: {
          type: 'boolean',
          description: '是否自动配置节点的用户配置（默认true）。如果为true，会在添加节点后自动调用 auto_configure_node 来配置节点的用户配置。',
          default: true,
        },
        node_id: {
          type: 'string',
          description: '节点ID（可选，不提供则自动生成）',
        },
        position_x: {
          type: 'number',
          description: '节点X坐标（可选）',
        },
        position_y: {
          type: 'number',
          description: '节点Y坐标（可选）',
        },
      },
      required: ['workflow_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        operator_id,
        description,
        position_after_node,
        position_before_node,
        connect_from,
        connect_to,
        auto_config = true,
        node_id,
        position_x,
        position_y,
      } = args;

      if (!workflow_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id is required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 确定要使用的算子ID
      let finalOperatorId = operator_id;
      if (!finalOperatorId && description) {
        // 如果没有提供operator_id，根据description搜索算子
        const searchResults = await operatorService.search(description, undefined, undefined);
        if (searchResults.length > 0) {
          finalOperatorId = searchResults[0].id;
        } else {
          return {
            success: false,
            error: {
              code: 'OPERATOR_NOT_FOUND',
              message: `No operator found matching description: ${description}`,
            },
          };
        }
      }

      if (!finalOperatorId) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'Either operator_id or description must be provided',
          },
        };
      }

      // 验证算子存在
      const operator = await operatorService.getOperatorById(finalOperatorId);
      if (!operator) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `Operator with id ${finalOperatorId} not found`,
          },
        };
      }

      // 生成节点ID
      const newNodeId = node_id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 计算节点位置（基础版：简单计算）
      let finalPositionX = position_x;
      let finalPositionY = position_y;
      
      if (finalPositionX === undefined || finalPositionY === undefined) {
        // 如果没有指定位置，根据position_after_node或position_before_node计算
        if (position_after_node) {
          const afterNode = workflow.nodes.find((n: any) => n.id === position_after_node);
          if (afterNode) {
            finalPositionX = (afterNode.positionX || 0) + 200;
            finalPositionY = afterNode.positionY || 0;
          }
        } else if (position_before_node) {
          const beforeNode = workflow.nodes.find((n: any) => n.id === position_before_node);
          if (beforeNode) {
            finalPositionX = (beforeNode.positionX || 0) - 200;
            finalPositionY = beforeNode.positionY || 0;
          }
        } else {
          // 默认位置：画布右下角区域
          // 假设画布视图区域大约为 1200x800（考虑常见的窗口尺寸）
          // 节点宽度约200px，高度约150px，右下角留边距
          const nodeWidth = 200;
          const nodeHeight = 150;
          const marginX = 50;  // 右边距
          const marginY = 50;  // 下边距
          const viewportWidth = 1200;  // 假设的视口宽度
          const viewportHeight = 800;  // 假设的视口高度
          
          // 如果有现有节点，找到最大位置，在此基础上向右下角偏移
          if (workflow.nodes.length > 0) {
            const maxX = Math.max(...workflow.nodes.map((n: any) => (n.positionX || 0)));
            const maxY = Math.max(...workflow.nodes.map((n: any) => (n.positionY || 0)));
            // 在最大位置的基础上，向右下角偏移
            finalPositionX = Math.max(maxX + 250, viewportWidth - nodeWidth - marginX);
            finalPositionY = Math.max(maxY + 200, viewportHeight - nodeHeight - marginY);
          } else {
            // 如果没有现有节点，直接放在右下角
            finalPositionX = viewportWidth - nodeWidth - marginX;
            finalPositionY = viewportHeight - nodeHeight - marginY;
          }
        }
      }

      // 创建新节点
      const newNode = {
        id: newNodeId,
        operatorId: finalOperatorId,
        operatorType: operator.operatorType || null, // 纯前端可视化算子可能没有 operatorType
        nodeType: null,
        userConfig: {}, // 使用 userConfig 字段
        config: {}, // 保持兼容性
        positionX: finalPositionX,
        positionY: finalPositionY,
      };

      // 添加节点到工作流
      const updatedNodes = [...(workflow.nodes || []), newNode];

      // 处理连接
      const updatedConnections = [...(workflow.connections || [])];
      
      if (connect_from) {
        // 连接到新节点
        updatedConnections.push({
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          from: {
            node: connect_from,
            port: 'output',
          },
          to: {
            node: newNodeId,
            port: 'input',
          },
        });
      }

      if (connect_to) {
        // 从新节点连接
        updatedConnections.push({
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          from: {
            node: newNodeId,
            port: 'output',
          },
          to: {
            node: connect_to,
            port: 'input',
          },
        });
      }

      // 更新工作流
      const updatedWorkflow = await workflowService.updateWorkflow(workflow_id, {
        nodes: updatedNodes,
        connections: updatedConnections,
      });

      // 如果 auto_config 为 true，自动配置节点的用户配置
      if (auto_config) {
        // 注意：这里不直接调用 auto_configure_node，而是返回提示信息
        // 实际配置应该由 AI 在后续步骤中调用 auto_configure_node
        return {
          success: true,
          data: {
            node_id: newNodeId,
            operator_id: finalOperatorId,
            operator_name: operator.name,
            workflow: updatedWorkflow,
            message: `Node ${newNodeId} added successfully. Please call auto_configure_node to configure the node's user config.`,
            auto_config_required: true,
          },
        };
      }

      return {
        success: true,
        data: {
          node_id: newNodeId,
          operator_id: finalOperatorId,
          operator_name: operator.name,
          workflow: updatedWorkflow,
          message: `Node ${newNodeId} added successfully`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to add node to workflow',
        },
      };
    }
  },
};

/**
 * auto_configure_node - 自动配置节点的用户配置
 * 
 * 重要说明：
 * - 配置对象：此函数配置的是节点的用户配置（node.userConfig），而不是算子的配置项定义（operator.operatorParams）
 * - 配置流程：
 *   1. 获取节点的算子信息，了解算子的配置项定义（operatorParams）
 *   2. 获取上游节点的输出数据片段格式（使用 get_node_upstream_data_structure）
 *   3. 注意：在查看上游数据时，不需要考虑当前节点的用户配置，只需关注数据格式
 *   4. 基于上游数据格式和算子的配置项定义，智能生成节点的用户配置
 *   5. 调用完成后，前端界面会自动更新节点的用户配置
 */
const autoConfigureNodeFunction: FunctionDefinition = {
  schema: {
    name: 'auto_configure_node',
    description: '根据上下文自动配置节点的用户配置。配置流程：1）获取算子的配置项定义；2）获取上游节点的数据片段格式（不考虑当前节点的用户配置）；3）基于数据格式和配置项定义生成用户配置；4）更新节点的用户配置，前端界面会自动更新。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID（必须提供实际的工作流ID，不能使用占位符文本如"需要替换为实际工作流ID"、"当前工作流ID"等。可以通过调用 get_workflow_detail 获取，或从 window.workflow_id 全局变量获取）',
          required: true,
        },
        node_id: {
          type: 'string',
          description: '要配置的节点ID',
          required: true,
        },
        user_config: {
          type: 'object',
          description: '部分用户配置覆盖（可选），AI会在此基础上进行智能填充。如果提供，将作为基础配置，AI会补充缺失的配置项。',
        },
        based_on_upstream_data: {
          type: 'boolean',
          description: '是否基于上游节点的输出数据进行配置（默认true）。如果为true，会先调用 get_node_upstream_data_structure 获取上游数据格式。',
          default: true,
        },
        preserve_existing_config: {
          type: 'boolean',
          description: '是否保留现有的用户配置（默认false）。如果为true，只填充缺失的配置项，不覆盖已有配置。',
          default: false,
        },
      },
      required: ['workflow_id', 'node_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        node_id,
        user_config = {},
        based_on_upstream_data = true,
        preserve_existing_config = false,
      } = args;

      if (!workflow_id || !node_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id and node_id are required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 查找节点
      const node = workflow.nodes.find((n: any) => n.id === node_id);
      if (!node) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `Node with id ${node_id} not found`,
          },
        };
      }

      // 获取算子信息
      const operator = await operatorService.getOperatorById(node.operatorId);
      if (!operator) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `Operator with id ${node.operatorId} not found`,
          },
        };
      }

      // 解析算子参数定义
      const operatorParams = operator.operatorParams
        ? (typeof operator.operatorParams === 'string'
            ? JSON.parse(operator.operatorParams)
            : operator.operatorParams)
        : [];

      // 获取当前节点的用户配置
      const currentUserConfig = node.userConfig || node.config || {};
      
      // 构建新的用户配置
      let newUserConfig: any = {};
      
      if (preserve_existing_config) {
        // 保留现有配置，只填充缺失的配置项
        newUserConfig = { ...currentUserConfig };
      } else {
        // 从 user_config 参数开始
        newUserConfig = { ...user_config };
      }

      // 如果有算子参数定义，尝试填充默认值或基于上游数据生成配置
      if (Array.isArray(operatorParams)) {
        for (const param of operatorParams) {
          // 如果配置项已存在，跳过（除非 preserve_existing_config 为 false 且 user_config 中提供了新值）
          if (preserve_existing_config && currentUserConfig[param.name] !== undefined) {
            continue;
          }
          
          // 如果 user_config 中已提供，使用提供的值
          if (user_config[param.name] !== undefined) {
            newUserConfig[param.name] = user_config[param.name];
            continue;
          }
          
          // 如果有默认值，使用默认值
          if (param.default !== undefined) {
            newUserConfig[param.name] = param.default;
            continue;
          }
          
          // 如果 based_on_upstream_data 为 true，可以基于上游数据生成配置
          // 这里简化处理，实际应该调用 get_node_upstream_data_structure
          // 但为了避免循环调用，这里只做基础处理
          if (based_on_upstream_data && param.name.includes('column') || param.name.includes('field')) {
            // 对于列名/字段名相关的配置，可以尝试从上游数据中获取
            // 这里简化处理，实际应该分析上游数据结构
          }
        }
      }

      // 计算配置变更
      const added: string[] = [];
      const updated: string[] = [];
      const removed: string[] = [];
      
      for (const key in newUserConfig) {
        if (currentUserConfig[key] === undefined) {
          added.push(key);
        } else if (JSON.stringify(currentUserConfig[key]) !== JSON.stringify(newUserConfig[key])) {
          updated.push(key);
        }
      }
      
      for (const key in currentUserConfig) {
        if (newUserConfig[key] === undefined) {
          removed.push(key);
        }
      }

      // 更新节点配置（使用 userConfig 字段）
      const updatedNodes = workflow.nodes.map((n: any) => {
        if (n.id === node_id) {
          return {
            ...n,
            userConfig: newUserConfig,
            config: newUserConfig, // 同时更新 config 字段以保持兼容性
          };
        }
        return n;
      });

      // 更新工作流（保留原有的connections，避免连接丢失）
      const updatedWorkflow = await workflowService.updateWorkflow(workflow_id, {
        nodes: updatedNodes,
        connections: workflow.connections || [], // 保留原有的连接
      });

      return {
        success: true,
        data: {
          node_id,
          user_config: newUserConfig,
          config_changes: {
            added,
            updated,
            removed,
          },
          workflow: updatedWorkflow,
          message: '节点用户配置已更新，前端界面会自动刷新',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to configure node',
        },
      };
    }
  },
};

/**
 * get_node_operator_params - 获取节点的算子配置项定义
 * 
 * 重要说明：
 * - 配置项定义 vs 用户配置：
 *   - 算子的配置项定义（operatorParams）：定义算子有哪些可配置项、类型、默认值、描述等（这是算子的元数据）
 *   - 节点的用户配置（node.userConfig）：用户为节点设置的具体配置值（这是节点的实际配置）
 * - 用途：在配置节点的用户配置前，需要先了解算子的配置项定义，才能知道有哪些配置项可以配置
 */
const getNodeOperatorParamsFunction: FunctionDefinition = {
  schema: {
    name: 'get_node_operator_params',
    description: '获取节点的算子配置项定义（operatorParams）。用于了解算子有哪些可配置项、类型、默认值、描述等信息。这是算子的元数据，不是节点的用户配置。在配置节点的用户配置前，应先调用此函数了解配置项定义。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID',
          required: true,
        },
        node_id: {
          type: 'string',
          description: '要查询的节点ID',
          required: true,
        },
        include_current_user_config: {
          type: 'boolean',
          description: '是否包含当前节点的用户配置（默认false）。如果为true，会在返回结果中同时包含算子的配置项定义和节点的当前用户配置，便于对比。',
          default: false,
        },
      },
      required: ['workflow_id', 'node_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        node_id,
        include_current_user_config = false,
      } = args;

      if (!workflow_id || !node_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id and node_id are required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 查找节点
      const node = workflow.nodes.find((n: any) => n.id === node_id);
      if (!node) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `Node with id ${node_id} not found`,
          },
        };
      }

      // 获取算子信息
      const operator = await operatorService.getOperatorById(node.operatorId);
      if (!operator) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `Operator with id ${node.operatorId} not found`,
          },
        };
      }

      // 解析算子参数定义
      const operatorParams = operator.operatorParams
        ? (typeof operator.operatorParams === 'string'
            ? JSON.parse(operator.operatorParams)
            : operator.operatorParams)
        : [];

      const result: any = {
        node_id,
        operator_id: operator.id,
        operator_name: operator.name,
        operator_params: operatorParams,
      };

      // 如果需要包含当前节点的用户配置
      if (include_current_user_config) {
        result.current_user_config = node.userConfig || node.config || {};
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to get node operator params',
        },
      };
    }
  },
};

/**
 * update_node_config - 更新节点的用户配置
 * 
 * 重要说明：
 * - 配置对象：此函数更新的是节点的用户配置（node.userConfig），不是算子的配置项定义
 * - 前端更新：调用完成后，前端界面会自动更新节点的配置显示
 */
const updateNodeConfigFunction: FunctionDefinition = {
  schema: {
    name: 'update_node_config',
    description: '更新节点的用户配置（node.userConfig）。这是用户为节点设置的具体配置值，不是算子的配置项定义。调用完成后，前端界面会自动更新节点的配置显示。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID',
          required: true,
        },
        node_id: {
          type: 'string',
          description: '要更新的节点ID',
          required: true,
        },
        user_config: {
          type: 'object',
          description: '节点的用户配置对象。键名对应算子的配置项名称（operatorParams中的name），值为用户设置的具体配置值。',
          required: true,
        },
        merge_mode: {
          type: 'string',
          description: '更新模式：replace=完全替换现有配置，merge=合并到现有配置（默认replace）',
          enum: ['replace', 'merge'],
          default: 'replace',
        },
      },
      required: ['workflow_id', 'node_id', 'user_config'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        node_id,
        user_config,
        merge_mode = 'replace',
      } = args;

      if (!workflow_id || !node_id || !user_config) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id, node_id, and user_config are required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 查找节点
      const node = workflow.nodes.find((n: any) => n.id === node_id);
      if (!node) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `Node with id ${node_id} not found`,
          },
        };
      }

      // 获取当前节点的用户配置
      const currentUserConfig = node.userConfig || node.config || {};
      
      // 根据 merge_mode 决定如何更新配置
      let newUserConfig: any;
      if (merge_mode === 'merge') {
        newUserConfig = { ...currentUserConfig, ...user_config };
      } else {
        newUserConfig = { ...user_config };
      }

      // 更新节点配置（使用 userConfig 字段）
      const updatedNodes = workflow.nodes.map((n: any) => {
        if (n.id === node_id) {
          return {
            ...n,
            userConfig: newUserConfig,
            config: newUserConfig, // 同时更新 config 字段以保持兼容性
          };
        }
        return n;
      });

      // 更新工作流
      const updatedWorkflow = await workflowService.updateWorkflow(workflow_id, {
        nodes: updatedNodes,
      });

      return {
        success: true,
        data: {
          node_id,
          user_config: newUserConfig,
          workflow: updatedWorkflow,
          message: '节点用户配置已更新，前端界面会自动刷新',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to update node config',
        },
      };
    }
  },
};

/**
 * get_selected_objects_detail - 获取选中对象详情
 */
const getSelectedObjectsDetailFunction: FunctionDefinition = {
  schema: {
    name: 'get_selected_objects_detail',
    description: '获取用户在画布上选中的节点和边的详细信息。用于AI了解用户当前关注的对象。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID',
          required: true,
        },
        node_ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: '选中的节点ID列表',
        },
        edge_ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: '选中的边ID列表',
        },
        include_operator_info: {
          type: 'boolean',
          description: '是否包含算子详细信息（默认true）',
          default: true,
        },
        include_connections: {
          type: 'boolean',
          description: '对于节点，是否包含其连接关系（默认true）',
          default: true,
        },
      },
      required: ['workflow_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        node_ids = [],
        edge_ids = [],
        include_operator_info = true,
        include_connections = true,
      } = args;

      if (!workflow_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id is required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      const result: any = {
        nodes: [],
        edges: [],
      };

      // 处理选中的节点
      if (Array.isArray(node_ids) && node_ids.length > 0) {
        for (const nodeId of node_ids) {
          const node = workflow.nodes.find((n: any) => n.id === nodeId);
          if (node) {
            const nodeDetail: any = {
              node_id: node.id,
              operator_id: node.operatorId,
              operator_type: node.operatorType,
              node_type: node.nodeType,
              userConfig: node.userConfig || node.config || {}, // 使用 userConfig 字段
              position: {
                x: node.positionX,
                y: node.positionY,
              },
            };

            // 包含算子信息
            if (include_operator_info) {
              try {
                const operator = await operatorService.getOperatorById(node.operatorId);
                if (operator) {
                  const serializedOperator = operatorService.serializeOperator(operator);
                  nodeDetail.operator_info = {
                    ...serializedOperator,
                    operatorParams: serializedOperator.operatorParams || [], // 确保包含 operatorParams
                  };
                  nodeDetail.operator_name = operator.name;
                }
              } catch (error) {
                console.warn(`Failed to load operator ${node.operatorId}:`, error);
              }
            }

            // 包含连接关系
            if (include_connections) {
              const incoming: any[] = [];
              const outgoing: any[] = [];

              for (const conn of workflow.connections || []) {
                if (conn.to?.node === nodeId) {
                  incoming.push({
                    edge_id: conn.id,
                    from_node: conn.from?.node,
                    from_port: conn.from?.port,
                    to_port: conn.to?.port,
                  });
                }
                if (conn.from?.node === nodeId) {
                  outgoing.push({
                    edge_id: conn.id,
                    to_node: conn.to?.node,
                    to_port: conn.to?.port,
                    from_port: conn.from?.port,
                  });
                }
              }

              nodeDetail.connections = {
                incoming,
                outgoing,
              };
            }

            result.nodes.push(nodeDetail);
          }
        }
      }

      // 处理选中的边
      if (Array.isArray(edge_ids) && edge_ids.length > 0) {
        for (const edgeId of edge_ids) {
          const edge = workflow.connections.find((c: any) => c.id === edgeId);
          if (edge) {
            const edgeDetail: any = {
              edge_id: edge.id,
              from_node: edge.from?.node,
              to_node: edge.to?.node,
              from_port: edge.from?.port,
              to_port: edge.to?.port,
            };

            // 获取源节点和目标节点的信息
            const fromNode = workflow.nodes.find((n: any) => n.id === edge.from?.node);
            const toNode = workflow.nodes.find((n: any) => n.id === edge.to?.node);

            if (fromNode && include_operator_info) {
              try {
                const operator = await operatorService.getOperatorById(fromNode.operatorId);
                if (operator) {
                  edgeDetail.from_node_info = {
                    node_id: fromNode.id,
                    operator_name: operator.name,
                    operator_id: operator.id,
                  };
                }
              } catch (error) {
                console.warn(`Failed to load operator ${fromNode.operatorId}:`, error);
              }
            }

            if (toNode && include_operator_info) {
              try {
                const operator = await operatorService.getOperatorById(toNode.operatorId);
                if (operator) {
                  edgeDetail.to_node_info = {
                    node_id: toNode.id,
                    operator_name: operator.name,
                    operator_id: operator.id,
                  };
                }
              } catch (error) {
                console.warn(`Failed to load operator ${toNode.operatorId}:`, error);
              }
            }

            result.edges.push(edgeDetail);
          }
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to get selected objects detail',
        },
      };
    }
  },
};

/**
 * get_node_upstream_data_features - 获取节点上游数据特征
 */
const getNodeUpstreamDataFeaturesFunction: FunctionDefinition = {
  schema: {
    name: 'get_node_upstream_data_features',
    description: '获取指定节点的上游节点的输出数据特征，用于了解上游数据的结构、类型、统计信息等，帮助AI进行智能配置。**重要：workflow_id 必须是实际的工作流ID，不能使用占位符文本。可以通过调用 get_workflow_detail 获取，或从 window.workflow_id 全局变量获取。**',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID（必须提供实际的工作流ID，不能使用占位符文本如"需要替换为实际工作流ID"、"当前工作流ID"等。可以通过调用 get_workflow_detail 获取，或从 window.workflow_id 全局变量获取）',
          required: true,
        },
        node_id: {
          type: 'string',
          description: '要查询的节点ID',
          required: true,
        },
        include_data_sample: {
          type: 'boolean',
          description: '是否包含数据样本（默认false，只返回特征信息）',
          default: false,
        },
        max_sample_size: {
          type: 'integer',
          description: '数据样本的最大行数（默认10）',
          default: 10,
        },
      },
      required: ['workflow_id', 'node_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        node_id,
        include_data_sample = false,
        max_sample_size = 10,
      } = args;

      if (!workflow_id || !node_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id and node_id are required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 查找节点
      const node = workflow.nodes.find((n: any) => n.id === node_id);
      if (!node) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `Node with id ${node_id} not found`,
          },
        };
      }

      // 查找上游节点（连接到当前节点的节点）
      const upstreamConnections = workflow.connections.filter((c: any) => c.to.node === node_id);
      const upstreamNodeIds = [...new Set(upstreamConnections.map((c: any) => String(c.from.node)))] as string[];
      
      const result: any = {
        node_id,
        node_name: node.label || node_id,
        upstream_nodes: [],
      };

      // 获取每个上游节点的数据特征
      for (const upstreamNodeId of upstreamNodeIds) {
        const upstreamNode = workflow.nodes.find((n: any) => n.id === upstreamNodeId);
        if (!upstreamNode) continue;

        // 尝试获取节点执行数据
        let executionData: any = null;
        try {
          const executionService = new ExecutionService();
          executionData = executionService.getNodeExecutionData(workflow_id as string, undefined, upstreamNodeId);
        } catch (error) {
          console.warn(`Failed to get execution data for node ${upstreamNodeId}:`, error);
        }

        const upstreamInfo: any = {
          node_id: upstreamNodeId,
          node_name: upstreamNode.label || upstreamNodeId,
          operator_id: upstreamNode.operatorId,
          has_execution_data: !!executionData,
        };

        // 如果有执行数据，提取数据特征
        if (executionData && executionData.outputData) {
          const outputData = executionData.outputData;
          
          // 提取数据特征
          upstreamInfo.data_features = {
            data_type: Array.isArray(outputData) ? 'array' : typeof outputData,
            is_array: Array.isArray(outputData),
            array_length: Array.isArray(outputData) ? outputData.length : undefined,
            has_keys: typeof outputData === 'object' && !Array.isArray(outputData) ? Object.keys(outputData).length > 0 : false,
            keys: typeof outputData === 'object' && !Array.isArray(outputData) ? Object.keys(outputData) : undefined,
          };

          // 如果是数组，分析数组元素的结构
          if (Array.isArray(outputData) && outputData.length > 0) {
            const firstItem = outputData[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              upstreamInfo.data_features.item_keys = Object.keys(firstItem);
              upstreamInfo.data_features.item_count = outputData.length;
              
              // 分析每个字段的类型
              const fieldTypes: Record<string, string[]> = {};
              const sampleSize = Math.min(max_sample_size, outputData.length);
              for (let i = 0; i < sampleSize; i++) {
                const item = outputData[i];
                if (typeof item === 'object' && item !== null) {
                  for (const key of Object.keys(item)) {
                    const valueType = Array.isArray(item[key]) ? 'array' : typeof item[key];
                    if (!fieldTypes[key]) {
                      fieldTypes[key] = [];
                    }
                    if (!fieldTypes[key].includes(valueType)) {
                      fieldTypes[key].push(valueType);
                    }
                  }
                }
              }
              upstreamInfo.data_features.field_types = fieldTypes;
            }
          }

          // 如果需要包含数据样本
          if (include_data_sample) {
            if (Array.isArray(outputData)) {
              upstreamInfo.data_sample = outputData.slice(0, max_sample_size);
            } else {
              upstreamInfo.data_sample = outputData;
            }
          }
        } else {
          upstreamInfo.data_features = {
            message: '节点尚未执行，无法获取数据特征',
          };
        }

        result.upstream_nodes.push(upstreamInfo);
      }

      // 如果没有上游节点
      if (result.upstream_nodes.length === 0) {
        result.message = '该节点没有上游节点（可能是入口节点）';
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('get_node_upstream_data_features error:', {
        workflow_id: args?.workflow_id,
        node_id: args?.node_id,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to get node upstream data features',
        },
      };
    }
  },
};

/**
 * get_node_upstream_data_structure - 获取节点上游数据结构片段
 * 
 * 重要说明：
 * - 用途：获取上游节点的输出数据格式，用于配置当前节点的用户配置
 * - 关键点：在查看上游数据时，不需要考虑当前节点的用户配置，只需关注数据格式本身
 * - 配置流程：先获取上游数据格式 → 再获取算子的配置项定义 → 最后生成节点的用户配置
 * 
 * 用于弱类型数据（不固定结构）的场景，获取实际的数据结构片段供AI分析
 */
const getNodeUpstreamDataStructureFunction: FunctionDefinition = {
  schema: {
    name: 'get_node_upstream_data_structure',
    description: '获取指定节点的上游节点的输出数据结构片段。当上游节点输出是弱类型（不固定结构，如 list、dict、object）时，使用此函数获取实际的数据结构，帮助AI了解数据格式并进行智能配置。注意：在查看上游数据时，不需要考虑当前节点的用户配置，只需关注数据格式本身。**重要：workflow_id 必须是实际的工作流ID，不能使用占位符文本如"需要替换为实际工作流ID"。如果不知道 workflow_id，必须先调用 get_workflow_detail 获取，或从 window.workflow_id 全局变量获取。**',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID（必须提供实际的工作流ID，不能使用占位符文本如"需要替换为实际工作流ID"、"当前工作流ID"等。如果不知道 workflow_id，必须先调用 get_workflow_detail 获取，或从 window.workflow_id 全局变量获取）',
          required: true,
        },
        node_id: {
          type: 'string',
          description: '要查询的节点ID',
          required: true,
        },
        upstream_node_id: {
          type: 'string',
          description: '上游节点ID（可选，如果不提供则返回所有上游节点的数据结构）',
        },
        output_port: {
          type: 'string',
          description: '输出端口名称（可选，如果不提供则返回所有端口的数据）',
        },
        sample_size: {
          type: 'integer',
          description: '数据样本大小（默认5，用于展示数据结构）',
          default: 5,
        },
        max_depth: {
          type: 'integer',
          description: '嵌套对象的最大深度（默认3，防止数据过大）',
          default: 3,
        },
      },
      required: ['workflow_id', 'node_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        node_id,
        upstream_node_id,
        output_port,
        sample_size = 5,
        max_depth = 3,
      } = args;

      if (!workflow_id || !node_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id and node_id are required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 查找节点
      const node = workflow.nodes.find((n: any) => n.id === node_id);
      if (!node) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `Node with id ${node_id} not found`,
          },
        };
      }

      // 查找上游节点连接
      let upstreamConnections = workflow.connections.filter((c: any) => c.to.node === node_id);
      
      // 如果指定了上游节点，只返回该节点的数据
      if (upstream_node_id) {
        upstreamConnections = upstreamConnections.filter((c: any) => c.from.node === upstream_node_id);
      }

      const result: any = {
        node_id,
        node_name: node.label || node_id,
        upstream_data_structures: [],
      };

      // 获取每个上游节点的数据结构
      for (const conn of upstreamConnections) {
        const fromNodeId = conn.from.node;
        const fromPort = conn.from.port;
        const toPort = conn.to.port;

        // 如果指定了输出端口，只处理匹配的端口
        if (output_port && fromPort !== output_port) {
          continue;
        }

        const upstreamNode = workflow.nodes.find((n: any) => n.id === fromNodeId);
        if (!upstreamNode) continue;

        // 尝试获取节点执行数据
        let executionData: any = null;
        try {
          const executionService = new ExecutionService();
          executionData = executionService.getNodeExecutionData(workflow_id as string, undefined, fromNodeId);
        } catch (error) {
          console.warn(`Failed to get execution data for node ${fromNodeId}:`, error);
        }

        const structureInfo: any = {
          upstream_node_id: fromNodeId,
          upstream_node_name: upstreamNode.label || fromNodeId,
          output_port: fromPort,
          input_port: toPort,
          has_data: !!executionData,
        };

        // 如果有执行数据，提取数据结构片段
        if (executionData && executionData.outputData) {
          let dataToAnalyze = executionData.outputData;

          // 如果输出数据是对象，且指定了端口，尝试获取该端口的数据
          if (typeof dataToAnalyze === 'object' && !Array.isArray(dataToAnalyze) && fromPort) {
            dataToAnalyze = dataToAnalyze[fromPort] || dataToAnalyze;
          }

          // 提取数据结构片段
          structureInfo.data_structure = extractDataStructure(dataToAnalyze, sample_size, max_depth);
          structureInfo.data_type = getDataType(dataToAnalyze);
          structureInfo.has_data = true;
        } else {
          structureInfo.data_structure = null;
          structureInfo.message = '节点尚未执行，无法获取数据结构';
          structureInfo.has_data = false;
        }

        result.upstream_data_structures.push(structureInfo);
      }

      // 如果没有上游节点
      if (result.upstream_data_structures.length === 0) {
        result.message = '该节点没有上游节点或指定的上游节点不存在（可能是入口节点）';
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('get_node_upstream_data_structure error:', {
        workflow_id: args?.workflow_id,
        node_id: args?.node_id,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to get node upstream data structure',
        },
      };
    }
  },
};

/**
 * 提取数据结构片段（递归函数）
 */
function extractDataStructure(data: any, sampleSize: number, maxDepth: number, currentDepth: number = 0): any {
  if (currentDepth >= maxDepth) {
    return { _truncated: true, _message: `数据嵌套深度超过 ${maxDepth}，已截断` };
  }

  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { _type: 'array', _empty: true };
    }

    // 取前几个元素作为样本
    const samples = data.slice(0, Math.min(sampleSize, data.length));
    const sampleStructures = samples.map((item, index) => ({
      _index: index,
      _structure: extractDataStructure(item, sampleSize, maxDepth, currentDepth + 1),
    }));

    return {
      _type: 'array',
      _length: data.length,
      _sample_size: samples.length,
      _samples: sampleStructures,
      _inferred_structure: inferArrayStructure(samples),
    };
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return { _type: 'object', _empty: true };
    }

    const structure: any = {
      _type: 'object',
      _keys: keys,
      _key_count: keys.length,
    };

    // 对于每个键，提取值的结构（限制数量）
    const sampleKeys = keys.slice(0, Math.min(sampleSize * 2, keys.length));
    for (const key of sampleKeys) {
      const value = data[key];
      structure[key] = {
        _type: getDataType(value),
        _structure: extractDataStructure(value, sampleSize, maxDepth, currentDepth + 1),
      };
    }

    if (keys.length > sampleKeys.length) {
      structure._more_keys = keys.length - sampleKeys.length;
    }

    return structure;
  }

  // 基本类型
  return {
    _type: typeof data,
    _value: data,
  };
}

/**
 * 推断数组结构
 */
function inferArrayStructure(samples: any[]): any {
  if (samples.length === 0) {
    return { _type: 'array', _empty: true };
  }

  const firstItem = samples[0];
  
  if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
    // 对象数组：推断字段类型
    const allKeys = new Set<string>();
    const fieldTypes: Record<string, Set<string>> = {};

    for (const item of samples) {
      if (typeof item === 'object' && item !== null) {
        const keys = Object.keys(item);
        keys.forEach(key => allKeys.add(key));

        keys.forEach(key => {
          if (!fieldTypes[key]) {
            fieldTypes[key] = new Set();
          }
          const valueType = Array.isArray(item[key]) ? 'array' : typeof item[key];
          fieldTypes[key].add(valueType);
        });
      }
    }

    return {
      _type: 'array_of_objects',
      _common_keys: Array.from(allKeys),
      _field_types: Object.fromEntries(
        Object.entries(fieldTypes).map(([key, types]) => [key, Array.from(types)])
      ),
    };
  }

  return {
    _type: `array_of_${typeof firstItem}`,
    _item_type: typeof firstItem,
  };
}

/**
 * 获取数据类型
 */
function getDataType(data: any): string {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  if (typeof data === 'object') return 'object';
  return typeof data;
}

/**
 * design_workflow - 自动设计工作流
 * 
 * 重要说明：
 * - 设计工作流时，会自动配置每个节点的用户配置（node.userConfig）
 * - 配置流程遵循"节点配置最佳实践"（见 FUNCTION_CALL_DESIGN.md 第6章）
 */
const designWorkflowFunction: FunctionDefinition = {
  schema: {
    name: 'design_workflow',
    description: '根据用户需求自动设计完整的工作流。包括选择算子、配置节点的用户配置、建立连接等。配置节点的用户配置时，会遵循节点配置最佳实践流程。',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: '用户需求描述，例如：创建一个LinkedIn公司数据分析工作流，从CSV读取数据，清洗数据，按国家分组统计，保存到数据库',
          required: true,
        },
        workflow_name: {
          type: 'string',
          description: '工作流名称',
          required: true,
        },
        workflow_category: {
          type: 'string',
          description: '工作流分类（可选）',
        },
        workflow_tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: '工作流标签（可选）',
        },
        existing_workflow_id: {
          type: 'string',
          description: '如果是在现有工作流基础上设计，提供工作流ID（可选）',
        },
      },
      required: ['description', 'workflow_name'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        description,
        workflow_name,
        workflow_category,
        workflow_tags,
        existing_workflow_id,
      } = args;

      if (!description || !workflow_name) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'description and workflow_name are required',
          },
        };
      }

      // 如果提供了 existing_workflow_id，获取现有工作流
      let workflow: any = null;
      if (existing_workflow_id) {
        workflow = await workflowService.getWorkflowById(existing_workflow_id);
        if (!workflow) {
          return {
            success: false,
            error: {
              code: 'WORKFLOW_NOT_FOUND',
              message: `Workflow with id ${existing_workflow_id} not found`,
            },
          };
        }
      }

      // 创建工作流结构（基础版本，AI可以根据描述进一步完善）
      const workflowData: any = {
        name: workflow_name,
        description: description,
        category: workflow_category || null,
        tags: workflow_tags || [],
        nodes: [],
        connections: [],
      };

      let workflowId: string;
      if (existing_workflow_id) {
        // 更新现有工作流
        await workflowService.updateWorkflow(existing_workflow_id, workflowData);
        workflowId = existing_workflow_id;
        workflow = await workflowService.getWorkflowById(workflowId);
      } else {
        // 创建新工作流
        workflow = await workflowService.createWorkflow(workflowData);
        workflowId = workflow.id;
      }

      return {
        success: true,
        data: {
          workflow_id: workflowId,
          workflow: workflow,
          message: `Workflow ${existing_workflow_id ? 'updated' : 'created'} successfully. Please use add_node_to_workflow to add nodes based on the description.`,
          description: description,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to design workflow',
        },
      };
    }
  },
};

/**
 * optimize_workflow - 优化工作流
 */
const optimizeWorkflowFunction: FunctionDefinition = {
  schema: {
    name: 'optimize_workflow',
    description: '分析并优化工作流结构，包括检测问题、提供优化建议、自动修复等。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '要优化的工作流ID',
          required: true,
        },
        optimization_type: {
          type: 'string',
          description: '优化类型：structure=结构优化，performance=性能优化，all=全面优化',
          enum: ['structure', 'performance', 'all'],
          default: 'all',
        },
        auto_fix: {
          type: 'boolean',
          description: '是否自动修复发现的问题（默认false，只提供建议）',
          default: false,
        },
      },
      required: ['workflow_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        optimization_type = 'all',
        auto_fix = false,
      } = args;

      if (!workflow_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id is required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 验证工作流
      const validation = await workflowService.validateWorkflow(workflow_id);

      // 分析工作流结构
      const issues: any[] = [];
      const warnings: any[] = [];
      const suggestions: any[] = [];

      // 1. 检查孤立节点（没有连接或只有输入/输出的节点）
      const nodeIds = new Set<string>(workflow.nodes.map((n: any) => n.id as string));
      const hasIncoming = new Set<string>();
      const hasOutgoing = new Set<string>();

      for (const conn of workflow.connections || []) {
        const connAny = conn as any;
        const toNodeId = connAny.to?.node;
        const fromNodeId = connAny.from?.node;
        if (toNodeId && typeof toNodeId === 'string') {
          hasIncoming.add(toNodeId);
        }
        if (fromNodeId && typeof fromNodeId === 'string') {
          hasOutgoing.add(fromNodeId);
        }
      }

      const isolatedNodes: string[] = [];
      nodeIds.forEach((nodeId: string) => {
        if (!hasIncoming.has(nodeId) && !hasOutgoing.has(nodeId)) {
          isolatedNodes.push(nodeId);
        }
      });

      if (isolatedNodes.length > 0) {
        issues.push({
          type: 'isolated_nodes',
          node_ids: isolatedNodes,
          message: `Found ${isolatedNodes.length} isolated node(s) with no connections`,
        });
      }

      // 2. 检查只有输入没有输出的节点（可能是数据源节点，这是正常的）
      const inputOnlyNodes: string[] = [];
      nodeIds.forEach((nodeId: string) => {
        if (hasIncoming.has(nodeId) && !hasOutgoing.has(nodeId) && isolatedNodes.indexOf(nodeId) === -1) {
          inputOnlyNodes.push(nodeId);
        }
      });

      if (inputOnlyNodes.length > 0 && optimization_type !== 'structure') {
        warnings.push({
          type: 'input_only_nodes',
          node_ids: inputOnlyNodes,
          message: `Found ${inputOnlyNodes.length} node(s) with only input connections (may be data source nodes)`,
        });
      }

      // 3. 检查循环依赖（已在validation中检查）
      if (!validation.isComplete) {
        const circularDeps = validation.issues.filter((issue: any) => issue.type === 'circular_dependency');
        if (circularDeps.length > 0) {
          issues.push(...circularDeps);
        }
      }

      // 4. 性能优化建议（简单版本）
      if (optimization_type === 'performance' || optimization_type === 'all') {
        // 检查是否可以并行执行的节点
        const executionOrder = await workflowService.getExecutionOrder(workflow_id);
        if (executionOrder && executionOrder.length > 2) {
          suggestions.push({
            type: 'parallel_execution',
            message: 'Some nodes can be executed in parallel to improve performance',
          });
        }
      }

      // 如果需要自动修复
      let fixedIssues: any[] = [];
      if (auto_fix && issues.length > 0) {
        // 自动修复孤立节点（删除它们）
        const isolatedNodeIssues = issues.filter((issue: any) => issue.type === 'isolated_nodes');
        if (isolatedNodeIssues.length > 0) {
          const nodesToRemove = isolatedNodeIssues[0].node_ids;
          const updatedNodes = workflow.nodes.filter((n: any) => !nodesToRemove.includes(n.id));
          
          await workflowService.updateWorkflow(workflow_id, {
            nodes: updatedNodes,
          });

          fixedIssues.push({
            type: 'isolated_nodes',
            message: `Removed ${nodesToRemove.length} isolated node(s)`,
            node_ids: nodesToRemove,
          });
        }
      }

      return {
        success: true,
        data: {
          workflow_id,
          optimization_type,
          validation,
          issues: auto_fix ? issues.filter((issue: any) => !fixedIssues.some(fi => fi.type === issue.type)) : issues,
          warnings,
          suggestions,
          fixed_issues: fixedIssues,
          message: auto_fix && fixedIssues.length > 0
            ? `Optimized workflow: fixed ${fixedIssues.length} issue(s)`
            : `Analysis complete: found ${issues.length} issue(s), ${warnings.length} warning(s), ${suggestions.length} suggestion(s)`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to optimize workflow',
        },
      };
    }
  },
};

/**
 * add_data_align_node - 添加数据对齐节点
 */
const addDataAlignNodeFunction: FunctionDefinition = {
  schema: {
    name: 'add_data_align_node',
    description: '在两个节点之间自动添加数据对齐节点，解决输入输出类型不匹配问题。',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: '工作流ID',
          required: true,
        },
        from_node_id: {
          type: 'string',
          description: '源节点ID',
          required: true,
        },
        to_node_id: {
          type: 'string',
          description: '目标节点ID',
          required: true,
        },
        alignment_type: {
          type: 'string',
          description: '对齐类型：auto=自动识别，type_cast=类型转换，field_mapping=字段映射，reshape=数据重塑',
          enum: ['auto', 'type_cast', 'field_mapping', 'reshape'],
          default: 'auto',
        },
        create_new_operator: {
          type: 'boolean',
          description: '如果没有合适的对齐算子，是否创建新的（默认false，只使用现有算子）',
          default: false,
        },
      },
      required: ['workflow_id', 'from_node_id', 'to_node_id'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        workflow_id,
        from_node_id,
        to_node_id,
        alignment_type = 'auto',
        create_new_operator = false,
      } = args;

      if (!workflow_id || !from_node_id || !to_node_id) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workflow_id, from_node_id, and to_node_id are required',
          },
        };
      }

      // 获取工作流
      const workflow = await workflowService.getWorkflowById(workflow_id);
      if (!workflow) {
        return {
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: `Workflow with id ${workflow_id} not found`,
          },
        };
      }

      // 查找源节点和目标节点
      const fromNode = workflow.nodes.find((n: any) => n.id === from_node_id);
      const toNode = workflow.nodes.find((n: any) => n.id === to_node_id);

      if (!fromNode) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `From node with id ${from_node_id} not found`,
          },
        };
      }

      if (!toNode) {
        return {
          success: false,
          error: {
            code: 'NODE_NOT_FOUND',
            message: `To node with id ${to_node_id} not found`,
          },
        };
      }

      // 获取源节点和目标节点的算子信息
      const fromOperatorRaw = await operatorService.getOperatorById(fromNode.operatorId);
      const toOperatorRaw = await operatorService.getOperatorById(toNode.operatorId);

      if (!fromOperatorRaw || !toOperatorRaw) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `Operator not found for nodes`,
          },
        };
      }

      // 序列化算子以解析 inputs 和 outputs
      const fromOperator = operatorService.serializeOperator(fromOperatorRaw);
      const toOperator = operatorService.serializeOperator(toOperatorRaw);

      // 分析输入输出类型
      const fromOutputs = Array.isArray(fromOperator.outputs) ? fromOperator.outputs : [];
      const toInputs = Array.isArray(toOperator.inputs) ? toOperator.inputs : [];

      // 查找现有连接（如果有）
      const existingConnection = workflow.connections.find((conn: any) => 
        conn.from?.node === from_node_id && conn.to?.node === to_node_id
      );

      // 搜索数据对齐算子
      const alignOperators = await operatorService.search(undefined, undefined, 'data_align');
      
      let selectedOperator: any = null;
      if (alignOperators.length > 0) {
        // 简单匹配：选择第一个数据对齐算子
        selectedOperator = alignOperators[0];
      }

      if (!selectedOperator && !create_new_operator) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: 'No suitable data alignment operator found. Set create_new_operator=true to create a new operator. Use search_operators with operator_type=data_align to find available alignment operators',
          },
        };
      }

      // 如果没有找到合适的算子，返回错误（暂时不支持创建新算子）
      if (!selectedOperator) {
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Creating new alignment operators is not yet implemented',
          },
        };
      }

      // 创建对齐节点
      const alignNodeId = `node_${Date.now()}`;
      const alignNode: any = {
        id: alignNodeId,
        operatorId: selectedOperator.id,
        operatorType: selectedOperator.operatorType || 'local_python',
        nodeType: 'data_align',
        config: {},
        positionX: ((fromNode.positionX || 0) + (toNode.positionX || 0)) / 2,
        positionY: ((fromNode.positionY || 0) + (toNode.positionY || 0)) / 2,
      };

      // 添加对齐节点到工作流
      const updatedNodes = [...workflow.nodes, alignNode];

      // 更新连接：断开原有连接（如果有），创建新的连接
      const updatedConnections = workflow.connections.filter((conn: any) => 
        !(conn.from?.node === from_node_id && conn.to?.node === to_node_id)
      );

      // 添加新连接：from_node -> align_node -> to_node
      const fromOutputPort = (fromOutputs[0] && typeof fromOutputs[0] === 'object' && 'name' in fromOutputs[0]) 
        ? (fromOutputs[0] as any).name 
        : 'output';
      const toInputPort = (toInputs[0] && typeof toInputs[0] === 'object' && 'name' in toInputs[0])
        ? (toInputs[0] as any).name
        : 'input';
      const alignInputPort = toInputPort; // 对齐节点的输入端口
      const alignOutputPort = fromOutputPort; // 对齐节点的输出端口（暂时使用源输出端口名）

      updatedConnections.push({
        id: `conn_${Date.now()}_1`,
        from: { node: from_node_id, port: fromOutputPort },
        to: { node: alignNodeId, port: alignInputPort },
      });

      updatedConnections.push({
        id: `conn_${Date.now()}_2`,
        from: { node: alignNodeId, port: alignOutputPort },
        to: { node: to_node_id, port: toInputPort },
      });

      // 更新工作流
      const updatedWorkflow = await workflowService.updateWorkflow(workflow_id, {
        nodes: updatedNodes,
        connections: updatedConnections,
      });

      return {
        success: true,
        data: {
          workflow_id,
          align_node_id: alignNodeId,
          operator_id: selectedOperator.id,
          operator_name: selectedOperator.name,
          from_node_id,
          to_node_id,
          alignment_type,
          workflow: updatedWorkflow,
          message: `Data alignment node added successfully between ${from_node_id} and ${to_node_id}`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to add data alignment node',
        },
      };
    }
  },
};

/**
 * analyze_execution_error - 分析执行错误
 */
const analyzeExecutionErrorFunction: FunctionDefinition = {
  schema: {
    name: 'analyze_execution_error',
    description: '分析工作流执行错误，诊断问题原因并提供修复建议。',
    parameters: {
      type: 'object',
      properties: {
        execution_id: {
          type: 'string',
          description: '执行ID（可选，如果提供会分析具体执行）',
        },
        workflow_id: {
          type: 'string',
          description: '工作流ID（如果execution_id未提供）',
        },
        error_message: {
          type: 'string',
          description: '错误信息（可选，用于快速分析）',
        },
        auto_fix: {
          type: 'boolean',
          description: '是否自动修复（默认false，只提供分析）',
          default: false,
        },
      },
      required: [],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        execution_id,
        workflow_id,
        error_message,
        auto_fix = false,
      } = args;

      if (!execution_id && !workflow_id && !error_message) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'At least one of execution_id, workflow_id, or error_message is required',
          },
        };
      }

      const executionService = new ExecutionService();

      let execution: any = null;
      let logs: any[] = [];
      let targetWorkflowId = workflow_id;

      // 如果有execution_id，获取执行记录
      if (execution_id) {
        execution = await executionService.getExecutionById(execution_id);
        if (!execution) {
          return {
            success: false,
            error: {
              code: 'EXECUTION_NOT_FOUND',
              message: `Execution with id ${execution_id} not found`,
            },
          };
        }
        targetWorkflowId = execution.workflowId;
        logs = await executionService.getExecutionLogs(execution_id);
      } else if (workflow_id) {
        // 如果没有execution_id但有workflow_id，获取最近的执行记录
        const executions = await executionService.listExecutions(undefined, workflow_id);
        if (executions.length > 0) {
          execution = executions[0]; // 获取最新的执行记录
          logs = await executionService.getExecutionLogs(execution.id);
        }
      }

      // 分析错误
      const errorLogs = logs.filter((log: any) => log.level === 'ERROR');
      const failedNodeIds = new Set<string>();
      const errorMessages: string[] = [];

      for (const log of errorLogs) {
        if (log.nodeId) {
          failedNodeIds.add(log.nodeId);
        }
        if (log.message) {
          errorMessages.push(log.message);
        }
      }

      // 如果有error_message，添加到错误消息列表
      if (error_message) {
        errorMessages.push(error_message);
      }

      // 如果有执行记录，获取失败节点的信息
      let failedNodes: any[] = [];
      if (targetWorkflowId && failedNodeIds.size > 0) {
        const workflow = await workflowService.getWorkflowById(targetWorkflowId);
        if (workflow) {
          for (const nodeId of failedNodeIds) {
            const node = workflow.nodes.find((n: any) => n.id === nodeId);
            if (node) {
              try {
                const operator = await operatorService.getOperatorById(node.operatorId);
                failedNodes.push({
                  node_id: nodeId,
                  operator_id: node.operatorId,
                  operator_name: operator?.name || node.operatorId,
                  userConfig: node.userConfig || node.config || {},
                });
              } catch (error) {
                failedNodes.push({
                  node_id: nodeId,
                  operator_id: node.operatorId,
                  operator_name: node.operatorId,
                  userConfig: node.userConfig || node.config || {},
                });
              }
            }
          }
        }
      }

      // 分析错误类型
      const errorTypes: string[] = [];
      const suggestions: any[] = [];

      // 常见错误模式
      for (const msg of errorMessages) {
        if (msg.includes('not found') || msg.includes('不存在')) {
          errorTypes.push('missing_resource');
          suggestions.push({
            type: 'missing_resource',
            message: 'Check if required resources (files, columns, etc.) exist',
          });
        }
        if (msg.includes('type') || msg.includes('类型')) {
          errorTypes.push('type_mismatch');
          suggestions.push({
            type: 'type_mismatch',
            message: 'Check if data types match between nodes. Consider using add_data_align_node',
          });
        }
        if (msg.includes('config') || msg.includes('配置') || msg.includes('parameter')) {
          errorTypes.push('config_error');
          suggestions.push({
            type: 'config_error',
            message: 'Check node configuration. Use auto_configure_node to fix configuration',
          });
        }
        if (msg.includes('import') || msg.includes('module')) {
          errorTypes.push('dependency_error');
          suggestions.push({
            type: 'dependency_error',
            message: 'Check if required dependencies are installed',
          });
        }
      }

      // 去重
      const uniqueErrorTypes = Array.from(new Set(errorTypes));
      const uniqueSuggestions = suggestions.filter((s, index, self) =>
        index === self.findIndex((t) => t.type === s.type)
      );

      return {
        success: true,
        data: {
          execution_id: execution?.id || null,
          workflow_id: targetWorkflowId || null,
          failed_nodes: failedNodes,
          error_logs: errorLogs,
          error_messages: errorMessages,
          error_types: uniqueErrorTypes,
          suggestions: uniqueSuggestions,
          execution_status: execution?.status || null,
          message: failedNodes.length > 0
            ? `Found ${failedNodes.length} failed node(s) with ${errorLogs.length} error log(s)`
            : errorMessages.length > 0
            ? `Analyzed ${errorMessages.length} error message(s)`
            : 'No errors found',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to analyze execution error',
        },
      };
    }
  },
};

/**
 * create_operator - 创建算子（第一步：创建 operator.yaml）
 */
const createOperatorFunction: FunctionDefinition = {
  schema: {
    name: 'create_operator',
    description: '根据用户需求自动创建算子。注意：采用分步创建方式，先创建 operator.yaml，然后逐步添加其他文件。只能编辑 Custom_operators 目录下的算子。',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: '算子功能描述，例如：将CSV文件的列名转换为小写',
          required: true,
        },
        operator_name: {
          type: 'string',
          description: '算子名称',
          required: true,
        },
        operator_type: {
          type: 'string',
          description: '算子执行类型，默认local_python',
          enum: ['local_python', 'local_typescript'],
          default: 'local_python',
        },
        operator_yaml: {
          type: 'string',
          description: 'operator.yaml 的完整内容（必须包含 file_structure 信息块）。如果提供，将直接使用此内容创建 operator.yaml；如果不提供，AI会根据其他参数自动生成。',
        },
        inputs: {
          type: 'array',
          description: '输入数据定义（可选，AI可以自动推断）',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        outputs: {
          type: 'array',
          description: '输出数据定义（可选，AI可以自动推断）',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        operator_params: {
          type: 'array',
          description: '用户配置参数（可选，AI可以自动推断）',
          items: {
            type: 'object',
          },
        },
        file_structure: {
          type: 'object',
          description: '文件结构描述（必需），用于描述算子目录下各文件的作用，帮助AI快速理解这个算子。示例：{"main.py": "算子的主要代码文件", "requirements.txt": "Python依赖包列表"}',
          additionalProperties: {
            type: 'string',
          } as any, // TypeScript 类型兼容性：additionalProperties 支持 FunctionParameter 对象
        },
      },
      required: ['description', 'operator_name', 'file_structure'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        description,
        operator_name,
        operator_type = 'local_python',
        operator_yaml,
        inputs = [],
        outputs = [],
        operator_params = [],
        file_structure,
      } = args;

      if (!description || !operator_name || !file_structure) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'description, operator_name, and file_structure are required',
          },
        };
      }

      // 导入所需的模块
      const yaml = require('yaml');
      const fs = require('fs');
      const path = require('path');
      const { v4: uuidv4 } = require('uuid');

      let yamlContent: string;

      if (operator_yaml) {
        // 如果提供了 operator_yaml，直接使用
        yamlContent = operator_yaml;
        
        // 验证 YAML 格式
        try {
          const config = yaml.parse(yamlContent);
          if (!config.file_structure || typeof config.file_structure !== 'object') {
            return {
              success: false,
              error: {
                code: 'INVALID_YAML',
                message: 'operator.yaml 必须包含 file_structure 信息块',
              },
            };
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'INVALID_YAML',
              message: `operator.yaml 格式错误: ${error.message}`,
            },
          };
        }
      } else {
        // 根据参数生成 operator.yaml
        const config: any = {
          name: operator_name,
          version: '1.0.0',
          description: description,
          author: 'AI Assistant',
          license: 'MIT',
          type: 'data_processing',
          category: '数据处理',
          tags: [],
          code_path: 'main.py',
          entry_point: operator_name.charAt(0).toUpperCase() + operator_name.slice(1).replace(/[-_](.)/g, (_: any, c: string) => c.toUpperCase()),
          operator_type: operator_type,
          file_structure: file_structure,
        };

        if (inputs.length > 0) {
          config.inputs = inputs;
        }

        if (outputs.length > 0) {
          config.outputs = outputs;
        }

        if (operator_params.length > 0) {
          config.operator_params = operator_params;
        }

        yamlContent = yaml.stringify(config);
      }

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const customOperatorsDir = path.join(projectRoot, 'Custom_operators');

      // 确保 Custom_operators 目录存在
      if (!fs.existsSync(customOperatorsDir)) {
        fs.mkdirSync(customOperatorsDir, { recursive: true });
      }

      // 生成 UUID 作为目录名
      const operatorDirName = uuidv4();
      const operatorDir = path.join(customOperatorsDir, operatorDirName);

      // 创建算子目录
      fs.mkdirSync(operatorDir, { recursive: true });

      // 写入 operator.yaml 文件
      const yamlPath = path.join(operatorDir, 'operator.yaml');
      fs.writeFileSync(yamlPath, yamlContent, 'utf-8');
      fs.chmodSync(yamlPath, 0o644);

      // 计算相对路径（相对于项目根目录）
      const relativePath = path.relative(projectRoot, operatorDir);

      return {
        success: true,
        data: {
          operator_path: relativePath,
          operator_name,
          message: 'Operator directory created successfully. Please use add_operator_file, edit_operator_file, delete_operator_file to manage files, and register_operator to register the operator when all files are ready.',
          next_steps: [
            'Use add_operator_file to add files (e.g., main.py, requirements.txt)',
            'Use edit_operator_file to modify files if needed',
            'Use register_operator to register the operator when all files are ready',
          ],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to create operator',
        },
      };
    }
  },
};

/**
 * add_operator_file - 添加算子文件
 */
const addOperatorFileFunction: FunctionDefinition = {
  schema: {
    name: 'add_operator_file',
    description: '为算子目录添加新文件。只能编辑 Custom_operators 目录下的算子。',
    parameters: {
      type: 'object',
      properties: {
        operator_path: {
          type: 'string',
          description: '算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）',
          required: true,
        },
        filename: {
          type: 'string',
          description: '文件名（如 main.py, requirements.txt）',
          required: true,
        },
        content: {
          type: 'string',
          description: '文件内容',
          required: true,
        },
        path: {
          type: 'string',
          description: '文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.py）',
        },
      },
      required: ['operator_path', 'filename', 'content'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        operator_path,
        filename,
        content,
        path: filePath = '',
      } = args;

      if (!operator_path || !filename || content === undefined) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'operator_path, filename, and content are required',
          },
        };
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!operator_path.startsWith('Custom_operators/')) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '只能编辑 Custom_operators 目录下的算子',
          },
        };
      }

      const fs = require('fs');
      const path = require('path');

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const operatorDir = path.join(projectRoot, operator_path);

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `算子目录不存在: ${operator_path}`,
          },
        };
      }

      // 构建完整文件路径
      const fullPath = filePath ? path.join(operatorDir, filePath, filename) : path.join(operatorDir, filename);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      if (!fullPath.startsWith(operatorDir)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '无效的文件路径',
          },
        };
      }

      // 确保文件所在目录存在
      const fileDir = path.dirname(fullPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // 如果文件已存在，返回错误
      if (fs.existsSync(fullPath)) {
        return {
          success: false,
          error: {
            code: 'FILE_EXISTS',
            message: `文件已存在: ${filename}`,
          },
        };
      }

      // 写入文件内容
      fs.writeFileSync(fullPath, content, 'utf-8');
      fs.chmodSync(fullPath, 0o644);

      const relativeFilePath = path.relative(operatorDir, fullPath);

      return {
        success: true,
        data: {
          operator_path,
          file_path: relativeFilePath,
          filename,
          message: 'File added successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to add operator file',
        },
      };
    }
  },
};

/**
 * edit_operator_file - 编辑算子文件
 */
const editOperatorFileFunction: FunctionDefinition = {
  schema: {
    name: 'edit_operator_file',
    description: '编辑算子目录中的文件。只能编辑 Custom_operators 目录下的算子。operator.yaml 也可以通过这个接口来修改。',
    parameters: {
      type: 'object',
      properties: {
        operator_path: {
          type: 'string',
          description: '算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）',
          required: true,
        },
        filename: {
          type: 'string',
          description: '文件名（如 main.py, operator.yaml）',
          required: true,
        },
        content: {
          type: 'string',
          description: '文件内容',
          required: true,
        },
        path: {
          type: 'string',
          description: '文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.tsx）',
        },
      },
      required: ['operator_path', 'filename', 'content'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        operator_path,
        filename,
        content,
        path: filePath = '',
      } = args;

      if (!operator_path || !filename || content === undefined) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'operator_path, filename, and content are required',
          },
        };
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!operator_path.startsWith('Custom_operators/')) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '只能编辑 Custom_operators 目录下的算子',
          },
        };
      }

      const fs = require('fs');
      const path = require('path');

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const operatorDir = path.join(projectRoot, operator_path);

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `算子目录不存在: ${operator_path}`,
          },
        };
      }

      // 构建完整文件路径
      const fullPath = filePath ? path.join(operatorDir, filePath, filename) : path.join(operatorDir, filename);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      if (!fullPath.startsWith(operatorDir)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '无效的文件路径',
          },
        };
      }

      // 如果文件不存在，返回错误
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `文件不存在: ${filename}`,
          },
        };
      }

      // 写入文件内容
      fs.writeFileSync(fullPath, content, 'utf-8');
      fs.chmodSync(fullPath, 0o644);

      const relativeFilePath = path.relative(operatorDir, fullPath);

      return {
        success: true,
        data: {
          operator_path,
          file_path: relativeFilePath,
          filename,
          message: 'File updated successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to edit operator file',
        },
      };
    }
  },
};

/**
 * delete_operator_file - 删除算子文件
 */
const deleteOperatorFileFunction: FunctionDefinition = {
  schema: {
    name: 'delete_operator_file',
    description: '删除算子目录中的文件。只能删除 Custom_operators 目录下的算子文件。不能删除 operator.yaml 文件，如需修改请使用 edit_operator_file。',
    parameters: {
      type: 'object',
      properties: {
        operator_path: {
          type: 'string',
          description: '算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）',
          required: true,
        },
        filename: {
          type: 'string',
          description: '文件名（如 main.py, test_data.json）',
          required: true,
        },
        path: {
          type: 'string',
          description: '文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.tsx）',
        },
      },
      required: ['operator_path', 'filename'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        operator_path,
        filename,
        path: filePath = '',
      } = args;

      if (!operator_path || !filename) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'operator_path and filename are required',
          },
        };
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!operator_path.startsWith('Custom_operators/')) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '只能删除 Custom_operators 目录下的算子文件',
          },
        };
      }

      // 不能删除 operator.yaml
      if (filename === 'operator.yaml' || filename.endsWith('/operator.yaml')) {
        return {
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: '不能删除 operator.yaml 文件，如需修改请使用 edit_operator_file',
          },
        };
      }

      const fs = require('fs');
      const path = require('path');

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const operatorDir = path.join(projectRoot, operator_path);

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        return {
          success: false,
          error: {
            code: 'OPERATOR_NOT_FOUND',
            message: `算子目录不存在: ${operator_path}`,
          },
        };
      }

      // 构建完整文件路径
      const fullPath = filePath ? path.join(operatorDir, filePath, filename) : path.join(operatorDir, filename);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      if (!fullPath.startsWith(operatorDir)) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '无效的文件路径',
          },
        };
      }

      // 如果文件不存在，返回错误
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `文件不存在: ${filename}`,
          },
        };
      }

      // 删除文件
      fs.unlinkSync(fullPath);

      const relativeFilePath = path.relative(operatorDir, fullPath);

      return {
        success: true,
        data: {
          operator_path,
          file_path: relativeFilePath,
          filename,
          message: 'File deleted successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to delete operator file',
        },
      };
    }
  },
};

/**
 * register_operator - 注册算子
 */
const registerOperatorFunction: FunctionDefinition = {
  schema: {
    name: 'register_operator',
    description: '注册算子到系统中。当所有文件创建完成后，调用此函数注册算子。',
    parameters: {
      type: 'object',
      properties: {
        operator_path: {
          type: 'string',
          description: '算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）',
          required: true,
        },
        operator_id: {
          type: 'string',
          description: '算子ID（可选，不提供则自动生成）',
        },
        use_relative_path: {
          type: 'boolean',
          description: '是否使用相对路径（默认true，表示使用相对于项目根目录的路径）',
          default: true,
        },
      },
      required: ['operator_path'],
    },
  },
  handler: async (args: any, context?: FunctionCallContext): Promise<FunctionCallResult> => {
    try {
      const {
        operator_path,
        operator_id,
        use_relative_path = true,
      } = args;

      if (!operator_path) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'operator_path is required',
          },
        };
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!operator_path.startsWith('Custom_operators/')) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: '只能注册 Custom_operators 目录下的算子',
          },
        };
      }

      // 调用 OperatorService 来注册算子
      const { OperatorService } = await import('../services/OperatorService');
      const operatorService = new OperatorService();

      // 获取项目根目录
      const path = require('path');
      const projectRoot = path.resolve(__dirname, '../../../');
      const actualOperatorPath = path.resolve(projectRoot, operator_path);

      // 验证 operator.yaml 存在
      const fs = require('fs');
      const yamlPath = path.join(actualOperatorPath, 'operator.yaml');
      if (!fs.existsSync(yamlPath)) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `operator.yaml not found at ${yamlPath}`,
          },
        };
      }

      // 读取并解析 operator.yaml
      const yaml = require('yaml');
      const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      const config = yaml.parse(yamlContent);

      // 准备注册数据
      const registerData: any = {
        ...config,
        id: operator_id,
      };

      // 调用 OperatorController 的注册逻辑
      // 由于我们在函数中，我们需要直接使用数据库操作
      const { AppDataSource } = await import('../../../config/database');
      const { Operator } = await import('../../../package/entities/Operator');
      
      const operatorRepository = AppDataSource.getRepository(Operator);
      
      // 检查算子是否已存在
      if (operator_id) {
        const existing = await operatorRepository.findOne({ where: { id: operator_id } });
        if (existing) {
          return {
            success: false,
            error: {
              code: 'OPERATOR_EXISTS',
              message: `算子ID ${operator_id} 已存在`,
            },
          };
        }
      }

      // 创建算子实体
      const operator = new Operator();
      operator.id = operator_id || `op_${Date.now()}`;
      operator.name = config.name;
      operator.version = config.version || '1.0.0';
      operator.description = config.description;
      operator.author = config.author || 'Unknown';
      operator.license = config.license || 'MIT';
      operator.type = config.type || 'data_processing';
      operator.category = config.category || '数据处理';
      operator.tags = config.tags ? JSON.stringify(config.tags) : undefined;
      
      // 检查是否为纯前端可视化算子（有 dataVisualization 但没有 codePath/entryPoint/operatorType）
      const hasDataVisualization = config.data_visualization || config.dataVisualization;
      const hasCodePath = config.code_path || config.codePath;
      const hasEntryPoint = config.entry_point || config.entryPoint;
      const hasOperatorType = config.operator_type || config.operatorType;
      
      if (hasDataVisualization && !hasCodePath && !hasEntryPoint && !hasOperatorType) {
        // 纯前端可视化算子：不设置 codePath、entryPoint、operatorType
        operator.codePath = null;
        operator.entryPoint = null;
        operator.operatorType = null;
      } else {
        // 普通算子：设置代码路径和执行配置
        operator.codePath = config.code_path || config.codePath || 'main.py';
        operator.entryPoint = config.entry_point || config.entryPoint || config.name;
        operator.operatorType = config.operator_type || config.operatorType || 'local_python';
      }
      operator.inputs = config.inputs ? JSON.stringify(config.inputs) : undefined;
      operator.outputs = config.outputs ? JSON.stringify(config.outputs) : undefined;
      operator.operatorParams = config.operator_params || config.operatorParams ? JSON.stringify(config.operator_params || config.operatorParams) : undefined;
      operator.executionConfig = config.execution_config || config.executionConfig ? JSON.stringify(config.execution_config || config.executionConfig) : undefined;
      operator.dataVisualization = config.data_visualization || config.dataVisualization ? JSON.stringify(config.data_visualization || config.dataVisualization) : undefined;
      operator.mockdata = config.mockdata ? JSON.stringify(config.mockdata) : undefined;
      
      // 保存 metadata
      const metadata: any = {
        operatorPath: operator_path,
        isRelativePath: use_relative_path,
      };
      if (config.metadata) {
        Object.assign(metadata, config.metadata);
      }
      operator.metadata = JSON.stringify(metadata);

      // 保存到数据库
      await operatorRepository.save(operator);

      return {
        success: true,
        data: {
          operator_id: operator.id,
          operator_name: operator.name,
          operator_path,
          message: 'Operator registered successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Failed to register operator',
        },
      };
    }
  },
};

/**
 * 注册所有Functions
 */
export function registerFunctions() {
  // 注册基础Functions
  functionRegistry.register(getWorkflowDetailFunction);
  functionRegistry.register(searchOperatorsFunction);
  
  // 注册节点操作Functions
  functionRegistry.register(addNodeToWorkflowFunction);
  functionRegistry.register(autoConfigureNodeFunction);
  functionRegistry.register(getNodeOperatorParamsFunction); // 新增
  functionRegistry.register(updateNodeConfigFunction); // 新增
  functionRegistry.register(getSelectedObjectsDetailFunction);
  functionRegistry.register(getNodeUpstreamDataFeaturesFunction);
  functionRegistry.register(getNodeUpstreamDataStructureFunction);
  
  // 注册工作流设计Functions
  functionRegistry.register(designWorkflowFunction);
  functionRegistry.register(optimizeWorkflowFunction);
  functionRegistry.register(addDataAlignNodeFunction);
  functionRegistry.register(analyzeExecutionErrorFunction);
  
  // 注册算子创建Functions
  functionRegistry.register(createOperatorFunction);
  functionRegistry.register(addOperatorFileFunction);
  functionRegistry.register(editOperatorFileFunction);
  functionRegistry.register(deleteOperatorFileFunction);
  functionRegistry.register(registerOperatorFunction);

  console.log('✅ Functions registered:', functionRegistry.getAllSchemas().map(f => f.name).join(', '));
}

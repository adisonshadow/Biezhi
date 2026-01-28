import { Context } from 'koa';
import { AppDataSource } from '../../../config/database';
import { Workflow } from '../../../package/entities/Workflow';
import { WorkflowNode } from '../../../package/entities/WorkflowNode';
import { WorkflowConnection } from '../../../package/entities/WorkflowConnection';
import { WorkflowService } from '../services/WorkflowService';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowController {
  private service: WorkflowService;

  constructor() {
    this.service = new WorkflowService();
  }

  /**
   * 创建工作流
   * POST /api/workflows
   */
  async create(ctx: Context) {
    try {
      const data = ctx.request.body as any;
      const workflow = await this.service.createWorkflow(data);
      ctx.status = 201;
      ctx.body = workflow;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取所有工作流
   * GET /api/workflows
   */
  async list(ctx: Context) {
    try {
      const workflows = await this.service.listWorkflows();
      ctx.body = workflows;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 搜索工作流
   * GET /api/workflows/search?q=xxx
   */
  async search(ctx: Context) {
    try {
      const { q } = ctx.query;
      const results = await this.service.searchWorkflows(q as string);
      ctx.body = results;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取工作流详情
   * GET /api/workflows/:id
   */
  async getById(ctx: Context) {
    try {
      const { id } = ctx.params;
      const workflow = await this.service.getWorkflowById(id);
      if (!workflow) {
        ctx.status = 404;
        ctx.body = { error: 'Workflow not found' };
        return;
      }
      ctx.body = workflow;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 更新工作流
   * PUT /api/workflows/:id
   */
  async update(ctx: Context) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body as any;
      const workflow = await this.service.updateWorkflow(id, data);
      if (!workflow) {
        ctx.status = 404;
        ctx.body = { error: 'Workflow not found' };
        return;
      }
      ctx.body = workflow;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 删除工作流
   * DELETE /api/workflows/:id
   */
  async delete(ctx: Context) {
    try {
      const { id } = ctx.params;
      await this.service.deleteWorkflow(id);
      ctx.status = 200;
      ctx.body = { message: 'Workflow deleted successfully' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 验证工作流
   * POST /api/workflows/:id/validate
   */
  async validate(ctx: Context) {
    try {
      const { id } = ctx.params;
      const result = await this.service.validateWorkflow(id);
      ctx.body = result;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取执行顺序
   * GET /api/workflows/:id/execution-order
   */
  async getExecutionOrder(ctx: Context) {
    try {
      const { id } = ctx.params;
      const order = await this.service.getExecutionOrder(id);
      ctx.body = { executionOrder: order };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 导出工作流
   * GET /api/workflows/:id/export
   */
  async export(ctx: Context) {
    try {
      const { id } = ctx.params;
      const workflow = await this.service.getWorkflowById(id);
      if (!workflow) {
        ctx.status = 404;
        ctx.body = { error: 'Workflow not found' };
        return;
      }
      ctx.body = workflow;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 导入工作流
   * POST /api/workflows/import
   */
  async import(ctx: Context) {
    try {
      const data = ctx.request.body as any;
      const workflow = await this.service.createWorkflow(data);
      ctx.status = 201;
      ctx.body = workflow;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
}


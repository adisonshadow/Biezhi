import Router from 'koa-router';
import { FunctionController } from '../controllers/FunctionController';

const router = new Router();
const controller = new FunctionController();

/**
 * @swagger
 * /api/ai/functions/schemas:
 *   get:
 *     tags:
 *       - AI Functions - Function Calling
 *     summary: 获取所有Functions的Schema
 *     description: 返回所有已注册的Function的Schema定义，用于传递给AI模型
 *     responses:
 *       200:
 *         description: 成功返回Function Schema列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "get_workflow_detail"
 *                       description:
 *                         type: string
 *                         example: "获取工作流的详细信息"
 *                       parameters:
 *                         type: object
 */
router.get('/schemas', async (ctx) => {
  await controller.getSchemas(ctx);
});

/**
 * @swagger
 * /api/ai/functions/execute:
 *   post:
 *     tags:
 *       - AI Functions - Function Calling
 *     summary: 执行单个Function Call
 *     description: 执行一个Function Call，返回执行结果
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - function_name
 *             properties:
 *               function_name:
 *                 type: string
 *                 description: Function名称
 *                 example: "get_workflow_detail"
 *               arguments:
 *                 type: object
 *                 description: Function参数
 *                 example:
 *                   workflow_id: "wf_123"
 *                   include_operators: true
 *               context:
 *                 type: object
 *                 description: 调用上下文（可选）
 *                 example:
 *                   workflow_id: "wf_123"
 *                   message_id: "msg_456"
 *     responses:
 *       200:
 *         description: Function执行结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 error:
 *                   type: object
 *                 execution_time_ms:
 *                   type: number
 */
router.post('/execute', async (ctx) => {
  await controller.executeFunction(ctx);
});

/**
 * @swagger
 * /api/ai/functions/execute-batch:
 *   post:
 *     tags:
 *       - AI Functions - Function Calling
 *     summary: 批量执行Function Calls
 *     description: 批量执行多个Function Calls，返回所有执行结果
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - function_calls
 *             properties:
 *               function_calls:
 *                 type: array
 *                 description: Function Call列表
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     arguments:
 *                       type: object
 *               context:
 *                 type: object
 *                 description: 调用上下文（可选）
 *     responses:
 *       200:
 *         description: 批量执行结果
 */
router.post('/execute-batch', async (ctx) => {
  await controller.executeFunctions(ctx);
});

export const functionRoutes = router;

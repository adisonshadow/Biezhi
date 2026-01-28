import Router from 'koa-router';
import { ExecutionController } from '../controllers/ExecutionController';

export const executionRoutes = new Router();
const controller = new ExecutionController();

/**
 * @swagger
 * /api/executions:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 创建执行任务
 *     description: 为指定工作流创建一个新的执行任务
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowId
 *             properties:
 *               workflowId:
 *                 type: string
 *                 description: 工作流ID
 *               inputData:
 *                 type: object
 *                 description: 输入数据（可选）
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 workflowId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, running, success, failed, cancelled]
 */
executionRoutes.post('/', async (ctx) => {
  await controller.create(ctx);
});

/**
 * @swagger
 * /api/executions:
 *   get:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 获取所有执行任务
 *     description: 获取系统中所有执行任务列表，支持按状态和工作流ID过滤
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, success, failed, cancelled]
 *         description: 执行状态
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     responses:
 *       200:
 *         description: 成功返回执行任务列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
executionRoutes.get('/', async (ctx) => {
  await controller.list(ctx);
});

/**
 * @swagger
 * /api/executions/{id}:
 *   get:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 获取执行任务详情
 *     description: 根据ID获取执行任务的详细信息，包括状态、输入输出数据等
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行任务ID
 *     responses:
 *       200:
 *         description: 成功返回执行任务详情
 *       404:
 *         description: 执行任务不存在
 */
executionRoutes.get('/:id', async (ctx) => {
  await controller.getById(ctx);
});

/**
 * @swagger
 * /api/executions/{id}/start:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 启动执行任务
 *     description: 启动一个待执行的任务，开始执行工作流
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行任务ID
 *     responses:
 *       200:
 *         description: 启动成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Execution started"
 *       500:
 *         description: 启动失败
 */
executionRoutes.post('/:id/start', async (ctx) => {
  await controller.start(ctx);
});

/**
 * @swagger
 * /api/executions/{id}/stop:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 停止执行任务
 *     description: 停止一个正在运行的任务
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行任务ID
 *     responses:
 *       200:
 *         description: 停止成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Execution stopped"
 *       500:
 *         description: 停止失败
 */
executionRoutes.post('/:id/stop', async (ctx) => {
  await controller.stop(ctx);
});

/**
 * @swagger
 * /api/executions/{id}:
 *   delete:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 删除执行任务
 *     description: 根据ID删除执行任务及其相关日志
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行任务ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 执行任务不存在
 */
executionRoutes.delete('/:id', async (ctx) => {
  await controller.delete(ctx);
});

/**
 * @swagger
 * /api/executions/{id}/logs:
 *   get:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 获取执行日志
 *     description: 获取执行任务的所有日志记录
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行任务ID
 *     responses:
 *       200:
 *         description: 成功返回日志列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   level:
 *                     type: string
 *                     enum: [info, warn, error, debug]
 *                   message:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
executionRoutes.get('/:id/logs', async (ctx) => {
  await controller.getLogs(ctx);
});

/**
 * @swagger
 * /api/executions/node/execute:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 执行单个节点（用于节点调试）
 *     description: 执行单个算子节点，用于在工作流设计器中调试节点
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operatorId
 *             properties:
 *               operatorId:
 *                 type: string
 *                 description: 算子ID
 *               config:
 *                 type: object
 *                 description: 节点配置参数（operator_params）
 *               inputs:
 *                 type: object
 *                 description: 输入数据（可选）
 *     responses:
 *       200:
 *         description: 执行成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   description: 执行结果
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 执行失败
 */
executionRoutes.post('/node/execute', async (ctx) => {
  await controller.executeNode(ctx);
});

/**
 * @swagger
 * /api/executions/workflow/{workflowId}/execute-full:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 一键执行工作流
 *     description: 从头开始完整执行整个工作流，创建新的数据版本。支持SSE流式推送和同步两种模式。
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *       - in: query
 *         name: stream
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否使用SSE流式推送（true=SSE模式，返回sessionId；false=同步模式，返回所有节点结果）
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inputData:
 *                 type: object
 *                 description: 输入数据（可选）
 *     responses:
 *       200:
 *         description: 执行成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                   description: 执行会话ID（SSE模式）
 *                 results:
 *                   type: object
 *                   description: 所有节点执行结果（同步模式）
 *       500:
 *         description: 执行失败
 */
executionRoutes.post('/workflow/:workflowId/execute-full', async (ctx) => {
  await controller.executeFullWorkflow(ctx);
});

/**
 * @swagger
 * /api/executions/workflow/{workflowId}/node/{nodeId}/execute:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 单节点执行
 *     description: 仅执行选中的单个节点，使用当前最新的数据版本。支持SSE流式推送和同步两种模式。
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: 节点ID
 *       - in: query
 *         name: stream
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否使用SSE流式推送（true=SSE模式，返回sessionId；false=同步模式，返回节点结果）
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 type: object
 *                 description: 节点配置参数（可选，会与节点已有配置合并）
 *     responses:
 *       200:
 *         description: 执行成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                   description: 执行会话ID（SSE模式）
 *                 result:
 *                   type: object
 *                   description: 节点执行结果（同步模式）
 *       500:
 *         description: 执行失败
 */
executionRoutes.post('/workflow/:workflowId/node/:nodeId/execute', async (ctx) => {
  await controller.executeSingleNodeInWorkflow(ctx);
});

/**
 * @swagger
 * /api/executions/workflow/{workflowId}/execute-partial:
 *   post:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 部分执行工作流
 *     description: 从指定节点开始，执行该节点及其后续所有节点，使用当前最新的数据版本。支持SSE流式推送和同步两种模式。
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *       - in: query
 *         name: stream
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否使用SSE流式推送（true=SSE模式，返回sessionId；false=同步模式，返回所有节点结果）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeIds
 *             properties:
 *               nodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 起始节点ID列表
 *               nodeConfigs:
 *                 type: object
 *                 additionalProperties:
 *                   type: object
 *                 description: 节点配置映射（可选，节点ID -> 配置对象）
 *     responses:
 *       200:
 *         description: 执行成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                   description: 执行会话ID（SSE模式）
 *                 results:
 *                   type: object
 *                   description: 所有节点执行结果（同步模式）
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 执行失败
 */
executionRoutes.post('/workflow/:workflowId/execute-partial', async (ctx) => {
  await controller.executePartialWorkflow(ctx);
});

/**
 * @swagger
 * /api/executions/workflow/{workflowId}/node/{nodeId}/data:
 *   get:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 获取节点执行数据
 *     description: 获取指定节点的执行结果数据
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: 节点ID
 *       - in: query
 *         name: version
 *         schema:
 *           type: integer
 *         description: 数据版本号（可选，默认使用最新版本）
 *     responses:
 *       200:
 *         description: 成功返回节点执行数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     outputData:
 *                       type: object
 *                     status:
 *                       type: string
 *                       enum: [PENDING, RUNNING, SUCCESS, FAILED, SKIPPED, CANCELLED]
 *                     executionTime:
 *                       type: integer
 *                     duration:
 *                       type: integer
 *                     error:
 *                       type: string
 *       404:
 *         description: 节点执行数据不存在
 *       500:
 *         description: 查询失败
 */
executionRoutes.get('/workflow/:workflowId/node/:nodeId/data', async (ctx) => {
  await controller.getNodeExecutionData(ctx);
});

/**
 * @swagger
 * /api/executions/session/{sessionId}/stream:
 *   get:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: SSE流式推送执行结果
 *     description: 通过Server-Sent Events实时推送执行会话的状态和节点执行结果
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行会话ID
 *     responses:
 *       200:
 *         description: SSE流式数据
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: |
 *                 SSE事件流，包含以下事件类型：
 *                 - session_start: 会话开始
 *                 - node_status: 节点状态更新
 *                 - node_result: 节点执行结果
 *                 - session_complete: 会话完成（包含所有节点结果）
 *                 - error: 错误信息
 *                 - heartbeat: 心跳消息
 *       404:
 *         description: 执行会话不存在
 *       500:
 *         description: 查询失败
 */
// 注意：更具体的路由必须放在更通用的路由之前
executionRoutes.get('/session/:sessionId/stream', async (ctx) => {
  await controller.streamExecutionSession(ctx);
});

/**
 * @swagger
 * /api/executions/session/{sessionId}:
 *   get:
 *     tags:
 *       - Executions - 执行任务管理
 *     summary: 获取执行会话状态
 *     description: 获取执行会话的详细状态信息
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 执行会话ID
 *     responses:
 *       200:
 *         description: 成功返回执行会话信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 session:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     workflowId:
 *                       type: string
 *                     mode:
 *                       type: string
 *                       enum: [FULL, SINGLE_NODE, PARTIAL]
 *                     dataVersion:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [RUNNING, COMPLETED, FAILED, CANCELLED]
 *                     createdAt:
 *                       type: integer
 *                     completedAt:
 *                       type: integer
 *                     nodeStatuses:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *       404:
 *         description: 执行会话不存在
 *       500:
 *         description: 查询失败
 */
executionRoutes.get('/session/:sessionId', async (ctx) => {
  await controller.getExecutionSession(ctx);
});

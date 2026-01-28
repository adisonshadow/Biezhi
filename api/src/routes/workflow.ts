import Router from 'koa-router';
import { WorkflowController } from '../controllers/WorkflowController';

export const workflowRoutes = new Router();
const controller = new WorkflowController();

/**
 * @swagger
 * /api/workflows:
 *   post:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 创建工作流
 *     description: 创建一个新的工作流，支持通过API直接传入所有配置数据
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *                 description: 工作流ID（可选，不提供则自动生成）
 *               name:
 *                 type: string
 *                 description: 工作流名称
 *               description:
 *                 type: string
 *                 description: 工作流描述
 *               version:
 *                 type: string
 *                 description: 版本号
 *               author:
 *                 type: string
 *                 description: 作者
 *               license:
 *                 type: string
 *                 description: 许可证
 *               category:
 *                 type: string
 *                 description: 分类
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 标签列表
 *               nodes:
 *                 type: array
 *                 description: 节点列表
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 节点ID（可选，不提供则自动生成）
 *                     operatorId:
 *                       type: string
 *                       description: 算子ID
 *                     operatorType:
 *                       type: string
 *                       description: 算子类型（local_python, local_typescript, local_go, local_rust）
 *                     nodeType:
 *                       type: string
 *                       description: 节点类型（processor, output, input）
 *                     config:
 *                       type: object
 *                       description: 节点配置参数
 *                     positionX:
 *                       type: number
 *                       description: UI位置X坐标
 *                     positionY:
 *                       type: number
 *                       description: UI位置Y坐标
 *               connections:
 *                 type: array
 *                 description: 连接关系列表
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 连接ID（可选，不提供则自动生成）
 *                     from:
 *                       type: object
 *                       properties:
 *                         node:
 *                           type: string
 *                           description: 源节点ID
 *                         port:
 *                           type: string
 *                           description: 源端口名称
 *                     to:
 *                       type: object
 *                       properties:
 *                         node:
 *                           type: string
 *                           description: 目标节点ID
 *                         port:
 *                           type: string
 *                           description: 目标端口名称
 *     responses:
 *       201:
 *         description: 创建成功
 *       500:
 *         description: 服务器错误
 */
workflowRoutes.post('/', async (ctx) => {
  await controller.create(ctx);
});

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 获取所有工作流
 *     description: 获取系统中所有工作流列表
 *     responses:
 *       200:
 *         description: 成功返回工作流列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
workflowRoutes.get('/', async (ctx) => {
  await controller.list(ctx);
});

/**
 * @swagger
 * /api/workflows/search:
 *   get:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 搜索工作流
 *     description: 根据关键词搜索工作流
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功返回搜索结果
 */
workflowRoutes.get('/search', async (ctx) => {
  await controller.search(ctx);
});

/**
 * @swagger
 * /api/workflows/{id}:
 *   get:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 获取工作流详情
 *     description: 根据ID获取工作流的详细信息，包括节点和连接关系
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     responses:
 *       200:
 *         description: 成功返回工作流详情
 *       404:
 *         description: 工作流不存在
 */
workflowRoutes.get('/:id', async (ctx) => {
  await controller.getById(ctx);
});

/**
 * @swagger
 * /api/workflows/{id}:
 *   put:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 更新工作流
 *     description: 更新工作流的配置信息
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               nodes:
 *                 type: array
 *               connections:
 *                 type: array
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 工作流不存在
 */
workflowRoutes.put('/:id', async (ctx) => {
  await controller.update(ctx);
});

/**
 * @swagger
 * /api/workflows/{id}:
 *   delete:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 删除工作流
 *     description: 根据ID删除工作流
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 工作流不存在
 */
workflowRoutes.delete('/:id', async (ctx) => {
  await controller.delete(ctx);
});

/**
 * @swagger
 * /api/workflows/{id}/validate:
 *   post:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 验证工作流
 *     description: 验证工作流的完整性，检查节点、连接关系、循环依赖等问题
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     responses:
 *       200:
 *         description: 验证结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isComplete:
 *                   type: boolean
 *                   description: 是否完整
 *                 issues:
 *                   type: array
 *                   description: 问题列表
 *                 warnings:
 *                   type: array
 *                   description: 警告列表
 */
workflowRoutes.post('/:id/validate', async (ctx) => {
  await controller.validate(ctx);
});

/**
 * @swagger
 * /api/workflows/{id}/execution-order:
 *   get:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 获取工作流执行顺序
 *     description: 根据工作流的连接关系计算节点的执行顺序（拓扑排序）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     responses:
 *       200:
 *         description: 成功返回执行顺序
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 executionOrder:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 节点ID的执行顺序
 */
workflowRoutes.get('/:id/execution-order', async (ctx) => {
  await controller.getExecutionOrder(ctx);
});

/**
 * @swagger
 * /api/workflows/{id}/export:
 *   get:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 导出工作流
 *     description: 导出工作流的完整配置（JSON格式）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 工作流ID
 *     responses:
 *       200:
 *         description: 成功返回工作流配置
 *       404:
 *         description: 工作流不存在
 */
workflowRoutes.get('/:id/export', async (ctx) => {
  await controller.export(ctx);
});

/**
 * @swagger
 * /api/workflows/import:
 *   post:
 *     tags:
 *       - Workflows - 工作流管理
 *     summary: 导入工作流
 *     description: 从JSON格式导入工作流配置
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 工作流配置对象（与创建接口相同）
 *     responses:
 *       201:
 *         description: 导入成功
 *       500:
 *         description: 服务器错误
 */
workflowRoutes.post('/import', async (ctx) => {
  await controller.import(ctx);
});

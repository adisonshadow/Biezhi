import Router from 'koa-router';
import { ResourceController } from '../controllers/ResourceController';

export const resourceRoutes = new Router();
const controller = new ResourceController();

/**
 * @swagger
 * /api/resources/upload:
 *   post:
 *     tags:
 *       - Resources - 资源管理
 *     summary: 上传文件
 *     description: 上传文件并返回资源ID，用于在工作流中使用
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要上传的文件
 *               uploader:
 *                 type: string
 *                 description: 上传者（可选）
 *     responses:
 *       200:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: 资源ID
 *                 fileName:
 *                   type: string
 *                   description: 原始文件名
 *                 filePath:
 *                   type: string
 *                   description: 服务器存储路径
 *                 mimeType:
 *                   type: string
 *                   description: MIME类型
 *                 fileSize:
 *                   type: number
 *                   description: 文件大小（字节）
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 上传失败
 */
resourceRoutes.post('/upload', async (ctx) => {
  await controller.upload(ctx);
});

/**
 * @swagger
 * /api/resources:
 *   get:
 *     tags:
 *       - Resources - 资源管理
 *     summary: 获取所有资源列表
 *     description: 获取系统中所有已上传的资源列表
 *     responses:
 *       200:
 *         description: 成功返回资源列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   fileName:
 *                     type: string
 *                   mimeType:
 *                     type: string
 *                   fileSize:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
resourceRoutes.get('/', async (ctx) => {
  await controller.list(ctx);
});

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     tags:
 *       - Resources - 资源管理
 *     summary: 获取资源信息
 *     description: 根据资源ID获取资源详细信息
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源ID
 *     responses:
 *       200:
 *         description: 成功返回资源信息
 *       404:
 *         description: 资源不存在
 */
resourceRoutes.get('/:id', async (ctx) => {
  await controller.getById(ctx);
});

/**
 * @swagger
 * /api/resources/{id}/download:
 *   get:
 *     tags:
 *       - Resources - 资源管理
 *     summary: 下载资源文件
 *     description: 根据资源ID下载文件
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源ID
 *     responses:
 *       200:
 *         description: 文件下载
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 资源不存在
 */
resourceRoutes.get('/:id/download', async (ctx) => {
  await controller.download(ctx);
});

/**
 * @swagger
 * /api/resources/{id}:
 *   delete:
 *     tags:
 *       - Resources - 资源管理
 *     summary: 删除资源
 *     description: 根据资源ID删除资源及其文件
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 资源ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 资源不存在
 */
resourceRoutes.delete('/:id', async (ctx) => {
  await controller.delete(ctx);
});


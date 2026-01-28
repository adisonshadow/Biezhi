import { Context } from 'koa';
import { ResourceService } from '../services/ResourceService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

export class ResourceController {
  private service: ResourceService;
  private multerInstance: multer.Multer;

  constructor() {
    this.service = new ResourceService();
    
    // 配置 multer（内存存储，因为我们需要读取文件内容）
    const storage = multer.memoryStorage();
    this.multerInstance = multer({
      storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    });
  }

  /**
   * 上传文件
   * POST /api/resources/upload
   */
  async upload(ctx: Context) {
    try {
      // 使用 multer 中间件处理文件上传
      const multerMiddleware = this.multerInstance.single('file');
      
      await new Promise<void>((resolve, reject) => {
        multerMiddleware(ctx.req as any, ctx.res as any, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      const file = (ctx.req as any).file as Express.Multer.File | undefined;
      if (!file) {
        ctx.status = 400;
        ctx.body = { error: '文件不能为空' };
        return;
      }

      // 转换为 UploadedFile 接口
      const uploadedFile = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      };

      const uploader = (ctx.request.body as any)?.uploader || undefined;
      const resource = await this.service.uploadFile(uploadedFile, uploader);

      ctx.body = {
        id: resource.id,
        fileName: resource.fileName,
        filePath: resource.filePath,
        mimeType: resource.mimeType,
        fileSize: resource.fileSize,
        createdAt: resource.createdAt,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取资源信息
   * GET /api/resources/:id
   */
  async getById(ctx: Context) {
    try {
      const { id } = ctx.params;
      const resource = await this.service.getResourceById(id);

      if (!resource) {
        ctx.status = 404;
        ctx.body = { error: 'Resource not found' };
        return;
      }

      ctx.body = {
        id: resource.id,
        fileName: resource.fileName,
        mimeType: resource.mimeType,
        fileSize: resource.fileSize,
        createdAt: resource.createdAt,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 下载资源文件
   * GET /api/resources/:id/download
   */
  async download(ctx: Context) {
    try {
      const { id } = ctx.params;
      const resource = await this.service.getResourceById(id);

      if (!resource) {
        ctx.status = 404;
        ctx.body = { error: 'Resource not found' };
        return;
      }

      if (!fs.existsSync(resource.filePath)) {
        ctx.status = 404;
        ctx.body = { error: 'Resource file not found' };
        return;
      }

      ctx.set('Content-Type', resource.mimeType);
      ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.fileName)}"`);
      ctx.body = fs.createReadStream(resource.filePath);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 删除资源
   * DELETE /api/resources/:id
   */
  async delete(ctx: Context) {
    try {
      const { id } = ctx.params;
      await this.service.deleteResource(id);
      ctx.body = { message: 'Resource deleted successfully' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 列出所有资源
   * GET /api/resources
   */
  async list(ctx: Context) {
    try {
      const resources = await this.service.listResources();
      ctx.body = resources.map(resource => ({
        id: resource.id,
        fileName: resource.fileName,
        mimeType: resource.mimeType,
        fileSize: resource.fileSize,
        createdAt: resource.createdAt,
      }));
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
}


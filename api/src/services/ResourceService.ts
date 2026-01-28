import { AppDataSource } from '../../../config/database';
import { Resource } from '../../../package/entities/Resource';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class ResourceService {
  private uploadDir: string;

  constructor() {
    // 设置上传目录（相对于项目根目录）
    const projectRoot = path.resolve(__dirname, '../../../');
    this.uploadDir = path.join(projectRoot, 'uploads');
    
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(file: UploadedFile, uploader?: string): Promise<Resource> {
    if (!file) {
      throw new Error('文件不能为空');
    }

    // 生成唯一文件名
    const fileId = `res_${uuidv4().substring(0, 8)}`;
    const fileExt = path.extname(file.originalname);
    const fileName = `${fileId}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // 保存文件
    fs.writeFileSync(filePath, file.buffer);

    // 创建资源记录
    const resource = new Resource();
    resource.id = fileId;
    resource.fileName = file.originalname;
    resource.filePath = filePath;
    resource.mimeType = file.mimetype || 'application/octet-stream';
    resource.fileSize = file.size;
    resource.uploader = uploader;

    await AppDataSource.getRepository(Resource).save(resource);

    return resource;
  }

  /**
   * 根据ID获取资源
   */
  async getResourceById(id: string): Promise<Resource | null> {
    return await AppDataSource.getRepository(Resource).findOne({
      where: { id },
    });
  }

  /**
   * 获取资源文件路径
   */
  async getResourcePath(id: string): Promise<string> {
    const resource = await this.getResourceById(id);
    if (!resource) {
      throw new Error(`Resource ${id} not found`);
    }

    if (!fs.existsSync(resource.filePath)) {
      throw new Error(`Resource file not found: ${resource.filePath}`);
    }

    return resource.filePath;
  }

  /**
   * 获取资源文件内容
   */
  async getResourceContent(id: string): Promise<Buffer> {
    const filePath = await this.getResourcePath(id);
    return fs.readFileSync(filePath);
  }

  /**
   * 删除资源
   */
  async deleteResource(id: string): Promise<void> {
    const resource = await this.getResourceById(id);
    if (!resource) {
      throw new Error(`Resource ${id} not found`);
    }

    // 删除文件
    if (fs.existsSync(resource.filePath)) {
      fs.unlinkSync(resource.filePath);
    }

    // 删除数据库记录
    await AppDataSource.getRepository(Resource).delete({ id });
  }

  /**
   * 列出所有资源
   */
  async listResources(): Promise<Resource[]> {
    return await AppDataSource.getRepository(Resource).find({
      order: { createdAt: 'DESC' },
    });
  }
}


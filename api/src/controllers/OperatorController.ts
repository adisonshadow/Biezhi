import { Context } from 'koa';
import { AppDataSource } from '../../../config/database';
import { Operator } from '../../../package/entities/Operator';
import { OperatorService } from '../services/OperatorService';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class OperatorController {
  private service: OperatorService;

  constructor() {
    this.service = new OperatorService();
  }

  /**
   * 注册算子
   * POST /api/operators
   * Body: 
   *   方式1: { operatorPath: string, operatorId?: string, useRelativePath?: boolean } - 从文件读取配置
   *   方式2: { id?, name, version, description, author, license, type, category, tags, codePath, entryPoint, operatorType, inputs, outputs, operatorParams, executionConfig, dataVisualization, mockdata, metadata } - 直接传入配置
   */
  async register(ctx: Context) {
    try {
      const body = ctx.request.body as any;
      let config: any;

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');

      // 判断是文件路径方式还是直接配置方式
      if (body.operatorPath) {
        // 方式1: 从文件读取配置
        let actualOperatorPath: string;
        let savedOperatorPath: string;
        const useRelativePath = body.useRelativePath === true;

        if (useRelativePath) {
          // 相对路径：相对于项目根目录
          actualOperatorPath = path.resolve(projectRoot, body.operatorPath);
          savedOperatorPath = body.operatorPath; // 保存相对路径
        } else {
          // 绝对路径
          actualOperatorPath = path.resolve(body.operatorPath);
          savedOperatorPath = actualOperatorPath; // 保存绝对路径
        }

        const yamlPath = path.join(actualOperatorPath, 'operator.yaml');
        if (!fs.existsSync(yamlPath)) {
          ctx.status = 400;
          ctx.body = { error: `operator.yaml not found at ${yamlPath}` };
          return;
        }

        config = yaml.parse(fs.readFileSync(yamlPath, 'utf-8'));
        // 保存operatorPath到metadata中
        if (!config.metadata) {
          config.metadata = {};
        }
        config.metadata.operatorPath = savedOperatorPath;
        config.metadata.isRelativePath = useRelativePath;
      } else {
        // 方式2: 直接传入配置数据
        config = body;
      }

      // 验证必要字段
      const requiredFields = ['name', 'version', 'description', 'author', 'license'];
      for (const field of requiredFields) {
        if (!config[field]) {
          ctx.status = 400;
          ctx.body = { error: `Missing required field: ${field}` };
          return;
        }
      }

      const id = body.operatorId || config.id || `op_${uuidv4().substring(0, 8)}`;

      // 检查ID是否已存在
      const existing = await AppDataSource.getRepository(Operator).findOne({
        where: { id },
      });

      if (existing) {
        ctx.status = 400;
        ctx.body = { error: `Operator with id ${id} already exists` };
        return;
      }

      // 创建算子实体并填充所有字段
      const operator = new Operator();
      operator.id = id;
      operator.name = config.name;
      operator.version = config.version;
      operator.description = config.description;
      operator.author = config.author;
      operator.license = config.license;
      operator.type = config.type || 'unknown';
      operator.category = config.category || '未分类';
      operator.tags = config.tags ? JSON.stringify(config.tags) : null;
      
      // 代码路径配置
      // 检查是否为纯前端可视化算子（有 dataVisualization 但没有 codePath/entryPoint/operatorType）
      const hasDataVisualization = config.dataVisualization || config.data_visualization;
      const hasCodePath = config.codePath || config.code_path;
      const hasEntryPoint = config.entryPoint || config.entry_point;
      const hasOperatorType = config.operatorType || config.operator_type;
      
      if (hasDataVisualization && !hasCodePath && !hasEntryPoint && !hasOperatorType) {
        // 纯前端可视化算子：不设置 codePath、entryPoint、operatorType
        operator.codePath = null;
        operator.entryPoint = null;
        operator.operatorType = null;
      } else {
        // 普通算子：设置代码路径和执行配置
        operator.codePath = config.codePath || config.code_path || 'main.py';
        operator.entryPoint = config.entryPoint || config.entry_point || '';
        operator.operatorType = config.operatorType || config.operator_type || 'local_python';
      }
      
      // 输入输出定义
      operator.inputs = config.inputs ? JSON.stringify(config.inputs) : null;
      operator.outputs = config.outputs ? JSON.stringify(config.outputs) : null;
      
      // 用户配置参数（支持两种命名方式：operatorParams 和 operator_params）
      const operatorParams = config.operatorParams || config.operator_params;
      operator.operatorParams = operatorParams ? JSON.stringify(operatorParams) : null;
      
      // 执行配置
      operator.executionConfig = config.executionConfig || config.execution ? JSON.stringify(config.executionConfig || config.execution) : null;
      
      // 数据可视化配置
      operator.dataVisualization = config.dataVisualization || config.data_visualization ? JSON.stringify(config.dataVisualization || config.data_visualization) : null;
      
      // Mockdata配置
      operator.mockdata = config.mockdata ? JSON.stringify(config.mockdata) : null;
      
      // 元数据（包括operatorPath等）
      operator.metadata = config.metadata ? JSON.stringify(config.metadata) : null;

      await AppDataSource.getRepository(Operator).save(operator);

      ctx.status = 201;
      ctx.body = {
        id: operator.id,
        message: 'Operator registered successfully',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取所有算子
   * GET /api/operators
   */
  async list(ctx: Context) {
    try {
      const operators = await AppDataSource.getRepository(Operator).find({
        order: { createdAt: 'DESC' },
      });

      ctx.body = operators.map(op => this.service.serializeOperator(op));
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 搜索算子
   * GET /api/operators/search?name=xxx&tag=xxx&type=xxx
   */
  async search(ctx: Context) {
    try {
      const { name, tag, type } = ctx.query;
      const results = await this.service.search(name as string, tag as string, type as string);
      ctx.body = results;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取算子详情
   * GET /api/operators/:id
   */
  async getById(ctx: Context) {
    try {
      const { id } = ctx.params;
      const operator = await AppDataSource.getRepository(Operator).findOne({
        where: { id },
      });

      if (!operator) {
        ctx.status = 404;
        ctx.body = { error: 'Operator not found' };
        return;
      }

      ctx.body = this.service.serializeOperator(operator);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 更新算子
   * PUT /api/operators/:id
   */
  async update(ctx: Context) {
    try {
      const { id } = ctx.params;
      const updateData = ctx.request.body as any;

      const operator = await AppDataSource.getRepository(Operator).findOne({
        where: { id },
      });

      if (!operator) {
        ctx.status = 404;
        ctx.body = { error: 'Operator not found' };
        return;
      }

      // 更新字段（支持所有字段的更新）
      if (updateData.name !== undefined) operator.name = updateData.name;
      if (updateData.version !== undefined) operator.version = updateData.version;
      if (updateData.description !== undefined) operator.description = updateData.description;
      if (updateData.author !== undefined) operator.author = updateData.author;
      if (updateData.license !== undefined) operator.license = updateData.license;
      if (updateData.type !== undefined) operator.type = updateData.type;
      if (updateData.category !== undefined) operator.category = updateData.category;
      if (updateData.tags !== undefined) operator.tags = JSON.stringify(updateData.tags);
      
      // 处理纯前端可视化算子的特殊情况
      if (updateData.codePath !== undefined || updateData.entryPoint !== undefined || updateData.operatorType !== undefined) {
        const hasDataVisualization = operator.dataVisualization;
        const hasCodePath = updateData.codePath !== undefined ? updateData.codePath : operator.codePath;
        const hasEntryPoint = updateData.entryPoint !== undefined ? updateData.entryPoint : operator.entryPoint;
        const hasOperatorType = updateData.operatorType !== undefined ? updateData.operatorType : operator.operatorType;
        
        if (hasDataVisualization && !hasCodePath && !hasEntryPoint && !hasOperatorType) {
          // 纯前端可视化算子：设置为 null
          operator.codePath = null;
          operator.entryPoint = null;
          operator.operatorType = null;
        } else {
          // 普通算子：正常更新
          if (updateData.codePath !== undefined) operator.codePath = updateData.codePath;
          if (updateData.entryPoint !== undefined) operator.entryPoint = updateData.entryPoint;
          if (updateData.operatorType !== undefined) operator.operatorType = updateData.operatorType;
        }
      }
      if (updateData.inputs !== undefined) operator.inputs = updateData.inputs ? JSON.stringify(updateData.inputs) : null;
      if (updateData.outputs !== undefined) operator.outputs = updateData.outputs ? JSON.stringify(updateData.outputs) : null;
      // 用户配置参数（支持两种命名方式：operatorParams 和 operator_params）
      if (updateData.operatorParams !== undefined || updateData.operator_params !== undefined) {
        const operatorParams = updateData.operatorParams || updateData.operator_params;
        operator.operatorParams = operatorParams ? JSON.stringify(operatorParams) : null;
      }
      if (updateData.executionConfig !== undefined) operator.executionConfig = updateData.executionConfig ? JSON.stringify(updateData.executionConfig) : null;
      if (updateData.dataVisualization !== undefined) operator.dataVisualization = updateData.dataVisualization ? JSON.stringify(updateData.dataVisualization) : null;
      if (updateData.mockdata !== undefined) operator.mockdata = updateData.mockdata ? JSON.stringify(updateData.mockdata) : null;
      if (updateData.metadata !== undefined) operator.metadata = updateData.metadata ? JSON.stringify(updateData.metadata) : null;

      await AppDataSource.getRepository(Operator).save(operator);

      ctx.body = this.service.serializeOperator(operator);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 删除算子
   * DELETE /api/operators/:id
   */
  async delete(ctx: Context) {
    try {
      const { id } = ctx.params;
      const operator = await AppDataSource.getRepository(Operator).findOne({
        where: { id },
      });

      if (!operator) {
        ctx.status = 404;
        ctx.body = { error: 'Operator not found' };
        return;
      }

      await AppDataSource.getRepository(Operator).remove(operator);

      ctx.status = 200;
      ctx.body = { message: 'Operator deleted successfully' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 重新注册算子
   * POST /api/operators/:id/reregister
   * Body: { operatorPath?: string, useRelativePath?: boolean } - 如果提供 operatorPath，则从文件读取；否则使用算子保存的 operatorPath
   */
  async reregister(ctx: Context) {
    try {
      const { id } = ctx.params;
      const body = ctx.request.body as any;
      let config: any;
      let operatorPath: string;
      let isRelativePath: boolean = false;

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');

      // 查找现有算子
      const existingOperator = await AppDataSource.getRepository(Operator).findOne({
        where: { id },
      });

      if (!existingOperator) {
        ctx.status = 404;
        ctx.body = { error: 'Operator not found' };
        return;
      }

      // 确定 operatorPath
      if (body.operatorPath) {
        // 如果提供了新的路径，使用新路径
        operatorPath = body.operatorPath;
        isRelativePath = body.useRelativePath === true;
      } else {
        // 从现有算子的 metadata 中获取 operatorPath
        const metadata = existingOperator.metadata ? JSON.parse(existingOperator.metadata) : {};
        operatorPath = metadata.operatorPath;
        isRelativePath = metadata.isRelativePath === true;
        
        if (!operatorPath) {
          ctx.status = 400;
          ctx.body = { error: 'Operator path not found. Please provide operatorPath in request body.' };
          return;
        }
      }

      // 根据是否为相对路径，确定实际的文件路径
      let actualOperatorPath: string;
      let savedOperatorPath: string;
      
      if (isRelativePath) {
        // 相对路径：相对于项目根目录
        actualOperatorPath = path.resolve(projectRoot, operatorPath);
        savedOperatorPath = operatorPath; // 保存相对路径
      } else {
        // 绝对路径
        actualOperatorPath = path.resolve(operatorPath);
        savedOperatorPath = actualOperatorPath; // 保存绝对路径
      }

      // 从文件读取配置
      const yamlPath = path.join(actualOperatorPath, 'operator.yaml');
      if (!fs.existsSync(yamlPath)) {
        ctx.status = 400;
        ctx.body = { error: `operator.yaml not found at ${yamlPath}` };
        return;
      }

      config = yaml.parse(fs.readFileSync(yamlPath, 'utf-8'));
      
      // 保存operatorPath到metadata中
      if (!config.metadata) {
        config.metadata = {};
      }
      config.metadata.operatorPath = savedOperatorPath;
      config.metadata.isRelativePath = isRelativePath;

      // 验证必要字段
      const requiredFields = ['name', 'version', 'description', 'author', 'license'];
      for (const field of requiredFields) {
        if (!config[field]) {
          ctx.status = 400;
          ctx.body = { error: `Missing required field: ${field}` };
          return;
        }
      }

      // 更新算子实体
      existingOperator.name = config.name;
      existingOperator.version = config.version;
      existingOperator.description = config.description;
      existingOperator.author = config.author;
      existingOperator.license = config.license;
      existingOperator.type = config.type || 'unknown';
      existingOperator.category = config.category || '未分类';
      existingOperator.tags = config.tags ? JSON.stringify(config.tags) : null;
      
      // 代码路径配置
      // 检查是否为纯前端可视化算子（有 dataVisualization 但没有 codePath/entryPoint/operatorType）
      const hasDataVisualization = config.dataVisualization || config.data_visualization;
      const hasCodePath = config.codePath || config.code_path;
      const hasEntryPoint = config.entryPoint || config.entry_point;
      const hasOperatorType = config.operatorType || config.operator_type;
      
      if (hasDataVisualization && !hasCodePath && !hasEntryPoint && !hasOperatorType) {
        // 纯前端可视化算子：不设置 codePath、entryPoint、operatorType
        existingOperator.codePath = null;
        existingOperator.entryPoint = null;
        existingOperator.operatorType = null;
      } else {
        // 普通算子：设置代码路径和执行配置
        existingOperator.codePath = config.codePath || config.code_path || 'main.py';
        existingOperator.entryPoint = config.entryPoint || config.entry_point || '';
        existingOperator.operatorType = config.operatorType || config.operator_type || 'local_python';
      }
      
      // 输入输出定义
      existingOperator.inputs = config.inputs ? JSON.stringify(config.inputs) : null;
      existingOperator.outputs = config.outputs ? JSON.stringify(config.outputs) : null;
      
      // 用户配置参数（支持两种命名方式：operatorParams 和 operator_params）
      const operatorParams = config.operatorParams || config.operator_params;
      existingOperator.operatorParams = operatorParams ? JSON.stringify(operatorParams) : null;
      
      // 执行配置
      existingOperator.executionConfig = config.executionConfig || config.execution ? JSON.stringify(config.executionConfig || config.execution) : null;
      
      // 数据可视化配置
      existingOperator.dataVisualization = config.dataVisualization || config.data_visualization ? JSON.stringify(config.dataVisualization || config.data_visualization) : null;
      
      // Mockdata配置
      existingOperator.mockdata = config.mockdata ? JSON.stringify(config.mockdata) : null;
      
      // 元数据（包括operatorPath等）
      existingOperator.metadata = config.metadata ? JSON.stringify(config.metadata) : null;

      await AppDataSource.getRepository(Operator).save(existingOperator);

      ctx.status = 200;
      ctx.body = {
        id: existingOperator.id,
        message: 'Operator reregistered successfully',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 获取统计信息
   * GET /api/operators/stats/summary
   */
  async getStats(ctx: Context) {
    try {
      const stats = await this.service.getStats();
      ctx.body = stats;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 创建算子
   * POST /api/operators/create
   * Body: { operatorYaml: string } - operator.yaml 文件内容（必需包含 file_structure 信息块）
   * 注意：此接口只创建 operator.yaml 文件，不自动注册算子
   */
  async create(ctx: Context) {
    try {
      const body = ctx.request.body as any;
      
      // 验证请求参数
      if (!body.operatorYaml || typeof body.operatorYaml !== 'string') {
        ctx.status = 400;
        ctx.body = { error: 'operatorYaml 参数是必需的，且必须是字符串' };
        return;
      }

      // 解析并验证 YAML 内容
      let config: any;
      try {
        config = yaml.parse(body.operatorYaml);
      } catch (error: any) {
        ctx.status = 400;
        ctx.body = { error: `operator.yaml 格式错误: ${error.message}` };
        return;
      }

      // 验证必需字段
      const requiredFields = ['name', 'version', 'description', 'author', 'license'];
      for (const field of requiredFields) {
        if (!config[field]) {
          ctx.status = 400;
          ctx.body = { error: `operator.yaml 缺少必需字段: ${field}` };
          return;
        }
      }

      // 验证 file_structure 信息块是否存在
      if (!config.file_structure || typeof config.file_structure !== 'object') {
        ctx.status = 400;
        ctx.body = { error: 'operator.yaml 必须包含 file_structure 信息块，用于描述算子目录下各文件的作用' };
        return;
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
      fs.writeFileSync(yamlPath, body.operatorYaml, 'utf-8');
      fs.chmodSync(yamlPath, 0o644);

      // 计算相对路径（相对于项目根目录）
      const relativePath = path.relative(projectRoot, operatorDir);

      ctx.status = 201;
      ctx.body = {
        operatorPath: relativePath,
        message: 'Operator directory created successfully. Please add files using /api/operators/file/add endpoints.',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 添加算子文件
   * POST /api/operators/file/add/:filename
   * Body: { content: string, operatorPath: string, path?: string }
   */
  async addFile(ctx: Context) {
    try {
      const filename = ctx.params.filename;
      const body = ctx.request.body as any;
      const filePath = body.path || ''; // 从请求体获取路径参数

      if (!body.content || typeof body.content !== 'string') {
        ctx.status = 400;
        ctx.body = { error: 'content 参数是必需的，且必须是字符串' };
        return;
      }

      if (!body.operatorPath || typeof body.operatorPath !== 'string') {
        ctx.status = 400;
        ctx.body = { error: 'operatorPath 参数是必需的，且必须是字符串（相对于项目根目录的路径）' };
        return;
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!body.operatorPath.startsWith('Custom_operators/')) {
        ctx.status = 400;
        ctx.body = { error: '只能编辑 Custom_operators 目录下的算子' };
        return;
      }

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const operatorDir = path.join(projectRoot, body.operatorPath);

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        ctx.status = 404;
        ctx.body = { error: `算子目录不存在: ${body.operatorPath}` };
        return;
      }

      // 构建完整文件路径
      const fullPath = filePath ? path.join(operatorDir, filePath, filename) : path.join(operatorDir, filename);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      if (!fullPath.startsWith(operatorDir)) {
        ctx.status = 400;
        ctx.body = { error: '无效的文件路径' };
        return;
      }

      // 确保文件所在目录存在
      const fileDir = path.dirname(fullPath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // 如果文件已存在，返回错误
      if (fs.existsSync(fullPath)) {
        ctx.status = 400;
        ctx.body = { error: `文件已存在: ${filename}` };
        return;
      }

      // 写入文件内容
      fs.writeFileSync(fullPath, body.content, 'utf-8');
      fs.chmodSync(fullPath, 0o644);

      ctx.status = 201;
      ctx.body = {
        message: 'File added successfully',
        filePath: path.relative(operatorDir, fullPath),
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 编辑算子文件
   * PUT /api/operators/file/edit/:filename
   * Body: { content: string, operatorPath: string, path?: string }
   */
  async editFile(ctx: Context) {
    try {
      const filename = ctx.params.filename;
      const body = ctx.request.body as any;
      const filePath = body.path || ''; // 从请求体获取路径参数

      if (!body.content || typeof body.content !== 'string') {
        ctx.status = 400;
        ctx.body = { error: 'content 参数是必需的，且必须是字符串' };
        return;
      }

      if (!body.operatorPath || typeof body.operatorPath !== 'string') {
        ctx.status = 400;
        ctx.body = { error: 'operatorPath 参数是必需的，且必须是字符串（相对于项目根目录的路径）' };
        return;
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!body.operatorPath.startsWith('Custom_operators/')) {
        ctx.status = 400;
        ctx.body = { error: '只能编辑 Custom_operators 目录下的算子' };
        return;
      }

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const operatorDir = path.join(projectRoot, body.operatorPath);

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        ctx.status = 404;
        ctx.body = { error: `算子目录不存在: ${body.operatorPath}` };
        return;
      }

      // 构建完整文件路径
      const fullPath = filePath ? path.join(operatorDir, filePath, filename) : path.join(operatorDir, filename);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      if (!fullPath.startsWith(operatorDir)) {
        ctx.status = 400;
        ctx.body = { error: '无效的文件路径' };
        return;
      }

      // 如果文件不存在，返回错误
      if (!fs.existsSync(fullPath)) {
        ctx.status = 404;
        ctx.body = { error: `文件不存在: ${filename}` };
        return;
      }

      // 写入文件内容
      fs.writeFileSync(fullPath, body.content, 'utf-8');
      fs.chmodSync(fullPath, 0o644);

      ctx.status = 200;
      ctx.body = {
        message: 'File updated successfully',
        filePath: path.relative(operatorDir, fullPath),
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 删除算子文件
   * DELETE /api/operators/file/delete/:filename
   * Body: { operatorPath: string, path?: string }
   */
  async deleteFile(ctx: Context) {
    try {
      const filename = ctx.params.filename;
      const body = ctx.request.body as any;
      const filePath = body.path || ''; // 从请求体获取路径参数

      if (!body.operatorPath || typeof body.operatorPath !== 'string') {
        ctx.status = 400;
        ctx.body = { error: 'operatorPath 参数是必需的，且必须是字符串（相对于项目根目录的路径）' };
        return;
      }

      // 验证 operatorPath 必须在 Custom_operators 目录下
      if (!body.operatorPath.startsWith('Custom_operators/')) {
        ctx.status = 400;
        ctx.body = { error: '只能删除 Custom_operators 目录下的算子文件' };
        return;
      }

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      const operatorDir = path.join(projectRoot, body.operatorPath);

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        ctx.status = 404;
        ctx.body = { error: `算子目录不存在: ${body.operatorPath}` };
        return;
      }

      // 构建完整文件路径
      const fullPath = filePath ? path.join(operatorDir, filePath, filename) : path.join(operatorDir, filename);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      if (!fullPath.startsWith(operatorDir)) {
        ctx.status = 400;
        ctx.body = { error: '无效的文件路径' };
        return;
      }

      // 如果文件不存在，返回错误
      if (!fs.existsSync(fullPath)) {
        ctx.status = 404;
        ctx.body = { error: `文件不存在: ${filename}` };
        return;
      }

      // 不允许删除 operator.yaml 文件
      if (filename === 'operator.yaml' && !filePath) {
        ctx.status = 400;
        ctx.body = { error: '不能删除 operator.yaml 文件，请使用 edit 接口修改' };
        return;
      }

      // 删除文件
      fs.unlinkSync(fullPath);

      ctx.status = 200;
      ctx.body = {
        message: 'File deleted successfully',
        filePath: path.relative(operatorDir, fullPath),
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }

  /**
   * 读取算子文件
   * GET /api/operators/:id/file?path=xxx
   * 用于读取算子目录中的文件内容（如预览文件、可视化文件等）
   */
  async getFile(ctx: Context) {
    try {
      const operatorId = ctx.params.id;
      const filePath = ctx.query.path as string;

      if (!filePath) {
        ctx.status = 400;
        ctx.body = { error: 'path 参数是必需的' };
        return;
      }

      // 获取算子信息
      const operator = await this.service.getOperatorById(operatorId);
      if (!operator) {
        ctx.status = 404;
        ctx.body = { error: '算子不存在' };
        return;
      }

      // 获取算子路径
      const metadata = operator.metadata ? JSON.parse(operator.metadata) : {};
      const operatorPath = metadata.operatorPath;

      if (!operatorPath) {
        ctx.status = 400;
        ctx.body = { error: '无法获取算子路径' };
        return;
      }

      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../../');
      
      // 处理相对路径和绝对路径
      let operatorDir: string;
      const isRelativePath = metadata.isRelativePath === true;
      
      if (isRelativePath) {
        // 相对路径：相对于项目根目录
        operatorDir = path.resolve(projectRoot, operatorPath);
      } else {
        // 绝对路径：直接使用
        operatorDir = path.resolve(operatorPath);
      }

      // 验证算子目录存在
      if (!fs.existsSync(operatorDir)) {
        ctx.status = 404;
        ctx.body = { 
          error: `算子目录不存在: ${operatorPath}`,
          details: {
            operatorPath,
            isRelativePath,
            resolvedPath: operatorDir,
            projectRoot
          }
        };
        return;
      }

      // 构建完整文件路径
      const fullPath = path.join(operatorDir, filePath);
      
      // 验证文件路径在算子目录内（防止路径遍历攻击）
      const normalizedFullPath = path.normalize(fullPath);
      const normalizedOperatorDir = path.normalize(operatorDir);
      if (!normalizedFullPath.startsWith(normalizedOperatorDir)) {
        ctx.status = 400;
        ctx.body = { error: '无效的文件路径' };
        return;
      }

      // 如果文件不存在，返回错误
      if (!fs.existsSync(fullPath)) {
        ctx.status = 404;
        ctx.body = { error: `文件不存在: ${filePath}` };
        return;
      }

      // 检查是否是文件（不是目录）
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        ctx.status = 400;
        ctx.body = { error: '路径指向的不是文件' };
        return;
      }

      // 读取文件内容
      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const fileExt = path.extname(fullPath).toLowerCase();

      // 根据文件类型设置 Content-Type
      let contentType = 'text/plain';
      if (fileExt === '.html' || fileExt === '.htm') {
        contentType = 'text/html';
      } else if (fileExt === '.js' || fileExt === '.jsx') {
        contentType = 'application/javascript';
      } else if (fileExt === '.ts' || fileExt === '.tsx') {
        contentType = 'application/typescript';
      } else if (fileExt === '.json') {
        contentType = 'application/json';
      } else if (fileExt === '.png') {
        contentType = 'image/png';
      } else if (fileExt === '.jpg' || fileExt === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExt === '.svg') {
        contentType = 'image/svg+xml';
      } else if (fileExt === '.gif') {
        contentType = 'image/gif';
      }

      ctx.set('Content-Type', contentType);
      ctx.body = fileContent;
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  }
}


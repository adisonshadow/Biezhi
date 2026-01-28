import 'reflect-metadata';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import json from 'koa-json';
import { koaSwagger } from 'koa2-swagger-ui';
import swaggerJsdoc from 'swagger-jsdoc';
import { initializeDatabase } from '../../config/database';
import { operatorRoutes } from './routes/operator';
import { workflowRoutes } from './routes/workflow';
import { executionRoutes } from './routes/execution';
import { resourceRoutes } from './routes/resource';
import { functionRoutes } from './routes/function';
import { registerFunctions } from './functions';

const app = new Koa();
const router = new Router();

// Swagger 配置
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Biezhi API 文档',
    version: '2.0.0',
    description: 'AI数据计算、分析与报告平台 API 接口文档',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3991}`,
      description: '本地开发环境',
    },
  ],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: '错误信息',
          },
        },
      },
      Operator: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '算子ID' },
          name: { type: 'string', description: '算子名称' },
          version: { type: 'string', description: '版本号' },
          description: { type: 'string', description: '算子描述' },
          author: { type: 'string', description: '作者' },
          license: { type: 'string', description: '许可证' },
          type: { type: 'string', description: '算子类型' },
          category: { type: 'string', description: '分类' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          codePath: { type: 'string', description: '代码文件路径' },
          entryPoint: { type: 'string', description: '入口类名或函数名' },
          operatorType: { type: 'string', description: '算子类型（local_python, local_typescript, local_go, local_rust）' },
          inputs: { type: 'array', description: '输入数据定义' },
          outputs: { type: 'array', description: '输出数据定义' },
          operatorParams: { type: 'object', description: '用户配置参数' },
          executionConfig: { type: 'object', description: '执行配置' },
          dataVisualization: { type: 'object', description: '数据可视化配置' },
          mockdata: { type: 'object', description: 'Mockdata配置' },
          metadata: { type: 'object', description: '元数据' },
          createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
          updatedAt: { type: 'string', format: 'date-time', description: '更新时间' },
        },
      },
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '工作流ID' },
          name: { type: 'string', description: '工作流名称' },
          description: { type: 'string', description: '工作流描述' },
          version: { type: 'string', description: '版本号' },
          author: { type: 'string', description: '作者' },
          license: { type: 'string', description: '许可证' },
          category: { type: 'string', description: '分类' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          nodes: { type: 'array', items: { $ref: '#/components/schemas/WorkflowNode' }, description: '节点列表' },
          connections: { type: 'array', items: { $ref: '#/components/schemas/WorkflowConnection' }, description: '连接关系列表' },
          createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
          updatedAt: { type: 'string', format: 'date-time', description: '更新时间' },
        },
      },
      WorkflowNode: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '节点ID' },
          workflowId: { type: 'string', description: '工作流ID' },
          operatorId: { type: 'string', description: '算子ID' },
          operatorType: { type: 'string', description: '算子类型' },
          nodeType: { type: 'string', description: '节点类型（processor, output, input）' },
          config: { type: 'object', description: '节点配置参数' },
          positionX: { type: 'number', description: 'UI位置X坐标' },
          positionY: { type: 'number', description: 'UI位置Y坐标' },
          createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
          updatedAt: { type: 'string', format: 'date-time', description: '更新时间' },
        },
      },
      WorkflowConnection: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '连接ID' },
          workflowId: { type: 'string', description: '工作流ID' },
          fromNodeId: { type: 'string', description: '源节点ID' },
          fromPort: { type: 'string', description: '源端口名称' },
          toNodeId: { type: 'string', description: '目标节点ID' },
          toPort: { type: 'string', description: '目标端口名称' },
          createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
          updatedAt: { type: 'string', format: 'date-time', description: '更新时间' },
        },
      },
      WorkflowExecution: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '执行任务ID' },
          workflowId: { type: 'string', description: '工作流ID' },
          status: { 
            type: 'string', 
            enum: ['pending', 'running', 'success', 'failed', 'cancelled'],
            description: '执行状态' 
          },
          inputData: { type: 'object', description: '输入数据' },
          outputData: { type: 'object', description: '输出数据' },
          errorMessage: { type: 'string', description: '错误信息' },
          duration: { type: 'number', description: '执行时长（毫秒）' },
          startedAt: { type: 'string', format: 'date-time', description: '开始时间' },
          completedAt: { type: 'string', format: 'date-time', description: '完成时间' },
          createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
          updatedAt: { type: 'string', format: 'date-time', description: '更新时间' },
        },
      },
      WorkflowExecutionLog: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '日志ID' },
          executionId: { type: 'string', description: '执行任务ID' },
          nodeId: { type: 'string', description: '节点ID' },
          level: { 
            type: 'string', 
            enum: ['info', 'warn', 'error', 'debug'],
            description: '日志级别' 
          },
          message: { type: 'string', description: '日志消息' },
          data: { type: 'object', description: '附加数据' },
          createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [__dirname + '/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

// 添加 Swagger JSON 路由
app.use(async (ctx, next) => {
  if (ctx.path === '/api/swagger.json') {
    ctx.type = 'application/json';
    ctx.body = swaggerSpec;
    return;
  }
  await next();
});

// 配置 Swagger UI
app.use(
  koaSwagger({
    routePrefix: '/api/swagger',
    swaggerOptions: {
      spec: swaggerSpec,
      customCss: '.swagger-ui .topbar { display: none }',
    },
  })
);

// 中间件
app.use(cors());
// 配置 bodyParser，跳过 multipart/form-data 和 SSE 类型的请求
app.use(async (ctx, next) => {
  // 如果是 multipart/form-data，跳过 bodyParser，让 multer 处理
  if (ctx.is('multipart/form-data')) {
    await next();
  } 
  // 如果是 SSE 流，跳过 bodyParser 和 json 中间件
  else if (ctx.path.endsWith('/stream') && ctx.method === 'GET') {
    await next();
  } else {
    await bodyParser()(ctx, next);
  }
});
// json 中间件，跳过 SSE 流
app.use(async (ctx, next) => {
  if (ctx.path.endsWith('/stream') && ctx.method === 'GET') {
    await next();
  } else {
    await json()(ctx, next);
  }
});

// 路由
router.use('/api/operators', operatorRoutes.routes());
router.use('/api/workflows', workflowRoutes.routes());
router.use('/api/executions', executionRoutes.routes());
router.use('/api/resources', resourceRoutes.routes());
router.use('/api/ai/functions', functionRoutes.routes());

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3991;

async function start() {
  try {
    await initializeDatabase();
    
    // 注册Functions
    registerFunctions();
    
    app.listen(PORT, () => {
      console.log(`API服务运行在 http://localhost:${PORT}`);
      console.log(`Swagger UI: http://localhost:${PORT}/api/swagger`);
      console.log(`Swagger JSON: http://localhost:${PORT}/api/swagger.json`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

start();


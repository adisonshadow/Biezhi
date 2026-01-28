import Router from 'koa-router';
import { OperatorController } from '../controllers/OperatorController';

export const operatorRoutes = new Router();
const controller = new OperatorController();

/**
 * @swagger
 * /api/operators:
 *   post:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 注册算子
 *     description: |
 *       支持两种注册方式：
 *       1. 从文件读取：提供 operatorPath，系统会读取 operator.yaml 文件
 *       2. 直接配置：直接传入完整的算子配置数据
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 description: 方式1 - 从文件读取
 *                 required:
 *                   - operatorPath
 *                 properties:
 *                   operatorPath:
 *                     type: string
 *                     description: 算子目录路径（绝对路径或相对路径）
 *                     example: "/path/to/operator"
 *                   operatorId:
 *                     type: string
 *                     description: 算子ID（可选，不提供则自动生成）
 *                     example: "op_12345"
 *                   useRelativePath:
 *                     type: boolean
 *                     description: 是否使用相对路径（默认false，表示绝对路径）。如果为true，operatorPath应为相对于项目根目录的路径
 *                     example: false
 *                 example:
 *                   operatorPath: "/Users/yanfang/dev/operators/my_operator"
 *                   operatorId: "op_12345"
 *                   useRelativePath: false
 *               - type: object
 *                 description: 方式2 - 直接配置
 *                 required:
 *                   - name
 *                   - version
 *                   - description
 *                   - author
 *                   - license
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: 算子ID（可选，不提供则自动生成）
 *                     example: "op_12345"
 *                   name:
 *                     type: string
 *                     description: 算子名称
 *                     example: "data_filter"
 *                   version:
 *                     type: string
 *                     description: 版本号
 *                     example: "1.0.0"
 *                   description:
 *                     type: string
 *                     description: 算子描述
 *                     example: "数据过滤算子，用于过滤DataFrame数据"
 *                   author:
 *                     type: string
 *                     description: 作者
 *                     example: "Your Name"
 *                   license:
 *                     type: string
 *                     description: 许可证
 *                     example: "MIT"
 *                   type:
 *                     type: string
 *                     description: 算子类型
 *                     enum: [data_collector, data_processing, data_analysis, data_visualtion, ai_config, read_from_api, database, file, network, utility, data_align, webhook, condition, schedule]
 *                     example: "data_processing"
 *                   category:
 *                     type: string
 *                     description: 分类
 *                     example: "数据处理"
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: 标签列表
 *                     example: ["filter", "dataframe", "pandas"]
 *                   codePath:
 *                     type: string
 *                     description: 代码文件路径
 *                     example: "main.py"
 *                   entryPoint:
 *                     type: string
 *                     description: 入口类名或函数名
 *                     example: "DataFilterOperator"
 *                   operatorType:
 *                     type: string
 *                     description: 算子类型（local_python, local_typescript, local_go, local_rust）
 *                     enum: [local_python, local_typescript, local_go, local_rust]
 *                     example: "local_python"
 *                   inputs:
 *                     type: array
 *                     description: 输入数据定义
 *                     items:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "dataframe"
 *                         type:
 *                           type: string
 *                           example: "pandas.DataFrame"
 *                         required:
 *                           type: boolean
 *                           example: true
 *                         description:
 *                           type: string
 *                           example: "输入数据"
 *                     example:
 *                       - name: "dataframe"
 *                         type: "pandas.DataFrame"
 *                         required: true
 *                         description: "输入数据"
 *                   outputs:
 *                     type: array
 *                     description: 输出数据定义
 *                     items:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "result"
 *                         type:
 *                           type: string
 *                           example: "pandas.DataFrame"
 *                         description:
 *                           type: string
 *                           example: "过滤后的数据"
 *                     example:
 *                       - name: "result"
 *                         type: "pandas.DataFrame"
 *                         description: "过滤后的数据"
 *                   operatorParams:
 *                     type: object
 *                     description: 用户配置参数
 *                     additionalProperties: true
 *                     example:
 *                       - name: "filter_column"
 *                         label: "过滤列名"
 *                         type: "string"
 *                         required: true
 *                         description: "要过滤的列名"
 *                       - name: "filter_value"
 *                         label: "过滤值"
 *                         type: "string"
 *                         required: true
 *                         description: "过滤条件值"
 *                   executionConfig:
 *                     type: object
 *                     description: 执行配置
 *                     properties:
 *                       timeout:
 *                         type: number
 *                         example: 300
 *                       max_memory:
 *                         type: string
 *                         example: "1GB"
 *                       max_cpu:
 *                         type: number
 *                         example: 2
 *                     example:
 *                       timeout: 300
 *                       max_memory: "1GB"
 *                       max_cpu: 2
 *                   dataVisualization:
 *                     type: object
 *                     description: 数据可视化配置
 *                     properties:
 *                       entry_file:
 *                         type: string
 *                         example: "./preview/main.tsx"
 *                       use_babel:
 *                         type: boolean
 *                         example: true
 *                       always_expand:
 *                         type: boolean
 *                         example: true
 *                       icon:
 *                         type: string
 *                         example: "line-chart"
 *                       color:
 *                         type: string
 *                         example: "#52c41a"
 *                     example:
 *                       entry_file: "./preview/main.tsx"
 *                       use_babel: true
 *                       always_expand: true
 *                       icon: "line-chart"
 *                       color: "#52c41a"
 *                   mockdata:
 *                     type: object
 *                     description: Mockdata配置
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [json, file, remote_json, mock_shell]
 *                         example: "json"
 *                       path:
 *                         type: string
 *                         example: "./test_data.json"
 *                       path_type:
 *                         type: string
 *                         enum: [relative, absolute]
 *                         example: "relative"
 *                     example:
 *                       type: "json"
 *                       path_type: "relative"
 *                       path: "./test_data.json"
 *                   metadata:
 *                     type: object
 *                     description: 元数据
 *                     additionalProperties: true
 *                     example:
 *                       operatorPath: "/path/to/operator"
 *                       customField: "customValue"
 *                 example:
 *                   name: "data_filter"
 *                   version: "1.0.0"
 *                   description: "数据过滤算子，用于过滤DataFrame数据"
 *                   author: "Your Name"
 *                   license: "MIT"
 *                   type: "data_processing"
 *                   category: "数据处理"
 *                   tags: ["filter", "dataframe", "pandas"]
 *                   codePath: "main.py"
 *                   entryPoint: "DataFilterOperator"
 *                   operatorType: "local_python"
 *                   inputs:
 *                     - name: "dataframe"
 *                       type: "pandas.DataFrame"
 *                       required: true
 *                       description: "输入数据"
 *                   outputs:
 *                     - name: "result"
 *                       type: "pandas.DataFrame"
 *                       description: "过滤后的数据"
 *                   operatorParams:
 *                     - name: "filter_column"
 *                       label: "过滤列名"
 *                       type: "string"
 *                       required: true
 *                       description: "要过滤的列名"
 *                     - name: "filter_value"
 *                       label: "过滤值"
 *                       type: "string"
 *                       required: true
 *                       description: "过滤条件值"
 *                   executionConfig:
 *                     timeout: 300
 *                     max_memory: "1GB"
 *                     max_cpu: 2
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "op_12345"
 *                 message:
 *                   type: string
 *                   example: "Operator registered successfully"
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.post('/', async (ctx) => {
  await controller.register(ctx);
});

/**
 * @swagger
 * /api/operators:
 *   get:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 获取所有算子
 *     description: 获取系统中所有已注册的算子列表
 *     responses:
 *       200:
 *         description: 成功返回算子列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   version:
 *                     type: string
 *                   description:
 *                     type: string
 *                   type:
 *                     type: string
 *                   category:
 *                     type: string
 */
operatorRoutes.get('/', async (ctx) => {
  await controller.list(ctx);
});

/**
 * @swagger
 * /api/operators/search:
 *   get:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 搜索算子
 *     description: 根据名称、标签或类型搜索算子
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 算子名称（模糊匹配）
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: 标签
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 算子类型
 *     responses:
 *       200:
 *         description: 成功返回搜索结果
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
operatorRoutes.get('/search', async (ctx) => {
  await controller.search(ctx);
});

/**
 * @swagger
 * /api/operators/{id}:
 *   get:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 获取算子详情
 *     description: 根据ID获取算子的详细信息
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 算子ID
 *     responses:
 *       200:
 *         description: 成功返回算子详情
 *       404:
 *         description: 算子不存在
 */
operatorRoutes.get('/:id', async (ctx) => {
  await controller.getById(ctx);
});

/**
 * @swagger
 * /api/operators/{id}:
 *   put:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 更新算子
 *     description: 更新算子的配置信息
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 算子ID
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
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 算子不存在
 */
operatorRoutes.put('/:id', async (ctx) => {
  await controller.update(ctx);
});

/**
 * @swagger
 * /api/operators/{id}:
 *   delete:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 删除算子
 *     description: 根据ID删除算子
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 算子ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 算子不存在
 */
operatorRoutes.delete('/:id', async (ctx) => {
  await controller.delete(ctx);
});

/**
 * @swagger
 * /api/operators/{id}/reregister:
 *   post:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 重新注册算子
 *     description: 从文件路径重新读取配置并更新算子信息
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 算子ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operatorPath:
 *                 type: string
 *                 description: 算子目录路径（可选，如果不提供则使用算子保存的路径）
 *                 example: "/path/to/operator"
 *               useRelativePath:
 *                 type: boolean
 *                 description: 是否使用相对路径（默认false，表示绝对路径）。如果为true，operatorPath应为相对于项目根目录的路径
 *                 example: false
 *     responses:
 *       200:
 *         description: 重新注册成功
 *       400:
 *         description: 请求参数错误或文件不存在
 *       404:
 *         description: 算子不存在
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.post('/:id/reregister', async (ctx) => {
  await controller.reregister(ctx);
});

/**
 * @swagger
 * /api/operators/stats/summary:
 *   get:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 获取算子统计信息
 *     description: 获取算子的统计信息，包括总数、按类型分组、按分类分组等
 *     responses:
 *       200:
 *         description: 成功返回统计信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 byType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       count:
 *                         type: number
 *                 byCategory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: number
 */
operatorRoutes.get('/stats/summary', async (ctx) => {
  await controller.getStats(ctx);
});

/**
 * @swagger
 * /api/operators/create:
 *   post:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 创建算子
 *     description: |
 *       创建新的算子目录和 operator.yaml 文件。注意：此接口只创建 operator.yaml 文件，不自动注册算子。
 *       使用步骤：
 *       1. 调用此接口创建 operator.yaml 文件
 *       2. 使用 /api/operators/file/add 接口添加其他文件（如 main.py, requirements.txt 等）
 *       3. 当所有文件创建完成后，使用 /api/operators 接口注册算子
 *       
 *       operator.yaml 必须包含 file_structure 信息块，用于描述算子目录下各文件的作用，帮助AI快速理解这个算子。
 *       示例：
 *       ```yaml
 *       file_structure:
 *         "main.py": "算子的主要代码文件，包含算子的核心逻辑"
 *         "requirements.txt": "Python依赖包列表"
 *         "test_data.json": "测试数据文件"
 *         "preview/main.tsx": "数据可视化前端组件入口文件"
 *       ```
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operatorYaml
 *             properties:
 *               operatorYaml:
 *                 type: string
 *                 description: operator.yaml 文件的完整内容（必须是有效的YAML格式，且必须包含 file_structure 信息块）
 *                 example: |
 *                   name: "my_operator"
 *                   version: "1.0.0"
 *                   description: "我的算子"
 *                   author: "Your Name"
 *                   license: "MIT"
 *                   type: "data_processing"
 *                   category: "数据处理"
 *                   file_structure:
 *                     "main.py": "算子的主要代码文件，包含算子的核心逻辑"
 *                     "requirements.txt": "Python依赖包列表"
 *     responses:
 *       201:
 *         description: 算子目录创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operatorPath:
 *                   type: string
 *                   description: 算子相对路径（相对于项目根目录）
 *                   example: "Custom_operators/550e8400-e29b-41d4-a716-446655440000"
 *                 message:
 *                   type: string
 *                   example: "Operator directory created successfully. Please add files using /api/operators/file/add endpoints."
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "operatorYaml 参数是必需的，且必须是字符串"
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.post('/create', async (ctx) => {
  await controller.create(ctx);
});

/**
 * @swagger
 * /api/operators/file/add/{filename}:
 *   post:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 添加算子文件
 *     description: |
 *       为算子目录添加新文件。注意：只能编辑 Custom_operators 目录下的算子。
 *       path 参数以算子目录为 root，例如：path/preview/main.tsx 表示在算子目录下的 preview/main.tsx
 *       如果文件已存在，将返回错误。
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件名（如 main.py, requirements.txt）
 *         example: "main.py"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - operatorPath
 *             properties:
 *               content:
 *                 type: string
 *                 description: 文件内容
 *                 example: "print('Hello World')"
 *               operatorPath:
 *                 type: string
 *                 description: 算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）
 *                 example: "Custom_operators/550e8400-e29b-41d4-a716-446655440000"
 *               path:
 *                 type: string
 *                 description: 文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.py）
 *                 example: "preview"
 *     responses:
 *       201:
 *         description: 文件添加成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File added successfully"
 *                 filePath:
 *                   type: string
 *                   description: 文件相对路径（相对于算子目录）
 *                   example: "main.py"
 *       400:
 *         description: 请求参数错误或文件已存在
 *       404:
 *         description: 算子目录不存在
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.post('/file/add/:filename', async (ctx) => {
  await controller.addFile(ctx);
});

/**
 * @swagger
 * /api/operators/file/edit/{filename}:
 *   put:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 编辑算子文件
 *     description: |
 *       编辑算子目录中的文件。注意：只能编辑 Custom_operators 目录下的算子。
 *       operator.yaml 也可以通过这个接口来修改。
 *       path 参数以算子目录为 root，例如：path/preview/main.tsx 表示在算子目录下的 preview/main.tsx
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件名（如 main.py, operator.yaml）
 *         example: "main.py"
 *       - in: path
 *         name: path
 *         required: false
 *         schema:
 *           type: string
 *         description: 文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.tsx）
 *         example: "preview"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - operatorPath
 *             properties:
 *               content:
 *                 type: string
 *                 description: 文件内容
 *                 example: "print('Hello World Updated')"
 *               operatorPath:
 *                 type: string
 *                 description: 算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）
 *                 example: "Custom_operators/550e8400-e29b-41d4-a716-446655440000"
 *               path:
 *                 type: string
 *                 description: 文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.tsx）
 *                 example: "preview"
 *     responses:
 *       200:
 *         description: 文件更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File updated successfully"
 *                 filePath:
 *                   type: string
 *                   description: 文件相对路径（相对于算子目录）
 *                   example: "main.py"
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 算子目录或文件不存在
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.put('/file/edit/:filename', async (ctx) => {
  await controller.editFile(ctx);
});

/**
 * @swagger
 * /api/operators/file/delete/{filename}:
 *   delete:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 删除算子文件
 *     description: |
 *       删除算子目录中的文件。注意：只能删除 Custom_operators 目录下的算子文件。
 *       不能删除 operator.yaml 文件，如需修改请使用 edit 接口。
 *       path 参数以算子目录为 root，例如：path/preview/main.tsx 表示在算子目录下的 preview/main.tsx
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件名（如 main.py, test_data.json）
 *         example: "test_data.json"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operatorPath
 *             properties:
 *               operatorPath:
 *                 type: string
 *                 description: 算子相对路径（相对于项目根目录，必须以 Custom_operators/ 开头）
 *                 example: "Custom_operators/550e8400-e29b-41d4-a716-446655440000"
 *               path:
 *                 type: string
 *                 description: 文件路径（相对于算子目录，可选，例如 "preview" 表示 preview/main.tsx）
 *                 example: "preview"
 *     responses:
 *       200:
 *         description: 文件删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File deleted successfully"
 *                 filePath:
 *                   type: string
 *                   description: 文件相对路径（相对于算子目录）
 *                   example: "test_data.json"
 *       400:
 *         description: 请求参数错误或尝试删除 operator.yaml
 *       404:
 *         description: 算子目录或文件不存在
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.delete('/file/delete/:filename', async (ctx) => {
  await controller.deleteFile(ctx);
});

/**
 * @swagger
 * /api/operators/{id}/file:
 *   get:
 *     tags:
 *       - Operators - 算子管理
 *     summary: 读取算子文件
 *     description: |
 *       读取算子目录中的文件内容。用于获取可视化文件、预览文件等。
 *       path 参数以算子目录为 root，例如：path=preview/main.tsx 表示算子目录下的 preview/main.tsx
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 算子ID
 *         example: "op_12345"
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件路径（相对于算子目录）
 *         example: "preview/main.html"
 *     responses:
 *       200:
 *         description: 成功返回文件内容
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *           application/javascript:
 *             schema:
 *               type: string
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 算子或文件不存在
 *       500:
 *         description: 服务器错误
 */
operatorRoutes.get('/:id/file', async (ctx) => {
  await controller.getFile(ctx);
});


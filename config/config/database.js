"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.initializeDatabase = initializeDatabase;
const typeorm_1 = require("typeorm");
const Operator_1 = require("../package/entities/Operator");
const Workflow_1 = require("../package/entities/Workflow");
const WorkflowNode_1 = require("../package/entities/WorkflowNode");
const WorkflowConnection_1 = require("../package/entities/WorkflowConnection");
const WorkflowExecution_1 = require("../package/entities/WorkflowExecution");
const WorkflowExecutionLog_1 = require("../package/entities/WorkflowExecutionLog");
const Resource_1 = require("../package/entities/Resource");
const path = require("path");
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'sqlite',
    database: dbPath,
    synchronize: false, // 开发环境自动同步，生产环境应设为false
    logging: process.env.NODE_ENV === 'development',
    entities: [
        Operator_1.Operator,
        Workflow_1.Workflow,
        WorkflowNode_1.WorkflowNode,
        WorkflowConnection_1.WorkflowConnection,
        WorkflowExecution_1.WorkflowExecution,
        WorkflowExecutionLog_1.WorkflowExecutionLog,
        Resource_1.Resource,
    ],
});
async function initializeDatabase() {
    try {
        await exports.AppDataSource.initialize();
        console.log('数据库连接成功');
        return exports.AppDataSource;
    }
    catch (error) {
        console.error('数据库连接失败:', error);
        throw error;
    }
}

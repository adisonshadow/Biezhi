"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const path = __importStar(require("path"));
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
//# sourceMappingURL=database.js.map
import { WorkflowExecution } from './WorkflowExecution';
export declare enum LogLevel {
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    DEBUG = "debug"
}
export declare class WorkflowExecutionLog {
    id: string;
    execution: WorkflowExecution;
    executionId: string;
    nodeId?: string;
    level: LogLevel;
    message: string;
    data?: string;
    createdAt: Date;
}
//# sourceMappingURL=WorkflowExecutionLog.d.ts.map
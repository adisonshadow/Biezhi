import { Workflow } from './Workflow';
import { WorkflowExecutionLog } from './WorkflowExecutionLog';
export declare enum ExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare class WorkflowExecution {
    id: string;
    workflow: Workflow;
    workflowId: string;
    status: ExecutionStatus;
    inputData?: string;
    outputData?: string;
    errorMessage?: string;
    duration?: number;
    startedAt?: Date;
    completedAt?: Date;
    logs: WorkflowExecutionLog[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=WorkflowExecution.d.ts.map
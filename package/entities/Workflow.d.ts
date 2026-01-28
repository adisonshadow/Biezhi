import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnection } from './WorkflowConnection';
import { WorkflowExecution } from './WorkflowExecution';
export declare class Workflow {
    id: string;
    name: string;
    description?: string;
    version?: string;
    author?: string;
    license?: string;
    category?: string;
    tags?: string;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    executions: WorkflowExecution[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Workflow.d.ts.map
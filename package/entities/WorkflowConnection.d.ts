import { Workflow } from './Workflow';
import { WorkflowNode } from './WorkflowNode';
export declare class WorkflowConnection {
    id: string;
    workflow: Workflow;
    workflowId: string;
    fromNode: WorkflowNode;
    fromNodeId: string;
    fromPort: string;
    toNode: WorkflowNode;
    toNodeId: string;
    toPort: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=WorkflowConnection.d.ts.map
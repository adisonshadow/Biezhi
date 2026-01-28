import { Workflow } from './Workflow';
import { Operator } from './Operator';
export declare class WorkflowNode {
    id: string;
    workflow: Workflow;
    workflowId: string;
    operator: Operator;
    operatorId: string;
    operatorType: string;
    nodeType?: string;
    config?: string;
    positionX?: number;
    positionY?: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=WorkflowNode.d.ts.map
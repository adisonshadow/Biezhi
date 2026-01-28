export interface Operator {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  type: string;
  category: string;
  tags: string[];
  codePath?: string; // 可选：纯前端可视化算子不需要
  entryPoint?: string; // 可选：纯前端可视化算子不需要
  operatorType?: string; // 可选：纯前端可视化算子不需要
  inputs?: any[];
  outputs?: any[];
  operatorParams?: any;
  executionConfig?: any;
  dataVisualization?: any;
  metadata?: {
    operatorPath?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  operatorId: string;
  operatorType?: string; // 可选：纯前端可视化算子不需要
  nodeType?: string;
  config?: any;
  positionX?: number;
  positionY?: number;
}

export interface WorkflowConnection {
  id: string;
  from: {
    node: string;
    port: string;
  };
  to: {
    node: string;
    port: string;
  };
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  license?: string;
  category?: string;
  tags?: string[];
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLog {
  id: string;
  nodeId?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  createdAt: string;
}


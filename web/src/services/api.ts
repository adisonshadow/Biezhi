import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const api = {
  // 算子相关
  async listOperators() {
    const { data } = await apiClient.get('/operators');
    return data;
  },

  async getOperator(id: string) {
    const { data } = await apiClient.get(`/operators/${id}`);
    return data;
  },

  async searchOperators(query: string) {
    const { data } = await apiClient.get('/operators/search', { params: { name: query } });
    return data;
  },

  async registerOperator(operatorPath: string, operatorId?: string, useRelativePath?: boolean) {
    const { data } = await apiClient.post('/operators', {
      operatorPath,
      operatorId,
      useRelativePath,
    });
    return data;
  },

  async deleteOperator(id: string) {
    await apiClient.delete(`/operators/${id}`);
  },

  async reregisterOperator(id: string, operatorPath?: string) {
    const { data } = await apiClient.post(`/operators/${id}/reregister`, {
      operatorPath,
    });
    return data;
  },

  // 工作流相关
  async listWorkflows() {
    const { data } = await apiClient.get('/workflows');
    return data;
  },

  async getWorkflow(id: string) {
    const { data } = await apiClient.get(`/workflows/${id}`);
    return data;
  },

  async createWorkflow(workflow: any) {
    const { data } = await apiClient.post('/workflows', workflow);
    return data;
  },

  async updateWorkflow(id: string, workflow: any) {
    const { data } = await apiClient.put(`/workflows/${id}`, workflow);
    return data;
  },

  async deleteWorkflow(id: string) {
    await apiClient.delete(`/workflows/${id}`);
  },

  async validateWorkflow(id: string) {
    const { data } = await apiClient.post(`/workflows/${id}/validate`);
    return data;
  },

  async exportWorkflow(id: string) {
    const { data } = await apiClient.get(`/workflows/${id}/export`);
    return data;
  },

  async importWorkflow(workflowData: any) {
    const { data } = await apiClient.post('/workflows/import', workflowData);
    return data;
  },

  // 执行相关
  async listExecutions(status?: string, workflowId?: string) {
    const { data } = await apiClient.get('/executions', {
      params: { status, workflowId },
    });
    return data;
  },

  async getExecution(id: string) {
    const { data } = await apiClient.get(`/executions/${id}`);
    return data;
  },

  async createExecution(workflowId: string, inputData?: any) {
    const { data } = await apiClient.post('/executions', { workflowId, inputData });
    return data;
  },

  async startExecution(id: string) {
    await apiClient.post(`/executions/${id}/start`);
  },

  async stopExecution(id: string) {
    await apiClient.post(`/executions/${id}/stop`);
  },

  async deleteExecution(id: string) {
    await apiClient.delete(`/executions/${id}`);
  },

  async getExecutionLogs(id: string) {
    const { data } = await apiClient.get(`/executions/${id}/logs`);
    return data;
  },

  // 节点执行相关
  async executeNode(operatorId: string, config?: any, inputs?: any) {
    const { data } = await apiClient.post('/executions/node/execute', {
      operatorId,
      config,
      inputs,
    });
    return data;
  },

  // 工作流执行相关（新版本）
  async executeFullWorkflow(workflowId: string, inputData?: any) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/execute-full`, {
      inputData,
    });
    return data;
  },

  async executeSingleNodeInWorkflow(workflowId: string, nodeId: string, config?: any) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/node/${nodeId}/execute`, {
      config,
    });
    return data;
  },

  async executePartialWorkflow(workflowId: string, nodeIds: string[], nodeConfigs?: Record<string, any>) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/execute-partial`, {
      nodeIds,
      nodeConfigs,
    });
    return data;
  },

  async getNodeExecutionData(workflowId: string, nodeId: string, version?: number) {
    const { data } = await apiClient.get(`/executions/workflow/${workflowId}/node/${nodeId}/data`, {
      params: version ? { version } : {},
    });
    return data;
  },

  async getExecutionSession(sessionId: string) {
    const { data } = await apiClient.get(`/executions/session/${sessionId}`);
    return data;
  },

  // SSE流式执行（默认使用SSE模式）
  async executeFullWorkflowStream(workflowId: string, inputData?: any) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/execute-full?stream=true`, {
      inputData,
    });
    return data;
  },

  async executeSingleNodeInWorkflowStream(workflowId: string, nodeId: string, config?: any) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/node/${nodeId}/execute?stream=true`, {
      config,
    });
    return data;
  },

  async executePartialWorkflowStream(workflowId: string, nodeIds: string[], nodeConfigs?: Record<string, any>) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/execute-partial?stream=true`, {
      nodeIds,
      nodeConfigs,
    });
    return data;
  },

  // 同步执行（用于AI测试，不使用SSE）
  async executeFullWorkflowSync(workflowId: string, inputData?: any) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/execute-full?stream=false`, {
      inputData,
    });
    return data;
  },

  async executeSingleNodeInWorkflowSync(workflowId: string, nodeId: string, config?: any) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/node/${nodeId}/execute?stream=false`, {
      config,
    });
    return data;
  },

  async executePartialWorkflowSync(workflowId: string, nodeIds: string[], nodeConfigs?: Record<string, any>) {
    const { data } = await apiClient.post(`/executions/workflow/${workflowId}/execute-partial?stream=false`, {
      nodeIds,
      nodeConfigs,
    });
    return data;
  },

  // 资源管理相关
  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post('/resources/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async getResource(id: string) {
    const { data } = await apiClient.get(`/resources/${id}`);
    return data;
  },

  async downloadResource(id: string) {
    const { data } = await apiClient.get(`/resources/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  async deleteResource(id: string) {
    await apiClient.delete(`/resources/${id}`);
  },

  async listResources() {
    const { data } = await apiClient.get('/resources');
    return data;
  },

  // Function Calling相关
  async getFunctionSchemas() {
    const { data } = await apiClient.get('/ai/functions/schemas');
    return data;
  },

  async executeFunction(functionName: string, args?: Record<string, any>, context?: any) {
    const { data } = await apiClient.post('/ai/functions/execute', {
      function_name: functionName,
      arguments: args || {},
      context,
    });
    return data;
  },

  async executeFunctions(functionCalls: Array<{ name: string; arguments?: Record<string, any> }>, context?: any) {
    const { data } = await apiClient.post('/ai/functions/execute-batch', {
      function_calls: functionCalls,
      context,
    });
    return data;
  },
};


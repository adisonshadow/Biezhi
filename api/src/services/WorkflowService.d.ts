export declare class WorkflowService {
    /**
     * 创建工作流
     */
    createWorkflow(data: any): Promise<any>;
    /**
     * 获取所有工作流
     */
    listWorkflows(): Promise<any[]>;
    /**
     * 搜索工作流
     */
    searchWorkflows(query?: string): Promise<any[]>;
    /**
     * 根据ID获取工作流
     */
    getWorkflowById(id: string): Promise<any | null>;
    /**
     * 更新工作流
     */
    updateWorkflow(id: string, data: any): Promise<any | null>;
    /**
     * 删除工作流
     */
    deleteWorkflow(id: string): Promise<void>;
    /**
     * 验证工作流
     */
    validateWorkflow(id: string): Promise<any>;
    /**
     * 获取执行顺序
     */
    getExecutionOrder(id: string): Promise<string[]>;
    /**
     * 计算执行顺序（拓扑排序）
     */
    private calculateExecutionOrder;
    /**
     * 序列化工作流
     */
    private serializeWorkflow;
}
//# sourceMappingURL=WorkflowService.d.ts.map
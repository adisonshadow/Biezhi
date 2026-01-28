import { Operator } from '../../../package/entities/Operator';
export declare class OperatorService {
    /**
     * 序列化算子对象
     */
    serializeOperator(operator: Operator): any;
    /**
     * 搜索算子
     */
    search(name?: string, tag?: string, type?: string): Promise<any[]>;
    /**
     * 获取统计信息
     */
    getStats(): Promise<any>;
}
//# sourceMappingURL=OperatorService.d.ts.map
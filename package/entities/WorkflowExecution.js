"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowExecution = exports.ExecutionStatus = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const Workflow_1 = require("./Workflow");
const WorkflowExecutionLog_1 = require("./WorkflowExecutionLog");
var ExecutionStatus;
(function (ExecutionStatus) {
    ExecutionStatus["PENDING"] = "pending";
    ExecutionStatus["RUNNING"] = "running";
    ExecutionStatus["SUCCESS"] = "success";
    ExecutionStatus["FAILED"] = "failed";
    ExecutionStatus["CANCELLED"] = "cancelled";
})(ExecutionStatus || (exports.ExecutionStatus = ExecutionStatus = {}));
let WorkflowExecution = class WorkflowExecution {
};
exports.WorkflowExecution = WorkflowExecution;
__decorate([
    (0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowExecution.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, workflow => workflow.executions),
    (0, typeorm_1.JoinColumn)({ name: 'workflowId' }),
    __metadata("design:type", Workflow_1.Workflow)
], WorkflowExecution.prototype, "workflow", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowExecution.prototype, "workflowId", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], WorkflowExecution.prototype, "status", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WorkflowExecution.prototype, "inputData", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WorkflowExecution.prototype, "outputData", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WorkflowExecution.prototype, "errorMessage", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('integer', { nullable: true }),
    __metadata("design:type", Number)
], WorkflowExecution.prototype, "duration", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('datetime', { nullable: true }),
    __metadata("design:type", Date)
], WorkflowExecution.prototype, "startedAt", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('datetime', { nullable: true }),
    __metadata("design:type", Date)
], WorkflowExecution.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkflowExecutionLog_1.WorkflowExecutionLog, log => log.execution),
    __metadata("design:type", Array)
], WorkflowExecution.prototype, "logs", void 0);
__decorate([
    (0, adb_typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowExecution.prototype, "createdAt", void 0);
__decorate([
    (0, adb_typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowExecution.prototype, "updatedAt", void 0);
exports.WorkflowExecution = WorkflowExecution = __decorate([
    (0, adb_typeorm_1.Entity)('workflow_executions')
], WorkflowExecution);
//# sourceMappingURL=WorkflowExecution.js.map
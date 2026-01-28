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
exports.WorkflowExecutionLog = exports.LogLevel = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const WorkflowExecution_1 = require("./WorkflowExecution");
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
let WorkflowExecutionLog = class WorkflowExecutionLog {
};
exports.WorkflowExecutionLog = WorkflowExecutionLog;
__decorate([
    (0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowExecutionLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowExecution_1.WorkflowExecution, execution => execution.logs),
    (0, typeorm_1.JoinColumn)({ name: 'executionId' }),
    __metadata("design:type", WorkflowExecution_1.WorkflowExecution)
], WorkflowExecutionLog.prototype, "execution", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowExecutionLog.prototype, "executionId", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], WorkflowExecutionLog.prototype, "nodeId", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], WorkflowExecutionLog.prototype, "level", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text'),
    __metadata("design:type", String)
], WorkflowExecutionLog.prototype, "message", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WorkflowExecutionLog.prototype, "data", void 0);
__decorate([
    (0, adb_typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowExecutionLog.prototype, "createdAt", void 0);
exports.WorkflowExecutionLog = WorkflowExecutionLog = __decorate([
    (0, adb_typeorm_1.Entity)('workflow_execution_logs')
], WorkflowExecutionLog);
//# sourceMappingURL=WorkflowExecutionLog.js.map
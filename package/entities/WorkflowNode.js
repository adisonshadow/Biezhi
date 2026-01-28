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
exports.WorkflowNode = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const Workflow_1 = require("./Workflow");
const Operator_1 = require("./Operator");
let WorkflowNode = class WorkflowNode {
};
exports.WorkflowNode = WorkflowNode;
__decorate([
    (0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowNode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, workflow => workflow.nodes),
    (0, typeorm_1.JoinColumn)({ name: 'workflowId' }),
    __metadata("design:type", Workflow_1.Workflow)
], WorkflowNode.prototype, "workflow", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowNode.prototype, "workflowId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Operator_1.Operator),
    (0, typeorm_1.JoinColumn)({ name: 'operatorId' }),
    __metadata("design:type", Operator_1.Operator)
], WorkflowNode.prototype, "operator", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowNode.prototype, "operatorId", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], WorkflowNode.prototype, "operatorType", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], WorkflowNode.prototype, "nodeType", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], WorkflowNode.prototype, "config", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('integer', { nullable: true }),
    __metadata("design:type", Number)
], WorkflowNode.prototype, "positionX", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('integer', { nullable: true }),
    __metadata("design:type", Number)
], WorkflowNode.prototype, "positionY", void 0);
__decorate([
    (0, adb_typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowNode.prototype, "createdAt", void 0);
__decorate([
    (0, adb_typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowNode.prototype, "updatedAt", void 0);
exports.WorkflowNode = WorkflowNode = __decorate([
    (0, adb_typeorm_1.Entity)('workflow_nodes')
], WorkflowNode);
//# sourceMappingURL=WorkflowNode.js.map
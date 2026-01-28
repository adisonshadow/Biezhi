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
exports.WorkflowConnection = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const Workflow_1 = require("./Workflow");
const WorkflowNode_1 = require("./WorkflowNode");
let WorkflowConnection = class WorkflowConnection {
};
exports.WorkflowConnection = WorkflowConnection;
__decorate([
    (0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowConnection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, workflow => workflow.connections),
    (0, typeorm_1.JoinColumn)({ name: 'workflowId' }),
    __metadata("design:type", Workflow_1.Workflow)
], WorkflowConnection.prototype, "workflow", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowConnection.prototype, "workflowId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowNode_1.WorkflowNode),
    (0, typeorm_1.JoinColumn)({ name: 'fromNodeId' }),
    __metadata("design:type", WorkflowNode_1.WorkflowNode)
], WorkflowConnection.prototype, "fromNode", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowConnection.prototype, "fromNodeId", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowConnection.prototype, "fromPort", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowNode_1.WorkflowNode),
    (0, typeorm_1.JoinColumn)({ name: 'toNodeId' }),
    __metadata("design:type", WorkflowNode_1.WorkflowNode)
], WorkflowConnection.prototype, "toNode", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowConnection.prototype, "toNodeId", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], WorkflowConnection.prototype, "toPort", void 0);
__decorate([
    (0, adb_typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowConnection.prototype, "createdAt", void 0);
__decorate([
    (0, adb_typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WorkflowConnection.prototype, "updatedAt", void 0);
exports.WorkflowConnection = WorkflowConnection = __decorate([
    (0, adb_typeorm_1.Entity)('workflow_connections')
], WorkflowConnection);
//# sourceMappingURL=WorkflowConnection.js.map
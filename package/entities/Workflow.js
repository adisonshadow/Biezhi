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
exports.Workflow = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const WorkflowNode_1 = require("./WorkflowNode");
const WorkflowConnection_1 = require("./WorkflowConnection");
const WorkflowExecution_1 = require("./WorkflowExecution");
let Workflow = class Workflow {
};
exports.Workflow = Workflow;
__decorate([
    (0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 }),
    __metadata("design:type", String)
], Workflow.prototype, "id", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 200 }),
    __metadata("design:type", String)
], Workflow.prototype, "name", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Workflow.prototype, "description", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], Workflow.prototype, "version", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], Workflow.prototype, "author", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], Workflow.prototype, "license", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], Workflow.prototype, "category", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Workflow.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkflowNode_1.WorkflowNode, node => node.workflow),
    __metadata("design:type", Array)
], Workflow.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkflowConnection_1.WorkflowConnection, connection => connection.workflow),
    __metadata("design:type", Array)
], Workflow.prototype, "connections", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkflowExecution_1.WorkflowExecution, execution => execution.workflow),
    __metadata("design:type", Array)
], Workflow.prototype, "executions", void 0);
__decorate([
    (0, adb_typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Workflow.prototype, "createdAt", void 0);
__decorate([
    (0, adb_typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Workflow.prototype, "updatedAt", void 0);
exports.Workflow = Workflow = __decorate([
    (0, adb_typeorm_1.Entity)('workflows')
], Workflow);
//# sourceMappingURL=Workflow.js.map
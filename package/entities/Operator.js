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
exports.Operator = void 0;
const adb_typeorm_1 = require("adb-typeorm");
let Operator = class Operator {
};
exports.Operator = Operator;
__decorate([
    (0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 }),
    __metadata("design:type", String)
], Operator.prototype, "id", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 200 }),
    __metadata("design:type", String)
], Operator.prototype, "name", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], Operator.prototype, "version", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Operator.prototype, "description", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], Operator.prototype, "author", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], Operator.prototype, "license", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], Operator.prototype, "type", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], Operator.prototype, "category", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "tags", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 500 }),
    __metadata("design:type", String)
], Operator.prototype, "codePath", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 200 }),
    __metadata("design:type", String)
], Operator.prototype, "entryPoint", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], Operator.prototype, "operatorType", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "inputs", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "outputs", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "operatorParams", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "executionConfig", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "dataVisualization", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "mockdata", void 0);
__decorate([
    (0, adb_typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Operator.prototype, "metadata", void 0);
__decorate([
    (0, adb_typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Operator.prototype, "createdAt", void 0);
__decorate([
    (0, adb_typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Operator.prototype, "updatedAt", void 0);
exports.Operator = Operator = __decorate([
    (0, adb_typeorm_1.Entity)('operators')
], Operator);
//# sourceMappingURL=Operator.js.map
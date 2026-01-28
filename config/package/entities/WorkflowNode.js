"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowNode = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const Workflow_1 = require("./Workflow");
const Operator_1 = require("./Operator");
let WorkflowNode = (() => {
    let _classDecorators = [(0, adb_typeorm_1.Entity)('workflow_nodes')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _workflow_decorators;
    let _workflow_initializers = [];
    let _workflow_extraInitializers = [];
    let _workflowId_decorators;
    let _workflowId_initializers = [];
    let _workflowId_extraInitializers = [];
    let _operator_decorators;
    let _operator_initializers = [];
    let _operator_extraInitializers = [];
    let _operatorId_decorators;
    let _operatorId_initializers = [];
    let _operatorId_extraInitializers = [];
    let _operatorType_decorators;
    let _operatorType_initializers = [];
    let _operatorType_extraInitializers = [];
    let _nodeType_decorators;
    let _nodeType_initializers = [];
    let _nodeType_extraInitializers = [];
    let _config_decorators;
    let _config_initializers = [];
    let _config_extraInitializers = [];
    let _positionX_decorators;
    let _positionX_initializers = [];
    let _positionX_extraInitializers = [];
    let _positionY_decorators;
    let _positionY_initializers = [];
    let _positionY_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    var WorkflowNode = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.workflow = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _workflow_initializers, void 0));
            this.workflowId = (__runInitializers(this, _workflow_extraInitializers), __runInitializers(this, _workflowId_initializers, void 0));
            this.operator = (__runInitializers(this, _workflowId_extraInitializers), __runInitializers(this, _operator_initializers, void 0));
            this.operatorId = (__runInitializers(this, _operator_extraInitializers), __runInitializers(this, _operatorId_initializers, void 0));
            this.operatorType = (__runInitializers(this, _operatorId_extraInitializers), __runInitializers(this, _operatorType_initializers, void 0)); // local_python, local_go, local_rust（纯前端可视化算子可为空）
            this.nodeType = (__runInitializers(this, _operatorType_extraInitializers), __runInitializers(this, _nodeType_initializers, void 0)); // processor, output, input
            this.config = (__runInitializers(this, _nodeType_extraInitializers), __runInitializers(this, _config_initializers, void 0)); // JSON object string - 节点配置参数
            this.positionX = (__runInitializers(this, _config_extraInitializers), __runInitializers(this, _positionX_initializers, void 0)); // UI位置X坐标
            this.positionY = (__runInitializers(this, _positionX_extraInitializers), __runInitializers(this, _positionY_initializers, void 0)); // UI位置Y坐标
            this.createdAt = (__runInitializers(this, _positionY_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WorkflowNode");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 })];
        _workflow_decorators = [(0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, workflow => workflow.nodes), (0, typeorm_1.JoinColumn)({ name: 'workflowId' })];
        _workflowId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _operator_decorators = [(0, typeorm_1.ManyToOne)(() => Operator_1.Operator), (0, typeorm_1.JoinColumn)({ name: 'operatorId' })];
        _operatorId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _operatorType_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true })];
        _nodeType_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true })];
        _config_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _positionX_decorators = [(0, adb_typeorm_1.Column)('integer', { nullable: true })];
        _positionY_decorators = [(0, adb_typeorm_1.Column)('integer', { nullable: true })];
        _createdAt_decorators = [(0, adb_typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, adb_typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _workflow_decorators, { kind: "field", name: "workflow", static: false, private: false, access: { has: obj => "workflow" in obj, get: obj => obj.workflow, set: (obj, value) => { obj.workflow = value; } }, metadata: _metadata }, _workflow_initializers, _workflow_extraInitializers);
        __esDecorate(null, null, _workflowId_decorators, { kind: "field", name: "workflowId", static: false, private: false, access: { has: obj => "workflowId" in obj, get: obj => obj.workflowId, set: (obj, value) => { obj.workflowId = value; } }, metadata: _metadata }, _workflowId_initializers, _workflowId_extraInitializers);
        __esDecorate(null, null, _operator_decorators, { kind: "field", name: "operator", static: false, private: false, access: { has: obj => "operator" in obj, get: obj => obj.operator, set: (obj, value) => { obj.operator = value; } }, metadata: _metadata }, _operator_initializers, _operator_extraInitializers);
        __esDecorate(null, null, _operatorId_decorators, { kind: "field", name: "operatorId", static: false, private: false, access: { has: obj => "operatorId" in obj, get: obj => obj.operatorId, set: (obj, value) => { obj.operatorId = value; } }, metadata: _metadata }, _operatorId_initializers, _operatorId_extraInitializers);
        __esDecorate(null, null, _operatorType_decorators, { kind: "field", name: "operatorType", static: false, private: false, access: { has: obj => "operatorType" in obj, get: obj => obj.operatorType, set: (obj, value) => { obj.operatorType = value; } }, metadata: _metadata }, _operatorType_initializers, _operatorType_extraInitializers);
        __esDecorate(null, null, _nodeType_decorators, { kind: "field", name: "nodeType", static: false, private: false, access: { has: obj => "nodeType" in obj, get: obj => obj.nodeType, set: (obj, value) => { obj.nodeType = value; } }, metadata: _metadata }, _nodeType_initializers, _nodeType_extraInitializers);
        __esDecorate(null, null, _config_decorators, { kind: "field", name: "config", static: false, private: false, access: { has: obj => "config" in obj, get: obj => obj.config, set: (obj, value) => { obj.config = value; } }, metadata: _metadata }, _config_initializers, _config_extraInitializers);
        __esDecorate(null, null, _positionX_decorators, { kind: "field", name: "positionX", static: false, private: false, access: { has: obj => "positionX" in obj, get: obj => obj.positionX, set: (obj, value) => { obj.positionX = value; } }, metadata: _metadata }, _positionX_initializers, _positionX_extraInitializers);
        __esDecorate(null, null, _positionY_decorators, { kind: "field", name: "positionY", static: false, private: false, access: { has: obj => "positionY" in obj, get: obj => obj.positionY, set: (obj, value) => { obj.positionY = value; } }, metadata: _metadata }, _positionY_initializers, _positionY_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkflowNode = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkflowNode = _classThis;
})();
exports.WorkflowNode = WorkflowNode;

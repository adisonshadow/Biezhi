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
exports.WorkflowConnection = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const Workflow_1 = require("./Workflow");
const WorkflowNode_1 = require("./WorkflowNode");
let WorkflowConnection = (() => {
    let _classDecorators = [(0, adb_typeorm_1.Entity)('workflow_connections')];
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
    let _fromNode_decorators;
    let _fromNode_initializers = [];
    let _fromNode_extraInitializers = [];
    let _fromNodeId_decorators;
    let _fromNodeId_initializers = [];
    let _fromNodeId_extraInitializers = [];
    let _fromPort_decorators;
    let _fromPort_initializers = [];
    let _fromPort_extraInitializers = [];
    let _toNode_decorators;
    let _toNode_initializers = [];
    let _toNode_extraInitializers = [];
    let _toNodeId_decorators;
    let _toNodeId_initializers = [];
    let _toNodeId_extraInitializers = [];
    let _toPort_decorators;
    let _toPort_initializers = [];
    let _toPort_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    var WorkflowConnection = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.workflow = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _workflow_initializers, void 0));
            this.workflowId = (__runInitializers(this, _workflow_extraInitializers), __runInitializers(this, _workflowId_initializers, void 0));
            this.fromNode = (__runInitializers(this, _workflowId_extraInitializers), __runInitializers(this, _fromNode_initializers, void 0));
            this.fromNodeId = (__runInitializers(this, _fromNode_extraInitializers), __runInitializers(this, _fromNodeId_initializers, void 0));
            this.fromPort = (__runInitializers(this, _fromNodeId_extraInitializers), __runInitializers(this, _fromPort_initializers, void 0)); // 输出端口名称
            this.toNode = (__runInitializers(this, _fromPort_extraInitializers), __runInitializers(this, _toNode_initializers, void 0));
            this.toNodeId = (__runInitializers(this, _toNode_extraInitializers), __runInitializers(this, _toNodeId_initializers, void 0));
            this.toPort = (__runInitializers(this, _toNodeId_extraInitializers), __runInitializers(this, _toPort_initializers, void 0)); // 输入端口名称
            this.createdAt = (__runInitializers(this, _toPort_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WorkflowConnection");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 })];
        _workflow_decorators = [(0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, workflow => workflow.connections), (0, typeorm_1.JoinColumn)({ name: 'workflowId' })];
        _workflowId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _fromNode_decorators = [(0, typeorm_1.ManyToOne)(() => WorkflowNode_1.WorkflowNode), (0, typeorm_1.JoinColumn)({ name: 'fromNodeId' })];
        _fromNodeId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _fromPort_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _toNode_decorators = [(0, typeorm_1.ManyToOne)(() => WorkflowNode_1.WorkflowNode), (0, typeorm_1.JoinColumn)({ name: 'toNodeId' })];
        _toNodeId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _toPort_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _createdAt_decorators = [(0, adb_typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, adb_typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _workflow_decorators, { kind: "field", name: "workflow", static: false, private: false, access: { has: obj => "workflow" in obj, get: obj => obj.workflow, set: (obj, value) => { obj.workflow = value; } }, metadata: _metadata }, _workflow_initializers, _workflow_extraInitializers);
        __esDecorate(null, null, _workflowId_decorators, { kind: "field", name: "workflowId", static: false, private: false, access: { has: obj => "workflowId" in obj, get: obj => obj.workflowId, set: (obj, value) => { obj.workflowId = value; } }, metadata: _metadata }, _workflowId_initializers, _workflowId_extraInitializers);
        __esDecorate(null, null, _fromNode_decorators, { kind: "field", name: "fromNode", static: false, private: false, access: { has: obj => "fromNode" in obj, get: obj => obj.fromNode, set: (obj, value) => { obj.fromNode = value; } }, metadata: _metadata }, _fromNode_initializers, _fromNode_extraInitializers);
        __esDecorate(null, null, _fromNodeId_decorators, { kind: "field", name: "fromNodeId", static: false, private: false, access: { has: obj => "fromNodeId" in obj, get: obj => obj.fromNodeId, set: (obj, value) => { obj.fromNodeId = value; } }, metadata: _metadata }, _fromNodeId_initializers, _fromNodeId_extraInitializers);
        __esDecorate(null, null, _fromPort_decorators, { kind: "field", name: "fromPort", static: false, private: false, access: { has: obj => "fromPort" in obj, get: obj => obj.fromPort, set: (obj, value) => { obj.fromPort = value; } }, metadata: _metadata }, _fromPort_initializers, _fromPort_extraInitializers);
        __esDecorate(null, null, _toNode_decorators, { kind: "field", name: "toNode", static: false, private: false, access: { has: obj => "toNode" in obj, get: obj => obj.toNode, set: (obj, value) => { obj.toNode = value; } }, metadata: _metadata }, _toNode_initializers, _toNode_extraInitializers);
        __esDecorate(null, null, _toNodeId_decorators, { kind: "field", name: "toNodeId", static: false, private: false, access: { has: obj => "toNodeId" in obj, get: obj => obj.toNodeId, set: (obj, value) => { obj.toNodeId = value; } }, metadata: _metadata }, _toNodeId_initializers, _toNodeId_extraInitializers);
        __esDecorate(null, null, _toPort_decorators, { kind: "field", name: "toPort", static: false, private: false, access: { has: obj => "toPort" in obj, get: obj => obj.toPort, set: (obj, value) => { obj.toPort = value; } }, metadata: _metadata }, _toPort_initializers, _toPort_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkflowConnection = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkflowConnection = _classThis;
})();
exports.WorkflowConnection = WorkflowConnection;

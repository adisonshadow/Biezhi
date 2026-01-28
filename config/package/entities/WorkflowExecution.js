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
let WorkflowExecution = (() => {
    let _classDecorators = [(0, adb_typeorm_1.Entity)('workflow_executions')];
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
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _inputData_decorators;
    let _inputData_initializers = [];
    let _inputData_extraInitializers = [];
    let _outputData_decorators;
    let _outputData_initializers = [];
    let _outputData_extraInitializers = [];
    let _errorMessage_decorators;
    let _errorMessage_initializers = [];
    let _errorMessage_extraInitializers = [];
    let _duration_decorators;
    let _duration_initializers = [];
    let _duration_extraInitializers = [];
    let _startedAt_decorators;
    let _startedAt_initializers = [];
    let _startedAt_extraInitializers = [];
    let _completedAt_decorators;
    let _completedAt_initializers = [];
    let _completedAt_extraInitializers = [];
    let _logs_decorators;
    let _logs_initializers = [];
    let _logs_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    var WorkflowExecution = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.workflow = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _workflow_initializers, void 0));
            this.workflowId = (__runInitializers(this, _workflow_extraInitializers), __runInitializers(this, _workflowId_initializers, void 0));
            this.status = (__runInitializers(this, _workflowId_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.inputData = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _inputData_initializers, void 0)); // JSON object string - 输入数据
            this.outputData = (__runInitializers(this, _inputData_extraInitializers), __runInitializers(this, _outputData_initializers, void 0)); // JSON object string - 输出数据
            this.errorMessage = (__runInitializers(this, _outputData_extraInitializers), __runInitializers(this, _errorMessage_initializers, void 0));
            this.duration = (__runInitializers(this, _errorMessage_extraInitializers), __runInitializers(this, _duration_initializers, void 0)); // 执行时长（毫秒）
            this.startedAt = (__runInitializers(this, _duration_extraInitializers), __runInitializers(this, _startedAt_initializers, void 0));
            this.completedAt = (__runInitializers(this, _startedAt_extraInitializers), __runInitializers(this, _completedAt_initializers, void 0));
            this.logs = (__runInitializers(this, _completedAt_extraInitializers), __runInitializers(this, _logs_initializers, void 0));
            this.createdAt = (__runInitializers(this, _logs_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WorkflowExecution");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 })];
        _workflow_decorators = [(0, typeorm_1.ManyToOne)(() => Workflow_1.Workflow, workflow => workflow.executions), (0, typeorm_1.JoinColumn)({ name: 'workflowId' })];
        _workflowId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _status_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50 })];
        _inputData_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _outputData_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _errorMessage_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _duration_decorators = [(0, adb_typeorm_1.Column)('integer', { nullable: true })];
        _startedAt_decorators = [(0, adb_typeorm_1.Column)('datetime', { nullable: true })];
        _completedAt_decorators = [(0, adb_typeorm_1.Column)('datetime', { nullable: true })];
        _logs_decorators = [(0, typeorm_1.OneToMany)(() => WorkflowExecutionLog_1.WorkflowExecutionLog, log => log.execution)];
        _createdAt_decorators = [(0, adb_typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, adb_typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _workflow_decorators, { kind: "field", name: "workflow", static: false, private: false, access: { has: obj => "workflow" in obj, get: obj => obj.workflow, set: (obj, value) => { obj.workflow = value; } }, metadata: _metadata }, _workflow_initializers, _workflow_extraInitializers);
        __esDecorate(null, null, _workflowId_decorators, { kind: "field", name: "workflowId", static: false, private: false, access: { has: obj => "workflowId" in obj, get: obj => obj.workflowId, set: (obj, value) => { obj.workflowId = value; } }, metadata: _metadata }, _workflowId_initializers, _workflowId_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _inputData_decorators, { kind: "field", name: "inputData", static: false, private: false, access: { has: obj => "inputData" in obj, get: obj => obj.inputData, set: (obj, value) => { obj.inputData = value; } }, metadata: _metadata }, _inputData_initializers, _inputData_extraInitializers);
        __esDecorate(null, null, _outputData_decorators, { kind: "field", name: "outputData", static: false, private: false, access: { has: obj => "outputData" in obj, get: obj => obj.outputData, set: (obj, value) => { obj.outputData = value; } }, metadata: _metadata }, _outputData_initializers, _outputData_extraInitializers);
        __esDecorate(null, null, _errorMessage_decorators, { kind: "field", name: "errorMessage", static: false, private: false, access: { has: obj => "errorMessage" in obj, get: obj => obj.errorMessage, set: (obj, value) => { obj.errorMessage = value; } }, metadata: _metadata }, _errorMessage_initializers, _errorMessage_extraInitializers);
        __esDecorate(null, null, _duration_decorators, { kind: "field", name: "duration", static: false, private: false, access: { has: obj => "duration" in obj, get: obj => obj.duration, set: (obj, value) => { obj.duration = value; } }, metadata: _metadata }, _duration_initializers, _duration_extraInitializers);
        __esDecorate(null, null, _startedAt_decorators, { kind: "field", name: "startedAt", static: false, private: false, access: { has: obj => "startedAt" in obj, get: obj => obj.startedAt, set: (obj, value) => { obj.startedAt = value; } }, metadata: _metadata }, _startedAt_initializers, _startedAt_extraInitializers);
        __esDecorate(null, null, _completedAt_decorators, { kind: "field", name: "completedAt", static: false, private: false, access: { has: obj => "completedAt" in obj, get: obj => obj.completedAt, set: (obj, value) => { obj.completedAt = value; } }, metadata: _metadata }, _completedAt_initializers, _completedAt_extraInitializers);
        __esDecorate(null, null, _logs_decorators, { kind: "field", name: "logs", static: false, private: false, access: { has: obj => "logs" in obj, get: obj => obj.logs, set: (obj, value) => { obj.logs = value; } }, metadata: _metadata }, _logs_initializers, _logs_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkflowExecution = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkflowExecution = _classThis;
})();
exports.WorkflowExecution = WorkflowExecution;

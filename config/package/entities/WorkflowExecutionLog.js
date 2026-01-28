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
let WorkflowExecutionLog = (() => {
    let _classDecorators = [(0, adb_typeorm_1.Entity)('workflow_execution_logs')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _execution_decorators;
    let _execution_initializers = [];
    let _execution_extraInitializers = [];
    let _executionId_decorators;
    let _executionId_initializers = [];
    let _executionId_extraInitializers = [];
    let _nodeId_decorators;
    let _nodeId_initializers = [];
    let _nodeId_extraInitializers = [];
    let _level_decorators;
    let _level_initializers = [];
    let _level_extraInitializers = [];
    let _message_decorators;
    let _message_initializers = [];
    let _message_extraInitializers = [];
    let _data_decorators;
    let _data_initializers = [];
    let _data_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    var WorkflowExecutionLog = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.execution = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _execution_initializers, void 0));
            this.executionId = (__runInitializers(this, _execution_extraInitializers), __runInitializers(this, _executionId_initializers, void 0));
            this.nodeId = (__runInitializers(this, _executionId_extraInitializers), __runInitializers(this, _nodeId_initializers, void 0)); // 关联的节点ID
            this.level = (__runInitializers(this, _nodeId_extraInitializers), __runInitializers(this, _level_initializers, void 0));
            this.message = (__runInitializers(this, _level_extraInitializers), __runInitializers(this, _message_initializers, void 0));
            this.data = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _data_initializers, void 0)); // JSON object string - 附加数据
            this.createdAt = (__runInitializers(this, _data_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            __runInitializers(this, _createdAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WorkflowExecutionLog");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 })];
        _execution_decorators = [(0, typeorm_1.ManyToOne)(() => WorkflowExecution_1.WorkflowExecution, execution => execution.logs), (0, typeorm_1.JoinColumn)({ name: 'executionId' })];
        _executionId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _nodeId_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100, nullable: true })];
        _level_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50 })];
        _message_decorators = [(0, adb_typeorm_1.Column)('text')];
        _data_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _createdAt_decorators = [(0, adb_typeorm_1.CreateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _execution_decorators, { kind: "field", name: "execution", static: false, private: false, access: { has: obj => "execution" in obj, get: obj => obj.execution, set: (obj, value) => { obj.execution = value; } }, metadata: _metadata }, _execution_initializers, _execution_extraInitializers);
        __esDecorate(null, null, _executionId_decorators, { kind: "field", name: "executionId", static: false, private: false, access: { has: obj => "executionId" in obj, get: obj => obj.executionId, set: (obj, value) => { obj.executionId = value; } }, metadata: _metadata }, _executionId_initializers, _executionId_extraInitializers);
        __esDecorate(null, null, _nodeId_decorators, { kind: "field", name: "nodeId", static: false, private: false, access: { has: obj => "nodeId" in obj, get: obj => obj.nodeId, set: (obj, value) => { obj.nodeId = value; } }, metadata: _metadata }, _nodeId_initializers, _nodeId_extraInitializers);
        __esDecorate(null, null, _level_decorators, { kind: "field", name: "level", static: false, private: false, access: { has: obj => "level" in obj, get: obj => obj.level, set: (obj, value) => { obj.level = value; } }, metadata: _metadata }, _level_initializers, _level_extraInitializers);
        __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: obj => "message" in obj, get: obj => obj.message, set: (obj, value) => { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
        __esDecorate(null, null, _data_decorators, { kind: "field", name: "data", static: false, private: false, access: { has: obj => "data" in obj, get: obj => obj.data, set: (obj, value) => { obj.data = value; } }, metadata: _metadata }, _data_initializers, _data_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkflowExecutionLog = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkflowExecutionLog = _classThis;
})();
exports.WorkflowExecutionLog = WorkflowExecutionLog;

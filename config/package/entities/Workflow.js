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
exports.Workflow = void 0;
const adb_typeorm_1 = require("adb-typeorm");
const typeorm_1 = require("typeorm");
const WorkflowNode_1 = require("./WorkflowNode");
const WorkflowConnection_1 = require("./WorkflowConnection");
const WorkflowExecution_1 = require("./WorkflowExecution");
let Workflow = (() => {
    let _classDecorators = [(0, adb_typeorm_1.Entity)('workflows')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _author_decorators;
    let _author_initializers = [];
    let _author_extraInitializers = [];
    let _license_decorators;
    let _license_initializers = [];
    let _license_extraInitializers = [];
    let _category_decorators;
    let _category_initializers = [];
    let _category_extraInitializers = [];
    let _tags_decorators;
    let _tags_initializers = [];
    let _tags_extraInitializers = [];
    let _nodes_decorators;
    let _nodes_initializers = [];
    let _nodes_extraInitializers = [];
    let _connections_decorators;
    let _connections_initializers = [];
    let _connections_extraInitializers = [];
    let _executions_decorators;
    let _executions_initializers = [];
    let _executions_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    var Workflow = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.version = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _version_initializers, void 0));
            this.author = (__runInitializers(this, _version_extraInitializers), __runInitializers(this, _author_initializers, void 0));
            this.license = (__runInitializers(this, _author_extraInitializers), __runInitializers(this, _license_initializers, void 0));
            this.category = (__runInitializers(this, _license_extraInitializers), __runInitializers(this, _category_initializers, void 0));
            this.tags = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _tags_initializers, void 0)); // JSON array string
            this.nodes = (__runInitializers(this, _tags_extraInitializers), __runInitializers(this, _nodes_initializers, void 0));
            this.connections = (__runInitializers(this, _nodes_extraInitializers), __runInitializers(this, _connections_initializers, void 0));
            this.executions = (__runInitializers(this, _connections_extraInitializers), __runInitializers(this, _executions_initializers, void 0));
            this.createdAt = (__runInitializers(this, _executions_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Workflow");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 })];
        _name_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 200 })];
        _description_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _version_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true })];
        _author_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100, nullable: true })];
        _license_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true })];
        _category_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100, nullable: true })];
        _tags_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _nodes_decorators = [(0, typeorm_1.OneToMany)(() => WorkflowNode_1.WorkflowNode, node => node.workflow)];
        _connections_decorators = [(0, typeorm_1.OneToMany)(() => WorkflowConnection_1.WorkflowConnection, connection => connection.workflow)];
        _executions_decorators = [(0, typeorm_1.OneToMany)(() => WorkflowExecution_1.WorkflowExecution, execution => execution.workflow)];
        _createdAt_decorators = [(0, adb_typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, adb_typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _version_decorators, { kind: "field", name: "version", static: false, private: false, access: { has: obj => "version" in obj, get: obj => obj.version, set: (obj, value) => { obj.version = value; } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
        __esDecorate(null, null, _author_decorators, { kind: "field", name: "author", static: false, private: false, access: { has: obj => "author" in obj, get: obj => obj.author, set: (obj, value) => { obj.author = value; } }, metadata: _metadata }, _author_initializers, _author_extraInitializers);
        __esDecorate(null, null, _license_decorators, { kind: "field", name: "license", static: false, private: false, access: { has: obj => "license" in obj, get: obj => obj.license, set: (obj, value) => { obj.license = value; } }, metadata: _metadata }, _license_initializers, _license_extraInitializers);
        __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: obj => "category" in obj, get: obj => obj.category, set: (obj, value) => { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
        __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: obj => "tags" in obj, get: obj => obj.tags, set: (obj, value) => { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
        __esDecorate(null, null, _nodes_decorators, { kind: "field", name: "nodes", static: false, private: false, access: { has: obj => "nodes" in obj, get: obj => obj.nodes, set: (obj, value) => { obj.nodes = value; } }, metadata: _metadata }, _nodes_initializers, _nodes_extraInitializers);
        __esDecorate(null, null, _connections_decorators, { kind: "field", name: "connections", static: false, private: false, access: { has: obj => "connections" in obj, get: obj => obj.connections, set: (obj, value) => { obj.connections = value; } }, metadata: _metadata }, _connections_initializers, _connections_extraInitializers);
        __esDecorate(null, null, _executions_decorators, { kind: "field", name: "executions", static: false, private: false, access: { has: obj => "executions" in obj, get: obj => obj.executions, set: (obj, value) => { obj.executions = value; } }, metadata: _metadata }, _executions_initializers, _executions_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Workflow = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Workflow = _classThis;
})();
exports.Workflow = Workflow;

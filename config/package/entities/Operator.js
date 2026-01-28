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
exports.Operator = void 0;
const adb_typeorm_1 = require("adb-typeorm");
let Operator = (() => {
    let _classDecorators = [(0, adb_typeorm_1.Entity)('operators')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _author_decorators;
    let _author_initializers = [];
    let _author_extraInitializers = [];
    let _license_decorators;
    let _license_initializers = [];
    let _license_extraInitializers = [];
    let _type_decorators;
    let _type_initializers = [];
    let _type_extraInitializers = [];
    let _category_decorators;
    let _category_initializers = [];
    let _category_extraInitializers = [];
    let _tags_decorators;
    let _tags_initializers = [];
    let _tags_extraInitializers = [];
    let _codePath_decorators;
    let _codePath_initializers = [];
    let _codePath_extraInitializers = [];
    let _entryPoint_decorators;
    let _entryPoint_initializers = [];
    let _entryPoint_extraInitializers = [];
    let _operatorType_decorators;
    let _operatorType_initializers = [];
    let _operatorType_extraInitializers = [];
    let _inputs_decorators;
    let _inputs_initializers = [];
    let _inputs_extraInitializers = [];
    let _outputs_decorators;
    let _outputs_initializers = [];
    let _outputs_extraInitializers = [];
    let _operatorParams_decorators;
    let _operatorParams_initializers = [];
    let _operatorParams_extraInitializers = [];
    let _executionConfig_decorators;
    let _executionConfig_initializers = [];
    let _executionConfig_extraInitializers = [];
    let _dataVisualization_decorators;
    let _dataVisualization_initializers = [];
    let _dataVisualization_extraInitializers = [];
    let _mockdata_decorators;
    let _mockdata_initializers = [];
    let _mockdata_extraInitializers = [];
    let _metadata_decorators;
    let _metadata_initializers = [];
    let _metadata_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    var Operator = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.version = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _version_initializers, void 0));
            this.description = (__runInitializers(this, _version_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.author = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _author_initializers, void 0));
            this.license = (__runInitializers(this, _author_extraInitializers), __runInitializers(this, _license_initializers, void 0));
            this.type = (__runInitializers(this, _license_extraInitializers), __runInitializers(this, _type_initializers, void 0)); // data_collector, data_processing, data_analysis, etc.
            this.category = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _category_initializers, void 0));
            this.tags = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _tags_initializers, void 0)); // JSON array string
            this.codePath = (__runInitializers(this, _tags_extraInitializers), __runInitializers(this, _codePath_initializers, void 0)); // 代码文件路径（纯前端可视化算子可为空）
            this.entryPoint = (__runInitializers(this, _codePath_extraInitializers), __runInitializers(this, _entryPoint_initializers, void 0)); // 入口类名或函数名（纯前端可视化算子可为空）
            this.operatorType = (__runInitializers(this, _entryPoint_extraInitializers), __runInitializers(this, _operatorType_initializers, void 0)); // local_python, local_go, local_rust（纯前端可视化算子可为空）
            this.inputs = (__runInitializers(this, _operatorType_extraInitializers), __runInitializers(this, _inputs_initializers, void 0)); // JSON array string
            this.outputs = (__runInitializers(this, _inputs_extraInitializers), __runInitializers(this, _outputs_initializers, void 0)); // JSON array string
            this.operatorParams = (__runInitializers(this, _outputs_extraInitializers), __runInitializers(this, _operatorParams_initializers, void 0)); // JSON object string
            this.executionConfig = (__runInitializers(this, _operatorParams_extraInitializers), __runInitializers(this, _executionConfig_initializers, void 0)); // JSON object string
            this.dataVisualization = (__runInitializers(this, _executionConfig_extraInitializers), __runInitializers(this, _dataVisualization_initializers, void 0)); // JSON object string
            this.mockdata = (__runInitializers(this, _dataVisualization_extraInitializers), __runInitializers(this, _mockdata_initializers, void 0)); // JSON object string
            this.metadata = (__runInitializers(this, _mockdata_extraInitializers), __runInitializers(this, _metadata_initializers, void 0)); // JSON object string
            this.createdAt = (__runInitializers(this, _metadata_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Operator");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, adb_typeorm_1.PrimaryColumn)('varchar', { length: 100 })];
        _name_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 200 })];
        _version_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50 })];
        _description_decorators = [(0, adb_typeorm_1.Column)('text')];
        _author_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _license_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50 })];
        _type_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50 })];
        _category_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 100 })];
        _tags_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _codePath_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 500, nullable: true })];
        _entryPoint_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 200, nullable: true })];
        _operatorType_decorators = [(0, adb_typeorm_1.Column)('varchar', { length: 50, nullable: true })];
        _inputs_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _outputs_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _operatorParams_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _executionConfig_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _dataVisualization_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _mockdata_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _metadata_decorators = [(0, adb_typeorm_1.Column)('text', { nullable: true })];
        _createdAt_decorators = [(0, adb_typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, adb_typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _version_decorators, { kind: "field", name: "version", static: false, private: false, access: { has: obj => "version" in obj, get: obj => obj.version, set: (obj, value) => { obj.version = value; } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _author_decorators, { kind: "field", name: "author", static: false, private: false, access: { has: obj => "author" in obj, get: obj => obj.author, set: (obj, value) => { obj.author = value; } }, metadata: _metadata }, _author_initializers, _author_extraInitializers);
        __esDecorate(null, null, _license_decorators, { kind: "field", name: "license", static: false, private: false, access: { has: obj => "license" in obj, get: obj => obj.license, set: (obj, value) => { obj.license = value; } }, metadata: _metadata }, _license_initializers, _license_extraInitializers);
        __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: obj => "type" in obj, get: obj => obj.type, set: (obj, value) => { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
        __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: obj => "category" in obj, get: obj => obj.category, set: (obj, value) => { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
        __esDecorate(null, null, _tags_decorators, { kind: "field", name: "tags", static: false, private: false, access: { has: obj => "tags" in obj, get: obj => obj.tags, set: (obj, value) => { obj.tags = value; } }, metadata: _metadata }, _tags_initializers, _tags_extraInitializers);
        __esDecorate(null, null, _codePath_decorators, { kind: "field", name: "codePath", static: false, private: false, access: { has: obj => "codePath" in obj, get: obj => obj.codePath, set: (obj, value) => { obj.codePath = value; } }, metadata: _metadata }, _codePath_initializers, _codePath_extraInitializers);
        __esDecorate(null, null, _entryPoint_decorators, { kind: "field", name: "entryPoint", static: false, private: false, access: { has: obj => "entryPoint" in obj, get: obj => obj.entryPoint, set: (obj, value) => { obj.entryPoint = value; } }, metadata: _metadata }, _entryPoint_initializers, _entryPoint_extraInitializers);
        __esDecorate(null, null, _operatorType_decorators, { kind: "field", name: "operatorType", static: false, private: false, access: { has: obj => "operatorType" in obj, get: obj => obj.operatorType, set: (obj, value) => { obj.operatorType = value; } }, metadata: _metadata }, _operatorType_initializers, _operatorType_extraInitializers);
        __esDecorate(null, null, _inputs_decorators, { kind: "field", name: "inputs", static: false, private: false, access: { has: obj => "inputs" in obj, get: obj => obj.inputs, set: (obj, value) => { obj.inputs = value; } }, metadata: _metadata }, _inputs_initializers, _inputs_extraInitializers);
        __esDecorate(null, null, _outputs_decorators, { kind: "field", name: "outputs", static: false, private: false, access: { has: obj => "outputs" in obj, get: obj => obj.outputs, set: (obj, value) => { obj.outputs = value; } }, metadata: _metadata }, _outputs_initializers, _outputs_extraInitializers);
        __esDecorate(null, null, _operatorParams_decorators, { kind: "field", name: "operatorParams", static: false, private: false, access: { has: obj => "operatorParams" in obj, get: obj => obj.operatorParams, set: (obj, value) => { obj.operatorParams = value; } }, metadata: _metadata }, _operatorParams_initializers, _operatorParams_extraInitializers);
        __esDecorate(null, null, _executionConfig_decorators, { kind: "field", name: "executionConfig", static: false, private: false, access: { has: obj => "executionConfig" in obj, get: obj => obj.executionConfig, set: (obj, value) => { obj.executionConfig = value; } }, metadata: _metadata }, _executionConfig_initializers, _executionConfig_extraInitializers);
        __esDecorate(null, null, _dataVisualization_decorators, { kind: "field", name: "dataVisualization", static: false, private: false, access: { has: obj => "dataVisualization" in obj, get: obj => obj.dataVisualization, set: (obj, value) => { obj.dataVisualization = value; } }, metadata: _metadata }, _dataVisualization_initializers, _dataVisualization_extraInitializers);
        __esDecorate(null, null, _mockdata_decorators, { kind: "field", name: "mockdata", static: false, private: false, access: { has: obj => "mockdata" in obj, get: obj => obj.mockdata, set: (obj, value) => { obj.mockdata = value; } }, metadata: _metadata }, _mockdata_initializers, _mockdata_extraInitializers);
        __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: obj => "metadata" in obj, get: obj => obj.metadata, set: (obj, value) => { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Operator = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Operator = _classThis;
})();
exports.Operator = Operator;

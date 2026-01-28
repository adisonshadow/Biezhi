# AI 协助工作流设计指南

## 📋 文档概述

本文档定义了AI协助工作流设计的完整方案，包括功能需求、技术架构、接口设计和实施路线图。本文档为后续开发提供详细的技术规范和使用指南。

---

## 📑 目录

1. [方案概述](#1-方案概述)
2. [核心功能需求](#2-核心功能需求)
3. [扩展功能建议](#3-扩展功能建议)
4. [技术实现方案](#4-技术实现方案)
5. [接口设计规范](#5-接口设计规范)
6. [使用场景示例](#6-使用场景示例)
7. [实施路线图](#7-实施路线图)
8. [前端实现细节](#8-前端实现细节)

---

## 1. 方案概述

### 1.1 目标

通过AI助手提供智能化的工作流设计辅助，降低工作流设计门槛，提高设计效率和质量。AI助手能够理解用户意图，自动完成工作流相关的各种操作，包括设计、优化、调试等。

### 1.2 核心价值

- **智能化设计**：根据用户需求自动生成工作流结构
- **自动化优化**：识别并修复工作流中的问题
- **智能推荐**：基于上下文推荐合适的算子
- **自动化配置**：智能配置算子参数
- **智能调试**：自动诊断和修复执行错误
- **数据对齐**：自动处理算子间的数据格式不匹配问题

### 1.3 实现方式

推荐使用 **Function Calling（工具调用）** 方式实现。详细设计请参考 [FUNCTION_CALL_DESIGN.md](./FUNCTION_CALL_DESIGN.md)。

---

## 2. 核心功能需求

### 2.1 自动优化整个工作流

**功能描述**：AI分析当前工作流结构，识别性能瓶颈、冗余节点、不合理连接等问题，并提供优化建议或自动优化。

**使用场景**：
- 用户："帮我优化一下这个工作流"
- 检测循环依赖、孤立节点、执行顺序不合理等问题
- 识别可以合并的节点
- 优化数据流向和节点布局

**实现要点**：
- 分析工作流的拓扑结构
- 检测图完整性（参考 `validate_workflow_graph`）
- 分析执行顺序和并行度
- 识别冗余和可优化的部分

### 2.2 自动设计工作流

**功能描述**：根据用户描述的需求，自动生成完整的工作流结构，包括节点选择、连接关系、参数配置等。

**使用场景**：
- 用户："我要做一个LinkedIn公司数据分析工作流，从CSV读取，清洗数据，按国家分组统计，然后保存到数据库"
- AI自动生成包含文件读取、数据清洗、数据分析、数据保存的完整工作流

**实现要点**：
- 理解用户需求，分解任务步骤
- 选择合适的算子组合
- 配置节点间的连接关系
- 自动设置初始参数配置
- 验证生成的工作流完整性

### 2.3 自动创建算子

**功能描述**：根据用户描述的功能需求，自动生成算子的完整代码、配置文件和依赖。注意：AI创建算子代码的时间比较长，并且不可能一次完成，因此采用分步创建的方式。

**使用场景**：
- 用户："我需要一个算子，用于将CSV文件的列名转换为小写"
- AI分步生成算子：先创建 operator.yaml，然后逐步添加 main.py、requirements.txt 等文件

**实现要点**：
- **第一步**：调用 `/api/operators/create` 接口创建 operator.yaml
  - 此接口只创建 operator.yaml 文件，不自动注册算子
  - operator.yaml 必须包含 `file_structure` 信息块，用于描述算子目录下各文件的作用，帮助AI快速理解这个算子
  - `file_structure` 格式示例：
    ```yaml
    file_structure:
      "main.py": "算子的主要代码文件，包含算子的核心逻辑"
      "requirements.txt": "Python依赖包列表"
      "test_data.json": "测试数据文件"
      "preview/main.tsx": "数据可视化前端组件入口文件"
    ```
- **第二步**：使用文件操作接口逐步添加或编辑文件
  - `/api/operators/file/add/:filename` - 添加新文件（path 参数在请求体中）
  - `/api/operators/file/edit/:filename` - 编辑现有文件，包括 operator.yaml（path 参数在请求体中）
  - `/api/operators/file/delete/:filename` - 删除文件，不能删除 operator.yaml（path 参数在请求体中）
  - path 参数在请求体中，以算子目录为 root（可选，例如 "preview" 表示 preview/main.tsx）
- **第三步**：当所有文件创建完成后，调用 `/api/operators` 接口注册算子

**重要约束**：
- **只有 Custom_operators 目录下的算子才可以编辑**
- 如非正在创建算子，如无特别必要，不要直接修改别的算子
- 所有文件操作接口都需要验证 operatorPath 必须以 `Custom_operators/` 开头

**AI创建算子的最佳实践**：
- AI应该分步进行：先创建 operator.yaml，然后逐步添加其他文件
- 每次只创建或修改一个文件，确保文件内容的正确性
- 在 `file_structure` 中详细描述每个文件的作用，帮助后续快速理解算子结构
- 如果后续添加了新文件，应该更新 `file_structure`（通过 edit 接口）

### 2.4 选择算子并添加到工作流

**功能描述**：AI根据上下文（当前工作流、用户需求）推荐合适的算子，并自动添加到工作流中。

**使用场景**：
- 用户："在工作流中添加一个数据可视化节点"
- AI搜索匹配的算子，选择最合适的，添加到工作流合适的位置

**实现要点**：
- 基于算子描述、标签、输入输出类型进行语义搜索
- 考虑当前工作流的数据流和上下文
- 自动确定节点的插入位置
- 自动建立连接关系

### 2.5 自动配置算子

**功能描述**：根据算子定义和当前数据上下文，自动配置算子的参数。

**使用场景**：
- 用户："配置数据清洗节点，自动填充缺失值"
- AI根据数据结构和算子参数定义，自动设置合适的参数值

**实现要点**：
- 分析算子的operatorParams定义
- **对于弱类型数据（不固定结构）**：先调用 `get_node_upstream_data_structure` 获取上游节点的实际数据结构片段
- 基于上游节点的输出数据特征进行智能推断
- 使用默认值或基于数据的启发式规则
- 验证参数的有效性

**重要提示**：
- 当上游节点的输出是弱类型（如 `list`、`dict`、`object` 等不固定结构）时，AI应该：
  1. 先调用 `get_node_upstream_data_structure` 获取实际的数据结构片段
  2. 分析数据结构，了解字段名称、类型、嵌套结构等
  3. 基于实际数据结构配置节点参数（如字段映射、过滤条件等）
- 如果上游节点输出是强类型（如 `pandas.DataFrame`），可以直接使用 `get_node_upstream_data_features` 获取数据特征

### 2.6 自动调试

**功能描述**：分析工作流执行错误，自动诊断问题并提供修复建议或自动修复。

**使用场景**：
- 工作流执行失败后，用户："帮我看看哪里出错了"
- AI分析执行日志，识别错误节点和原因，提供修复方案

**实现要点**：
- 分析执行日志和错误信息
- 定位失败的节点
- 识别错误类型（配置错误、数据类型不匹配、依赖缺失等）
- 提供修复建议或自动修复
- 可选：提供测试建议

### 2.7 自动添加数据对齐节点

**功能描述**：当两个算子的输入输出类型不匹配时，自动在中间插入数据对齐节点。

**使用场景**：
- 用户选中两个节点："在这两个节点之间添加对齐节点"
- AI分析两个节点的输入输出类型，自动插入合适的data_align类型算子

**实现要点**：
- 分析源节点的outputs定义
- 分析目标节点的inputs定义
- 识别类型不匹配的部分
- 搜索或创建合适的数据对齐算子
- 自动插入并建立连接关系

### 2.8 添加选中对象到AI Chat

**功能描述**：当用户在画布上选择节点或边时，自动将选中对象的信息添加到AI Chat的上下文中，并在输入框上方显示选中对象的标签，方便用户基于选中对象与AI交互。

**使用场景**：
- 用户选中一个或多个节点，然后问AI："帮我配置这些节点"
- 用户选中一条边，然后问AI："这个连接有问题吗？"
- 用户选中两个节点，然后问AI："在这两个节点之间添加对齐节点"

**UI设计**：
- 在Chat的Sender组件上方显示一个"选中对象"区域
- 显示选中的节点和边的标签（可点击移除）
- 支持多选，显示多个对象的标签
- 当没有选中对象时，该区域自动隐藏

**实现要点**：
- 监听Canvas的选中状态变化（`onSelectionChange`）
- 将选中的节点ID和边ID传递给AIChatPanel
- 在AIChatPanel中显示选中对象的标签卡片
- 在发送消息时，将选中对象信息注入到AI上下文
- 提供Function来获取选中对象的详细信息（`get_selected_objects_detail`）

**上下文注入格式**：
```
## 当前选中的对象

### 选中的节点 (2个)
- **节点1**: node_data_cleaner
  - 算子: 数据清洗 (op_92f78edd)
  - 类型: processor
  - 配置: {...}
  
- **节点2**: node_data_analyzer
  - 算子: 数据分析 (op_41093a82)
  - 类型: processor
  - 配置: {...}

### 选中的边 (1条)
- **连接**: node_data_cleaner[output] -> node_data_analyzer[input]
  - 源节点: node_data_cleaner
  - 目标节点: node_data_analyzer
```

### 2.9 版本回滚

**功能描述**：当AI对工作流进行了修改时，在用户消息的右侧显示版本回滚按钮，允许用户一键回滚到修改前的版本。

**使用场景**：
- 用户："帮我优化这个工作流"
- AI执行了工作流修改操作（添加节点、删除节点、修改配置等）
- 用户发现修改不符合预期，点击回滚按钮恢复到修改前

**UI设计**：
- 在用户消息气泡的右侧显示回滚按钮（仅当该消息导致工作流修改时显示）
- 按钮图标：回退/撤销图标
- 按钮提示：悬停显示"回滚到修改前版本"
- 点击按钮后，显示确认对话框，确认后执行回滚

**实现要点**：
- 在AI执行修改操作前，自动保存当前工作流的快照
- 将快照与消息ID关联，存储在消息元数据中
- 检测Function Call是否包含工作流修改操作（如`add_node_to_workflow`、`update_workflow`等）
- 如果包含修改操作，在消息渲染时显示回滚按钮
- 点击回滚时，调用`rollback_workflow_version`函数恢复工作流

**版本快照内容**：
- 工作流完整配置（nodes、connections、基本信息等）
- 快照时间戳
- 修改操作类型和描述
- 修改前后的差异摘要

**回滚操作**：
- 恢复工作流配置到快照状态
- 更新前端画布显示
- 可选：在消息中显示回滚成功的提示

---

## 3. 扩展功能建议

### 3.1 工作流验证与修复

**功能描述**：自动验证工作流的完整性、正确性，并修复常见问题。

**功能点**：
- 检测未连接的输入端口
- 检测循环依赖
- 检测数据类型不匹配
- 检测配置缺失
- 自动修复简单问题（如连接缺失、配置错误）

### 3.2 智能算子推荐

**功能描述**：基于当前工作流状态和用户需求，主动推荐相关算子。

**功能点**：
- 基于已选算子推荐相关算子
- 基于工作流类型推荐常用算子组合
- 基于数据特征推荐处理算子
- 推荐热门或常用算子

### 3.3 工作流模板生成

**功能描述**：基于常见场景，生成工作流模板供用户选择。

**功能点**：
- 数据分析模板（ETL流程）
- 机器学习模板（特征工程→模型训练→评估）
- 数据可视化模板
- 自定义模板保存和复用

### 3.4 工作流性能分析

**功能描述**：分析工作流的执行性能，提供优化建议。

**功能点**：
- 分析每个节点的执行时间
- 识别性能瓶颈节点
- 建议并行执行优化
- 建议缓存策略
- 估算总体执行时间

### 3.5 工作流版本对比

**功能描述**：对比不同版本的工作流，显示变更内容。

**功能点**：
- 节点增删改对比
- 连接关系变更对比
- 配置参数变更对比
- 生成变更说明

### 3.6 工作流文档生成

**功能描述**：自动生成工作流的详细文档。

**功能点**：
- 生成工作流描述文档
- 生成节点说明文档
- 生成数据流图（文本或图形）
- 生成使用说明

### 3.7 批量操作

**功能描述**：支持批量操作多个节点或工作流。

**功能点**：
- 批量配置相似节点
- 批量替换算子
- 批量删除节点
- 批量执行多个工作流

### 3.8 智能布局优化

**功能描述**：自动优化工作流节点的布局，使图表更清晰易读。

**功能点**：
- 自动调整节点位置
- 优化连接线路径
- 基于数据流自动排列
- 支持不同的布局算法（层次布局、力导向布局等）

---

## 4. 技术实现方案

> **注意**：Function Calling 相关的详细设计（包括架构设计、函数列表、Schema定义等）已移至 [FUNCTION_CALL_DESIGN.md](./FUNCTION_CALL_DESIGN.md)。

### 4.1 上下文信息注入

AI需要了解以下上下文信息才能做出正确的决策：

#### 4.1.1 当前工作流上下文
- 工作流基本信息（ID、名称、描述）
- 所有节点及其配置
- 所有连接关系
- 执行顺序
- 验证状态和问题

#### 4.1.2 算子库上下文
- 所有可用算子列表
- 算子的详细信息（输入输出、参数、标签等）
- 算子使用统计和热门程度

#### 4.1.3 执行上下文（如果工作流已执行）
- 执行历史
- 节点执行结果
- 错误日志
- 性能数据

#### 4.1.4 用户交互上下文
- 当前选中的节点
- 当前选中的连接
- 用户最近的操作历史

### 4.2 提示词工程

#### 4.2.1 System Prompt 设计

```markdown
你是一个专业的AI工作流设计助手，专门帮助用户设计、优化和调试数据工作流。

你的能力包括：
1. 理解用户需求并自动生成工作流
2. 分析工作流结构并提供优化建议
3. 推荐合适的算子
4. 自动配置算子参数
5. 诊断和修复执行错误
6. 处理数据对齐问题

重要原则：
- 始终验证工作流的完整性
- 确保数据类型匹配
- 考虑执行效率和性能
- 提供清晰的解释和建议
- 在修改工作流前确认用户的意图
```

#### 4.2.2 工作流上下文注入

使用现有的 `generateWorkflowDetailPrompt` 函数生成工作流详情，注入到AI对话上下文中。

#### 4.2.3 选中对象上下文注入

当用户在画布上选中节点或边时，需要将选中对象的信息注入到AI上下文：

**注入时机**：
- 用户发送消息时，如果有选中的对象，自动注入选中对象信息
- 选中对象变化时，更新上下文（但不立即发送消息）

**注入格式**：
```markdown
## 当前选中的对象

### 选中的节点 (N个)
[节点详细信息列表，包括节点ID、算子信息、配置等]

### 选中的边 (M条)
[边详细信息列表，包括连接关系、源节点、目标节点等]
```

**实现方式**：
1. 前端监听Canvas的`onSelectionChange`事件
2. 将选中的节点ID和边ID传递给AIChatPanel
3. AIChatPanel在Sender上方显示选中对象的标签卡片
4. 发送消息时，调用`get_selected_objects_detail`获取详细信息
5. 将详细信息格式化后注入到消息上下文

---

## 5. 接口设计规范

> **注意**：Function Calling Schema 定义和详细接口设计已移至 [FUNCTION_CALL_DESIGN.md](./FUNCTION_CALL_DESIGN.md)。

### 5.1 错误处理

所有Function Call都应该：
1. 返回标准化的错误格式
2. 提供详细的错误信息
3. 给出修复建议（如果可能）
4. 记录错误日志用于后续改进

**错误响应格式**：
```json
{
  "success": false,
  "error": {
    "code": "INVALID_WORKFLOW",
    "message": "工作流ID不存在",
    "details": {},
    "suggestions": [
      "请检查工作流ID是否正确",
      "或者创建一个新的工作流"
    ]
  }
}
```

---

## 6. 使用场景示例

### 6.1 场景1：从零开始设计工作流

**用户输入**：
> "我要创建一个LinkedIn公司数据分析工作流，从CSV文件读取数据，清洗数据，按国家分组统计，然后保存到数据库"

**AI处理流程**：
1. 调用 `search_operators` 搜索文件读取、数据清洗、数据分析、数据保存算子
2. 调用 `design_workflow` 创建工作流结构
3. 自动配置各节点参数
4. 验证工作流完整性
5. 返回创建结果

**AI响应**：
> 我已经为您创建了一个LinkedIn公司数据分析工作流，包含以下节点：
> 1. JSON文件导入节点（读取CSV）
> 2. 数据清洗节点（处理缺失值和重复数据）
> 3. 数据分析节点（按国家分组统计）
> 4. 数据保存节点（保存到数据库）
> 
> 工作流已创建，您可以查看并进一步调整配置。

### 6.2 场景2：优化现有工作流

**用户输入**：
> "帮我优化一下这个工作流"

**AI处理流程**：
1. 调用 `get_workflow_detail` 获取当前工作流详情
2. 调用 `validate_workflow` 验证工作流
3. 调用 `optimize_workflow` 分析并优化
4. 识别问题：发现有一个孤立节点未连接
5. 自动修复或提供建议

**AI响应**：
> 我分析了您的工作流，发现了以下问题：
> 1. ⚠️ 节点"node3"是孤立节点，没有与其他节点连接
> 2. ✅ 检测到可以并行执行的节点对（node1和node2）
> 3. 💡 建议：将数据清洗节点的配置优化，可以提升10%的性能
> 
> 我已经自动修复了孤立节点问题。是否应用其他优化建议？

### 6.3 场景3：添加数据对齐节点

**用户操作**：选中两个节点

**用户输入**：
> "在这两个节点之间添加对齐节点"

**AI处理流程**：
1. 获取两个节点的算子信息
2. 分析源节点的outputs和目标节点的inputs
3. 发现类型不匹配：源输出是`pandas.DataFrame`，目标需要`dict`
4. 调用 `search_operators` 搜索数据对齐算子
5. 调用 `add_data_align_node` 插入对齐节点
6. 自动建立连接关系

**AI响应**：
> 我已经检测到类型不匹配问题：
> - 源节点输出：`pandas.DataFrame`
> - 目标节点需要：`dict`
> 
> 我已经在中间插入了数据转换节点，将DataFrame转换为字典格式。连接关系已自动建立。

### 6.4 场景4：自动调试

**用户输入**：
> "刚才执行失败了，帮我看看哪里出错了"

**AI处理流程**：
1. 获取最近的执行记录
2. 调用 `analyze_execution_error` 分析错误
3. 定位到失败的节点：node2
4. 分析错误原因：参数配置错误，filter_column不存在
5. 提供修复建议或自动修复

**AI响应**：
> 我分析了执行错误，问题出在"数据过滤"节点（node2）：
> 
> **错误原因**：配置参数`filter_column`的值"city"在输入数据中不存在
> 
> **可用列名**：name, age, country, followers
> 
> **修复建议**：
> 1. 将`filter_column`改为"country"（最接近的匹配）
> 2. 或者先查看数据，确认正确的列名
> 
> 需要我自动修复吗？

### 6.5 场景5：自动创建算子

**用户输入**：
> "我需要一个算子，用于将CSV文件的列名转换为小写"

**AI处理流程**（分步进行）：
1. **第一步**：理解需求，生成 operator.yaml 配置（包含 file_structure 信息块）
2. 调用 `/api/operators/create` 接口创建 operator.yaml（不自动注册）
3. **第二步**：逐步添加文件
   - 调用 `/api/operators/file/add` 添加 main.py（算子核心代码）
   - 调用 `/api/operators/file/add` 添加 requirements.txt（依赖列表）
   - 调用 `/api/operators/file/add` 添加 test_data.json（测试数据）
4. **第三步**：当所有文件创建完成后，调用 `/api/operators` 接口注册算子

**AI响应**（分步响应）：
> 我已经开始为您创建算子"列名转小写"（column_name_lowercase）：
> 
> **第一步：已创建 operator.yaml**
> ✅ 已在 Custom_operators/550e8400-e29b-41d4-a716-446655440000/ 创建 operator.yaml
> ✅ operator.yaml 包含 file_structure 信息块，描述了各文件的作用
> 
> **第二步：正在添加文件...**
> ✅ 已添加 main.py（算子核心代码）
> ✅ 已添加 requirements.txt（依赖：pandas, py-operator-sdk）
> ✅ 已添加 test_data.json（测试数据）
> 
> **第三步：正在注册算子...**
> ✅ 算子已成功注册到系统中，ID: op_550e8400
> 
> 📁 保存位置：Custom_operators/550e8400-e29b-41d4-a716-446655440000/
> 
> 您现在可以在工作流中使用这个算子了！

### 6.6 场景6：基于选中对象操作

**用户操作**：在画布上选中两个节点（node_data_cleaner 和 node_data_analyzer）

**UI显示**：在AI Chat的Sender上方显示选中对象标签：
```
已选中: [数据清洗节点 ×] [数据分析节点 ×]
```

**用户输入**：
> "帮我配置这两个节点"

**AI处理流程**：
1. 检测到有选中对象，调用 `get_selected_objects_detail` 获取详细信息
2. 分析两个节点的算子定义和当前配置
3. 基于上游数据特征和算子参数定义，智能配置参数
4. 调用 `auto_configure_node` 更新节点配置
5. 验证配置的有效性

**AI响应**：
> 我已经分析了您选中的两个节点，并进行了智能配置：
> 
> **数据清洗节点**：
> - 已设置 `drop_na_strategy: fill_numeric_mean`（基于数据特征自动选择）
> - 已启用 `remove_duplicates: true`
> 
> **数据分析节点**：
> - 已设置 `group_by_columns: country_code`（检测到数据中有此列）
> - 已设置 `aggregate_functions: count,mean,max`
> 
> 配置已完成，您可以查看节点面板确认或进一步调整。

### 6.7 场景7：检查选中连接

**用户操作**：在画布上选中一条边（连接）

**UI显示**：在AI Chat的Sender上方显示选中对象标签：
```
已选中: [node_data_cleaner → node_data_analyzer ×]
```

**用户输入**：
> "这个连接有问题吗？"

**AI处理流程**：
1. 调用 `get_selected_objects_detail` 获取连接的详细信息
2. 分析源节点的输出类型和目标节点的输入类型
3. 检查类型兼容性
4. 检查连接配置是否正确
5. 提供分析结果

**AI响应**：
> 我检查了您选中的连接：
> 
> **连接信息**：
> - 源节点：数据清洗 (node_data_cleaner)
> - 目标节点：数据分析 (node_data_analyzer)
> - 端口：output → input
> 
> **兼容性检查**：
> ✅ 数据类型匹配：源输出 `pandas.DataFrame` 与目标输入 `pandas.DataFrame` 兼容
> ✅ 连接配置正确
> ✅ 数据流路径有效
> 
> 这个连接没有问题，可以正常执行。

### 6.8 场景8：版本回滚

**用户输入**：
> "帮我优化一下这个工作流"

**AI处理流程**：
1. 在执行修改前，自动调用 `create_workflow_checkpoint` 创建快照
2. 调用 `optimize_workflow` 优化工作流
3. AI执行了以下修改：
   - 删除了2个冗余节点
   - 添加了1个数据对齐节点
   - 修改了3个节点的配置
4. 将快照ID与消息ID关联，存储在消息元数据中

**UI显示**：
- 用户消息气泡右侧显示回滚按钮（🔄）
- 悬停提示："回滚到修改前版本"

**用户操作**：点击回滚按钮

**AI处理流程**：
1. 显示确认对话框："确定要回滚到优化前的版本吗？这将撤销所有优化操作。"
2. 用户确认后，调用 `rollback_workflow_version` 函数
3. 恢复工作流到快照状态
4. 更新前端画布显示
5. 显示成功提示："工作流已回滚到修改前的版本"

**AI响应**：
> ✅ 工作流已成功回滚到优化前的版本。
> 
> **回滚的变更**：
> - 恢复了2个被删除的节点
> - 移除了1个数据对齐节点
> - 恢复了3个节点的原始配置
> 
> 工作流已恢复到您请求优化前的状态。

---

## 7. 未来进化路线
暂不设计

---

## 8. 前端实现细节

### 8.1 选中对象UI组件设计

#### 8.1.1 组件位置

在AIChatPanel的Sender组件上方添加"选中对象"区域：

```
┌─────────────────────────────────┐
│  AI 助手                          │
├─────────────────────────────────┤
│  [消息列表]                       │
│                                  │
├─────────────────────────────────┤
│  [选中对象区域] ← 新增            │
│  ┌─────────────────────────┐   │
│  │ 已选中:                  │   │
│  │ [数据清洗节点 ×]         │   │
│  │ [数据分析节点 ×]         │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  [模型选择] [输入框]            │
└─────────────────────────────────┘
```

#### 8.1.2 组件实现

**Props接口**：
```typescript
interface SelectedObjectsProps {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  workflow: Workflow;
  operators: Operator[];
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  onClearAll: () => void;
}
```

**显示逻辑**：
- 当 `selectedNodeIds.length === 0 && selectedEdgeIds.length === 0` 时，隐藏组件
- 显示节点标签：显示节点名称（从operator获取）或节点ID
- 显示边标签：显示"源节点名 → 目标节点名"格式
- 每个标签有删除按钮（×），点击可移除单个对象
- 提供"清除全部"按钮

#### 8.1.3 数据流

```
Canvas (onSelectionChange)
  ↓
WorkflowDesigner (handleSelectionChange)
  ↓
AIChatPanel (selectedNodeIds, selectedEdgeIds)
  ↓
SelectedObjects组件 (显示标签)
  ↓
用户发送消息时
  ↓
调用 get_selected_objects_detail
  ↓
注入到AI上下文
```

### 8.2 上下文注入实现

#### 8.2.1 注入时机

在`handleUserSubmit`函数中，发送消息前：

```typescript
const handleUserSubmit = async (val: string) => {
  // 1. 检查是否有选中对象
  if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
    // 2. 调用API获取选中对象详情
    const selectedObjects = await api.getSelectedObjectsDetail({
      workflow_id: workflow.id,
      node_ids: selectedNodeIds,
      edge_ids: selectedEdgeIds,
    });
    
    // 3. 格式化选中对象信息
    const selectedObjectsContext = formatSelectedObjectsContext(selectedObjects);
    
    // 4. 将选中对象信息添加到消息上下文
    const messageWithContext = `${selectedObjectsContext}\n\n用户消息：${val}`;
    
    onRequest({
      messages: [{ role: 'user', content: messageWithContext }],
    });
  } else {
    // 没有选中对象，直接发送
    onRequest({
      messages: [{ role: 'user', content: val }],
    });
  }
  
  listRef.current?.scrollTo({ top: 'bottom' });
};
```

#### 8.2.2 格式化函数

```typescript
function formatSelectedObjectsContext(data: SelectedObjectsDetail): string {
  const lines: string[] = [];
  
  lines.push('## 当前选中的对象');
  lines.push('');
  
  if (data.nodes && data.nodes.length > 0) {
    lines.push(`### 选中的节点 (${data.nodes.length}个)`);
    data.nodes.forEach((node, index) => {
      lines.push(`- **节点${index + 1}**: ${node.node_id}`);
      lines.push(`  - 算子: ${node.operator_name} (${node.operator_id})`);
      lines.push(`  - 类型: ${node.node_type || '未设置'}`);
      if (node.config) {
        lines.push(`  - 配置: ${JSON.stringify(node.config, null, 2)}`);
      }
      lines.push('');
    });
  }
  
  if (data.edges && data.edges.length > 0) {
    lines.push(`### 选中的边 (${data.edges.length}条)`);
    data.edges.forEach((edge, index) => {
      lines.push(`- **连接${index + 1}**: ${edge.from_node}[${edge.from_port}] -> ${edge.to_node}[${edge.to_port}]`);
      lines.push(`  - 源节点: ${edge.from_node}`);
      lines.push(`  - 目标节点: ${edge.to_node}`);
      lines.push('');
    });
  }
  
  return lines.join('\n');
}
```

### 8.3 与Canvas的集成

在WorkflowDesigner中，需要将选中状态传递给AIChatPanel：

```typescript
// WorkflowDesigner.tsx
<AIChatPanel
  selectedNodeIds={selectedNodeIds}
  selectedEdgeIds={selectedEdgeIds}
  workflow={workflow}
  operators={operators}
  onClearSelection={() => {
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }}
/>
```

Canvas组件通过`onSelectionChange`回调通知选中变化：

```typescript
// Canvas.tsx
<ReactFlow
  onSelectionChange={(params) => {
    const selectedNodeIds = params.nodes.map(n => n.id);
    const selectedEdgeIds = params.edges.map(e => e.id);
    onSelectionChange(selectedNodeIds, selectedEdgeIds);
  }}
/>
```

### 8.4 版本回滚实现

> **注意**：版本回滚实现基于浏览器端的Checkpoint版本管理系统。详细设计请参考 [WORKFLOW_CHECKPOINT_VERSION_DESIGN.md](./WORKFLOW_CHECKPOINT_VERSION_DESIGN.md)。

#### 8.4.1 消息元数据结构

在消息对象中添加元数据字段，用于存储checkpoint信息：

```typescript
interface MessageWithMetadata {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    checkpoint_id?: string;  // 关联的checkpoint ID（AI操作创建的快照）
    has_workflow_changes?: boolean;  // 是否包含工作流修改
    operation_type?: 'USER' | 'AI';  // 操作类型
    function_calls?: Array<{
      name: string;
      parameters: any;
      result?: any;
    }>;  // Function调用记录
  };
  status?: 'loading' | 'done' | 'error';
}
```

#### 8.4.2 Checkpoint创建时机

在AI执行Function Call前，检测是否包含工作流修改操作，使用浏览器端的版本历史管理器创建checkpoint：

```typescript
// 修改操作的Function列表
const WORKFLOW_MODIFY_FUNCTIONS = [
  'add_node_to_workflow',
  'remove_node_from_workflow',
  'update_node_config',
  'connect_nodes',
  'disconnect_nodes',
  'add_data_align_node',
  'update_workflow',
  'design_workflow',
  'optimize_workflow',
];

// 在Function Call执行前
async function executeAIFunctionCall(
  functionName: string,
  parameters: any,
  versionHistory: VersionHistoryManager,
  workflow: Workflow
) {
  // 1. 检测是否是修改操作
  const isModifyOperation = WORKFLOW_MODIFY_FUNCTIONS.includes(functionName);
  
  if (!isModifyOperation) {
    // 非修改操作，直接执行
    return await api.callFunction(functionName, parameters);
  }
  
  // 2. 保存AI操作前的工作流状态（创建USER checkpoint）
  const beforeCheckpoint = versionHistory.createCheckpoint(
    computeDelta(previousWorkflow, workflow),
    'USER',
    'USER_AUTO_SAVE',
    {
      description: 'AI操作前自动保存',
    }
  );
  
  // 3. 执行Function Call
  const result = await api.callFunction(functionName, parameters);
  
  // 4. 应用AI修改到工作流
  const updatedWorkflow = applyAIModifications(workflow, result);
  
  // 5. 计算增量Delta并创建AI操作的checkpoint
  const delta = computeDelta(workflow, updatedWorkflow);
  const aiCheckpoint = versionHistory.createCheckpoint(
    delta,
    'AI',
    `AI_${functionName.toUpperCase()}`,
    {
      messageId: currentMessageId,
      description: `AI执行: ${functionName}`,
      functionCall: {
        name: functionName,
        parameters,
      },
    }
  );
  
  // 6. 更新工作流状态
  setWorkflow(updatedWorkflow);
  
  // 7. 保存到浏览器缓存
  await versionHistory.saveToStorage();
  
  return {
    ...result,
    checkpointId: aiCheckpoint.checkpointId,
  };
}
```

**关键改进**：
- 使用浏览器端的`VersionHistoryManager`而非后端API创建checkpoint
- 使用增量Delta而非全量快照，节省存储空间
- AI操作前自动保存用户当前状态
- Checkpoint存储在IndexedDB中，用户未保存前不发送到服务器

#### 8.4.3 回滚按钮显示

在消息渲染时，检查消息元数据，决定是否显示回滚按钮：

```typescript
// AIChatPanel.tsx
const role: BubbleListProps['role'] = {
  user: {
    placement: 'end',
    footer: (message: MessageWithMetadata) => {
      // 如果消息包含工作流修改，显示回滚按钮
      if (message.metadata?.has_workflow_changes && message.metadata?.checkpoint_id) {
        return (
          <Button
            type="text"
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => handleRollback(message.id, message.metadata.checkpoint_id!)}
            title="回滚到修改前版本"
          />
        );
      }
      return null;
    },
  },
  // ...
};
```

#### 8.4.4 回滚操作实现

使用浏览器端的版本历史管理器实现回滚：

```typescript
const handleAIChatRollback = async (
  messageId: string,
  checkpointId: string,
  versionHistory: VersionHistoryManager
) => {
  // 1. 显示确认对话框
  Modal.confirm({
    title: '确认回滚',
    content: '确定要回滚到修改前的版本吗？这将撤销该消息导致的所有工作流修改。',
    okText: '确认回滚',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 2. 找到AI操作前的checkpoint（父checkpoint）
        const aiCheckpoint = versionHistory.getCheckpoint(checkpointId);
        if (!aiCheckpoint || !aiCheckpoint.parentCheckpointId) {
          messageApi.error('无法找到回滚目标版本');
          return;
        }
        
        // 3. 获取AI操作前的版本
        const beforeCheckpoint = versionHistory.getCheckpoint(
          aiCheckpoint.parentCheckpointId
        );
        if (!beforeCheckpoint) {
          messageApi.error('无法找到回滚目标版本');
          return;
        }
        
        // 4. 重建AI操作前的工作流版本
        const rollbackWorkflow = versionHistory.getVersionAtCheckpoint(
          beforeCheckpoint.checkpointId
        );
        
        // 5. 创建回滚checkpoint（标记为AI操作的回滚）
        const rollbackDelta = computeDelta(currentWorkflow, rollbackWorkflow);
        const rollbackCheckpoint = versionHistory.createCheckpoint(
          rollbackDelta,
          'AI',
          'AI_ROLLBACK',
          {
            messageId,
            description: `回滚AI操作: ${aiCheckpoint.operationDescription}`,
            rollbackTarget: checkpointId,
          }
        );
        
        // 6. 更新工作流状态
        setWorkflow(rollbackWorkflow);
        
        // 7. 保存到浏览器缓存
        await versionHistory.saveToStorage();
        
        // 8. 显示成功提示
        messageApi.success('工作流已回滚到修改前的版本');
        
        // 9. 可选：在消息中显示回滚提示
        const changes = analyzeDeltaChanges(rollbackDelta);
        addMessage({
          role: 'assistant',
          content: `✅ 工作流已成功回滚到修改前的版本。\n\n**回滚的变更**：\n${formatRollbackChanges(changes)}`,
        });
      } catch (error) {
        messageApi.error('回滚失败：' + error.message);
      }
    },
  });
};

function formatRollbackChanges(changes: {
  nodesAdded?: number;
  nodesRemoved?: number;
  connectionsAdded?: number;
  connectionsRemoved?: number;
  configsUpdated?: number;
}): string {
  const lines: string[] = [];
  if (changes.nodesRemoved && changes.nodesRemoved > 0) {
    lines.push(`- 恢复了 ${changes.nodesRemoved} 个被删除的节点`);
  }
  if (changes.nodesAdded && changes.nodesAdded > 0) {
    lines.push(`- 移除了 ${changes.nodesAdded} 个新增的节点`);
  }
  if (changes.connectionsRemoved && changes.connectionsRemoved > 0) {
    lines.push(`- 恢复了 ${changes.connectionsRemoved} 条被删除的连接`);
  }
  if (changes.connectionsAdded && changes.connectionsAdded > 0) {
    lines.push(`- 移除了 ${changes.connectionsAdded} 条新增的连接`);
  }
  if (changes.configsUpdated && changes.configsUpdated > 0) {
    lines.push(`- 恢复了 ${changes.configsUpdated} 个节点的原始配置`);
  }
  return lines.join('\n') || '- 无变更';
}
```

**关键改进**：
- 使用浏览器端的`VersionHistoryManager`进行回滚，无需调用后端API
- 基于增量Delta重建版本，而非全量快照恢复
- 创建回滚checkpoint，保留回滚历史记录
- 与Undo/Redo功能兼容（回滚也是版本历史的一部分）

#### 8.4.5 与Undo/Redo的集成

AI Chat的回滚操作与工作流设计器的Undo/Redo功能共享同一个版本历史：

- **从AI Chat回滚**：创建回滚checkpoint，更新版本历史，Undo/Redo按钮状态同步更新
- **从Undo/Redo**：也可以撤销AI操作，在AI Chat中显示对应的回滚按钮状态
- **版本同步**：两种操作方式都更新同一个版本历史管理器，确保状态一致

详细设计请参考 [WORKFLOW_CHECKPOINT_VERSION_DESIGN.md](./WORKFLOW_CHECKPOINT_VERSION_DESIGN.md) 第9节"与AI Chat的集成"。

---

## 9. 技术考虑

### 9.1 安全性

- **权限控制**：所有修改操作需要验证用户权限
- **输入验证**：严格验证所有Function Call参数
- **操作确认**：对于重要操作（如删除节点），可以要求用户确认
- **操作记录**：记录所有AI操作日志，便于审计

### 9.2 性能优化

- **缓存策略**：缓存工作流详情、算子列表等常用数据
- **异步处理**：对于耗时的操作（如创建算子），使用异步处理
- **批量操作**：支持批量API调用，减少往返次数
- **增量更新**：只更新变更的部分，而不是整个工作流

### 9.3 可维护性

- **模块化设计**：每个Function独立实现，易于测试和维护
- **统一错误处理**：使用统一的错误处理机制
- **日志记录**：详细记录AI决策过程和操作结果
- **版本管理**：对AI生成的内容进行版本管理

### 9.4 AI准确性提升

- **提示词优化**：持续优化System Prompt和上下文注入
- **few-shot示例**：在提示词中加入示例，引导AI正确行为
- **后处理验证**：AI生成结果后进行验证，确保符合规范
- **用户反馈循环**：收集用户反馈，用于改进AI行为

---

## 10. 总结

本方案提供了完整的AI协助工作流设计指南，包括：

1. **完整的功能清单**：覆盖用户提出的所有需求，并补充了扩展功能
2. **明确的技术方案**：选择Function Calling作为实现方式，并给出了详细的架构设计
3. **详细的接口规范**：定义了所有Function的Schema，便于开发实现
4. **实用的使用场景**：提供了多个典型场景的示例，帮助理解如何使用
5. **清晰的实施路线**：分阶段实施，确保项目稳步推进


---

## 附录

### A. 参考文档

- [FUNCTION_CALL_DESIGN.md](./FUNCTION_CALL_DESIGN.md) - Function Call 详细设计文档
- [WORKFLOW_STANDARD_FOR_AI.md](./WORKFLOW_STANDARD_FOR_AI.md) - 工作流标准规范
- [OPERATOR_STANDARD_FOR_AI.md](./OPERATOR_STANDARD_FOR_AI.md) - 算子标准规范
- [WORKFLOW_EXECUTION_UPGRADE_DESIGN.md](./WORKFLOW_EXECUTION_UPGRADE_DESIGN.md) - 工作流执行设计
- [WORKFLOW_CHECKPOINT_VERSION_DESIGN.md](./WORKFLOW_CHECKPOINT_VERSION_DESIGN.md) - Checkpoint版本管理设计（版本回滚实现的基础）

### B. 相关代码文件

- `/web/src/components/workflow/AIChatPanel.tsx` - AI聊天面板组件
- `/web/src/AI/workflow/workflowUtils.ts` - 工作流工具函数
- `/api/src/services/WorkflowService.ts` - 工作流服务
- `/api/src/services/OperatorService.ts` - 算子服务
- `/api/src/services/ExecutionService.ts` - 执行服务

### C. 术语表

- **工作流（Workflow）**：由多个节点和连接组成的数据处理流程
- **节点（Node）**：工作流中的一个执行单元，关联一个算子
- **算子（Operator）**：可复用的数据处理逻辑单元
- **连接（Connection）**：定义节点之间的数据流向
- **数据对齐（Data Alignment）**：处理不同节点间的数据格式转换
- **Function Calling**：AI模型调用外部函数的能力
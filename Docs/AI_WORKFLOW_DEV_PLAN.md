
## 1 第一阶段：基础功能（MVP）

**目标**：实现核心功能，验证方案可行性

**任务清单**：
- [✅] 实现Function Calling基础框架
- [✅] 实现工作流上下文注入（使用现有`generateWorkflowDetailPrompt`）
- [✅] 实现 `get_workflow_detail` 函数
- [✅] 实现 `search_operators` 函数
- [✅] 实现 `add_node_to_workflow` 函数（基础版）
- [✅] 实现 `auto_configure_node` 函数（基础版）
- [✅] 实现 `get_selected_objects_detail` 函数
- [✅] 实现浏览器端Checkpoint版本管理系统（参考WORKFLOW_CHECKPOINT_VERSION_DESIGN.md）
- [✅] 实现版本回滚功能（基于浏览器端版本历史管理器）
- [✅] 前端集成Function Calling到AIChatPanel
- [✅] 实现选中对象UI显示（在Sender上方显示标签卡片）
- [✅] 实现选中对象上下文注入机制
- [✅] 实现版本回滚UI（assistant消息footer中回滚按钮）
- [✅] 实现AI操作checkpoint自动创建机制（Function Call执行后自动创建）


### 2 第二阶段：核心功能完善

**目标**：实现所有核心功能

**任务清单**：
- [✅] 实现 `design_workflow` 函数
- [✅] 实现 `optimize_workflow` 函数
- [✅] 实现 `add_data_align_node` 函数
- [✅] 实现 `analyze_execution_error` 函数
- [✅] 实现 `create_operator` 函数（分步创建算子，包括：创建 operator.yaml、文件操作接口、注册算子）
  - [✅] 集成 `/api/operators/create` 接口（只创建 operator.yaml，包含 file_structure 信息块）
  - [✅] 集成文件操作接口（add/edit/delete）
  - [✅] 集成算子注册接口
  - [✅] 在提示词中添加创建算子的指南（只有 Custom_operators 目录下的算子才可以编辑）
  - [✅] 完善错误处理和验证逻辑
    - 在函数中添加详细的错误信息和建议（suggestions字段）
    - 完善参数验证逻辑，提供清晰的错误提示
    - 统一错误响应格式，包含错误代码、消息、详情和建议
  - [✅] 优化AI提示词，提高准确性
    - 创建系统提示词文件（systemPrompt.ts），定义AI助手的行为准则
    - 在AIChatPanel中自动注入系统提示词（首次对话时）
    - 系统提示词包含核心能力、重要原则、函数调用最佳实践等

### 3 第三阶段：扩展功能

**目标**：实现扩展功能，提升用户体验

**任务清单**：
- [ ] 实现智能算子推荐（`recommend_operators`）
- [ ] 实现工作流性能分析
- [ ] 实现工作流模板生成
- [ ] 实现批量操作功能
- [ ] 实现智能布局优化
- [ ] 实现工作流文档生成

### 7.4 第四阶段：优化与迭代

**目标**：优化性能，改进AI准确性，用户反馈迭代

**任务清单**：
- [ ] 性能优化（缓存、并发等）
- [ ] AI模型调优（基于用户反馈）
- [ ] 增加更多使用场景的测试用例
- [ ] 完善文档和示例
- [ ] 用户培训和使用指南
- [ ] 优化选中对象的交互体验（快捷键、批量操作等）
# Changelog

所有重要的变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2024-01-12

### 新增
- ✨ 初始版本发布
- ✨ 实现核心 SDK 功能
  - 数据访问 API（getInputData, getAllInputData）
  - 数据更新监听（onFullUpdate, onIncrementalUpdate）
  - 节点信息获取（getNodeInfo, getDataVersion）
- ✨ SSE 客户端实现
  - 自动连接和重连机制
  - 全量更新和增量更新支持
- ✨ React Hook 支持（useDataVisualization）
- ✨ 工具函数
  - 配置解析（parseDataVisualizationConfig）
  - 选项验证（validateSDKOptions）
  - SDK 可用性检查（isSDKAvailable）
- ✨ TypeScript 类型定义
- ✨ 完整的文档和示例

### 文档
- 📝 添加 README.md
- 📝 添加使用示例（example.ts）
- 📝 添加 CHANGELOG.md

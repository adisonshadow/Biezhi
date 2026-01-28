# Biezhi2

AI数据计算、分析与报告平台 - 重构版本

⚠️ Beta Version Notice

**Biezhi2 目前处于 Beta 测试阶段**

这是一个 Beta 版本，部分功能可能仍在开发中或存在不稳定性。在使用过程中请注意：

- 🚧 功能可能会发生变化，API 接口可能会调整
- 🐛 可能存在未发现的 Bug，如遇到问题请及时反馈
- ⚡ 性能优化和稳定性改进将持续进行
- 📝 文档和示例可能会更新

我们非常欢迎您的反馈和建议，帮助我们改进产品！如有问题或建议，请通过 Issue 或 Pull Request 提交。

## 项目结构

- `package/` - 实体定义，基于 adb-typeorm
- `api/` - API服务，基于 Koa2
- `web/` - Web前端界面
- `cli/` - 命令行工具
- `config/` - 配置文件

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行API服务

```bash
npm run api:dev
```

### 运行Web前端

```bash
npm run web:dev
```

## 数据库

默认使用 SQLite，并且数据库文件位于 `config/database.db`
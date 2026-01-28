# LinkedIn公司数据分析工作流

## 工作流概述

本工作流用于分析LinkedIn公司信息CSV文件，包括以下步骤：

1. **读取CSV文件** - 使用 `file_selector_processor` 算子读取 `Demo/local_csv/LinkedIn-company-info.csv`
2. **数据清洗** - 使用 `data_cleaner` 算子清理空值、删除重复数据
3. **数据分析** - 使用 `data_analyzer` 算子按国家分组统计公司数量和平均关注者数
4. **保存结果** - 使用 `data_saver` 算子将分析结果保存到数据库

## 使用步骤

### 1. 注册算子

首先需要将所有算子注册到数据库：

```bash
# 使用Python脚本（推荐）
python scripts/register_operators.py

# 或使用Node.js脚本（需要安装依赖）
node scripts/register_operators.js
```

### 2. 创建工作流

通过API创建工作流：

```bash
curl -X POST http://localhost:3991/api/workflows \
  -H "Content-Type: application/json" \
  -d @workflows/linkedin_company_analysis.json
```

或通过Web界面：
1. 打开工作流列表页面
2. 点击"导入工作流"
3. 选择 `workflows/linkedin_company_analysis.json` 文件

### 3. 部署和执行

1. 在工作流设计器中打开工作流
2. 点击"部署"按钮创建工作流执行任务
3. 执行任务会自动运行并保存结果到数据库

## 工作流配置说明

### 节点配置

- **文件读取节点** (`node_file_reader`)
  - 算子: `file_selector_processor`
  - 配置: 读取CSV文件，自动检测数据类型

- **数据清洗节点** (`node_data_cleaner`)
  - 算子: `data_cleaner`
  - 配置: 使用均值填充数值列空值，删除重复行

- **数据分析节点** (`node_data_analyzer`)
  - 算子: `data_analyzer`
  - 配置: 按 `country_code` 分组，统计 `followers` 和 `employees_in_linkedin` 的计数、均值和最大值

- **数据保存节点** (`node_data_saver`)
  - 算子: `data_saver`
  - 配置: 保存到数据库表 `linkedin_company_analysis`

## 结果查看

分析结果保存在数据库表 `linkedin_company_analysis` 中，可以通过以下方式查看：

1. 使用SQLite命令行工具：
```bash
sqlite3 config/analysis_results.db
SELECT * FROM linkedin_company_analysis;
```

2. 通过Web界面的执行任务详情页面查看输出数据

## 自定义配置

可以根据需要修改工作流配置：

- **修改分组列**: 在 `node_data_analyzer` 节点中修改 `group_by_columns` 配置
- **修改聚合列**: 修改 `aggregate_columns` 配置
- **修改保存方式**: 在 `node_data_saver` 节点中修改 `save_type` 和 `table_name` 配置


#!/bin/bash
# 手动注册算子脚本

API_BASE="http://localhost:3991/api"

echo "🚀 开始注册算子..."

# 注册 file_selector_processor
echo "📦 注册 file_selector_processor..."
curl -X POST "$API_BASE/operators" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "file_selector_processor",
    "version": "1.0.0",
    "description": "通用文件选择和处理算子 - 支持本地CSV、TXT文件读取，输出DataFrame和数据结构描述",
    "author": "FlowData Team",
    "license": "MIT",
    "type": "file",
    "category": "文件操作",
    "tags": ["file", "csv", "txt", "dataframe", "data_processing"],
    "codePath": "main.py",
    "entryPoint": "FileSelectorProcessor",
    "operatorType": "local_python",
    "outputs": [
      {"name": "dataframe", "type": "pandas.DataFrame", "description": "处理后的数据DataFrame"},
      {"name": "data_structure", "type": "dict", "description": "数据结构描述信息"}
    ],
    "operatorParams": []
  }' | python3 -m json.tool
echo ""

# 注册 data_cleaner
echo "📦 注册 data_cleaner..."
curl -X POST "$API_BASE/operators" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "data_cleaner",
    "version": "1.0.0",
    "description": "数据清洗算子 - 清理空值、格式化数据、处理异常值",
    "author": "Biezhi Team",
    "license": "MIT",
    "type": "data_processing",
    "category": "数据处理",
    "tags": ["dataframe", "cleaning", "data_processing", "preprocessing"],
    "codePath": "main.py",
    "entryPoint": "DataCleaner",
    "operatorType": "local_python",
    "inputs": [
      {"name": "dataframe", "type": "pandas.DataFrame", "required": true, "description": "需要清洗的DataFrame数据"}
    ],
    "outputs": [
      {"name": "cleaned_dataframe", "type": "pandas.DataFrame", "description": "清洗后的DataFrame数据"}
    ],
    "operatorParams": []
  }' | python3 -m json.tool
echo ""

# 注册 data_analyzer
echo "📦 注册 data_analyzer..."
curl -X POST "$API_BASE/operators" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "data_analyzer",
    "version": "1.0.0",
    "description": "数据分析算子 - 支持分组统计、聚合分析、描述性统计",
    "author": "Biezhi Team",
    "license": "MIT",
    "type": "data_analysis",
    "category": "数据分析",
    "tags": ["dataframe", "analysis", "statistics", "groupby"],
    "codePath": "main.py",
    "entryPoint": "DataAnalyzer",
    "operatorType": "local_python",
    "inputs": [
      {"name": "dataframe", "type": "pandas.DataFrame", "required": true, "description": "需要分析的DataFrame数据"}
    ],
    "outputs": [
      {"name": "analysis_result", "type": "pandas.DataFrame", "description": "分析结果DataFrame"},
      {"name": "statistics_summary", "type": "dict", "description": "统计摘要信息"}
    ],
    "operatorParams": []
  }' | python3 -m json.tool
echo ""

# 注册 data_saver
echo "📦 注册 data_saver..."
curl -X POST "$API_BASE/operators" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "data_saver",
    "version": "1.0.0",
    "description": "数据保存算子 - 将DataFrame保存到数据库或文件",
    "author": "Biezhi Team",
    "license": "MIT",
    "type": "database",
    "category": "数据存储",
    "tags": ["dataframe", "database", "save", "storage"],
    "codePath": "main.py",
    "entryPoint": "DataSaver",
    "operatorType": "local_python",
    "inputs": [
      {"name": "dataframe", "type": "pandas.DataFrame", "required": true, "description": "需要保存的DataFrame数据"}
    ],
    "outputs": [
      {"name": "save_result", "type": "dict", "description": "保存结果信息"}
    ],
    "operatorParams": []
  }' | python3 -m json.tool
echo ""

echo "✨ 注册完成！"


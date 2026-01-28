# Function Call 设计文档

## 📋 文档概述

本文档定义了AI工作流助手使用 Function Calling（工具调用）方式的完整技术规范，包括架构设计、函数列表、Schema定义和接口设计。

---

## 📑 目录

1. [实现方式](#1-实现方式)
2. [架构设计](#2-架构设计)
3. [函数列表](#3-函数列表)
4. [Schema 定义](#4-schema-定义)
5. [后端API接口设计](#5-后端api接口设计)
6. [节点配置最佳实践](#6-节点配置最佳实践)
7. [错误处理](#7-错误处理)

---

## 1. 实现方式

推荐使用 **Function Calling（工具调用）** 方式实现，理由如下：

- ✅ **性能更好**：直接调用后端API，无需额外的MCP服务器
- ✅ **集成简单**：可以直接复用现有的API接口
- ✅ **维护成本低**：不需要单独维护MCP服务器
- ✅ **灵活性高**：可以精细控制每个函数的权限和参数
- ✅ **调试方便**：可以直接使用现有的API调试工具

---

## 2. 架构设计

### 2.1 Function Calling 架构设计

```
┌─────────────────┐
│  AI Chat Panel  │ (前端)
└────────┬────────┘
         │ HTTP Request with Function Call
         ▼
┌─────────────────────────────────┐
│  Backend API Layer              │
│  - Function Call Router         │
│  - Workflow Service             │
│  - Operator Service             │
│  - Execution Service            │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Database / Storage             │
│  - Workflows                    │
│  - Operators                    │
│  - Executions                   │
└─────────────────────────────────┘
```

---

## 3. 函数列表

### 3.1 工作流操作类

| 函数名 | 描述 | 权限 |
|--------|------|------|
| `get_workflow_detail` | 获取工作流详细信息 | 只读 |
| `validate_workflow` | 验证工作流完整性 | 只读 |
| `optimize_workflow` | 优化工作流结构 | 读写 |
| `create_workflow` | 创建新工作流 | 写入 |
| `update_workflow` | 更新工作流 | 写入 |
| `design_workflow` | 自动设计工作流 | 写入 |
| `get_workflow_execution_order` | 获取执行顺序 | 只读 |

### 3.2 节点操作类

| 函数名 | 描述 | 权限 |
|--------|------|------|
| `add_node_to_workflow` | 添加节点到工作流 | 写入 |
| `remove_node_from_workflow` | 从工作流移除节点 | 写入 |
| `update_node_config` | 更新节点的用户配置 | 写入 |
| `connect_nodes` | 连接两个节点 | 写入 |
| `disconnect_nodes` | 断开节点连接 | 写入 |
| `add_data_align_node` | 添加数据对齐节点 | 写入 |
| `auto_configure_node` | 自动配置节点的用户配置 | 写入 |
| `get_node_operator_params` | 获取节点的算子配置项定义 | 只读 |
| `get_node_position_suggestion` | 获取节点位置建议 | 只读 |

### 3.3 算子操作类

| 函数名 | 描述 | 权限 |
|--------|------|------|
| `search_operators` | 搜索算子 | 只读 |
| `get_operator_detail` | 获取算子详情 | 只读 |
| `recommend_operators` | 推荐算子 | 只读 |
| `create_operator` | 创建新算子 | 写入 |
| `get_operator_compatibility` | 检查算子兼容性 | 只读 |

### 3.4 调试与优化类

| 函数名 | 描述 | 权限 |
|--------|------|------|
| `analyze_execution_error` | 分析执行错误 | 只读 |
| `debug_workflow` | 调试工作流 | 读写 |
| `get_performance_analysis` | 获取性能分析 | 只读 |
| `suggest_optimizations` | 提供优化建议 | 只读 |

### 3.5 上下文信息类

| 函数名 | 描述 | 权限 |
|--------|------|------|
| `get_selected_objects_detail` | 获取选中对象的详细信息 | 只读 |

### 3.6 版本管理类

| 函数名 | 描述 | 权限 |
|--------|------|------|
| `rollback_workflow_version` | 回滚工作流到指定版本 | 写入 |
| `get_workflow_version_history` | 获取工作流版本历史 | 只读 |
| `create_workflow_checkpoint` | 创建工作流快照 | 写入 |

---

## 4. Schema 定义

### 4.1 `design_workflow` - 自动设计工作流

**重要说明**：
- 设计工作流时，会自动配置每个节点的用户配置（`node.userConfig`）
- 配置流程遵循"节点配置最佳实践"（见第6章）

```json
{
  "name": "design_workflow",
  "description": "根据用户需求自动设计完整的工作流。包括选择算子、配置节点的用户配置、建立连接等。配置节点的用户配置时，会遵循节点配置最佳实践流程。",
  "parameters": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "用户需求描述，例如：'创建一个LinkedIn公司数据分析工作流，从CSV读取数据，清洗数据，按国家分组统计，保存到数据库'"
      },
      "workflow_name": {
        "type": "string",
        "description": "工作流名称"
      },
      "workflow_category": {
        "type": "string",
        "description": "工作流分类（可选）"
      },
      "workflow_tags": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "工作流标签（可选）"
      },
      "existing_workflow_id": {
        "type": "string",
        "description": "如果是在现有工作流基础上设计，提供工作流ID（可选）"
      }
    },
    "required": ["description", "workflow_name"]
  }
}
```

### 4.2 `optimize_workflow` - 优化工作流

```json
{
  "name": "optimize_workflow",
  "description": "分析并优化工作流结构，包括检测问题、提供优化建议、自动修复等。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "要优化的工作流ID"
      },
      "optimization_type": {
        "type": "string",
        "enum": ["structure", "performance", "all"],
        "description": "优化类型：structure=结构优化，performance=性能优化，all=全面优化"
      },
      "auto_fix": {
        "type": "boolean",
        "description": "是否自动修复发现的问题（默认false，只提供建议）"
      }
    },
    "required": ["workflow_id"]
  }
}
```

### 4.3 `create_operator` - 创建算子

**注意**：AI创建算子代码的时间比较长，并且不可能一次完成。因此采用分步创建的方式：

1. 第一步：调用 `/api/operators/create` 接口创建 operator.yaml（不自动注册）
2. 第二步：使用文件操作接口逐步添加或编辑文件
3. 第三步：当所有文件创建完成后，调用 `/api/operators` 接口注册算子

**重要约束**：只有 Custom_operators 目录下的算子才可以编辑。如非正在创建算子，如无特别必要，不要直接修改别的算子。

```json
{
  "name": "create_operator",
  "description": "根据用户需求自动创建算子。注意：采用分步创建方式，先创建 operator.yaml，然后逐步添加其他文件。只能编辑 Custom_operators 目录下的算子。",
  "parameters": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "算子功能描述，例如：'将CSV文件的列名转换为小写'"
      },
      "operator_name": {
        "type": "string",
        "description": "算子名称"
      },
      "operator_type": {
        "type": "string",
        "enum": ["local_python", "local_typescript"],
        "description": "算子执行类型，默认local_python"
      },
      "operator_yaml": {
        "type": "string",
        "description": "operator.yaml 的完整内容（必须包含 file_structure 信息块）。如果提供，将直接使用此内容创建 operator.yaml；如果不提供，AI会根据其他参数自动生成。"
      },
      "inputs": {
        "type": "array",
        "description": "输入数据定义（可选，AI可以自动推断）",
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "type": {"type": "string"},
            "description": {"type": "string"}
          }
        }
      },
      "outputs": {
        "type": "array",
        "description": "输出数据定义（可选，AI可以自动推断）",
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "type": {"type": "string"},
            "description": {"type": "string"}
          }
        }
      },
      "operator_params": {
        "type": "array",
        "description": "用户配置参数（可选，AI可以自动推断）",
        "items": {
          "type": "object"
        }
      },
      "file_structure": {
        "type": "object",
        "description": "文件结构描述（必需），用于描述算子目录下各文件的作用，帮助AI快速理解这个算子。示例：{\"main.py\": \"算子的主要代码文件\", \"requirements.txt\": \"Python依赖包列表\"}",
        "additionalProperties": {
          "type": "string"
        }
      }
    },
    "required": ["description", "operator_name", "file_structure"]
  }
}
```

**相关接口**：
- `/api/operators/create` - 创建 operator.yaml（第一步）
- `/api/operators/file/add/:filename` - 添加新文件（第二步），path 参数在请求体中
- `/api/operators/file/edit/:filename` - 编辑现有文件，包括 operator.yaml（第二步），path 参数在请求体中
- `/api/operators/file/delete/:filename` - 删除文件，不能删除 operator.yaml（第二步），path 参数在请求体中
- `/api/operators` - 注册算子（第三步）

### 4.4 `add_node_to_workflow` - 添加节点

**重要说明**：
- 添加节点后，如果 `auto_config` 为 `true`，会自动调用 `auto_configure_node` 来配置节点的用户配置
- 配置流程遵循"节点配置最佳实践"（见第6章）

```json
{
  "name": "add_node_to_workflow",
  "description": "向工作流添加一个节点。AI会自动选择合适的算子、配置节点的用户配置、建立连接。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "operator_id": {
        "type": "string",
        "description": "要添加的算子ID（可选，如果不提供，AI会根据description自动搜索）"
      },
      "description": {
        "type": "string",
        "description": "节点功能描述（当operator_id未提供时必需），例如：'添加一个数据清洗节点'"
      },
      "position_after_node": {
        "type": "string",
        "description": "插入位置：在此节点之后插入（可选）"
      },
      "position_before_node": {
        "type": "string",
        "description": "插入位置：在此节点之前插入（可选）"
      },
      "connect_from": {
        "type": "string",
        "description": "连接来源节点ID（可选，AI可以自动推断）"
      },
      "connect_to": {
        "type": "string",
        "description": "连接目标节点ID（可选，AI可以自动推断）"
      },
      "auto_config": {
        "type": "boolean",
        "description": "是否自动配置节点的用户配置（默认true）。如果为true，会在添加节点后自动调用 auto_configure_node 来配置节点的用户配置。"
      }
    },
    "required": ["workflow_id"]
  }
}
```

### 4.5 `auto_configure_node` - 自动配置节点的用户配置

**重要说明**：
- **配置对象**：此函数配置的是**节点的用户配置**（node.userConfig），而不是算子的配置项定义（operator.operatorParams）
- **配置流程**：
  1. 获取节点的算子信息，了解算子的配置项定义（`operatorParams`）
  2. 获取上游节点的输出数据片段格式（使用 `get_node_upstream_data_structure`）
  3. **注意**：在查看上游数据时，不需要考虑当前节点的用户配置，只需关注数据格式
  4. 基于上游数据格式和算子的配置项定义，智能生成节点的用户配置
  5. 调用完成后，前端界面会自动更新节点的用户配置

```json
{
  "name": "auto_configure_node",
  "description": "根据上下文自动配置节点的用户配置。配置流程：1）获取算子的配置项定义；2）获取上游节点的数据片段格式（不考虑当前节点的用户配置）；3）基于数据格式和配置项定义生成用户配置；4）更新节点的用户配置，前端界面会自动更新。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "node_id": {
        "type": "string",
        "description": "要配置的节点ID"
      },
      "user_config": {
        "type": "object",
        "description": "部分用户配置覆盖（可选），AI会在此基础上进行智能填充。如果提供，将作为基础配置，AI会补充缺失的配置项。"
      },
      "based_on_upstream_data": {
        "type": "boolean",
        "description": "是否基于上游节点的输出数据进行配置（默认true）。如果为true，会先调用 get_node_upstream_data_structure 获取上游数据格式。"
      },
      "preserve_existing_config": {
        "type": "boolean",
        "description": "是否保留现有的用户配置（默认false）。如果为true，只填充缺失的配置项，不覆盖已有配置。"
      }
    },
    "required": ["workflow_id", "node_id"]
  }
}
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "node_id": "node_xxx",
    "user_config": {
      "field_mapping": {
        "source_field": "target_field"
      },
      "filter_condition": "...",
      "other_params": "..."
    },
    "config_changes": {
      "added": ["field_mapping", "filter_condition"],
      "updated": [],
      "removed": []
    },
    "message": "节点用户配置已更新，前端界面会自动刷新"
  }
}
```

**配置流程示例**：
1. 调用 `get_node_operator_params` 获取算子的配置项定义（了解有哪些配置项、类型、默认值等）
2. 调用 `get_node_upstream_data_structure` 获取上游数据格式（**此时不需要考虑当前节点的用户配置**）
3. 基于数据格式和配置项定义，生成合适的用户配置值
4. 调用 `update_node_config` 更新节点的用户配置
5. 前端界面自动更新显示

### 4.6 `add_data_align_node` - 添加数据对齐节点

```json
{
  "name": "add_data_align_node",
  "description": "在两个节点之间自动添加数据对齐节点，解决输入输出类型不匹配问题。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "from_node_id": {
        "type": "string",
        "description": "源节点ID"
      },
      "to_node_id": {
        "type": "string",
        "description": "目标节点ID"
      },
      "alignment_type": {
        "type": "string",
        "enum": ["auto", "type_cast", "field_mapping", "reshape"],
        "description": "对齐类型：auto=自动识别，type_cast=类型转换，field_mapping=字段映射，reshape=数据重塑"
      },
      "create_new_operator": {
        "type": "boolean",
        "description": "如果没有合适的对齐算子，是否创建新的（默认false，只使用现有算子）"
      }
    },
    "required": ["workflow_id", "from_node_id", "to_node_id"]
  }
}
```

### 4.7 `analyze_execution_error` - 分析执行错误

```json
{
  "name": "analyze_execution_error",
  "description": "分析工作流执行错误，诊断问题原因并提供修复建议。",
  "parameters": {
    "type": "object",
    "properties": {
      "execution_id": {
        "type": "string",
        "description": "执行ID（可选，如果提供会分析具体执行）"
      },
      "workflow_id": {
        "type": "string",
        "description": "工作流ID（如果execution_id未提供）"
      },
      "error_message": {
        "type": "string",
        "description": "错误信息（可选，用于快速分析）"
      },
      "auto_fix": {
        "type": "boolean",
        "description": "是否自动修复（默认false，只提供分析）"
      }
    },
    "required": []
  }
}
```

### 4.8 `search_operators` - 搜索算子

```json
{
  "name": "search_operators",
  "description": "搜索符合条件的算子。",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词（名称、描述、标签等）"
      },
      "operator_type": {
        "type": "string",
        "enum": ["data_collector", "data_processing", "data_analysis", "data_visualtion", "data_align", "all"],
        "description": "算子类型过滤"
      },
      "tags": {
        "type": "array",
        "items": {"type": "string"},
        "description": "标签过滤"
      },
      "input_type": {
        "type": "string",
        "description": "所需输入类型（用于兼容性检查）"
      },
      "output_type": {
        "type": "string",
        "description": "所需输出类型（用于兼容性检查）"
      },
      "limit": {
        "type": "integer",
        "description": "返回结果数量限制（默认10）"
      }
    },
    "required": []
  }
}
```

### 4.9 `recommend_operators` - 推荐算子

```json
{
  "name": "recommend_operators",
  "description": "基于当前工作流上下文推荐合适的算子。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID（可选，提供会有更准确的推荐）"
      },
      "after_node_id": {
        "type": "string",
        "description": "推荐在此节点之后可以使用的算子"
      },
      "context": {
        "type": "string",
        "description": "上下文描述，例如：'需要数据清洗'"
      },
      "limit": {
        "type": "integer",
        "description": "推荐数量（默认5）"
      }
    },
    "required": []
  }
}
```

### 4.10 `get_workflow_detail` - 获取工作流详情

**重要说明**：
- 返回的节点信息中包含 `node.userConfig`（节点的用户配置）
- 如果 `include_operators` 为 `true`，还会包含 `operator.operatorParams`（算子的配置项定义）
- 注意区分：`node.userConfig` 是节点的用户配置值，`operator.operatorParams` 是算子的配置项定义（元数据）

```json
{
  "name": "get_workflow_detail",
  "description": "获取工作流的详细信息，包括节点、连接、配置等。用于AI了解当前工作流状态。返回的节点信息包含节点的用户配置（node.userConfig），如果包含算子信息，还会包含算子的配置项定义（operator.operatorParams）。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "include_operators": {
        "type": "boolean",
        "description": "是否包含算子详细信息（默认true）。如果为true，会包含算子的配置项定义（operatorParams）。"
      },
      "include_validation": {
        "type": "boolean",
        "description": "是否包含验证结果（默认true）"
      }
    },
    "required": ["workflow_id"]
  }
}
```

**返回数据结构说明**：
- `nodes[].userConfig`：节点的用户配置（用户为节点设置的具体配置值）
- `nodes[].operator.operatorParams`：算子的配置项定义（算子的元数据，定义有哪些可配置项）

### 4.11 `get_node_upstream_data_structure` - 获取上游数据结构片段

**重要说明**：
- **用途**：获取上游节点的输出数据格式，用于配置当前节点的用户配置
- **关键点**：在查看上游数据时，**不需要考虑当前节点的用户配置**，只需关注数据格式本身
- **配置流程**：先获取上游数据格式 → 再获取算子的配置项定义 → 最后生成节点的用户配置

```json
{
  "name": "get_node_upstream_data_structure",
  "description": "获取指定节点的上游节点的输出数据结构片段。当上游节点输出是弱类型（不固定结构，如 list、dict、object）时，使用此函数获取实际的数据结构，帮助AI了解数据格式并进行智能配置。注意：在查看上游数据时，不需要考虑当前节点的用户配置，只需关注数据格式本身。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID",
        "required": true
      },
      "node_id": {
        "type": "string",
        "description": "要查询的节点ID",
        "required": true
      },
      "upstream_node_id": {
        "type": "string",
        "description": "上游节点ID（可选，如果不提供则返回所有上游节点的数据结构）"
      },
      "output_port": {
        "type": "string",
        "description": "输出端口名称（可选，如果不提供则返回所有端口的数据）"
      },
      "sample_size": {
        "type": "integer",
        "description": "数据样本大小（默认5，用于展示数据结构）",
        "default": 5
      },
      "max_depth": {
        "type": "integer",
        "description": "嵌套对象的最大深度（默认3，防止数据过大）",
        "default": 3
      }
    },
    "required": ["workflow_id", "node_id"]
  }
}
```

**使用场景**：
- 当上游节点输出是弱类型（`list`、`dict`、`object` 等）时，需要了解实际的数据结构
- 配置节点的用户配置时，需要知道字段名称、类型、嵌套结构等
- 例如：配置数据过滤节点时，需要知道数据中有哪些字段可以用于过滤

**重要提示**：
- **必须提供 workflow_id**：调用此函数前，必须先获取实际的工作流ID
  - 从 `get_workflow_detail` 的返回结果中获取
  - 从 `window.workflow_id` 全局变量中获取（如果可用）
  - 从上下文信息中获取
  - **禁止**：绝对不要使用占位符文本（如"当前工作流ID"、"default"等）
- **配置流程**：此函数只用于获取数据格式，不涉及当前节点的用户配置
- **调用示例**：`get_node_upstream_data_structure({ workflow_id: "wf_12345", node_id: "node_xxx" })`

**返回数据结构示例**：
```json
{
  "node_id": "node_123",
  "upstream_data_structures": [
    {
      "upstream_node_id": "node_456",
      "output_port": "data",
      "data_type": "array",
      "data_structure": {
        "_type": "array",
        "_length": 100,
        "_samples": [
          {
            "_index": 0,
            "_structure": {
              "_type": "object",
              "_keys": ["x", "y", "category"],
              "x": { "_type": "string" },
              "y": { "_type": "number" },
              "category": { "_type": "string" }
            }
          }
        ],
        "_inferred_structure": {
          "_type": "array_of_objects",
          "_common_keys": ["x", "y", "category"],
          "_field_types": {
            "x": ["string"],
            "y": ["number"],
            "category": ["string"]
          }
        }
      }
    }
  ]
}
```

### 4.12 `get_node_operator_params` - 获取节点的算子配置项定义

**重要说明**：
- **配置项定义 vs 用户配置**：
  - **算子的配置项定义**（`operatorParams`）：定义算子有哪些可配置项、类型、默认值、描述等（这是算子的元数据）
  - **节点的用户配置**（`node.userConfig`）：用户为节点设置的具体配置值（这是节点的实际配置）
- **用途**：在配置节点的用户配置前，需要先了解算子的配置项定义，才能知道有哪些配置项可以配置

```json
{
  "name": "get_node_operator_params",
  "description": "获取节点的算子配置项定义（operatorParams）。用于了解算子有哪些可配置项、类型、默认值、描述等信息。这是算子的元数据，不是节点的用户配置。在配置节点的用户配置前，应先调用此函数了解配置项定义。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "node_id": {
        "type": "string",
        "description": "要查询的节点ID"
      },
      "include_current_user_config": {
        "type": "boolean",
        "description": "是否包含当前节点的用户配置（默认false）。如果为true，会在返回结果中同时包含算子的配置项定义和节点的当前用户配置，便于对比。"
      }
    },
    "required": ["workflow_id", "node_id"]
  }
}
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "node_id": "node_xxx",
    "operator_id": "op_xxx",
    "operator_name": "数据过滤",
    "operator_params": [
      {
        "name": "filter_column",
        "type": "string",
        "description": "要过滤的列名",
        "required": true,
        "default": null
      },
      {
        "name": "filter_condition",
        "type": "string",
        "description": "过滤条件",
        "required": true,
        "default": null
      },
      {
        "name": "case_sensitive",
        "type": "boolean",
        "description": "是否区分大小写",
        "required": false,
        "default": false
      }
    ],
    "current_user_config": {
      "filter_column": "name",
      "filter_condition": "contains('test')",
      "case_sensitive": true
    }
  }
}
```

**配置流程**：
1. 调用 `get_node_operator_params` 了解算子的配置项定义
2. 调用 `get_node_upstream_data_structure` 获取上游数据格式
3. 基于配置项定义和数据格式，生成合适的用户配置值
4. 调用 `update_node_config` 更新节点的用户配置

### 4.13 `get_selected_objects_detail` - 获取选中对象详情

**重要说明**：
- 返回的节点信息中包含 `userConfig`（节点的用户配置）
- 如果 `include_operator_info` 为 `true`，还会包含 `operator_info.operatorParams`（算子的配置项定义）
- 注意区分：`userConfig` 是节点的用户配置值，`operatorParams` 是算子的配置项定义（元数据）

```json
{
  "name": "get_selected_objects_detail",
  "description": "获取用户在画布上选中的节点和边的详细信息。用于AI了解用户当前关注的对象。返回的节点信息包含节点的用户配置（userConfig），如果包含算子信息，还会包含算子的配置项定义（operatorParams）。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "node_ids": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "选中的节点ID列表"
      },
      "edge_ids": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "选中的边ID列表"
      },
      "include_operator_info": {
        "type": "boolean",
        "description": "是否包含算子详细信息（默认true）。如果为true，会包含算子的配置项定义（operatorParams）。"
      },
      "include_connections": {
        "type": "boolean",
        "description": "对于节点，是否包含其连接关系（默认true）"
      }
    },
    "required": ["workflow_id"]
  }
}
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "node_id": "node_data_cleaner",
        "operator_id": "op_92f78edd",
        "operator_name": "数据清洗",
        "operator_type": "local_python",
        "node_type": "processor",
        "userConfig": {
          "filter_column": "name",
          "filter_condition": "..."
        },
        "operator_info": {
          "operatorParams": [
            {
              "name": "filter_column",
              "type": "string",
              "description": "..."
            }
          ]
        },
        "connections": {
          "incoming": [...],
          "outgoing": [...]
        }
      }
    ],
    "edges": [
      {
        "edge_id": "conn_1",
        "from_node": "node_data_cleaner",
        "to_node": "node_data_analyzer",
        "from_port": "output",
        "to_port": "input",
        "connection_info": {...}
      }
    ]
  }
}
```

**数据结构说明**：
- `nodes[].userConfig`：节点的用户配置（用户为节点设置的具体配置值）
- `nodes[].operator_info.operatorParams`：算子的配置项定义（算子的元数据，定义有哪些可配置项）

### 4.14 `update_node_config` - 更新节点的用户配置

**重要说明**：
- **配置对象**：此函数更新的是**节点的用户配置**（node.userConfig），不是算子的配置项定义
- **前端更新**：调用完成后，前端界面会自动更新节点的配置显示

```json
{
  "name": "update_node_config",
  "description": "更新节点的用户配置（node.userConfig）。这是用户为节点设置的具体配置值，不是算子的配置项定义。调用完成后，前端界面会自动更新节点的配置显示。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "node_id": {
        "type": "string",
        "description": "要更新的节点ID"
      },
      "user_config": {
        "type": "object",
        "description": "节点的用户配置对象。键名对应算子的配置项名称（operatorParams中的name），值为用户设置的具体配置值。"
      },
      "merge_mode": {
        "type": "string",
        "enum": ["replace", "merge"],
        "description": "更新模式：replace=完全替换现有配置，merge=合并到现有配置（默认replace）"
      }
    },
    "required": ["workflow_id", "node_id", "user_config"]
  }
}
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "node_id": "node_xxx",
    "user_config": {
      "filter_column": "name",
      "filter_condition": "contains('test')",
      "case_sensitive": true
    },
    "message": "节点用户配置已更新，前端界面会自动刷新"
  }
}
```

### 4.15 `rollback_workflow_version` - 回滚工作流版本

```json
{
  "name": "rollback_workflow_version",
  "description": "将工作流回滚到指定的历史版本。用于撤销AI对工作流的修改。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "checkpoint_id": {
        "type": "string",
        "description": "要回滚到的快照ID（可选，如果不提供则回滚到上一个版本）"
      },
      "message_id": {
        "type": "string",
        "description": "关联的消息ID（可选，用于回滚到特定消息修改前的版本）"
      }
    },
    "required": ["workflow_id"]
  }
}
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "workflow_id": "wf_xxx",
    "checkpoint_id": "checkpoint_xxx",
    "rollback_time": "2024-01-01T12:00:00Z",
    "changes": {
      "nodes_removed": 2,
      "nodes_added": 0,
      "connections_removed": 1,
      "connections_added": 0,
      "configs_updated": 0
    },
    "message": "工作流已回滚到修改前的版本"
  }
}
```

### 4.16 `create_workflow_checkpoint` - 创建工作流快照

```json
{
  "name": "create_workflow_checkpoint",
  "description": "创建当前工作流的快照，用于后续版本回滚。通常在AI执行修改操作前自动调用。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "message_id": {
        "type": "string",
        "description": "关联的消息ID（可选，用于标识是哪个消息触发的快照）"
      },
      "description": {
        "type": "string",
        "description": "快照描述（可选，如'优化工作流前'）"
      }
    },
    "required": ["workflow_id"]
  }
}
```

**返回格式**：
```json
{
  "success": true,
  "data": {
    "checkpoint_id": "checkpoint_xxx",
    "workflow_id": "wf_xxx",
    "created_at": "2024-01-01T12:00:00Z",
    "description": "优化工作流前"
  }
}
```

### 4.17 `get_workflow_version_history` - 获取版本历史

```json
{
  "name": "get_workflow_version_history",
  "description": "获取工作流的版本历史记录，包括所有快照和修改记录。",
  "parameters": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "工作流ID"
      },
      "limit": {
        "type": "integer",
        "description": "返回记录数量限制（默认20）"
      },
      "include_checkpoints": {
        "type": "boolean",
        "description": "是否包含快照详情（默认false，只返回列表）"
      }
    },
    "required": ["workflow_id"]
  }
}
```

---

## 5. 后端API接口设计

### 5.1 Function Call 路由

```
POST /api/ai/workflow/functions
```

**请求体**：
```json
{
  "function_name": "design_workflow",
  "parameters": {
    "description": "创建一个数据分析工作流...",
    "workflow_name": "数据分析工作流"
  },
  "context": {
    "workflow_id": "optional_workflow_id",
    "selected_nodes": ["node1", "node2"],
    "user_id": "user123"
  }
}
```

**响应**：
```json
{
  "success": true,
  "result": {
    "workflow_id": "wf_xxx",
    "message": "工作流创建成功",
    "changes": {
      "nodes_added": 5,
      "connections_added": 4
    }
  },
  "execution_time_ms": 1234
}
```

### 5.2 算子创建接口

**创建算子目录和 operator.yaml**：
```
POST /api/operators/create
Body: { operatorYaml: string }
```

**添加算子文件**：
```
POST /api/operators/file/add/:filename
Body: { content: string, operatorPath: string, path?: string }
```

**编辑算子文件**：
```
PUT /api/operators/file/edit/:filename
Body: { content: string, operatorPath: string, path?: string }
```

**删除算子文件**：
```
DELETE /api/operators/file/delete/:filename
Body: { operatorPath: string, path?: string }
```

**注意**：
- `/api/operators/create` 只创建 operator.yaml，不自动注册算子
- operator.yaml 必须包含 `file_structure` 信息块
- 所有文件操作接口只能操作 Custom_operators 目录下的算子
- `path` 参数在请求体中，以算子目录为 root（可选，例如 "preview" 表示 preview/main.py）
- operator.yaml 也可以通过 edit 接口来修改

---

## 6. 节点配置最佳实践

### 6.1 核心原则

在配置节点的用户配置时，必须严格区分以下两个概念：

1. **算子的配置项定义**（`operatorParams`）：算子的元数据，定义算子有哪些可配置项、类型、默认值等
2. **节点的用户配置**（`node.userConfig`）：用户为节点设置的具体配置值

**关键点**：
- 配置的是**节点的用户配置**，不是算子的配置项定义
- 查看上游数据格式时，**不需要考虑当前节点的用户配置**，只需关注数据格式本身
- 基于算子的配置项定义和上游数据格式，生成节点的用户配置值
- 调用完成后，前端界面会自动更新节点的配置显示

### 6.2 配置流程

当需要完善或自动配置节点的用户配置时，应遵循以下流程：

1. **获取算子的配置项定义**
   - 调用 `get_node_operator_params` 获取算子的配置项定义（`operatorParams`）
   - 了解有哪些配置项、类型、默认值、是否必填等

2. **获取上游数据格式**
   - 调用 `get_node_upstream_data_structure` 获取上游节点的输出数据片段格式
   - **重要**：此时不需要考虑当前节点的用户配置，只需关注数据格式本身
   - 了解数据中的字段名称、类型、嵌套结构等

3. **生成用户配置**
   - 基于算子的配置项定义和上游数据格式，智能生成合适的用户配置值
   - 例如：如果配置项是 `filter_column`，可以从上游数据中找到可用的字段名

4. **更新节点配置**
   - 调用 `update_node_config` 或 `auto_configure_node` 更新节点的用户配置
   - 调用完成后，前端界面会自动更新节点的配置显示

### 6.3 关键概念区分

#### 6.2.1 算子的配置项定义（operatorParams）

- **定义**：算子的元数据，定义算子有哪些可配置项
- **位置**：`operator.operatorParams`
- **内容**：配置项名称、类型、描述、默认值、是否必填等
- **特点**：所有使用该算子的节点共享相同的配置项定义
- **获取方式**：`get_node_operator_params`

#### 6.2.2 节点的用户配置（node.userConfig）

- **定义**：用户为节点设置的具体配置值
- **位置**：`node.userConfig`
- **内容**：配置项名称对应的具体值
- **特点**：每个节点的用户配置是独立的
- **更新方式**：`update_node_config` 或 `auto_configure_node`

### 6.4 快速参考

| 操作 | 函数 | 说明 |
|------|------|------|
| 获取算子的配置项定义 | `get_node_operator_params` | 了解算子有哪些可配置项、类型、默认值等（元数据） |
| 获取上游数据格式 | `get_node_upstream_data_structure` | 获取上游节点的输出数据片段格式（**不考虑当前节点的用户配置**） |
| 自动配置节点 | `auto_configure_node` | 基于配置项定义和上游数据格式，自动生成并更新节点的用户配置 |
| 手动更新配置 | `update_node_config` | 直接更新节点的用户配置 |
| 获取节点详情 | `get_workflow_detail` | 获取工作流详情，包含节点的用户配置和算子的配置项定义 |

**配置流程**：
```
获取配置项定义 → 获取上游数据格式 → 生成用户配置 → 更新节点配置 → 前端自动更新
```

### 6.5 配置示例

**场景**：配置一个数据过滤节点

1. **获取配置项定义**
   ```javascript
   get_node_operator_params({
     workflow_id: "wf_123",
     node_id: "node_filter"
   })
   // 返回：算子有 filter_column、filter_condition、case_sensitive 等配置项
   ```

2. **获取上游数据格式**
   ```javascript
   get_node_upstream_data_structure({
     workflow_id: "wf_123",
     node_id: "node_filter"
   })
   // 返回：上游数据有 name、age、country 等字段
   ```

3. **生成用户配置**
   - 基于配置项定义和上游数据格式，生成：
   ```json
   {
     "filter_column": "name",  // 从上游数据中选择的字段
     "filter_condition": "contains('test')",
     "case_sensitive": false
   }
   ```

4. **更新节点配置**
   ```javascript
   update_node_config({
     workflow_id: "wf_123",
     node_id: "node_filter",
     user_config: {
       "filter_column": "name",
       "filter_condition": "contains('test')",
       "case_sensitive": false
     }
   })
   // 前端界面自动更新显示
   ```

---

## 7. 错误处理

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

## 附录

### A. 参考文档

- [AI_WORKFLOW_ASSISTANT_DESIGN.md](./AI_WORKFLOW_ASSISTANT_DESIGN.md) - AI工作流助手完整设计文档
- [WORKFLOW_STANDARD_FOR_AI.md](./WORKFLOW_STANDARD_FOR_AI.md) - 工作流标准规范
- [OPERATOR_STANDARD_FOR_AI.md](./OPERATOR_STANDARD_FOR_AI.md) - 算子标准规范

# AI工作流标准规范

## 1. 工作流配置标准 (workflow.yaml)

### 1.1 ComfyUI风格格式（推荐）

ComfyUI风格格式是推荐的工作流配置格式，具有简洁配置、灵活连接、自动发现和拓扑排序等特点。

```yaml
workflow:
  id: "workflow_id"
  name: "工作流名称"
  description: "工作流描述"
  version: "1.0.0"
  
  nodes:
    - id: "node1"
      operator_id: "op_12345"
      operator_type: "local_python"
      node_type: "processor"
      config:
        param1: "value1"
    - id: "node2"
      operator_id: "op_67890"
      operator_type: "local_python"
      node_type: "output"
      config:
        param2: "value2"
  
  connections:
    - from:
        node: "node1"
        port: "output"
      to:
        node: "node2"
        port: "input"
```

**注意事项**

- 工作流ID必须全局唯一，建议使用UUID格式
- 算子ID也必须全局唯一，建议使用UUID格式
- 节点ID在工作流中必须唯一，建议使用有意义的名称或UUID
- 端口ID在节点中必须唯一，建议使用有意义的名称或UUID
- 尽量使用 端口 来连接节点，而不是直接使用节点ID，除非端口不存在

### 1.2 格式特点

- **简洁配置**: 节点中不需要预定义 inputs/outputs
- **灵活连接**: 支持复杂的端口连接关系
- **自动发现**: 系统自动发现工作流输出和执行顺序
- **拓扑排序**: 基于连接关系自动确定执行顺序

### 1.3 字段说明

| 字段 | 类型 | 描述 | 是否必填 |
|------|------|------|----------|
| workflow.id | string | 工作流唯一标识 | 是 |
| workflow.name | string | 工作流名称 | 是 |
| workflow.description | string | 工作流描述 | 否 |
| workflow.version | string | 工作流版本 | 否 |
| workflow.nodes | array | 节点列表 | 是 |
| workflow.nodes[].id | string | 节点唯一标识 | 是 |
| workflow.nodes[].operator_id | string | 算子ID | 是 |
| workflow.nodes[].operator_type | string | 算子类型（如local_python） | 是 |
| workflow.nodes[].node_type | string | 节点类型（如processor, output） | 否 |
| workflow.nodes[].config | object | 节点配置参数 | 否 |
| workflow.connections | array | 连接关系列表 | 是 |
| workflow.connections[].from.node | string | 源节点ID | 是 |
| workflow.connections[].from.port | string | 源节点端口 | 是 |
| workflow.connections[].to.node | string | 目标节点ID | 是 |
| workflow.connections[].to.port | string | 目标节点端口 | 是 |

## 2. 算子管理与执行

### 2.1 算子管理器 (py-operator-mgr)

算子管理器提供了命令行和API两种使用方式，用于管理算子的注册、查询、删除等操作。

#### 2.1.1 命令行使用

```bash
# 激活虚拟环境
source venv/bin/activate && cd py-operator-mgr

# 注册算子
py-operator-mgr register --path /path/to/operator

# 查看所有算子
py-operator-mgr list

# 按名称搜索算子
py-operator-mgr search --name "数据采集"

# 按标签搜索算子
py-operator-mgr search --tag rocket
py-operator-mgr search --tag analysis

# 获取算子详情
py-operator-mgr get --id op_42462899

# 删除算子
py-operator-mgr delete --id "op_001"

# 查看统计信息
py-operator-mgr stats
```

#### 2.1.2 Python API使用

```python
from py_operator_mgr import OperatorManager

# 创建管理器实例
mgr = OperatorManager()

# 注册算子
mgr.register_operator("/path/to/operator")

# 搜索算子
results = mgr.search_by_name("数据采集")
results = mgr.search_by_tag("rocket")

# 获取算子详情
operator = mgr.get_operator("op_001")

# 删除算子
mgr.delete_operator("op_001")
```

### 2.2 算子运行器 (py-operator-runner)

算子运行器提供了交互式的算子执行环境，支持算子选择、参数配置、输入数据提供、执行和结果显示。

#### 2.2.1 启动运行器

```bash
cd py-operator-runner && ./runner.sh
```

#### 2.2.2 交互式配置流程

1. **选择算子**
   ```
   可用的算子:
   1. xxxxx
   2. xxxxx
   3. 自定义路径
   
   请选择算子 (1-3): 
   ```

2. **查看算子信息**
   - 基本信息（名称、版本、描述等）
   - 输入定义
   - 输出定义

3. **配置算子参数**（可选）
   根据算子类型，会提示不同的参数，如：
   - 数据过滤算子：过滤条件、过滤列名、过滤值等
   - AI翻译算子：目标语言、AI模型、翻译模式等

4. **配置输入数据**
   - 使用示例数据（自动创建测试数据）
   - 输入自定义数据（JSON格式）

5. **运行算子**
   执行算子并显示结果

6. **选择下一步操作**
   ```
   选择下一步操作:
   1. 使用相同算子重新运行 (修改输入数据)
   2. 选择其他算子
   3. 退出
   ```

#### 2.2.3 示例运行

数据过滤算子示例：
```bash
# 运行数据过滤算子
./runner.sh

# 选择算子
请选择算子 (1-3): 1

# 配置参数
默认过滤条件 (condition): age > 30
过滤列名 (filter_column): city
过滤值 (filter_value): Beijing

# 选择数据
请选择 (1-2): 1  # 使用示例数据

# 运行结果
运行结果:
{
  "dataframe": "      name  age     city  salary\n2  Charlie   35  Beijing   12000",
  "filtered_count": 1,
  "original_count": 5,
  "filter_applied": "条件: age > 30 AND city == Beijing",
  "status": "success"
}
```

## 3. 工作流管理与执行

### 3.1 工作流管理器 (workflow-mgr)

工作流管理器提供了命令行和API两种使用方式，用于管理工作流的注册、查询、验证、执行顺序获取等操作。

#### 3.1.1 命令行使用

```bash
# 激活虚拟环境
source venv/bin/activate && cd workflow-mgr

# 列出所有工作流
python workflow_mgr_cli.py list

# 注册工作流
python workflow_mgr_cli.py register workflow/examples/rocket_engine_data_analysis/workflow_v1.yaml

# 搜索工作流
python workflow_mgr_cli.py search rocket

# 按标签过滤
python workflow_mgr_cli.py filter --tag data_analysis

# 获取工作流详情
python workflow_mgr_cli.py get wf_199e759d

# 删除工作流
python workflow_mgr_cli.py delete wf_199e759d --force

# 显示统计信息
python workflow_mgr_cli.py stats

# 验证工作流图完整性
python workflow_mgr_cli.py validate wf_199e759d

# 验证工作流文件
python workflow_mgr_cli.py validate-file workflow.yaml

# 获取工作流执行顺序
python workflow_mgr_cli.py execution-order wf_199e759d

# 预览工作流图（ASCII图形）
python workflow_mgr_cli.py graph-preview wf_199e759d

# 预览工作流图（简单文本格式）
python workflow_mgr_cli.py graph-preview wf_199e759d --simple
```

#### 3.1.2 Python API使用

```python
from workflow_mgr import WorkflowManager

# 创建工作流管理器
manager = WorkflowManager()

# 注册工作流
workflow_id = manager.register_workflow("workflow.yaml")

# 列出所有工作流
workflows = manager.list_workflows()

# 搜索工作流
results = manager.search_workflows("rocket")

# 按标签过滤
filtered = manager.filter_workflows_by_tag("data_analysis")

# 获取工作流信息
workflow = manager.get_workflow(workflow_id)

# 删除工作流
manager.delete_workflow(workflow_id)

# 验证工作流图完整性
result = manager.validate_workflow_graph(workflow_id)
print(f"Graph is complete: {result.is_complete}")
print(f"Issues: {len(result.issues)}")
print(f"Warnings: {len(result.warnings)}")

# 验证工作流文件
result = manager.validate_workflow_by_path("workflow.yaml")

# 获取工作流执行顺序
execution_order = manager.get_workflow_execution_order(workflow_id)
print(f"Execution order: {execution_order}")
```

#### 3.1.3 图完整性验证

工作流管理器支持图完整性验证功能，可以检查以下问题：

1. **Disconnected Inputs** - 节点输入未连接
2. **Circular Dependencies** - 循环依赖
3. **Type Mismatches** - 数据类型不匹配
4. **Incomplete Configurations** - 节点配置不完整
5. **Disconnected Components** - 图不连通
6. **Missing Output Nodes** - 输出节点未指定

### 3.2 工作流执行引擎 (workflow-engine)

工作流执行引擎提供了强大的工作流执行功能，支持交互式选择、多种输出级别、入口节点交互式执行等特性。

#### 3.2.1 启动执行引擎

```bash
# 使用Shell脚本（推荐）
cd /path/to/flowdata

# 交互式模式
./workflow-engine/run_workflow.sh --interactive

# 直接指定工作流
./workflow-engine/run_workflow.sh --workflow ../workflow-mgr/examples/rocket_engine_data_analysis/workflow_v1.yaml

# 健康检查
./workflow-engine/run_workflow.sh --health

# 使用Python脚本
# 激活虚拟环境
source venv/bin/activate

# 进入工作流引擎目录
cd workflow-engine

# 交互式模式
python runner.py --interactive

# 直接指定工作流
python runner.py --workflow ../workflow-mgr/examples/rocket_engine_data_analysis/workflow_v1.yaml
```

#### 3.2.2 功能特性

1. **工作流选择**
   - 从工作流管理器选择：自动列出所有已注册的工作流
   - 自定义路径：支持相对路径和绝对路径

2. **输出级别**
   - 静默模式 (silent)：不显示任何输出数据，只显示执行状态和结果
   - 输入输出模式 (input_output)：只显示入口节点输入和出口节点输出（默认推荐模式）
   - 全节点模式 (all_nodes)：显示入口节点输入和所有节点输出

3. **入口节点交互式执行**
   - 自动发现入口节点：基于连接关系自动识别，查找没有上游连接的节点
   - 交互式执行：逐个执行入口节点，支持py-operator-runner的配置询问，可选择测试数据

#### 3.2.3 命令行参数

```bash
# 基本参数
--workflow, -w PATH      # 工作流配置文件路径
--node, -n NODE_ID       # 执行单个节点
--id ID                  # 工作流执行ID
--inputs, -i PATH        # 输入数据JSON文件路径

# 交互式参数
--interactive            # 交互式模式
--output-level LEVEL     # 输出级别 (silent|input_output|all_nodes)
--skip-entry-nodes       # 跳过入口节点交互式执行

# 操作模式
--validate               # 只验证工作流配置，不执行
--status                 # 查看引擎状态
--health                 # 健康检查
--stats                  # 显示统计信息

# 输出选项
--verbose, -v            # 详细输出
--quiet, -q              # 静默模式
--json                   # JSON格式输出
```

## 4. 最佳实践

1. **工作流配置**
   - 使用ComfyUI风格格式进行工作流配置
   - 确保每个节点都有唯一的ID
   - 合理设置节点类型（processor, output等）
   - 配置必要的参数

2. **算子管理**
   - 为算子添加有意义的名称和标签
   - 定期清理不再使用的算子
   - 使用标签对算子进行分类管理

3. **工作流管理**
   - 定期验证工作流图完整性
   - 使用有意义的工作流名称和描述
   - 利用标签对工作流进行分类

4. **执行与监控**
   - 根据需求选择合适的输出级别
   - 使用入口节点交互式执行进行调试
   - 定期进行健康检查
   - 利用统计信息监控系统状态

## 5. 故障排除

### 5.1 工作流相关问题

1. **工作流管理器不可用**
   - 确保已安装workflow-mgr: `pip install -e workflow-mgr/`

2. **工作流文件不存在**
   - 检查文件路径是否正确
   - 使用绝对路径或相对于项目根目录的路径

3. **算子未找到**
   - 确保算子已注册到py-operator-mgr
   - 检查算子ID是否正确

### 5.2 算子相关问题

1. **虚拟环境未激活**
   - 确保虚拟环境已创建并激活

2. **算子路径不存在**
   - 检查算子路径是否正确

3. **JSON格式错误**
   - 检查输入数据的JSON格式

4. **依赖缺失**
   - 安装缺失的依赖包

## 6. 扩展功能

### 6.1 自定义输出格式

```bash
# JSON格式输出
./workflow-engine/run_workflow.sh --workflow workflow.yaml --json

# 静默模式 + JSON输出
./workflow-engine/run_workflow.sh --workflow workflow.yaml --output-level silent --json
```

### 6.2 批量处理

```bash
# 静默模式适合批量处理
for workflow in workflow-mgr/examples/*/workflow*.yaml; do
    ./workflow-engine/run_workflow.sh --workflow "$workflow" --output-level silent --quiet
done
```

### 6.3 集成到脚本

```bash
#!/bin/bash
# 自动化工作流执行脚本

WORKFLOW_PATH="workflow-mgr/examples/rocket_engine_data_analysis/workflow_v1.yaml"

# 健康检查
if ! ./workflow-engine/run_workflow.sh --health >/dev/null 2>&1; then
    echo "❌ 工作流引擎不健康"
    exit 1
fi

# 执行工作流
echo "🚀 执行工作流: $WORKFLOW_PATH"
./workflow-engine/run_workflow.sh \
    --workflow "$WORKFLOW_PATH" \
    --output-level input_output \
    --skip-entry-nodes

echo "✅ 工作流执行完成"
```

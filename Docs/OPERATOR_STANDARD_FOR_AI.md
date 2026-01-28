# 算子开发标准文档

## 📋 文档概述

本文档定义了算子开发的标准规范，为AI开发工具提供清晰的配置指引。文档分为两个主要部分：算子配置规范和开发SDK。

---

## 📑 目录导航

### 第一部分：算子目录结构
1. [算子目录结构](#算子目录结构)

### 第二部分：算子配置规范
1. [算子描述与配置](#1-算子描述与配置必需)  
2. [代码路径配置](#2-代码路径配置必需)  
3. [输入数据定义](#3-输入数据定义inputs可选)  
4. [输出定义](#4-输出定义outputs可选)  
5. [用户配置](#5-用户配置operator_params可选)  
6. [数据可视化配置](#6-数据可视化配置可选)  
7. [执行配置](#7-执行配置可选)  
8. [Mockdata配置](#8-mockdata配置可选)  
9. [完整配置示例](#9-完整配置示例)  
10. [命名规范](#10-命名规范)  
11. [重点总结](#11-重点总结)

### 第三部分：算子开发SDK
1. [基类继承](#12-基类继承)  
2. [配置访问](#13-配置访问)  
3. [日志记录](#14-日志记录)

---

## 算子目录结构

每个算子应该包含以下核心文件，组织在独立的目录中：

```
operator_name/
├── operator.yaml          # 算子配置文件（必需，必须同名）
├── main.py                # 算子主程序（可选，可自主命名）
├── requirements.txt       # 依赖包列表（推荐，但必须同名）
├── test_data.json         # 测试数据（可选）
└── preview/               # 数据可视化前端文件（可选，可自主命名）
    ├── main.tsx           # 前端入口文件
    ├── components/        # 可视化组件
    └── package.json       # 前端依赖配置
```

**文件说明：**

- **operator.yaml**：算子配置定义文件，包含算子基本信息、输入输出定义、用户配置等
- **main.py**：算子核心逻辑实现，继承自BzOperator类
- **requirements.txt**：Python依赖包列表，用于安装算子运行环境
- **test_data.json**：测试数据文件，用于验证算子功能
- **preview/**：数据可视化前端文件目录（当算子需要数据可视化时）
  - **main.tsx**：前端入口文件，配置在operator.yaml的`data_visualization.entry_file`中
  - **components/**：可视化组件目录
  - **package.json**：前端依赖配置文件

**示例结构（基于rocket_engine_data_collector）：**
```
rocket_engine_data_collector/
├── operator.yaml          # 火箭发动机数据采集算子配置
├── main.py                # 数据采集逻辑实现
├── requirements.txt       # pandas, numpy, py-operator-sdk
├── test_data.json         # 模拟发动机测试数据
└── preview/               # 数据可视化前端
    ├── main.tsx           # 图表展示入口文件
    ├── components/
    │   ├── PressureChart.tsx
    │   └── TemperatureChart.tsx
    └── package.json       # React相关依赖
```

---

## 第一部分：算子配置规范

### 1. 算子描述与配置（必需）

```yaml
name: "operator_name"          # 算子名称
version: "1.0.0"              # 版本号
description: "算子描述"        # 描述
author: "作者名"               # 作者
license: "MIT"                # 许可证
type: "data_processing"       # 算子类型
category: "数据处理"           # 分类
tags: ["tag1", "tag2"]        # 标签列表
```

**算子类型 (type) 可选值：**
- `data_collector`: 数据采集
- `data_processing`: 数据加工
- `data_analysis`: 数据分析
- `data_visualtion`: 数据可视化
- `ai_config`: AI配置
- `read_from_api`: API数据读取
- `database`: 数据库操作
- `file`: 文件操作
- `network`: 网络操作
- `utility`: 工具类
- `data_align`: 数据对齐（AI）
- `webhook`: Webhook触发
- `condition`: 条件判断
- `schedule`: 定时触发

### 2. 代码路径配置（可选）

**用途：** 定义算子的代码文件和入口类。

```yaml
code_path: "main.py"             # 代码文件路径（相对于算子目录）
entry_point: "MyOperator"       # 入口类名
operator_type: "local_python"   # 执行语言类型（必需）
```

**执行语言类型 (operator_type) 可选值：**
- `local_python`: Python 算子（使用 py_operator_sdk）
- `local_typescript`: TypeScript 算子（使用 ts_operator_sdk）
- `local_go`: Go 算子
- `local_rust`: Rust 算子

**注意：** 
- 如果未指定，默认值为 `local_python`
- 不同语言类型的算子需要使用对应的 SDK 进行开发
- Python 算子使用 `main.py` 作为代码文件，TypeScript 算子使用 `main.ts` 作为代码文件

**纯前端可视化算子特殊情况：**
- 对于纯前端可视化算子（如 `plotlyjs_chart_viewer`），**不需要**配置 `code_path`、`entry_point` 和 `operator_type`
- 这类算子的数据通过 SSE 直接推送到前端，由 `data_visualization.entry_file` 中的前端代码（HTML/JS）处理
- 可视化逻辑完全在前端 iframe 中执行，无需后端执行代码
- 示例：`plotlyjs_chart_viewer` 算子只配置 `data_visualization.entry_file: "./preview/main.html"`，不配置代码路径

### 3. 输入数据定义（inputs）[可选]

**用途：** 描述算子可接受的实际处理的数据结构，不包含用户配置的参数。
在workflow中，算子的输入数据通常是从前一个算子的输出（output端口）连接而来的，所以输入数据的定义通常是前一个算子的输出端口的定义。
在实际运行时，算子会根据前一个算子的输出端口连接关系，自动将数据传递给算子的输入端口。
在实际操作中，如果2个算子的输入和输出端口的结构不一致，可以使用AI来添加对齐节点来转换数据。

```yaml
inputs:
  - name: "input_name"           # 输入名称
    type: "pandas.DataFrame"     # 数据类型
    required: true               # 是否必需
    description: "输入描述"       # 描述
    default: null                # 默认值
    validation:                  # 验证规则
      message: "验证失败消息"
```

**支持的数据类型：**
- `string`: 字符串
- `integer`: 整数
- `number`: 数字（整数或浮点数）
- `boolean`: 布尔值
- `pandas.DataFrame`: Pandas DataFrame
- `list`: 列表
- `dict`: 字典
- `object`: 任意对象

**重要原则：**
- 仅描述真正进入算子运算的数据载体（如 `dataframe`、`records`）
- 如不配置，意味着算子可接受任意数据结构的数据，比如数据采集类的算子，可以根据用户配置来处理数据，则可以处理任何结构，甚至非结构化数据，所以可以不要 输入数据定义
- 用户自定义配置项应放在 `operator_params` 中

### 4. 输出数据定义（outputs）[可选]

**用途：** 描述算子输出数据的数据结构。

```yaml
outputs:
  - name: "output_name"          # 输出名称
    type: "pandas.DataFrame"     # 数据类型
    description: "输出描述"       # 描述
```

### 5. 用户配置（operator_params）[可选]

**用途：** 定义在工作流编排或可视化界面中展示给用户的表单项。

```yaml
operator_params:
  - name: "param_name"           # 参数名称
    label: "参数标签"             # 显示标签
    type: "string"               # 参数类型
    description: "参数描述"       # 描述
    required: true               # 是否必需
    default: "default_value"     # 默认值
    validation:                  # 验证规则
      type: "string"
      min: 1
      max: 100
      message: "参数验证失败"
    ui:                          # UI配置
      component: "input"
      itemProps:                  # Form.Item 属性
        layout: "vertical"
      componentProps:             # 组件属性
        placeholder: "请输入参数"
        maxLength: 100
```

#### 5.1 验证规则 (validation)

**字符串验证示例：**
```yaml
validation:
  type: "string"
  min: 1                        # 最小长度
  max: 100                      # 最大长度
  pattern: "^[a-zA-Z0-9]+$"     # 正则表达式
  message: "字符串验证失败"
```

**数字验证示例：**
```yaml
validation:
  type: "number"
  min: 0                        # 最小值
  max: 100                      # 最大值
  step: 0.1                     # 步长
  message: "数字验证失败"
```

#### 5.2 可视化组件 (UI)

**用途：** 通过描述UI组件，实现可视化界面配置。

**UI组件类型表：**

| 组件类型 | 说明 | 适用参数类型 |
|---------|------|-------------|
| `input` | 文本输入框 | string |
| `textarea` | 多行文本输入 | string |
| `inputNumber` | 数字输入框 | integer, number |
| `select` | 下拉选择 | string, integer |
| `radio` | 单选按钮 | string, integer, boolean |
| `switch` | 开关 | boolean |
| `slider` | 滑块 | integer, number |
| `checkbox` | 复选框 | boolean |
| `file` | 文件选择 | string |
| `fileInput` | 文件上传 | string |
| `collapse` | 折叠面板 | 用于分组 |

**UI配置结构：**

UI配置采用分层设计，支持灵活的属性透传：

```yaml
ui:
  component: "input"              # 组件类型（必需）
  options:                         # 选项列表（用于 select、radio）
    - label: "选项1"
      value: "option1"
  itemProps:                       # Form.Item 的属性（可选）
    layout: "vertical"             # 布局方式：vertical 或 horizontal
    style:                         # 自定义样式
      marginBottom: 16
  componentProps:                  # 内部组件的属性（可选）
    placeholder: "请输入文本"       # 占位符
    min: 0                         # 最小值（用于 inputNumber、slider）
    max: 100                       # 最大值（用于 inputNumber、slider）
    step: 1                        # 步长（用于 inputNumber、slider）
    marks:                         # 标记（用于 slider）
      0: "最小值"
      50: "中间值"
      100: "最大值"
```

**配置说明：**

- **component**：组件类型，必需字段，指定使用哪种UI组件
- **options**：选项列表，用于 `select` 和 `radio` 组件，包含 `label` 和 `value`
- **itemProps**：透传给 `Form.Item` 的属性，支持所有 Ant Design Form.Item 支持的属性，例如：`tooltip`、`layout`、`dependencies` 等
  - 常用属性：`layout`（布局方式）、`style`（样式）、`tooltip`（提示信息）等
- **componentProps**：透传给内部组件的属性，支持对应组件类型的所有属性
  - 例如：`placeholder`、`min`、`max`、`step`、`marks`、`rows`、`maxLength` 等

**UI组件配置示例：**

**文本输入框：**
```yaml
ui:
  component: "input"
  componentProps:
    placeholder: "请输入文本"
    maxLength: 100
```

**多行文本输入（垂直布局）：**
```yaml
ui:
  component: "textarea"
  itemProps:
    layout: "vertical"
  componentProps:
    placeholder: "请输入多行文本"
    rows: 6
    maxLength: 1000
```

**数字输入框：**
```yaml
ui:
  component: "inputNumber"
  componentProps:
    min: 0
    max: 100
    step: 1
    precision: 2
```

**下拉选择：**
```yaml
ui:
  component: "select"
  options:
    - label: "选项1"
      value: "option1"
    - label: "选项2"
      value: "option2"
  componentProps:
    placeholder: "请选择"
    allowClear: true
```

**单选按钮：**
```yaml
ui:
  component: "radio"
  options:
    - label: "选项1"
      value: "option1"
    - label: "选项2"
      value: "option2"
  componentProps:
    buttonStyle: "solid"
```

**滑块：**
```yaml
ui:
  component: "slider"
  componentProps:
    min: 0
    max: 100
    step: 5
    marks:
      0: "最小值"
      50: "中间值"
      100: "最大值"
```

**开关：**
```yaml
ui:
  component: "switch"
  componentProps:
    checkedChildren: "开启"
    unCheckedChildren: "关闭"
```

**文件上传：**
```yaml
ui:
  component: "fileInput"
  componentProps:
    placeholder: "选择文件"
    accept: ".csv,.xlsx"
```

### 6. 数据可视化配置[可选]

**用途：** 定义算子的数据可视化方式，支持图表、表格等任意可视化组件。

**注意：**
- 不建议所有算子都配置数据可视化，因为这会增加用户的使用复杂度
- 建议仅为需要展示数据的算子配置数据可视化，比如数据分析类的算子

**核心功能：**
- 配置后，Web前端自动加载 `entry_file` 展示节点数据
- 支持两种实现方式：
  1. **前端可视化**：使用 CommonJS、React 组件，需添加 Data-JS-SDK
  2. **Python 生成可视化**：使用 Python 库（如 Plotly、Matplotlib）生成 HTML 或图片，前端直接渲染
- 可视化组件可访问节点的输入或输出数据

#### 方式 1：前端可视化（推荐）

使用前端 JavaScript/React 组件实现可视化，支持实时数据更新。

```yaml
data_visualization:
  entry_file: "./preview/main.tsx"    # 前端入口文件
  use_babel: true                     # 是否使用Babel编译
  always_expand: true                 # 总是展开预览
  icon: "line-chart"                  # 图标名称
  color: "#52c41a"                    # 主题颜色
  allow_fullscreen: true              # 是否允许全屏
  size:                               # 区域大小
    width: auto                        # 宽度
    height: 120                        # 高度
```

#### 方式 2：Python 生成可视化

使用 Python 库（如 Plotly、Matplotlib）生成 HTML 或图片，前端直接渲染。

```yaml
data_visualization:
  entry_file: "./preview/main.html"   # Python 生成的 HTML 文件路径
  visualization_type: "python_html"   # 可视化类型：python_html 或 python_image
  always_expand: true                 # 总是展开预览
  icon: "line-chart"                  # 图标名称
  color: "#1890ff"                    # 主题颜色
  allow_fullscreen: true              # 是否允许全屏
  size:                               # 区域大小
    width: auto                        # 宽度
    height: 300                        # 高度
```

**Python 生成可视化说明：**
- `visualization_type`: 可选值
  - `python_html`: Python 生成 HTML 文件（如 Plotly HTML）
  - `python_image`: Python 生成图片文件（如 PNG、SVG）
- Python 算子需要在执行时生成可视化文件，并返回文件路径
- 前端会自动加载并渲染生成的文件

### 7. 执行配置[可选]

**用途：** 定义算子的执行环境配置，支持系统默认配置和用户自定义配置的覆盖机制。

#### 7.1 系统默认配置

系统为所有算子提供以下默认配置，用户可以在算子配置中覆盖这些默认值：

```yaml
# 系统默认配置（无需在算子配置中声明）
system_defaults:
  execution:
    timeout: 300                  # 默认超时时间（秒）
    max_memory: "1GB"            # 默认最大内存使用
    max_cpu: 2                   # 默认最大CPU核心数
    retry:
      max_attempts: 3            # 默认最大重试次数
      backoff: "exponential"     # 默认退避策略
      initial_delay: 1           # 默认初始延迟（秒）
      max_delay: 60              # 默认最大延迟（秒）
  logging:
    level: "INFO"                # 默认日志级别
    format: "json"               # 默认日志格式
    max_file_size: "100MB"       # 默认日志文件最大大小
  monitoring:
    enabled: true                # 默认启用监控
    metrics_interval: 30         # 默认指标收集间隔（秒）
    health_check: true           # 默认启用健康检查
```

#### 7.2 配置合并规则

用户可以在算子配置中定义 `execution` 部分来覆盖系统默认配置，配置合并遵循以下优先级规则（从高到低）：
1. **用户显式配置**：在算子配置中明确设置的值
2. **算子默认配置**：在算子配置中设置的默认值
3. **系统默认配置**：系统提供的全局默认值

#### 7.3 配置验证

系统会在配置加载时进行验证：
- 检查配置项的数据类型
- 验证数值范围（如超时时间不能为负数）
- 确保内存和CPU限制在系统允许范围内
- 验证重试策略的有效性

**错误处理示例：**
```yaml
# 无效配置（会被系统拒绝）
execution:
  timeout: -1                  # 错误：超时时间不能为负数
  max_memory: "invalid"        # 错误：无效的内存格式
  retry:
    max_attempts: 0            # 错误：重试次数必须大于0
```

### 9. Mockdata配置[可选]

**用途：** 在算子开发过程中，定义算子的测试数据源，支持四种类型。

#### 9.1 JSON文件类型 (json)

```yaml
mockdata:
  type: "json"
  path_type: "relative"         # 或 "absolute"
  path: "./test_data.json"
```

#### 9.2 文件类型 (file)

```yaml
mockdata:
  type: "file"
  path_type: "relative"         # 或 "absolute"
  path: "./test_data.json"
  data_format: "json_dict"      # 或 "csv_rows"
```

#### 9.3 Remote json类型（remote_json）

```yaml
mockdata:
  type: "remote_json"
  url: "https://api.example.com/mock-data"
```

#### 9.4 Mock Shell类型 (mock_shell)

```yaml
mockdata:
  type: "mock_shell"
  shell_file_path: "./generate_mock_data.sh"
  shell_params:
    data_points: 100
    baseline_pressure: 5.0
```



---

### 9. 完整配置示例

```yaml
name: "my_operator"
version: "1.0.0"
description: "我的算子"
author: "Your Name"
license: "MIT"
type: "data_processing"
category: "数据处理"
tags: ["example"]

code_path: "main.py"
entry_point: "MyOperator"

inputs:
  - name: "dataframe"
    type: "pandas.DataFrame"
    description: "输入数据"
    required: true

outputs:
  - name: "result"
    type: "pandas.DataFrame"
    description: "处理结果"

operator_params:
  - name: "param1"
    label: "参数1"
    type: "string"
    description: "参数描述"
    required: true
    default: "default_value"
    ui:
      component: "input"
      componentProps:
        placeholder: "请输入参数"
        maxLength: 100

execution:
  timeout: 300
  max_memory: "1GB"
  max_cpu: 2

mockdata:
  type: "json"
  path_type: "relative"
  path: "./test_data.json"
```

---

### 10. 命名规范

**命名规则：**
- **算子名称**: 使用小写字母和下划线，如 `rocket_engine_pressure_analyzer`
- **参数名称**: 使用小写字母和下划线，如 `baseline_pressure`
- **标签**: 使用小写字母和下划线，如 `anomaly_detection`

---

### 11. 重点总结

#### 🔑 必需配置项
1. **基本信息**: name, version, description, author, license, type, category
2. **代码路径**: code_path, entry_point, operator_type

#### 🔑 推荐配置项
1. **输入定义**: inputs（非数据源头处理算子，建议要有定义）
2. **输出定义**: outputs（非数据可视化类算子，或者会产生新的数据结构的算子，建议要有定义）

#### 📋 可选配置项
1. **用户配置**: operator_params（用于UI表单）
2. **数据可视化**: data_visualization
3. **执行配置**: execution
4. **Mockdata配置**: mockdata

#### 💡 重要原则
- 新创建的算子，请不要忘记注册到算子管理器中，详细请参考[注册算子](./WORKFLOW_STANDARD_FOR_AI.md#211-命令行使用)
- `inputs` 用于描述输入数据的数据结构，`operator_params` 用于描述用户自定义的配置项，通常在设计workflow时配置
- 建议为每个参数提供 `label`、`type`、`description`
- 前端根据 `ui.component` 自动渲染输入组件

---

## 第二部分：算子开发SDK

### 1. 基类继承

**核心要求：** 所有算子必须继承自对应语言的 `BzOperator` 基类。

#### Python 算子

```python
from py_operator_sdk import BzOperator

class MyOperator(BzOperator):
    def setup(self):
        """初始化算子，在构造函数中调用"""
        pass
    
    def execute(self, inputs):
        """执行算子核心逻辑，必须实现"""
        pass
    
    def validate_inputs(self, inputs):
        """验证输入数据，[可选]重写"""
        return True
    
    def cleanup(self):
        """清理资源，[可选]重写"""
        pass
```

#### TypeScript 算子

```typescript
import { BzOperator, OperatorInputs, OperatorOutputs } from '../../ts_operator_sdk';

class MyOperator extends BzOperator {
  setup(): void {
    // 初始化算子，在构造函数中调用
  }

  execute(inputs: OperatorInputs): OperatorOutputs | Promise<OperatorOutputs> {
    // 执行算子核心逻辑，必须实现
  }

  validateInputs(inputs: OperatorInputs): boolean {
    // 验证输入数据，[可选]重写
    return true;
  }

  cleanup(): void {
    // 清理资源，[可选]重写
  }
}
```

### 2. 配置访问

**配置获取方式：**

#### Python 算子

```python
def setup(self):
    # 从 self.config 中获取 operator_params
    param1 = self.config.get('param1', 'default_value')
    
    # 获取环境配置
    api_config = self.get_api_config('openai')
    db_config = self.get_database_config('postgresql')
    global_var = self.get_global_variable('debug_mode')
```

#### TypeScript 算子

```typescript
setup(): void {
  // 从 this.config 中获取 operator_params
  const param1 = this.config.param1 || 'default_value';
  
  // 获取环境配置
  const apiConfig = this.getApiConfig('openai');
  const dbConfig = this.getDatabaseConfig('postgresql');
  const globalVar = this.getGlobalVariable('debug_mode');
}
```

### 3. 日志记录

**日志使用规范：**

```python
from loguru import logger

class MyOperator(BzOperator):
    def execute(self, inputs):
        logger.info("开始处理数据")
        logger.error("处理失败: {}", error)
```

# Plotly.js 高级图表查看器 (Pro)

这是 `plotlyjs_chart_viewer` 的高级版本，提供了更丰富的配置选项和功能。

## 主要特性

### 1. 更多图表类型
- **基础图表**: 散点图、折线图、柱状图、水平柱状图、面积图
- **统计图表**: 箱线图、小提琴图、直方图
- **特殊图表**: 热力图、饼图、雷达图
- **3D图表**: 3D散点图、3D表面图

### 2. 多系列数据支持
- 支持多个 Y 轴字段，自动创建多个数据系列
- 每个系列可以有不同的颜色和样式
- 支持图例显示和自定义位置

### 3. 丰富的自定义选项
- **标题和轴标签**: 可自定义图表标题、X轴和Y轴标题
- **颜色主题**: 支持多种 Plotly 内置主题（plotly、plotly_dark、ggplot2、seaborn 等）
- **图例配置**: 可控制图例显示和位置（顶部、底部、左侧、右侧等8个位置）
- **网格线**: 可控制是否显示网格线
- **标记点大小**: 可调整散点图中标记点的大小
- **线条宽度**: 可调整折线图中线条的宽度
- **透明度**: 可调整图表元素的透明度

### 4. 交互功能
- **缩放和平移**: 可控制是否允许用户缩放和平移图表
- **下载功能**: 可启用下载按钮，允许用户将图表保存为图片
- **动画效果**: 支持数据更新时的动画过渡效果

### 5. 3D 图表支持
- 支持 3D 散点图和 3D 表面图
- 可配置 Z 轴字段
- 支持 3D 旋转和缩放

## 配置参数说明

### 基础配置
- `chart_type`: 图表类型（scatter、line、bar、barh、area、box、violin、histogram、heatmap、scatter3d、surface、pie、scatterpolar）
- `x_field`: X轴字段名，支持多个字段用逗号分隔
- `y_fields`: Y轴字段名，支持多个字段用逗号分隔（多系列）
- `z_field`: Z轴字段名（仅用于3D图表）

### 显示配置
- `mode`: 显示模式（markers、lines、lines+markers 等）
- `chart_title`: 图表标题
- `x_axis_title`: X轴标题
- `y_axis_title`: Y轴标题

### 样式配置
- `color_theme`: 颜色主题（plotly、plotly_dark、ggplot2、seaborn 等）
- `show_legend`: 是否显示图例
- `legend_position`: 图例位置（top、bottom、left、right 等）
- `show_grid`: 是否显示网格线
- `marker_size`: 标记点大小（1-50）
- `line_width`: 线条宽度（1-10）
- `opacity`: 透明度（0-1）

### 交互配置
- `animation`: 是否启用动画
- `enable_zoom`: 是否允许缩放
- `enable_pan`: 是否允许平移
- `enable_download`: 是否显示下载按钮

## 使用示例

### 示例1: 多系列折线图
```yaml
chart_type: "line"
x_field: "date"
y_fields: "sales,profit,expenses"
chart_title: "销售数据分析"
show_legend: true
legend_position: "top"
color_theme: "plotly"
```

### 示例2: 3D散点图
```yaml
chart_type: "scatter3d"
x_field: "x"
y_fields: "y"
z_field: "z"
chart_title: "3D数据分布"
enable_zoom: true
```

### 示例3: 热力图
```yaml
chart_type: "heatmap"
x_field: "category"
y_fields: "value"
chart_title: "数据热力图"
color_theme: "seaborn"
```

## 数据格式

### 对象数组格式
```json
[
  {"x": 1, "y1": 10, "y2": 20, "z": 5},
  {"x": 2, "y1": 15, "y2": 25, "z": 6},
  {"x": 3, "y1": 12, "y2": 22, "z": 7}
]
```

### Trace 格式（直接使用 Plotly trace）
```json
[
  {
    "x": [1, 2, 3],
    "y": [10, 15, 12],
    "type": "scatter",
    "mode": "lines+markers",
    "name": "系列1"
  },
  {
    "x": [1, 2, 3],
    "y": [20, 25, 22],
    "type": "scatter",
    "mode": "lines+markers",
    "name": "系列2"
  }
]
```

## 与原版对比

| 功能 | 原版 | Pro版 |
|------|------|-------|
| 图表类型 | 4种 | 13种 |
| 多系列支持 | ❌ | ✅ |
| 3D图表 | ❌ | ✅ |
| 标题自定义 | ❌ | ✅ |
| 颜色主题 | 固定 | 6种可选 |
| 图例配置 | 固定 | 可配置位置 |
| 标记点大小 | 固定 | 可配置 |
| 线条宽度 | 固定 | 可配置 |
| 透明度 | 固定 | 可配置 |
| 动画效果 | ❌ | ✅ |
| 下载功能 | ❌ | ✅ |
| 缩放/平移控制 | ❌ | ✅ |

## 注意事项

1. **多系列数据**: 使用 `y_fields` 参数，多个字段用逗号分隔，例如 `"y1,y2,y3"`
2. **3D图表**: 需要提供 `z_field` 参数
3. **热力图**: 数据格式需要是二维数组或特殊格式
4. **饼图**: 使用 `x_field` 作为标签，`y_fields` 作为值
5. **雷达图**: 使用 `x_field` 作为角度，`y_fields` 作为半径

## 技术实现

- 纯前端实现，无需后端执行
- 使用 Plotly.js 2.26.0
- 通过 postMessage 与主应用通信
- 支持实时数据更新
- 响应式设计，自适应容器大小

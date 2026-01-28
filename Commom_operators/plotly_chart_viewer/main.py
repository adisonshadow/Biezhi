#!/usr/bin/env python3
"""
Plotly 图表查看器算子
使用 Plotly 生成交互式 HTML 图表，仅用于可视化展示
"""

import os
import json
from pathlib import Path
from typing import Dict, Any
from loguru import logger

try:
    import plotly.graph_objects as go
    import plotly.express as px
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False
    logger.warning("Plotly 未安装，请运行: pip install plotly")

from py_operator_sdk.operator import BzOperator


class PlotlyChartViewer(BzOperator):
    """Plotly 图表查看器算子 - 使用 Python Plotly 生成交互式图表"""
    
    def setup(self):
        """初始化算子"""
        if not PLOTLY_AVAILABLE:
            raise ImportError("Plotly 未安装，请安装: pip install plotly")
        logger.info("PlotlyChartViewer算子初始化")
        
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行操作 - 生成 Plotly HTML 图表
        
        Args:
            inputs: 输入数据字典，包含要可视化的数据
            
        Returns:
            Dict[str, Any]: 包含生成的 HTML 文件路径
        """
        try:
            data = inputs.get("data")
            if data is None:
                logger.warning("输入数据为空")
                return {}
            
            if not isinstance(data, list):
                logger.warning(f"输入数据不是列表类型: {type(data)}")
                return {}
            
            if len(data) == 0:
                logger.warning("输入数据为空列表")
                return {}
            
            logger.info(f"接收到 {len(data)} 条数据，开始生成 Plotly 图表")
            
            # 获取配置参数
            chart_type = self.config.get("chart_type", "line")
            x_field = self.config.get("x_field", "x")
            y_field = self.config.get("y_field", "y")
            
            # 提取数据
            x_values = [item.get(x_field) for item in data if isinstance(item, dict)]
            y_values = [item.get(y_field) for item in data if isinstance(item, dict)]
            
            if not x_values or not y_values:
                logger.error(f"无法从数据中提取字段: x_field={x_field}, y_field={y_field}")
                return {}
            
            # 创建图表
            fig = self._create_chart(chart_type, x_values, y_values, x_field, y_field)
            
            # 获取算子目录
            operator_path = Path(__file__).parent
            preview_dir = operator_path / "preview"
            preview_dir.mkdir(exist_ok=True)
            
            # 获取节点 ID，用于命名文件
            node_id = self.get_node_id()
            if node_id:
                # 使用节点 ID 命名文件
                html_file = preview_dir / f"{node_id}.html"
            else:
                # 如果没有节点 ID，使用默认名称
                html_file = preview_dir / "main.html"
            
            fig.write_html(str(html_file), include_plotlyjs='cdn', config={'displayModeBar': True})
            
            logger.info(f"Plotly 图表已生成: {html_file}")
            
            # 返回文件路径（供前端加载）
            return {
                "visualization_file": str(html_file.relative_to(operator_path))
            }
            
        except Exception as e:
            logger.error(f"生成 Plotly 图表时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {}
    
    def _create_chart(self, chart_type: str, x_values: list, y_values: list, 
                     x_field: str, y_field: str) -> go.Figure:
        """创建 Plotly 图表"""
        
        if chart_type == "line":
            fig = go.Figure(data=go.Scatter(
                x=x_values,
                y=y_values,
                mode='lines+markers',
                name='数据',
                line=dict(color='#6366f1', width=2),
                marker=dict(size=6)
            ))
        elif chart_type == "scatter":
            fig = go.Figure(data=go.Scatter(
                x=x_values,
                y=y_values,
                mode='markers',
                name='数据',
                marker=dict(size=8, color='#6366f1')
            ))
        elif chart_type == "bar":
            fig = go.Figure(data=go.Bar(
                x=x_values,
                y=y_values,
                name='数据',
                marker=dict(color='#6366f1')
            ))
        elif chart_type == "area":
            fig = go.Figure(data=go.Scatter(
                x=x_values,
                y=y_values,
                mode='lines',
                name='数据',
                fill='tozeroy',
                line=dict(color='#6366f1', width=2),
                fillcolor='rgba(99, 102, 241, 0.3)'
            ))
        else:
            # 默认使用折线图
            fig = go.Figure(data=go.Scatter(
                x=x_values,
                y=y_values,
                mode='lines+markers',
                name='数据',
                line=dict(color='#6366f1', width=2)
            ))
        
        # 设置布局
        fig.update_layout(
            title={
                'text': f'{chart_type.upper()} Chart',
                'x': 0.5,
                'xanchor': 'center'
            },
            xaxis_title=x_field,
            yaxis_title=y_field,
            hovermode='closest',
            template='plotly_white',
            height=400,
            margin=dict(l=50, r=50, t=50, b=50)
        )
        
        return fig

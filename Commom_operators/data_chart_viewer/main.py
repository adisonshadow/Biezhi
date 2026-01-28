#!/usr/bin/env python3
"""
数据图表查看器算子
仅用于数据可视化展示，不产生输出
"""

from typing import Dict, Any
from loguru import logger

from py_operator_sdk.operator import BzOperator


class DataChartViewer(BzOperator):
    """数据图表查看器算子 - 仅用于可视化展示"""
    
    def setup(self):
        """初始化算子"""
        logger.info("DataChartViewer算子初始化 - 这是一个可视化展示算子，不产生输出")
        
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行操作 - 仅用于数据可视化展示
        
        Args:
            inputs: 输入数据字典，包含要可视化的数据
            
        Returns:
            Dict[str, Any]: 空字典（不产生输出）
        """
        try:
            data = inputs.get("data")
            if data is None:
                logger.warning("输入数据为空")
                return {}
            
            if not isinstance(data, list):
                logger.warning(f"输入数据不是列表类型: {type(data)}")
                return {}
            
            logger.info(f"接收到 {len(data)} 条数据用于可视化展示")
            
            # 这个算子不产生输出，数据会通过 SSE 传递给前端可视化组件
            # 前端组件会通过 data-visualization-js-sdk 获取输入数据并渲染图表
            return {}
            
        except Exception as e:
            logger.error(f"处理数据时出错: {str(e)}")
            return {}

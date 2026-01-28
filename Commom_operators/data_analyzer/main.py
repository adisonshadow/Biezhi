#!/usr/bin/env python3
"""
数据分析算子
支持分组统计、聚合分析、描述性统计
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from loguru import logger

from py_operator_sdk.operator import BzOperator


class DataAnalyzer(BzOperator):
    """数据分析算子"""
    
    def setup(self):
        """初始化算子"""
        logger.info("DataAnalyzer算子初始化")
        
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行数据分析操作
        
        Args:
            inputs: 输入数据字典
            
        Returns:
            Dict[str, Any]: 输出数据字典
        """
        try:
            # 获取输入数据
            dataframe = inputs.get("dataframe")
            if dataframe is None:
                raise ValueError("输入数据中缺少dataframe")
            
            if not isinstance(dataframe, pd.DataFrame):
                raise ValueError("输入数据必须是pandas.DataFrame类型")
            
            logger.info(f"开始分析数据，数据形状: {dataframe.shape}")
            
            analysis_type = self.config.get("analysis_type", "groupby")
            
            if analysis_type == "groupby":
                result_df, summary = self._groupby_analysis(dataframe)
            elif analysis_type == "describe":
                result_df, summary = self._describe_analysis(dataframe)
            elif analysis_type == "correlation":
                result_df, summary = self._correlation_analysis(dataframe)
            else:
                raise ValueError(f"不支持的分析类型: {analysis_type}")
            
            logger.info(f"数据分析完成，结果形状: {result_df.shape}")
            
            return {
                "analysis_result": result_df,
                "statistics_summary": summary
            }
            
        except Exception as e:
            logger.error(f"数据分析失败: {str(e)}")
            raise
    
    def _groupby_analysis(self, df: pd.DataFrame) -> tuple:
        """分组统计分析"""
        group_by_columns = self.config.get("group_by_columns", "")
        aggregate_columns = self.config.get("aggregate_columns", "")
        aggregate_functions = self.config.get("aggregate_functions", "count,mean")
        
        if not group_by_columns:
            # 如果没有指定分组列，返回整体统计
            logger.info("未指定分组列，返回整体统计")
            return self._describe_analysis(df)
        
        # 解析分组列
        group_cols = [col.strip() for col in group_by_columns.split(",") if col.strip()]
        existing_group_cols = [col for col in group_cols if col in df.columns]
        
        if not existing_group_cols:
            raise ValueError(f"分组列 {group_cols} 在数据中不存在")
        
        # 解析聚合列
        agg_cols = [col.strip() for col in aggregate_columns.split(",") if col.strip()]
        existing_agg_cols = [col for col in agg_cols if col in df.columns]
        
        # 解析聚合函数
        funcs = [f.strip() for f in aggregate_functions.split(",") if f.strip()]
        
        # 如果没有指定聚合列，使用所有数值列
        if not existing_agg_cols:
            existing_agg_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not existing_agg_cols:
            # 如果没有数值列，只做计数
            result_df = df.groupby(existing_group_cols).size().reset_index(name='count')
            summary = {
                "analysis_type": "groupby",
                "group_by_columns": existing_group_cols,
                "total_groups": len(result_df)
            }
            return result_df, summary
        
        # 构建聚合字典
        agg_dict = {}
        for col in existing_agg_cols:
            col_funcs = []
            for func in funcs:
                if func == "count":
                    col_funcs.append("count")
                elif func == "sum":
                    col_funcs.append("sum")
                elif func == "mean":
                    col_funcs.append("mean")
                elif func == "median":
                    col_funcs.append("median")
                elif func == "min":
                    col_funcs.append("min")
                elif func == "max":
                    col_funcs.append("max")
                elif func == "std":
                    col_funcs.append("std")
            if col_funcs:
                agg_dict[col] = col_funcs
        
        # 执行分组聚合
        result_df = df.groupby(existing_group_cols)[existing_agg_cols].agg(agg_dict).reset_index()
        
        # 扁平化列名
        result_df.columns = ['_'.join(col).strip() if isinstance(col, tuple) else col 
                            for col in result_df.columns.values]
        
        summary = {
            "analysis_type": "groupby",
            "group_by_columns": existing_group_cols,
            "aggregate_columns": existing_agg_cols,
            "aggregate_functions": funcs,
            "total_groups": len(result_df),
            "total_rows": len(df)
        }
        
        return result_df, summary
    
    def _describe_analysis(self, df: pd.DataFrame) -> tuple:
        """描述性统计分析"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if numeric_cols:
            result_df = df[numeric_cols].describe().T
        else:
            # 如果没有数值列，返回基本信息
            result_df = pd.DataFrame({
                'count': [len(df)],
                'unique': [df.nunique().sum()],
                'top': [df.mode().iloc[0].to_dict() if not df.empty else {}],
                'freq': [df.value_counts().iloc[0] if not df.empty else 0]
            })
        
        summary = {
            "analysis_type": "describe",
            "numeric_columns": numeric_cols,
            "total_rows": len(df),
            "total_columns": len(df.columns)
        }
        
        return result_df, summary
    
    def _correlation_analysis(self, df: pd.DataFrame) -> tuple:
        """相关性分析"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            raise ValueError("相关性分析需要至少2个数值列")
        
        result_df = df[numeric_cols].corr()
        
        summary = {
            "analysis_type": "correlation",
            "numeric_columns": numeric_cols,
            "correlation_matrix_size": f"{len(numeric_cols)}x{len(numeric_cols)}"
        }
        
        return result_df, summary
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """验证输入数据"""
        if "dataframe" not in inputs:
            logger.error("输入数据中缺少dataframe")
            return False
        
        if not isinstance(inputs["dataframe"], pd.DataFrame):
            logger.error("输入数据必须是pandas.DataFrame类型")
            return False
        
        return True
    
    def cleanup(self):
        """清理资源"""
        logger.info("DataAnalyzer算子清理完成")


#!/usr/bin/env python3
"""
数据清洗算子
清理空值、格式化数据、处理异常值
"""

import pandas as pd
import numpy as np
from typing import Dict, Any
from loguru import logger

from py_operator_sdk.operator import BzOperator


class DataCleaner(BzOperator):
    """数据清洗算子"""
    
    def setup(self):
        """初始化算子"""
        logger.info("DataCleaner算子初始化")
        
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行数据清洗操作
        
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
            
            logger.info(f"开始清洗数据，原始数据形状: {dataframe.shape}")
            
            # 复制数据框，避免修改原始数据
            cleaned_df = dataframe.copy()
            
            # 1. 删除指定的列
            columns_to_drop = self.config.get("columns_to_drop", "")
            if columns_to_drop:
                columns_list = [col.strip() for col in columns_to_drop.split(",") if col.strip()]
                existing_columns = [col for col in columns_list if col in cleaned_df.columns]
                if existing_columns:
                    cleaned_df = cleaned_df.drop(columns=existing_columns)
                    logger.info(f"删除了列: {existing_columns}")
            
            # 2. 标准化列名
            if self.config.get("normalize_columns", False):
                cleaned_df.columns = cleaned_df.columns.str.strip().str.lower().str.replace(" ", "_")
                logger.info("已标准化列名")
            
            # 3. 处理空值
            drop_na_strategy = self.config.get("drop_na_strategy", "none")
            if drop_na_strategy != "none":
                cleaned_df = self._handle_missing_values(cleaned_df, drop_na_strategy)
            
            # 4. 删除重复行
            if self.config.get("remove_duplicates", True):
                before_count = len(cleaned_df)
                cleaned_df = cleaned_df.drop_duplicates()
                after_count = len(cleaned_df)
                logger.info(f"删除了 {before_count - after_count} 行重复数据")
            
            logger.info(f"数据清洗完成，清洗后数据形状: {cleaned_df.shape}")
            
            return {
                "cleaned_dataframe": cleaned_df
            }
            
        except Exception as e:
            logger.error(f"数据清洗失败: {str(e)}")
            raise
    
    def _handle_missing_values(self, df: pd.DataFrame, strategy: str) -> pd.DataFrame:
        """处理缺失值"""
        if strategy == "drop_rows":
            return df.dropna()
        
        elif strategy == "drop_columns":
            return df.dropna(axis=1)
        
        elif strategy == "fill_numeric_mean":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
            return df
        
        elif strategy == "fill_numeric_median":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
            return df
        
        elif strategy == "fill_text_empty":
            text_cols = df.select_dtypes(include=['object']).columns
            df[text_cols] = df[text_cols].fillna("")
            return df
        
        elif strategy == "fill_text_forward":
            text_cols = df.select_dtypes(include=['object']).columns
            df[text_cols] = df[text_cols].fillna(method='ffill')
            return df
        
        else:
            logger.warning(f"未知的空值处理策略: {strategy}，跳过处理")
            return df
    
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
        logger.info("DataCleaner算子清理完成")


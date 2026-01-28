#!/usr/bin/env python3
"""
数据保存算子
将DataFrame保存到数据库或文件
"""

import pandas as pd
import os
from pathlib import Path
from typing import Dict, Any
from loguru import logger

from py_operator_sdk.operator import BzOperator


class DataSaver(BzOperator):
    """数据保存算子"""
    
    def setup(self):
        """初始化算子"""
        logger.info("DataSaver算子初始化")
        
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行数据保存操作
        
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
            
            logger.info(f"开始保存数据，数据形状: {dataframe.shape}")
            
            save_type = self.config.get("save_type", "database")
            
            if save_type == "database":
                result = self._save_to_database(dataframe)
            elif save_type == "csv":
                result = self._save_to_csv(dataframe)
            elif save_type == "json":
                result = self._save_to_json(dataframe)
            elif save_type == "excel":
                result = self._save_to_excel(dataframe)
            else:
                raise ValueError(f"不支持的保存类型: {save_type}")
            
            logger.info(f"数据保存完成: {result}")
            
            return {
                "save_result": result
            }
            
        except Exception as e:
            logger.error(f"数据保存失败: {str(e)}")
            raise
    
    def _save_to_database(self, df: pd.DataFrame) -> Dict[str, Any]:
        """保存到数据库"""
        from sqlalchemy import create_engine
        
        table_name = self.config.get("table_name", "analysis_result")
        if_exists = self.config.get("if_exists", "replace")
        
        # 获取数据库配置
        try:
            db_config = self.get_database_config("default")
        except:
            db_config = None
        
        if not db_config:
            # 如果没有配置数据库，使用SQLite作为默认
            db_path = os.path.join(os.getcwd(), "config", "analysis_results.db")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            connection_string = f"sqlite:///{db_path}"
        else:
            # 使用配置的数据库连接
            connection_string = db_config.get("connection_string")
            if not connection_string:
                raise ValueError("数据库配置中缺少connection_string")
        
        logger.info(f"保存到数据库: {table_name}, 连接: {connection_string}")
        
        # 创建数据库引擎
        engine = create_engine(connection_string)
        
        # 保存到数据库
        df.to_sql(
            table_name,
            engine,
            if_exists=if_exists,
            index=False
        )
        
        return {
            "type": "database",
            "table_name": table_name,
            "rows_saved": len(df),
            "connection": connection_string,
            "if_exists": if_exists
        }
    
    def _save_to_csv(self, df: pd.DataFrame) -> Dict[str, Any]:
        """保存到CSV文件"""
        file_path = self.config.get("file_path", "./output.csv")
        
        # 确保目录存在
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else ".", exist_ok=True)
        
        df.to_csv(file_path, index=False, encoding='utf-8')
        
        logger.info(f"保存到CSV文件: {file_path}")
        
        return {
            "type": "csv",
            "file_path": file_path,
            "rows_saved": len(df),
            "file_size": os.path.getsize(file_path)
        }
    
    def _save_to_json(self, df: pd.DataFrame) -> Dict[str, Any]:
        """保存到JSON文件"""
        file_path = self.config.get("file_path", "./output.json")
        
        # 确保目录存在
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else ".", exist_ok=True)
        
        df.to_json(file_path, orient='records', indent=2, force_ascii=False)
        
        logger.info(f"保存到JSON文件: {file_path}")
        
        return {
            "type": "json",
            "file_path": file_path,
            "rows_saved": len(df),
            "file_size": os.path.getsize(file_path)
        }
    
    def _save_to_excel(self, df: pd.DataFrame) -> Dict[str, Any]:
        """保存到Excel文件"""
        file_path = self.config.get("file_path", "./output.xlsx")
        
        # 确保目录存在
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else ".", exist_ok=True)
        
        df.to_excel(file_path, index=False, engine='openpyxl')
        
        logger.info(f"保存到Excel文件: {file_path}")
        
        return {
            "type": "excel",
            "file_path": file_path,
            "rows_saved": len(df),
            "file_size": os.path.getsize(file_path)
        }
    
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
        logger.info("DataSaver算子清理完成")


#!/usr/bin/env python3
"""
文件选择和处理算子
支持本地CSV、TXT文件读取，输出DataFrame和数据结构描述
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
import json
from loguru import logger

from py_operator_sdk.operator import BzOperator


class FileSelectorProcessor(BzOperator):
    """文件选择和处理算子"""
    
    def setup(self):
        """初始化算子"""
        pass
        
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行文件选择和处理操作
        
        Args:
            inputs: 输入数据字典
            
        Returns:
            Dict[str, Any]: 输出数据字典
        """
        try:
            # 获取文件路径（从 inputs 或 operator_params 中获取）
            file_path = inputs.get("file_path") or self.config.get("file_path")
            if not file_path:
                raise ValueError("文件路径不能为空")
            
            # 获取配置参数（从 self.config 中获取）
            file_type = self.config.get("file_type", "csv")
            encoding = self.config.get("encoding", "utf-8")
            delimiter = self.config.get("delimiter", ",")
            header_row = self.config.get("header_row", 0)
            skip_rows = self.config.get("skip_rows", 0)
            na_values = self.config.get("na_values", "NA,null,NaN,None")
            auto_detect_types = self.config.get("auto_detect_types", True)
            
            # 解析空值标识
            na_values_list = [v.strip() for v in na_values.split(",") if v.strip()]
            
            # 处理表头行参数
            header = None if header_row == -1 else header_row
            
            # 检查文件是否存在
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 根据文件类型选择读取方式
            if file_type == "csv":
                dataframe = self._read_csv_file(
                    file_path, encoding, delimiter, header, skip_rows, na_values_list
                )
            elif file_type == "txt":
                dataframe = self._read_txt_file(
                    file_path, encoding, delimiter, header, skip_rows, na_values_list
                )
            else:
                raise ValueError(f"不支持的文件类型: {file_type}")
            
            # 自动检测数据类型
            if auto_detect_types:
                dataframe = self._auto_detect_data_types(dataframe)
            
            # 生成数据结构描述
            data_structure = self._generate_data_structure(dataframe)
            
            # 返回结果
            return {
                "dataframe": dataframe,
                "data_structure": data_structure
            }
            
        except Exception as e:
            logger.error(f"文件处理失败: {str(e)}")
            raise
    
    def _read_csv_file(self, file_path: str, encoding: str, delimiter: str, 
                      header: Optional[int], skip_rows: int, na_values: List[str]) -> pd.DataFrame:
        """读取CSV文件"""
        try:
            # 读取CSV文件
            df = pd.read_csv(
                file_path,
                encoding=encoding,
                delimiter=delimiter,
                header=header,
                skiprows=skip_rows,
                na_values=na_values,
                skipinitialspace=True,
                quotechar='"',
                doublequote=True,
                engine='python'
            )
            
            # 清理列名（移除前后空格）
            df.columns = df.columns.str.strip()
            
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError("CSV文件为空")
        except pd.errors.ParserError as e:
            raise ValueError(f"CSV文件解析错误: {str(e)}")
        except UnicodeDecodeError as e:
            raise ValueError(f"文件编码错误，请尝试其他编码格式: {str(e)}")
    
    def _read_txt_file(self, file_path: str, encoding: str, delimiter: str,
                      header: Optional[int], skip_rows: int, na_values: List[str]) -> pd.DataFrame:
        """读取TXT文件"""
        try:
            # 读取TXT文件
            df = pd.read_csv(
                file_path,
                encoding=encoding,
                delimiter=delimiter,
                header=header,
                skiprows=skip_rows,
                na_values=na_values,
                skipinitialspace=True,
                quotechar='"',
                doublequote=True,
                engine='python'
            )
            
            # 清理列名（移除前后空格）
            df.columns = df.columns.str.strip()
            
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError("TXT文件为空")
        except pd.errors.ParserError as e:
            raise ValueError(f"TXT文件解析错误: {str(e)}")
        except UnicodeDecodeError as e:
            raise ValueError(f"文件编码错误，请尝试其他编码格式: {str(e)}")
    
    def _auto_detect_data_types(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """自动检测数据类型"""
        df = dataframe.copy()
        
        for col in df.columns:
            # 尝试转换为数值类型
            try:
                # 尝试转换为数值类型
                numeric_col = pd.to_numeric(df[col], errors='coerce')
                
                # 如果转换成功且有非空值，则使用数值类型
                # 使用最直接的方法：直接赋值，让Pandas处理类型转换
                df[col] = numeric_col
                    
            except (ValueError, TypeError):
                # 转换失败，保持原类型
                pass
        
        return df
    
    def _generate_data_structure(self, dataframe: pd.DataFrame) -> Dict[str, Any]:
        """生成数据结构描述"""
        structure = {
            "file_info": {
                "rows": len(dataframe),
                "columns": len(dataframe.columns),
                "total_cells": len(dataframe) * len(dataframe.columns)
            },
            "columns": [],
            "data_types": {},
            "missing_values": {},
            "basic_statistics": {}
        }
        
        # 列信息
        for col in dataframe.columns:
            col_info = {
                "name": col,
                "dtype": str(dataframe[col].dtype),
                "non_null_count": dataframe[col].count(),
                "null_count": dataframe[col].isnull().sum(),
                "null_percentage": round((dataframe[col].isnull().sum() / len(dataframe)) * 100, 2)
            }
            structure["columns"].append(col_info)
            
            # 数据类型统计
            dtype_str = str(dataframe[col].dtype)
            if dtype_str not in structure["data_types"]:
                structure["data_types"][dtype_str] = 0
            structure["data_types"][dtype_str] += 1
            
            # 缺失值统计
            structure["missing_values"][col] = dataframe[col].isnull().sum()
            
            # 基本统计信息（仅对数值列）
            if pd.api.types.is_numeric_dtype(dataframe[col]):
                # 检查列是否全为空值
                null_count = dataframe[col].isnull().sum()
                total_count = len(dataframe[col])
                is_all_null = (null_count == total_count)
                
                structure["basic_statistics"][col] = {
                    "min": float(dataframe[col].min()) if not is_all_null else None,
                    "max": float(dataframe[col].max()) if not is_all_null else None,
                    "mean": float(dataframe[col].mean()) if not is_all_null else None,
                    "std": float(dataframe[col].std()) if not is_all_null else None,
                    "median": float(dataframe[col].median()) if not is_all_null else None
                }
        
        # 总体统计
        structure["overall_statistics"] = {
            "total_missing_values": dataframe.isnull().sum().sum(),
            "missing_value_percentage": round((dataframe.isnull().sum().sum() / (len(dataframe) * len(dataframe.columns))) * 100, 2),
            "memory_usage": f"{dataframe.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB"
        }
        
        return structure
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """验证输入数据"""
        # file_path 可以从 inputs 或 operator_params (self.config) 中获取
        file_path = inputs.get("file_path") or self.config.get("file_path")
        if not file_path:
            logger.error("文件路径不能为空")
            return False
        
        if not isinstance(file_path, str):
            logger.error("文件路径必须是字符串")
            return False
        
        return True


def main():
    """主函数 - 用于测试"""
    import sys
    
    if len(sys.argv) != 2:
        print("用法: python main.py <文件路径>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # 创建配置
    config = {
        "file_type": "csv",
        "encoding": "utf-8",
        "delimiter": ",",
        "header_row": 0,
        "skip_rows": 0,
        "na_values": "NA,null,NaN,None",
        "auto_detect_types": True
    }
    
    # 创建算子实例
    processor = FileSelectorProcessor(config)
    
    # 测试输入
    inputs = {
        "file_path": file_path
    }
    
    try:
        # 执行处理
        result = processor.execute(inputs)
        
        # 输出结果
        print("文件处理成功!")
        print(f"数据形状: {result['dataframe'].shape}")
        print(f"列名: {list(result['dataframe'].columns)}")
        print("\n数据结构描述:")
        print(json.dumps(result['data_structure'], indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"处理失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
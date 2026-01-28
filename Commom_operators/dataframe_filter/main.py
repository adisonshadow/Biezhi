import json
import pandas as pd
from py_operator_sdk import BzOperator
from loguru import logger

class DataFrameFilter(BzOperator):
    def setup(self):
        """初始化算子"""
        logger.info("DataFrameFilter算子初始化")
        
    def execute(self, inputs):
        """执行过滤逻辑"""
        logger.info("开始执行DataFrame过滤操作")
        
        # 获取输入数据
        dataframe = inputs.get("dataframe")
        if dataframe is None:
            raise ValueError("输入数据中缺少dataframe")
        
        # 获取过滤规则
        filter_rules = self.config.get("filter_rules")
        if not filter_rules:
            raise ValueError("过滤规则不能为空")
        
        # 解析过滤规则
        try:
            rules = json.loads(filter_rules)
        except json.JSONDecodeError as e:
            raise ValueError(f"过滤规则JSON格式错误: {e}")
        
        # 确保规则是列表格式
        if not isinstance(rules, list):
            rules = [rules]
        
        # 应用过滤规则
        filtered_df = dataframe.copy()
        for rule in rules:
            filtered_df = self._apply_filter_rule(filtered_df, rule)
        
        logger.info(f"过滤完成，原始数据行数: {len(dataframe)}, 过滤后数据行数: {len(filtered_df)}")
        
        # 返回过滤结果
        return {
            "filtered_dataframe": filtered_df
        }
    
    def _apply_filter_rule(self, df, rule):
        """应用单个过滤规则"""
        required_keys = ["column", "operator", "value"]
        for key in required_keys:
            if key not in rule:
                raise ValueError(f"过滤规则缺少必需字段: {key}")
        
        column = rule["column"]
        operator = rule["operator"]
        value = rule["value"]
        
        # 检查列是否存在
        if column not in df.columns:
            raise ValueError(f"数据中不存在列: {column}")
        
        # 应用操作符
        if operator == ">":
            return df[df[column] > value]
        elif operator == ">=":
            return df[df[column] >= value]
        elif operator == "<":
            return df[df[column] < value]
        elif operator == "<=":
            return df[df[column] <= value]
        elif operator == "==":
            return df[df[column] == value]
        elif operator == "!=":
            return df[df[column] != value]
        elif operator == "in":
            if not isinstance(value, list):
                raise ValueError("使用'in'操作符时，value必须是列表")
            return df[df[column].isin(value)]
        elif operator == "not in":
            if not isinstance(value, list):
                raise ValueError("使用'not in'操作符时，value必须是列表")
            return df[~df[column].isin(value)]
        else:
            raise ValueError(f"不支持的操作符: {operator}")
    
    def validate_inputs(self, inputs):
        """验证输入数据"""
        if "dataframe" not in inputs:
            return False
        if not isinstance(inputs["dataframe"], pd.DataFrame):
            return False
        return True
    
    def cleanup(self):
        """清理资源"""
        logger.info("DataFrameFilter算子清理完成")

#!/usr/bin/env python3
"""
JSON文件导入算子
支持本地文件上传和网络URL两种方式导入JSON文件
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from loguru import logger

try:
    import requests
except ImportError:
    requests = None

from py_operator_sdk.operator import BzOperator


class JsonFileImporter(BzOperator):
    """JSON文件导入算子"""
    
    def setup(self):
        """初始化算子"""
        if requests is None:
            logger.warning("requests库未安装，网络URL功能将不可用")
    
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行JSON文件导入操作
        
        Args:
            inputs: 输入数据字典
            
        Returns:
            Dict[str, Any]: 输出数据字典，包含解析后的JSON数据和结构描述
        """
        try:
            # 获取配置参数
            source_type = self.config.get("source_type", "local")
            file_path = inputs.get("file_path") or self.config.get("file_path")
            url = inputs.get("url") or self.config.get("url")
            encoding = self.config.get("encoding", "utf-8")
            timeout = self.config.get("timeout", 30)
            verify_ssl = self.config.get("verify_ssl", True)
            
            # 根据来源类型加载JSON数据
            if source_type == "local":
                if not file_path:
                    raise ValueError("本地文件路径不能为空")
                json_data = self._load_from_local(file_path, encoding)
            elif source_type == "network":
                if not url:
                    raise ValueError("网络URL不能为空")
                if requests is None:
                    raise ImportError("requests库未安装，无法使用网络URL功能")
                json_data = self._load_from_network(url, timeout, verify_ssl)
            else:
                raise ValueError(f"不支持的数据来源类型: {source_type}")
            
            # 生成数据结构描述
            data_structure = self._generate_data_structure(json_data)
            
            # 返回结果
            return {
                "data": json_data,
                "data_structure": data_structure
            }
            
        except Exception as e:
            logger.error(f"JSON文件导入失败: {str(e)}")
            raise
    
    def _load_from_local(self, file_path: str, encoding: str) -> Dict[str, Any]:
        """
        从本地文件加载JSON数据
        
        Args:
            file_path: 文件路径
            encoding: 文件编码
            
        Returns:
            Dict[str, Any]: 解析后的JSON数据
        """
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        # 检查文件扩展名
        if not file_path.lower().endswith('.json'):
            logger.warning(f"文件扩展名不是.json: {file_path}")
        
        try:
            # 读取并解析JSON文件
            with open(file_path, 'r', encoding=encoding) as f:
                json_data = json.load(f)
            
            logger.info(f"成功从本地文件加载JSON: {file_path}")
            return json_data
            
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON文件解析错误: {str(e)}")
        except UnicodeDecodeError as e:
            raise ValueError(f"文件编码错误，请尝试其他编码格式: {str(e)}")
        except Exception as e:
            raise ValueError(f"读取文件失败: {str(e)}")
    
    def _load_from_network(self, url: str, timeout: int, verify_ssl: bool) -> Dict[str, Any]:
        """
        从网络URL加载JSON数据
        
        Args:
            url: 网络URL地址
            timeout: 请求超时时间（秒）
            verify_ssl: 是否验证SSL证书
            
        Returns:
            Dict[str, Any]: 解析后的JSON数据
        """
        # 验证URL格式
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError(f"无效的URL格式: {url}")
        
        if parsed_url.scheme not in ['http', 'https']:
            raise ValueError(f"不支持的URL协议: {parsed_url.scheme}，仅支持HTTP和HTTPS")
        
        try:
            # 发送HTTP请求
            logger.info(f"正在从网络加载JSON: {url}")
            response = requests.get(
                url,
                timeout=timeout,
                verify=verify_ssl,
                headers={
                    'User-Agent': 'Biezhi2-JsonFileImporter/1.0.0'
                }
            )
            
            # 检查HTTP状态码
            response.raise_for_status()
            
            # 检查Content-Type
            content_type = response.headers.get('Content-Type', '').lower()
            if 'json' not in content_type:
                logger.warning(f"响应Content-Type不是JSON: {content_type}")
            
            # 解析JSON数据
            try:
                json_data = response.json()
            except json.JSONDecodeError as e:
                raise ValueError(f"响应内容不是有效的JSON格式: {str(e)}")
            
            logger.info(f"成功从网络加载JSON: {url}")
            return json_data
            
        except requests.exceptions.Timeout:
            raise ValueError(f"请求超时（{timeout}秒）: {url}")
        except requests.exceptions.SSLError:
            raise ValueError(f"SSL证书验证失败: {url}，可以尝试关闭SSL验证")
        except requests.exceptions.ConnectionError:
            raise ValueError(f"网络连接失败: {url}")
        except requests.exceptions.HTTPError as e:
            raise ValueError(f"HTTP错误 {e.response.status_code}: {url}")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"网络请求失败: {str(e)}")
    
    def _generate_data_structure(self, json_data: Any) -> Dict[str, Any]:
        """
        生成JSON数据结构描述
        
        Args:
            json_data: JSON数据
            
        Returns:
            Dict[str, Any]: 数据结构描述
        """
        structure = {
            "data_type": self._get_data_type(json_data),
            "size": self._estimate_size(json_data),
            "structure": self._analyze_structure(json_data)
        }
        
        return structure
    
    def _get_data_type(self, data: Any) -> str:
        """获取数据类型"""
        if isinstance(data, dict):
            return "object"
        elif isinstance(data, list):
            return "array"
        elif isinstance(data, str):
            return "string"
        elif isinstance(data, (int, float)):
            return "number"
        elif isinstance(data, bool):
            return "boolean"
        elif data is None:
            return "null"
        else:
            return str(type(data).__name__)
    
    def _estimate_size(self, data: Any) -> Dict[str, Any]:
        """估算数据大小"""
        try:
            json_str = json.dumps(data, ensure_ascii=False)
            size_bytes = len(json_str.encode('utf-8'))
            
            return {
                "bytes": size_bytes,
                "kb": round(size_bytes / 1024, 2),
                "mb": round(size_bytes / 1024 / 1024, 2)
            }
        except Exception:
            return {
                "bytes": 0,
                "kb": 0,
                "mb": 0
            }
    
    def _analyze_structure(self, data: Any, depth: int = 0, max_depth: int = 10) -> Any:
        """
        分析数据结构
        
        Args:
            data: 要分析的数据
            depth: 当前深度
            max_depth: 最大深度
            
        Returns:
            Any: 结构描述
        """
        if depth > max_depth:
            return "..."
        
        if isinstance(data, dict):
            structure = {
                "type": "object",
                "keys": list(data.keys()),
                "key_count": len(data),
                "properties": {}
            }
            
            # 分析每个属性的结构
            for key, value in list(data.items())[:10]:  # 限制分析前10个键
                structure["properties"][key] = {
                    "type": self._get_data_type(value),
                    "structure": self._analyze_structure(value, depth + 1, max_depth)
                }
            
            if len(data) > 10:
                structure["properties"]["..."] = f"还有 {len(data) - 10} 个键"
            
            return structure
            
        elif isinstance(data, list):
            structure = {
                "type": "array",
                "length": len(data),
                "item_type": None,
                "sample_items": []
            }
            
            if len(data) > 0:
                # 分析第一个元素的类型
                first_item_type = self._get_data_type(data[0])
                structure["item_type"] = first_item_type
                
                # 分析前3个元素的结构
                for item in data[:3]:
                    structure["sample_items"].append(
                        self._analyze_structure(item, depth + 1, max_depth)
                    )
                
                if len(data) > 3:
                    structure["sample_items"].append("...")
            
            return structure
            
        else:
            return {
                "type": self._get_data_type(data),
                "value": str(data)[:100] if len(str(data)) > 100 else data
            }
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """验证输入数据"""
        source_type = self.config.get("source_type", "local")
        
        if source_type == "local":
            file_path = inputs.get("file_path") or self.config.get("file_path")
            if not file_path:
                logger.error("本地文件路径不能为空")
                return False
            if not isinstance(file_path, str):
                logger.error("文件路径必须是字符串")
                return False
        
        elif source_type == "network":
            url = inputs.get("url") or self.config.get("url")
            if not url:
                logger.error("网络URL不能为空")
                return False
            if not isinstance(url, str):
                logger.error("URL必须是字符串")
                return False
            if not url.startswith(('http://', 'https://')):
                logger.error("URL必须以http://或https://开头")
                return False
        
        return True


def main():
    """主函数 - 用于测试"""
    import sys
    
    if len(sys.argv) < 3:
        print("用法:")
        print("  本地文件: python main.py local <文件路径>")
        print("  网络URL: python main.py network <URL>")
        sys.exit(1)
    
    source_type = sys.argv[1]
    source_value = sys.argv[2]
    
    # 创建配置
    config = {
        "source_type": source_type,
        "encoding": "utf-8",
        "timeout": 30,
        "verify_ssl": True
    }
    
    if source_type == "local":
        config["file_path"] = source_value
    elif source_type == "network":
        config["url"] = source_value
    else:
        print(f"错误: 不支持的数据来源类型: {source_type}")
        sys.exit(1)
    
    # 创建算子实例
    importer = JsonFileImporter(config)
    
    # 测试输入
    inputs = {}
    if source_type == "local":
        inputs["file_path"] = source_value
    else:
        inputs["url"] = source_value
    
    try:
        # 执行处理
        result = importer.execute(inputs)
        
        # 输出结果
        print("JSON文件导入成功!")
        print(f"\n数据类型: {result['data_structure']['data_type']}")
        print(f"数据大小: {result['data_structure']['size']}")
        print("\n数据结构:")
        print(json.dumps(result['data_structure']['structure'], indent=2, ensure_ascii=False))
        print("\n数据预览（前1000字符）:")
        data_preview = json.dumps(result['data'], indent=2, ensure_ascii=False)
        print(data_preview[:1000])
        if len(data_preview) > 1000:
            print("...")
        
    except Exception as e:
        print(f"处理失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()


#!/usr/bin/env python3
"""
注册所有算子到数据库
使用方法: python scripts/register_operators.py
"""

import os
import sys
import json
import yaml
import requests
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

API_BASE_URL = 'http://localhost:3991/api'

# 算子目录列表
operators = [
    {
        'name': 'file_selector_processor',
        'path': project_root / 'Commom_operators' / 'file_selector_processor'
    },
    {
        'name': 'dataframe_filter',
        'path': project_root / 'Commom_operators' / 'dataframe_filter'
    },
    {
        'name': 'data_cleaner',
        'path': project_root / 'Commom_operators' / 'data_cleaner'
    },
    {
        'name': 'data_analyzer',
        'path': project_root / 'Commom_operators' / 'data_analyzer'
    },
    {
        'name': 'data_saver',
        'path': project_root / 'Commom_operators' / 'data_saver'
    },
    {
        'name': 'json_file_importer',
        'path': project_root / 'Commom_operators' / 'json_file_importer'
    }
]


def register_operator(operator_path):
    """注册单个算子"""
    try:
        yaml_path = operator_path / 'operator.yaml'
        
        if not yaml_path.exists():
            print(f"❌ 算子配置文件不存在: {yaml_path}")
            return None
        
        # 读取YAML配置
        with open(yaml_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # 添加metadata
        config['metadata'] = {
            'operatorPath': str(operator_path)
        }
        
        # 注册算子
        response = requests.post(
            f'{API_BASE_URL}/operators',
            json=config,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ 成功注册算子: {config['name']} (ID: {result.get('id', 'unknown')})")
            return result
        else:
            error_msg = response.json().get('error', response.text)
            print(f"❌ 注册失败: {error_msg}")
            return None
            
    except Exception as e:
        print(f"❌ 注册失败: {str(e)}")
        return None


def main():
    """主函数"""
    print('🚀 开始注册算子...\n')
    
    results = []
    
    for operator in operators:
        print(f"📦 注册算子: {operator['name']}")
        result = register_operator(operator['path'])
        if result:
            results.append(result)
        print('')
    
    print(f"\n✨ 注册完成！成功注册 {len(results)}/{len(operators)} 个算子")
    
    if results:
        print('\n已注册的算子ID:')
        for r in results:
            print(f"  - {r.get('id', 'unknown')}: {r.get('name', 'unknown')}")


if __name__ == '__main__':
    main()


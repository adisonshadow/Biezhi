#!/usr/bin/env python3
"""
Python 算子执行脚本
通过 stdin 接收 JSON 数据，执行算子，通过 stdout 输出结果
支持虚拟环境，避免 macOS externally-managed-environment 限制
"""

import sys
import json
import importlib
import importlib.util
import subprocess
import os
from pathlib import Path

# 尝试导入 numpy 和 pandas（如果可用）
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    np = None

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    pd = None

def is_in_venv() -> bool:
    """检查当前是否在虚拟环境中运行"""
    # 检查 sys.executable 是否在虚拟环境目录中
    executable_path = Path(sys.executable).resolve()
    # 虚拟环境的 Python 通常在 venv/bin/python3 或 .venv/bin/python3 等路径
    return 'venv' in str(executable_path) or '.venv' in str(executable_path) or 'virtualenv' in str(executable_path)

def get_venv_path() -> Path:
    """获取虚拟环境路径"""
    # 尝试从环境变量获取
    venv_path = os.environ.get('BIEZHI_VENV_PATH')
    if venv_path:
        return Path(venv_path)
    
    # 默认在项目根目录下的 venv 目录
    # 脚本位置: api/src/utils/execute_python_operator.py
    # 项目根目录: 向上3级
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent.parent
    return project_root / 'venv'

def ensure_venv():
    """确保虚拟环境存在，如果不存在则创建"""
    venv_path = get_venv_path()
    venv_python = venv_path / 'bin' / 'python3'
    
    if venv_python.exists():
        return venv_path
    
    # 创建虚拟环境
    print(f"创建虚拟环境: {venv_path}", file=sys.stderr)
    result = subprocess.run(
        [sys.executable, '-m', 'venv', str(venv_path)],
        capture_output=True,
        text=True,
        timeout=60
    )
    
    if result.returncode != 0:
        error_msg = f"创建虚拟环境失败 (返回码: {result.returncode}):\n"
        if result.stderr:
            error_msg += f"错误输出: {result.stderr}\n"
        if result.stdout:
            error_msg += f"标准输出: {result.stdout}\n"
        raise RuntimeError(f"无法创建虚拟环境: {error_msg}")
    
    if not venv_python.exists():
        raise RuntimeError(f"虚拟环境创建后 Python 可执行文件不存在: {venv_python}")
    
    return venv_path

def get_python_executable() -> str:
    """获取用于安装依赖的 Python 可执行文件路径"""
    # 如果当前已经在虚拟环境中运行，直接使用当前 Python
    if is_in_venv():
        return sys.executable
    
    # 否则，确保虚拟环境存在并使用虚拟环境中的 Python
    venv_path = ensure_venv()
    venv_python = venv_path / 'bin' / 'python3'
    
    if not venv_python.exists():
        raise RuntimeError(f"虚拟环境 Python 不存在: {venv_python}")
    
    return str(venv_python)

def _check_package_installed(package_name: str) -> bool:
    """检查包是否已安装"""
    try:
        importlib.import_module(package_name.replace('-', '_'))
        return True
    except ImportError:
        try:
            # 尝试导入包的不同名称变体
            variants = [
                package_name.replace('-', '_'),
                package_name.replace('_', '-'),
                package_name.lower(),
            ]
            for variant in variants:
                if variant != package_name:
                    try:
                        importlib.import_module(variant)
                        return True
                    except ImportError:
                        continue
        except:
            pass
        return False

def _extract_package_name(requirement: str) -> str:
    """从 requirements 字符串中提取包名"""
    # 处理各种格式: package>=1.0.0, package==1.0.0, package~=1.0.0
    operators = ['>=', '<=', '==', '~=', '>', '<', '!=', '[']
    package_name = requirement.strip()
    for op in operators:
        if op in package_name:
            package_name = package_name.split(op)[0].strip()
            break
    return package_name.lower()

def install_requirements(operator_path: str):
    """安装算子的依赖包（自动使用虚拟环境，参考旧项目实现）"""
    requirements_path = Path(operator_path) / 'requirements.txt'
    
    if not requirements_path.exists():
        # 如果没有 requirements.txt，跳过安装
        return
    
    python_executable = get_python_executable()
    
    try:
        # 读取 requirements.txt
        with open(requirements_path, 'r', encoding='utf-8') as f:
            requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        # 检查哪些依赖需要安装
        missing_packages = []
        for req in requirements:
            package_name = _extract_package_name(req)
            if not _check_package_installed(package_name):
                missing_packages.append(req)
        
        # 如果所有依赖都已安装，跳过安装步骤
        if not missing_packages:
            return
        
        # 分离 py-operator-sdk 和其他包
        py_operator_sdk_packages = []
        other_packages = []
        for req in missing_packages:
            pkg_name = _extract_package_name(req)
            if pkg_name == 'py-operator-sdk' or pkg_name == 'py_operator_sdk':
                py_operator_sdk_packages.append(req)
            else:
                other_packages.append(req)
        
        # 先尝试安装其他包（不包括 py-operator-sdk）
        if other_packages:
            result = subprocess.run(
                [python_executable, '-m', 'pip', 'install'] + other_packages,
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
            
            if result.returncode != 0:
                # 其他包安装失败，抛出异常
                error_msg = f"依赖安装失败 (返回码: {result.returncode}):\n"
                if result.stderr:
                    error_msg += f"错误输出: {result.stderr}\n"
                if result.stdout:
                    error_msg += f"标准输出: {result.stdout}\n"
                print(error_msg, file=sys.stderr)
                raise RuntimeError(f"无法安装算子依赖: {error_msg}")
        
        # 尝试安装 py-operator-sdk（如果存在）
        if py_operator_sdk_packages:
            result = subprocess.run(
                [python_executable, '-m', 'pip', 'install'] + py_operator_sdk_packages,
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
            
            if result.returncode != 0:
                # py-operator-sdk 安装失败，允许继续（这是项目内部包，导入时会处理）
                error_output = result.stderr or result.stdout or ''
                if 'No matching distribution found' in error_output:
                    print(f"警告: py-operator-sdk 无法从 PyPI 安装，可能是项目内部包，将继续执行（导入时会处理 ImportError）", file=sys.stderr)
                else:
                    # 其他错误，也允许继续（参考旧项目 runner.py 的处理方式）
                    print(f"警告: py-operator-sdk 安装失败，将继续执行: {error_output[:200]}", file=sys.stderr)
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("依赖安装超时（超过5分钟）")
    except RuntimeError:
        # 重新抛出 RuntimeError
        raise
    except Exception as e:
        # 安装过程出错，抛出异常
        raise RuntimeError(f"依赖安装过程出错: {str(e)}")

def load_operator_class(operator_path: str, code_file: str, entry_point: str):
    """动态加载算子类"""
    code_path = Path(operator_path) / code_file
    
    if not code_path.exists():
        raise FileNotFoundError(f"代码文件不存在: {code_path}")
    
    # 将项目根目录添加到 sys.path，以便导入 py_operator_sdk
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent.parent
    project_root_str = str(project_root)
    if project_root_str not in sys.path:
        sys.path.insert(0, project_root_str)
    
    # 将算子路径添加到 sys.path，以便导入算子模块
    operator_path_str = str(Path(operator_path).resolve())
    if operator_path_str not in sys.path:
        sys.path.insert(0, operator_path_str)
    
    # 加载模块
    spec = importlib.util.spec_from_file_location("operator_module", code_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"无法加载模块: {code_path}")
    
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # 获取算子类
    operator_class = getattr(module, entry_point, None)
    if operator_class is None:
        raise AttributeError(f"模块中未找到类: {entry_point}")
    
    return operator_class

def main():
    try:
        # 将项目根目录添加到 sys.path，以便导入 py_operator_sdk
        script_dir = Path(__file__).resolve().parent
        project_root = script_dir.parent.parent.parent
        project_root_str = str(project_root)
        if project_root_str not in sys.path:
            sys.path.insert(0, project_root_str)
        
        # 从 stdin 读取 JSON 数据
        input_data = json.load(sys.stdin)
        
        operator_path = input_data.get('operator_path')
        code_file = input_data.get('code_file', 'main.py')
        entry_point = input_data.get('entry_point')
        config = input_data.get('config', {})
        inputs = input_data.get('inputs', {})
        
        if not operator_path or not entry_point:
            raise ValueError("缺少必要参数: operator_path 和 entry_point")
        
        # 安装算子依赖
        install_requirements(operator_path)
        
        # 加载算子类
        operator_class = load_operator_class(operator_path, code_file, entry_point)
        
        # 创建算子实例
        operator_instance = operator_class(config)
        
        # 调用 setup
        if hasattr(operator_instance, 'setup'):
            operator_instance.setup()
        
        # 执行算子
        result = operator_instance.execute(inputs)
        
        # 序列化结果（处理 DataFrame 等特殊类型）
        def serialize_value(value):
            """递归序列化值，处理 numpy 和 pandas 类型"""
            if value is None:
                return None
            
            # 处理 numpy 标量类型（兼容 NumPy 2.0）
            if HAS_NUMPY:
                # 检查是否是 NaN（必须在类型检查之前）
                if isinstance(value, (float, np.floating)) and np.isnan(value):
                    return None
                # 检查是否是 numpy 整数类型
                elif isinstance(value, np.integer):
                    return int(value)
                # 检查是否是 numpy 浮点数类型
                elif isinstance(value, np.floating):
                    return float(value)
                # 检查是否是 numpy 布尔类型
                elif isinstance(value, np.bool_):
                    return bool(value)
                # 检查是否是 numpy 数组
                elif isinstance(value, np.ndarray):
                    # 处理 numpy 数组
                    return serialize_value(value.tolist())
            
            # 处理 Python 原生的 NaN（float('nan')）
            if isinstance(value, float) and (value != value):  # NaN 不等于自身
                return None
            
            # 处理 pandas Series
            if HAS_PANDAS and isinstance(value, pd.Series):
                return serialize_value(value.tolist())
            elif isinstance(value, (str, int, float, bool)):
                # 再次检查 float 是否为 NaN（双重保险）
                if isinstance(value, float):
                    if HAS_NUMPY and np.isnan(value):
                        return None
                    elif value != value:  # NaN 不等于自身
                        return None
                return value
            elif isinstance(value, (list, tuple)):
                return [serialize_value(item) for item in value]
            elif isinstance(value, dict):
                return {k: serialize_value(v) for k, v in value.items()}
            elif HAS_PANDAS and isinstance(value, pd.DataFrame):  # pandas DataFrame
                try:
                    # 将 DataFrame 转换为字典，并处理其中的 numpy 类型
                    df_dict = value.to_dict(orient='records')
                    # 递归处理字典中的 numpy 类型
                    df_dict_serialized = serialize_value(df_dict)
                    return {
                        '_type': 'pandas.DataFrame',
                        'data': df_dict_serialized,
                        'columns': list(value.columns),
                        'shape': [int(value.shape[0]), int(value.shape[1])],
                        'dtypes': {col: str(dtype) for col, dtype in value.dtypes.items()},
                    }
                except Exception as e:
                    return {
                        '_type': 'pandas.DataFrame',
                        'error': f'序列化失败: {str(e)}',
                        'shape': [int(value.shape[0]), int(value.shape[1])],
                        'columns': list(value.columns),
                    }
            elif hasattr(value, '__dict__'):  # 对象
                try:
                    return serialize_value(value.__dict__)
                except:
                    return str(value)
            else:
                try:
                    # 尝试转换为字符串
                    return str(value)
                except:
                    return repr(value)
        
        serialized_result = {}
        for key, value in result.items():
            serialized_result[key] = serialize_value(value)
        
        # 自定义 JSON 编码器，处理可能的 NaN 值
        def json_default(obj):
            """JSON 编码器的默认处理函数"""
            if HAS_NUMPY and isinstance(obj, (float, np.floating)) and np.isnan(obj):
                return None
            if isinstance(obj, float) and (obj != obj):  # NaN 不等于自身
                return None
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        # 输出 JSON 结果
        print(json.dumps(serialized_result, ensure_ascii=False, indent=2, default=json_default))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'error_type': type(e).__name__,
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    main()


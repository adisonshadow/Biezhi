"""
BzOperator 基类
所有算子必须继承自此类
"""

from typing import Dict, Any, Optional
import os
import json


class BzOperator:
    """
    Biezhi 算子基类
    
    所有算子必须继承此类并实现 execute 方法。
    可选实现 setup, validate_inputs, cleanup 方法。
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化算子
        
        Args:
            config: 算子配置参数字典，包含 operator_params 中定义的所有参数
        """
        self.config = config or {}
        # 调用 setup 方法（如果存在）
        if hasattr(self, 'setup'):
            self.setup()
    
    def setup(self):
        """
        初始化算子，在构造函数中调用
        
        子类可以重写此方法进行初始化操作
        """
        pass
    
    def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行算子核心逻辑，必须实现
        
        Args:
            inputs: 输入数据字典，包含从上游算子传递的数据
            
        Returns:
            Dict[str, Any]: 输出数据字典，包含算子的输出结果
            
        Raises:
            NotImplementedError: 如果子类未实现此方法
        """
        raise NotImplementedError("子类必须实现 execute 方法")
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """
        验证输入数据，可选重写
        
        Args:
            inputs: 输入数据字典
            
        Returns:
            bool: 验证是否通过
        """
        return True
    
    def cleanup(self):
        """
        清理资源，可选重写
        
        在算子执行完成后调用，用于释放资源
        """
        pass
    
    def get_api_config(self, provider: str) -> Optional[Dict[str, Any]]:
        """
        获取 API 配置（如 OpenAI、Claude 等）
        
        Args:
            provider: API 提供商名称（如 'openai', 'claude'）
            
        Returns:
            Optional[Dict[str, Any]]: API 配置字典，如果不存在返回 None
            
        Note:
            此方法从环境变量或配置文件中读取 API 配置
            当前实现从环境变量读取，格式：{PROVIDER}_API_KEY, {PROVIDER}_API_URL 等
        """
        # 从环境变量读取配置
        prefix = provider.upper()
        api_key = os.environ.get(f'{prefix}_API_KEY')
        api_url = os.environ.get(f'{prefix}_API_URL')
        
        if not api_key:
            return None
        
        config = {
            'api_key': api_key,
        }
        
        if api_url:
            config['api_url'] = api_url
        
        # 读取其他可能的配置项
        for key, value in os.environ.items():
            if key.startswith(f'{prefix}_'):
                config_key = key.replace(f'{prefix}_', '').lower()
                config[config_key] = value
        
        return config
    
    def get_database_config(self, db_type: str) -> Optional[Dict[str, Any]]:
        """
        获取数据库配置
        
        Args:
            db_type: 数据库类型（如 'postgresql', 'mysql', 'sqlite'）
            
        Returns:
            Optional[Dict[str, Any]]: 数据库配置字典，如果不存在返回 None
            
        Note:
            此方法从环境变量读取数据库配置
            格式：{DB_TYPE}_HOST, {DB_TYPE}_PORT, {DB_TYPE}_DATABASE, {DB_TYPE}_USER, {DB_TYPE}_PASSWORD
        """
        prefix = db_type.upper()
        host = os.environ.get(f'{prefix}_HOST')
        port = os.environ.get(f'{prefix}_PORT')
        database = os.environ.get(f'{prefix}_DATABASE')
        user = os.environ.get(f'{prefix}_USER')
        password = os.environ.get(f'{prefix}_PASSWORD')
        
        if not host and not database:
            return None
        
        config = {}
        if host:
            config['host'] = host
        if port:
            config['port'] = int(port) if port.isdigit() else port
        if database:
            config['database'] = database
        if user:
            config['user'] = user
        if password:
            config['password'] = password
        
        return config if config else None
    
    def get_global_variable(self, name: str, default: Any = None) -> Any:
        """
        获取全局变量
        
        Args:
            name: 变量名称
            default: 默认值，如果变量不存在
            
        Returns:
            Any: 变量值或默认值
            
        Note:
            此方法从环境变量读取全局变量
            格式：BIEZHI_{NAME}
        """
        env_name = f'BIEZHI_{name.upper()}'
        value = os.environ.get(env_name)
        
        if value is None:
            return default
        
        # 尝试解析 JSON（如果是 JSON 字符串）
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    
    def get_node_id(self) -> Optional[str]:
        """
        获取当前节点的 ID
        
        Returns:
            Optional[str]: 节点 ID，如果不存在返回 None
            
        Note:
            此方法从环境变量 BIEZHI_NODE_ID 读取节点 ID
        """
        return os.environ.get('BIEZHI_NODE_ID')


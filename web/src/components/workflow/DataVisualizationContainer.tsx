/**
 * Data Visualization Container 组件
 * 基于 iframe 沙箱方案，通过 postMessage 实现数据通信
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Spin, Alert } from 'antd';
import type { Operator } from '../../types';
import { useDataVisualizationMonitor } from '../../contexts/DataVisualizationContext';
import type { DataVisualizationContainerRef } from '../../utils/DataVisualizationMonitor';

interface DataVisualizationContainerProps {
  nodeId: string;
  operator: Operator;
  workflowId?: string;
  config?: any;
  nodeInputData?: Record<string, any>; // 节点输入数据，从 SSE 接收
}

// 解析 data_visualization 配置
function parseDataVisualizationConfig(
  config: string | object | null | undefined
): {
  entry_file: string;
  visualization_type?: 'python_html' | 'python_image';
  always_expand?: boolean;
  icon?: string;
  color?: string;
  allow_fullscreen?: boolean;
  allow_resize?: boolean;
  size?: {
    width?: string | number;
    height?: string | number;
  };
} | null {
  if (!config) {
    return null;
  }

  let parsed: any;

  if (typeof config === 'string') {
    try {
      parsed = JSON.parse(config);
    } catch (error) {
      console.error('[DataVisualizationContainer] 解析配置失败:', error);
      return null;
    }
  } else {
    parsed = config;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  if (!parsed.entry_file) {
    console.warn('[DataVisualizationContainer] 配置缺少 entry_file');
    return null;
  }

  return {
    entry_file: parsed.entry_file,
    visualization_type: parsed.visualization_type,
    always_expand: parsed.always_expand ?? false,
    icon: parsed.icon,
    color: parsed.color,
    allow_fullscreen: parsed.allow_fullscreen ?? false,
    allow_resize: parsed.allow_resize ?? false,
    size: parsed.size || {
      width: 'auto',
      height: 120,
    },
  };
}

// 获取 entry_file 的 URL
function getEntryFileUrl(operatorId: string, entryFile: string): string {
  // 处理路径：移除开头的 ./
  const filePath = entryFile.startsWith('./') ? entryFile.substring(2) : entryFile;
  return `/api/operators/${operatorId}/file?path=${encodeURIComponent(filePath)}`;
}

const DataVisualizationContainer: React.FC<DataVisualizationContainerProps> = ({
  nodeId,
  operator,
  workflowId,
  config,
  nodeInputData,
}) => {
  const [visualizationConfig, setVisualizationConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  // 不再需要 iframeSize 状态，iframe 将始终是 100% 宽高
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIframeReadyRef = useRef<boolean>(false);
  const dataVizMonitor = useDataVisualizationMonitor();
  
  // 暂存待发送的数据（当 iframe 未 ready 时）
  const pendingDataRef = useRef<{
    data: Record<string, any>;
    updateType: 'full' | 'incremental';
  } | null>(null);
  
  // iframe ready 超时检查
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 解析 data_visualization 配置
    const dataVizConfig = parseDataVisualizationConfig(operator.dataVisualization);
    
    if (!dataVizConfig) {
      console.error('[DataVisualizationContainer] 数据可视化配置无效');
      setError('数据可视化配置无效');
      setIsLoading(false);
      return;
    }

    // 优先使用节点 config 中的尺寸（用户调整后的尺寸）
    const nodeConfigSize = config?.dataVisualizationSize;
    if (nodeConfigSize) {
      dataVizConfig.size = {
        ...dataVizConfig.size,
        width: nodeConfigSize.width,
        height: nodeConfigSize.height,
      };
    }

    setVisualizationConfig(dataVizConfig);
    setIsLoading(true);
    setError(null);
    isIframeReadyRef.current = false;

    // 初始化可视化
    initializeVisualization(dataVizConfig);

    return () => {
      // 清理事件监听器
      window.removeEventListener('message', handleIframeMessage);
      // 清理超时定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
    };
  }, [nodeId, operator, workflowId, config?.dataVisualizationSize]);

  // 检查 iframe 是否已准备好（包括 readyState 检查）
  const checkIframeReady = useCallback((): boolean => {
    if (!iframeRef.current) {
      return false;
    }
    
    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (!iframeDoc) {
        return false;
      }
      
      // 检查 readyState
      const isReady = iframeDoc.readyState === 'complete' || iframeDoc.readyState === 'interactive';
      return isReady && isIframeReadyRef.current;
    } catch (error) {
      // 跨域情况下可能无法访问 contentDocument，只能依赖 ready 消息
      return isIframeReadyRef.current;
    }
  }, []);

  // 发送数据到 iframe（使用 useCallback 确保引用稳定）
  const sendDataToIframe = useCallback((data: Record<string, any>, updateType: 'full' | 'incremental') => {
    // 检查 iframe 是否已准备好
    if (!checkIframeReady() || !iframeRef.current?.contentWindow) {
      console.log(`[DataVisualizationContainer] iframe 未准备好，暂存数据 (nodeId: ${nodeId}):`, {
        isIframeReady: isIframeReadyRef.current,
        hasContentWindow: !!iframeRef.current?.contentWindow,
        dataKeys: Object.keys(data),
        dataSize: JSON.stringify(data).length
      });
      
      // 暂存数据，等 ready 后再发送
      pendingDataRef.current = { data, updateType };
      return;
    }

    try {
      const message = {
        type: 'data_update',
        payload: {
          data,
          updateType,
          version: Date.now(),
        }
      };
      
      console.log(`[DataVisualizationContainer] 向 iframe 发送数据 (nodeId: ${nodeId}):`, {
        hasData: Object.keys(data).length > 0,
        dataKeys: Object.keys(data),
        updateType,
        dataSize: JSON.stringify(data).length,
        messagePreview: JSON.stringify(message).substring(0, 200)
      });
      
      iframeRef.current.contentWindow.postMessage(message, window.location.origin);
      
      // 清除暂存数据
      pendingDataRef.current = null;
    } catch (error) {
      console.error('[DataVisualizationContainer] 发送数据到 iframe 失败:', error);
    }
  }, [nodeId, checkIframeReady]);
  
  // 发送暂存的数据（当 iframe ready 时调用）
  const sendPendingData = useCallback(() => {
    if (pendingDataRef.current && checkIframeReady() && iframeRef.current?.contentWindow) {
      console.log(`[DataVisualizationContainer] iframe ready，发送暂存数据 (nodeId: ${nodeId}):`, {
        hasData: Object.keys(pendingDataRef.current.data).length > 0,
        dataKeys: Object.keys(pendingDataRef.current.data),
        updateType: pendingDataRef.current.updateType
      });
      
      const { data, updateType } = pendingDataRef.current;
      sendDataToIframe(data, updateType);
    }
  }, [nodeId, checkIframeReady, sendDataToIframe]);

  // 注册/注销到 DataVisualizationMonitor
  useEffect(() => {
    if (!dataVizMonitor) {
      console.warn('[DataVisualizationContainer] DataVisualizationMonitor 未找到，无法注册节点');
      return;
    }

    // 创建容器引用对象
    const containerRef: DataVisualizationContainerRef = {
      pushDataToIframe: (inputData: Record<string, any>, updateType: 'full' | 'incremental') => {
        console.log(`[DataVisualizationContainer] pushDataToIframe 被调用 (nodeId: ${nodeId}):`, {
          hasData: Object.keys(inputData).length > 0,
          dataKeys: Object.keys(inputData),
          updateType,
          isIframeReady: isIframeReadyRef.current
        });
        sendDataToIframe(inputData, updateType);
      },
    };

    // 注册节点
    console.log(`[DataVisualizationContainer] 注册节点到 Monitor (nodeId: ${nodeId})`);
    dataVizMonitor.registerNode(nodeId, containerRef);

    // 清理：注销节点
    return () => {
      console.log(`[DataVisualizationContainer] 注销节点从 Monitor (nodeId: ${nodeId})`);
      dataVizMonitor.unregisterNode(nodeId);
    };
  }, [nodeId, dataVizMonitor, sendDataToIframe]);

  // 监听配置变化
  useEffect(() => {
    if (config && isIframeReadyRef.current && iframeRef.current?.contentWindow) {
      sendConfigToIframe(config);
    }
  }, [config]);

  // 初始化可视化
  const initializeVisualization = async (vizConfig: any) => {
    try {
      setIsLoading(true);

      // 根据可视化类型加载
      if (vizConfig.visualization_type === 'python_html' || 
          vizConfig.visualization_type === 'python_image') {
        // Python 生成的可视化：直接加载文件
        await loadPythonVisualization(vizConfig);
      } else {
        // 前端可视化：加载到 iframe
        await loadFrontendVisualization(vizConfig);
      }

      // iframe 尺寸现在由外层容器控制，不需要单独设置

      // 监听 iframe 消息
      window.addEventListener('message', handleIframeMessage);

      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || '初始化可视化失败');
      setIsLoading(false);
    }
  };

  // 加载 Python 生成的可视化（HTML 或图片）
  const loadPythonVisualization = async (vizConfig: any) => {
    let entryFile = vizConfig.entry_file;
    let filePath: string;
    
    // 检查是否是模板路径（包含 main.html、main.png 等）
    const mainFilePattern = /main\.(html|png|jpg|jpeg|svg|gif)$/i;
    const isMainFile = mainFilePattern.test(entryFile);
    
    if (isMainFile && nodeId) {
      // 使用节点 ID 替换 main 文件名
      const match = entryFile.match(/main\.(html|png|jpg|jpeg|svg|gif)$/i);
      if (match) {
        const ext = match[1];
        filePath = entryFile.replace(/main\.(html|png|jpg|jpeg|svg|gif)$/i, `${nodeId}.${ext}`);
      } else {
        filePath = entryFile.replace('main', nodeId);
      }
      
      // 移除开头的 ./
      if (filePath.startsWith('./')) {
        filePath = filePath.substring(2);
      }
    } else {
      // 使用原始路径
      filePath = entryFile.startsWith('./') 
        ? entryFile.substring(2) 
        : entryFile;
    }

    if (vizConfig.visualization_type === 'python_html') {
      // 加载 HTML 文件到 iframe
      const iframeUrl = getEntryFileUrl(operator.id, filePath);
      
      // 先检查文件是否存在
      try {
        const checkResponse = await fetch(iframeUrl, { method: 'HEAD' });
        if (!checkResponse.ok) {
          // 如果使用节点 ID 的文件不存在，尝试回退到原始 main.html
          if (isMainFile && filePath !== entryFile.replace(/^\.\//, '')) {
            const fallbackPath = entryFile.startsWith('./') ? entryFile.substring(2) : entryFile;
            const fallbackUrl = getEntryFileUrl(operator.id, fallbackPath);
            const fallbackResponse = await fetch(fallbackUrl, { method: 'HEAD' });
            if (fallbackResponse.ok) {
              filePath = fallbackPath;
            }
          }
        }
      } catch (checkError: any) {
        // 即使检查失败，也尝试加载
      }
      
      // 添加时间戳参数，确保配置变化时重新加载
      const timestamp = Date.now();
      const finalUrl = `${getEntryFileUrl(operator.id, filePath)}&t=${timestamp}`;
      
      // 设置超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsLoading(prev => {
          if (prev) {
            setError(`加载 HTML 文件超时。文件路径: ${filePath}。请确保算子已执行并生成了可视化文件。`);
            return false;
          }
          return prev;
        });
        timeoutRef.current = null;
      }, 10000); // 10秒超时
      
      setIframeSrc(finalUrl);
      isIframeReadyRef.current = true; // Python HTML 在 iframe 中，等待 onLoad
    } else if (vizConfig.visualization_type === 'python_image') {
      // 加载图片文件
      const finalUrl = getEntryFileUrl(operator.id, filePath);
      setImageSrc(finalUrl);
      setIsLoading(false);
    }
  };

  // 加载前端可视化（加载到 iframe）
  const loadFrontendVisualization = async (vizConfig: any) => {
    // 获取 entry_file 的 URL
    const entryFileUrl = getEntryFileUrl(operator.id, vizConfig.entry_file);
    setIframeSrc(entryFileUrl);
    // isIframeReadyRef 会在收到 ready 消息时设置为 true
    
    // 清除之前的超时定时器
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    
    // 如果 iframe 已经 ready（比如组件重新渲染时），就不需要设置超时
    if (isIframeReadyRef.current) {
      // 检查 iframe 文档状态，确认确实已 ready
      try {
        const iframe = iframeRef.current;
        if (iframe) {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && (iframeDoc.readyState === 'complete' || iframeDoc.readyState === 'interactive')) {
            console.log(`[DataVisualizationContainer] iframe 已 ready，跳过超时检查 (nodeId: ${nodeId})`);
            return;
          }
        }
      } catch (error) {
        // 跨域情况下无法访问，继续设置超时
      }
    }
    
    // 设置 ready 超时检查（60秒）
    // 注意：只有在 iframe 确实未 ready 时才设置超时
    readyTimeoutRef.current = setTimeout(() => {
      // 再次检查 iframe 是否已经 ready（可能在超时期间已经 ready 了）
      const isActuallyReady = isIframeReadyRef.current;
      
      // 如果标志位显示已 ready，直接返回
      if (isActuallyReady) {
        readyTimeoutRef.current = null;
        return;
      }
      
      // 检查 iframe 的实际状态（readyState）
      let iframeDocReady = false;
      try {
        const iframe = iframeRef.current;
        if (iframe) {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDocReady = iframeDoc.readyState === 'complete' || iframeDoc.readyState === 'interactive';
          }
        }
      } catch (error) {
        // 跨域情况下无法访问，忽略
      }
      
      // 如果 iframe 文档已经 ready，说明加载完成，只是可能还没收到 ready 消息
      // 这种情况下不应该显示错误，而是更新标志位并继续
      if (iframeDocReady) {
        console.log(`[DataVisualizationContainer] iframe 文档已 ready，但未收到 ready 消息，更新标志位 (nodeId: ${nodeId})`);
        isIframeReadyRef.current = true;
        setError(null);
        setIsLoading(false);
        readyTimeoutRef.current = null;
        return;
      }
      
      // 如果确实未 ready，才显示错误
      console.error(`[DataVisualizationContainer] iframe ready 超时 (60s)，节点 ${nodeId} 可能无法接收数据`, {
        nodeId,
        operatorId: operator.id,
        entryFile: vizConfig.entry_file,
        iframeSrc: entryFileUrl,
        isIframeReady: isIframeReadyRef.current,
        iframeDocReady
      });
      setError('iframe 加载超时，可能无法正常显示数据可视化');
      setIsLoading(false);
      readyTimeoutRef.current = null;
    }, 60000); // 60秒超时
  };

  // 处理 iframe 消息
  const handleIframeMessage = (event: MessageEvent) => {
    // 验证消息来源
    if (event.source !== iframeRef.current?.contentWindow) {
      return;
    }
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'ready':
        // iframe 加载完成，一次性发送所有初始信息
        isIframeReadyRef.current = true;
        
        // 清除 ready 超时定时器
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
          readyTimeoutRef.current = null;
        }
        
        // 检查 iframe document readyState
        const iframe = iframeRef.current;
        if (iframe) {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              console.log(`[DataVisualizationContainer] iframe ready，readyState: ${iframeDoc.readyState} (nodeId: ${nodeId})`);
            }
          } catch (error) {
            // 跨域情况下无法访问，忽略
          }
        }
        
        // 发送节点信息
        sendNodeInfoToIframe();
        
        // 发送配置
        if (config) {
          sendConfigToIframe(config);
        }
        
        // 发送数据（优先使用暂存数据，否则使用 prop 数据）
        if (pendingDataRef.current) {
          console.log(`[DataVisualizationContainer] iframe ready，发送暂存数据 (nodeId: ${nodeId})`);
          sendPendingData();
        } else if (nodeInputData && Object.keys(nodeInputData).length > 0) {
          console.log(`[DataVisualizationContainer] iframe ready，发送 prop 数据 (nodeId: ${nodeId}):`, {
            dataKeys: Object.keys(nodeInputData),
            dataSize: JSON.stringify(nodeInputData).length
          });
          sendDataToIframe(nodeInputData, 'full');
        } else {
          // 即使没有数据，也发送一个空的数据更新，确保 iframe 知道初始化完成
          console.log(`[DataVisualizationContainer] iframe ready 但无数据，发送空数据更新 (nodeId: ${nodeId})`);
          sendDataToIframe({}, 'full');
        }
        
        setIsLoading(false);
        break;
        
      case 'resize_request':
        // iframe 请求调整尺寸
        if (payload?.size) {
          // iframe 尺寸现在由外层容器控制，不需要单独设置
          // 如果需要动态调整容器尺寸，可以在这里更新状态或触发重新渲染
        }
        break;
        
      case 'error':
        setError(payload?.error || 'iframe 内部错误');
        setIsLoading(false);
        break;
        
      case 'data_request':
        // iframe 请求数据刷新
        if (nodeInputData) {
          sendDataToIframe(nodeInputData, 'full');
        }
        break;
    }
  };


  // 发送配置到 iframe
  const sendConfigToIframe = (config: any) => {
    if (!iframeRef.current?.contentWindow) {
      return;
    }

    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'config_update',
        payload: { config }
      }, window.location.origin);
    } catch (error) {
      console.error('[DataVisualizationContainer] 发送配置到 iframe 失败:', error);
    }
  };

  // 发送节点信息到 iframe
  const sendNodeInfoToIframe = () => {
    if (!iframeRef.current?.contentWindow) {
      return;
    }

    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'node_info',
        payload: {
          nodeInfo: {
            nodeId,
            operatorId: operator.id,
            operatorName: operator.name,
            workflowId: workflowId || '',
          }
        }
      }, window.location.origin);
    } catch (error) {
      console.error('[DataVisualizationContainer] 发送节点信息到 iframe 失败:', error);
    }
  };

  // iframe 加载完成
  const handleIframeLoad = () => {
    // 清除超时定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 对于 Python HTML，不需要等待 ready 消息
    if (visualizationConfig?.visualization_type === 'python_html') {
      setIsLoading(false);
      setError(null);
    }
    // 对于前端可视化，等待 ready 消息
    // 同时检查 readyState
    if (iframeRef.current) {
      try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          console.log(`[DataVisualizationContainer] iframe onLoad，readyState: ${iframeDoc.readyState} (nodeId: ${nodeId})`);
        }
      } catch (error) {
        // 跨域情况下无法访问，忽略
      }
    }
  };

  if (!visualizationConfig) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    width: visualizationConfig.size?.width || '100%',
    height: visualizationConfig.size?.height || '380px',
    position: 'relative',
    border: '1px solid #e8e8e8',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  };

  return (
    <div style={containerStyle}>
      {isLoading && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          minHeight: 120,
          gap: 8,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          zIndex: 1,
        }}>
          <Spin size="small" />
          <span style={{ fontSize: 12, color: '#666' }}>加载可视化组件...</span>
        </div>
      )}
      
      {error && (
        <Alert
          title="加载失败"
          description={error}
          type="error"
          showIcon
          style={{ margin: '8px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}
        />
      )}

      {/* iframe 容器 */}
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            overflow: 'hidden',
            display: isLoading || error ? 'none' : 'block',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          sandbox="allow-scripts allow-same-origin"
          title={`数据可视化 - ${operator.name}`}
          onLoad={handleIframeLoad}
          onError={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setError(`加载 HTML 文件失败。请检查文件是否存在或算子是否已执行。`);
            setIsLoading(false);
          }}
        />
      )}

      {/* 图片容器 */}
      {imageSrc && (
        <img
          src={imageSrc}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: `${visualizationConfig?.size?.height || 300}px`,
            objectFit: 'contain',
            display: 'block'
          }}
          onLoad={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setError('加载图片文件失败');
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
};

export default DataVisualizationContainer;

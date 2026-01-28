/**
 * 数据图表查看器 - 使用 @antv/g2 显示图表
 * 通过 data-visualization-js-sdk 获取输入数据
 */

import React, { useEffect, useRef, useState } from 'react';
import { Chart } from '@antv/g2';

// 从全局获取 SDK
declare global {
  interface Window {
    __DATA_VISUALIZATION_SDK__?: any;
  }
}

const ChartViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 默认配置（可以从配置中读取，这里先使用默认值）
  const chartType: 'line' | 'column' | 'area' = 'line';
  const xField = 'x';
  const yField = 'y';

  useEffect(() => {
    const sdk = window.__DATA_VISUALIZATION_SDK__;
    
    if (!sdk) {
      setError('SDK 未初始化，请确保 data-visualization-js-sdk 已正确注入');
      return;
    }

    // 获取节点信息（用于调试）
    const nodeInfo = sdk.getNodeInfo();
    console.log('[ChartViewer] 节点信息:', nodeInfo);

    // 获取初始数据
    const initialData = sdk.getInputData('data');
    if (initialData && Array.isArray(initialData)) {
      setData(initialData);
      console.log('[ChartViewer] 初始数据:', initialData.length, '条');
    } else {
      console.warn('[ChartViewer] 初始数据格式不正确:', initialData);
    }

    // 监听全量更新
    const unsubscribe = sdk.onFullUpdate((allData: Record<string, any>) => {
      const newData = allData.data;
      if (newData && Array.isArray(newData)) {
        setData(newData);
        console.log('[ChartViewer] 数据更新:', newData.length, '条');
      } else {
        console.warn('[ChartViewer] 更新数据格式不正确:', newData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) {
      return;
    }

    // 销毁旧图表
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // 创建新图表
    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      height: 300,
    });

    // 设置数据
    chart.data(data);

    // 根据图表类型配置
    try {
      switch (chartType) {
        case 'line':
          chart
            .line()
            .encode('x', xField)
            .encode('y', yField)
            .style('stroke', '#1890ff')
            .style('lineWidth', 2);
          break;
        
        case 'column':
          chart
            .interval()
            .encode('x', xField)
            .encode('y', yField)
            .style('fill', '#1890ff');
          break;
        
        case 'area':
          chart
            .area()
            .encode('x', xField)
            .encode('y', yField)
            .style('fill', '#1890ff')
            .style('fillOpacity', 0.6);
          break;
      }
    } catch (err) {
      console.error('[ChartViewer] 配置图表失败:', err);
      setError(`配置图表失败: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // 添加坐标轴
    chart.axis('x', {
      title: xField,
    });
    
    chart.axis('y', {
      title: yField,
    });

    // 添加图例（如果有多个系列）
    chart.legend(false);

    // 渲染图表
    chart.render();
    chartRef.current = chart;

    // 清理函数
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, chartType, xField, yField]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        错误: {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        暂无数据
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '300px' }} />
    </div>
  );
};

// 默认导出组件
export default ChartViewer;

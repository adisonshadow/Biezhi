/**
 * Data Visualization JS SDK React Hook 支持
 * 可选功能，用于在 React 组件中更方便地使用 SDK
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { DataVisualizationSDK } from './types';

/**
 * React Hook for Data Visualization SDK
 * 
 * @param sdk SDK 实例
 * @returns Hook 返回值，包含输入数据、更新函数等
 */
export function useDataVisualization(sdk: DataVisualizationSDK | null) {
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [dataVersion, setDataVersion] = useState<number>(0);
  const fullUpdateUnsubscribeRef = useRef<(() => void) | null>(null);
  const incrementalUpdateUnsubscribeRef = useRef<(() => void) | null>(null);

  // 初始化数据
  useEffect(() => {
    if (sdk) {
      setInputData(sdk.getAllInputData());
      setDataVersion(sdk.getDataVersion());
    }
  }, [sdk]);

  // 监听全量更新
  useEffect(() => {
    if (!sdk) return;

    const unsubscribe = sdk.onFullUpdate((data) => {
      setInputData(data);
      setDataVersion(sdk.getDataVersion());
    });

    fullUpdateUnsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [sdk]);

  // 监听增量更新
  const onIncrementalUpdate = useCallback(
    (callback: (data: Record<string, any>) => void) => {
      if (!sdk) return () => {};

      const unsubscribe = sdk.onIncrementalUpdate((data) => {
        // 更新状态
        setInputData((prev) => ({ ...prev, ...data }));
        setDataVersion(sdk.getDataVersion());
        // 调用用户回调
        callback(data);
      });

      incrementalUpdateUnsubscribeRef.current = unsubscribe;

      return unsubscribe;
    },
    [sdk]
  );

  // 获取输入数据（支持端口名）
  const getInputData = useCallback(
    (portName?: string) => {
      if (!sdk) return undefined;
      return sdk.getInputData(portName);
    },
    [sdk]
  );

  // 获取节点信息
  const nodeInfo = sdk ? sdk.getNodeInfo() : null;

  return {
    inputData,
    dataVersion,
    getInputData,
    onIncrementalUpdate,
    nodeInfo,
    sdk,
  };
}

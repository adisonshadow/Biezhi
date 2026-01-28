/**
 * Data Visualization Context
 * 用于在工作流设计器中传递 DataVisualizationMonitor 实例
 */

import React, { createContext, useContext } from 'react';
import { DataVisualizationMonitor } from '../utils/DataVisualizationMonitor';

const DataVisualizationContext = createContext<DataVisualizationMonitor | null>(null);

export const DataVisualizationProvider: React.FC<{
  monitor: DataVisualizationMonitor;
  children: React.ReactNode;
}> = ({ monitor, children }) => {
  return (
    <DataVisualizationContext.Provider value={monitor}>
      {children}
    </DataVisualizationContext.Provider>
  );
};

export const useDataVisualizationMonitor = (): DataVisualizationMonitor | null => {
  return useContext(DataVisualizationContext);
};

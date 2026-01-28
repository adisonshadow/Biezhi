import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 配置路径别名，指向项目根目录的 data_visualization-js-sdk
      'data-visualization-js-sdk': path.resolve(__dirname, '../data_visualization-js-sdk'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3991',
        changeOrigin: true,
      },
    },
  },
});


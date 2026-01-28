import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import WorkflowList from './pages/WorkflowList';
import WorkflowDesigner from './pages/WorkflowDesigner';
import ExecutionList from './pages/ExecutionList';
import ExecutionDetail from './pages/ExecutionDetail';

const { Content } = Layout;

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <AppHeader />
        <Routes>
          <Route
            path="/"
            element={
              <Content style={{ padding: '24px' }}>
                <WorkflowList />
              </Content>
            }
          />
          <Route
            path="/workflows"
            element={
              <Content style={{ padding: '24px' }}>
                <WorkflowList />
              </Content>
            }
          />
          <Route path="/workflows/:id" element={<WorkflowDesigner />} />
          <Route
            path="/executions"
            element={
              <Content style={{ padding: '24px' }}>
                <ExecutionList />
              </Content>
            }
          />
          <Route
            path="/executions/:id"
            element={
              <Content style={{ padding: '24px' }}>
                <ExecutionDetail />
              </Content>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;


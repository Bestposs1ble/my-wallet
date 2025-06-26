/**
 * 新架构的入口文件 - 用于测试新架构
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AppNew from './AppNew';
import { Buffer } from 'buffer';

// 设置全局 Buffer (某些加密库需要)
window.Buffer = Buffer;

// 开发环境下启用架构测试工具
if (process.env.NODE_ENV === 'development') {
  // 导入测试工具
  import('./test/ArchitectureTest').then(({ runAllTests, performanceTest, memoryTest }) => {
    window.testArchitecture = {
      runAllTests,
      performanceTest,
      memoryTest
    };
    console.log('🧪 架构测试工具已加载，使用 window.testArchitecture 访问');
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppNew />
  </React.StrictMode>
);
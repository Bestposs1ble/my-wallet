/**
 * 新架构的应用入口文件 - 展示如何使用重构后的架构
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider, useWallet } from './context/WalletProvider';
import { useNetwork } from './hooks/useNetwork';

// 导入页面组件（这些需要逐步迁移）
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateWallet from './pages/CreateWallet';
import ImportWallet from './pages/ImportWallet';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import DappExample from './pages/DappExample';

// 导入新的组件
import DappRequestModal from './components/Wallet/DappRequestModal';

// 样式
import 'antd/dist/antd.css';
import './App.css';

// DApp 请求处理组件
function DappHandler() {
  const { 
    dappRequest, 
    requestModalVisible, 
    approveDappRequest, 
    rejectDappRequest 
  } = useWallet();

  const handleApprove = () => {
    if (dappRequest) {
      approveDappRequest(dappRequest.id);
    }
  };

  const handleReject = () => {
    if (dappRequest) {
      rejectDappRequest(dappRequest.id);
    }
  };
  
  if (!requestModalVisible || !dappRequest) {
    return null;
  }

  return (
    <DappRequestModal
      request={dappRequest}
      open={requestModalVisible}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}

// 加载状态组件
const LoadingScreen = ({ message = '正在加载...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="spinner-border text-primary mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// 路由保护组件 - 需要已解锁的钱包
const PrivateRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  if (!isInitialized) {
    return <LoadingScreen message="正在初始化钱包..." />;
  }
  
  if (!hasWallets) {
    return <Navigate to="/" replace />;
  }
  
  if (isLocked) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 仅在没有钱包时可访问的路由
const OnboardingRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  if (!isInitialized) {
    return <LoadingScreen message="正在检查钱包状态..." />;
  }
  
  if (hasWallets && !isLocked) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (hasWallets && isLocked) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 创建钱包流程的路由
const CreateWalletRoute = ({ children }) => {
  const { isInitialized } = useWallet();
  
  if (!isInitialized) {
    return <LoadingScreen message="正在准备创建钱包..." />;
  }
  
  return children;
};

// 首页路由 - 根据钱包状态决定重定向
const HomeRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  if (!isInitialized) {
    return <LoadingScreen message="正在检查钱包..." />;
  }
  
  if (hasWallets && isLocked) {
    return <Navigate to="/login" replace />;
  }
  
  if (hasWallets && !isLocked) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// 登录路由 - 仅当有钱包且锁定时可访问
const LoginRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  if (!isInitialized) {
    return <LoadingScreen message="正在验证钱包..." />;
  }
  
  if (!hasWallets) {
    return <Navigate to="/" replace />;
  }
  
  if (!isLocked) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// 网络状态监控组件
const NetworkMonitor = () => {
  const { connectionStatus, currentNetwork, getCurrentNetworkConfig } = useNetwork();
  
  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const networkConfig = getCurrentNetworkConfig();
  
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 text-xs border z-50">
      <div className="font-semibold mb-1">网络状态</div>
      <div className="space-y-1">
        <div>网络: {networkConfig?.name || currentNetwork}</div>
        <div className={`status-${connectionStatus}`}>
          状态: {connectionStatus === 'connected' ? '✅ 已连接' : 
                connectionStatus === 'connecting' ? '🔄 连接中' : 
                connectionStatus === 'error' ? '❌ 错误' : '⚪ 未连接'}
        </div>
      </div>
    </div>
  );
};

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('应用错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">应用出现错误</h1>
            <p className="text-gray-600 mb-4">
              抱歉，应用遇到了一个意外错误。请刷新页面重试。
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              刷新页面
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  错误详情 (开发模式)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 主路由组件
function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* 首页路由 */}
        <Route 
          path="/" 
          element={
            <HomeRoute>
              <Home />
            </HomeRoute>
          } 
        />
        
        {/* 创建钱包路由 */}
        <Route 
          path="/create" 
          element={
            <CreateWalletRoute>
              <CreateWallet />
            </CreateWalletRoute>
          } 
        />
        <Route 
          path="/create/password" 
          element={
            <CreateWalletRoute>
              <CreateWallet step="password" />
            </CreateWalletRoute>
          } 
        />
        <Route 
          path="/create/backup" 
          element={
            <CreateWalletRoute>
              <CreateWallet step="backup" />
            </CreateWalletRoute>
          } 
        />
        <Route 
          path="/create/confirm" 
          element={
            <CreateWalletRoute>
              <CreateWallet step="confirm" />
            </CreateWalletRoute>
          } 
        />
        <Route 
          path="/import" 
          element={
            <CreateWalletRoute>
              <ImportWallet />
            </CreateWalletRoute>
          } 
        />
        
        {/* 登录路由 */}
        <Route 
          path="/login" 
          element={
            <LoginRoute>
              <Login />
            </LoginRoute>
          } 
        />
        
        {/* 受保护路由 */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/activity" 
          element={
            <PrivateRoute>
              <Activity />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dapp" 
          element={
            <PrivateRoute>
              <DappExample />
            </PrivateRoute>
          } 
        />
        
        {/* 默认重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* 全局组件 */}
      <DappHandler />
      <NetworkMonitor />
    </Router>
  );
}

// 主应用组件
function AppNew() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <AppRoutes />
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default AppNew;
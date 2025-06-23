import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider, useWallet } from './context/WalletContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateWallet from './pages/CreateWallet';
import ImportWallet from './pages/ImportWallet';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import DappExample from './pages/DappExample';
import DappRequestModal from './components/Wallet/DappRequestModal';
import 'antd/dist/antd.css'; // 引入 Ant Design 样式
import './App.css';

// 渲染DappRequestModal组件包装器
function DappHandler() {
  const { 
    dappRequest, 
    requestModalVisible, 
    approveDappRequest, 
    rejectDappRequest 
  } = useWallet();

  // 处理批准请求
  const handleApprove = () => {
    if (dappRequest) {
      approveDappRequest(dappRequest.id);
    }
  };

  // 处理拒绝请求
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

// 路由保护组件 - 需要已解锁的钱包
const PrivateRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  // 如果还在初始化，显示加载中
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" />
          <p className="text-gray-600">正在加载钱包信息...</p>
        </div>
      </div>
    );
  }
  
  // 如果没有钱包，重定向到首页
  if (!hasWallets) {
    return <Navigate to="/" replace />;
  }
  
  // 如果钱包已锁定，重定向到登录页
  if (isLocked) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 仅在没有钱包时可访问的路由 (创建/导入钱包流程)
const OnboardingRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  // 如果还在初始化，显示加载中
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" />
          <p className="text-gray-600">正在加载钱包信息...</p>
        </div>
      </div>
    );
  }
  
  // 如果有钱包且已解锁，重定向到仪表盘
  if (hasWallets && !isLocked) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // 如果有钱包但未解锁，重定向到登录页面
  if (hasWallets && isLocked) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 创建钱包流程的路由 - 允许在创建过程中访问，即使钱包已创建
const CreateWalletRoute = ({ children }) => {
  const { isInitialized } = useWallet();
  
  // 如果还在初始化，显示加载中
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" />
          <p className="text-gray-600">正在加载钱包信息...</p>
        </div>
      </div>
    );
  }
  
  // 不检查钱包状态，允许访问创建钱包的所有步骤
  return children;
};

// 首页路由 - 根据钱包状态决定重定向
const HomeRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  // 如果还在初始化，显示加载中
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" />
          <p className="text-gray-600">正在加载钱包信息...</p>
        </div>
      </div>
    );
  }
  
  // 如果有钱包但已锁定，重定向到登录页
  if (hasWallets && isLocked) {
    return <Navigate to="/login" replace />;
  }
  
  // 如果有钱包且已解锁，重定向到仪表盘
  if (hasWallets && !isLocked) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // 否则（没有钱包），显示首页
  return children;
};

// 登录路由 - 仅当有钱包且锁定时可访问
const LoginRoute = ({ children }) => {
  const { hasWallets, isLocked, isInitialized } = useWallet();
  
  // 如果还在初始化，显示加载中
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-primary mb-4" />
          <p className="text-gray-600">正在加载钱包信息...</p>
        </div>
      </div>
    );
  }
  
  // 如果没有钱包，重定向到首页
  if (!hasWallets) {
    return <Navigate to="/" replace />;
  }
  
  // 如果钱包已解锁，重定向到仪表盘
  if (!isLocked) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* 首页路由 - 根据钱包状态决定重定向 */}
        <Route 
          path="/" 
          element={
            <HomeRoute>
              <Home />
            </HomeRoute>
          } 
        />
        
        {/* 创建钱包路由 - 允许在创建过程中访问，即使钱包已创建 */}
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
        
        {/* 登录路由 - 仅在有钱包且锁定时可访问 */}
        <Route 
          path="/login" 
          element={
            <LoginRoute>
              <Login />
            </LoginRoute>
          } 
        />
        
        {/* 受保护路由 - 需要已解锁的钱包 */}
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
        
        {/* 默认重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DappHandler />
    </Router>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppRoutes />
    </WalletProvider>
  );
}

export default App; 
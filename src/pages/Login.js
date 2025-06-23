import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Alert, Modal } from 'antd';
import { LockOutlined, UnlockOutlined, WalletOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';

const Login = () => {
  const navigate = useNavigate();
  const { unlock, isLocked, loading, error, wallets, lock, resetWallet } = useWallet();
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  useEffect(() => {
    // 检查是否是新创建的钱包
    const justCreated = localStorage.getItem('wallet_just_created');
    if (justCreated === 'true') {
      // 清除标志
      localStorage.removeItem('wallet_just_created');
      // 直接跳转到仪表盘
      navigate('/dashboard');
      return;
    }
    
    // 如果已经解锁，跳转到仪表板页面
    if (!isLocked) {
      navigate('/dashboard');
    }
  }, [isLocked, navigate]);
  
  const handleChange = (e) => {
    setPassword(e.target.value);
    setLocalError('');
  };
  
  const handleLogin = async () => {
    if (!password) {
      setLocalError('请输入密码');
      return;
    }
    
    try {
      const success = await unlock(password);
      
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      setLocalError(error.message || '解锁钱包失败');
    }
  };
  
  // 从助记词恢复钱包前先确认
  const handleRecoverFromMnemonic = () => {
    setShowResetConfirm(true);
  };
  
  // 确认重置钱包并导航至导入页面
  const confirmRecoverFromMnemonic = () => {
    resetWallet(); // 重置当前钱包数据
    setShowResetConfirm(false);
    navigate('/import');
  };

  // 获取当前显示的钱包
  const getWalletDisplay = () => {
    if (!wallets || wallets.length === 0) {
      return null;
    }
    const wallet = wallets[0]; // 显示第一个钱包作为示例
    return {
      name: wallet.name,
      address: wallet.address
    };
  };
  
  const currentWallet = getWalletDisplay();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-4 relative">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center space-x-2 mb-1">
          <div className="bg-primary-600 text-white p-2 rounded-lg">
            <WalletOutlined className="text-xl" />
          </div>
          <span className="font-display font-bold text-2xl text-dark-800">BestPossible</span>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* 头部 */}
        <div className="bg-blue-600 p-6 text-center text-white">
          <h1 className="text-2xl font-bold">欢迎回来</h1>
          <p className="text-blue-100 mt-1">解锁您的钱包以继续使用</p>
        </div>
        
        {/* 钱包信息 */}
        {currentWallet && (
          <div className="bg-gray-50 p-4 flex justify-center">
            <div className="bg-white rounded-lg border border-gray-200 p-3 inline-flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <WalletOutlined />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{currentWallet.name}</p>
                <p className="text-xs text-gray-500">
                  {`${currentWallet.address.substring(0, 6)}...${currentWallet.address.substring(currentWallet.address.length - 4)}`}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 表单 */}
        <div className="p-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <div className="relative">
              <input
                type="password"
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入密码"
                value={password}
                onChange={handleChange}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              此密码仅在此设备上解锁您的钱包，BestPossible 无法帮您恢复密码。
            </p>
          </div>
          
          {/* 错误提示 */}
          {(localError || error) && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-md flex items-start space-x-2 mb-4">
              <ExclamationCircleOutlined className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{localError || error}</span>
            </div>
          )}
          
          {/* 按钮区域 */}
          <div className="space-y-4">
            <button
              type="button"
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-white ${
                loading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? '解锁中...' : '解锁'}
            </button>
          </div>
          
          {/* 忘记密码提示 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              忘记密码？只能通过 12 个助记词短语还原您的钱包。
            </p>
            <div className="flex justify-center mt-2">
              <button
                onClick={handleRecoverFromMnemonic}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                从助记词恢复钱包
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 恢复钱包确认对话框 */}
      <Modal
        open={showResetConfirm}
        title={
          <div className="flex items-center text-red-600">
            <WarningOutlined className="mr-2" /> 
            <span>警告</span>
          </div>
        }
        onCancel={() => setShowResetConfirm(false)}
        footer={null}
        centered
      >
        <div className="py-4">
          <p className="text-gray-800 mb-4">
            使用助记词恢复钱包将会清除当前钱包的所有数据。请确保您已备份好当前钱包的信息，此操作不可撤销。
          </p>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-800 text-sm mb-6">
            如果只是忘记了密码但记得助记词，这是恢复钱包的唯一方式。
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button 
              onClick={confirmRecoverFromMnemonic}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              确认并继续
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Login; 
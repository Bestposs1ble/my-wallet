import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  LockOutlined,
  GlobalOutlined,
  SecurityScanOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  KeyOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  PlusCircleOutlined,
  ImportOutlined,
  ExclamationCircleOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';
import { Modal } from 'antd';

/**
 * 设置页面
 * 
 * @returns {JSX.Element}
 */
const Settings = () => {
  const navigate = useNavigate();
  
  // 从上下文获取钱包状态和方法
  const {
    isLocked,
    currentNetwork,
    networks,
    lock,
    resetWallet,
    backupWallet,
    wallets,
    deleteWallet,
    hasWallets
  } = useWallet();
  
  // 本地状态
  const [activeSection, setActiveSection] = useState('general');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmStage, setDeleteConfirmStage] = useState(1); // 多级确认阶段：1-初始确认，2-警告确认，3-最终确认
  const [password, setPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoLockTime, setAutoLockTime] = useState(30); // 分钟
  const [error, setError] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  
  // 如果钱包已锁定，重定向到登录页面
  if (isLocked) {
    return <Navigate to="/login" />;
  }
  
  // 处理钱包重置
  const handleResetWallet = () => {
    if (resetConfirmText !== 'RESET') {
      setError('请输入"RESET"以确认操作');
      return;
    }
    
    try {
      resetWallet();
      // 重置成功后重定向到首页
      return <Navigate to="/" />;
    } catch (error) {
      setError(error.message || '重置钱包失败');
    }
  };
  
  // 处理删除本地助记词钱包
  const handleDeleteHDWalletConfirm = () => {
    if (deleteConfirmStage === 1) {
      // 进入第二阶段警告
      setDeleteConfirmStage(2);
    } 
    else if (deleteConfirmStage === 2) {
      // 进入最终确认阶段
      setDeleteConfirmStage(3);
    } 
    else if (deleteConfirmStage === 3) {
      // 最终确认需要输入"DELETE"
      if (deleteConfirmText !== 'DELETE') {
        setError('请输入"DELETE"以确认删除操作');
        return;
      }
      
      try {
        // 执行删除操作
        resetWallet(); // 这里使用重置钱包来实现完全删除
        setShowDeleteConfirm(false);
        setDeleteConfirmStage(1);
        setDeleteConfirmText('');
        // 删除成功后重定向到首页
        navigate('/', { replace: true });
      } catch (error) {
        setError(error.message || '删除钱包失败');
      }
    }
  };
  
  // 取消删除操作
  const handleCancelDeleteWallet = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmStage(1);
    setDeleteConfirmText('');
    setError('');
  };
  
  // 处理备份钱包
  const handleBackupWallet = async () => {
    try {
      if (!password) {
        setError('请输入密码');
        return;
      }
      
      const mnemonicPhrase = await backupWallet(password);
      if (!mnemonicPhrase) {
        setError('无法导出助记词，密码可能不正确');
        return;
      }
      
      // 这里可以处理导出逻辑，例如展示助记词或下载keystore文件
    } catch (error) {
      setError(error.message || '导出钱包失败');
    }
  };
  
  // 处理自动锁定时间变更
  const handleAutoLockTimeChange = (time) => {
    setAutoLockTime(time);
    // 这里应该保存设置到钱包上下文或本地存储
  };
  
  // 创建新钱包
  const handleCreateNewWallet = () => {
    // 先锁定当前钱包
    lock();
    // 重定向到创建钱包页面
    navigate('/create');
  };
  
  // 导入新钱包
  const handleImportNewWallet = () => {
    // 先锁定当前钱包
    lock();
    // 重定向到导入钱包页面 
    navigate('/import');
  };
  
  // 工具提示组件
  const Tooltip = ({ children, title }) => {
    const [show, setShow] = useState(false);
    
    return (
      <span 
        className="relative inline-block"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
        {show && (
          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg shadow-sm max-w-xs">
            {title}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </span>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-dark-800 mb-6">设置</h1>
        
        {/* 设置选项卡 */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {['general', 'security', 'networks', 'advanced'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex-1 py-3 text-center transition-colors
                  ${activeSection === section 
                    ? 'text-primary-600 border-b-2 border-primary-600 font-medium' 
                    : 'text-gray-500 hover:text-gray-800'}`}
              >
                {section === 'general' && '通用'}
                {section === 'security' && '安全'}
                {section === 'networks' && '网络'}
                {section === 'advanced' && '高级'}
              </button>
            ))}
          </div>
          
          {/* 通用设置 */}
          {activeSection === 'general' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-dark-800 mb-4">货币和语言</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主要货币
                    </label>
                    <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                      <option value="USD">美元 (USD)</option>
                      <option value="CNY">人民币 (CNY)</option>
                      <option value="EUR">欧元 (EUR)</option>
                      <option value="JPY">日元 (JPY)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      语言
                    </label>
                    <select className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                      <option value="zh_CN">简体中文</option>
                      <option value="en">English</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-dark-800 mb-4">界面设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">深色模式</span>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">显示代币价格</span>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 安全设置 */}
          {activeSection === 'security' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-dark-800 mb-4">
                  <div className="flex items-center">
                    <LockOutlined className="mr-2 text-primary-600" />
                    密码和自动锁定
                  </div>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      更改密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="输入当前密码"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeInvisibleOutlined className="text-gray-400" /> : <EyeOutlined className="text-gray-400" />}
                      </button>
                    </div>
                    <button className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                      更改密码
                    </button>
                  </div>
                  
                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自动锁定时间
                      <Tooltip title="设置多长时间后自动锁定钱包">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 15, 30, 60, 120, 0].map((time) => (
                        <button
                          key={time}
                          onClick={() => handleAutoLockTimeChange(time)}
                          className={`py-2 rounded-lg border text-center transition-colors
                            ${autoLockTime === time 
                              ? 'border-primary-500 bg-primary-50 text-primary-600' 
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                        >
                          {time === 0 ? '从不' : `${time}分钟`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-dark-800 mb-4">
                  <div className="flex items-center">
                    <SecurityScanOutlined className="mr-2 text-primary-600" />
                    安全选项
                  </div>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-sm font-medium text-gray-700">防钓鱼保护</span>
                      <span className="text-xs text-gray-500">验证网站的真实性</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-sm font-medium text-gray-700">交易签名请求</span>
                      <span className="text-xs text-gray-500">在每次交易前请求确认</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  
                  <div>
                    <button 
                      onClick={() => {/* 导出私钥逻辑 */}}
                      className="flex items-center justify-between w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="flex items-center text-gray-700">
                        <KeyOutlined className="mr-2 text-gray-500" />
                        导出私钥
                      </span>
                      <RightOutlined className="text-gray-400" />
                    </button>
                  </div>
                  
                  <div>
                    <button 
                      onClick={() => {/* 备份钱包逻辑 */}}
                      className="flex items-center justify-between w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="flex items-center text-gray-700">
                        <KeyOutlined className="mr-2 text-gray-500" />
                        备份助记词
                      </span>
                      <RightOutlined className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 网络设置 */}
          {activeSection === 'networks' && (
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-medium text-dark-800 mb-4">
                <div className="flex items-center">
                  <GlobalOutlined className="mr-2 text-primary-600" />
                  网络设置
                </div>
              </h3>
              
              <div className="space-y-3">
                {Object.entries(networks).map(([key, network]) => (
                  <div 
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-lg border 
                      ${currentNetwork === key 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${network.color || 'bg-green-500'}`}></div>
                      <div>
                        <span className="font-medium text-dark-800">{network.name}</span>
                        <p className="text-xs text-gray-500">
                          {network.rpcUrl.substring(0, 30)}...
                        </p>
                      </div>
                    </div>
                    
                    {currentNetwork === key && (
                      <span className="px-2 py-1 text-xs font-medium text-primary-600 bg-primary-100 rounded-full">
                        当前网络
                      </span>
                    )}
                  </div>
                ))}
                
                <button className="flex items-center justify-center w-full py-3 border border-dashed border-gray-300 rounded-lg text-primary-600 hover:bg-gray-50">
                  + 添加网络
                </button>
              </div>
            </div>
          )}
          
          {/* 高级设置 */}
          {activeSection === 'advanced' && (
            <div className="p-6 space-y-6">
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-dark-800 mb-4">
                  <div className="flex items-center">
                    <PlusCircleOutlined className="mr-2 text-blue-600" />
                    钱包管理
                  </div>
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      您可以创建全新的钱包或导入现有钱包。请注意，这些操作会将您注销当前钱包。
                    </p>
                  </div>
                  
                  <div>
                    <button 
                      onClick={handleCreateNewWallet}
                      className="flex items-center justify-between w-full p-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <span className="flex items-center">
                        <PlusCircleOutlined className="mr-2" />
                        创建新钱包
                      </span>
                      <RightOutlined className="text-gray-400" />
                    </button>
                  </div>
                  
                  <div>
                    <button 
                      onClick={handleImportNewWallet}
                      className="flex items-center justify-between w-full p-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <span className="flex items-center">
                        <ImportOutlined className="mr-2" />
                        通过助记词导入钱包
                      </span>
                      <RightOutlined className="text-gray-400" />
                    </button>
                  </div>
                  
                  <div>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-between w-full p-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <span className="flex items-center">
                        <DeleteOutlined className="mr-2" />
                        删除本地助记词账户
                      </span>
                      <RightOutlined className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-dark-800 mb-4">
                  <div className="flex items-center">
                    <ClockCircleOutlined className="mr-2 text-primary-600" />
                    交易设置
                  </div>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-sm font-medium text-gray-700">高级Gas控制</span>
                      <span className="text-xs text-gray-500">允许自定义Gas设置</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      交易超时 (分钟)
                      <Tooltip title="未确认交易的超时时间">
                        <QuestionCircleOutlined className="ml-1 text-gray-400" />
                      </Tooltip>
                    </label>
                    <input 
                      type="number" 
                      defaultValue={30}
                      min={5}
                      max={120}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-dark-800 mb-4">
                  <div className="flex items-center">
                    <DeleteOutlined className="mr-2 text-red-600" />
                    重置钱包
                  </div>
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <WarningOutlined className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">危险操作区域</p>
                      <p className="text-xs text-red-600 mt-1">
                        重置钱包将清除所有数据，包括账户、交易历史记录和私钥。
                        请确保您已备份好助记词，否则您将永久失去对资产的访问权限。
                      </p>
                    </div>
                  </div>
                </div>
                
                {!showResetConfirm ? (
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    重置钱包
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600">
                      请输入"RESET"以确认重置钱包
                    </p>
                    <input 
                      type="text" 
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="输入RESET"
                      className="block w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                    />
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleResetWallet}
                        className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        确认重置
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 mt-2">{error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 删除助记词钱包确认对话框 */}
      <Modal
        open={showDeleteConfirm}
        title={
          <div className="flex items-center text-red-600">
            <AlertOutlined className="mr-2" /> 
            <span>危险操作 - 删除本地助记词账户</span>
          </div>
        }
        onCancel={handleCancelDeleteWallet}
        footer={null}
        centered
        width={450}
      >
        <div className="py-4">
          {/* 第一阶段：初始警告 */}
          {deleteConfirmStage === 1 && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <WarningOutlined className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">高风险操作</p>
                    <p className="text-xs text-red-600 mt-1">
                      删除助记词账户意味着您将永久删除此设备上存储的所有钱包信息，包括本地加密的助记词、所有派生账户和交易历史。
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-800 mb-4 font-medium">
                在继续之前，请确认您已经：
              </p>
              <ul className="mb-4 text-sm space-y-2">
                <li className="flex items-start">
                  <ExclamationCircleOutlined className="text-yellow-500 mt-1 mr-2" />
                  <span>将您的12个助记词安全地备份在纸上或硬件设备中</span>
                </li>
                <li className="flex items-start">
                  <ExclamationCircleOutlined className="text-yellow-500 mt-1 mr-2" />
                  <span>理解没有助记词，您将无法恢复对钱包和资产的访问权限</span>
                </li>
                <li className="flex items-start">
                  <ExclamationCircleOutlined className="text-yellow-500 mt-1 mr-2" />
                  <span>明白此操作一旦完成无法撤销</span>
                </li>
              </ul>
            </>
          )}

          {/* 第二阶段：深层次警告 */}
          {deleteConfirmStage === 2 && (
            <>
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertOutlined className="text-yellow-700 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">最终警告</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      请您再次确认，删除助记词账户将导致所有本地存储的加密资产私钥丢失。如果您没有备份助记词，您将永久失去对这些资产的控制权。
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-red-600 font-medium mb-3">继续操作前请注意：</p>
              <ul className="mb-4 text-sm space-y-2 text-gray-800">
                <li className="flex items-start">
                  <WarningOutlined className="text-red-500 mt-1 mr-2" />
                  <span>此操作无法被撤销或恢复</span>
                </li>
                <li className="flex items-start">
                  <WarningOutlined className="text-red-500 mt-1 mr-2" />
                  <span>MetaMask不存储您的助记词备份</span>
                </li>
                <li className="flex items-start">
                  <WarningOutlined className="text-red-500 mt-1 mr-2" />
                  <span>没有助记词，您的资产将永远丢失</span>
                </li>
              </ul>
            </>
          )}

          {/* 第三阶段：最终确认 */}
          {deleteConfirmStage === 3 && (
            <>
              <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700 font-medium">最终确认</p>
                <p className="text-red-600 mt-1 text-sm">
                  此操作即将删除您的钱包数据，并且无法撤销。您需要通过输入"DELETE"以确认您理解此操作的后果。
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  输入确认词以继续
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='请输入"DELETE"'
                  className="block w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-md mb-4">
                  <p>{error}</p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-3">
            <button 
              onClick={handleCancelDeleteWallet}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button 
              onClick={handleDeleteHDWalletConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              {deleteConfirmStage === 1 ? '我已理解，继续' : 
               deleteConfirmStage === 2 ? '我确认风险，继续' : 
               '确认删除'}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* 开关样式 */}
      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e2e8f0;
          transition: .4s;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
        }
        
        input:checked + .slider {
          background-color: #3b82f6;
        }
        
        input:focus + .slider {
          box-shadow: 0 0 1px #3b82f6;
        }
        
        input:checked + .slider:before {
          transform: translateX(20px);
        }
        
        .slider.round {
          border-radius: 24px;
        }
        
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default Settings; 
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, message, Spin, Badge, Tooltip, Modal } from 'antd';
import {
  WalletOutlined,
  SendOutlined,
  SwapOutlined,
  AppstoreOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  HomeOutlined,
  HistoryOutlined,
  DollarOutlined,
  LinkOutlined,
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
import * as ethersHelper from '../utils/ethersHelper';

// 导入我们创建的组件
import AccountAvatar from '../components/Account/AccountAvatar';
import AccountCard from '../components/Account/AccountCard';
import AddAccountModal from '../components/Account/AddAccountModal';
import AddressDisplay from '../components/Wallet/AddressDisplay';
import NetworkSelector from '../components/Wallet/NetworkSelector';
import SendTransactionModal from '../components/Wallet/SendTransactionModal';
import ReceiveModal from '../components/Wallet/ReceiveModal';
import TransactionList from '../components/Wallet/TransactionList';

const Dashboard = () => {
  // 从上下文获取钱包状态和方法
  const {
    isLocked,
    wallets,
    currentWalletIndex,
    currentNetwork,
    networks,
    provider,
    accountBalances,
    pendingTransactions,
    error,
    loading,
    lock,
    addDerivedAccount,
    switchWallet,
    switchNetwork,
    getCurrentWallet,
    getCurrentWalletBalance,
    sendTransaction,
    importWalletByPrivateKey,
    resetWallet,
    backupWallet
  } = useWallet();

  // 主要状态
  const [collapsed, setCollapsed] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [gasPrice, setGasPrice] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 设置相关状态
  const [activeSection, setActiveSection] = useState('general'); 
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmStage, setDeleteConfirmStage] = useState(1);
  const [password, setPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoLockTime, setAutoLockTime] = useState(30);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // 如果钱包已锁定，重定向到登录页面
  if (isLocked) {
    return <Navigate to="/login" />;
  }

  const currentWallet = getCurrentWallet();
  const currentBalance = getCurrentWalletBalance();
  const networkConfig = networks[currentNetwork];

  // 处理发送交易
  const handleSend = () => {
    setShowSendModal(true);
  };

  // 处理接收
  const handleReceive = () => {
    setShowReceiveModal(true);
  };

  // 提交发送交易表单
  const handleSendSubmit = async (values) => {
    try {
      // 发送交易逻辑
      const result = await sendTransaction(
        values.to, 
        values.amount, 
        { gasPrice: values.gasPrice }
      );
      
      if (result) {
        message.success('交易已发送');
        setShowSendModal(false);
      }
    } catch (error) {
      console.error('发送交易失败:', error);
      message.error('发送交易失败: ' + error.message);
    }
  };

  // 添加账户
  const handleAddAccount = async (values) => {
    setLocalError(null);
    try {
      let result;
      
      if (values.type === 'derived') {
        // 派生新账户
        result = await addDerivedAccount(values.name);
        if (!result) {
          setLocalError(error || '添加账户失败，请先创建主钱包');
          return;
        }
      } else if (values.type === 'imported') {
        // 导入私钥
        result = await importWalletByPrivateKey(values.privateKey, values.name);
        if (!result) {
          setLocalError(error || '导入私钥失败，请检查私钥格式');
          return;
        }
      }
      
      setShowAddAccountModal(false);
      message.success(`账户 ${values.name} 已成功添加`);
    } catch (error) {
      setLocalError('添加账户失败: ' + error.message);
    }
  };

  // 处理导航项点击
  const handleNavClick = (key) => {
    if (key === 'add-account') {
      setShowAddAccountModal(true);
    } else if (wallets.some(w => w.address === key)) {
      switchWallet(wallets.findIndex(w => w.address === key));
    } else if (key === 'send') {
      handleSend();
    } else if (key === 'receive') {
      handleReceive();
    } else if (key === 'logout') {
      lock();
    } else if (key === 'dapp') {
      window.location.href = '/dapp'; // 跳转到DApp示例页面
    } else if (key === 'settings') {
      setActiveSection('general'); // 默认显示通用设置
      setActiveTab(key);
    } else {
      setActiveTab(key);
    }
  };

  // 侧边导航项
  const navItems = [
    {
      key: 'dashboard',
      icon: <AppstoreOutlined />,
      label: '仪表盘'
    },
    {
      key: 'send',
      icon: <SendOutlined />,
      label: '发送'
    },
    {
      key: 'receive',
      icon: <WalletOutlined />,
      label: '接收'
    },
    {
      key: 'swap',
      icon: <SwapOutlined />,
      label: '兑换'
    },
    {
      key: 'dapp',
      icon: <LinkOutlined />,
      label: 'DApp测试'
    }
  ];

  // 设置相关处理函数
  
  // 处理钱包重置
  const handleResetWallet = async () => {
    if (resetConfirmText !== 'RESET') {
      setLocalError('请输入"RESET"以确认操作');
      return;
    }
    
    try {
      setLocalError('');
      // 使用context中的loading状态
      const result = await resetWallet();
      
      if (result) {
        message.success('钱包已成功重置');
        // 重置成功后重定向到首页
        window.location.href = '/';
      } else {
        throw new Error('重置钱包失败');
      }
    } catch (error) {
      setLocalError(error.message || '重置钱包失败');
    }
  };
  
  // 处理删除本地助记词钱包
  const handleDeleteHDWalletConfirm = async () => {
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
        setLocalError('请输入"DELETE"以确认删除操作');
        return;
      }
      
      try {
        // 执行删除操作
        setLocalError('');
        // 使用context中的loading状态
        const result = await resetWallet(); // 这里使用resetWallet来实现完全删除
        
        if (result) {
          message.success('钱包已成功删除');
          setShowDeleteConfirm(false);
          setDeleteConfirmStage(1);
          setDeleteConfirmText('');
          // 删除成功后重定向到首页
          window.location.href = '/';
        } else {
          throw new Error('删除钱包失败');
        }
      } catch (error) {
        setLocalError(error.message || '删除钱包失败');
      }
    }
  };
  
  // 取消删除操作
  const handleCancelDeleteWallet = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmStage(1);
    setDeleteConfirmText('');
    setLocalError('');
  };
  
  // 处理备份钱包
  const handleBackupWallet = async () => {
    try {
      if (!password) {
        setLocalError('请输入密码');
        return;
      }
      
      const mnemonicPhrase = await backupWallet(password);
      if (!mnemonicPhrase) {
        setLocalError('无法导出助记词，密码可能不正确');
        return;
      }
      
      // 这里可以处理导出逻辑，例如展示助记词或下载keystore文件
    } catch (error) {
      setLocalError(error.message || '导出钱包失败');
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
    window.location.href = '/create';
  };
  
  // 导入新钱包
  const handleImportNewWallet = () => {
    // 先锁定当前钱包
    lock();
    // 重定向到导入钱包页面 
    window.location.href = '/import';
  };
  
  // 工具提示组件
  const SettingsTooltip = ({ children, title }) => {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
      {/* 侧边导航 - 折叠状态 */}
      <div className={`fixed h-full z-20 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} bg-white shadow-lg`}>
        <div className="flex flex-col h-full">
          {/* 顶部Logo */}
          <div className={`p-4 flex ${collapsed ? 'justify-center' : 'justify-between'} items-center border-b border-gray-100`}>
            <div className={`flex items-center space-x-2 ${collapsed && 'justify-center w-full'}`}>
              <div className="bg-primary-600 text-white p-2 rounded-lg">
                <WalletOutlined className="text-lg" />
              </div>
              {!collapsed && <span className="font-display font-bold text-lg text-dark-800">BestPossible</span>}
            </div>
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
          
          {/* 主导航项 */}
          <div className="flex-1 pt-4 overflow-y-auto hide-scrollbar">
            <div className={`space-y-1 px-3`}>
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full py-3 flex ${collapsed ? 'justify-center' : 'justify-start pl-3'} items-center rounded-xl transition-colors
                    ${activeTab === item.key 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className={`${!collapsed && 'mr-3'} text-lg`}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
            
            {/* 账户列表 */}
            <div className="mt-6 mb-4">
              <p className={`px-4 text-xs font-medium text-gray-400 mb-2 ${collapsed && 'text-center'}`}>
                {!collapsed && '账户'}
              </p>
              <div className="space-y-1 px-3">
                {wallets.map((wallet, index) => (
                  <button
                    key={wallet.address}
                    onClick={() => handleNavClick(wallet.address)}
                    className={`w-full py-2 flex ${collapsed ? 'justify-center' : 'justify-start pl-3'} items-center rounded-xl transition-colors
                      ${index === currentWalletIndex 
                        ? 'bg-primary-50 text-primary-600' 
                        : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <AccountAvatar address={wallet.address} size={collapsed ? 24 : 20} />
                    {!collapsed && (
                      <div className="ml-3 text-left truncate overflow-hidden">
                        <p className="font-medium text-sm leading-4">{wallet.name || `账户 ${index + 1}`}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {accountBalances[wallet.address] || '0'} {networkConfig?.symbol || 'ETH'}
                        </p>
                      </div>
                    )}
                  </button>
                ))}
                
                {/* 添加账户按钮 */}
                <button
                  onClick={() => handleNavClick('add-account')}
                  className={`w-full py-2 flex ${collapsed ? 'justify-center' : 'justify-start pl-3'} items-center rounded-xl
                    text-primary-600 hover:bg-primary-50 transition-colors`}
                >
                  <div className={`flex items-center justify-center rounded-full w-${collapsed ? '6' : '5'} h-${collapsed ? '6' : '5'} bg-primary-100`}>
                    <PlusOutlined style={{ fontSize: collapsed ? 16 : 14 }} />
                  </div>
                  {!collapsed && <span className="ml-3 text-sm">添加账户</span>}
                </button>
              </div>
            </div>
          </div>
          
          {/* 底部操作 */}
          <div className="border-t border-gray-100 p-3">
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full py-2 flex ${collapsed ? 'justify-center' : 'justify-start pl-3'} items-center rounded-xl
                  text-gray-600 hover:bg-gray-100 transition-colors`}
              >
                <span className={`${!collapsed && 'mr-3'} text-lg`}><SettingOutlined /></span>
                {!collapsed && <span>设置</span>}
              </button>
              <button
                onClick={() => handleNavClick('logout')}
                className={`w-full py-2 flex ${collapsed ? 'justify-center' : 'justify-start pl-3'} items-center rounded-xl
                  text-gray-600 hover:bg-gray-100 transition-colors`}
              >
                <span className={`${!collapsed && 'mr-3'} text-lg`}><LogoutOutlined /></span>
                {!collapsed && <span>锁定钱包</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 收起/展开按钮 */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-20 top-5 z-20 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md border border-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {/* 主内容区 */}
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {/* 顶部栏 */}
        <header className="glass-effect sticky top-0 z-10 flex justify-between items-center px-6 py-3">
          <div className="flex items-center">
            {/* 价格信息 */}
            <div className="hidden md:flex space-x-2">
              <Tooltip title="ETH价格">
                <div className="px-3 py-1.5 bg-white bg-opacity-60 rounded-full flex items-center space-x-1.5">
                  <Badge color="green" status="processing" />
                  <span className="text-xs font-medium text-gray-700">ETH: $3,200.45</span>
                </div>
              </Tooltip>
              <Tooltip title="Gas价格">
                <div className="px-3 py-1.5 bg-white bg-opacity-60 rounded-full flex items-center space-x-1.5">
                  <Badge color="blue" status="default" />
                  <span className="text-xs font-medium text-gray-700">Gas: 25 Gwei</span>
                </div>
              </Tooltip>
            </div>
          </div>
          
          {/* 当前账户 */}
          {currentWallet && (
            <div className="flex items-center glass-effect py-1 pl-2 pr-4 rounded-full">
              <AccountAvatar address={currentWallet.address} size={32} />
              <div className="ml-2 mr-1">
                <p className="font-medium text-sm leading-none text-dark-800">
                  {currentWallet.name || `账户${currentWalletIndex + 1}`}
                </p>
                <AddressDisplay address={currentWallet.address} short={true} showCopyButton={false} />
              </div>
            </div>
          )}
        </header>
        
        {/* 页面内容 */}
        <main className="p-6">
          {/* 主账户卡片区 */}
          <section className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 账户卡片 */}
              <div>
                <AccountCard
                  wallet={currentWallet}
                  index={currentWalletIndex}
                  balance={currentBalance}
                  networkSymbol={networkConfig?.symbol || 'ETH'}
                  loading={loading}
                  onSend={handleSend}
                  onReceive={handleReceive}
                />
              </div>
              
              {/* 活动卡片 */}
              <div className="glass-effect rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-display font-semibold text-lg text-dark-800">活动</h3>
                </div>
                <div className="px-2">
                  <Tabs
                    defaultActiveKey="transactions"
                    className="w-full"
                    items={[
                      {
                        label: (
                          <span className="flex items-center px-2">
                            <HistoryOutlined className="mr-1" />
                            近期交易
                          </span>
                        ),
                        key: 'transactions',
                        children: (
                          <div className="px-4 pb-4">
                            <TransactionList 
                              transactions={pendingTransactions} 
                              loading={loading}
                            />
                          </div>
                        ),
                      },
                      {
                        label: (
                          <span className="flex items-center px-2">
                            <DollarOutlined className="mr-1" />
                            代币
                          </span>
                        ),
                        key: 'tokens',
                        children: (
                          <div className="h-64 flex items-center justify-center">
                            <p className="text-gray-500">暂无代币</p>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* 最近活动总览 */}
            <div className="mt-6 glass-effect rounded-2xl p-6">
              <h3 className="font-display font-semibold text-lg text-dark-800 mb-4">生态系统</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 生态系统应用卡片 */}
                {['Uniswap', 'OpenSea', 'Aave', 'Compound'].map((app) => (
                  <div key={app} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover-up">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg mb-3"></div>
                    <h4 className="font-medium text-dark-800">{app}</h4>
                    <p className="text-xs text-gray-500">连接应用</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* 设置页面 */}
          <section className={activeTab === 'settings' ? 'block' : 'hidden'}>
            <div className="max-w-2xl mx-auto">
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
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button 
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? <EyeInvisibleOutlined className="text-gray-400" /> : <EyeOutlined className="text-gray-400" />}
                            </button>
                          </div>
                          <button 
                            onClick={handleBackupWallet} // 这里可以改为更改密码的函数
                            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                          >
                            更改密码
                          </button>
                        </div>
                        
                        <div className="pt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            自动锁定时间
                            <SettingsTooltip title="设置多长时间后自动锁定钱包">
                              <QuestionCircleOutlined className="ml-1 text-gray-400" />
                            </SettingsTooltip>
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
                          onClick={() => switchNetwork(key)}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${key === 'mainnet' ? 'bg-green-500' : 'bg-secondary-500'}`}></div>
                            <div>
                              <span className="font-medium text-dark-800">{network.name}</span>
                              <p className="text-xs text-gray-500">
                                {network.url?.substring(0, 30)}...
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
                      
                      <button 
                        onClick={() => setShowNetworkModal(true)}
                        className="flex items-center justify-center w-full py-3 border border-dashed border-gray-300 rounded-lg text-primary-600 hover:bg-gray-50"
                      >
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
                            <SettingsTooltip title="未确认交易的超时时间">
                              <QuestionCircleOutlined className="ml-1 text-gray-400" />
                            </SettingsTooltip>
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
                          {localError && (
                            <p className="text-sm text-red-600 mt-2">{localError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* 发送交易模态框 */}
      <SendTransactionModal
        visible={showSendModal}
        onCancel={() => setShowSendModal(false)}
        onSend={handleSendSubmit}
        networkSymbol={networkConfig?.symbol || 'ETH'}
        gasPrice={gasPrice}
        balance={currentBalance}
        loading={loading}
      />

      {/* 接收交易模态框 */}
      <ReceiveModal
        visible={showReceiveModal}
        onCancel={() => setShowReceiveModal(false)}
        address={currentWallet?.address || ''}
        name={currentWallet?.name || `账户${currentWalletIndex + 1}`}
      />

      {/* 添加账户模态框 */}
      <AddAccountModal
        visible={showAddAccountModal}
        onCancel={() => setShowAddAccountModal(false)}
        onAdd={handleAddAccount}
        loading={loading}
        error={localError}
      />

      {/* 切换网络模态框 */}
      <NetworkSelector 
        networks={networks}
        currentNetwork={currentNetwork}
        onNetworkChange={switchNetwork}
        isModalVisible={showNetworkModal}
        onModalClose={() => setShowNetworkModal(false)}
      />

      {/* 删除钱包确认模态框 */}
      <Modal
        title={
          <div className="flex items-center text-red-600">
            <ExclamationCircleOutlined className="mr-2 text-lg" />
            删除本地助记词账户
          </div>
        }
        open={showDeleteConfirm}
        onCancel={handleCancelDeleteWallet}
        footer={null}
        centered
        className="delete-wallet-modal"
      >
        {deleteConfirmStage === 1 && (
          <div className="py-2">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex items-start">
                <AlertOutlined className="text-red-600 mt-0.5 mr-2" />
                <div>
                  <p className="font-medium text-red-800">危险操作警告</p>
                  <p className="text-sm text-red-600 mt-1">
                    您即将删除本地的助记词钱包。如果未备份助记词，将永久丢失对账户的访问权限和资产控制权。
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              删除操作是不可逆的。删除前请确保：
            </p>
            <ul className="list-disc pl-5 mb-6 space-y-1 text-sm text-gray-600">
              <li>您已经备份了钱包的助记词</li>
              <li>您了解删除后无法恢复账户 (除非重新导入助记词)</li>
              <li>您账户中没有未转移的资产</li>
            </ul>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelDeleteWallet}
                className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteHDWalletConfirm}
                className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                继续
              </button>
            </div>
          </div>
        )}

        {deleteConfirmStage === 2 && (
          <div className="py-2">
            <div className="flex justify-center mb-4">
              <WarningOutlined className="text-5xl text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-center text-red-600 mb-6">最终警告</h3>
            <p className="text-center text-gray-700 mb-4">
              此操作将<span className="font-bold">永久删除</span>您的钱包。
            </p>
            <p className="text-center text-gray-700 mb-6">
              如果您未备份助记词，将<span className="font-bold">无法找回</span>您的资产，且无人能够帮助您恢复。
            </p>
            <div className="flex justify-center space-x-3 mt-6">
              <button
                onClick={handleCancelDeleteWallet}
                className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                我再想想
              </button>
              <button
                onClick={handleDeleteHDWalletConfirm}
                className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                我已备份，继续删除
              </button>
            </div>
          </div>
        )}

        {deleteConfirmStage === 3 && (
          <div className="py-2">
            <p className="text-gray-700 mb-4">
              请输入"<span className="font-bold">DELETE</span>"以确认删除操作：
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="输入DELETE"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 mb-4"
            />
            {localError && (
              <p className="text-sm text-red-600 mb-4">{localError}</p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDeleteWallet}
                className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteHDWalletConfirm}
                className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard; 
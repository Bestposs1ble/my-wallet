/**
 * 简单的架构测试页面
 */
import React, { useState } from 'react';
import { Card, Button, Input, Space, Divider } from 'antd';
import { useWallet } from '../context/SimpleWalletProvider';

const SimpleTest = () => {
  const [password, setPassword] = useState('test123456');
  const [testResults, setTestResults] = useState([]);
  
  const {
    isInitialized,
    loading,
    error,
    wallets,
    hasWallets,
    isLocked,
    createWallet,
    unlock,
    lock,
    addDerivedAccount,
    currentNetwork,
    networks
  } = useWallet();
  
  // 添加测试结果
  const addResult = (name, success, message) => {
    setTestResults(prev => [
      { name, success, message, time: new Date().toLocaleTimeString() },
      ...prev
    ]);
  };
  
  // 测试初始化
  const testInitialization = () => {
    addResult('初始化检查', isInitialized, `初始化状态: ${isInitialized}`);
    addResult('网络检查', Object.keys(networks).length > 0, 
      `发现 ${Object.keys(networks).length} 个网络`);
    addResult('当前网络', !!currentNetwork, `当前网络: ${currentNetwork}`);
  };
  
  // 测试创建钱包
  const testCreateWallet = async () => {
    try {
      const result = await createWallet(password);
      addResult('创建钱包', true, `钱包创建成功: ${result.wallet.address.slice(0, 10)}...`);
    } catch (error) {
      addResult('创建钱包', false, `创建失败: ${error.message}`);
    }
  };
  
  // 测试解锁钱包
  const testUnlockWallet = async () => {
    try {
      await unlock(password);
      addResult('解锁钱包', true, '钱包解锁成功');
    } catch (error) {
      addResult('解锁钱包', false, `解锁失败: ${error.message}`);
    }
  };
  
  // 测试添加账户
  const testAddAccount = async () => {
    try {
      const account = await addDerivedAccount('测试账户');
      addResult('添加账户', true, `账户添加成功: ${account.address.slice(0, 10)}...`);
    } catch (error) {
      addResult('添加账户', false, `添加失败: ${error.message}`);
    }
  };
  
  // 测试锁定钱包
  const testLockWallet = () => {
    try {
      lock();
      addResult('锁定钱包', true, '钱包已锁定');
    } catch (error) {
      addResult('锁定钱包', false, `锁定失败: ${error.message}`);
    }
  };
  
  // 清除结果
  const clearResults = () => {
    setTestResults([]);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🧪 简单架构测试</h1>
      
      {/* 状态卡片 */}
      <Card title="当前状态" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {isInitialized ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-500">已初始化</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {hasWallets ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-500">有钱包</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {isLocked ? '🔒' : '🔓'}
            </div>
            <div className="text-sm text-gray-500">
              {isLocked ? '已锁定' : '已解锁'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {wallets.length}
            </div>
            <div className="text-sm text-gray-500">钱包数量</div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </Card>
      
      {/* 测试控制 */}
      <Card title="测试控制" className="mb-6">
        <Space direction="vertical" className="w-full">
          <Input.Password
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          
          <Space wrap>
            <Button onClick={testInitialization}>
              测试初始化
            </Button>
            <Button 
              type="primary" 
              onClick={testCreateWallet}
              loading={loading}
              disabled={!password}
            >
              创建钱包
            </Button>
            <Button 
              onClick={testUnlockWallet}
              disabled={!hasWallets || !isLocked || !password}
            >
              解锁钱包
            </Button>
            <Button 
              onClick={testAddAccount}
              disabled={isLocked}
            >
              添加账户
            </Button>
            <Button 
              onClick={testLockWallet}
              disabled={isLocked}
              danger
            >
              锁定钱包
            </Button>
            <Button onClick={clearResults}>
              清除结果
            </Button>
          </Space>
        </Space>
      </Card>
      
      {/* 测试结果 */}
      <Card title="测试结果">
        {testResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无测试结果</p>
            <p className="text-sm mt-2">点击上方按钮开始测试</p>
          </div>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {result.success ? '✅' : '❌'} {result.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {result.message}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {result.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SimpleTest;
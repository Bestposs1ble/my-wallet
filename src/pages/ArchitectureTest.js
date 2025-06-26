/**
 * 架构测试页面 - 用于测试新架构的功能
 */
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Alert, Space, Divider, Spin } from 'antd';
import { useWallet } from '../context/WalletProvider';

const ArchitectureTest = () => {
  const [password, setPassword] = useState('test123456');
  const [testResults, setTestResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const {
    wallets,
    currentWallet,
    isLocked,
    hasWallets,
    isInitialized,
    loading,
    error,
    createWallet,
    unlock,
    lock,
    addDerivedAccount,
    currentNetwork,
    networks,
    switchNetwork,
    connectionStatus
  } = useWallet();

  // 添加测试结果
  const addTestResult = (test, success, message) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // 运行基础功能测试
  const runBasicTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    try {
      // 测试 1: 检查初始化状态
      addTestResult('初始化检查', isInitialized, `初始化状态: ${isInitialized}`);

      // 测试 2: 检查网络配置
      const networkCount = Object.keys(networks).length;
      addTestResult('网络配置', networkCount > 0, `发现 ${networkCount} 个网络`);

      // 测试 3: 检查当前网络
      addTestResult('当前网络', !!currentNetwork, `当前网络: ${currentNetwork}`);

      // 测试 4: 检查连接状态
      addTestResult('连接状态', connectionStatus !== 'error', `连接状态: ${connectionStatus}`);

      // 如果没有钱包，测试创建钱包
      if (!hasWallets && password) {
        try {
          await createWallet(password);
          addTestResult('创建钱包', true, '钱包创建成功');
        } catch (error) {
          addTestResult('创建钱包', false, `创建失败: ${error.message}`);
        }
      }

      // 如果有钱包但被锁定，测试解锁
      if (hasWallets && isLocked && password) {
        try {
          await unlock(password);
          addTestResult('解锁钱包', true, '钱包解锁成功');
        } catch (error) {
          addTestResult('解锁钱包', false, `解锁失败: ${error.message}`);
        }
      }

      // 如果钱包已解锁，测试添加账户
      if (hasWallets && !isLocked) {
        try {
          await addDerivedAccount('测试账户');
          addTestResult('添加账户', true, '账户添加成功');
        } catch (error) {
          addTestResult('添加账户', false, `添加失败: ${error.message}`);
        }
      }

    } catch (error) {
      addTestResult('测试执行', false, `测试执行失败: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // 测试网络切换
  const testNetworkSwitch = async () => {
    if (Object.keys(networks).length < 2) {
      addTestResult('网络切换', false, '需要至少2个网络才能测试切换');
      return;
    }

    try {
      const networkIds = Object.keys(networks);
      const targetNetwork = networkIds.find(id => id !== currentNetwork);
      
      if (targetNetwork) {
        await switchNetwork(targetNetwork);
        addTestResult('网络切换', true, `成功切换到 ${networks[targetNetwork].name}`);
      }
    } catch (error) {
      addTestResult('网络切换', false, `切换失败: ${error.message}`);
    }
  };

  // 清除测试结果
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🧪 新架构功能测试</h1>

      {/* 错误显示 */}
      {error && (
        <Alert
          type="error"
          message="错误"
          description={error}
          closable
          className="mb-4"
        />
      )}

      {/* 当前状态 */}
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

        <Divider />

        <div className="space-y-2">
          <div><strong>当前网络:</strong> {currentNetwork} ({networks[currentNetwork]?.name})</div>
          <div><strong>连接状态:</strong> {connectionStatus}</div>
          <div><strong>网络数量:</strong> {Object.keys(networks).length}</div>
          {currentWallet && (
            <div><strong>当前钱包:</strong> {currentWallet.address?.slice(0, 10)}...{currentWallet.address?.slice(-8)}</div>
          )}
        </div>
      </Card>

      {/* 测试控制 */}
      <Card title="测试控制" className="mb-6">
        <Space direction="vertical" className="w-full">
          <div>
            <label className="block text-sm font-medium mb-2">测试密码:</label>
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入测试密码"
            />
          </div>

          <Space wrap>
            <Button 
              type="primary" 
              onClick={runBasicTests}
              loading={isRunningTests}
              disabled={!password}
            >
              运行基础测试
            </Button>
            <Button 
              onClick={testNetworkSwitch}
              disabled={isRunningTests || Object.keys(networks).length < 2}
            >
              测试网络切换
            </Button>
            <Button onClick={clearResults}>
              清除结果
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 测试结果 */}
      <Card title="测试结果">
        {isRunningTests && (
          <div className="text-center py-4">
            <Spin size="large" />
            <p className="mt-2 text-gray-500">正在运行测试...</p>
          </div>
        )}

        {testResults.length === 0 && !isRunningTests && (
          <div className="text-center py-8 text-gray-500">
            <p>暂无测试结果</p>
            <p className="text-sm mt-2">点击上方按钮开始测试</p>
          </div>
        )}

        {testResults.length > 0 && (
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
                      {result.success ? '✅' : '❌'} {result.test}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {result.message}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {result.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <div className="text-sm">
              <strong>测试总结:</strong> 
              {' '}通过 {testResults.filter(r => r.success).length} / {testResults.length} 项测试
            </div>
          </div>
        )}
      </Card>

      {/* 开发信息 */}
      {process.env.NODE_ENV === 'development' && (
        <Card title="🛠️ 开发信息" size="small" className="mt-6">
          <div className="text-xs space-y-1">
            <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
            <div><strong>Error:</strong> {error || 'none'}</div>
            <div><strong>Wallets:</strong> {JSON.stringify(wallets.map(w => ({ name: w.name, address: w.address?.slice(0, 10) + '...' })))}</div>
            <div><strong>Networks:</strong> {JSON.stringify(Object.keys(networks))}</div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ArchitectureTest;
/**
 * 钱包使用示例组件 - 展示如何使用新的 Hook 系统
 */
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Spin, Alert, Space, Divider } from 'antd';
import { 
  WalletOutlined, 
  SendOutlined, 
  PlusOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';

// 使用新的 Hook 系统
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { useTransaction } from '../../hooks/useTransaction';

const { Option } = Select;

const WalletExample = () => {
  // 本地状态
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedNetworkId, setSelectedNetworkId] = useState('');

  // 使用钱包 Hook
  const {
    wallets,
    currentWallet,
    isLocked,
    hasWallets,
    loading: walletLoading,
    error: walletError,
    createWallet,
    importWallet,
    unlock,
    lock,
    addDerivedAccount,
    switchWallet
  } = useWallet();

  // 使用网络 Hook
  const {
    networks,
    currentNetwork,
    connectionStatus,
    loading: networkLoading,
    error: networkError,
    switchNetwork,
    addCustomNetwork,
    getCurrentNetworkConfig
  } = useNetwork();

  // 使用交易 Hook
  const {
    pendingTransactions,
    transactionHistory,
    loading: txLoading,
    error: txError,
    sendTransaction,
    estimateGas,
    getTransactionStats
  } = useTransaction();

  // 初始化选中的网络
  useEffect(() => {
    if (currentNetwork && !selectedNetworkId) {
      setSelectedNetworkId(currentNetwork);
    }
  }, [currentNetwork, selectedNetworkId]);

  // 创建钱包处理
  const handleCreateWallet = async () => {
    try {
      await createWallet(password);
      setPassword('');
    } catch (error) {
      console.error('创建钱包失败:', error);
    }
  };

  // 导入钱包处理
  const handleImportWallet = async () => {
    try {
      await importWallet(password, mnemonic);
      setPassword('');
      setMnemonic('');
    } catch (error) {
      console.error('导入钱包失败:', error);
    }
  };

  // 解锁钱包处理
  const handleUnlock = async () => {
    try {
      await unlock(password);
      setPassword('');
    } catch (error) {
      console.error('解锁失败:', error);
    }
  };

  // 发送交易处理
  const handleSendTransaction = async () => {
    try {
      const txParams = {
        to: toAddress,
        value: ethers.utils.parseEther(amount)
      };
      
      await sendTransaction(txParams);
      setToAddress('');
      setAmount('');
    } catch (error) {
      console.error('发送交易失败:', error);
    }
  };

  // 切换网络处理
  const handleSwitchNetwork = async (networkId) => {
    try {
      await switchNetwork(networkId);
      setSelectedNetworkId(networkId);
    } catch (error) {
      console.error('切换网络失败:', error);
    }
  };

  // 添加自定义网络处理
  const handleAddCustomNetwork = async () => {
    try {
      const networkConfig = {
        name: 'Local Testnet',
        url: 'http://localhost:8545',
        chainId: 1337,
        symbol: 'ETH',
        blockExplorer: ''
      };
      
      await addCustomNetwork(networkConfig);
    } catch (error) {
      console.error('添加网络失败:', error);
    }
  };

  // 获取当前网络配置
  const currentNetworkConfig = getCurrentNetworkConfig();
  const transactionStats = getTransactionStats();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center mb-6">
        🚀 新架构钱包示例
      </h1>

      {/* 错误显示 */}
      {(walletError || networkError || txError) && (
        <Alert
          type="error"
          message="操作失败"
          description={walletError || networkError || txError}
          closable
        />
      )}

      {/* 钱包状态卡片 */}
      <Card title="钱包状态" icon={<WalletOutlined />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{wallets.length}</div>
            <div className="text-gray-500">钱包数量</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {isLocked ? '🔒' : '🔓'}
            </div>
            <div className="text-gray-500">
              {isLocked ? '已锁定' : '已解锁'}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(networks).length}
            </div>
            <div className="text-gray-500">网络数量</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {connectionStatus === 'connected' ? '✅' : '❌'}
            </div>
            <div className="text-gray-500">网络状态</div>
          </div>
        </div>
      </Card>

      {/* 钱包操作 */}
      {!hasWallets ? (
        <Card title="创建或导入钱包">
          <Space direction="vertical" className="w-full">
            <Input.Password
              placeholder="输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Space>
              <Button 
                type="primary" 
                onClick={handleCreateWallet}
                loading={walletLoading}
                disabled={!password}
              >
                创建新钱包
              </Button>
            </Space>

            <Divider>或</Divider>

            <Input.TextArea
              placeholder="输入助记词"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              rows={3}
            />
            
            <Button 
              onClick={handleImportWallet}
              loading={walletLoading}
              disabled={!password || !mnemonic}
            >
              导入钱包
            </Button>
          </Space>
        </Card>
      ) : isLocked ? (
        <Card title="解锁钱包">
          <Space>
            <Input.Password
              placeholder="输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              type="primary"
              icon={<UnlockOutlined />}
              onClick={handleUnlock}
              loading={walletLoading}
              disabled={!password}
            >
              解锁
            </Button>
          </Space>
        </Card>
      ) : (
        <>
          {/* 钱包管理 */}
          <Card title="钱包管理">
            <Space direction="vertical" className="w-full">
              <div>
                <label className="block text-sm font-medium mb-2">当前钱包:</label>
                <Select
                  value={wallets.findIndex(w => w.address === currentWallet?.address)}
                  onChange={switchWallet}
                  className="w-full"
                >
                  {wallets.map((wallet, index) => (
                    <Option key={wallet.address} value={index}>
                      {wallet.name || `账户${index + 1}`} - {wallet.address.slice(0, 10)}...
                    </Option>
                  ))}
                </Select>
              </div>
              
              <Space>
                <Button 
                  icon={<PlusOutlined />}
                  onClick={() => addDerivedAccount()}
                  loading={walletLoading}
                >
                  添加账户
                </Button>
                <Button 
                  icon={<LockOutlined />}
                  onClick={lock}
                  danger
                >
                  锁定钱包
                </Button>
              </Space>
            </Space>
          </Card>

          {/* 网络管理 */}
          <Card title="网络管理">
            <Space direction="vertical" className="w-full">
              <div>
                <label className="block text-sm font-medium mb-2">当前网络:</label>
                <Select
                  value={selectedNetworkId}
                  onChange={handleSwitchNetwork}
                  loading={networkLoading}
                  className="w-full"
                >
                  {Object.entries(networks).map(([id, network]) => (
                    <Option key={id} value={id}>
                      {network.name} {network.isTestnet ? '(测试网)' : ''}
                    </Option>
                  ))}
                </Select>
              </div>
              
              {currentNetworkConfig && (
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm space-y-1">
                    <div><strong>名称:</strong> {currentNetworkConfig.name}</div>
                    <div><strong>Chain ID:</strong> {currentNetworkConfig.chainId}</div>
                    <div><strong>符号:</strong> {currentNetworkConfig.symbol}</div>
                    <div><strong>RPC:</strong> {currentNetworkConfig.url}</div>
                  </div>
                </div>
              )}
              
              <Button onClick={handleAddCustomNetwork}>
                添加本地测试网络
              </Button>
            </Space>
          </Card>

          {/* 发送交易 */}
          <Card title="发送交易" icon={<SendOutlined />}>
            <Space direction="vertical" className="w-full">
              <Input
                placeholder="接收地址"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
              />
              <Input
                placeholder="金额 (ETH)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button 
                type="primary"
                onClick={handleSendTransaction}
                loading={txLoading}
                disabled={!toAddress || !amount}
              >
                发送交易
              </Button>
            </Space>
          </Card>

          {/* 交易统计 */}
          <Card title="交易统计">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {transactionStats.pending}
                </div>
                <div className="text-gray-500">待处理</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {transactionStats.confirmed}
                </div>
                <div className="text-gray-500">已确认</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {transactionStats.failed}
                </div>
                <div className="text-gray-500">失败</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">
                  {transactionStats.successRate}%
                </div>
                <div className="text-gray-500">成功率</div>
              </div>
            </div>
          </Card>

          {/* 待处理交易 */}
          {pendingTransactions.length > 0 && (
            <Card title="待处理交易">
              <div className="space-y-2">
                {pendingTransactions.map((tx) => (
                  <div key={tx.hash} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <div>
                      <div className="font-mono text-sm">{tx.hash.slice(0, 20)}...</div>
                      <div className="text-xs text-gray-500">
                        {tx.to.slice(0, 10)}... - {ethers.utils.formatEther(tx.value)} ETH
                      </div>
                    </div>
                    <Spin size="small" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* 开发工具 */}
      {process.env.NODE_ENV === 'development' && (
        <Card title="🛠️ 开发工具" size="small">
          <Space>
            <Button 
              size="small"
              onClick={() => {
                console.log('钱包状态:', { wallets, currentWallet, isLocked });
                console.log('网络状态:', { networks, currentNetwork, connectionStatus });
                console.log('交易状态:', { pendingTransactions, transactionHistory });
              }}
            >
              打印状态
            </Button>
            <Button 
              size="small"
              onClick={() => {
                if (window.testArchitecture) {
                  window.testArchitecture.runAllTests();
                }
              }}
            >
              运行测试
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default WalletExample;
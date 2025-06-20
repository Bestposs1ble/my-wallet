import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, Typography, Spin, Divider, Space, Input, notification } from 'antd';
import {
  WalletOutlined,
  LinkOutlined,
  SendOutlined,
  SwapOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { ethers } from 'ethers';

const { Title, Text, Paragraph } = Typography;

const DappExample = () => {
  // 状态
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('Hello Web3 World!');
  const [signature, setSignature] = useState('');
  const [txHash, setTxHash] = useState('');

  // 初始化检查连接状态
  useEffect(() => {
    async function checkConnection() {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccounts(accounts);
            setIsConnected(true);
            
            // 获取链ID
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(chainId);
            
            // 获取余额
            await fetchBalance(accounts[0]);
          }
        }
      } catch (error) {
        console.error('检查连接失败:', error);
      }
    }
    
    checkConnection();
  }, []);

  // 监听以太坊事件
  useEffect(() => {
    if (window.ethereum) {
      // 账户变更事件
      const handleAccountsChanged = (newAccounts) => {
        if (newAccounts.length === 0) {
          setIsConnected(false);
          setAccounts([]);
          setBalance(null);
        } else {
          setAccounts(newAccounts);
          setIsConnected(true);
          fetchBalance(newAccounts[0]);
        }
      };
      
      // 链ID变更事件
      const handleChainChanged = (newChainId) => {
        setChainId(newChainId);
        notification.info({
          message: '网络已更改',
          description: `当前链ID: ${newChainId}`,
          placement: 'topRight'
        });
      };
      
      // 连接事件
      const handleConnect = (connectInfo) => {
        console.log('连接成功:', connectInfo);
      };
      
      // 断开连接事件
      const handleDisconnect = (error) => {
        console.log('连接断开:', error);
        setIsConnected(false);
        setAccounts([]);
      };
      
      // 添加事件监听器
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('connect', handleConnect);
      window.ethereum.on('disconnect', handleDisconnect);
      
      // 移除事件监听器
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('connect', handleConnect);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, []);

  // 获取账户余额
  const fetchBalance = async (address) => {
    if (window.ethereum && address) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        
        // 转换为ETH
        const ethBalance = ethers.utils.formatEther(balance);
        setBalance(ethBalance);
      } catch (error) {
        console.error('获取余额失败:', error);
      }
    }
  };

  // 连接钱包
  const connectWallet = async () => {
    setLoading(true);
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        setAccounts(accounts);
        setIsConnected(true);
        
        // 获取链ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(chainId);
        
        // 获取余额
        await fetchBalance(accounts[0]);
        
        notification.success({
          message: '连接成功',
          description: `已连接到账户 ${accounts[0].substring(0, 8)}...`,
          placement: 'topRight'
        });
      } else {
        notification.error({
          message: '连接失败',
          description: '未检测到钱包插件。请确保MetaMask插件已安装并启用。',
          placement: 'topRight'
        });
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
      notification.error({
        message: '连接失败',
        description: error.message,
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  // 切换网络
  const switchNetwork = async (chainId) => {
    setLoading(true);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
      
      notification.success({
        message: '网络切换成功',
        description: `已切换到链ID: ${chainId}`,
        placement: 'topRight'
      });
    } catch (error) {
      console.error('切换网络失败:', error);
      
      // 错误代码4902表示该网络不存在，需要添加
      if (error.code === 4902) {
        try {
          await addSepolia();
        } catch (addError) {
          notification.error({
            message: '添加网络失败',
            description: addError.message,
            placement: 'topRight'
          });
        }
      } else {
        notification.error({
          message: '切换网络失败',
          description: error.message,
          placement: 'topRight'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 添加Sepolia测试网络
  const addSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia测试网络',
          rpcUrls: ['https://sepolia.infura.io/v3/'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
          nativeCurrency: {
            name: 'Sepolia ETH',
            symbol: 'ETH',
            decimals: 18
          }
        }]
      });
      
      notification.success({
        message: '添加网络成功',
        description: '已添加Sepolia测试网络',
        placement: 'topRight'
      });
    } catch (error) {
      console.error('添加网络失败:', error);
      throw error;
    }
  };

  // 发送交易
  const sendTransaction = async () => {
    if (!isConnected || accounts.length === 0) {
      notification.error({
        message: '发送失败',
        description: '请先连接钱包',
        placement: 'topRight'
      });
      return;
    }
    
    if (!recipient || !ethers.utils.isAddress(recipient)) {
      notification.error({
        message: '发送失败',
        description: '无效的接收地址',
        placement: 'topRight'
      });
      return;
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      notification.error({
        message: '发送失败',
        description: '无效的金额',
        placement: 'topRight'
      });
      return;
    }
    
    setLoading(true);
    try {
      // 将ETH转换为Wei
      const amountInWei = ethers.utils.parseEther(amount);
      
      const txParams = {
        from: accounts[0],
        to: recipient,
        value: amountInWei.toHexString(),
        gas: '0x5028', // 约21000 gas
        gasPrice: '0x2540be400' // 10 Gwei
      };
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });
      
      setTxHash(txHash);
      notification.success({
        message: '交易已发送',
        description: `交易哈希: ${txHash.substring(0, 10)}...`,
        placement: 'topRight'
      });
      
      // 清空表单
      setAmount('');
      setRecipient('');
      
      // 更新余额
      await fetchBalance(accounts[0]);
    } catch (error) {
      console.error('发送交易失败:', error);
      notification.error({
        message: '发送交易失败',
        description: error.message,
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  // 签名消息
  const signMessage = async () => {
    if (!isConnected || accounts.length === 0) {
      notification.error({
        message: '签名失败',
        description: '请先连接钱包',
        placement: 'topRight'
      });
      return;
    }
    
    if (!message) {
      notification.error({
        message: '签名失败',
        description: '请输入要签名的消息',
        placement: 'topRight'
      });
      return;
    }
    
    setLoading(true);
    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, accounts[0]]
      });
      
      setSignature(signature);
      notification.success({
        message: '签名成功',
        description: `签名已完成`,
        placement: 'topRight'
      });
    } catch (error) {
      console.error('签名消息失败:', error);
      notification.error({
        message: '签名失败',
        description: error.message,
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  // 渲染连接状态
  const renderConnectionStatus = () => {
    if (isConnected) {
      return (
        <Alert
          message="已连接钱包"
          description={
            <div>
              <p><strong>账户:</strong> {accounts[0]}</p>
              <p><strong>链ID:</strong> {chainId}</p>
              {balance && <p><strong>余额:</strong> {balance} ETH</p>}
            </div>
          }
          type="success"
          showIcon
        />
      );
    }
    
    return (
      <Alert
        message="未连接钱包"
        description="请点击下方按钮连接到MetaMask"
        type="info"
        showIcon
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8 shadow">
          <Title level={2} className="text-center mb-8">
            <WalletOutlined className="mr-2" /> Web3 DApp示例
          </Title>
          
          <div className="mb-6">
            {renderConnectionStatus()}
          </div>
          
          <div className="flex justify-center">
            <Button
              type="primary"
              size="large"
              icon={<LinkOutlined />}
              onClick={connectWallet}
              loading={loading}
              disabled={isConnected}
            >
              {isConnected ? '已连接' : '连接钱包'}
            </Button>
          </div>
        </Card>
        
        {isConnected && (
          <>
            <Card title="网络切换" className="mb-8 shadow">
              <Space size="middle">
                <Button
                  type={chainId === '0x1' ? 'primary' : 'default'}
                  onClick={() => switchNetwork('0x1')}
                  disabled={loading}
                >
                  以太坊主网
                </Button>
                
                <Button
                  type={chainId === '0x5' ? 'primary' : 'default'}
                  onClick={() => switchNetwork('0x5')}
                  disabled={loading}
                >
                  Goerli测试网
                </Button>
                
                <Button
                  type={chainId === '0xaa36a7' ? 'primary' : 'default'}
                  onClick={() => switchNetwork('0xaa36a7')}
                  disabled={loading}
                >
                  Sepolia测试网
                </Button>
              </Space>
            </Card>
            
            <Card title="发送交易" className="mb-8 shadow">
              <div className="mb-4">
                <Text>接收地址:</Text>
                <Input
                  placeholder="输入接收钱包地址"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
              </div>
              
              <div className="mb-4">
                <Text>金额 (ETH):</Text>
                <Input
                  placeholder="输入ETH金额"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
              </div>
              
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={sendTransaction}
                loading={loading}
                disabled={!recipient || !amount}
                className="mt-2"
              >
                发送交易
              </Button>
              
              {txHash && (
                <div className="mt-4">
                  <Alert
                    message="交易已发送"
                    description={`交易哈希: ${txHash}`}
                    type="success"
                    showIcon
                  />
                </div>
              )}
            </Card>
            
            <Card title="签名消息" className="shadow">
              <div className="mb-4">
                <Text>消息:</Text>
                <Input.TextArea
                  placeholder="输入要签名的消息"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="mt-1"
                />
              </div>
              
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={signMessage}
                loading={loading}
                disabled={!message}
              >
                签名消息
              </Button>
              
              {signature && (
                <div className="mt-4">
                  <Text type="secondary">签名:</Text>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-1 break-all font-mono text-xs">
                    {signature}
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default DappExample; 
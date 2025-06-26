import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Select, Button, Modal, Form, Input, InputNumber, message, Badge, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import { LoadingOutlined, CheckCircleOutlined, WarningOutlined, DisconnectOutlined, SyncOutlined } from '@ant-design/icons';

/**
 * 网络选择器组件 - 包含网络选择和添加自定义网络功能
 * 
 * @param {Object} networks - 可用网络配置对象
 * @param {string} currentNetwork - 当前选中的网络ID
 * @param {Function} onNetworkChange - 切换网络回调函数
 * @param {boolean} isModalVisible - 是否显示模态框
 * @param {Function} onModalClose - 关闭模态框回调函数
 * @param {Function} onAddNetwork - 添加自定义网络回调函数
 * @param {Object} networkStatus - 网络状态对象
 * @param {Function} onCheckNetworkStatus - 检查网络状态回调函数
 * @param {Object} ref - 转发的ref对象
 * @returns {JSX.Element}
 */
const NetworkSelector = forwardRef(({ 
  networks = {}, 
  currentNetwork = 'mainnet', 
  onNetworkChange,
  isModalVisible = false,
  onModalClose,
  onAddNetwork,
  networkStatus = { isConnected: true, latency: 0, blockHeight: 0, lastChecked: 0 },
  onCheckNetworkStatus
}, ref) => {
  const [addNetworkVisible, setAddNetworkVisible] = useState(false);
  const [form] = Form.useForm();
  const [validatingRpc, setValidatingRpc] = useState(false);
  const [rpcValid, setRpcValid] = useState(null);
  const [validatingChainId, setValidatingChainId] = useState(false);
  const [chainIdValid, setChainIdValid] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [eip3085Visible, setEip3085Visible] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState(null);

  // 监听网络状态并自动重连
  useEffect(() => {
    if (!networkStatus.isConnected && currentNetwork) {
      // 如果网络断开，尝试自动重连
      const reconnectTimeout = setTimeout(() => {
        if (onCheckNetworkStatus) {
          message.warning('网络连接中断，正在尝试重新连接...');
          onCheckNetworkStatus();
        }
      }, 5000); // 5秒后尝试重连
      
      return () => clearTimeout(reconnectTimeout);
    }
  }, [networkStatus.isConnected, currentNetwork]);

  // 获取网络颜色
  const getNetworkColor = (networkId) => {
    const colorMap = {
      'mainnet': 'bg-green-500',
      'sepolia': 'bg-purple-500',
      'goerli': 'bg-blue-300', // 变淡表示已弃用
      'polygon': 'bg-purple-600',
      'arbitrum': 'bg-blue-600',
      'optimism': 'bg-red-500',
      'base': 'bg-blue-400',
      'avalanche': 'bg-red-600',
      'bsc': 'bg-yellow-500',
      'localhost': 'bg-gray-500',
      'ganache': 'bg-gray-500'
    };
    return colorMap[networkId] || 'bg-gray-500';
  };

  // 获取网络状态图标
  const getNetworkStatusIcon = () => {
    if (checkingStatus) {
      return <SyncOutlined spin className="text-blue-500" />;
    }
    
    if (!networkStatus.isConnected) {
      return <DisconnectOutlined className="text-red-500" />;
    }
    
    if (networkStatus.latency > 1000) {
      return <WarningOutlined className="text-yellow-500" />;
    }
    
    return <CheckCircleOutlined className="text-green-500" />;
  };

  // 获取网络状态描述
  const getNetworkStatusDescription = () => {
    if (checkingStatus) {
      return '正在检查网络状态...';
    }
    
    if (!networkStatus.isConnected) {
      return '网络已断开连接';
    }
    
    if (networkStatus.latency > 1000) {
      return `网络拥堵 (${networkStatus.latency}ms)`;
    }
    
    return `网络正常 (${networkStatus.latency}ms)`;
  };

  // 检查网络状态
  const checkNetworkStatus = async () => {
    if (onCheckNetworkStatus) {
      setCheckingStatus(true);
      await onCheckNetworkStatus();
      setCheckingStatus(false);
    }
  };

  // 校验RPC URL有效性
  const validateRpcUrl = async (url) => {
    if (!url) return false;
    
    setValidatingRpc(true);
    setRpcValid(null);
    
    try {
      // 发送JSON-RPC请求验证RPC端点有效性
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });
      
      const data = await response.json();
      
      // 检查是否有有效的结果
      const isValid = data && data.result && !data.error;
      setRpcValid(isValid);
      return isValid;
    } catch (error) {
      console.error('RPC URL验证失败:', error);
      setRpcValid(false);
      return false;
    } finally {
      setValidatingRpc(false);
    }
  };
  
  // 校验ChainId唯一性
  const validateChainId = (chainId) => {
    if (!chainId) return false;
    
    setValidatingChainId(true);
    setChainIdValid(null);
    
    // 检查是否已存在相同chainId的网络
    const existingNetwork = Object.values(networks).find(
      network => network.chainId === chainId
    );
    
    const isUnique = !existingNetwork;
    setChainIdValid(isUnique);
    setValidatingChainId(false);
    
    return isUnique;
  };

  // 处理添加自定义网络
  const handleAddNetwork = async () => {
    try {
      const values = await form.validateFields();
      setNetworkLoading(true);
      
      // 验证RPC URL有效性
      const isRpcValid = await validateRpcUrl(values.rpcUrl);
      if (!isRpcValid) {
        message.error('RPC URL无效，请检查URL并确保它是可访问的');
        setNetworkLoading(false);
        return;
      }
      
      // 验证ChainId唯一性
      const isChainIdUnique = validateChainId(values.chainId);
      if (!isChainIdUnique) {
        message.error('已存在相同Chain ID的网络，请使用不同的Chain ID');
        setNetworkLoading(false);
        return;
      }
      
      // 创建新网络配置
      const newNetwork = {
        name: values.name,
        url: values.rpcUrl,
        chainId: values.chainId,
        symbol: values.symbol,
        blockExplorer: values.explorerUrl,
        explorerUrl: values.explorerUrl,
        nativeCurrency: {
          name: values.currencyName || values.symbol,
          symbol: values.symbol,
          decimals: values.decimals || 18
        }
      };
      
      // 调用父组件的添加网络方法
      if (onAddNetwork) {
        // 使用小写网络名作为ID
        const networkId = values.name.toLowerCase().replace(/\s+/g, '-');
        onAddNetwork(networkId, newNetwork);
      }
      
      // 重置表单并关闭模态框
      form.resetFields();
      setAddNetworkVisible(false);
      message.success(`已成功添加网络: ${values.name}`);
    } catch (error) {
      console.error('添加网络验证失败:', error);
      message.error('添加网络失败: ' + error.message);
    } finally {
      setNetworkLoading(false);
    }
  };

  // 处理EIP-3085添加网络请求
  const handleEIP3085AddNetwork = () => {
    if (!pendingNetwork) return;
    
    try {
      // 创建新网络配置
      const newNetwork = {
        name: pendingNetwork.chainName,
        url: pendingNetwork.rpcUrls[0],
        chainId: parseInt(pendingNetwork.chainId, 16),
        symbol: pendingNetwork.nativeCurrency.symbol,
        blockExplorer: pendingNetwork.blockExplorerUrls?.[0] || '',
        explorerUrl: pendingNetwork.blockExplorerUrls?.[0] || '',
        nativeCurrency: {
          name: pendingNetwork.nativeCurrency.name,
          symbol: pendingNetwork.nativeCurrency.symbol,
          decimals: pendingNetwork.nativeCurrency.decimals
        }
      };
      
      // 使用小写网络名作为ID
      const networkId = pendingNetwork.chainName.toLowerCase().replace(/\s+/g, '-');
      
      // 调用父组件的添加网络方法
      if (onAddNetwork) {
        onAddNetwork(networkId, newNetwork);
      }
      
      setEip3085Visible(false);
      setPendingNetwork(null);
      message.success(`已成功添加网络: ${pendingNetwork.chainName}`);
    } catch (error) {
      console.error('EIP-3085添加网络失败:', error);
      message.error('添加网络失败: ' + error.message);
    }
  };

  // 处理EIP-3085网络切换请求
  const handleEIP3085SwitchNetwork = (chainId) => {
    // 查找匹配的网络
    const networkEntries = Object.entries(networks);
    const matchingNetwork = networkEntries.find(([_, network]) => 
      network.chainId === parseInt(chainId, 16)
    );
    
    if (matchingNetwork) {
      // 如果找到匹配的网络，切换到该网络
      onNetworkChange(matchingNetwork[0]);
      return true;
    }
    
    return false;
  };

  // 暴露EIP-3085方法给外部
  useImperativeHandle(ref, () => ({
    // 处理wallet_addEthereumChain请求
    handleAddEthereumChain: (params) => {
      setPendingNetwork(params[0]);
      setEip3085Visible(true);
      return new Promise((resolve, reject) => {
        // 这里需要在UI中处理用户确认
        // 暂时先返回成功
        resolve(null);
      });
    },
    
    // 处理wallet_switchEthereumChain请求
    handleSwitchEthereumChain: (params) => {
      const chainId = params[0].chainId;
      const success = handleEIP3085SwitchNetwork(chainId);
      
      if (success) {
        return Promise.resolve(null);
      } else {
        // 如果没有找到匹配的网络，返回错误
        return Promise.reject({
          code: 4902, // Chain not found
          message: 'Unrecognized chain ID'
        });
      }
    }
  }));

  return (
    <>
      <Modal
        title="切换网络"
        open={isModalVisible}
        onCancel={onModalClose}
        footer={[
          <Button key="add" type="default" onClick={() => setAddNetworkVisible(true)}>
            添加网络
          </Button>,
          <Button key="check" type="default" onClick={checkNetworkStatus} loading={checkingStatus}>
            检查网络状态
          </Button>,
          <Button key="close" type="primary" onClick={onModalClose}>
            关闭
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item 
            label={
              <div className="flex justify-between w-full">
                <span>选择网络</span>
                <Tooltip title={getNetworkStatusDescription()}>
                  <div className="flex items-center">
                    <span className="text-xs mr-1">网络状态:</span>
                    {getNetworkStatusIcon()}
                  </div>
                </Tooltip>
              </div>
            }
          >
            <Select
              defaultValue={currentNetwork}
              onChange={(value) => {
                setNetworkLoading(true);
                // 添加网络切换loading状态
                message.loading({
                  content: '正在切换网络...',
                  key: 'networkSwitch',
                  duration: 0
                });
                
                // 调用网络切换函数
                onNetworkChange(value);
                
                // 模拟网络切换延迟，实际上页面会刷新
                setTimeout(() => {
                  message.success({
                    content: '网络切换成功',
                    key: 'networkSwitch',
                    duration: 2
                  });
                  setNetworkLoading(false);
                }, 1000);
              }}
              style={{ width: '100%' }}
              options={Object.entries(networks).map(([id, network]) => ({
                value: id,
                label: (
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${getNetworkColor(id)}`}></div>
                    <span className="font-medium">{network.name}</span>
                    {network.chainId && <span className="text-gray-500 ml-2 text-xs">({network.chainId})</span>}
                  </div>
                )
              }))}
              loading={networkLoading}
              disabled={networkLoading}
            />
          </Form.Item>
          
          {/* 网络状态信息 */}
          {networkStatus.isConnected && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">最新区块:</span>
                  <span className="font-mono">{networkStatus.blockHeight || 'N/A'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">网络延迟:</span>
                  <span className="font-mono">{networkStatus.latency || 0} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">上次检查:</span>
                  <span className="font-mono">
                    {networkStatus.lastChecked 
                      ? new Date(networkStatus.lastChecked).toLocaleTimeString() 
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* 添加自定义网络模态框 */}
      <Modal
        title="添加自定义网络"
        open={addNetworkVisible}
        onCancel={() => setAddNetworkVisible(false)}
        onOk={handleAddNetwork}
        okText="添加"
        cancelText="取消"
        confirmLoading={networkLoading}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="网络名称"
            rules={[{ required: true, message: '请输入网络名称' }]}
          >
            <Input placeholder="例如: Arbitrum Nova" />
          </Form.Item>
          
          <Form.Item
            name="rpcUrl"
            label="RPC URL"
            rules={[
              { required: true, message: '请输入RPC URL' },
              { type: 'url', message: '请输入有效的URL' }
            ]}
            extra={
              rpcValid === true ? (
                <span className="text-green-500 flex items-center text-xs mt-1">
                  <CheckCircleOutlined className="mr-1" /> RPC URL 有效
                </span>
              ) : rpcValid === false ? (
                <span className="text-red-500 flex items-center text-xs mt-1">
                  <WarningOutlined className="mr-1" /> RPC URL 无效
                </span>
              ) : null
            }
          >
            <Input 
              placeholder="例如: https://rpc.ankr.com/eth" 
              onChange={() => setRpcValid(null)}
              suffix={
                validatingRpc ? <LoadingOutlined /> : null
              }
            />
          </Form.Item>
          
          <Form.Item
            name="chainId"
            label="链ID"
            rules={[
              { required: true, message: '请输入链ID' },
              { type: 'number', message: '请输入有效的数字' }
            ]}
            extra={
              chainIdValid === true ? (
                <span className="text-green-500 flex items-center text-xs mt-1">
                  <CheckCircleOutlined className="mr-1" /> 链ID 有效
                </span>
              ) : chainIdValid === false ? (
                <span className="text-red-500 flex items-center text-xs mt-1">
                  <WarningOutlined className="mr-1" /> 链ID 已存在
                </span>
              ) : null
            }
          >
            <InputNumber 
              placeholder="例如: 1 (以太坊主网)" 
              className="w-full" 
              onChange={() => setChainIdValid(null)}
              suffix={
                validatingChainId ? <LoadingOutlined /> : null
              }
            />
          </Form.Item>
          
          <Form.Item
            name="symbol"
            label="代币符号"
            rules={[{ required: true, message: '请输入代币符号' }]}
          >
            <Input placeholder="例如: ETH" />
          </Form.Item>
          
          <Form.Item
            name="decimals"
            label="代币小数位数"
            initialValue={18}
          >
            <InputNumber placeholder="例如: 18" className="w-full" min={1} max={36} />
          </Form.Item>
          
          <Form.Item
            name="currencyName"
            label="代币名称"
          >
            <Input placeholder="例如: Ether" />
          </Form.Item>
          
          <Form.Item
            name="explorerUrl"
            label="区块浏览器URL"
          >
            <Input placeholder="例如: https://etherscan.io" />
          </Form.Item>
        </Form>
      </Modal>

      {/* EIP-3085添加网络确认模态框 */}
      <Modal
        title="添加网络请求"
        open={eip3085Visible}
        onCancel={() => {
          setEip3085Visible(false);
          setPendingNetwork(null);
        }}
        onOk={handleEIP3085AddNetwork}
        okText="添加网络"
        cancelText="拒绝"
      >
        {pendingNetwork && (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              <div className="flex items-start">
                <WarningOutlined className="text-yellow-500 text-lg mr-2 mt-0.5" />
                <p className="text-sm text-gray-700">
                  DApp请求添加新的网络。请确认网络信息是否正确，只添加您信任的网络。
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">网络名称:</span>
                <span className="font-medium">{pendingNetwork.chainName}</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">链ID:</span>
                <span className="font-medium font-mono">
                  {parseInt(pendingNetwork.chainId, 16)} ({pendingNetwork.chainId})
                </span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">RPC URL:</span>
                <span className="font-medium font-mono text-sm">{pendingNetwork.rpcUrls[0]}</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">代币符号:</span>
                <span className="font-medium">{pendingNetwork.nativeCurrency.symbol}</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">区块浏览器:</span>
                <span className="font-medium font-mono text-sm">
                  {pendingNetwork.blockExplorerUrls?.[0] || '无'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
});

NetworkSelector.propTypes = {
  networks: PropTypes.object,
  currentNetwork: PropTypes.string,
  onNetworkChange: PropTypes.func.isRequired,
  isModalVisible: PropTypes.bool,
  onModalClose: PropTypes.func.isRequired,
  onAddNetwork: PropTypes.func.isRequired,
  networkStatus: PropTypes.shape({
    isConnected: PropTypes.bool,
    latency: PropTypes.number,
    blockHeight: PropTypes.number,
    lastChecked: PropTypes.number
  }),
  onCheckNetworkStatus: PropTypes.func
};

export default NetworkSelector; 
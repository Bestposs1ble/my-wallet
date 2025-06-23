import React, { useState } from 'react';
import { Select, Button, Modal, Form, Input, InputNumber, message } from 'antd';
import PropTypes from 'prop-types';
import { LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';

/**
 * 网络选择器组件 - 包含网络选择和添加自定义网络功能
 * 
 * @param {Object} networks - 可用网络配置对象
 * @param {string} currentNetwork - 当前选中的网络ID
 * @param {Function} onNetworkChange - 切换网络回调函数
 * @param {boolean} isModalVisible - 是否显示模态框
 * @param {Function} onModalClose - 关闭模态框回调函数
 * @param {Function} onAddNetwork - 添加自定义网络回调函数
 * @returns {JSX.Element}
 */
const NetworkSelector = ({ 
  networks = {}, 
  currentNetwork = 'mainnet', 
  onNetworkChange,
  isModalVisible = false,
  onModalClose,
  onAddNetwork
}) => {
  const [addNetworkVisible, setAddNetworkVisible] = useState(false);
  const [form] = Form.useForm();
  const [validatingRpc, setValidatingRpc] = useState(false);
  const [rpcValid, setRpcValid] = useState(null);
  const [validatingChainId, setValidatingChainId] = useState(false);
  const [chainIdValid, setChainIdValid] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(false);

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
        explorerUrl: values.explorerUrl
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
          <Button key="close" type="primary" onClick={onModalClose}>
            关闭
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="选择网络">
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
                <span className="text-red-500 text-xs mt-1">RPC URL 无效或不可访问</span>
              ) : null
            }
          >
            <Input 
              placeholder="例如: https://nova.arbitrum.io/rpc" 
              onBlur={(e) => validateRpcUrl(e.target.value)}
              suffix={validatingRpc ? <LoadingOutlined /> : null}
            />
          </Form.Item>
          
          <Form.Item
            name="chainId"
            label="链ID"
            rules={[{ required: true, message: '请输入链ID' }]}
            extra={
              chainIdValid === true ? (
                <span className="text-green-500 flex items-center text-xs mt-1">
                  <CheckCircleOutlined className="mr-1" /> Chain ID 可用
                </span>
              ) : chainIdValid === false ? (
                <span className="text-red-500 text-xs mt-1">已存在相同Chain ID的网络</span>
              ) : null
            }
          >
            <InputNumber 
              placeholder="例如: 42170" 
              style={{ width: '100%' }} 
              onBlur={(e) => validateChainId(e.target.value)}
              suffix={validatingChainId ? <LoadingOutlined /> : null}
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
            name="explorerUrl"
            label="区块浏览器URL"
          >
            <Input placeholder="例如: https://nova.arbiscan.io" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

NetworkSelector.propTypes = {
  networks: PropTypes.object.isRequired,
  currentNetwork: PropTypes.string.isRequired,
  onNetworkChange: PropTypes.func.isRequired,
  isModalVisible: PropTypes.bool,
  onModalClose: PropTypes.func,
  onAddNetwork: PropTypes.func
};

export default NetworkSelector; 
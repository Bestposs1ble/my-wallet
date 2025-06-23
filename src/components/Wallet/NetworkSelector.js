import React, { useState } from 'react';
import { Select, Button, Modal, Form, Input, InputNumber } from 'antd';
import PropTypes from 'prop-types';

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

  // 处理添加自定义网络
  const handleAddNetwork = async () => {
    try {
      const values = await form.validateFields();
      
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
    } catch (error) {
      console.error('添加网络验证失败:', error);
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
                onNetworkChange(value);
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
          >
            <Input placeholder="例如: https://nova.arbitrum.io/rpc" />
          </Form.Item>
          
          <Form.Item
            name="chainId"
            label="链ID"
            rules={[{ required: true, message: '请输入链ID' }]}
          >
            <InputNumber placeholder="例如: 42170" style={{ width: '100%' }} />
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
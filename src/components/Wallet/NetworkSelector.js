import React from 'react';
import { Select, Button, Modal, Form } from 'antd';
import PropTypes from 'prop-types';

/**
 * 网络选择器组件
 * 
 * @param {Object} networks - 可用网络配置对象
 * @param {string} currentNetwork - 当前选中的网络ID
 * @param {Function} onNetworkChange - 切换网络回调函数
 * @param {boolean} isModalVisible - 是否显示模态框
 * @param {Function} onModalClose - 关闭模态框回调函数
 * @returns {JSX.Element}
 */
const NetworkSelector = ({ 
  networks = {}, 
  currentNetwork = 'mainnet', 
  onNetworkChange,
  isModalVisible = false,
  onModalClose
}) => {
  // 直接作为下拉框使用
  if (!isModalVisible) {
    return (
      <Select 
        value={currentNetwork} 
        onChange={onNetworkChange}
        style={{ minWidth: 120 }}
        dropdownMatchSelectWidth={false}
      >
        {Object.entries(networks).map(([id, network]) => (
          <Select.Option key={id} value={id}>
            {network.name}
          </Select.Option>
        ))}
      </Select>
    );
  }

  // 作为模态框显示
  return (
    <Modal
      title="切换网络"
      open={isModalVisible}
      onCancel={onModalClose}
      footer={null}
    >
      <Form layout="vertical">
        <Form.Item label="选择网络">
          <Select
            defaultValue={currentNetwork}
            onChange={(value) => {
              onNetworkChange(value);
              onModalClose();
            }}
            style={{ width: '100%' }}
          >
            {Object.entries(networks).map(([id, network]) => (
              <Select.Option key={id} value={id}>
                {network.name}
                {network.chainId && <span style={{ color: '#999', marginLeft: 8 }}>({network.chainId})</span>}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

NetworkSelector.propTypes = {
  networks: PropTypes.object.isRequired,
  currentNetwork: PropTypes.string.isRequired,
  onNetworkChange: PropTypes.func.isRequired,
  isModalVisible: PropTypes.bool,
  onModalClose: PropTypes.func
};

export default NetworkSelector; 
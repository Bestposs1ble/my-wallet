import React from 'react';
import { Typography, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Text } = Typography;

/**
 * 钱包地址展示组件 - 支持缩略显示和复制功能
 * @param {string} address - 完整的钱包地址
 * @param {boolean} short - 是否缩略显示地址
 * @param {boolean} showCopyButton - 是否显示复制按钮
 * @returns {JSX.Element}
 */
const AddressDisplay = ({ address, short = true, showCopyButton = true }) => {
  // 地址缩略显示函数
  const shortAddress = (addr) => {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  // 复制地址函数
  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    message.success('已复制地址到剪贴板');
  };

  return (
    <div className="address-display">
      <Text copyable={!showCopyButton} ellipsis={{ tooltip: address }}>
        {short ? shortAddress(address) : address}
      </Text>
      {showCopyButton && (
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopyAddress}
          size="small"
          title="复制地址"
        />
      )}
    </div>
  );
};

AddressDisplay.propTypes = {
  address: PropTypes.string.isRequired,
  short: PropTypes.bool,
  showCopyButton: PropTypes.bool
};

export default AddressDisplay; 
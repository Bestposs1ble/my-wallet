import React from 'react';
import { Modal, Typography, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import QRCode from 'qrcode.react';
import PropTypes from 'prop-types';

const { Title, Text } = Typography;

/**
 * 接收交易模态框组件，显示钱包地址和二维码
 * 
 * @param {boolean} visible - 是否显示模态框
 * @param {Function} onCancel - 关闭模态框的回调函数
 * @param {string} address - 钱包地址
 * @param {string} name - 钱包名称
 * @returns {JSX.Element}
 */
const ReceiveModal = ({ 
  visible = false, 
  onCancel, 
  address = '', 
  name = '账户' 
}) => {
  // 处理复制地址
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      // 可以添加一个复制成功的提示
    }
  };

  return (
    <Modal
      title="接收"
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
    >
      <div className="receive-modal" style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={4} style={{ marginBottom: 20 }}>{name}</Title>
        
        <div className="qr-code" style={{ marginBottom: 20 }}>
          <QRCode 
            value={address} 
            size={200} 
            level="H" 
            includeMargin 
            renderAs="svg"
          />
        </div>
        
        <div className="wallet-address" style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ 
            maxWidth: '80%', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: 4
          }}>
            {address}
          </div>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={handleCopyAddress}
            style={{ marginLeft: 8 }}
          />
        </div>
        
        <Text type="secondary" style={{ display: 'block' }}>
          扫描上面的二维码或复制地址以接收付款
        </Text>
      </div>
    </Modal>
  );
};

ReceiveModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  address: PropTypes.string.isRequired,
  name: PropTypes.string
};

export default ReceiveModal; 
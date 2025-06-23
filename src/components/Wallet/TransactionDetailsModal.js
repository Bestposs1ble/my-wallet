import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Typography, Divider, Tag, Tooltip, Button, message } from 'antd';
import { 
  CloseOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  SendOutlined,
  SwapOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

/**
 * 交易详情模态框组件
 * 
 * @param {boolean} visible - 是否显示
 * @param {Object} transaction - 交易对象
 * @param {Function} onCancel - 关闭回调
 * @param {string} networkExplorerUrl - 区块浏览器URL前缀
 * @returns {JSX.Element}
 */
const TransactionDetailsModal = ({ 
  visible = false, 
  transaction = null, 
  onCancel,
  networkExplorerUrl = 'https://etherscan.io/tx/'
}) => {
  if (!visible || !transaction) return null;
  
  // 复制文本到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // 使用antd的消息提示
    message.success('已复制到剪贴板');
  };
  
  // 格式化时间戳为日期和时间
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // 获取交易状态信息
  const getStatusInfo = () => {
    switch (transaction.status) {
      case 'confirmed':
        return {
          icon: <CheckCircleOutlined />,
          text: '已确认',
          color: 'success'
        };
      case 'pending':
        return {
          icon: <ClockCircleOutlined />,
          text: '处理中',
          color: 'warning'
        };
      case 'failed':
        return {
          icon: <ExclamationCircleOutlined />,
          text: '失败',
          color: 'error'
        };
      default:
        return {
          icon: <ClockCircleOutlined />,
          text: '未知',
          color: 'default'
        };
    }
  };
  
  // 获取交易类型图标和文本
  const getTypeInfo = () => {
    switch (transaction.type) {
      case 'send':
        return {
          icon: <SendOutlined style={{ color: '#ff7875' }} />,
          text: '发送',
          color: '#ff7875'
        };
      case 'receive':
        return {
          icon: <SendOutlined rotate={180} style={{ color: '#52c41a' }} />,
          text: '接收',
          color: '#52c41a'
        };
      case 'swap':
        return {
          icon: <SwapOutlined style={{ color: '#1890ff' }} />,
          text: '兑换',
          color: '#1890ff'
        };
      case 'contract':
        return {
          icon: <SwapOutlined style={{ color: '#722ed1' }} />,
          text: '合约交互',
          color: '#722ed1'
        };
      default:
        return {
          icon: <SendOutlined style={{ color: '#ff7875' }} />,
          text: '交易',
          color: '#ff7875'
        };
    }
  };
  
  // 计算Gas费用
  const calculateGasFee = () => {
    if (!transaction.gasPrice || !transaction.gasLimit) {
      return '未知';
    }
    
    // 将Gas价格从Gwei转换为ETH并乘以Gas限制
    const gasPriceInEth = parseFloat(transaction.gasPrice) / 1e9;
    const gasLimit = parseFloat(transaction.gasLimit);
    return (gasPriceInEth * gasLimit).toFixed(8) + ' ETH';
  };
  
  // 获取状态信息
  const statusInfo = getStatusInfo();
  const typeInfo = getTypeInfo();
  
  return (
    <Modal
      title={
        <div className="flex items-center">
          {typeInfo.icon}
          <span className="ml-2">交易详情</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
      width={600}
    >
      {/* 交易状态和概览 */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          <Tag color={statusInfo.color} icon={statusInfo.icon}>
            {statusInfo.text}
          </Tag>
          <Tooltip title={formatDateTime(transaction.timestamp)}>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {new Date(transaction.timestamp).toLocaleDateString()}
            </Text>
          </Tooltip>
        </div>
        
        <Tooltip title="在区块浏览器查看">
          <Button
            type="link"
            icon={<LinkOutlined />}
            onClick={() => window.open(`${networkExplorerUrl}${transaction.hash}`, '_blank')}
          >
            查看
          </Button>
        </Tooltip>
      </div>
      
      <Divider style={{ margin: '12px 0' }} />
      
      {/* 交易金额 */}
      <div className="mb-4 text-center">
        <div style={{ fontSize: 24, fontWeight: 600, color: typeInfo.color }}>
          {transaction.type === 'send' ? '-' : '+'}{transaction.amount} {transaction.symbol || 'ETH'}
        </div>
      </div>
      
      <Divider style={{ margin: '12px 0' }} />
      
      {/* 交易详细信息 */}
      <div className="grid grid-cols-1 gap-3">
        {/* 交易哈希 */}
        <div>
          <Text type="secondary">交易哈希</Text>
          <div className="flex items-center">
            <Paragraph 
              copyable={{ 
                text: transaction.hash,
                icon: [<CopyOutlined key="copy-icon" />, <CheckCircleOutlined key="copied-icon" />]
              }} 
              style={{ marginBottom: 0 }}
            >
              <Text code style={{ wordBreak: 'break-all' }}>{transaction.hash}</Text>
            </Paragraph>
          </div>
        </div>
        
        {/* 状态和区块信息 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Text type="secondary">确认</Text>
            <div>
              {transaction.confirmations ? (
                <Text strong>{transaction.confirmations} 确认</Text>
              ) : (
                <Text type="warning">等待确认...</Text>
              )}
            </div>
          </div>
          <div>
            <Text type="secondary">区块</Text>
            <div>
              {transaction.blockNumber ? (
                <Text strong>#{transaction.blockNumber}</Text>
              ) : (
                <Text type="warning">等待打包...</Text>
              )}
            </div>
          </div>
        </div>
        
        {/* 发送方和接收方 */}
        <div>
          <Text type="secondary">发送方</Text>
          <div>
            <Paragraph 
              copyable={{ 
                text: transaction.from,
                icon: [<CopyOutlined key="copy-icon" />, <CheckCircleOutlined key="copied-icon" />]
              }}
              style={{ marginBottom: 0 }}
            >
              <Text code>{transaction.from}</Text>
            </Paragraph>
          </div>
        </div>
        
        <div>
          <Text type="secondary">接收方</Text>
          <div>
            <Paragraph 
              copyable={{ 
                text: transaction.to,
                icon: [<CopyOutlined key="copy-icon" />, <CheckCircleOutlined key="copied-icon" />]
              }}
              style={{ marginBottom: 0 }}
            >
              <Text code>{transaction.to}</Text>
            </Paragraph>
          </div>
        </div>
        
        {/* Gas信息 */}
        <div>
          <Text type="secondary">Gas信息</Text>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Gas价格</Text>
              <div>
                <Text>{transaction.gasPrice || '-'} Gwei</Text>
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Gas限额</Text>
              <div>
                <Text>{transaction.gasLimit || '-'}</Text>
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>预估总费用</Text>
              <div>
                <Text>{calculateGasFee()}</Text>
              </div>
            </div>
          </div>
        </div>
        
        {/* 错误信息（如有） */}
        {transaction.error && (
          <div>
            <Text type="danger">错误信息</Text>
            <div>
              <Text type="danger">{transaction.error}</Text>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

TransactionDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  transaction: PropTypes.object,
  onCancel: PropTypes.func.isRequired,
  networkExplorerUrl: PropTypes.string
};

export default TransactionDetailsModal; 
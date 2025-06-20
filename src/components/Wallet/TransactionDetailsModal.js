import React from 'react';
import PropTypes from 'prop-types';
import { 
  CloseOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  LinkOutlined
} from '@ant-design/icons';

/**
 * 交易详情模态框组件
 * 
 * @param {boolean} visible - 是否显示
 * @param {Object} transaction - 交易对象
 * @param {Function} onClose - 关闭回调
 * @param {string} networkExplorerUrl - 区块浏览器URL前缀
 * @returns {JSX.Element}
 */
const TransactionDetailsModal = ({ 
  visible = false, 
  transaction = null, 
  onClose,
  networkExplorerUrl = 'https://etherscan.io/tx/'
}) => {
  if (!visible || !transaction) return null;
  
  // 复制文本到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // 这里可以添加复制成功的提示
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
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return {
          icon: <ClockCircleOutlined />,
          text: '处理中',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'failed':
        return {
          icon: <ExclamationCircleOutlined />,
          text: '失败',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: <ClockCircleOutlined />,
          text: '未知',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };
  
  // 获取交易类型文本
  const getTypeText = () => {
    switch (transaction.type) {
      case 'send':
        return '发送';
      case 'receive':
        return '接收';
      case 'swap':
        return '兑换';
      case 'contract':
        return '合约交互';
      default:
        return '交易';
    }
  };
  
  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return '-';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // 获取状态信息
  const statusInfo = getStatusInfo();
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="glass-effect w-full max-w-lg rounded-2xl p-6 shadow-glass-lg">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-dark-800">交易详情</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <CloseOutlined />
          </button>
        </div>
        
        {/* 交易状态 */}
        <div className={`mb-6 p-4 rounded-xl border ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${statusInfo.bgColor} mr-3 ${statusInfo.color}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h4 className="font-medium text-dark-800">
                {getTypeText()} {transaction.amount} {transaction.symbol || 'ETH'}
              </h4>
              <p className={`text-sm ${statusInfo.color}`}>
                {statusInfo.text} - {formatDateTime(transaction.timestamp)}
              </p>
            </div>
          </div>
        </div>
        
        {/* 交易详情列表 */}
        <div className="space-y-4">
          {/* 交易哈希 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm text-gray-500 mb-1">交易哈希</label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-800 font-mono break-all">
                {transaction.hash}
              </span>
              <div className="flex items-center space-x-1 ml-2">
                <button 
                  onClick={() => copyToClipboard(transaction.hash)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <CopyOutlined />
                </button>
                <a 
                  href={`${networkExplorerUrl}${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <LinkOutlined />
                </a>
              </div>
            </div>
          </div>
          
          {/* 交易状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm text-gray-500 mb-1">状态</label>
              <div className="flex items-center">
                <div className={`mr-2 ${statusInfo.color}`}>{statusInfo.icon}</div>
                <span className="text-sm text-dark-800">{statusInfo.text}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm text-gray-500 mb-1">区块</label>
              <span className="text-sm text-dark-800">
                {transaction.blockNumber || '等待中...'}
              </span>
            </div>
          </div>
          
          {/* 发送方和接收方 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm text-gray-500 mb-1">发送方</label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-800 font-mono">
                  {formatAddress(transaction.from)}
                </span>
                <div className="flex items-center space-x-1 ml-2">
                  <button 
                    onClick={() => copyToClipboard(transaction.from)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <CopyOutlined />
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm text-gray-500 mb-1">接收方</label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-800 font-mono">
                  {formatAddress(transaction.to)}
                </span>
                <div className="flex items-center space-x-1 ml-2">
                  <button 
                    onClick={() => copyToClipboard(transaction.to)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <CopyOutlined />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 金额和Nonce */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm text-gray-500 mb-1">金额</label>
              <span className="text-sm text-dark-800 font-medium">
                {transaction.amount} {transaction.symbol || 'ETH'}
                {transaction.usdValue && (
                  <span className="text-gray-500 ml-1">(${transaction.usdValue})</span>
                )}
              </span>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <label className="block text-sm text-gray-500 mb-1">Nonce</label>
              <span className="text-sm text-dark-800">
                {transaction.nonce || '0'}
              </span>
            </div>
          </div>
          
          {/* Gas信息 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-gray-500">Gas信息</label>
              <span className="text-xs text-gray-500">
                总费用: {((transaction.gasUsed || 0) * (transaction.gasPrice || 0) / 1e9).toFixed(8)} ETH
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gas价格</label>
                <span className="text-sm text-dark-800">
                  {transaction.gasPrice || '-'} Gwei
                </span>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gas用量</label>
                <span className="text-sm text-dark-800">
                  {transaction.gasUsed || '-'} / {transaction.gasLimit || '-'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 交易输入数据 */}
          {transaction.data && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-500">交易数据</label>
                <button 
                  onClick={() => copyToClipboard(transaction.data)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <CopyOutlined />
                </button>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <code className="text-xs text-dark-800 font-mono break-all">
                  {transaction.data}
                </code>
              </div>
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="mt-6 flex justify-between">
          {transaction.status === 'pending' && (
            <button className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              加速交易
            </button>
          )}
          <a
            href={`${networkExplorerUrl}${transaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors inline-flex items-center"
          >
            在区块浏览器中查看
            <LinkOutlined className="ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
};

TransactionDetailsModal.propTypes = {
  visible: PropTypes.bool,
  transaction: PropTypes.shape({
    hash: PropTypes.string.isRequired,
    type: PropTypes.string,
    from: PropTypes.string,
    to: PropTypes.string,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    symbol: PropTypes.string,
    status: PropTypes.string,
    timestamp: PropTypes.number,
    blockNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gasPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gasLimit: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gasUsed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nonce: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    data: PropTypes.string,
    usdValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }),
  onClose: PropTypes.func,
  networkExplorerUrl: PropTypes.string
};

export default TransactionDetailsModal; 
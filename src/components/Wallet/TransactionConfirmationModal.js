import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  CloseOutlined, 
  LoadingOutlined,
  CheckCircleOutlined,
  LockOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { ethers } from 'ethers';

/**
 * 交易确认模态框组件
 * 
 * @param {boolean} visible - 是否显示
 * @param {Function} onClose - 关闭回调
 * @param {Function} onConfirm - 确认回调
 * @param {object} transactionData - 交易数据
 * @returns {JSX.Element}
 */
const TransactionConfirmationModal = ({ 
  visible = false, 
  onClose,
  onConfirm,
  transactionData
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  if (!visible || !transactionData) return null;
  
  const { 
    recipient, 
    amount, 
    gasPrice, 
    gasLimit, 
    estimatedFee, 
    networkSymbol = 'ETH',
    selectedToken,
    totalAmount
  } = transactionData;

  // 处理确认交易
  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 调用父组件的确认回调
      await onConfirm();
    } catch (err) {
      console.error('交易确认失败:', err);
      setError(`确认失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 格式化地址
  const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="glass-effect w-full max-w-md rounded-2xl p-6 shadow-glass-lg relative">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-dark-800 flex items-center">
            <LockOutlined className="mr-2" /> 确认交易
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <CloseOutlined />
          </button>
        </div>
        
        {/* 交易提示 */}
        <div className="mb-6 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <div className="flex items-start">
            <WarningOutlined className="text-yellow-500 text-lg mr-2 mt-0.5" />
            <p className="text-sm text-gray-700">
              请确认交易信息，一旦交易广播至区块链网络将无法撤销。
            </p>
          </div>
        </div>

        {/* 交易详情 */}
        <div className="mb-6 space-y-4">
          <div className="flex justify-between px-2 py-3 bg-gray-50 rounded-lg items-center">
            <span className="text-gray-700">交易类型</span>
            <span className="font-medium">
              {selectedToken ? `代币转账 (${selectedToken.symbol})` : `${networkSymbol} 转账`}
            </span>
          </div>
          
          <div className="flex justify-between px-2 py-3 bg-white border border-gray-200 rounded-lg items-center">
            <span className="text-gray-700">发送至</span>
            <div className="flex items-center">
              <span className="font-medium" title={recipient}>
                {formatAddress(recipient)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between px-2 py-3 bg-white border border-gray-200 rounded-lg items-center">
            <span className="text-gray-700">数量</span>
            <span className="font-medium">
              {amount} {selectedToken ? selectedToken.symbol : networkSymbol}
            </span>
          </div>
          
          <div className="flex justify-between px-2 py-3 bg-white border border-gray-200 rounded-lg items-center">
            <span className="text-gray-700">网络费用</span>
            <span className="font-medium text-gray-700">
              {estimatedFee} {networkSymbol}
            </span>
          </div>
          
          <div className="flex justify-between px-2 py-3 bg-white border border-gray-200 rounded-lg items-center">
            <span className="text-gray-700">矿工费上限</span>
            <span className="font-medium">
              {gasPrice} Gwei × {gasLimit || '0'}
            </span>
          </div>

          <div className="flex justify-between px-2 py-3 bg-primary-50 border border-primary-100 rounded-lg items-center">
            <span className="text-gray-700 font-medium">总金额</span>
            <span className="font-bold text-primary-700">
              {totalAmount} {networkSymbol}
            </span>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
            <WarningOutlined className="mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-dark-800 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 flex items-center"
          >
            {loading && <LoadingOutlined className="mr-2" />}
            确认交易
          </button>
        </div>
      </div>
    </div>
  );
};

TransactionConfirmationModal.propTypes = {
  visible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  transactionData: PropTypes.shape({
    recipient: PropTypes.string,
    amount: PropTypes.string,
    gasPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    gasLimit: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    estimatedFee: PropTypes.string,
    networkSymbol: PropTypes.string,
    selectedToken: PropTypes.object,
    totalAmount: PropTypes.string
  })
};

export default TransactionConfirmationModal; 
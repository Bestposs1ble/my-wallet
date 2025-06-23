import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useWallet } from '../../context/WalletContext';
import { ethers } from 'ethers';
import * as ethersHelper from '../../utils/ethersHelper';
import * as blockchainService from '../../services/blockchainService';
import { 
  CloseOutlined, 
  LoadingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DownOutlined
} from '@ant-design/icons';

/**
 * 发送交易模态框组件
 * 
 * @param {boolean} visible - 是否显示
 * @param {Function} onClose - 关闭回调
 * @param {Function} onSuccess - 成功回调
 * @returns {JSX.Element}
 */
const SendTransactionModal = ({ 
  visible = false, 
  onClose,
  onSuccess
}) => {
  const { 
    getCurrentWallet, 
    getCurrentWalletBalance, 
    sendTransaction, 
    sendTokenTransaction,
    tokens,
    getTokenBalance
  } = useWallet();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [estimatedFee, setEstimatedFee] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [addressValid, setAddressValid] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null); // 选择的代币
  const [showTokenList, setShowTokenList] = useState(false); // 控制代币列表显示

  // 获取当前钱包和余额
  const currentWallet = getCurrentWallet();
  const ethBalance = getCurrentWalletBalance();
  
  // 获取选中代币的余额
  const tokenBalance = selectedToken ? getTokenBalance(selectedToken.address) : '0';
  
  // 计算最大可用余额
  const maxAvailable = selectedToken ? tokenBalance : ethBalance;

  // 重置表单
  const resetForm = () => {
    setRecipient('');
    setAmount('');
    setGasPrice('');
    setGasLimit('');
    setEstimatedFee('0');
    setError('');
    setSuccess(false);
    setAddressValid(false);
    setShowAdvanced(false);
    setSelectedToken(null);
  };

  // 关闭模态框
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 验证地址
  useEffect(() => {
    if (recipient) {
      const isValid = ethersHelper.isValidAddress(recipient);
      setAddressValid(isValid);
      if (!isValid) {
        setError('无效的以太坊地址');
      } else {
        setError('');
      }
    } else {
      setAddressValid(false);
      setError('');
    }
  }, [recipient]);

  // 估算Gas费用
  const estimateGas = async () => {
    if (!recipient || !amount || !addressValid) return;
    
    try {
      setLoading(true);
      
      let fee;
      if (selectedToken) {
        // 估算代币交易Gas费用
        fee = await blockchainService.estimateTokenTransactionGas(
          selectedToken.address,
          currentWallet.address,
          recipient,
          amount
        );
      } else {
        // 估算ETH交易Gas费用
        const txObject = {
          from: currentWallet.address,
          to: recipient,
          value: ethers.utils.parseEther(amount)
        };
        fee = await blockchainService.estimateTransactionGas(txObject);
      }
      
      setEstimatedFee(fee.gasFee);
      setGasPrice(ethers.utils.formatUnits(fee.gasPrice, 'gwei'));
      setGasLimit(fee.gasLimit.toString());
    } catch (err) {
      console.error('估算Gas费用失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 当地址和金额变化时，估算Gas费用
  useEffect(() => {
    if (addressValid && amount && parseFloat(amount) > 0) {
      estimateGas();
    }
  }, [addressValid, amount, selectedToken]);

  // 处理最大金额按钮
  const handleMaxAmount = () => {
    if (selectedToken) {
      setAmount(tokenBalance);
    } else {
      // 对于ETH，保留一些用于Gas费用
      const maxEth = parseFloat(ethBalance);
      if (maxEth > 0.01) {
        setAmount((maxEth - 0.01).toFixed(6));
      } else {
        setAmount('0');
      }
    }
  };

  // 处理发送交易
  const handleSend = async () => {
    if (!recipient || !amount || !addressValid) {
      setError('请填写有效的接收地址和金额');
      return;
    }
    
    if (parseFloat(amount) <= 0) {
      setError('金额必须大于0');
      return;
    }
    
    // 检查余额是否足够
    const amountValue = parseFloat(amount);
    const balanceValue = parseFloat(maxAvailable);
    
    if (amountValue > balanceValue) {
      setError('余额不足');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 准备交易选项
      const options = {};
      if (gasPrice) options.gasPrice = gasPrice;
      if (gasLimit) options.gasLimit = gasLimit;
      
      let tx;
      if (selectedToken) {
        // 发送代币交易
        tx = await sendTokenTransaction(
          selectedToken.address,
          recipient,
          amount,
          options
        );
      } else {
        // 发送ETH交易
        tx = await sendTransaction(recipient, amount, options);
      }
      
      if (tx) {
        setSuccess(true);
        if (onSuccess) onSuccess(tx);
        
        // 3秒后关闭模态框
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    } catch (err) {
      console.error('发送交易失败:', err);
      setError(`发送交易失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 选择代币
  const handleSelectToken = (token) => {
    setSelectedToken(token);
    setShowTokenList(false);
  };
  
  // 选择ETH
  const handleSelectEth = () => {
    setSelectedToken(null);
    setShowTokenList(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="glass-effect w-full max-w-md rounded-2xl p-6 shadow-glass-lg">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-dark-800">
            发送{selectedToken ? ` ${selectedToken.symbol}` : ' ETH'}
          </h3>
          <button 
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <CloseOutlined />
          </button>
        </div>
        
        {/* 代币选择器 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择代币
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTokenList(!showTokenList)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center">
                <img 
                  src={selectedToken 
                    ? selectedToken.image || `https://ui-avatars.com/api/?name=${selectedToken.symbol}&background=random&color=fff&rounded=true` 
                    : "https://cryptologos.cc/logos/ethereum-eth-logo.png"} 
                  alt={selectedToken ? selectedToken.symbol : "ETH"} 
                  className="w-6 h-6 mr-2"
                />
                <span>{selectedToken ? selectedToken.symbol : "ETH"}</span>
              </div>
              <DownOutlined />
            </button>
            
            {showTokenList && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-y-auto">
                {/* ETH选项 */}
                <div 
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleSelectEth}
                >
                  <div className="flex items-center">
                    <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" alt="ETH" className="w-6 h-6 mr-2" />
                    <span>ETH</span>
                  </div>
                  <span>{ethBalance}</span>
                </div>
                
                {/* 代币列表 */}
                {tokens.map((token) => (
                  <div 
                    key={token.address}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                    onClick={() => handleSelectToken(token)}
                  >
                    <div className="flex items-center">
                      <img 
                        src={token.image || `https://ui-avatars.com/api/?name=${token.symbol}&background=random&color=fff&rounded=true`} 
                        alt={token.symbol} 
                        className="w-6 h-6 mr-2" 
                      />
                      <span>{token.symbol}</span>
                    </div>
                    <span>{getTokenBalance(token.address)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 接收地址 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            接收地址
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${
              recipient && !addressValid ? 'border-red-500' : 'border-gray-300'
            } focus:ring-primary-500 focus:border-primary-500`}
            placeholder="0x..."
          />
        </div>
        
        {/* 金额 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              金额
            </label>
            <div className="text-sm text-gray-500">
              可用余额: {maxAvailable} {selectedToken ? selectedToken.symbol : 'ETH'}
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.0"
              min="0"
              step="0.000001"
            />
            <button
              type="button"
              onClick={handleMaxAmount}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
            >
              最大
            </button>
          </div>
        </div>
        
        {/* 高级选项切换 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
        </div>
        
        {/* 高级选项 */}
        {showAdvanced && (
          <div className="mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gas价格 (Gwei)
              </label>
              <input
                type="number"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="自动"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gas限制
              </label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="自动"
                min="21000"
              />
            </div>
          </div>
        )}
        
        {/* 估算费用 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>估算Gas费用:</span>
            <span>{estimatedFee} ETH</span>
          </div>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
            <WarningOutlined className="mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {/* 成功提示 */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-start">
            <CheckCircleOutlined className="mr-2 mt-0.5 flex-shrink-0" />
            <p>交易已成功广播到网络！</p>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-dark-800 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !addressValid || !amount || parseFloat(amount) <= 0}
            className={`px-4 py-2 rounded-lg flex items-center ${
              loading || !addressValid || !amount || parseFloat(amount) <= 0
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {loading && <LoadingOutlined className="mr-2" />}
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

SendTransactionModal.propTypes = {
  visible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export default SendTransactionModal; 
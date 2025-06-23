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
  DownOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import TransactionConfirmationModal from './TransactionConfirmationModal';

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
  const [isSending, setIsSending] = useState(false); // 发送防抖状态
  const [estimatingGas, setEstimatingGas] = useState(false); // Gas估算状态
  const [revertReason, setRevertReason] = useState(''); // 链上失败原因
  
  // 添加交易确认相关状态
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);

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
    setShowConfirmation(false);
    setConfirmationData(null);
    setIsSending(false);
    setEstimatingGas(false);
    setRevertReason('');
  };

  // 关闭模态框
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // 关闭确认模态框
  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
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
      setEstimatingGas(true);
      setError('');
      
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
      
      // 显示成功提示
      setError('Gas费用估算成功');
      setTimeout(() => setError(''), 2000);
    } catch (err) {
      console.error('估算Gas费用失败:', err);
      setError(`估算Gas费用失败: ${err.message}`);
    } finally {
      setEstimatingGas(false);
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

  // 准备交易确认
  const handlePrepareTransaction = () => {
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
    
    // 计算总金额（对于ETH转账，加上gas费；对于代币转账，仅显示代币数量）
    let totalAmount = amount;
    if (!selectedToken && estimatedFee) {
      totalAmount = (parseFloat(amount) + parseFloat(estimatedFee)).toFixed(6);
    }
    
    // 准备确认数据
    setConfirmationData({
      recipient,
      amount,
      gasPrice,
      gasLimit,
      estimatedFee,
      networkSymbol: selectedToken ? selectedToken.symbol : 'ETH',
      selectedToken,
      totalAmount
    });
    
    // 显示确认模态框
    setShowConfirmation(true);
  };

  // 处理发送交易
  const handleSend = async () => {
    // 防抖：如果已经在发送中，则不重复发送
    if (isSending) return;
    
    // 新增gasLimit校验
    if (gasLimit && parseInt(gasLimit, 10) < 21000) {
      setError('Gas Limit 不能小于 21000');
      setShowConfirmation(false);
      return;
    }
    
    setIsSending(true); // 设置发送中状态
    setLoading(true);
    setError('');
    setRevertReason('');
    
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
      
      // 尝试解析链上失败原因
      if (err.data) {
        try {
          // 尝试解析revert reason
          const reason = ethersHelper.parseRevertReason(err.data);
          if (reason) {
            setRevertReason(`链上失败原因: ${reason}`);
          }
        } catch (parseErr) {
          console.error('解析失败原因错误:', parseErr);
        }
      }
    } finally {
      setLoading(false);
      // 延迟重置发送状态，避免用户快速点击
      setTimeout(() => {
        setIsSending(false);
      }, 2000);
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
    <>
      {/* 主模态框 */}
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose}></div>
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* 头部 */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedToken ? `发送 ${selectedToken.symbol}` : '发送 ETH'}
              </h3>
              <button 
                onClick={handleClose}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <CloseOutlined />
              </button>
            </div>
            
            {/* 主体内容 */}
            <div className="p-6 space-y-4">
              {/* 代币选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择代币
                </label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg flex items-center justify-between bg-white"
                    onClick={() => setShowTokenList(!showTokenList)}
                  >
                    <div className="flex items-center">
                      {selectedToken ? (
                        <>
                          {selectedToken.image && (
                            <img 
                              src={selectedToken.image} 
                              alt={selectedToken.symbol} 
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                          )}
                          <span>{selectedToken.symbol}</span>
                        </>
                      ) : (
                        <span>ETH</span>
                      )}
                    </div>
                    <DownOutlined className="text-xs text-gray-400" />
                  </button>
                  
                  {/* 代币下拉列表 */}
                  {showTokenList && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      <div className="p-1">
                        {/* ETH选项 */}
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded flex items-center"
                          onClick={handleSelectEth}
                        >
                          <span className="mr-2">ETH</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {ethBalance}
                          </span>
                        </button>
                        
                        {/* 代币列表 */}
                        {tokens.map(token => (
                          <button
                            key={token.address}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded flex items-center"
                            onClick={() => handleSelectToken(token)}
                          >
                            {token.image && (
                              <img 
                                src={token.image} 
                                alt={token.symbol} 
                                className="w-5 h-5 mr-2 rounded-full"
                              />
                            )}
                            <span>{token.symbol}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {getTokenBalance(token.address)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 收款地址 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  收款地址
                </label>
                <input
                  type="text"
                  className={`w-full py-2 px-3 border rounded-lg ${
                    recipient && !addressValid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="输入有效的以太坊地址"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
              
              {/* 金额 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    金额
                  </label>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={handleMaxAmount}
                  >
                    最大
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">
                      {selectedToken ? selectedToken.symbol : 'ETH'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 flex justify-between">
                  <span>可用余额: {maxAvailable} {selectedToken ? selectedToken.symbol : 'ETH'}</span>
                  <span>≈ $0.00 USD</span>
                </div>
              </div>
              
              {/* Gas设置 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    className="text-sm text-gray-700 flex items-center"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    高级设置
                    <span className={`ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                      <DownOutlined />
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    className="text-xs bg-blue-50 text-blue-600 py-1 px-2 rounded flex items-center"
                    onClick={estimateGas}
                    disabled={estimatingGas || !addressValid || !amount}
                  >
                    {estimatingGas ? <LoadingOutlined className="mr-1" /> : <CalculatorOutlined className="mr-1" />}
                    自动估算Gas
                  </button>
                </div>
                
                {showAdvanced && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Gas Price (Gwei)
                      </label>
                      <input
                        type="text"
                        className="w-full py-1.5 px-2 border border-gray-300 rounded"
                        placeholder="自动"
                        value={gasPrice}
                        onChange={(e) => setGasPrice(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Gas Limit
                      </label>
                      <input
                        type="text"
                        className="w-full py-1.5 px-2 border border-gray-300 rounded"
                        placeholder="21000"
                        value={gasLimit}
                        onChange={(e) => setGasLimit(e.target.value)}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      估算Gas费用: {estimatedFee} ETH
                    </div>
                  </div>
                )}
              </div>
              
              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-md flex items-start space-x-2">
                  <WarningOutlined className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {/* 链上失败原因 */}
              {revertReason && (
                <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 p-3 rounded-md flex items-start space-x-2">
                  <WarningOutlined className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{revertReason}</span>
                </div>
              )}
              
              {/* 成功提示 */}
              {success && (
                <div className="bg-green-50 border border-green-100 text-green-600 p-3 rounded-md flex items-start space-x-2">
                  <CheckCircleOutlined className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">交易已提交到网络，请等待确认</span>
                </div>
              )}
              
              {/* 按钮区域 */}
              <div className="pt-4">
                <button
                  type="button"
                  className={`w-full py-2.5 px-4 rounded-lg font-medium text-white ${
                    loading || !addressValid || !amount || isSending
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  onClick={handlePrepareTransaction}
                  disabled={loading || !addressValid || !amount || isSending}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <LoadingOutlined className="mr-2" /> 处理中...
                    </span>
                  ) : (
                    '下一步'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 交易确认模态框 */}
      {showConfirmation && confirmationData && (
        <TransactionConfirmationModal
          visible={showConfirmation}
          onClose={handleCloseConfirmation}
          onConfirm={handleSend}
          data={confirmationData}
          loading={loading || isSending}
        />
      )}
    </>
  );
};

SendTransactionModal.propTypes = {
  visible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export default SendTransactionModal; 
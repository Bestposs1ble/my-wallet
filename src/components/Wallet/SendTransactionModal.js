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
    getTokenBalance,
    networks,
    currentNetwork
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
    setIsSending(false);
    setEstimatingGas(false);
    setRevertReason('');
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
      
      // 增加20%的安全系数，以防止gas不足
      const adjustedGasLimit = Math.ceil(Number(fee.gasLimit) * 1.2).toString();
      
      // 计算调整后的gas费用
      const gasPriceGwei = ethers.utils.formatUnits(fee.gasPrice, 'gwei');
      const adjustedGasFee = (parseFloat(fee.gasFee) * 1.2).toFixed(8);
      
      setEstimatedFee(adjustedGasFee);
      setGasPrice(gasPriceGwei);
      setGasLimit(adjustedGasLimit);
      
      // 检查余额是否足够支付交易费用
      if (!selectedToken) {
        const amountInEth = parseFloat(amount);
        const gasFeeInEth = parseFloat(adjustedGasFee);
        const totalCost = amountInEth + gasFeeInEth;
        const ethBalanceValue = parseFloat(ethBalance);
        
        if (totalCost > ethBalanceValue) {
          setError(`警告：余额不足以支付交易费用。总花费: ${totalCost.toFixed(6)} ETH (${amountInEth.toFixed(6)} ETH + ${gasFeeInEth.toFixed(6)} ETH gas), 可用余额: ${ethBalanceValue} ETH`);
        } else {
          // 显示成功提示
          setError('Gas费用估算成功');
          setTimeout(() => setError(''), 2000);
        }
      } else {
        // 检查ETH余额是否足够支付gas费用
        const gasFeeInEth = parseFloat(adjustedGasFee);
        const ethBalanceValue = parseFloat(ethBalance);
        
        if (gasFeeInEth > ethBalanceValue) {
          setError(`警告：ETH余额不足以支付gas费用。Gas费用: ${gasFeeInEth.toFixed(6)} ETH, 可用ETH余额: ${ethBalanceValue} ETH`);
        } else {
          // 显示成功提示
          setError('Gas费用估算成功');
          setTimeout(() => setError(''), 2000);
        }
      }
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
      console.log('设置最大金额，当前余额:', maxEth, 'ETH');
      
      // 获取当前网络配置
      const currentNetworkConfig = networks ? networks[currentNetwork] : null;
      console.log('当前网络:', currentNetwork, currentNetworkConfig);
      
      // 根据不同网络预留不同数量的ETH
      let reserveAmount = 0.01; // 默认预留0.01 ETH
      
      // 如果是本地网络或测试网络，预留更多
      if (currentNetworkConfig && (currentNetworkConfig.chainId === 1337 || currentNetwork.includes('test'))) {
        reserveAmount = 0.2; // 本地/测试网络预留0.2 ETH
        console.log('本地/测试网络，预留更多ETH用于gas:', reserveAmount, 'ETH');
      } else if (maxEth > 1) {
        // 如果余额较大，预留更多
        reserveAmount = 0.1; // 预留0.1 ETH
      }
      
      if (maxEth > reserveAmount) {
        const maxAmount = (maxEth - reserveAmount).toFixed(6);
        console.log('设置最大可发送金额:', maxAmount, 'ETH (预留', reserveAmount, 'ETH用于gas)');
        setAmount(maxAmount);
      } else {
        console.log('余额不足以支付gas费用，设置为0');
        setAmount('0');
      }
    }
  };

  // 修改：直接发送交易，不再显示确认模态框
  const handleSendTransaction = () => {
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
    
    // 对于代币转账，检查代币余额是否足够
    if (selectedToken) {
      const tokenBalanceValue = parseFloat(tokenBalance);
      if (amountValue > tokenBalanceValue) {
        setError(`${selectedToken.symbol}余额不足`);
        return;
      }
      
      // 检查ETH余额是否足够支付gas费用
      const gasFeeInEth = parseFloat(estimatedFee || '0');
      const ethBalanceValue = parseFloat(ethBalance);
      
      if (gasFeeInEth > ethBalanceValue) {
        setError(`ETH余额不足以支付gas费用。Gas费用: ${gasFeeInEth.toFixed(6)} ETH, 可用ETH余额: ${ethBalanceValue} ETH`);
        return;
      }
    } else {
      // 对于ETH转账，检查余额是否足够支付交易金额加上gas费用
      const gasFeeInEth = parseFloat(estimatedFee || '0');
      const totalCost = amountValue + gasFeeInEth;
      const ethBalanceValue = parseFloat(ethBalance);
      
      if (totalCost > ethBalanceValue) {
        setError(`ETH余额不足以支付交易费用。总花费: ${totalCost.toFixed(6)} ETH (${amountValue.toFixed(6)} ETH + ${gasFeeInEth.toFixed(6)} ETH gas), 可用余额: ${ethBalanceValue} ETH`);
        return;
      }
    }
    
    // 直接发送交易，不再显示确认模态框
    handleSend();
  };

  // 处理发送交易
  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    setLoading(true);
    setError('');
    setSuccess(false);
    setRevertReason('');
    try {
      console.log('======= 发送交易开始 =======');
      // 检查当前钱包
      if (!currentWallet || !currentWallet.address) {
        setError('当前钱包不可用');
        setLoading(false);
        setIsSending(false);
        return;
      }
      // 调试：打印当前 signer 地址
      console.log('当前签名账户:', currentWallet.address);
      console.log('发送到地址:', recipient);
      console.log('发送金额:', amount);
      
      // 准备交易选项
      const options = {};
      if (gasPrice) {
        options.gasPrice = gasPrice;
        console.log('设置自定义gasPrice:', gasPrice, 'Gwei');
      }
      if (gasLimit) {
        options.gasLimit = gasLimit;
        console.log('设置自定义gasLimit:', gasLimit);
      }
      
      console.log('交易选项:', options);
      console.log('当前网络:', getCurrentWallet()?.network);
      
      let tx;
      if (selectedToken) {
        // 发送代币交易
        console.log('发送代币交易:', selectedToken.symbol);
        tx = await sendTokenTransaction(
          selectedToken.address,
          recipient,
          amount,
          options
        );
      } else {
        // 发送ETH交易，确保使用当前钱包
        console.log('发送ETH交易');
        tx = await sendTransaction(recipient, amount, options);
      }
      
      console.log('交易响应:', tx);
      
      if (tx) {
        console.log('交易已提交:', tx.hash);
        setSuccess(true);
        if (onSuccess) onSuccess(tx);
        setTimeout(() => {
          handleClose(); // 交易发起后自动关闭主弹窗
        }, 1500);
      }
    } catch (err) {
      console.error('发送交易失败:', err);
      
      // 尝试解析错误
      let errorMessage = err.message;
      if (err.error && err.error.body) {
        try {
          const errorBody = JSON.parse(err.error.body);
          console.error('RPC错误详情:', errorBody);
          if (errorBody.error && errorBody.error.message) {
            errorMessage = `${err.message} (${errorBody.error.message})`;
          }
        } catch (parseError) {
          console.error('无法解析错误体:', err.error.body);
        }
      }
      
      setError(`发送交易失败: ${errorMessage}`);
      
      if (err.data) {
        try {
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
      console.log('======= 发送交易结束 =======');
      setIsSending(false);
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

  // 计算总花费
  let totalCost = '';
  if (!selectedToken && amount && estimatedFee) {
    const amt = parseFloat(amount);
    const gas = parseFloat(estimatedFee);
    if (!isNaN(amt) && !isNaN(gas)) {
      totalCost = (amt + gas).toFixed(8);
    }
  }

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
                  disabled={loading || isSending}
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
                    disabled={loading || isSending}
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
                    disabled={loading || isSending}
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
                {/* 新增：Gas费用和总花费提示 */}
                {!selectedToken && amount && estimatedFee && (
                  <div className="mt-2 text-xs text-blue-700">
                    <div>预计Gas费用: <span className="font-mono">{estimatedFee} ETH</span></div>
                    <div>总共将扣除: <span className="font-mono">{totalCost} ETH</span></div>
                  </div>
                )}
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
                    disabled={estimatingGas || !addressValid || !amount || loading || isSending}
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
                        disabled={loading || isSending}
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
                        disabled={loading || isSending}
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
                  <span className="text-sm">交易已提交到网络，请在交易历史中查看详情</span>
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
                  onClick={handleSendTransaction}
                  disabled={loading || !addressValid || !amount || isSending}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <LoadingOutlined className="mr-2" /> 处理中...
                    </span>
                  ) : (
                    '发送'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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
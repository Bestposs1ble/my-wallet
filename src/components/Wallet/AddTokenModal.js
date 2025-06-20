import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  QuestionCircleOutlined, 
  CloseOutlined, 
  LoadingOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

/**
 * 添加代币模态框组件
 * 
 * @param {boolean} visible - 是否显示
 * @param {Function} onClose - 关闭回调
 * @param {Function} onSubmit - 提交回调
 * @returns {JSX.Element}
 */
const AddTokenModal = ({ 
  visible = false, 
  onClose,
  onSubmit
}) => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);

  if (!visible) return null;
  
  // 处理代币地址输入
  const handleAddressChange = (e) => {
    setTokenAddress(e.target.value);
    setError('');
    setTokenInfo(null);
  };

  // 查找代币信息
  const handleSearchToken = async () => {
    if (!tokenAddress || !tokenAddress.startsWith('0x')) {
      setError('请输入有效的代币合约地址');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 这里应该调用实际的合约检测API或web3方法
      // 目前使用模拟数据
      setTimeout(() => {
        // 模拟成功情况
        if (tokenAddress.length >= 42) {
          setTokenInfo({
            name: 'Sample Token',
            symbol: 'SMPL',
            decimals: 18,
          });
          setTokenName('Sample Token');
          setTokenSymbol('SMPL');
          setTokenDecimals('18');
        } else {
          setError('无法找到该代币信息，请检查地址是否正确');
        }
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err.message || '查询代币信息失败');
      setLoading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!tokenAddress || !tokenAddress.startsWith('0x')) {
      setError('请输入有效的代币合约地址');
      return;
    }
    
    if (!tokenSymbol) {
      setError('请输入代币符号');
      return;
    }
    
    if (!tokenDecimals) {
      setError('请输入代币小数位数');
      return;
    }
    
    // 提交数据
    onSubmit({
      address: tokenAddress,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: parseInt(tokenDecimals),
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="glass-effect w-full max-w-md rounded-2xl p-6 shadow-glass-lg">
        {/* 模态框头部 */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-dark-800">添加代币</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <CloseOutlined />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* 代币合约地址输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              代币合约地址
              <Tooltip title="请输入ERC-20代币的合约地址">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tokenAddress}
                onChange={handleAddressChange}
                className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="0x..."
              />
              <button
                type="button"
                onClick={handleSearchToken}
                disabled={loading}
                className={`px-3 py-2 rounded-lg ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
              >
                {loading ? <LoadingOutlined /> : '查询'}
              </button>
            </div>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
              <WarningOutlined className="mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {/* 代币信息展示 */}
          {tokenInfo && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-start">
              <CheckCircleOutlined className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">已找到代币信息</p>
                <p className="text-sm">{tokenInfo.name} ({tokenInfo.symbol})</p>
              </div>
            </div>
          )}
          
          {/* 代币信息表单 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                代币符号
              </label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="例如: ETH"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                代币小数位数
              </label>
              <input
                type="number"
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="例如: 18"
                min="0"
                max="36"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                代币名称 (可选)
              </label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="例如: Ethereum"
              />
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-dark-800 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!tokenAddress || !tokenSymbol || !tokenDecimals}
              className={`px-4 py-2 rounded-lg ${!tokenAddress || !tokenSymbol || !tokenDecimals 
                ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 添加工具提示组件
const Tooltip = ({ children, title }) => {
  const [show, setShow] = useState(false);
  
  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg shadow-sm">
          {title}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </span>
  );
};

AddTokenModal.propTypes = {
  visible: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func
};

export default AddTokenModal; 
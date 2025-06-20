import React from 'react';
import PropTypes from 'prop-types';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';

/**
 * 代币列表组件
 * 
 * @param {Array} tokens - 代币列表
 * @param {Function} onAddToken - 添加代币回调
 * @param {Function} onSelect - 选择代币回调
 * @returns {JSX.Element}
 */
const TokenList = ({ 
  tokens = [], 
  onAddToken,
  onSelect,
  selectedTokenAddress = null
}) => {
  // 获取代币图标，如果没有则返回默认图标
  const getTokenIcon = (symbol) => {
    // 为常见代币提供图标
    const commonTokens = {
      'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      'USDT': 'https://cryptologos.cc/logos/tether-usdt-logo.png',
      'USDC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      'DAI': 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png',
      'LINK': 'https://cryptologos.cc/logos/chainlink-link-logo.png',
      'UNI': 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
    };
    
    return commonTokens[symbol] || `https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&rounded=true`;
  };
  
  // 格式化余额，最多显示6位小数
  const formatBalance = (balance) => {
    if (!balance) return '0';
    
    // 如果余额很小，则显示 < 0.000001
    if (balance > 0 && balance < 0.000001) {
      return '< 0.000001';
    }
    
    // 否则格式化为最多6位小数
    return Number(balance).toLocaleString(undefined, {
      maximumFractionDigits: 6
    });
  };
  
  return (
    <div className="space-y-4">
      {/* 搜索和添加代币 */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchOutlined className="text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 sm:text-sm" 
            placeholder="搜索代币"
          />
        </div>
        <button
          onClick={onAddToken}
          className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
        >
          <PlusOutlined className="text-primary-600" />
        </button>
      </div>
      
      {/* 代币列表 */}
      <div className="space-y-1">
        {tokens.length > 0 ? (
          tokens.map((token) => (
            <button
              key={token.address}
              onClick={() => onSelect(token)}
              className={`w-full flex items-center p-3 rounded-xl transition-colors
                ${token.address === selectedTokenAddress 
                  ? 'bg-primary-50 border border-primary-200' 
                  : 'bg-white hover:bg-gray-50 border border-transparent'}`}
            >
              <img 
                src={getTokenIcon(token.symbol)} 
                alt={token.symbol} 
                className="w-10 h-10 rounded-full"
              />
              <div className="ml-3 flex-1 text-left">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-dark-800">{token.symbol}</span>
                  <span className="font-mono font-medium text-dark-800">{formatBalance(token.balance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>{token.name}</span>
                  {token.usdBalance && (
                    <span>${formatBalance(token.usdBalance)}</span>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>暂无代币</p>
            <p className="text-sm mt-2">点击右上角的 + 添加新代币</p>
          </div>
        )}
      </div>
    </div>
  );
};

TokenList.propTypes = {
  tokens: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string.isRequired,
      symbol: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      decimals: PropTypes.number.isRequired,
      balance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      usdBalance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
  onAddToken: PropTypes.func,
  onSelect: PropTypes.func,
  selectedTokenAddress: PropTypes.string
};

export default TokenList; 
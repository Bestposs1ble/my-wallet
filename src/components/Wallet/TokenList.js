import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { PlusOutlined, SearchOutlined, ReloadOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import { Tooltip, Spin, Empty, Switch, Popconfirm } from 'antd';

/**
 * 代币列表组件
 * 
 * @param {Array} tokens - 代币列表
 * @param {Function} onAddToken - 添加代币回调
 * @param {Function} onSelect - 选择代币回调
 * @param {Function} onRemoveToken - 移除代币回调
 * @param {Function} onDiscoverTokens - 自动发现代币回调
 * @param {string} selectedTokenAddress - 当前选中的代币地址
 * @param {boolean} loading - 是否正在加载
 * @returns {JSX.Element}
 */
const TokenList = ({ 
  tokens = [], 
  onAddToken,
  onSelect,
  onRemoveToken,
  onDiscoverTokens,
  selectedTokenAddress = null,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  
  // 获取代币图标，如果没有则返回默认图标
  const getTokenIcon = (symbol, tokenAddress) => {
    // 为常见代币提供图标
    const commonTokens = {
      'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      'USDT': 'https://cryptologos.cc/logos/tether-usdt-logo.png',
      'USDC': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      'DAI': 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png',
      'LINK': 'https://cryptologos.cc/logos/chainlink-link-logo.png',
      'UNI': 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
      'WETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      'WBTC': 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
      'AAVE': 'https://cryptologos.cc/logos/aave-aave-logo.png',
      'COMP': 'https://cryptologos.cc/logos/compound-comp-logo.png',
      'SNX': 'https://cryptologos.cc/logos/synthetix-network-token-snx-logo.png',
      'MKR': 'https://cryptologos.cc/logos/maker-mkr-logo.png',
      'YFI': 'https://cryptologos.cc/logos/yearn-finance-yfi-logo.png',
      'SUSHI': 'https://cryptologos.cc/logos/sushiswap-sushi-logo.png',
    };
    
    // 尝试从Trustwallet资产库获取图标
    if (tokenAddress && tokenAddress.startsWith('0x')) {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${tokenAddress}/logo.png`;
    }
    
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

  // 处理自动发现代币
  const handleDiscoverTokens = async () => {
    setDiscovering(true);
    try {
      await onDiscoverTokens();
    } finally {
      setDiscovering(false);
    }
  };

  // 过滤代币列表
  const filteredTokens = tokens.filter(token => {
    // 搜索条件
    const matchesSearch = 
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 余额条件
    const matchesBalance = showZeroBalance ? true : (parseFloat(token.balance || 0) > 0);
    
    return matchesSearch && matchesBalance;
  });

  // 排序代币列表：有余额的排前面，按余额从大到小排序
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    // 先按是否有余额排序
    const aHasBalance = parseFloat(a.balance || 0) > 0;
    const bHasBalance = parseFloat(b.balance || 0) > 0;
    
    if (aHasBalance !== bHasBalance) {
      return aHasBalance ? -1 : 1;
    }
    
    // 再按余额大小排序
    const aBalance = parseFloat(a.balance || 0);
    const bBalance = parseFloat(b.balance || 0);
    
    if (aBalance !== bBalance) {
      return bBalance - aBalance;
    }
    
    // 最后按字母排序
    return a.symbol.localeCompare(b.symbol);
  });
  
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tooltip title="添加代币">
          <button
            onClick={onAddToken}
            className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            <PlusOutlined className="text-primary-600" />
          </button>
        </Tooltip>
        <Tooltip title="自动发现代币">
          <button
            onClick={handleDiscoverTokens}
            disabled={discovering}
            className="flex items-center justify-center p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {discovering ? <LoadingOutlined className="text-primary-600" /> : <ReloadOutlined className="text-primary-600" />}
          </button>
        </Tooltip>
      </div>

      {/* 过滤选项 */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">显示零余额代币</span>
          <Switch 
            size="small" 
            checked={showZeroBalance} 
            onChange={setShowZeroBalance}
          />
        </div>
        <div className="text-gray-500">
          {filteredTokens.length} 个代币
        </div>
      </div>
      
      {/* 代币列表 */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
        ) : sortedTokens.length > 0 ? (
          sortedTokens.map((token) => (
            <div
              key={token.address}
              className={`w-full flex items-center p-3 rounded-xl transition-colors
                ${token.address === selectedTokenAddress 
                  ? 'bg-primary-50 border border-primary-200' 
                  : 'bg-white hover:bg-gray-50 border border-transparent'}`}
            >
              <div 
                className="cursor-pointer flex-grow flex items-center"
                onClick={() => onSelect(token)}
              >
                <img 
                  src={getTokenIcon(token.symbol, token.address)} 
                  alt={token.symbol} 
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random&color=fff&rounded=true`;
                  }}
                />
                <div className="ml-3 flex-1">
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
              </div>
              
              {/* 删除代币按钮 */}
              {token.symbol !== 'ETH' && (
                <Popconfirm
                  title="删除代币"
                  description="确定要从列表中删除此代币吗？"
                  onConfirm={() => onRemoveToken(token.address)}
                  okText="确定"
                  cancelText="取消"
                  placement="left"
                >
                  <button className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              )}
            </div>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchTerm ? "没有找到匹配的代币" : "暂无代币"
            }
          >
            {!searchTerm && (
              <button
                onClick={onAddToken}
                className="mt-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                添加代币
              </button>
            )}
          </Empty>
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
  onRemoveToken: PropTypes.func,
  onDiscoverTokens: PropTypes.func,
  selectedTokenAddress: PropTypes.string,
  loading: PropTypes.bool
};

export default TokenList; 
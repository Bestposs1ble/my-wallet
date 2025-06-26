import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  QuestionCircleOutlined, 
  CloseOutlined, 
  LoadingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import { useWallet } from '../../context/WalletContext';
import * as blockchainService from '../../services/blockchainService';
import { Tabs, Spin, Empty } from 'antd';

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
  // 自定义代币表单状态
  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);
  
  // 自动发现代币状态
  const [discovering, setDiscovering] = useState(false);
  const [discoveredTokens, setDiscoveredTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [activeTab, setActiveTab] = useState('custom');
  
  // 常见代币列表状态
  const [commonTokens, setCommonTokens] = useState([]);
  const [loadingCommon, setLoadingCommon] = useState(false);
  
  const { provider, getCurrentWallet } = useWallet();

  // 加载常见代币列表
  useEffect(() => {
    if (visible && activeTab === 'common') {
      loadCommonTokens();
    }
  }, [visible, activeTab]);

  // 加载常见代币列表
  const loadCommonTokens = async () => {
    setLoadingCommon(true);
    try {
      // 这里可以从API获取常见代币列表，或使用预定义列表
      const popularTokens = [
        {
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
          description: '与美元1:1挂钩的稳定币'
        },
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
          description: '由Circle发行的稳定币'
        },
        {
          address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
          logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png',
          description: '去中心化稳定币'
        },
        {
          address: '0x514910771af9ca656af840dff83e8264ecf986ca',
          symbol: 'LINK',
          name: 'ChainLink Token',
          decimals: 18,
          logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
          description: '去中心化预言机网络'
        },
        {
          address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          symbol: 'UNI',
          name: 'Uniswap',
          decimals: 18,
          logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
          description: '去中心化交易所治理代币'
        },
        {
          address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
          symbol: 'COMP',
          name: 'Compound',
          decimals: 18,
          logo: 'https://cryptologos.cc/logos/compound-comp-logo.png',
          description: '借贷平台治理代币'
        },
        {
          address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
          symbol: 'AAVE',
          name: 'Aave Token',
          decimals: 18,
          logo: 'https://cryptologos.cc/logos/aave-aave-logo.png',
          description: '去中心化借贷平台'
        },
        {
          address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
          symbol: 'WBTC',
          name: 'Wrapped BTC',
          decimals: 8,
          logo: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png',
          description: 'ERC20形式的比特币'
        }
      ];
      
      setCommonTokens(popularTokens);
    } catch (err) {
      console.error('加载常见代币失败:', err);
    } finally {
      setLoadingCommon(false);
    }
  };

  // 自动发现当前地址的代币
  const discoverTokens = async () => {
    setDiscovering(true);
    setError('');
    
    try {
      const wallet = getCurrentWallet();
      if (!wallet) {
        throw new Error('无法获取当前钱包');
      }
      
      // 从区块链浏览器API获取代币列表
      const tokens = await blockchainService.discoverTokens(wallet.address);
      
      if (tokens && tokens.length > 0) {
        setDiscoveredTokens(tokens);
      } else {
        setError('未找到任何代币');
      }
    } catch (err) {
      console.error('发现代币失败:', err);
      setError(err.message || '发现代币失败');
    } finally {
      setDiscovering(false);
    }
  };

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
      // 调用实际的合约检测API
      const tokenData = await blockchainService.getTokenInfo(tokenAddress);
      
      if (tokenData) {
        setTokenInfo(tokenData);
        setTokenName(tokenData.name);
        setTokenSymbol(tokenData.symbol);
        setTokenDecimals(tokenData.decimals.toString());
      } else {
        setError('无法找到该代币信息，请检查地址是否正确');
      }
    } catch (err) {
      console.error('获取代币信息失败:', err);
      setError(err.message || '查询代币信息失败，请确认这是一个有效的ERC20代币合约');
    } finally {
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
      name: tokenName || tokenSymbol,
      symbol: tokenSymbol,
      decimals: parseInt(tokenDecimals),
      image: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${tokenAddress}/logo.png`
    });
    
    // 重置表单
    resetForm();
  };
  
  // 处理选择发现的代币
  const handleSelectDiscoveredToken = (token) => {
    setSelectedToken(token);
  };
  
  // 添加选中的发现代币
  const handleAddDiscoveredToken = () => {
    if (!selectedToken) {
      setError('请选择一个代币');
      return;
    }
    
    onSubmit({
      address: selectedToken.address,
      name: selectedToken.name,
      symbol: selectedToken.symbol,
      decimals: selectedToken.decimals,
      image: selectedToken.logo || `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${selectedToken.address}/logo.png`
    });
    
    // 重置表单
    resetForm();
  };
  
  // 添加常见代币
  const handleAddCommonToken = (token) => {
    onSubmit({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      image: token.logo
    });
    
    // 重置表单
    resetForm();
  };
  
  // 重置表单
  const resetForm = () => {
    setTokenAddress('');
    setTokenSymbol('');
    setTokenDecimals('');
    setTokenName('');
    setTokenInfo(null);
    setError('');
    setSelectedToken(null);
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
        
        {/* 选项卡 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'custom',
              label: '自定义代币',
              children: (
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
                        <p className="text-sm">小数位数: {tokenInfo.decimals}</p>
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
              )
            },
            {
              key: 'discover',
              label: '自动发现',
              children: (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      自动发现您的钱包中可能持有的代币
                    </p>
                    <button
                      onClick={discoverTokens}
                      disabled={discovering}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${discovering 
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                        : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                    >
                      {discovering ? <LoadingOutlined className="mr-2" /> : <SearchOutlined className="mr-2" />}
                      <span>扫描</span>
                    </button>
                  </div>
                  
                  {/* 错误提示 */}
                  {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
                      <WarningOutlined className="mr-2 mt-0.5 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}
                  
                  {/* 发现的代币列表 */}
                  <div className="max-h-64 overflow-y-auto">
                    {discovering ? (
                      <div className="flex justify-center items-center py-12">
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                      </div>
                    ) : discoveredTokens.length > 0 ? (
                      <div className="space-y-2">
                        {discoveredTokens.map(token => (
                          <div
                            key={token.address}
                            onClick={() => handleSelectDiscoveredToken(token)}
                            className={`p-3 border rounded-lg cursor-pointer flex items-center ${
                              selectedToken && selectedToken.address === token.address
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                              <img 
                                src={token.logo || `https://ui-avatars.com/api/?name=${token.symbol}&background=random&color=fff&rounded=true`}
                                alt={token.symbol}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random&color=fff&rounded=true`;
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">{token.symbol}</span>
                                <span className="text-sm">{token.balance}</span>
                              </div>
                              <div className="text-sm text-gray-500">{token.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileSearchOutlined className="text-4xl mb-2" />
                        <p>点击"扫描"按钮发现您的代币</p>
                      </div>
                    )}
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
                      onClick={handleAddDiscoveredToken}
                      disabled={!selectedToken}
                      className={`px-4 py-2 rounded-lg ${!selectedToken
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                        : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                    >
                      添加选中代币
                    </button>
                  </div>
                </div>
              )
            },
            {
              key: 'common',
              label: '常见代币',
              children: (
                <div className="space-y-4">
                  {loadingCommon ? (
                    <div className="flex justify-center items-center py-12">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    </div>
                  ) : commonTokens.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {commonTokens.map(token => (
                        <div
                          key={token.address}
                          className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer"
                          onClick={() => handleAddCommonToken(token)}
                        >
                          <div className="flex items-center mb-2">
                            <img 
                              src={token.logo || `https://ui-avatars.com/api/?name=${token.symbol}&background=random&color=fff&rounded=true`}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full mr-2"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random&color=fff&rounded=true`;
                              }}
                            />
                            <div>
                              <div className="font-medium">{token.symbol}</div>
                              <div className="text-xs text-gray-500">{token.name}</div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{token.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty description="无法加载常见代币列表" />
                  )}
                  
                  {/* 操作按钮 */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-dark-800 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )
            }
          ]}
        />
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
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default AddTokenModal; 
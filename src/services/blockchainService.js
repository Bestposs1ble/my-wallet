import { ethers } from 'ethers';
import { getNetworks, getCurrentNetwork } from './storageService';
import * as ethersHelper from '../utils/ethersHelper';

// 全局提供者实例
let provider = null;

/**
 * 初始化区块链服务
 * @returns {ethers.providers.Provider} 初始化的提供者
 */
const initBlockchainService = () => {
  try {
    const networks = getNetworks();
    const currentNetwork = getCurrentNetwork();
    const network = networks[currentNetwork];
    
    if (!network || !network.url) {
      throw new Error(`未找到网络配置: ${currentNetwork}`);
    }
    
    provider = ethersHelper.createProvider(network.url, network.chainId);
    return provider;
  } catch (error) {
    console.error('初始化区块链服务失败:', error);
    throw error;
  }
};

/**
 * 获取当前提供者，如果不存在则初始化
 * @returns {ethers.providers.Provider} 以太坊提供者
 */
const getProvider = () => {
  if (!provider) {
    provider = initBlockchainService();
  }
  return provider;
};

/**
 * 更新提供者为新的网络配置
 * @param {string} networkId 网络ID
 * @returns {ethers.providers.Provider} 更新后的提供者
 */
const updateProvider = (networkId) => {
  const networks = getNetworks();
  const network = networks[networkId];
  
  if (!network || !network.url) {
    throw new Error(`未找到网络配置: ${networkId}`);
  }
  
  console.log(`更新网络提供者: ${networkId}, URL=${network.url}, chainId=${network.chainId}`);
  
  try {
    provider = ethersHelper.createProvider(network.url, network.chainId);
    
    // 测试网络连接
    provider.getNetwork()
      .then(network => console.log(`成功连接到网络: ${network.name} (${network.chainId})`))
      .catch(err => console.error('网络连接测试失败:', err));
      
    return provider;
  } catch (error) {
    console.error(`创建提供者失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取ETH余额
 * @param {string} address 钱包地址
 * @returns {Promise<string>} ETH余额(以太为单位)
 */
const getEthBalance = async (address) => {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const currentProvider = getProvider();
      console.log(`使用提供者URL: ${currentProvider.connection?.url || '未知'}`);
      
      // 检查网络连接
      try {
        const network = await currentProvider.getNetwork();
        console.log(`当前连接的网络: chainId=${network.chainId}, name=${network.name}`);
      } catch (networkError) {
        console.warn(`获取网络信息失败: ${networkError.message}`);
      }
      
      // 获取余额
      const balance = await ethersHelper.getBalance(currentProvider, address);
      console.log(`成功获取余额: ${balance} ETH`);
      return balance;
    } catch (error) {
      attempts++;
      console.error(`获取ETH余额失败(尝试 ${attempts}/${maxAttempts}):`, error);
      
      if (attempts >= maxAttempts) {
        throw error;
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('获取余额失败: 达到最大重试次数');
};

/**
 * 获取当前区块号
 * @returns {Promise<number>} 当前区块号
 */
const getCurrentBlockNumber = async () => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getBlockNumber();
  } catch (error) {
    console.error('获取当前区块号失败:', error);
    throw error;
  }
};

/**
 * 获取当前Gas价格
 * @returns {Promise<ethers.BigNumber>} Gas价格(wei)
 */
const getGasPrice = async () => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getGasPrice();
  } catch (error) {
    console.error('获取Gas价格失败:', error);
    throw error;
  }
};

/**
 * 获取交易收据
 * @param {string} txHash 交易哈希
 * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
 */
const getTransactionReceipt = async (txHash) => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getTransactionReceipt(txHash);
  } catch (error) {
    console.error('获取交易收据失败:', error);
    throw error;
  }
};

/**
 * 获取交易详情
 * @param {string} txHash 交易哈希
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易详情
 */
const getTransaction = async (txHash) => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getTransaction(txHash);
  } catch (error) {
    console.error('获取交易详情失败:', error);
    throw error;
  }
};

/**
 * 发送已签名的交易
 * @param {string} signedTx 已签名的交易
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
const sendSignedTransaction = async (signedTx) => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.sendTransaction(signedTx);
  } catch (error) {
    console.error('发送已签名交易失败:', error);
    throw error;
  }
};

/**
 * 创建并发送交易
 * @param {ethers.Wallet} wallet 钱包对象(已连接provider)
 * @param {string} toAddress 接收地址
 * @param {string|number} amount 发送数量(以太)
 * @param {object} options 交易选项
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
const sendTransaction = async (wallet, toAddress, amount, options = {}) => {
  try {
    if (!wallet.provider) {
      const currentProvider = getProvider();
      wallet = wallet.connect(currentProvider);
    }
    
    return await ethersHelper.sendTransaction(wallet, toAddress, amount, options);
  } catch (error) {
    console.error('发送交易失败:', error);
    throw error;
  }
};

/**
 * 检查地址是否为有效的以太坊地址
 * @param {string} address 要检查的地址
 * @returns {boolean} 是否有效
 */
const isValidAddress = (address) => {
  return ethers.utils.isAddress(address);
};

/**
 * 计算交易的预估Gas费
 * @param {object} txObject 交易对象
 * @returns {Promise<{gasFee: string, gasLimit: ethers.BigNumber, gasPrice: ethers.BigNumber}>} Gas信息
 */
const estimateTransactionGas = async (txObject) => {
  try {
    console.log('======= 估算交易Gas =======');
    console.log('交易对象:', txObject);
    
    const currentProvider = getProvider();
    console.log('使用Provider:', currentProvider.connection?.url);
    
    // 获取当前网络
    let network;
    try {
      network = await currentProvider.getNetwork();
      console.log('当前网络:', network);
    } catch (networkError) {
      console.error('获取网络信息失败:', networkError);
    }
    
    // 获取gasPrice
    let gasPrice = await currentProvider.getGasPrice();
    console.log('当前gasPrice:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'Gwei =', gasPrice.toString(), 'wei');
    
    // 如果是本地网络(Ganache)，使用更合理的gasPrice
    if (network && network.chainId === 1337) {
      const suggestedGasPrice = ethers.utils.parseUnits('20', 'gwei'); // 20 Gwei
      if (gasPrice.gt(suggestedGasPrice)) {
        console.log('本地网络检测到高gasPrice，调整为更合理的值');
        gasPrice = suggestedGasPrice;
        console.log('调整后的gasPrice:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'Gwei');
      }
    }
    
    // 估算基本的gasLimit
    console.log('估算gasLimit...');
    let baseGasLimit;
    try {
      baseGasLimit = await currentProvider.estimateGas(txObject);
      console.log('估算的原始gasLimit:', baseGasLimit.toString());
    } catch (estimateError) {
      console.error('估算gasLimit失败:', estimateError);
      // 使用默认值
      baseGasLimit = ethers.BigNumber.from('21000');
      console.log('使用默认gasLimit:', baseGasLimit.toString());
    }
    
    // 增加20%的安全系数，以防止gas不足
    const safetyFactor = 1.2;
    const gasLimit = baseGasLimit.mul(Math.floor(safetyFactor * 100)).div(100);
    console.log('增加安全系数后的gasLimit:', gasLimit.toString());
    
    // 计算总gas费用 (wei)
    const gasFeeWei = gasPrice.mul(gasLimit);
    // 转换为ETH
    const gasFee = ethers.utils.formatEther(gasFeeWei);
    console.log('估算的gas费用:', gasFee, 'ETH =', gasFeeWei.toString(), 'wei');
    
    // 检查交易总成本
    if (txObject.value) {
      const totalCost = ethers.BigNumber.from(txObject.value).add(gasFeeWei);
      console.log('交易总成本:', ethers.utils.formatEther(totalCost), 'ETH =', totalCost.toString(), 'wei');
      
      if (txObject.from) {
        try {
          const balance = await currentProvider.getBalance(txObject.from);
          console.log('发送方余额:', ethers.utils.formatEther(balance), 'ETH =', balance.toString(), 'wei');
          console.log('余额是否足够:', balance.gte(totalCost) ? '是' : '否');
        } catch (balanceError) {
          console.error('获取余额失败:', balanceError);
        }
      }
    }
    
    console.log('======= 估算完成 =======');
    return {
      gasFee,
      gasLimit,
      gasPrice
    };
  } catch (error) {
    console.error('计算交易Gas费失败:', error);
    throw error;
  }
};

/**
 * 获取代币信息
 * @param {string} tokenAddress 代币合约地址
 * @returns {Promise<{name: string, symbol: string, decimals: number}>} 代币信息
 */
const getTokenInfo = async (tokenAddress) => {
  try {
    const currentProvider = getProvider();
    return await ethersHelper.getTokenInfo(tokenAddress, currentProvider);
  } catch (error) {
    console.error('获取代币信息失败:', error);
    throw error;
  }
};

/**
 * 获取代币余额
 * @param {string} tokenAddress 代币合约地址
 * @param {string} walletAddress 钱包地址
 * @returns {Promise<{balance: string, formatted: string}>} 代币余额
 */
const getTokenBalance = async (tokenAddress, walletAddress) => {
  try {
    const currentProvider = getProvider();
    return await ethersHelper.getTokenBalance(tokenAddress, walletAddress, currentProvider);
  } catch (error) {
    console.error('获取代币余额失败:', error);
    throw error;
  }
};

/**
 * 批量获取多个代币余额
 * @param {Array<{address: string}>} tokens 代币列表
 * @param {string} walletAddress 钱包地址
 * @returns {Promise<Object>} 代币余额映射
 */
const getMultipleTokenBalances = async (tokens, walletAddress) => {
  try {
    const currentProvider = getProvider();
    return await ethersHelper.getMultipleTokenBalances(tokens, walletAddress, currentProvider);
  } catch (error) {
    console.error('批量获取代币余额失败:', error);
    throw error;
  }
};

/**
 * 发送代币交易
 * @param {ethers.Wallet} wallet 钱包对象
 * @param {string} tokenAddress 代币合约地址
 * @param {string} toAddress 接收地址
 * @param {string|number} amount 发送数量
 * @param {object} options 交易选项
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
const sendTokenTransaction = async (wallet, tokenAddress, toAddress, amount, options = {}) => {
  try {
    if (!wallet.provider) {
      const currentProvider = getProvider();
      wallet = wallet.connect(currentProvider);
    }
    
    return await ethersHelper.sendTokenTransaction(wallet, tokenAddress, toAddress, amount, options);
  } catch (error) {
    console.error('发送代币交易失败:', error);
    throw error;
  }
};

/**
 * 估算代币交易的Gas费用
 * @param {string} tokenAddress 代币合约地址
 * @param {string} fromAddress 发送地址
 * @param {string} toAddress 接收地址
 * @param {string|number} amount 发送数量
 * @returns {Promise<{gasFee: string, gasLimit: ethers.BigNumber, gasPrice: ethers.BigNumber}>} Gas信息
 */
const estimateTokenTransactionGas = async (tokenAddress, fromAddress, toAddress, amount) => {
  try {
    const currentProvider = getProvider();
    const contract = ethersHelper.createTokenContract(tokenAddress, currentProvider);
    
    // 获取代币精度
    const decimals = await contract.decimals();
    
    // 转换为代币最小单位
    const amountInSmallestUnit = ethers.utils.parseUnits(amount.toString(), decimals);
    
    // 估算Gas
    const gasPrice = await currentProvider.getGasPrice();
    const baseGasLimit = await contract.estimateGas.transfer(toAddress, amountInSmallestUnit, { from: fromAddress });
    
    // 增加30%的安全系数，因为代币交易更复杂
    const safetyFactor = 1.3;
    const gasLimit = baseGasLimit.mul(Math.floor(safetyFactor * 100)).div(100);
    
    // 计算总Gas费用(wei)
    const gasFeeWei = gasPrice.mul(gasLimit);
    // 转换为ETH
    const gasFee = ethers.utils.formatEther(gasFeeWei);
    
    return {
      gasFee,
      gasLimit,
      gasPrice
    };
  } catch (error) {
    console.error('估算代币交易Gas费失败:', error);
    throw error;
  }
};

/**
 * 创建新的 Provider 实例
 * @param {string} url RPC URL
 * @param {number} chainId 链ID
 * @returns {ethers.providers.Provider} Provider 实例
 */
const createProvider = (url, chainId) => {
  return ethersHelper.createProvider(url, chainId);
};

/**
 * 获取ETH价格
 * @returns {Promise<{usd: number, usd_24h_change: number}>} ETH价格信息
 */
const getEthPrice = async () => {
  try {
    // 使用CoinGecko API获取ETH价格
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
    const data = await response.json();
    
    if (data && data.ethereum) {
      return {
        usd: data.ethereum.usd,
        usd_24h_change: data.ethereum.usd_24h_change
      };
    }
    
    throw new Error('无法获取ETH价格数据');
  } catch (error) {
    console.error('获取ETH价格失败:', error);
    // 返回默认价格，避免UI崩溃
    return {
      usd: 3000,
      usd_24h_change: 0
    };
  }
};

/**
 * 获取代币价格
 * @param {string} tokenAddress 代币合约地址
 * @returns {Promise<{usd: number, usd_24h_change: number}>} 代币价格信息
 */
const getTokenPrice = async (tokenAddress) => {
  try {
    // 使用CoinGecko API获取代币价格
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd&include_24hr_change=true`);
    const data = await response.json();
    
    if (data && data[tokenAddress.toLowerCase()]) {
      return {
        usd: data[tokenAddress.toLowerCase()].usd,
        usd_24h_change: data[tokenAddress.toLowerCase()].usd_24h_change
      };
    }
    
    throw new Error(`无法获取代币 ${tokenAddress} 的价格数据`);
  } catch (error) {
    console.error(`获取代币 ${tokenAddress} 价格失败:`, error);
    // 返回默认价格，避免UI崩溃
    return {
      usd: 0,
      usd_24h_change: 0
    };
  }
};

/**
 * 批量获取代币价格
 * @param {string[]} tokenAddresses 代币合约地址数组
 * @returns {Promise<Object>} 代币价格信息映射表
 */
const getTokenPrices = async (tokenAddresses) => {
  if (!tokenAddresses || tokenAddresses.length === 0) {
    return {};
  }
  
  try {
    // 将地址转换为小写并去重
    const uniqueAddresses = [...new Set(tokenAddresses.map(addr => addr.toLowerCase()))];
    
    // 使用CoinGecko API批量获取代币价格
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${uniqueAddresses.join(',')}&vs_currencies=usd&include_24hr_change=true`);
    const data = await response.json();
    
    // 如果API返回错误，则尝试单个获取
    if (!data || Object.keys(data).length === 0) {
      console.warn('批量获取代币价格失败，尝试单个获取');
      
      const prices = {};
      for (const address of uniqueAddresses) {
        try {
          const price = await getTokenPrice(address);
          if (price) {
            prices[address] = price;
          }
        } catch (err) {
          console.error(`获取代币 ${address} 价格失败:`, err);
        }
      }
      
      return prices;
    }
    
    return data;
  } catch (error) {
    console.error('批量获取代币价格失败:', error);
    return {};
  }
};

/**
 * 增强版代币价格获取，支持多种数据源和更多价格信息
 * @param {Array<Object>} tokens 代币列表，每个代币包含address、symbol等信息
 * @returns {Promise<Object>} 代币价格信息映射表
 */
const fetchTokenPrices = async (tokens) => {
  if (!tokens || tokens.length === 0) {
    return {};
  }
  
  try {
    // 准备代币地址列表和符号列表
    const tokenAddresses = tokens.map(token => token.address.toLowerCase());
    const tokenSymbols = tokens.map(token => token.symbol.toLowerCase());
    
    // 创建结果对象
    const priceResults = {};
    
    // 尝试从CoinGecko获取价格
    try {
      // 使用CoinGecko API批量获取代币价格
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddresses.join(',')}&vs_currencies=usd,eth&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);
      const data = await response.json();
      
      // 处理结果
      for (const [address, priceData] of Object.entries(data)) {
        priceResults[address] = {
          usd: priceData.usd || 0,
          eth: priceData.eth || 0,
          usd_24h_change: priceData.usd_24h_change || 0,
          usd_24h_vol: priceData.usd_24h_vol || 0,
          market_cap: priceData.usd_market_cap || 0,
          source: 'coingecko'
        };
      }
    } catch (coinGeckoError) {
      console.warn('CoinGecko API调用失败:', coinGeckoError.message);
    }
    
    // 如果有些代币没有获取到价格，尝试其他数据源
    const missingTokens = tokens.filter(token => 
      !priceResults[token.address.toLowerCase()]
    );
    
    if (missingTokens.length > 0) {
      // 尝试从1inch API获取价格
      try {
        for (const token of missingTokens) {
          try {
            // 1inch报价API
            const response = await fetch(`https://api.1inch.io/v5.0/1/quote?fromTokenAddress=${token.address}&toTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&amount=1000000000000000000`);
            const data = await response.json();
            
            if (data && data.toTokenAmount) {
              const ethPrice = await getEthPrice();
              const tokenInEth = ethers.utils.formatEther(data.toTokenAmount);
              const tokenInUsd = parseFloat(tokenInEth) * ethPrice.usd;
              
              priceResults[token.address.toLowerCase()] = {
                usd: tokenInUsd,
                eth: parseFloat(tokenInEth),
                usd_24h_change: 0, // 1inch不提供此数据
                source: '1inch'
              };
            }
          } catch (tokenError) {
            console.warn(`无法从1inch获取代币 ${token.symbol} 价格:`, tokenError.message);
          }
        }
      } catch (inchError) {
        console.warn('1inch API调用失败:', inchError.message);
      }
    }
    
    // 返回结果
    return priceResults;
  } catch (error) {
    console.error('获取代币价格失败:', error);
    return {};
  }
};

/**
 * 使用价格数据更新代币列表
 * @param {Array<Object>} tokens 代币列表
 * @returns {Promise<Array<Object>>} 更新后的代币列表
 */
const updateTokensWithPrices = async (tokens) => {
  if (!tokens || tokens.length === 0) {
    return [];
  }
  
  try {
    // 获取代币价格
    const priceData = await fetchTokenPrices(tokens);
    
    // 更新代币列表
    return tokens.map(token => {
      const tokenAddress = token.address.toLowerCase();
      const price = priceData[tokenAddress];
      
      if (price) {
        // 计算USD价值
        const balance = parseFloat(token.balance || '0');
        const usdBalance = balance * price.usd;
        
        return {
          ...token,
          usdPrice: price.usd,
          ethPrice: price.eth,
          usdBalance: usdBalance.toFixed(2),
          priceChange24h: price.usd_24h_change,
          priceSource: price.source
        };
      }
      
      return token;
    });
  } catch (error) {
    console.error('更新代币价格失败:', error);
    return tokens; // 返回原始代币列表
  }
};

/**
 * 自动发现钱包持有的代币
 * @param {string} walletAddress 钱包地址
 * @returns {Promise<Array>} 发现的代币列表
 */
const discoverTokens = async (walletAddress) => {
  try {
    // 这里可以使用Etherscan API或其他服务来获取钱包持有的代币
    // 以下是一个示例实现，实际应用中应该使用真实的API
    
    // 获取当前网络
    const currentProvider = getProvider();
    const network = await currentProvider.getNetwork();
    
    // 根据网络选择API
    let apiUrl;
    let apiKey = 'YourEtherscanApiKey'; // 实际应用中应该从配置中获取
    
    if (network.chainId === 1) {
      // 主网
      apiUrl = `https://api.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${apiKey}`;
    } else if (network.chainId === 11155111) {
      // Sepolia测试网
      apiUrl = `https://api-sepolia.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&sort=desc&apikey=${apiKey}`;
    } else {
      // 模拟数据，用于本地测试
      console.log('使用模拟数据进行代币发现');
      
      return [
        {
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          balance: '100.0',
          logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
        },
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          balance: '200.0',
          logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
        },
        {
          address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
          balance: '50.0',
          logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
        }
      ];
    }
    
    // 发起API请求
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      // 处理交易数据，提取唯一的代币
      const uniqueTokens = {};
      
      for (const tx of data.result) {
        const tokenAddress = tx.contractAddress.toLowerCase();
        
        if (!uniqueTokens[tokenAddress]) {
          // 获取代币信息
          try {
            const tokenInfo = await getTokenInfo(tokenAddress);
            const tokenBalance = await getTokenBalance(tokenAddress, walletAddress);
            
            if (tokenInfo && parseFloat(tokenBalance) > 0) {
              uniqueTokens[tokenAddress] = {
                address: tokenAddress,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: tokenInfo.decimals,
                balance: tokenBalance
              };
            }
          } catch (err) {
            console.warn(`获取代币 ${tokenAddress} 信息失败:`, err);
          }
        }
      }
      
      return Object.values(uniqueTokens);
    }
    
    return [];
  } catch (error) {
    console.error('发现代币失败:', error);
    return [];
  }
};

export {
  initBlockchainService,
  getProvider,
  updateProvider,
  createProvider,
  getEthBalance,
  getCurrentBlockNumber,
  getGasPrice,
  getTransactionReceipt,
  getTransaction,
  sendSignedTransaction,
  sendTransaction,
  isValidAddress,
  estimateTransactionGas,
  getTokenInfo,
  getTokenBalance,
  getMultipleTokenBalances,
  sendTokenTransaction,
  estimateTokenTransactionGas,
  getEthPrice,
  getTokenPrice,
  getTokenPrices,
  fetchTokenPrices,
  updateTokensWithPrices,
  discoverTokens
}; 
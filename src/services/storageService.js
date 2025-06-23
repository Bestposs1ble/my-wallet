import { encryptData, decryptData } from '../utils/ethersHelper';
import { set, get } from 'idb-keyval';

// 本地存储键名
const KEYS = {
  WALLETS: 'metamask-clone-wallets',
  CURRENT_WALLET: 'metamask-clone-current-wallet',
  MASTER_MNEMONIC: 'metamask-clone-master-mnemonic',
  NETWORKS: 'metamask-clone-networks',
  CURRENT_NETWORK: 'metamask-clone-current-network',
  SETTINGS: 'metamask-clone-settings',
  TOKENS: 'metamask-clone-tokens',
  TX_HISTORY: 'metamask-clone-tx-history'
};

/**
 * 检查是否有存储的钱包
 * @returns {boolean} 是否有存储的钱包
 */
const hasWallets = () => {
  return localStorage.getItem(KEYS.WALLETS) !== null;
};

/**
 * 保存钱包列表
 * @param {Array} wallets 钱包列表
 * @param {string} password 加密密码
 */
const saveWallets = (wallets, password) => {
  if (!password) {
    throw new Error('需要密码才能保存钱包');
  }
  const encryptedData = encryptData(wallets, password);
  localStorage.setItem(KEYS.WALLETS, encryptedData);
};

/**
 * 获取钱包列表
 * @param {string} password 解密密码
 * @returns {Array} 钱包列表
 */
const getWallets = (password) => {
  const encryptedData = localStorage.getItem(KEYS.WALLETS);
  if (!encryptedData) {
    return [];
  }
  
  try {
    return decryptData(encryptedData, password);
  } catch (error) {
    console.error('获取钱包失败:', error);
    throw new Error('无法解密钱包数据');
  }
};

/**
 * 使用IndexedDB加密存储钱包
 * @param {Array} wallets 钱包列表
 * @param {string} password 加密密码
 */
const saveWalletsToDB = async (wallets, password) => {
  if (!password) {
    throw new Error('需要密码才能保存钱包');
  }
  const encryptedData = encryptData(wallets, password);
  await set(KEYS.WALLETS, encryptedData);
};

/**
 * 从IndexedDB读取并解密钱包
 * @param {string} password 解密密码
 * @returns {Array} 钱包列表
 */
const getWalletsFromDB = async (password) => {
  const encryptedData = await get(KEYS.WALLETS);
  if (!encryptedData) {
    return [];
  }
  try {
    return decryptData(encryptedData, password);
  } catch (error) {
    console.error('获取钱包失败:', error);
    throw new Error('无法解密钱包数据');
  }
};

/**
 * 使用IndexedDB加密存储主助记词
 * @param {string} mnemonic 助记词
 * @param {string} password 加密密码
 */
const saveMasterMnemonicToDB = async (mnemonic, password) => {
  if (!mnemonic || !password) {
    throw new Error('需要助记词和密码才能保存');
  }
  const encryptedData = encryptData(mnemonic, password);
  await set(KEYS.MASTER_MNEMONIC, encryptedData);
};

/**
 * 从IndexedDB读取并解密主助记词
 * @param {string} password 解密密码
 * @returns {string|null} 解密后的助记词
 */
const getMasterMnemonicFromDB = async (password) => {
  const encryptedData = await get(KEYS.MASTER_MNEMONIC);
  if (!encryptedData) {
    return null;
  }
  try {
    return decryptData(encryptedData, password);
  } catch (error) {
    console.error('获取助记词失败:', error);
    throw new Error('无法解密助记词');
  }
};

/**
 * 保存当前钱包索引
 * @param {number} index 当前钱包索引
 */
const saveCurrentWalletIndex = (index) => {
  localStorage.setItem(KEYS.CURRENT_WALLET, index.toString());
};

/**
 * 获取当前钱包索引
 * @returns {number} 当前钱包索引
 */
const getCurrentWalletIndex = () => {
  const index = localStorage.getItem(KEYS.CURRENT_WALLET);
  return index ? parseInt(index, 10) : 0;
};

/**
 * 保存网络配置
 * @param {Object} networks 网络配置对象
 */
const saveNetworks = (networks) => {
  localStorage.setItem(KEYS.NETWORKS, JSON.stringify(networks));
};

/**
 * 获取网络配置
 * @returns {Object} 网络配置对象
 */
const getNetworks = () => {
  const networks = localStorage.getItem(KEYS.NETWORKS);
  return networks ? JSON.parse(networks) : getDefaultNetworks();
};

/**
 * 保存当前网络
 * @param {string} networkId 网络ID
 */
const saveCurrentNetwork = (networkId) => {
  localStorage.setItem(KEYS.CURRENT_NETWORK, networkId);
};

/**
 * 获取当前网络
 * @returns {string} 当前网络ID
 */
const getCurrentNetwork = () => {
  return localStorage.getItem(KEYS.CURRENT_NETWORK) || 'mainnet';
};

/**
 * 保存设置
 * @param {Object} settings 设置对象
 */
const saveSettings = (settings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

/**
 * 获取设置
 * @returns {Object} 设置对象
 */
const getSettings = () => {
  const settings = localStorage.getItem(KEYS.SETTINGS);
  return settings ? JSON.parse(settings) : getDefaultSettings();
};

/**
 * 保存代币列表
 * @param {Array} tokens 代币列表
 * @param {string} networkId 网络ID
 */
const saveTokens = (tokens, networkId) => {
  const key = `${KEYS.TOKENS}-${networkId}`;
  localStorage.setItem(key, JSON.stringify(tokens));
};

/**
 * 获取代币列表
 * @param {string} networkId 网络ID
 * @returns {Array} 代币列表
 */
const getTokens = (networkId) => {
  const key = `${KEYS.TOKENS}-${networkId}`;
  const tokens = localStorage.getItem(key);
  return tokens ? JSON.parse(tokens) : [];
};

/**
 * 添加代币到列表
 * @param {Object} token 代币对象
 * @param {string} networkId 网络ID
 * @returns {Array} 更新后的代币列表
 */
const addToken = (token, networkId) => {
  const tokens = getTokens(networkId);
  // 检查代币是否已存在
  const existingToken = tokens.find(t => t.address.toLowerCase() === token.address.toLowerCase());
  if (existingToken) {
    // 更新现有代币信息
    const updatedTokens = tokens.map(t => {
      if (t.address.toLowerCase() === token.address.toLowerCase()) {
        return { ...t, ...token };
      }
      return t;
    });
    saveTokens(updatedTokens, networkId);
    return updatedTokens;
  } else {
    // 添加新代币
    const newTokens = [...tokens, token];
    saveTokens(newTokens, networkId);
    return newTokens;
  }
};

/**
 * 移除代币
 * @param {string} tokenAddress 代币地址
 * @param {string} networkId 网络ID
 * @returns {Array} 更新后的代币列表
 */
const removeToken = (tokenAddress, networkId) => {
  const tokens = getTokens(networkId);
  const updatedTokens = tokens.filter(token => token.address.toLowerCase() !== tokenAddress.toLowerCase());
  saveTokens(updatedTokens, networkId);
  return updatedTokens;
};

/**
 * 更新代币余额
 * @param {string} tokenAddress 代币地址
 * @param {string} balance 代币余额
 * @param {string} networkId 网络ID
 * @returns {Array} 更新后的代币列表
 */
const updateTokenBalance = (tokenAddress, balance, networkId) => {
  const tokens = getTokens(networkId);
  const updatedTokens = tokens.map(token => {
    if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
      return { ...token, balance };
    }
    return token;
  });
  saveTokens(updatedTokens, networkId);
  return updatedTokens;
};

/**
 * 保存代币交易历史
 * @param {Array} transactions 交易历史
 * @param {string} address 钱包地址
 * @param {string} tokenAddress 代币地址
 * @param {string} networkId 网络ID
 */
const saveTokenTransactionHistory = (transactions, address, tokenAddress, networkId) => {
  const key = `${KEYS.TX_HISTORY}-token-${tokenAddress.toLowerCase()}-${address.toLowerCase()}-${networkId}`;
  localStorage.setItem(key, JSON.stringify(transactions));
};

/**
 * 获取代币交易历史
 * @param {string} address 钱包地址
 * @param {string} tokenAddress 代币地址
 * @param {string} networkId 网络ID
 * @returns {Array} 交易历史
 */
const getTokenTransactionHistory = (address, tokenAddress, networkId) => {
  const key = `${KEYS.TX_HISTORY}-token-${tokenAddress.toLowerCase()}-${address.toLowerCase()}-${networkId}`;
  const history = localStorage.getItem(key);
  return history ? JSON.parse(history) : [];
};

/**
 * 添加代币交易到历史记录
 * @param {Object} transaction 交易对象
 * @param {string} address 钱包地址
 * @param {string} tokenAddress 代币地址
 * @param {string} networkId 网络ID
 * @returns {Array} 更新后的交易历史
 */
const addTokenTransactionToHistory = (transaction, address, tokenAddress, networkId) => {
  const history = getTokenTransactionHistory(address, tokenAddress, networkId);
  const newHistory = [transaction, ...history];
  saveTokenTransactionHistory(newHistory, address, tokenAddress, networkId);
  return newHistory;
};

/**
 * 保存交易历史
 * @param {Array} transactions 交易历史
 * @param {string} address 钱包地址
 * @param {string} networkId 网络ID
 */
const saveTransactionHistory = (transactions, address, networkId) => {
  const key = `${KEYS.TX_HISTORY}-${address.toLowerCase()}-${networkId}`;
  localStorage.setItem(key, JSON.stringify(transactions));
};

/**
 * 获取交易历史
 * @param {string} address 钱包地址
 * @param {string} networkId 网络ID
 * @returns {Array} 交易历史
 */
const getTransactionHistory = (address, networkId) => {
  const key = `${KEYS.TX_HISTORY}-${address.toLowerCase()}-${networkId}`;
  const history = localStorage.getItem(key);
  return history ? JSON.parse(history) : [];
};

/**
 * 添加交易到历史记录
 * @param {Object} transaction 交易对象
 * @param {string} address 钱包地址
 * @param {string} networkId 网络ID
 */
const addTransactionToHistory = (transaction, address, networkId) => {
  const history = getTransactionHistory(address, networkId);
  const newHistory = [transaction, ...history];
  saveTransactionHistory(newHistory, address, networkId);
  return newHistory;
};

/**
 * 更新交易状态
 * @param {string} txHash 交易哈希
 * @param {string} status 交易状态
 * @param {string} address 钱包地址
 * @param {string} networkId 网络ID
 * @returns {boolean} 是否更新成功
 */
const updateTransactionStatus = (txHash, status, address, networkId) => {
  const history = getTransactionHistory(address, networkId);
  const txIndex = history.findIndex(tx => tx.hash === txHash);
  
  if (txIndex === -1) {
    return false;
  }
  
  history[txIndex].status = status;
  saveTransactionHistory(history, address, networkId);
  return true;
};

// 默认网络配置
const getDefaultNetworks = () => {
  return {
    mainnet: {
      name: '以太坊主网',
      url: 'https://mainnet.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 1,
      symbol: 'ETH',
      blockExplorer: 'https://etherscan.io',
      explorerUrl: 'https://etherscan.io'
    },
    sepolia: {
      name: 'Sepolia测试网',
      url: 'https://sepolia.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 11155111,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.etherscan.io',
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    goerli: {
      name: 'Goerli测试网 (已弃用)',
      // 将Goerli的URL也指向Sepolia，因为Infura已下线Goerli
      url: 'https://sepolia.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 5,
      symbol: 'ETH',
      blockExplorer: 'https://goerli.etherscan.io',
      explorerUrl: 'https://goerli.etherscan.io'
    },
    polygon: {
      name: 'Polygon',
      url: 'https://polygon-mainnet.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 137,
      symbol: 'MATIC',
      blockExplorer: 'https://polygonscan.com',
      explorerUrl: 'https://polygonscan.com'
    },
    arbitrum: {
      name: 'Arbitrum One',
      url: 'https://arbitrum-mainnet.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 42161,
      symbol: 'ETH',
      blockExplorer: 'https://arbiscan.io',
      explorerUrl: 'https://arbiscan.io'
    },
    optimism: {
      name: 'Optimism',
      url: 'https://optimism-mainnet.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 10,
      symbol: 'ETH',
      blockExplorer: 'https://optimistic.etherscan.io',
      explorerUrl: 'https://optimistic.etherscan.io'
    },
    base: {
      name: 'Base',
      url: 'https://base-mainnet.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 8453,
      symbol: 'ETH',
      blockExplorer: 'https://basescan.org',
      explorerUrl: 'https://basescan.org'
    },
    avalanche: {
      name: 'Avalanche C-Chain',
      url: 'https://avalanche-mainnet.infura.io/v3/5c1ee7157d1640e9ae2293e64d167884',
      chainId: 43114,
      symbol: 'AVAX',
      blockExplorer: 'https://snowtrace.io',
      explorerUrl: 'https://snowtrace.io'
    },
    bsc: {
      name: '币安智能链',
      url: 'https://bsc-dataseed.binance.org/', // BSC主网Infura不支持，保持原有
      chainId: 56,
      symbol: 'BNB',
      blockExplorer: 'https://bscscan.com',
      explorerUrl: 'https://bscscan.com'
    },
    localhost: {
      name: '本地网络',
      url: 'http://127.0.0.1:7545',  // Ganache默认端口是7545
      chainId: 1337,  // Ganache默认chainId
      symbol: 'ETH',
      blockExplorer: '',
      explorerUrl: ''
    },
    ganache: {
      name: 'Ganache',
      url: 'http://127.0.0.1:7545',  // Ganache默认端口
      chainId: 1337,  // Ganache默认chainId
      symbol: 'ETH',
      blockExplorer: '',
      explorerUrl: ''
    }
  };
};

// 默认设置
const getDefaultSettings = () => {
  return {
    currency: 'USD',
    language: 'zh',
    theme: 'light',
    autoLock: 15, // 15分钟自动锁定
    showTestNetworks: false,
    gasPrice: {
      slow: 5,
      standard: 10,
      fast: 15,
      useLast: true
    },
    securityLevel: 'standard'
  };
};

/**
 * 清除所有数据
 */
const clearAllData = async () => {
  // 清除localStorage中的数据
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 清除所有带前缀的localStorage数据
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(KEYS.TOKENS) || key.startsWith(KEYS.TX_HISTORY))) {
      localStorage.removeItem(key);
    }
  }
  
  // 清除IndexedDB中的数据
  try {
    await set(KEYS.WALLETS, null);
    await set(KEYS.MASTER_MNEMONIC, null);
    console.log('已清除IndexedDB中的钱包数据');
  } catch (error) {
    console.error('清除IndexedDB数据失败:', error);
  }
};

/**
 * 检查IndexedDB中是否有加密钱包数据
 * @returns {Promise<boolean>} 是否有钱包
 */
const hasWalletsInDB = async () => {
  try {
    const encryptedData = await get(KEYS.WALLETS);
    console.log('IndexedDB钱包检查结果:', !!encryptedData);
    return !!encryptedData;
  } catch (error) {
    console.error('检查IndexedDB钱包数据失败:', error);
    return false;
  }
};

export {
  KEYS,
  hasWallets,
  saveWallets,
  getWallets,
  saveWalletsToDB,
  getWalletsFromDB,
  saveMasterMnemonicToDB,
  getMasterMnemonicFromDB,
  saveCurrentWalletIndex,
  getCurrentWalletIndex,
  saveNetworks,
  getNetworks,
  saveCurrentNetwork,
  getCurrentNetwork,
  saveSettings,
  getSettings,
  saveTokens,
  getTokens,
  addToken,
  removeToken,
  updateTokenBalance,
  saveTokenTransactionHistory,
  getTokenTransactionHistory,
  addTokenTransactionToHistory,
  saveTransactionHistory,
  getTransactionHistory,
  addTransactionToHistory,
  updateTransactionStatus,
  getDefaultNetworks,
  getDefaultSettings,
  clearAllData,
  hasWalletsInDB
}; 
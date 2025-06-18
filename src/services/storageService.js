import { encryptData, decryptData } from '../utils/ethersHelper';

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
 * 保存主助记词
 * @param {string} mnemonic 助记词
 * @param {string} password 加密密码
 */
const saveMasterMnemonic = (mnemonic, password) => {
  if (!mnemonic || !password) {
    throw new Error('需要助记词和密码才能保存');
  }
  const encryptedData = encryptData(mnemonic, password);
  localStorage.setItem(KEYS.MASTER_MNEMONIC, encryptedData);
};

/**
 * 获取主助记词
 * @param {string} password 解密密码
 * @returns {string} 解密后的助记词
 */
const getMasterMnemonic = (password) => {
  const encryptedData = localStorage.getItem(KEYS.MASTER_MNEMONIC);
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
      url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 1,
      symbol: 'ETH',
      blockExplorer: 'https://etherscan.io'
    },
    goerli: {
      name: 'Goerli测试网',
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 5,
      symbol: 'ETH',
      blockExplorer: 'https://goerli.etherscan.io'
    },
    sepolia: {
      name: 'Sepolia测试网',
      url: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 11155111,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.etherscan.io'
    },
    bsc: {
      name: '币安智能链',
      url: 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      symbol: 'BNB',
      blockExplorer: 'https://bscscan.com'
    },
    polygon: {
      name: 'Polygon',
      url: 'https://polygon-rpc.com',
      chainId: 137,
      symbol: 'MATIC',
      blockExplorer: 'https://polygonscan.com'
    },
    localhost: {
      name: '本地网络',
      url: 'http://localhost:8545',
      chainId: 1337,
      symbol: 'ETH',
      blockExplorer: ''
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
const clearAllData = () => {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 清除所有带前缀的数据
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(KEYS.TOKENS) || key.startsWith(KEYS.TX_HISTORY))) {
      localStorage.removeItem(key);
    }
  }
};

export {
  KEYS,
  hasWallets,
  saveWallets,
  getWallets,
  saveMasterMnemonic,
  getMasterMnemonic,
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
  saveTransactionHistory,
  getTransactionHistory,
  addTransactionToHistory,
  updateTransactionStatus,
  getDefaultNetworks,
  getDefaultSettings,
  clearAllData
}; 
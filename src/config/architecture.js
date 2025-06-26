/**
 * 新架构配置文件
 * 集中管理架构相关的配置和常量
 */

// 架构版本
export const ARCHITECTURE_VERSION = '2.0.0';

// 事件类型常量
export const EVENTS = {
  // 钱包事件
  WALLET_CREATED: 'wallet_created',
  WALLET_IMPORTED: 'wallet_imported',
  WALLET_LOCKED: 'wallet_locked',
  WALLET_UNLOCKED: 'wallet_unlocked',
  WALLET_SWITCHED: 'wallet_switched',
  WALLET_RESET: 'wallet_reset',
  ACCOUNT_ADDED: 'account_added',
  WALLETS_CHANGED: 'wallets_changed',
  CURRENT_WALLET_CHANGED: 'current_wallet_changed',

  // 网络事件
  NETWORK_CHANGED: 'network_changed',
  NETWORK_ADDED: 'network_added',
  NETWORK_REMOVED: 'network_removed',
  NETWORKS_CHANGED: 'networks_changed',
  PROVIDER_UPDATED: 'provider_updated',
  NETWORK_INITIALIZED: 'network_initialized',

  // 交易事件
  TRANSACTION_SENT: 'transaction_sent',
  TRANSACTION_CONFIRMED: 'transaction_confirmed',
  TRANSACTION_FAILED: 'transaction_failed',
  TRANSACTION_ADDED: 'transaction_added',
  TRANSACTION_UPDATED: 'transaction_updated',
  HISTORY_CLEARED: 'history_cleared',

  // 存储事件
  DATA_STORED: 'data_stored',
  DATA_REMOVED: 'data_removed',
  ALL_DATA_CLEARED: 'all_data_cleared',
  CACHE_CLEARED: 'cache_cleared',
  STORAGE_INITIALIZED: 'storage_initialized',

  // DApp 事件
  DAPP_REQUEST: 'dapp_request',
  DAPP_APPROVED: 'dapp_approved',
  DAPP_REJECTED: 'dapp_rejected',

  // 通用事件
  ERROR: 'error',
  LOADING_CHANGED: 'loading_changed'
};

// 存储键名常量
export const STORAGE_KEYS = {
  WALLETS: 'wallets',
  MASTER_MNEMONIC: 'masterMnemonic',
  NETWORKS: 'networks',
  CURRENT_NETWORK: 'currentNetwork',
  SETTINGS: 'settings',
  TOKENS: 'tokens',
  TX_HISTORY: 'txHistory',
  CACHE: 'cache'
};

// 网络配置
export const DEFAULT_NETWORKS = {
  mainnet: {
    name: 'Ethereum Mainnet',
    url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    chainId: 1,
    symbol: 'ETH',
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
    isDefault: true
  },
  goerli: {
    name: 'Goerli Testnet',
    url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    chainId: 5,
    symbol: 'ETH',
    blockExplorer: 'https://goerli.etherscan.io',
    isTestnet: true,
    isDefault: true
  },
  sepolia: {
    name: 'Sepolia Testnet',
    url: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    chainId: 11155111,
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    isDefault: true
  },
  polygon: {
    name: 'Polygon Mainnet',
    url: 'https://polygon-rpc.com',
    chainId: 137,
    symbol: 'MATIC',
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
    isDefault: true
  },
  bsc: {
    name: 'BSC Mainnet',
    url: 'https://bsc-dataseed1.binance.org',
    chainId: 56,
    symbol: 'BNB',
    blockExplorer: 'https://bscscan.com',
    isTestnet: false,
    isDefault: true
  },
  arbitrum: {
    name: 'Arbitrum One',
    url: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    symbol: 'ETH',
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
    isDefault: true
  },
  optimism: {
    name: 'Optimism',
    url: 'https://mainnet.optimism.io',
    chainId: 10,
    symbol: 'ETH',
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
    isDefault: true
  }
};

// 默认设置
export const DEFAULT_SETTINGS = {
  autoLock: 15, // 15分钟自动锁定
  showTestNetworks: false,
  currency: 'USD',
  language: 'zh-CN',
  notifications: true,
  analytics: false,
  advancedMode: false,
  gasSettings: {
    speed: 'standard', // slow, standard, fast, custom
    customGasPrice: null,
    customGasLimit: null
  },
  privacy: {
    hideBalances: false,
    phishingProtection: true,
    autoReject: false
  }
};

// 钱包配置
export const WALLET_CONFIG = {
  // HD 钱包路径
  HD_PATH: "m/44'/60'/0'/0",
  
  // 默认 Gas 限制
  DEFAULT_GAS_LIMIT: '21000',
  
  // 最大钱包数量
  MAX_WALLETS: 50,
  
  // 助记词长度
  MNEMONIC_LENGTHS: [12, 15, 18, 21, 24],
  
  // 密码要求
  PASSWORD_MIN_LENGTH: 8,
  
  // 会话超时 (毫秒)
  SESSION_TIMEOUT: 72 * 60 * 60 * 1000, // 72小时
  
  // 自动锁定选项 (分钟)
  AUTO_LOCK_OPTIONS: [0, 1, 5, 10, 15, 30, 60],
  
  // 支持的语言
  SUPPORTED_LANGUAGES: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR']
};

// 交易配置
export const TRANSACTION_CONFIG = {
  // Gas 价格倍数
  GAS_PRICE_MULTIPLIERS: {
    slow: 0.8,
    standard: 1.0,
    fast: 1.2,
    instant: 1.5
  },
  
  // Gas 限制缓冲
  GAS_LIMIT_BUFFER: 1.2, // 增加 20%
  
  // 最大重试次数
  MAX_RETRIES: 3,
  
  // 交易超时 (毫秒)
  TRANSACTION_TIMEOUT: 5 * 60 * 1000, // 5分钟
  
  // 历史记录限制
  MAX_HISTORY_ITEMS: 1000,
  
  // 支持的代币标准
  SUPPORTED_TOKEN_STANDARDS: ['ERC20', 'ERC721', 'ERC1155']
};

// 缓存配置
export const CACHE_CONFIG = {
  // 缓存大小限制 (MB)
  MAX_CACHE_SIZE: 50,
  
  // 缓存过期时间 (毫秒)
  CACHE_EXPIRY: {
    balance: 30 * 1000,      // 30秒
    tokenInfo: 60 * 60 * 1000, // 1小时
    gasPrice: 15 * 1000,     // 15秒
    networkInfo: 5 * 60 * 1000 // 5分钟
  },
  
  // 预加载项目
  PRELOAD_ITEMS: [
    'networks',
    'settings',
    'currentNetwork',
    'tokens'
  ]
};

// 安全配置
export const SECURITY_CONFIG = {
  // 加密算法
  ENCRYPTION_ALGORITHM: 'AES-GCM',
  
  // 密钥派生迭代次数
  PBKDF2_ITERATIONS: 100000,
  
  // 盐长度
  SALT_LENGTH: 32,
  
  // IV 长度
  IV_LENGTH: 12,
  
  // 登录尝试限制
  MAX_LOGIN_ATTEMPTS: 5,
  
  // 锁定时间 (毫秒)
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分钟
  
  // 敏感数据清理间隔 (毫秒)
  MEMORY_CLEANUP_INTERVAL: 60 * 1000 // 1分钟
};

// 性能配置
export const PERFORMANCE_CONFIG = {
  // 防抖延迟 (毫秒)
  DEBOUNCE_DELAY: 300,
  
  // 节流间隔 (毫秒)
  THROTTLE_INTERVAL: 1000,
  
  // 虚拟滚动阈值
  VIRTUAL_SCROLL_THRESHOLD: 100,
  
  // 批量操作大小
  BATCH_SIZE: 50,
  
  // 重渲染优化
  MEMO_DEPENDENCIES: {
    shallow: ['address', 'balance', 'name'],
    deep: ['transactions', 'tokens']
  }
};

// 开发配置
export const DEV_CONFIG = {
  // 调试模式
  DEBUG: process.env.NODE_ENV === 'development',
  
  // 日志级别
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  
  // 测试网络
  ENABLE_TEST_NETWORKS: process.env.NODE_ENV === 'development',
  
  // 开发工具
  ENABLE_DEV_TOOLS: process.env.NODE_ENV === 'development',
  
  // 性能监控
  ENABLE_PERFORMANCE_MONITORING: true,
  
  // 错误报告
  ENABLE_ERROR_REPORTING: process.env.NODE_ENV === 'production'
};

// 导出所有配置
export const CONFIG = {
  ARCHITECTURE_VERSION,
  EVENTS,
  STORAGE_KEYS,
  DEFAULT_NETWORKS,
  DEFAULT_SETTINGS,
  WALLET_CONFIG,
  TRANSACTION_CONFIG,
  CACHE_CONFIG,
  SECURITY_CONFIG,
  PERFORMANCE_CONFIG,
  DEV_CONFIG
};

export default CONFIG;
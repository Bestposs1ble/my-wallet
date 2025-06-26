/**
 * 新的轻量级钱包 Provider - 协调各个管理器和 Hook
 * 只负责提供统一的接口，不包含复杂的业务逻辑
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
// 暂时注释掉这些导入，避免循环依赖
// import { useWallet as useWalletHook } from '../hooks/useWallet';
// import { useNetwork } from '../hooks/useNetwork';
// import { useTransaction } from '../hooks/useTransaction';
import { createEthereumProvider } from '../services/ethereumProvider';
import { storageManager } from '../core/storage/StorageManager';
import { walletManager } from '../core/wallet/WalletManager';
import { networkManager } from '../core/network/NetworkManager';
import { transactionManager } from '../core/transaction/TransactionManager';
import EventEmitter from 'events';

// 创建上下文
const WalletContext = createContext();

// DApp 相关状态和逻辑
const useDappIntegration = () => {
  const [dappRequest, setDappRequest] = useState(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [dappRequestHandlers] = useState(new Map());

  // 处理 DApp 请求
  const handleDappRequest = (request) => {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      dappRequestHandlers.set(requestId, { resolve, reject });
      setDappRequest({ ...request, id: requestId });
      setRequestModalVisible(true);
    });
  };

  // 批准 DApp 请求
  const approveDappRequest = (requestId) => {
    const handler = dappRequestHandlers.get(requestId);
    if (handler) {
      handler.resolve(true);
      dappRequestHandlers.delete(requestId);
    }
    setRequestModalVisible(false);
    setDappRequest(null);
  };

  // 拒绝 DApp 请求
  const rejectDappRequest = (requestId) => {
    const handler = dappRequestHandlers.get(requestId);
    if (handler) {
      handler.reject(new Error('用户拒绝请求'));
      dappRequestHandlers.delete(requestId);
    }
    setRequestModalVisible(false);
    setDappRequest(null);
  };

  return {
    dappRequest,
    requestModalVisible,
    handleDappRequest,
    approveDappRequest,
    rejectDappRequest
  };
};

// 余额管理 Hook
const useBalance = (walletState, networkState) => {
  const [accountBalances, setAccountBalances] = useState({});
  const [tokenBalances, setTokenBalances] = useState({});
  const [loading, setLoading] = useState(false);

  // 直接从管理器获取状态
  const wallets = walletState.wallets;
  const getCurrentWallet = () => walletManager.getCurrentWallet();
  const getCurrentProvider = () => networkManager.getCurrentProvider();
  const currentNetwork = networkState.currentNetwork;

  // 获取 ETH 余额
  const fetchEthBalance = async (address) => {
    try {
      const provider = getCurrentProvider();
      if (!provider) return '0';

      const balance = await provider.getBalance(address);
      const ethBalance = ethers.utils.formatEther(balance);
      
      setAccountBalances(prev => ({
        ...prev,
        [address]: ethBalance
      }));

      return ethBalance;
    } catch (error) {
      console.error('获取 ETH 余额失败:', error);
      return '0';
    }
  };

  // 获取代币余额
  const fetchTokenBalance = async (address, tokenAddress, decimals) => {
    try {
      const provider = getCurrentProvider();
      if (!provider) return '0';

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address owner) view returns (uint256)'],
        provider
      );

      const balance = await tokenContract.balanceOf(address);
      const tokenBalance = ethers.utils.formatUnits(balance, decimals);
      
      setTokenBalances(prev => ({
        ...prev,
        [address]: {
          ...prev[address],
          [tokenAddress]: tokenBalance
        }
      }));

      return tokenBalance;
    } catch (error) {
      console.error('获取代币余额失败:', error);
      return '0';
    }
  };

  // 获取当前钱包余额
  const getCurrentWalletBalance = () => {
    const currentWallet = getCurrentWallet();
    if (!currentWallet) return '0';
    return accountBalances[currentWallet.address] || '0';
  };

  // 刷新所有余额
  const refreshBalances = async () => {
    if (wallets.length === 0) return;
    
    setLoading(true);
    try {
      await Promise.all(
        wallets.map(wallet => fetchEthBalance(wallet.address))
      );
    } catch (error) {
      console.error('刷新余额失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 网络切换时刷新余额
  useEffect(() => {
    if (wallets.length > 0) {
      refreshBalances();
    }
  }, [currentNetwork, wallets]);

  return {
    accountBalances,
    tokenBalances,
    loading,
    fetchEthBalance,
    fetchTokenBalance,
    getCurrentWalletBalance,
    refreshBalances
  };
};

// 代币管理 Hook
const useTokens = (networkState) => {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);

  // 直接从网络管理器获取当前网络
  const currentNetwork = networkState.currentNetwork;

  // 加载代币列表
  const loadTokens = async () => {
    try {
      const tokenList = await storageManager.getTokens(currentNetwork);
      setTokens(tokenList);
    } catch (error) {
      console.error('加载代币列表失败:', error);
    }
  };

  // 添加代币
  const addToken = async (tokenInfo) => {
    try {
      const { address, symbol, decimals, name, image } = tokenInfo;
      
      // 检查代币是否已存在
      const existingToken = tokens.find(
        t => t.address.toLowerCase() === address.toLowerCase()
      );
      
      if (existingToken) {
        return true;
      }
      
      // 添加新代币
      const newToken = {
        address,
        symbol,
        name: name || symbol,
        decimals,
        image,
        balance: '0',
        addedAt: Date.now()
      };
      
      const updatedTokens = [...tokens, newToken];
      await storageManager.saveTokens(updatedTokens, currentNetwork);
      setTokens(updatedTokens);
      
      return true;
    } catch (error) {
      console.error('添加代币失败:', error);
      return false;
    }
  };

  // 删除代币
  const removeToken = async (tokenAddress) => {
    try {
      const updatedTokens = tokens.filter(
        t => t.address.toLowerCase() !== tokenAddress.toLowerCase()
      );
      
      await storageManager.saveTokens(updatedTokens, currentNetwork);
      setTokens(updatedTokens);
      
      // 如果删除的是当前选中的代币，清除选择
      if (selectedToken && selectedToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
        setSelectedToken(null);
      }
      
      return true;
    } catch (error) {
      console.error('删除代币失败:', error);
      return false;
    }
  };

  // 网络切换时重新加载代币
  useEffect(() => {
    loadTokens();
    setSelectedToken(null); // 清除选中的代币
  }, [currentNetwork]);

  return {
    tokens,
    selectedToken,
    setSelectedToken,
    addToken,
    removeToken,
    loadTokens
  };
};

// 主要的 Provider 组件
export const WalletProvider = ({ children }) => {
  // 直接使用管理器状态
  const [walletState, setWalletState] = useState(walletManager.getState());
  const [networkState, setNetworkState] = useState(networkManager.getState());
  const [transactionState, setTransactionState] = useState(transactionManager.getState());
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化管理器
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        // 初始化网络管理器
        const networks = await storageManager.getNetworks();
        const currentNetwork = await storageManager.getCurrentNetwork();
        await networkManager.initialize(networks, currentNetwork);
        
        // 检查是否有钱包
        const hasWallets = await storageManager.hasWallets();
        
        setIsInitialized(true);
        setWalletState(prev => ({ ...prev, hasWallets }));
      } catch (error) {
        console.error('初始化管理器失败:', error);
      }
    };

    initializeManagers();
  }, []);
  
  // DApp 和其他功能
  const dappHook = useDappIntegration();
  const balanceHook = useBalance(walletState, networkState);
  const tokensHook = useTokens(networkState);

  // 事件发射器
  const [emitter] = useState(new EventEmitter());
  const [ethereumProvider, setEthereumProvider] = useState(null);

  // 监听管理器状态变化
  useEffect(() => {
    const handleWalletStateChange = () => {
      setWalletState(walletManager.getState());
    };

    const handleNetworkStateChange = () => {
      setNetworkState(networkManager.getState());
    };

    const handleTransactionStateChange = () => {
      setTransactionState(transactionManager.getState());
    };

    // 注册事件监听器
    walletManager.on('walletsChanged', handleWalletStateChange);
    walletManager.on('currentWalletChanged', handleWalletStateChange);
    walletManager.on('walletLocked', handleWalletStateChange);
    walletManager.on('walletUnlocked', handleWalletStateChange);

    networkManager.on('networkChanged', handleNetworkStateChange);
    networkManager.on('providerUpdated', handleNetworkStateChange);
    networkManager.on('initialized', handleNetworkStateChange);

    transactionManager.on('transactionAdded', handleTransactionStateChange);
    transactionManager.on('transactionUpdated', handleTransactionStateChange);

    // 清理函数
    return () => {
      walletManager.removeAllListeners();
      networkManager.removeAllListeners();
      transactionManager.removeAllListeners();
    };
  }, []);

  // 初始化以太坊 Provider 接口
  useEffect(() => {
    if (!ethereumProvider) {
      const walletContext = {
        isLocked: walletHook.isLocked,
        getCurrentWallet: walletHook.getCurrentWallet,
        currentNetwork: networkHook.currentNetwork,
        networks: networkHook.networks,
        sendTransaction: transactionHook.sendTransaction,
        signMessage: async (message) => {
          const wallet = walletHook.getWalletInstance();
          if (!wallet) throw new Error('钱包未解锁');
          return await wallet.signMessage(message);
        },
        addToken: tokensHook.addToken,
        switchNetwork: networkHook.switchNetwork,
        addCustomNetwork: networkHook.addCustomNetwork,
        addListener: (event, handler) => {
          emitter.on(event, handler);
          return () => emitter.off(event, handler);
        },
        removeListener: (event, handler) => {
          emitter.off(event, handler);
        }
      };

      const provider = createEthereumProvider(walletContext);
      provider._requestUserApproval = dappHook.handleDappRequest;
      setEthereumProvider(provider);

      if (typeof window !== 'undefined') {
        window.ethereum = provider;
      }
    }
  }, [walletHook.isLocked, networkHook.currentNetwork]);

  // 钱包或网络变更时通知 Provider
  useEffect(() => {
    if (walletHook.wallets.length > 0 && !walletHook.isLocked) {
      const currentWallet = walletHook.getCurrentWallet();
      emitter.emit('walletChanged', currentWallet);
      emitter.emit('accountsChanged', [currentWallet.address]);
    }
  }, [walletHook.wallets, walletHook.currentWalletIndex, walletHook.isLocked]);

  useEffect(() => {
    emitter.emit('networkChanged', networkHook.currentNetwork);
  }, [networkHook.currentNetwork]);

  // 组合所有状态和方法
  const contextValue = {
    // 钱包相关状态
    wallets: walletState.wallets,
    currentWalletIndex: walletState.currentWalletIndex,
    isLocked: walletState.isLocked,
    hasWallets: walletState.hasWallets,
    currentWallet: walletState.currentWallet,
    isInitialized: isInitialized,
    loading: false,
    error: null,
    
    // 钱包方法
    createWallet: async (password, mnemonic) => {
      await storageManager.initialize(password);
      const result = await walletManager.createWallet(password, mnemonic);
      await storageManager.saveWallets([result.wallet], password);
      await storageManager.saveMasterMnemonic(result.mnemonic, password);
      return result;
    },
    unlock: async (password) => {
      await storageManager.initialize(password);
      const wallets = await storageManager.getWallets(password);
      const mnemonic = await storageManager.getMasterMnemonic(password);
      walletManager.unlock(password, wallets, mnemonic);
    },
    lock: () => walletManager.lock(),
    switchWallet: (index) => walletManager.switchWallet(index),
    addDerivedAccount: (name) => walletManager.addDerivedAccount(name),
    getCurrentWallet: () => walletManager.getCurrentWallet(),
    
    // 网络相关状态
    networks: networkState.networks,
    currentNetwork: networkState.currentNetwork,
    provider: networkState.provider,
    connectionStatus: 'connected', // 简化状态
    
    // 网络方法
    switchNetwork: (networkId) => networkManager.switchNetwork(networkId),
    addCustomNetwork: (config) => networkManager.addCustomNetwork(config),
    getCurrentNetworkConfig: () => networkManager.getCurrentNetworkConfig(),
    getCurrentProvider: () => networkManager.getCurrentProvider(),
    
    // 交易相关状态
    pendingTransactions: transactionState.pendingTransactions,
    transactionHistory: transactionState.transactionHistory,
    
    // 交易方法
    sendTransaction: async (params) => {
      const wallet = walletManager.getWalletInstance();
      const provider = networkManager.getCurrentProvider();
      return await transactionManager.sendTransaction(params, wallet, provider);
    },
    estimateGas: async (tx) => {
      const provider = networkManager.getCurrentProvider();
      return await transactionManager.estimateGas(tx, provider);
    },
    
    // DApp 相关
    ...dappHook,
    
    // 余额相关
    ...balanceHook,
    
    // 代币相关
    ...tokensHook,
    
    // 事件系统
    emitter,
    on: (event, handler) => emitter.on(event, handler),
    off: (event, handler) => emitter.off(event, handler),
    
    // 以太坊 Provider
    ethereumProvider
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// 使用 Context 的 Hook
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

// 为了向后兼容，保留原来的导出名称
export { useWalletContext as useWallet };
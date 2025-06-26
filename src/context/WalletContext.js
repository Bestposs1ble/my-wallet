import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import * as ethersHelper from '../utils/ethersHelper';
import * as storageService from '../services/storageService';
import * as blockchainService from '../services/blockchainService';
import { createEthereumProvider, EthereumProvider } from '../services/ethereumProvider';
import EventEmitter from 'events';
import { message } from 'antd';

// 创建上下文
const WalletContext = createContext();

// 导出上下文对象，便于其他地方使用
export { WalletContext };

// 定义事件类型常量
const EVENTS = {
  TRANSACTION_UPDATED: 'transaction_updated',
  ACCOUNT_CHANGED: 'account_changed',
  NETWORK_CHANGED: 'network_changed',
  BALANCE_UPDATED: 'balance_updated'
};

// 创建上下文提供者组件
export const WalletProvider = ({ children }) => {
  // 状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [hasWallets, setHasWallets] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [masterMnemonic, setMasterMnemonic] = useState(null); // 主助记词(用于派生多个钱包)
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [currentNetwork, setCurrentNetwork] = useState('mainnet');
  const [networks, setNetworks] = useState({});
  const [provider, setProvider] = useState(null);
  const [password, setPassword] = useState('');
  const [accountBalances, setAccountBalances] = useState({}); // 账户余额映射
  const [pendingTransactions, setPendingTransactions] = useState([]); // 待处理的交易
  const [lastActivity, setLastActivity] = useState(Date.now()); // 用于自动锁定
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // 新增dApp相关状态
  const [dappRequest, setDappRequest] = useState(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const dappRequestHandlers = useRef(new Map());
  // 用于事件分发的emitter
  const emitter = useRef(new EventEmitter());
  // Provider实例
  const ethereumProviderRef = useRef(null);
  const [tokenBalances, setTokenBalances] = useState({}); // 代币余额映射 {walletAddress: {tokenAddress: {balance, formatted}}}
  const [tokens, setTokens] = useState([]); // 当前网络的代币列表
  const [selectedToken, setSelectedToken] = useState(null); // 当前选中的代币
  
  // 网络状态监测
  const [networkStatus, setNetworkStatus] = useState({
    isConnected: true,
    latency: 0,
    blockHeight: 0,
    lastChecked: Date.now()
  });
  const networkCheckInterval = useRef(null);
  
  // 锁定钱包
  const lock = () => {
    setIsLocked(true);
    setPassword('');
    setMasterMnemonic(null);
    setError(null);
    setWallets([]); // 清空账户
    sessionStorage.removeItem('wallet_is_unlocked');
    sessionStorage.removeItem('wallet_auto_unlock');
    sessionStorage.removeItem('walletCreationData');
    localStorage.removeItem('login_attempts');
    localStorage.removeItem('login_lockout_until');
    setPendingTransactions([]);
    emitter.current.emit('walletLocked');
    // 不做页面跳转，交由页面监听isLocked处理
    console.log('钱包已锁定');
  };

  // 定义钱包加载函数（移动到顶层作用域）
  const tryLoadWallets = async () => {
    setLoading(true);
    try {
      if (password) {
        // 首先尝试从IndexedDB获取钱包数据
        let dbWallets = null;
        let mnemonic = null;

        try {
          dbWallets = await storageService.getWalletsFromDB(password);
          mnemonic = await storageService.getMasterMnemonicFromDB(password);
        } catch (dbErr) {
          console.error('从IndexedDB获取钱包数据失败:', dbErr);
          // 继续尝试localStorage
        }

        // 如果从IndexedDB成功获取了数据
        if (dbWallets && dbWallets.length > 0 && mnemonic) {
          // 获取当前选择的钱包索引
          const savedIndex = storageService.getCurrentWalletIndex();
          // 确保索引有效
          const validIndex = savedIndex < dbWallets.length ? savedIndex : 0;
          
          setWallets(dbWallets);
          setCurrentWalletIndex(validIndex);
          setMasterMnemonic(mnemonic);
          setIsLocked(false);
          setError(null);
          
          // 加载后自动获取余额
          setTimeout(() => fetchBalances(), 500);
          
          setLoading(false);
          return true;
        }
        
        // 如果IndexedDB没有数据，尝试从localStorage获取
        const lsWallets = storageService.getWallets(password);
        if (lsWallets && lsWallets.length > 0) {
          let lsMnemonic = null;
          try {
            // 尝试从localStorage获取助记词
            lsMnemonic = storageService.getMasterMnemonic(password);
          } catch (mnErr) {
            console.error('从localStorage获取助记词失败:', mnErr);
            setError('无法恢复钱包数据: 助记词读取失败');
            setLoading(false);
            return false;
          }

          if (!lsMnemonic) {
            setError('无法恢复钱包: 助记词不可用');
            setLoading(false);
            return false;
          }

          // 获取当前选择的钱包索引
          const savedIndex = storageService.getCurrentWalletIndex();
          // 确保索引有效
          const validIndex = savedIndex < lsWallets.length ? savedIndex : 0;
          
          setWallets(lsWallets);
          setCurrentWalletIndex(validIndex);
          setMasterMnemonic(lsMnemonic);
          setIsLocked(false);
          setError(null);
          
          // 同时将数据保存到IndexedDB以便今后使用
          await storageService.saveWalletsToDB(lsWallets, password);
          await storageService.saveMasterMnemonicToDB(lsMnemonic, password);
          
          // 加载后自动获取余额
          setTimeout(() => fetchBalances(), 500);
          return true;
        } else {
          console.error('未找到任何钱包数据');
          setError('未找到钱包数据');
          setLoading(false);
          return false;
        }
      } else {
        console.error('尝试加载钱包但没有提供密码');
        setError('需要密码才能加载钱包');
        setLoading(false);
        return false;
      }
    } catch (e) {
      console.error('加载钱包失败:', e);
      setError('读取钱包失败: ' + e.message);
      setLoading(false);
      return false;
    }
  };

  // 初始化钱包状态
  useEffect(() => {
    const initWalletState = async () => {
      try {
        setLoading(true);
        const hasWalletsData = await storageService.hasWalletsInDB();
        setHasWallets(hasWalletsData);
        const networksConfig = storageService.getNetworks();
        setNetworks(networksConfig);
        const currentNetworkId = storageService.getCurrentNetwork();
        setCurrentNetwork(currentNetworkId);
        const tokensList = storageService.getTokens(currentNetworkId);
        setTokens(tokensList);
        const newProvider = blockchainService.updateProvider(currentNetworkId);
        setProvider(newProvider);
        setIsInitialized(true);
        
        const isUnlocked = sessionStorage.getItem('wallet_is_unlocked');
        const autoUnlock = sessionStorage.getItem('wallet_auto_unlock');
        
        if ((isUnlocked || autoUnlock) && hasWalletsData) {
          try {
            // 尝试自动解锁
            if (autoUnlock) {
              // autoUnlock 格式为 base64(timestamp:password)
              const decodedToken = atob(autoUnlock);
              const [timestamp, encodedPassword] = decodedToken.split(':');
              const unlockPassword = atob(encodedPassword);
              const now = Date.now();
              const tokenTime = parseInt(timestamp, 10);
              const isValid = now - tokenTime < 1 * 60 * 60 * 1000; // 1小时有效期
              
              if (isValid) {
                setPassword(unlockPassword);
                // 尝试使用保存的密码加载钱包
                const success = await tryLoadWallets();
                if (!success) {
                  // 如果自动解锁失败，清除session存储
                  sessionStorage.removeItem('wallet_is_unlocked');
                  sessionStorage.removeItem('wallet_auto_unlock');
                  setIsLocked(true);
                } else {
                  // 解锁成功，更新session令牌
                  const newTimestamp = Date.now();
                  const walletAddress = wallets.length > 0 ? wallets[currentWalletIndex].address.substring(2, 10) : '';
                  const newUnlockToken = `${newTimestamp}:${walletAddress}`;
                  const newEncodedToken = btoa(newUnlockToken);
                  sessionStorage.setItem('wallet_is_unlocked', newEncodedToken);
                  setLastActivity(Date.now());
                }
              } else {
                // 令牌已过期
                sessionStorage.removeItem('wallet_auto_unlock');
              }
            } else if (isUnlocked) {
              // 仅检查解锁标志，但没有保存密码
              // 这种情况用户需要手动输入密码
              setIsLocked(true);
            }
          } catch (e) {
            console.error('自动解锁失败:', e);
            sessionStorage.removeItem('wallet_is_unlocked');
            sessionStorage.removeItem('wallet_auto_unlock');
            setIsLocked(true);
          }
        } else {
          // 未找到自动解锁token，保持锁定状态
          setIsLocked(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('初始化钱包失败:', error);
        setError('初始化钱包失败: ' + error.message);
        setIsLocked(true);
        setLoading(false);
      }
    };
    
    initWalletState();
  }, []);

  // 初始化以太坊Provider接口
  useEffect(() => {
    if (!ethereumProviderRef.current) {
      const walletContext = {
        isLocked,
        getCurrentWallet,
        currentNetwork,
        networks,
        sendTransaction,
        signMessage: walletSignMessage,
        addToken,
        switchNetwork,
        addCustomNetwork,
        addListener: (event, handler) => {
          emitter.current.on(event, handler);
          return () => emitter.current.off(event, handler);
        },
        removeListener: (event, handler) => {
          emitter.current.off(event, handler);
        }
      };
      const provider = createEthereumProvider(walletContext);
      provider._requestUserApproval = handleDappRequest;
      ethereumProviderRef.current = provider;
      if (typeof window !== 'undefined') {
        // 避免覆盖已有的MetaMask提供程序
        if (!window.ethereum) {
          window.ethereum = provider;
        } else if (!window.ethereumMetamaskClone) {
          // 保存到自定义属性，避免冲突
          window.ethereumMetamaskClone = provider;
        }
      }
    }
  }, [isLocked, currentNetwork, networks]);

  // 钱包或网络变更时通知Provider
  useEffect(() => {
    if (wallets.length > 0 && !isLocked) {
      const currentWallet = wallets[currentWalletIndex];
      emitter.current.emit('walletChanged', currentWallet);
      emitter.current.emit('accountsChanged', [currentWallet.address]);
    }
  }, [wallets, currentWalletIndex, isLocked]);

  useEffect(() => {
    emitter.current.emit('networkChanged', currentNetwork);
  }, [currentNetwork]);

  // 处理dApp请求
  const handleDappRequest = useCallback((request) => {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      dappRequestHandlers.current.set(requestId, { resolve, reject });
      setDappRequest({ ...request, id: requestId });
      setRequestModalVisible(true);
    });
  }, []);

  // 批准dApp请求
  const approveDappRequest = useCallback((requestId) => {
    const handler = dappRequestHandlers.current.get(requestId);
    if (handler) {
      handler.resolve(true);
      dappRequestHandlers.current.delete(requestId);
    }
    setRequestModalVisible(false);
    setDappRequest(null);
  }, []);
  
  // 拒绝dApp请求
  const rejectDappRequest = useCallback((requestId) => {
    const handler = dappRequestHandlers.current.get(requestId);
    if (handler) {
      handler.reject(new Error('用户拒绝请求'));
      dappRequestHandlers.current.delete(requestId);
    }
    setRequestModalVisible(false);
    setDappRequest(null);
  }, []);
  
  /**
   * 注册dApp请求处理器
   * @param {string} method 请求方法
   * @param {Function} handler 处理函数
   * @returns {Function} 取消注册的函数
   */
  const registerDappRequestHandler = useCallback((method, handler) => {
    if (!method || typeof handler !== 'function') {
      console.error('注册dApp请求处理器失败：无效的参数');
      return () => {};
    }
    
    // 将处理器添加到映射表
    const handlerKey = `method:${method}`;
    dappRequestHandlers.current.set(handlerKey, { handler });
    
    // 返回取消注册的函数
    return () => {
      dappRequestHandlers.current.delete(handlerKey);
    };
  }, []);
  
  // 签名消息
  const walletSignMessage = async (message) => {
    if (isLocked || wallets.length === 0 || currentWalletIndex >= wallets.length) {
      throw new Error('钱包已锁定或无法访问');
    }
    
    try {
      const currentWallet = wallets[currentWalletIndex];
      
      if (!masterMnemonic) {
        throw new Error('需要助记词才能签名消息');
      }
      
      // 创建钱包实例
      let wallet;
      if (currentWallet.privateKey) {
        // 私钥导入账户
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else {
        // 助记词派生账户
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, currentWallet.path);
      }
      
      // 对消息进行签名
      return await wallet.signMessage(message);
    } catch (error) {
      console.error('签名消息失败:', error);
      throw new Error(`签名失败: ${error.message}`);
    }
  };
  
  // 添加代币
  const addToken = async (tokenInfo) => {
    try {
      const { address, symbol, decimals, image, name } = tokenInfo;
      
      // 获取当前网络的代币列表
      const networkTokens = storageService.getTokens(currentNetwork);
      
      // 检查代币是否已存在
      const existingToken = networkTokens.find(
        t => t.address.toLowerCase() === address.toLowerCase()
      );
      
      if (existingToken) {
        return true; // 代币已存在
      }
      
      // 添加新代币
      const newToken = {
        address,
        symbol,
        name: name || symbol,
        decimals,
        image,
        balance: '0', // 初始余额
        addedAt: Date.now()
      };
      
      const updatedTokens = [...networkTokens, newToken];
      storageService.saveTokens(updatedTokens, currentNetwork);
      
      // 更新状态
      setTokens(updatedTokens);
      
      // 获取新添加代币的余额
      await fetchTokenBalances();
      
      return true;
    } catch (error) {
      console.error('添加代币失败:', error);
      setError(`添加代币失败: ${error.message}`);
      return false;
    }
  };

  // 初始化时优先从IndexedDB读取钱包
  useEffect(() => {
    if (password) {
      tryLoadWallets();
    }
  }, [password]);

  // --- 自动锁定 useEffect 修正版 ---
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (isLocked) return;
    const settings = storageService.getSettings();
    const autoLockMinutes = settings.autoLock !== undefined ? settings.autoLock : 15;
    if (autoLockMinutes === 0) {
      return;
    }
    const autoLockTime = autoLockMinutes * 60 * 1000;

    const activityHandler = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('keypress', activityHandler);
    window.addEventListener('click', activityHandler);
    window.addEventListener('touchstart', activityHandler);
    window.addEventListener('scroll', activityHandler);

    const checkInactivityInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      if (inactiveTime > autoLockTime) {
        lock();
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('keypress', activityHandler);
      window.removeEventListener('click', activityHandler);
      window.removeEventListener('touchstart', activityHandler);
      window.removeEventListener('scroll', activityHandler);
      clearInterval(checkInactivityInterval);
    };
  }, [isLocked]);
  // --- END ---

  // 监听settings变化，更新自动锁定时间
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === storageService.KEYS.SETTINGS) {
        setLastActivity(Date.now());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 获取代币余额
  const fetchTokenBalances = async () => {
    if (isLocked || wallets.length === 0 || !provider || tokens.length === 0) {
      return;
    }
    try {
      console.log(`正在获取代币余额... 当前网络: ${currentNetwork}`);
      const newTokenBalances = { ...tokenBalances };
      for (const wallet of wallets) {
        try {
          if (!newTokenBalances[wallet.address]) {
            newTokenBalances[wallet.address] = {};
          }
          // 批量获取代币余额
          const balances = await blockchainService.getMultipleTokenBalances(tokens, wallet.address);
          newTokenBalances[wallet.address] = balances;
        } catch (error) {
          console.error(`获取地址 ${wallet.address} 的代币余额失败:`, error);
        }
      }
      setTokenBalances(newTokenBalances);
    } catch (error) {
      console.error('获取代币余额失败:', error);
    }
  };

  // 刷新余额，支持传入自定义walletList
  const fetchBalances = async (walletList = wallets) => {
    if (isLocked || walletList.length === 0 || !provider) {
      return;
    }
    try {
      const newBalances = {};
      let updated = false;
      for (const wallet of walletList) {
        try {
          const balance = await blockchainService.getEthBalance(wallet.address);
          newBalances[wallet.address] = balance;
          updated = true;
        } catch (error) {
          console.error(`获取地址 ${wallet.address} 余额失败:`, error);
        }
      }
      if (updated) {
        setAccountBalances(newBalances);
      }
      await fetchTokenBalances();
    } catch (error) {
      console.error('更新账户余额失败:', error);
    }
  };

  // 解锁钱包
  const unlock = async (inputPassword) => {
    setLoading(true);
    try {
      const hasWallet = await storageService.hasWalletsInDB();
      if (!hasWallet) {
        setError('未检测到钱包数据，请先创建钱包');
        setLoading(false);
        return false;
      }
      let savedWallets;
      try {
        savedWallets = await storageService.getWalletsFromDB(inputPassword);
      } catch (e) {
        setError('密码错误');
        setLoading(false);
        return false;
      }
      if (!Array.isArray(savedWallets) || savedWallets.length === 0 || !savedWallets[0].address) {
        setError('密码错误');
        setLoading(false);
        return false;
      }
      let mnemonic;
      try {
        mnemonic = await storageService.getMasterMnemonicFromDB(inputPassword);
      } catch (e) {
        setError('密码错误');
        setLoading(false);
        return false;
      }
      if (!mnemonic) {
        setError('主助记词不可用');
        setLoading(false);
        return false;
      }
      // 获取之前保存的钱包索引
      const savedIndex = storageService.getCurrentWalletIndex();
      const validIndex = savedIndex < savedWallets.length ? savedIndex : 0;
      
      setWallets(savedWallets);
      setCurrentWalletIndex(validIndex);
      setMasterMnemonic(mnemonic);
      setPassword(inputPassword);
      setIsLocked(false);
      setError(null);
      setLastActivity(Date.now());
      
      // 使用当前选中的钱包地址创建解锁标记
      const currentWallet = savedWallets[validIndex] || savedWallets[0];
      const timestamp = Date.now();
      const unlockToken = `${timestamp}:${currentWallet.address.substring(2, 10)}`;
      const encodedToken = btoa(unlockToken);
      sessionStorage.setItem('wallet_is_unlocked', encodedToken);
      
      // 添加自动解锁令牌，包含加密的密码
      // 格式：base64(timestamp:base64(password))
      const encodedPassword = btoa(inputPassword);
      const autoUnlockToken = `${timestamp}:${encodedPassword}`;
      const encodedAutoUnlockToken = btoa(autoUnlockToken);
      sessionStorage.setItem('wallet_auto_unlock', encodedAutoUnlockToken);
      
      // 解锁后自动获取余额
      setTimeout(() => fetchBalances(), 500);
      
      return true;
    } catch (error) {
      console.error('解锁钱包失败:', error);
      setError('密码错误');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 创建新HD钱包(主钱包)
  const createHDWallet = async (name, newPassword) => {
    setLoading(true);
    try {
      // 生成新的随机助记词
      const mnemonic = ethersHelper.createMnemonic();
      // 派生第一个账户
      const derivedWallet = ethersHelper.createWalletFromMnemonic(mnemonic);
      const walletData = {
        name,
        address: derivedWallet.address,
        path: "m/44'/60'/0'/0/0",
        index: 0,
        createdAt: new Date().toISOString() // 添加创建时间
      };
      const newWallets = [walletData];
      // 保存钱包数据到本地存储
      const pwd = newPassword || password;
      storageService.saveWallets(newWallets, pwd);
      storageService.saveCurrentWalletIndex(0);
      // 保存助记词到localStorage
      storageService.saveMasterMnemonic(mnemonic, pwd);
      // 保存到IndexedDB
      await storageService.saveWalletsToDB(newWallets, pwd);
      await storageService.saveMasterMnemonicToDB(mnemonic, pwd);
      // 更新状态
      setWallets(newWallets);
      setMasterMnemonic(mnemonic);
      setCurrentWalletIndex(0);
      setHasWallets(true);
      if (newPassword) {
        setPassword(newPassword);
      }
      
      // 修复：创建钱包后不自动锁定，而是设置为解锁状态
      setIsLocked(false);
      setError(null);
      
      // 设置解锁标志，避免需要重新输入密码
      const timestamp = Date.now();
      const unlockToken = `${timestamp}:${derivedWallet.address.substring(2, 10)}`;
      const encodedToken = btoa(unlockToken);
      sessionStorage.setItem('wallet_is_unlocked', encodedToken);
      
      // 设置自动解锁令牌，包含加密的密码
      const encodedPassword = btoa(pwd);
      const autoUnlockToken = `${timestamp}:${encodedPassword}`;
      const encodedAutoUnlockToken = btoa(autoUnlockToken);
      sessionStorage.setItem('wallet_auto_unlock', encodedAutoUnlockToken);
      
      // 设置最后活动时间，避免自动锁定
      setLastActivity(Date.now());
      
      return {
        mnemonic,
        address: derivedWallet.address
      };
    } catch (error) {
      console.error('创建HD钱包失败:', error);
      setError('创建钱包失败: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 导入HD钱包(通过助记词)
  const importHDWalletByMnemonic = async (mnemonic, name, newPassword) => {
    setLoading(true);
    try {
      // 验证助记词
      if (!ethersHelper.validateMnemonic(mnemonic)) {
        setError('无效的助记词');
        return null;
      }
      
      // 派生第一个账户
      const derivedWallet = ethersHelper.createWalletFromMnemonic(mnemonic);
      const walletData = {
        name,
        address: derivedWallet.address,
        path: "m/44'/60'/0'/0/0",
        index: 0,
        createdAt: new Date().toISOString()
      };
      
      // 检查钱包是否已存在
      if (wallets.some(w => w.address.toLowerCase() === derivedWallet.address.toLowerCase())) {
        setError('钱包地址已存在');
        return null;
      }
      
      const newWallets = [walletData];
      const pwd = newPassword || password;
      
      if (!pwd) {
        setError('需要密码才能保存钱包');
        return null;
      }
      
      // 保存到localStorage (兼容)
      storageService.saveWallets(newWallets, pwd);
      storageService.saveCurrentWalletIndex(0);
      // 保存助记词到localStorage
      storageService.saveMasterMnemonic(mnemonic, pwd);
      
      // 保存到IndexedDB
      await storageService.saveWalletsToDB(newWallets, pwd);
      await storageService.saveMasterMnemonicToDB(mnemonic, pwd);
      
      // 更新状态
      setWallets(newWallets);
      setMasterMnemonic(mnemonic);
      setCurrentWalletIndex(0);
      setHasWallets(true);
      
      if (newPassword) {
        setPassword(newPassword);
      }
      
      // 设置解锁状态和标记
      setIsLocked(false);
      setError(null);
      
      // 设置解锁标志
      const timestamp = Date.now();
      const unlockToken = `${timestamp}:${derivedWallet.address.substring(2, 10)}`;
      const encodedToken = btoa(unlockToken);
      sessionStorage.setItem('wallet_is_unlocked', encodedToken);
      
      // 设置自动解锁令牌，包含加密的密码
      const encodedPassword = btoa(pwd);
      const autoUnlockToken = `${timestamp}:${encodedPassword}`;
      const encodedAutoUnlockToken = btoa(autoUnlockToken);
      sessionStorage.setItem('wallet_auto_unlock', encodedAutoUnlockToken);
      
      // 设置最后活动时间
      setLastActivity(Date.now());
      
      return walletData;
    } catch (error) {
      console.error('导入HD钱包失败:', error);
      setError('导入钱包失败: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 导入钱包(通过私钥)
  const importWalletByPrivateKey = async (privateKey, name, newPassword) => {
    setLoading(true);
    try {
      // 从私钥创建钱包
      const wallet = new ethers.Wallet(privateKey);
      const walletData = {
        name,
        address: wallet.address,
        privateKey: wallet.privateKey,
        isImported: true,
        createdAt: new Date().toISOString()
      };
      
      // 检查钱包是否已存在
      if (wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
        setError('钱包地址已存在');
        return null;
      }
      
      const newWallets = [...wallets, walletData];
      const pwd = newPassword || password;
      
      if (!pwd) {
        setError('需要密码才能保存钱包');
        return null;
      }
      
      // 保存到本地存储（兼容旧版）
      storageService.saveWallets(newWallets, pwd);
      storageService.saveCurrentWalletIndex(newWallets.length - 1);
      
      // 保存到IndexedDB
      await storageService.saveWalletsToDB(newWallets, pwd);
      
      // 如果是首次导入，设置密码
      if (newPassword && !password) {
        setPassword(newPassword);
      }
      
      // 更新状态
      setWallets(newWallets);
      setCurrentWalletIndex(newWallets.length - 1);
      setHasWallets(true);
      setError(null);
      
      // 导入成功后用新wallets刷新余额
      setTimeout(() => fetchBalances(newWallets), 500);
      
      return walletData;
    } catch (error) {
      console.error('导入钱包失败:', error);
      setError('导入钱包失败: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 添加新的派生账户
  const addDerivedAccount = async (name) => {
    if (!masterMnemonic) {
      setError('无法派生新账户：主助记词不可用');
      return null;
    }
    
    setLoading(true);
    try {
      // 查找当前使用的最高索引
      const maxIndex = wallets.reduce((max, wallet) => {
        if (wallet.index !== undefined && wallet.index > max) {
          return wallet.index;
        }
        return max;
      }, -1);
      
      const newIndex = maxIndex + 1;
      const path = `m/44'/60'/0'/0/${newIndex}`;
      
      // 派生新账户
      const derivedWallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, path);
      const walletData = {
        name: name || ethersHelper.createAccountName(newIndex, derivedWallet.address),
        address: derivedWallet.address,
        path,
        index: newIndex
      };
      
      const newWallets = [...wallets, walletData];
      
      // 保存到本地存储
      storageService.saveWallets(newWallets, password);
      // 同时保存到 IndexedDB
      await storageService.saveWalletsToDB(newWallets, password);
      
      // 更新当前选中的钱包索引为新添加的账户
      const selectedIndex = newWallets.length - 1;
      storageService.saveCurrentWalletIndex(selectedIndex);
      
      // 更新状态
      setWallets(newWallets);
      setCurrentWalletIndex(selectedIndex);
      setError(null);
      
      return walletData;
    } catch (error) {
      console.error('添加派生账户失败:', error);
      setError('添加派生账户失败: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 一次性添加多个派生账户
  const addMultipleDerivedAccounts = async (count) => {
    if (!masterMnemonic) {
      setError('无法派生新账户：主助记词不可用');
      return null;
    }
    
    setLoading(true);
    try {
      // 查找当前使用的最高索引
      const maxIndex = wallets.reduce((max, wallet) => {
        if (wallet.index !== undefined && wallet.index > max) {
          return wallet.index;
        }
        return max;
      }, -1);
      
      const startIndex = maxIndex + 1;
      const newWallets = [...wallets];
      
      // 批量派生新账户
      for (let i = 0; i < count; i++) {
        const currentIndex = startIndex + i;
        const path = `m/44'/60'/0'/0/${currentIndex}`;
        
        // 派生新账户
        const derivedWallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, path);
        const walletData = {
          name: ethersHelper.createAccountName(currentIndex, derivedWallet.address),
          address: derivedWallet.address,
          path,
          index: currentIndex
        };
        
        newWallets.push(walletData);
      }
      
      // 保存到本地存储
      storageService.saveWallets(newWallets, password);
      // 同时保存到 IndexedDB
      await storageService.saveWalletsToDB(newWallets, password);
      
      // 更新当前选中的钱包索引(可选)
      const lastAddedIndex = newWallets.length - 1;
      storageService.saveCurrentWalletIndex(lastAddedIndex);
      
      // 更新状态
      setWallets(newWallets);
      setCurrentWalletIndex(lastAddedIndex);
      setError(null);
      
      return newWallets.slice(maxIndex + 1);
    } catch (error) {
      console.error('批量添加派生账户失败:', error);
      setError('批量添加派生账户失败: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 切换钱包
  const switchWallet = (index) => {
    if (index >= 0 && index < wallets.length) {
      setCurrentWalletIndex(index);
      storageService.saveCurrentWalletIndex(index);
      // 不再刷新页面，而是通过状态更新来处理切换
      // 触发余额更新
      setTimeout(() => fetchBalances(), 500);
      return true;
    }
    setError('无效的钱包索引');
    return false;
  };

  // 切换网络
  const switchNetwork = (networkId) => {
    if (networks[networkId]) {
      try {
        // 先更新provider
        const newProvider = blockchainService.updateProvider(networkId);
        setProvider(newProvider);
        // 然后设置状态和存储
        setCurrentNetwork(networkId);
        storageService.saveCurrentNetwork(networkId);
        // 获取新网络的代币列表
        const tokensList = storageService.getTokens(networkId);
        setTokens(tokensList);
        // 触发余额更新
        setTimeout(() => fetchBalances(), 500);
        // 如果需要彻底对齐MetaMask体验，可以刷新页面
        // window.location.reload();
        return true;
      } catch (error) {
        console.error('切换网络失败:', error);
        setError(`切换网络失败: ${error.message}`);
        return false;
      }
    }
    setError(`网络 ${networkId} 不存在`);
    return false;
  };

  // 添加自定义网络
  const addCustomNetwork = (networkId, networkConfig) => {
    if (networks[networkId]) {
      setError(`网络 ${networkId} 已存在`);
      return false;
    }
    
    // 验证网络配置是否有必要的字段
    if (!networkConfig.name || !networkConfig.url || !networkConfig.chainId) {
      setError('网络配置不完整');
      return false;
    }
    
    const updatedNetworks = {
      ...networks,
      [networkId]: networkConfig
    };
    
    // 保存到本地存储
    storageService.saveNetworks(updatedNetworks);
    setNetworks(updatedNetworks);
    
    // 可选：自动切换到新添加的网络
    switchNetwork(networkId);
    
    message.success(`已添加网络: ${networkConfig.name}`);
    setError(null);
    return true;
  };

  // sendTransaction 修复
  const sendTransaction = async (toAddress, amount, options = {}) => {
    if (isLocked || !masterMnemonic) {
      throw new Error('钱包已锁定或未初始化');
    }
    if (!toAddress || !amount) {
      throw new Error('缺少必要参数');
    }
    try {
      setLoading(true);
      const currentWallet = wallets[currentWalletIndex];
      if (!currentWallet) {
        throw new Error('当前钱包不可用');
      }
      let wallet;
      if (currentWallet.privateKey) {
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else {
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, currentWallet.path);
      }
      const connectedWallet = wallet.connect(provider);
      const txOptions = { ...options };
      const response = await ethersHelper.sendTransaction(connectedWallet, toAddress, amount, txOptions);
      if (response) {
        const transaction = {
          hash: response.hash,
          from: currentWallet.address.toLowerCase(),
          to: toAddress.toLowerCase(),
          amount,
          value: amount,
          symbol: 'ETH',
          timestamp: Date.now(),
          status: 'pending',
          type: 'send',
          gasPrice: options.gasPrice || ethers.utils.formatUnits(response.gasPrice, 'gwei'),
          gasLimit: options.gasLimit || response.gasLimit.toString(),
          nonce: response.nonce,
          networkId: currentNetwork
        };
        storageService.addTransactionToHistory(transaction, currentWallet.address, currentNetwork);
        setPendingTransactions(prev => [...prev, transaction]);
        // 新增：如果to地址属于本地钱包，也为其添加一条receive类型交易
        const localReceiver = wallets.find(w => w.address.toLowerCase() === toAddress.toLowerCase());
        if (localReceiver) {
          const receiveTx = {
            ...transaction,
            type: 'receive',
            to: localReceiver.address.toLowerCase(),
            from: currentWallet.address.toLowerCase(),
            status: 'pending',
          };
          storageService.addTransactionToHistory(receiveTx, localReceiver.address, currentNetwork);
        }
        response.wait(1).then(receipt => {
          const status = receipt.status === 1 ? 'confirmed' : 'failed';
          const confirmedTx = { ...transaction, status, blockNumber: receipt.blockNumber };
          storageService.addTransactionToHistory(confirmedTx, currentWallet.address, currentNetwork);
          setPendingTransactions(prev => prev.filter(tx => tx.hash !== response.hash));
          emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
            hash: response.hash,
            status,
            receipt,
            walletAddresses: [currentWallet.address.toLowerCase()],
            networkId: currentNetwork
          });
          fetchBalances();
          // 同步更新接收方的交易状态
          if (localReceiver) {
            const confirmedReceiveTx = { ...confirmedTx, type: 'receive', to: localReceiver.address.toLowerCase(), from: currentWallet.address.toLowerCase() };
            storageService.addTransactionToHistory(confirmedReceiveTx, localReceiver.address, currentNetwork);
            emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
              hash: response.hash,
              status,
              receipt,
              walletAddresses: [localReceiver.address.toLowerCase()],
              networkId: currentNetwork
            });
          }
        }).catch(error => {
          const failedTx = { ...transaction, status: 'failed', error: error.message };
          storageService.addTransactionToHistory(failedTx, currentWallet.address, currentNetwork);
          setPendingTransactions(prev => prev.filter(tx => tx.hash !== response.hash));
          emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
            hash: response.hash,
            status: 'failed',
            error: error.message,
            walletAddresses: [currentWallet.address.toLowerCase()],
            networkId: currentNetwork
          });
          // 同步更新接收方的交易状态
          if (localReceiver) {
            const failedReceiveTx = { ...failedTx, type: 'receive', to: localReceiver.address.toLowerCase(), from: currentWallet.address.toLowerCase() };
            storageService.addTransactionToHistory(failedReceiveTx, localReceiver.address, currentNetwork);
            emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
              hash: response.hash,
              status: 'failed',
              error: error.message,
              walletAddresses: [localReceiver.address.toLowerCase()],
              networkId: currentNetwork
            });
          }
        });
        return response;
      }
    } catch (error) {
      try {
        const currentWallet = wallets[currentWalletIndex];
        if (currentWallet) {
          const failedTx = {
            hash: '',
            from: currentWallet.address.toLowerCase(),
            to: toAddress.toLowerCase(),
            amount,
            value: amount,
            symbol: 'ETH',
            timestamp: Date.now(),
            status: 'failed',
            type: 'send',
            error: error.message,
            networkId: currentNetwork
          };
          storageService.addTransactionToHistory(failedTx, currentWallet.address, currentNetwork);
          // 新增：接收方也写入失败记录
          const localReceiver = wallets.find(w => w.address.toLowerCase() === toAddress.toLowerCase());
          if (localReceiver) {
            const failedReceiveTx = { ...failedTx, type: 'receive', to: localReceiver.address.toLowerCase(), from: currentWallet.address.toLowerCase() };
            storageService.addTransactionToHistory(failedReceiveTx, localReceiver.address, currentNetwork);
          }
        }
      } catch (e) {}
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 获取当前钱包
  const getCurrentWallet = () => {
    if (!isLocked && wallets.length > 0 && currentWalletIndex < wallets.length) {
      return wallets[currentWalletIndex];
    }
    return null;
  };

  // 获取当前网络配置
  const getCurrentNetworkConfig = () => {
    return networks[currentNetwork];
  };

  // 获取当前余额
  const getCurrentWalletBalance = () => {
    const wallet = getCurrentWallet();
    if (wallet) {
      return accountBalances[wallet.address] || '0';
    }
    return '0';
  };

  // 更新钱包名称
  const updateWalletName = (index, newName) => {
    if (index >= 0 && index < wallets.length) {
      const newWallets = [...wallets];
      newWallets[index] = {
        ...newWallets[index],
        name: newName
      };
      
      setWallets(newWallets);
      storageService.saveWallets(newWallets, password);
      setError(null);
      return true;
    }
    setError('无效的钱包索引');
    return false;
  };

  // 删除钱包
  const deleteWallet = (index) => {
    try {
      if (index < 0 || index >= wallets.length) {
        throw new Error('无效的钱包索引');
      }
      
      // 不允许删除最后一个钱包
      if (wallets.length === 1) {
        throw new Error('无法删除最后一个钱包账户');
      }

      // 创建新的钱包数组，排除要删除的钱包
      const updatedWallets = wallets.filter((_, i) => i !== index);
      
      // 更新当前钱包索引
      let newIndex = currentWalletIndex;
      if (index === currentWalletIndex) {
        // 如果删除的是当前钱包，切换到第一个钱包
        newIndex = 0;
      } else if (index < currentWalletIndex) {
        // 如果删除的钱包索引小于当前钱包索引，当前索引需要减1
        newIndex = currentWalletIndex - 1;
      }
      
      // 更新状态
      setWallets(updatedWallets);
      setCurrentWalletIndex(newIndex);
      
      // 保存到存储
      storageService.saveWalletsToDB(updatedWallets, password);
      storageService.setCurrentWalletIndex(newIndex);
      
      // 触发事件
      emitter.current.emit(EVENTS.ACCOUNT_CHANGED, {
        address: updatedWallets[newIndex].address,
        index: newIndex
      });
      
      // 重新获取余额
      setTimeout(() => fetchBalances(updatedWallets), 500);
      
      message.success('账户已删除');
      return true;
    } catch (error) {
      console.error('删除钱包失败:', error);
      message.error(error.message || '删除钱包失败');
      return false;
    }
  };

  // 重置钱包（清除所有钱包数据）
  const resetWallet = async () => {
    try {
      // 设置加载状态
      setLoading(true);
      
      // 清除钱包数据
      await storageService.clearAllData();
      
      // 重置状态
      setWallets([]);
      setCurrentWalletIndex(0);
      setMasterMnemonic(null);
      setPassword('');
      setIsLocked(true);
      setHasWallets(false);
      setAccountBalances({});
      setPendingTransactions([]);
      setError(null);
      
      // 结束加载状态
      setLoading(false);
      return true;
    } catch (error) {
      console.error('重置钱包失败:', error);
      setError('重置钱包失败: ' + error.message);
      // 结束加载状态
      setLoading(false);
      return false;
    }
  };

  // 备份钱包（导出助记词）
  const backupWallet = async (inputPassword) => {
    try {
      // 验证密码
      if (inputPassword !== password) {
        setError('密码错误');
        return null;
      }
      
      // 返回助记词
      return masterMnemonic;
    } catch (error) {
      console.error('备份钱包失败:', error);
      setError('备份钱包失败: ' + error.message);
      return null;
    }
  };

  // 移除代币
  const removeToken = (tokenAddress) => {
    try {
      // 获取当前网络的代币列表
      const networkTokens = storageService.getTokens(currentNetwork);
      
      // 过滤掉要移除的代币
      const updatedTokens = networkTokens.filter(
        token => token.address.toLowerCase() !== tokenAddress.toLowerCase()
      );
      
      // 保存更新后的代币列表
      storageService.saveTokens(updatedTokens, currentNetwork);
      
      // 更新状态
      setTokens(updatedTokens);
      
      // 如果当前选中的代币被移除，清除选择
      if (selectedToken && selectedToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
        setSelectedToken(null);
      }
      
      return true;
    } catch (error) {
      console.error('移除代币失败:', error);
      setError(`移除代币失败: ${error.message}`);
      return false;
    }
  };
  
  // 发送代币交易
  const sendTokenTransaction = async (tokenAddress, toAddress, amount, options = {}) => {
    if (isLocked || !masterMnemonic) {
      throw new Error('钱包已锁定或未初始化');
    }
    if (!tokenAddress || !toAddress || !amount) {
      throw new Error('缺少必要参数');
    }
    try {
      setLoading(true);
      const currentWallet = wallets[currentWalletIndex];
      if (!currentWallet) {
        throw new Error('当前钱包不可用');
      }
      let wallet;
      if (currentWallet.privateKey) {
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else {
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, currentWallet.path);
      }
      const connectedWallet = wallet.connect(provider);
      const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!token) {
        throw new Error('代币信息不可用');
      }
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function transfer(address to, uint256 value) returns (bool)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ],
        connectedWallet
      );
      const decimals = token.decimals || await tokenContract.decimals();
      const tokenAmount = ethers.utils.parseUnits(amount.toString(), decimals);
      const txOptions = {};
      if (options.gasPrice) {
        txOptions.gasPrice = ethers.utils.parseUnits(options.gasPrice, 'gwei');
      }
      if (options.gasLimit) {
        txOptions.gasLimit = ethers.BigNumber.from(options.gasLimit);
      }
      const response = await tokenContract.transfer(toAddress, tokenAmount, txOptions);
      if (response) {
        const transaction = {
          hash: response.hash,
          from: currentWallet.address,
          to: toAddress,
          amount,
          tokenAddress,
          tokenSymbol: token.symbol,
          symbol: token.symbol,
          timestamp: Date.now(),
          status: 'pending',
          type: 'send',
          gasPrice: options.gasPrice || ethers.utils.formatUnits(response.gasPrice, 'gwei'),
          gasLimit: options.gasLimit || response.gasLimit.toString(),
          nonce: response.nonce,
          networkId: currentNetwork
        };
        storageService.addTokenTransactionToHistory(
          transaction,
          currentWallet.address,
          tokenAddress,
          currentNetwork
        );
        setPendingTransactions(prev => [...prev, transaction]);
        // 新增：如果to地址属于本地钱包，也为其添加一条receive类型交易
        const localReceiver = wallets.find(w => w.address.toLowerCase() === toAddress.toLowerCase());
        if (localReceiver) {
          const receiveTx = {
            ...transaction,
            type: 'receive',
            to: localReceiver.address,
            from: currentWallet.address,
            status: 'pending',
          };
          storageService.addTokenTransactionToHistory(
            receiveTx,
            localReceiver.address,
            tokenAddress,
            currentNetwork
          );
        }
        response.wait(1).then(receipt => {
          const status = receipt.status === 1 ? 'confirmed' : 'failed';
          const confirmedTx = { ...transaction, status, blockNumber: receipt.blockNumber };
          storageService.addTokenTransactionToHistory(
            confirmedTx,
            currentWallet.address,
            tokenAddress,
            currentNetwork
          );
          setPendingTransactions(prev => prev.filter(tx => tx.hash !== response.hash));
          emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
            hash: response.hash,
            status,
            receipt,
            tokenAddress,
            walletAddresses: [currentWallet.address.toLowerCase()],
            networkId: currentNetwork
          });
          fetchTokenBalances();
          // 同步更新接收方的交易状态
          if (localReceiver) {
            const confirmedReceiveTx = { ...confirmedTx, type: 'receive', to: localReceiver.address, from: currentWallet.address };
            storageService.addTokenTransactionToHistory(
              confirmedReceiveTx,
              localReceiver.address,
              tokenAddress,
              currentNetwork
            );
            emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
              hash: response.hash,
              status,
              receipt,
              tokenAddress,
              walletAddresses: [localReceiver.address.toLowerCase()],
              networkId: currentNetwork
            });
          }
        }).catch(error => {
          const failedTx = { ...transaction, status: 'failed', error: error.message };
          storageService.addTokenTransactionToHistory(
            failedTx,
            currentWallet.address,
            tokenAddress,
            currentNetwork
          );
          setPendingTransactions(prev => prev.filter(tx => tx.hash !== response.hash));
          emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
            hash: response.hash,
            status: 'failed',
            error: error.message,
            tokenAddress,
            walletAddresses: [currentWallet.address.toLowerCase()],
            networkId: currentNetwork
          });
          // 同步更新接收方的交易状态
          if (localReceiver) {
            const failedReceiveTx = { ...failedTx, type: 'receive', to: localReceiver.address, from: currentWallet.address };
            storageService.addTokenTransactionToHistory(
              failedReceiveTx,
              localReceiver.address,
              tokenAddress,
              currentNetwork
            );
            emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
              hash: response.hash,
              status: 'failed',
              error: error.message,
              tokenAddress,
              walletAddresses: [localReceiver.address.toLowerCase()],
              networkId: currentNetwork
            });
          }
        });
        return response;
      }
    } catch (error) {
      try {
        const currentWallet = wallets[currentWalletIndex];
        if (currentWallet) {
          const failedTx = {
            hash: '',
            from: currentWallet.address,
            to: toAddress,
            amount,
            tokenAddress,
            tokenSymbol: '',
            symbol: '',
            timestamp: Date.now(),
            status: 'failed',
            type: 'send',
            error: error.message,
            networkId: currentNetwork
          };
          storageService.addTokenTransactionToHistory(
            failedTx,
            currentWallet.address,
            tokenAddress,
            currentNetwork
          );
          // 新增：接收方也写入失败记录
          const localReceiver = wallets.find(w => w.address.toLowerCase() === toAddress.toLowerCase());
          if (localReceiver) {
            const failedReceiveTx = { ...failedTx, type: 'receive', to: localReceiver.address, from: currentWallet.address };
            storageService.addTokenTransactionToHistory(
              failedReceiveTx,
              localReceiver.address,
              tokenAddress,
              currentNetwork
            );
          }
        }
      } catch (e) {}
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // 获取当前钱包的代币余额
  const getCurrentWalletTokenBalances = () => {
    const wallet = getCurrentWallet();
    if (wallet && tokenBalances[wallet.address]) {
      return tokenBalances[wallet.address];
    }
    return {};
  };
  
  // 获取特定代币的余额
  const getTokenBalance = (tokenAddress) => {
    const wallet = getCurrentWallet();
    if (wallet && tokenBalances[wallet.address] && tokenBalances[wallet.address][tokenAddress]) {
      return tokenBalances[wallet.address][tokenAddress].formatted;
    }
    return '0';
  };
  
  // 切换网络时更新代币列表
  useEffect(() => {
    // 加载当前网络的代币列表
    const networkTokens = storageService.getTokens(currentNetwork);
    setTokens(networkTokens);
    
    // 清除选中的代币
    setSelectedToken(null);
  }, [currentNetwork]);

  // 自动刷新余额：监听账户、索引、网络变化
  useEffect(() => {
    if (wallets.length > 0 && !isLocked) {
      fetchBalances();
    }
  }, [wallets, currentWalletIndex, isLocked, currentNetwork]);

  // 导出单个账户的私钥
  const exportPrivateKey = async (walletIndex, inputPassword) => {
    try {
      // 验证密码
      if (!inputPassword) {
        throw new Error('请输入密码');
      }
      
      // 验证密码是否正确
      if (inputPassword !== password) {
        throw new Error('密码错误');
      }
      
      // 验证钱包索引
      if (walletIndex < 0 || walletIndex >= wallets.length) {
        throw new Error('无效的钱包索引');
      }
      
      const targetWallet = wallets[walletIndex];
      
      // 获取私钥
      let privateKey;
      if (targetWallet.fromPrivateKey) {
        // 如果是通过私钥导入的钱包，直接返回存储的私钥
        privateKey = targetWallet.privateKey;
      } else if (masterMnemonic) {
        // 如果是通过助记词派生的钱包，从助记词派生私钥
        const path = targetWallet.path || `m/44'/60'/0'/0/${targetWallet.index || 0}`;
        const wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, path);
        privateKey = wallet.privateKey;
      } else {
        throw new Error('无法导出私钥，助记词不可用');
      }
      
      return privateKey;
    } catch (error) {
      console.error('导出私钥失败:', error);
      throw error;
    }
  };

  // 获取代币价格信息
  const fetchTokenPrices = async (tokenAddresses = []) => {
    try {
      if (!tokenAddresses || tokenAddresses.length === 0) {
        // 如果没有提供代币地址，则获取所有代币的价格
        tokenAddresses = tokens.map(token => token.address);
      }
      
      // 过滤掉ETH，因为我们会单独处理
      tokenAddresses = tokenAddresses.filter(addr => addr.toLowerCase() !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
      
      if (tokenAddresses.length === 0) {
        return {};
      }
      
      // 调用区块链服务获取代币价格
      const prices = await blockchainService.getTokenPrices(tokenAddresses);
      return prices;
    } catch (error) {
      console.error('获取代币价格失败:', error);
      return {};
    }
  };

  // 更新代币余额和价格信息
  const updateTokensWithPrices = async () => {
    try {
      // 首先获取代币余额
      await fetchTokenBalances();
      
      // 获取所有代币的价格
      const tokenAddresses = tokens.map(token => token.address);
      const prices = await fetchTokenPrices(tokenAddresses);
      
      // 更新代币列表，添加价格信息
      const updatedTokens = tokens.map(token => {
        const price = prices[token.address.toLowerCase()];
        if (price) {
          return {
            ...token,
            price: price.usd,
            priceChangePercentage24h: price.usd_24h_change
          };
        }
        return token;
      });
      
      setTokens(updatedTokens);
      
      // 更新代币余额的美元价值
      const currentWallet = getCurrentWallet();
      if (currentWallet && tokenBalances[currentWallet.address]) {
        const walletTokens = tokenBalances[currentWallet.address];
        const updatedWalletTokens = {};
        
        for (const [tokenAddr, tokenData] of Object.entries(walletTokens)) {
          const price = prices[tokenAddr.toLowerCase()];
          if (price) {
            updatedWalletTokens[tokenAddr] = {
              ...tokenData,
              usdBalance: parseFloat(tokenData.balance) * price.usd
            };
          } else {
            updatedWalletTokens[tokenAddr] = tokenData;
          }
        }
        
        const newTokenBalances = {
          ...tokenBalances,
          [currentWallet.address]: updatedWalletTokens
        };
        
        setTokenBalances(newTokenBalances);
      }
      
      // 更新ETH余额的美元价值
      try {
        const ethPrice = await blockchainService.getEthPrice();
        if (ethPrice) {
          // 更新所有钱包的ETH美元价值
          const updatedAccountBalances = {};
          
          for (const [addr, balance] of Object.entries(accountBalances)) {
            updatedAccountBalances[addr] = {
              balance,
              usdBalance: parseFloat(balance) * ethPrice.usd
            };
          }
          
          setAccountBalances(updatedAccountBalances);
        }
      } catch (ethPriceError) {
        console.error('获取ETH价格失败:', ethPriceError);
      }
      
      return true;
    } catch (error) {
      console.error('更新代币价格失败:', error);
      return false;
    }
  };

  // 定期更新代币价格
  useEffect(() => {
    if (!isLocked && wallets.length > 0) {
      // 初始更新
      updateTokensWithPrices();
      
      // 设置定时更新，每5分钟更新一次
      const priceUpdateInterval = setInterval(() => {
        updateTokensWithPrices();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(priceUpdateInterval);
    }
  }, [isLocked, wallets.length, currentNetwork]);

  // 检查网络状态
  const checkNetworkStatus = async () => {
    try {
      const startTime = Date.now();
      
      // 获取当前区块号来测试网络连接
      const blockNumber = await provider.getBlockNumber();
      
      // 计算延迟
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      setNetworkStatus({
        isConnected: true,
        latency,
        blockHeight: blockNumber,
        lastChecked: endTime
      });
      
      return {
        isConnected: true,
        latency,
        blockHeight: blockNumber,
        lastChecked: endTime
      };
    } catch (error) {
      console.error('检查网络状态失败:', error);
      
      setNetworkStatus({
        isConnected: false,
        latency: 0,
        blockHeight: networkStatus.blockHeight,
        lastChecked: Date.now()
      });
      
      return {
        isConnected: false,
        latency: 0,
        blockHeight: networkStatus.blockHeight,
        lastChecked: Date.now()
      };
    }
  };

  // 定期检查网络状态
  useEffect(() => {
    if (provider && !isLocked) {
      // 初始检查
      checkNetworkStatus();
      
      // 设置定时检查，每30秒检查一次
      networkCheckInterval.current = setInterval(() => {
        checkNetworkStatus();
      }, 30 * 1000);
      
      return () => {
        if (networkCheckInterval.current) {
          clearInterval(networkCheckInterval.current);
        }
      };
    }
  }, [provider, isLocked, currentNetwork]);

  // 监听网络变化
  useEffect(() => {
    if (provider) {
      const handleNetworkChange = (newNetwork) => {
        console.log('网络变化:', newNetwork);
        
        // 更新网络状态
        checkNetworkStatus();
        
        // 触发网络变化事件
        emitter.current.emit(EVENTS.NETWORK_CHANGED, newNetwork);
      };
      
      // 监听网络变化事件
      provider.on('network', handleNetworkChange);
      
      return () => {
        provider.off('network', handleNetworkChange);
      };
    }
  }, [provider]);

  /**
   * 加速交易 - 通过增加gas价格重新发送交易
   * @param {string} txHash - 要加速的交易哈希
   * @param {number} speedUpPercentage - 加速百分比，默认为30%
   * @returns {Promise<Object>} 新交易的结果
   */
  const speedUpTransaction = async (txHash, speedUpPercentage = 30) => {
    try {
      setLoading(true);
      
      // 获取原始交易
      const tx = await blockchainService.getTransaction(txHash);
      if (!tx) {
        throw new Error('交易不存在');
      }
      
      // 检查交易是否已确认
      const receipt = await blockchainService.getTransactionReceipt(txHash);
      if (receipt && receipt.confirmations > 0) {
        throw new Error('交易已确认，无法加速');
      }
      
      // 获取当前钱包
      const currentWallet = getCurrentWallet();
      if (!currentWallet) {
        throw new Error('未找到当前钱包');
      }
      
      // 获取钱包实例
      const wallet = await ethersHelper.getWalletWithProvider(
        masterMnemonic, 
        currentWallet.path || `m/44'/60'/0'/0/${currentWallet.index || 0}`,
        provider
      );
      
      // 计算新的gas价格 (增加指定百分比)
      const originalGasPrice = tx.gasPrice;
      const increaseFactor = 1 + (speedUpPercentage / 100);
      const newGasPrice = originalGasPrice.mul(Math.floor(increaseFactor * 100)).div(100);
      
      // 创建新的交易对象
      const newTx = {
        to: tx.to,
        from: tx.from,
        nonce: tx.nonce, // 使用相同的nonce以替换原交易
        value: tx.value,
        data: tx.data,
        gasLimit: tx.gasLimit,
        gasPrice: newGasPrice,
        chainId: tx.chainId
      };
      
      // 发送交易
      const response = await wallet.sendTransaction(newTx);
      
      // 更新待处理交易列表
      const updatedPendingTxs = pendingTransactions.map(pendingTx => {
        if (pendingTx.hash === txHash) {
          return {
            ...pendingTx,
            replacedBy: response.hash,
            status: 'replaced',
            speedUp: true
          };
        }
        return pendingTx;
      });
      
      // 添加新的加速交易
      const newPendingTx = {
        hash: response.hash,
        from: response.from,
        to: response.to,
        value: ethers.utils.formatEther(response.value),
        nonce: response.nonce,
        gasPrice: ethers.utils.formatUnits(response.gasPrice, 'gwei'),
        gasLimit: response.gasLimit.toString(),
        timestamp: Date.now(),
        status: 'pending',
        isSpeedUp: true,
        originalTx: txHash
      };
      
      setPendingTransactions([...updatedPendingTxs, newPendingTx]);
      
      // 保存到存储
      storageService.savePendingTransactions([...updatedPendingTxs, newPendingTx]);
      
      // 触发事件
      emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
        action: 'speedup',
        originalTxHash: txHash,
        newTxHash: response.hash
      });
      
      setLoading(false);
      return response;
    } catch (error) {
      console.error('加速交易失败:', error);
      setError(error.message || '加速交易失败');
      setLoading(false);
      throw error;
    }
  };

  /**
   * 取消交易 - 通过发送0值交易到自己的地址来替换交易
   * @param {string} txHash - 要取消的交易哈希
   * @param {number} cancelPercentage - gas价格增加百分比，默认为30%
   * @returns {Promise<Object>} 新交易的结果
   */
  const cancelTransaction = async (txHash, cancelPercentage = 30) => {
    try {
      setLoading(true);
      
      // 获取原始交易
      const tx = await blockchainService.getTransaction(txHash);
      if (!tx) {
        throw new Error('交易不存在');
      }
      
      // 检查交易是否已确认
      const receipt = await blockchainService.getTransactionReceipt(txHash);
      if (receipt && receipt.confirmations > 0) {
        throw new Error('交易已确认，无法取消');
      }
      
      // 获取当前钱包
      const currentWallet = getCurrentWallet();
      if (!currentWallet) {
        throw new Error('未找到当前钱包');
      }
      
      // 获取钱包实例
      const wallet = await ethersHelper.getWalletWithProvider(
        masterMnemonic, 
        currentWallet.path || `m/44'/60'/0'/0/${currentWallet.index || 0}`,
        provider
      );
      
      // 计算新的gas价格 (增加指定百分比)
      const originalGasPrice = tx.gasPrice;
      const increaseFactor = 1 + (cancelPercentage / 100);
      const newGasPrice = originalGasPrice.mul(Math.floor(increaseFactor * 100)).div(100);
      
      // 创建取消交易 (发送0 ETH到自己的地址)
      const cancelTx = {
        to: wallet.address, // 发送给自己
        from: wallet.address,
        nonce: tx.nonce, // 使用相同的nonce以替换原交易
        value: ethers.constants.Zero, // 0 ETH
        gasLimit: tx.gasLimit,
        gasPrice: newGasPrice,
        chainId: tx.chainId,
        data: '0x' // 空数据
      };
      
      // 发送交易
      const response = await wallet.sendTransaction(cancelTx);
      
      // 更新待处理交易列表
      const updatedPendingTxs = pendingTransactions.map(pendingTx => {
        if (pendingTx.hash === txHash) {
          return {
            ...pendingTx,
            replacedBy: response.hash,
            status: 'cancelled',
            cancelled: true
          };
        }
        return pendingTx;
      });
      
      // 添加新的取消交易
      const newPendingTx = {
        hash: response.hash,
        from: response.from,
        to: response.to,
        value: '0',
        nonce: response.nonce,
        gasPrice: ethers.utils.formatUnits(response.gasPrice, 'gwei'),
        gasLimit: response.gasLimit.toString(),
        timestamp: Date.now(),
        status: 'pending',
        isCancelTx: true,
        originalTx: txHash
      };
      
      setPendingTransactions([...updatedPendingTxs, newPendingTx]);
      
      // 保存到存储
      storageService.savePendingTransactions([...updatedPendingTxs, newPendingTx]);
      
      // 触发事件
      emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
        action: 'cancel',
        originalTxHash: txHash,
        newTxHash: response.hash
      });
      
      setLoading(false);
      return response;
    } catch (error) {
      console.error('取消交易失败:', error);
      setError(error.message || '取消交易失败');
      setLoading(false);
      throw error;
    }
  };

  /**
   * 添加事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} handler 处理函数
   */
  const on = useCallback((eventName, handler) => {
    if (emitter.current) {
      emitter.current.on(eventName, handler);
    }
  }, []);

  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} handler 处理函数
   */
  const off = useCallback((eventName, handler) => {
    if (emitter.current) {
      emitter.current.off(eventName, handler);
    }
  }, []);

  // 返回上下文值
  const contextValue = {
    isInitialized,
    isLocked,
    hasWallets,
    wallets,
    currentWalletIndex,
    currentNetwork,
    networks,
    provider,
    error,
    loading,
    accountBalances,
    pendingTransactions,
    dappRequest,
    requestModalVisible,
    tokenBalances,
    tokens,
    selectedToken,
    networkStatus,
    EVENTS,
    lock,
    unlock,
    createHDWallet,
    importHDWalletByMnemonic,
    importWalletByPrivateKey,
    addDerivedAccount,
    addMultipleDerivedAccounts,
    switchWallet,
    switchNetwork,
    addCustomNetwork,
    sendTransaction,
    getCurrentWallet,
    getCurrentNetworkConfig,
    getCurrentWalletBalance,
    updateWalletName,
    deleteWallet,
    resetWallet,
    backupWallet,
    addToken,
    removeToken,
    sendTokenTransaction,
    setSelectedToken,
    getCurrentWalletTokenBalances,
    getTokenBalance,
    setDappRequest,
    setRequestModalVisible,
    registerDappRequestHandler,
    exportPrivateKey,
    fetchTokenPrices,
    updateTokensWithPrices,
    checkNetworkStatus,
    speedUpTransaction,
    cancelTransaction,
    on,
    off,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// 自定义钩子，方便使用上下文
export const useWallet = () => useContext(WalletContext); 
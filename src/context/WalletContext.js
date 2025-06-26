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

  // 更新账户余额
  const fetchBalances = async () => {
    if (isLocked || wallets.length === 0 || !provider) {
      return;
    }
    try {
      console.log(`正在更新余额... 当前网络: ${currentNetwork}`);
      // 创建一个新的余额对象，而不是基于之前的余额
      const newBalances = {};
      let updated = false;
      for (const wallet of wallets) {
        try {
          console.log(`获取地址 ${wallet.address} 的余额`);
          // 确保使用正确的provider
          const balance = await blockchainService.getEthBalance(wallet.address);
          console.log(`地址 ${wallet.address} 余额: ${balance}`);
          // 始终更新余额，不再与之前的余额比较
          newBalances[wallet.address] = balance;
          updated = true;
        } catch (error) {
          console.error(`获取地址 ${wallet.address} 余额失败:`, error);
        }
      }
      if (updated) {
        console.log('余额更新完成:', newBalances);
        setAccountBalances(newBalances);
      }
      // 获取代币余额
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
      const wallet = ethersHelper.createWalletFromPrivateKey(privateKey);
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
      // 注意：此时钱包仍然处于锁定状态，直到用户完成备份和验证助记词
      setError(null);
      
      // 导入成功后自动刷新余额
      setTimeout(() => fetchBalances(), 500);
      
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
      console.log('======= WalletContext.sendTransaction 开始 =======');
      setLoading(true);
      const currentWallet = wallets[currentWalletIndex];
      if (!currentWallet) {
        throw new Error('当前钱包不可用');
      }
      
      console.log('当前钱包信息:', {
        address: currentWallet.address,
        path: currentWallet.path,
        index: currentWalletIndex
      });
      
      // 检查网络连接
      console.log('当前网络ID:', currentNetwork);
      console.log('网络配置:', networks[currentNetwork]);
      
      // 创建钱包实例
      let wallet;
      if (currentWallet.privateKey) {
        // 私钥导入账户
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else {
        // 助记词派生账户
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, currentWallet.path);
      }
      console.log('创建的钱包地址:', wallet.address);
      console.log('是否与当前钱包地址匹配:', wallet.address.toLowerCase() === currentWallet.address.toLowerCase());
      
      // 连接到provider
      console.log('Provider信息:', provider ? {
        url: provider.connection?.url,
        network: await provider.getNetwork().catch(e => ({ error: e.message }))
      } : 'Provider未初始化');
      
      const connectedWallet = wallet.connect(provider);
      console.log('已连接Provider的钱包:', connectedWallet.address);
      
      // 准备交易选项
      const txOptions = { ...options };
      console.log('传递给ethersHelper的选项:', txOptions);
      
      // 发送交易
      console.log('即将发送交易...');
      const response = await ethersHelper.sendTransaction(connectedWallet, toAddress, amount, txOptions);
      console.log('交易发送成功:', response.hash);
      
      // 立即保存 pending 交易
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
      
      // 监听交易确认
      console.log('等待交易确认...');
      response.wait(1).then(receipt => {
        const status = receipt.status === 1 ? 'confirmed' : 'failed';
        console.log('交易已确认:', status, receipt);
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
      }).catch(error => {
        // 保存失败记录
        console.error('交易确认失败:', error);
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
      });
      
      console.log('======= WalletContext.sendTransaction 完成 =======');
      return response;
    } catch (error) {
      // 交易失败也要保存记录
      console.error('======= WalletContext.sendTransaction 错误 =======', error);
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
        }
      } catch (e) {
        console.error('保存失败交易记录时出错:', e);
      }
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
    if (index >= 0 && index < wallets.length) {
      const newWallets = wallets.filter((_, i) => i !== index);
      setWallets(newWallets);
      
      // 如果删除的是当前钱包，则切换到第一个钱包
      if (index === currentWalletIndex) {
        setCurrentWalletIndex(0);
        storageService.saveCurrentWalletIndex(0);
      } 
      // 如果删除的钱包索引小于当前索引，需要调整当前索引
      else if (index < currentWalletIndex) {
        const newIndex = currentWalletIndex - 1;
        setCurrentWalletIndex(newIndex);
        storageService.saveCurrentWalletIndex(newIndex);
      }
      
      storageService.saveWallets(newWallets, password);
      setError(null);
      return true;
    }
    setError('无效的钱包索引');
    return false;
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
      
      // 获取当前钱包
      const currentWallet = wallets[currentWalletIndex];
      if (!currentWallet) {
        throw new Error('当前钱包不可用');
      }
      
      // 从主助记词派生当前钱包
      let wallet;
      if (currentWallet.privateKey) {
        // 私钥导入账户
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else {
        // 助记词派生账户
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, currentWallet.path);
      }
      
      // 连接到provider
      const connectedWallet = wallet.connect(provider);
      
      // 获取代币信息
      const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!token) {
        throw new Error('代币信息不可用');
      }
      
      // 创建ERC20合约实例
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function transfer(address to, uint256 value) returns (bool)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ],
        connectedWallet
      );
      
      // 获取代币精度
      const decimals = token.decimals || await tokenContract.decimals();
      
      // 转换金额为代币精度
      const tokenAmount = ethers.utils.parseUnits(amount.toString(), decimals);
      
      // 创建交易选项
      const txOptions = {};
      
      // 如果提供了gasPrice，转换为wei
      if (options.gasPrice) {
        txOptions.gasPrice = ethers.utils.parseUnits(options.gasPrice, 'gwei');
      }
      
      // 如果提供了gasLimit
      if (options.gasLimit) {
        txOptions.gasLimit = ethers.BigNumber.from(options.gasLimit);
      }
      
      // 发送代币交易
      const response = await tokenContract.transfer(toAddress, tokenAmount, txOptions);
      console.log('代币交易已提交:', response);
      
      // 创建交易记录
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
      
      // 添加到本地交易历史
      storageService.addTokenTransactionToHistory(
        transaction,
        currentWallet.address,
        tokenAddress,
        currentNetwork
      );
      
      // 添加到待处理交易
      setPendingTransactions(prev => [...prev, transaction]);
      
      // 监听交易确认
      response.wait(1).then(receipt => {
        console.log('代币交易已确认:', receipt);
        
        // 更新交易状态
        const status = receipt.status === 1 ? 'confirmed' : 'failed';
        storageService.updateTransactionStatus(
          response.hash,
          status,
          currentWallet.address,
          currentNetwork,
          {
            blockNumber: receipt.blockNumber,
            confirmations: 1,
            gasUsed: receipt.gasUsed.toString(),
            tokenAddress
          }
        );
        
        // 更新待处理交易
        setPendingTransactions(prev => 
          prev.filter(tx => tx.hash !== response.hash)
        );
        
        // 触发事件
        emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
          hash: response.hash,
          status,
          receipt,
          tokenAddress,
          walletAddresses: [currentWallet.address.toLowerCase()],
          networkId: currentNetwork
        });
        
        // 更新代币余额
        fetchTokenBalances();
        
      }).catch(error => {
        console.error('代币交易确认失败:', error);
        
        // 格式化错误消息
        let errorMessage = '交易失败';
        try {
          errorMessage = ethersHelper.formatTransactionError(error);
        } catch (e) {
          console.error('格式化错误消息失败:', e);
        }
        
        // 更新交易状态
        storageService.updateTransactionStatus(
          response.hash,
          'failed',
          currentWallet.address,
          currentNetwork,
          {
            error: errorMessage,
            tokenAddress
          }
        );
        
        // 更新待处理交易
        setPendingTransactions(prev => 
          prev.filter(tx => tx.hash !== response.hash)
        );
        
        // 触发事件
        emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
          hash: response.hash,
          status: 'failed',
          error: errorMessage,
          tokenAddress,
          walletAddresses: [currentWallet.address.toLowerCase()],
          networkId: currentNetwork
        });
      });
      
      return response;
    } catch (error) {
      console.error('发送代币交易失败:', error);
      
      // 格式化错误消息
      let errorMessage;
      try {
        errorMessage = ethersHelper.formatTransactionError(error);
      } catch (e) {
        errorMessage = error.message || '未知错误';
      }
      
      throw new Error(errorMessage);
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

  // 上下文值
  const contextValue = {
    isInitialized,
    isLocked,
    hasWallets,
    wallets,
    currentWalletIndex,
    currentNetwork,
    networks,
    provider,
    accountBalances,
    pendingTransactions,
    error,
    loading,
    unlock,
    lock,
    createHDWallet,
    importHDWalletByMnemonic,
    importWalletByPrivateKey,
    addDerivedAccount,
    // dApp相关
    dappRequest,
    requestModalVisible,
    approveDappRequest,
    rejectDappRequest,
    signMessage: walletSignMessage,
    addToken,
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
    // 代币相关
    tokens,
    tokenBalances,
    selectedToken,
    setSelectedToken,
    removeToken,
    sendTokenTransaction,
    getCurrentWalletTokenBalances,
    getTokenBalance,
    fetchTokenBalances,
    // 事件相关
    EVENTS,
    on: (event, callback) => emitter.current.on(event, callback),
    off: (event, callback) => emitter.current.off(event, callback)
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// 自定义钩子，方便使用上下文
export const useWallet = () => useContext(WalletContext); 
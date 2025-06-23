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
  
  // 锁定钱包函数定义
  const lock = () => {
    setIsLocked(true);
    setPassword('');
    setMasterMnemonic(null);
    setError(null);
    sessionStorage.removeItem('wallet_is_unlocked');
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
        // 加载当前网络的代币列表
        const tokensList = storageService.getTokens(currentNetworkId);
        setTokens(tokensList);
        const newProvider = blockchainService.updateProvider(currentNetworkId);
        setProvider(newProvider);
        setIsInitialized(true);
        setLoading(false);
        // 自动解锁逻辑（对标MetaMask）
        const isUnlocked = sessionStorage.getItem('wallet_is_unlocked');
        if (isUnlocked === 'true' && hasWalletsData) {
          // 自动解锁，不需要密码
          setIsLocked(false);
          setError(null);
        }
      } catch (error) {
        console.error('初始化钱包状态失败:', error);
        setError('初始化钱包状态失败');
        setIsInitialized(true);
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
      
      // 创建以太坊Provider实例
      const provider = createEthereumProvider(walletContext);
      
      // 替换原生的Provider调用
      provider._requestUserApproval = handleDappRequest;
      
      ethereumProviderRef.current = provider;
      
      // 将Provider暴露到window对象，使dApps可以访问
      if (typeof window !== 'undefined') {
        window.ethereum = provider;
      }
    }
  }, [isLocked, currentNetwork, networks]);

  // 当钱包或网络变更时，通知Provider
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
  
  // 处理来自dApp的请求
  const handleDappRequest = useCallback((request) => {
    return new Promise((resolve, reject) => {
      // 保存请求处理器
      const requestId = Date.now().toString();
      dappRequestHandlers.current.set(requestId, { resolve, reject });
      
      // 设置请求并显示模态框
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
      
      // 通过主助记词派生当前钱包
      const wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, currentWallet.path);
      
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
    const tryLoadWallets = async () => {
      setLoading(true);
      try {
        if (password) {
          // 优先从IndexedDB读取
          const dbWallets = await storageService.getWalletsFromDB(password);
          if (dbWallets && dbWallets.length > 0) {
            setWallets(dbWallets);
            setIsLocked(false);
            setError(null);
            setLoading(false);
            return;
          }
        }
        // 兼容老数据，从localStorage读取
        if (password) {
          const lsWallets = storageService.getWallets(password);
          if (lsWallets && lsWallets.length > 0) {
            setWallets(lsWallets);
            setIsLocked(false);
            setError(null);
          }
        }
      } catch (e) {
        setError('读取钱包失败: ' + e.message);
      } finally {
        setLoading(false);
      }
    };
    tryLoadWallets();
    // eslint-disable-next-line
  }, [password]);

  // 设置自动锁定计时器
  useEffect(() => {
    // 只有在解锁状态且配置了自动锁定时间才设置定时器
    const settings = storageService.getSettings();
    const autoLockTime = settings?.autoLock || 15; // 默认15分钟

    if (!isLocked && autoLockTime > 0) {
      console.log(`设置自动锁定计时器: ${autoLockTime}分钟`);
      // 初始化最后活动时间
      const initialLastActivity = Date.now();
      setLastActivity(initialLastActivity);
      
      // 设置活动监听器
      const activityHandler = () => {
        // 使用函数式更新，避免依赖于前一个状态
        setLastActivity(Date.now());
      };

      // 添加用户活动事件监听器
      window.addEventListener('mousedown', activityHandler);
      window.addEventListener('keydown', activityHandler);
      window.addEventListener('touchstart', activityHandler);
      
      // 设置定时器检查不活动状态
      const timer = setInterval(() => {
        const now = Date.now();
        // 使用闭包中存储的初始值或最新设置的值，不作为useEffect的依赖项
        const currentLastActivity = lastActivity || initialLastActivity;
        const inactiveTime = (now - currentLastActivity) / 1000 / 60; // 分钟
        
        if (inactiveTime >= autoLockTime) {
          console.log(`检测到不活动超过${autoLockTime}分钟，自动锁定钱包`);
          lock();
        }
      }, 60000); // 每分钟检查一次
      
      // 清理监听器和定时器
      return () => {
        window.removeEventListener('mousedown', activityHandler);
        window.removeEventListener('keydown', activityHandler);
        window.removeEventListener('touchstart', activityHandler);
        clearInterval(timer);
      };
    }
  // 只在isLocked状态改变时重新设置，lock函数不再作为依赖项
  }, [isLocked]);

  // 更新账户余额
  useEffect(() => {
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
    
    // 立即获取余额
    fetchBalances();
    
    // 设置定期更新余额的定时器
    const timer = setInterval(fetchBalances, 15000); // 每15秒更新一次
    
    return () => clearInterval(timer);
  }, [isLocked, wallets, provider, currentNetwork, tokens]); // 添加 tokens 作为依赖
  
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

  // 解锁钱包
  const unlock = async (inputPassword) => {
    setLoading(true);
    try {
      // 1. 先判断是否有加密钱包数据
      const hasWallet = await storageService.hasWalletsInDB();
      if (!hasWallet) {
        setError('未检测到钱包数据，请先创建钱包');
        setLoading(false);
        return false;
      }
      // 2. 有加密数据，尝试解密
      let savedWallets;
      try {
        savedWallets = await storageService.getWalletsFromDB(inputPassword);
      } catch (e) {
        setError('密码错误');
        setLoading(false);
        return false;
      }
      // 3. 检查数据结构是否有效
      if (!Array.isArray(savedWallets) || savedWallets.length === 0 || !savedWallets[0].address) {
        setError('密码错误');
        setLoading(false);
        return false;
      }
      // 4. 解密主助记词
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
      setWallets(savedWallets);
      setCurrentWalletIndex(0); // 可根据需要读取
      setMasterMnemonic(mnemonic);
      setPassword(inputPassword);
      setIsLocked(false);
      setError(null);
      setLastActivity(Date.now());
      // 解锁成功后，设置 sessionStorage 标志
      sessionStorage.setItem('wallet_is_unlocked', 'true');
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
        index: 0
      };
      const newWallets = [walletData];
      // 保存钱包数据到本地存储
      const pwd = newPassword || password;
      storageService.saveWallets(newWallets, pwd);
      storageService.saveCurrentWalletIndex(0);
      // storageService.saveMasterMnemonic(mnemonic, pwd); // localStorage兼容
      // 新增：保存到IndexedDB
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
      // 注意：此时钱包仍然处于锁定状态，直到用户完成备份和验证助记词
      // 在验证助记词成功后，CreateWallet组件会调用unlock函数解锁钱包
      setError(null);
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
      
      // 保存到IndexedDB
      await storageService.saveWalletsToDB(newWallets, pwd);
      await storageService.saveMasterMnemonicToDB(mnemonic, pwd);
      
      // 如果是首次导入，设置密码
      if (newPassword) {
        setPassword(newPassword);
      }
      
      // 更新状态
      setWallets(newWallets);
      setMasterMnemonic(mnemonic);
      setCurrentWalletIndex(0);
      setHasWallets(true);
      // 注意：此时钱包仍然处于锁定状态，直到用户完成备份和验证助记词
      setError(null);
      
      return {
        mnemonic,
        address: derivedWallet.address
      };
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
      storageService.saveCurrentWalletIndex(newWallets.length - 1);
      
      // 更新状态
      setWallets(newWallets);
      setCurrentWalletIndex(newWallets.length - 1);
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
      
      // 更新状态
      setWallets(newWallets);
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
      // 彻底对齐MetaMask体验，切换后刷新页面
      window.location.reload();
      return true;
    }
    setError('无效的钱包索引');
    return false;
  };

  // 切换网络
  const switchNetwork = (networkId) => {
    if (networks[networkId]) {
      setCurrentNetwork(networkId);
      storageService.saveCurrentNetwork(networkId);
      // 彻底对齐MetaMask体验，切换后刷新页面
      window.location.reload();
      return true;
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

  // 发送交易
  const sendTransaction = async (toAddress, amount, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      if (!ethersHelper.isValidAddress(toAddress)) {
        throw new Error('无效的接收地址');
      }
      
      const currentWallet = wallets[currentWalletIndex];
      if (!currentWallet) {
        throw new Error('当前未选择钱包');
      }
      
      // 获取钱包对象(根据不同类型的钱包)
      let wallet;
      if (currentWallet.privateKey) {
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else if (masterMnemonic) {
        const path = currentWallet.path || `m/44'/60'/0'/0/${currentWallet.index || 0}`;
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, path);
      } else {
        throw new Error('无法获取私钥');
      }
      
      // 连接提供者
      wallet = ethersHelper.connectWalletToProvider(wallet, provider);
      
      // 发送交易前通知用户
      message.loading({ content: '正在广播交易...', key: 'tx', duration: 0 });
      
      // 获取当前Nonce，防止nonce重复
      const nonce = await provider.getTransactionCount(currentWallet.address, 'latest');
      
      // 准备交易选项
      const txOptions = {
        gasPrice: options.gasPrice ? ethers.utils.parseUnits(options.gasPrice.toString(), 'gwei') : undefined,
        gasLimit: options.gasLimit ? ethers.BigNumber.from(options.gasLimit) : undefined,
        nonce: nonce
      };
      
      // 发送交易
      const tx = await blockchainService.sendTransaction(wallet, toAddress, amount, txOptions);
      
      // 交易已广播成功
      message.success({ content: '交易已广播至网络!', key: 'tx', duration: 2 });
      
      // 创建交易记录对象
      const timestamp = Date.now();
      const networkSymbol = networks[currentNetwork]?.symbol || 'ETH';
      
      // 发送方交易记录
      const senderTx = {
        hash: tx.hash,
        from: currentWallet.address,
        to: toAddress,
        amount,
        type: 'send', // 标记为发送交易
        symbol: networkSymbol,
        networkId: currentNetwork,
        timestamp: timestamp,
        status: 'pending',
        gasPrice: options.gasPrice,
        gasLimit: options.gasLimit ? options.gasLimit.toString() : undefined
      };
      
      // 添加到待处理交易列表
      setPendingTransactions(prevTxs => [senderTx, ...prevTxs]);
      
      // 保存发送方交易记录到本地存储
      storageService.addTransactionToHistory(senderTx, currentWallet.address, currentNetwork);
      
      // 如果接收方也是本地钱包，添加接收交易记录
      const receiverWallet = wallets.find(w => w.address.toLowerCase() === toAddress.toLowerCase());
      if (receiverWallet) {
        const receiverTx = {
          hash: tx.hash,
          from: currentWallet.address,
          to: toAddress,
          amount,
          type: 'receive', // 标记为接收交易
          symbol: networkSymbol,
          networkId: currentNetwork,
          timestamp: timestamp,
          status: 'pending',
          gasPrice: options.gasPrice,
          gasLimit: options.gasLimit ? options.gasLimit.toString() : undefined
        };
        
        // 保存接收方交易记录到本地存储
        storageService.addTransactionToHistory(receiverTx, receiverWallet.address, currentNetwork);
      }
      
      // 触发交易更新事件，通知组件更新交易历史
      console.log('发送交易后触发更新事件:', senderTx.hash);
      emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
        walletAddresses: [currentWallet.address.toLowerCase(), receiverWallet?.address?.toLowerCase()].filter(Boolean),
        networkId: currentNetwork,
        txHash: tx.hash,
        transactionType: 'send'
      });
      
      // 异步监听交易确认
      tx.wait(1)
        .then(receipt => {
          // 交易已被确认（1个确认）
          message.success({
            content: '交易已确认!',
            duration: 3
          });
          
          // 更新发送方交易状态
          const updatedSenderTx = {
            ...senderTx,
            status: 'confirmed',
            confirmations: 1,
            blockNumber: receipt.blockNumber
          };
          
          // 更新待处理交易列表
          setPendingTransactions(prevTxs => 
            prevTxs.map(ptx => 
              ptx.hash === tx.hash 
                ? updatedSenderTx
                : ptx
            )
          );
          
          // 更新发送方本地存储中的交易记录
          storageService.updateTransactionStatus(tx.hash, 'confirmed', currentWallet.address, currentNetwork);
          
          // 如果接收方也是本地钱包，更新接收方交易状态
          if (receiverWallet) {
            storageService.updateTransactionStatus(tx.hash, 'confirmed', receiverWallet.address, currentNetwork);
          }
          
          // 触发交易更新事件，通知组件更新交易历史
          console.log('交易确认后触发更新事件:', updatedSenderTx.hash);
          
          // 获取当前所有钱包地址列表
          const allWalletAddresses = wallets.map(w => w.address.toLowerCase());
          
          emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
            walletAddresses: allWalletAddresses,
            networkId: currentNetwork,
            txHash: tx.hash,
            status: 'confirmed',
            transactionType: 'send'
          });
          
          // 更新余额（延迟1秒后，以确保网络已同步）
          setTimeout(async () => {
            // 使用作用域内定义的获取余额函数
            const updateBalances = async () => {
              if (isLocked || wallets.length === 0 || !provider) {
                return;
              }
              
              try {
                console.log(`交易确认后更新余额... 当前网络: ${currentNetwork}`);
                const newBalances = { ...accountBalances };
                let updated = false;
                
                for (const wallet of wallets) {
                  try {
                    const balance = await blockchainService.getEthBalance(wallet.address);
                    if (newBalances[wallet.address] !== balance) {
                      newBalances[wallet.address] = balance;
                      updated = true;
                    }
                  } catch (error) {
                    console.error(`获取地址 ${wallet.address} 余额失败:`, error);
                  }
                }
                
                if (updated) {
                  setAccountBalances(newBalances);
                }
              } catch (error) {
                console.error('更新账户余额失败:', error);
              }
            };
            
            updateBalances();
          }, 1000);
        })
        .catch(err => {
          console.error('交易确认失败:', err);
          // 更新交易状态为失败
          setPendingTransactions(prevTxs => 
            prevTxs.map(ptx => 
              ptx.hash === tx.hash ? { ...ptx, status: 'failed', error: err.message } : ptx
            )
          );
          
          // 更新发送方本地存储中的交易记录
          storageService.updateTransactionStatus(tx.hash, 'failed', currentWallet.address, currentNetwork);
          
          // 如果接收方也是本地钱包，更新接收方交易状态
          if (receiverWallet) {
            storageService.updateTransactionStatus(tx.hash, 'failed', receiverWallet.address, currentNetwork);
          }
          
          message.error('交易确认失败');
        });
      
      return tx;
    } catch (error) {
      console.error('发送交易失败:', error);
      message.error({ content: `发送交易失败: ${error.message}`, key: 'tx' });
      setError(`发送交易失败: ${error.message}`);
      return null;
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
    setLoading(true);
    setError(null);
    try {
      if (!ethersHelper.isValidAddress(toAddress)) {
        throw new Error('无效的接收地址');
      }
      
      const currentWallet = wallets[currentWalletIndex];
      if (!currentWallet) {
        throw new Error('当前未选择钱包');
      }
      
      // 获取代币信息
      const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      if (!token) {
        throw new Error('代币不存在');
      }
      
      // 获取钱包对象(根据不同类型的钱包)
      let wallet;
      if (currentWallet.privateKey) {
        wallet = ethersHelper.createWalletFromPrivateKey(currentWallet.privateKey);
      } else if (masterMnemonic) {
        const path = currentWallet.path || `m/44'/60'/0'/0/${currentWallet.index || 0}`;
        wallet = ethersHelper.createWalletFromMnemonic(masterMnemonic, path);
      } else {
        throw new Error('无法获取私钥');
      }
      
      // 连接提供者
      wallet = ethersHelper.connectWalletToProvider(wallet, provider);
      
      // 发送交易前通知用户
      message.loading({ content: '正在广播交易...', key: 'tx', duration: 0 });
      
      // 获取当前Nonce，防止nonce重复
      const nonce = await provider.getTransactionCount(currentWallet.address, 'latest');
      
      // 准备交易选项
      const txOptions = {
        gasPrice: options.gasPrice ? ethers.utils.parseUnits(options.gasPrice.toString(), 'gwei') : undefined,
        gasLimit: options.gasLimit ? ethers.BigNumber.from(options.gasLimit) : undefined,
        nonce: nonce
      };
      
      // 发送代币交易
      const tx = await blockchainService.sendTokenTransaction(
        wallet,
        tokenAddress,
        toAddress,
        amount,
        txOptions
      );
      
      // 交易已广播成功
      message.success({ content: '交易已广播至网络!', key: 'tx', duration: 2 });
      
      // 创建交易记录对象
      const timestamp = Date.now();
      
      // 发送方交易记录
      const senderTx = {
        hash: tx.hash,
        from: currentWallet.address,
        to: toAddress,
        amount,
        type: 'token_send', // 标记为代币发送交易
        symbol: token.symbol,
        tokenAddress,
        networkId: currentNetwork,
        timestamp: timestamp,
        status: 'pending',
        gasPrice: options.gasPrice,
        gasLimit: options.gasLimit ? options.gasLimit.toString() : undefined
      };
      
      // 添加到待处理交易列表
      setPendingTransactions(prevTxs => [senderTx, ...prevTxs]);
      
      // 保存发送方交易记录到本地存储
      storageService.addTransactionToHistory(senderTx, currentWallet.address, currentNetwork);
      
      // 如果接收方也是本地钱包，添加接收交易记录
      const receiverWallet = wallets.find(w => w.address.toLowerCase() === toAddress.toLowerCase());
      if (receiverWallet) {
        const receiverTx = {
          hash: tx.hash,
          from: currentWallet.address,
          to: toAddress,
          amount,
          type: 'token_receive', // 标记为代币接收交易
          symbol: token.symbol,
          tokenAddress,
          networkId: currentNetwork,
          timestamp: timestamp,
          status: 'pending',
          gasPrice: options.gasPrice,
          gasLimit: options.gasLimit ? options.gasLimit.toString() : undefined
        };
        
        // 保存接收方交易记录到本地存储
        storageService.addTransactionToHistory(receiverTx, receiverWallet.address, currentNetwork);
      }
      
      // 触发交易更新事件，通知组件更新交易历史
      console.log('发送交易后触发更新事件:', senderTx.hash);
      emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
        walletAddresses: [currentWallet.address.toLowerCase(), receiverWallet?.address?.toLowerCase()].filter(Boolean),
        networkId: currentNetwork,
        txHash: tx.hash,
        transactionType: 'send'
      });
      
      // 异步监听交易确认
      tx.wait(1)
        .then(receipt => {
          // 交易已被确认（1个确认）
          message.success({
            content: '交易已确认!',
            duration: 3
          });
          
          // 更新发送方交易状态
          const updatedSenderTx = {
            ...senderTx,
            status: 'confirmed',
            confirmations: 1,
            blockNumber: receipt.blockNumber
          };
          
          // 更新待处理交易列表
          setPendingTransactions(prevTxs => 
            prevTxs.map(ptx => 
              ptx.hash === tx.hash 
                ? updatedSenderTx
                : ptx
            )
          );
          
          // 更新发送方本地存储中的交易记录
          storageService.updateTransactionStatus(tx.hash, 'confirmed', currentWallet.address, currentNetwork);
          
          // 如果接收方也是本地钱包，更新接收方交易状态
          if (receiverWallet) {
            storageService.updateTransactionStatus(tx.hash, 'confirmed', receiverWallet.address, currentNetwork);
          }
          
          // 触发交易更新事件，通知组件更新交易历史
          console.log('交易确认后触发更新事件:', updatedSenderTx.hash);
          
          // 获取当前所有钱包地址列表
          const allWalletAddresses = wallets.map(w => w.address.toLowerCase());
          
          emitter.current.emit(EVENTS.TRANSACTION_UPDATED, {
            walletAddresses: allWalletAddresses,
            networkId: currentNetwork,
            txHash: tx.hash,
            status: 'confirmed',
            transactionType: 'send'
          });
          
          // 更新余额（延迟1秒后，以确保网络已同步）
          setTimeout(() => fetchTokenBalances(), 1000);
        })
        .catch(err => {
          console.error('交易确认失败:', err);
          // 更新交易状态为失败
          setPendingTransactions(prevTxs => 
            prevTxs.map(ptx => 
              ptx.hash === tx.hash ? { ...ptx, status: 'failed', error: err.message } : ptx
            )
          );
          
          // 更新发送方本地存储中的交易记录
          storageService.updateTransactionStatus(tx.hash, 'failed', currentWallet.address, currentNetwork);
          
          // 如果接收方也是本地钱包，更新接收方交易状态
          if (receiverWallet) {
            storageService.updateTransactionStatus(tx.hash, 'failed', receiverWallet.address, currentNetwork);
          }
          
          message.error('交易确认失败');
        });
      
      return tx;
    } catch (error) {
      console.error('发送代币交易失败:', error);
      message.error({ content: `发送代币交易失败: ${error.message}`, key: 'tx' });
      setError(`发送代币交易失败: ${error.message}`);
      return null;
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
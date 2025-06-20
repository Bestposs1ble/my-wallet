import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import * as ethersHelper from '../utils/ethersHelper';
import * as storageService from '../services/storageService';
import * as blockchainService from '../services/blockchainService';
import { createEthereumProvider, EthereumProvider } from '../services/ethereumProvider';
import EventEmitter from 'events';

// 创建上下文
const WalletContext = createContext();

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

  // 初始化钱包状态
  useEffect(() => {
    const initWalletState = async () => {
      try {
        // 设置加载状态
        setLoading(true);
        
        // 检查是否存在钱包
        const hasWalletsData = await storageService.hasWalletsInDB();
        setHasWallets(hasWalletsData);
        
        // 获取当前网络配置
        const networksConfig = storageService.getNetworks();
        setNetworks(networksConfig);
        
        // 获取当前网络ID
        const currentNetworkId = storageService.getCurrentNetwork();
        setCurrentNetwork(currentNetworkId);
        
        // 初始化provider
        const newProvider = blockchainService.updateProvider(currentNetworkId);
        setProvider(newProvider);
        
        setIsInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('初始化钱包状态失败:', error);
        setError('初始化钱包状态失败');
        setIsInitialized(true); // 即使失败也标记为已初始化
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
      const { address, symbol, decimals, image } = tokenInfo;
      
      // 获取当前网络的代币列表
      const tokens = storageService.getTokens(currentNetwork);
      
      // 检查代币是否已存在
      const existingToken = tokens.find(
        t => t.address.toLowerCase() === address.toLowerCase()
      );
      
      if (existingToken) {
        return true; // 代币已存在
      }
      
      // 添加新代币
      const newToken = {
        address,
        symbol,
        decimals,
        image,
        balance: '0' // 初始余额
      };
      
      const updatedTokens = [...tokens, newToken];
      storageService.saveTokens(updatedTokens, currentNetwork);
      
      return true;
    } catch (error) {
      console.error('添加代币失败:', error);
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

  // 监听用户活动，用于自动锁定功能
  useEffect(() => {
    const settings = storageService.getSettings();
    const { autoLock } = settings;
    
    if (!isLocked && autoLock > 0) {
      const activityHandler = () => setLastActivity(Date.now());
      
      // 添加活动事件监听器
      window.addEventListener('mousemove', activityHandler);
      window.addEventListener('keydown', activityHandler);
      window.addEventListener('click', activityHandler);
      
      // 设置定时器检查不活动状态
      const timer = setInterval(() => {
        const now = Date.now();
        const inactiveTime = (now - lastActivity) / 1000 / 60; // 分钟
        
        if (inactiveTime >= autoLock) {
          lock();
        }
      }, 60000); // 每分钟检查一次
      
      return () => {
        // 清除事件监听器和定时器
        window.removeEventListener('mousemove', activityHandler);
        window.removeEventListener('keydown', activityHandler);
        window.removeEventListener('click', activityHandler);
        clearInterval(timer);
      };
    }
  }, [isLocked, lastActivity]);

  // 更新账户余额
  useEffect(() => {
    const fetchBalances = async () => {
      if (isLocked || wallets.length === 0 || !provider) {
        return;
      }
      
      try {
        console.log(`正在更新余额... 当前网络: ${currentNetwork}`);
        const newBalances = { ...accountBalances };
        let updated = false;
        
        for (const wallet of wallets) {
          try {
            console.log(`获取地址 ${wallet.address} 的余额`);
            // 确保使用正确的provider
            const balance = await blockchainService.getEthBalance(wallet.address);
            console.log(`地址 ${wallet.address} 余额: ${balance}`);
            
            if (newBalances[wallet.address] !== balance) {
              console.log(`余额已更新: ${newBalances[wallet.address]} -> ${balance}`);
              newBalances[wallet.address] = balance;
              updated = true;
            }
          } catch (error) {
            console.error(`获取地址 ${wallet.address} 余额失败:`, error);
          }
        }
        
        if (updated) {
          console.log('余额更新完成:', newBalances);
          setAccountBalances(newBalances);
        }
      } catch (error) {
        console.error('更新账户余额失败:', error);
      }
    };
    
    // 立即获取余额
    fetchBalances();
    
    // 设置定期更新余额的定时器
    const timer = setInterval(fetchBalances, 15000); // 每15秒更新一次
    
    return () => clearInterval(timer);
  }, [isLocked, wallets, provider, currentNetwork]); // 添加 currentNetwork 作为依赖

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
      return true;
    } catch (error) {
      console.error('解锁钱包失败:', error);
      setError('密码错误');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 锁定钱包
  const lock = () => {
    setIsLocked(true);
    setPassword('');
    setMasterMnemonic(null);
    setError(null);
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
      setIsLocked(false);
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
      setIsLocked(false);
      setHasWallets(true);
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
      setIsLocked(false);
      setHasWallets(true);
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
      setError(null);
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
      
      // 更新提供者
      const newProvider = blockchainService.updateProvider(networkId);
      setProvider(newProvider);
      
      setError(null);
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
    
    const updatedNetworks = {
      ...networks,
      [networkId]: networkConfig
    };
    
    storageService.saveNetworks(updatedNetworks);
    setNetworks(updatedNetworks);
    setError(null);
    return true;
  };

  // 发送交易
  const sendTransaction = async (toAddress, amount, options = {}) => {
    setLoading(true);
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
      
      // 发送交易
      const tx = await blockchainService.sendTransaction(wallet, toAddress, amount, options);
      
      // 添加到待处理交易
      const newPendingTx = {
        hash: tx.hash,
        from: currentWallet.address,
        to: toAddress,
        amount,
        networkId: currentNetwork,
        timestamp: Date.now()
      };
      
      setPendingTransactions([...pendingTransactions, newPendingTx]);
      
      return tx;
    } catch (error) {
      console.error('发送交易失败:', error);
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
    backupWallet
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// 自定义钩子，方便使用上下文
export const useWallet = () => useContext(WalletContext); 
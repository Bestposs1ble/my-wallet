import React, { createContext, useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import * as ethersHelper from '../utils/ethersHelper';
import * as storageService from '../services/storageService';
import * as blockchainService from '../services/blockchainService';

// 创建上下文
const WalletContext = createContext();

// 创建上下文提供者组件
export const WalletProvider = ({ children }) => {
  // 状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
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

  // 初始化钱包状态
  useEffect(() => {
    const initWalletState = async () => {
      try {
        // 加载网络配置
        const savedNetworks = storageService.getNetworks();
        const savedCurrentNetwork = storageService.getCurrentNetwork();
        
        setNetworks(savedNetworks);
        setCurrentNetwork(savedCurrentNetwork);
        
        // 创建提供者
        const newProvider = blockchainService.initBlockchainService();
        setProvider(newProvider);
        
        // 加载设置
        const settings = storageService.getSettings();
        
        // 检查是否有已存储的钱包数据(用于自动跳转到登录页)
        const hasWallets = storageService.hasWallets();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('初始化钱包状态失败:', error);
        setError('初始化钱包失败，请刷新页面重试');
      }
    };
    
    initWalletState();
  }, []);

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
    
    fetchBalances();
    
    // 设置定期更新余额的定时器
    const timer = setInterval(fetchBalances, 30000);
    
    return () => clearInterval(timer);
  }, [isLocked, wallets, provider, accountBalances]);

  // 解锁钱包
  const unlock = async (inputPassword) => {
    setLoading(true);
    try {
      const savedWallets = storageService.getWallets(inputPassword);
      const savedWalletIndex = storageService.getCurrentWalletIndex();
      const savedMnemonic = storageService.getMasterMnemonic(inputPassword);
      
      setWallets(savedWallets);
      setCurrentWalletIndex(savedWalletIndex);
      setMasterMnemonic(savedMnemonic);
      setPassword(inputPassword);
      setIsLocked(false);
      setError(null);
      setLastActivity(Date.now());
      
      return true;
    } catch (error) {
      console.error('解锁钱包失败:', error);
      setError('密码错误或钱包数据已损坏');
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
      storageService.saveMasterMnemonic(mnemonic, pwd);
      // 更新状态
      setWallets(newWallets);
      setMasterMnemonic(mnemonic);
      setCurrentWalletIndex(0);
      if (newPassword) {
        setPassword(newPassword);
      }
      setIsLocked(false);
      setError(null);
      return {
        wallet: walletData,
        mnemonic
      };
    } catch (error) {
      console.error('创建HD钱包失败:', error);
      setError('创建HD钱包失败: ' + error.message);
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
        index: 0
      };
      
      const newWallets = [walletData];
      
      // 保存钱包数据到本地存储
      const pwd = newPassword || password;
      storageService.saveWallets(newWallets, pwd);
      storageService.saveCurrentWalletIndex(0);
      storageService.saveMasterMnemonic(mnemonic, pwd);
      
      // 更新状态
      setWallets(newWallets);
      setMasterMnemonic(mnemonic);
      setCurrentWalletIndex(0);
      if (newPassword) {
        setPassword(newPassword);
      }
      setIsLocked(false);
      setError(null);
      
      return walletData;
    } catch (error) {
      console.error('导入HD钱包失败:', error);
      setError('导入HD钱包失败: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // 导入钱包(通过私钥)
  const importWalletByPrivateKey = async (privateKey, name) => {
    setLoading(true);
    try {
      // 从私钥创建钱包
      const wallet = ethersHelper.createWalletFromPrivateKey(privateKey);
      const walletData = {
        name,
        address: wallet.address,
        privateKey: wallet.privateKey,
        isImported: true
      };
      
      // 检查钱包是否已存在
      if (wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
        setError('钱包地址已存在');
        return null;
      }
      
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

  // 上下文值
  const contextValue = {
    isInitialized,
    isLocked,
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
    addMultipleDerivedAccounts,
    switchWallet,
    switchNetwork,
    addCustomNetwork,
    sendTransaction,
    getCurrentWallet,
    getCurrentNetworkConfig,
    getCurrentWalletBalance,
    updateWalletName,
    deleteWallet
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// 自定义钩子，方便使用上下文
export const useWallet = () => useContext(WalletContext); 
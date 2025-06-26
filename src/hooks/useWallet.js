/**
 * 钱包 Hook - 提供钱包相关的状态和操作
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { walletManager } from '../core/transaction/wallet/WalletManager';
import { storageManager } from '../core/storage/StorageManager';
import { message } from 'antd';

export const useWallet = () => {
  // 钱包状态
  const [wallets, setWallets] = useState([]);
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [hasWallets, setHasWallets] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 初始化钱包状态
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        setLoading(true);
        
        // 检查是否有存储的钱包
        const hasStoredWallets = await storageManager.hasWallets();
        setHasWallets(hasStoredWallets);
        
        // 检查会话状态
        const sessionToken = sessionStorage.getItem('wallet_is_unlocked');
        if (sessionToken && hasStoredWallets) {
          try {
            const decodedToken = atob(sessionToken);
            const [timestamp, addressFragment] = decodedToken.split(':');
            const now = Date.now();
            const tokenTime = parseInt(timestamp, 10);
            const isValid = now - tokenTime < 72 * 60 * 60 * 1000; // 72小时有效期
            
            if (isValid) {
              // 会话仍然有效，但需要密码才能完全解锁
              setIsLocked(false);
              setError(null);
            } else {
              sessionStorage.removeItem('wallet_is_unlocked');
            }
          } catch (e) {
            sessionStorage.removeItem('wallet_is_unlocked');
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        setError(`初始化钱包失败: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeWallet();
  }, []);

  // 监听钱包管理器事件
  useEffect(() => {
    const handleWalletsChanged = (newWallets) => {
      setWallets(newWallets);
      setHasWallets(newWallets.length > 0);
    };

    const handleCurrentWalletChanged = (wallet) => {
      const index = wallets.findIndex(w => w.address === wallet.address);
      if (index !== -1) {
        setCurrentWalletIndex(index);
      }
    };

    const handleWalletLocked = () => {
      setIsLocked(true);
      setWallets([]);
      setCurrentWalletIndex(0);
      setError(null);
    };

    const handleWalletUnlocked = () => {
      setIsLocked(false);
      setError(null);
    };

    const handleError = (error) => {
      setError(error.message);
      message.error(error.message);
    };

    // 注册事件监听器
    walletManager.on('walletsChanged', handleWalletsChanged);
    walletManager.on('currentWalletChanged', handleCurrentWalletChanged);
    walletManager.on('walletLocked', handleWalletLocked);
    walletManager.on('walletUnlocked', handleWalletUnlocked);
    walletManager.on('error', handleError);

    // 清理函数
    return () => {
      walletManager.off('walletsChanged', handleWalletsChanged);
      walletManager.off('currentWalletChanged', handleCurrentWalletChanged);
      walletManager.off('walletLocked', handleWalletLocked);
      walletManager.off('walletUnlocked', handleWalletUnlocked);
      walletManager.off('error', handleError);
    };
  }, [wallets]);

  // 创建钱包
  const createWallet = useCallback(async (password, mnemonic = null) => {
    try {
      setLoading(true);
      setError(null);

      // 初始化存储管理器
      await storageManager.initialize(password);

      // 创建钱包
      const result = await walletManager.createWallet(password, mnemonic);

      // 保存到存储
      await storageManager.saveWallets([result.wallet], password);
      await storageManager.saveMasterMnemonic(result.mnemonic, password);

      // 设置会话状态
      const timestamp = Date.now();
      const addressFragment = result.wallet.address.slice(0, 8);
      const unlockToken = `${timestamp}:${addressFragment}`;
      const encodedToken = btoa(unlockToken);
      sessionStorage.setItem('wallet_is_unlocked', encodedToken);

      setHasWallets(true);
      message.success('钱包创建成功');

      return result;
    } catch (error) {
      setError(error.message);
      message.error(`创建钱包失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 导入钱包
  const importWallet = useCallback(async (password, mnemonic) => {
    try {
      setLoading(true);
      setError(null);

      // 初始化存储管理器
      await storageManager.initialize(password);

      // 导入钱包
      const result = await walletManager.importWallet(password, mnemonic);

      // 保存到存储
      await storageManager.saveWallets([result.wallet], password);
      await storageManager.saveMasterMnemonic(result.mnemonic, password);

      // 设置会话状态
      const timestamp = Date.now();
      const addressFragment = result.wallet.address.slice(0, 8);
      const unlockToken = `${timestamp}:${addressFragment}`;
      const encodedToken = btoa(unlockToken);
      sessionStorage.setItem('wallet_is_unlocked', encodedToken);

      setHasWallets(true);
      message.success('钱包导入成功');

      return result;
    } catch (error) {
      setError(error.message);
      message.error(`导入钱包失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 通过私钥导入钱包
  const importWalletByPrivateKey = useCallback(async (privateKey) => {
    try {
      setLoading(true);
      setError(null);

      const wallet = await walletManager.importWalletByPrivateKey(privateKey);

      // 更新存储
      const currentWallets = await storageManager.getWallets();
      const updatedWallets = [...currentWallets, wallet];
      await storageManager.saveWallets(updatedWallets);

      message.success('钱包导入成功');
      return wallet;
    } catch (error) {
      setError(error.message);
      message.error(`导入钱包失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 解锁钱包
  const unlock = useCallback(async (password) => {
    try {
      setLoading(true);
      setError(null);

      // 初始化存储管理器
      await storageManager.initialize(password);

      // 读取钱包数据
      const storedWallets = await storageManager.getWallets(password);
      const masterMnemonic = await storageManager.getMasterMnemonic(password);

      if (!storedWallets || storedWallets.length === 0) {
        throw new Error('未找到钱包数据');
      }

      // 解锁钱包管理器
      walletManager.unlock(password, storedWallets, masterMnemonic);

      // 设置会话状态
      const timestamp = Date.now();
      const addressFragment = storedWallets[0].address.slice(0, 8);
      const unlockToken = `${timestamp}:${addressFragment}`;
      const encodedToken = btoa(unlockToken);
      sessionStorage.setItem('wallet_is_unlocked', encodedToken);

      message.success('钱包解锁成功');
    } catch (error) {
      setError(error.message);
      message.error(`解锁失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 锁定钱包
  const lock = useCallback(() => {
    walletManager.lock();
    storageManager.clearCache();
    sessionStorage.removeItem('wallet_is_unlocked');
    sessionStorage.removeItem('wallet_auto_unlock');
    localStorage.removeItem('login_attempts');
    localStorage.removeItem('login_lockout_until');
    message.info('钱包已锁定');
  }, []);

  // 添加派生账户
  const addDerivedAccount = useCallback(async (name = null) => {
    try {
      setLoading(true);
      setError(null);

      const newAccount = await walletManager.addDerivedAccount(name);

      // 更新存储
      const updatedWallets = walletManager.getState().wallets;
      await storageManager.saveWallets(updatedWallets);

      message.success('账户添加成功');
      return newAccount;
    } catch (error) {
      setError(error.message);
      message.error(`添加账户失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 切换钱包
  const switchWallet = useCallback((index) => {
    try {
      const wallet = walletManager.switchWallet(index);
      message.success(`已切换到 ${wallet.name || `账户${index + 1}`}`);
      return wallet;
    } catch (error) {
      setError(error.message);
      message.error(`切换钱包失败: ${error.message}`);
      throw error;
    }
  }, []);

  // 获取当前钱包
  const getCurrentWallet = useCallback(() => {
    return walletManager.getCurrentWallet();
  }, []);

  // 获取钱包实例
  const getWalletInstance = useCallback((index = null) => {
    return walletManager.getWalletInstance(index);
  }, []);

  // 重置钱包
  const resetWallet = useCallback(async () => {
    try {
      setLoading(true);
      
      // 重置钱包管理器
      walletManager.reset();
      
      // 清除存储
      await storageManager.clearAll();
      
      // 清除会话
      sessionStorage.clear();
      localStorage.clear();
      
      setHasWallets(false);
      message.success('钱包已重置');
    } catch (error) {
      setError(error.message);
      message.error(`重置钱包失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 备份钱包
  const backupWallet = useCallback(async () => {
    try {
      const masterMnemonic = await storageManager.getMasterMnemonic();
      if (!masterMnemonic) {
        throw new Error('未找到助记词');
      }
      
      const backupData = {
        mnemonic: masterMnemonic,
        wallets: wallets,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      return backupData;
    } catch (error) {
      setError(error.message);
      message.error(`备份失败: ${error.message}`);
      throw error;
    }
  }, [wallets]);

  return {
    // 状态
    wallets,
    currentWalletIndex,
    isLocked,
    hasWallets,
    isInitialized,
    loading,
    error,
    
    // 方法
    createWallet,
    importWallet,
    importWalletByPrivateKey,
    unlock,
    lock,
    addDerivedAccount,
    switchWallet,
    getCurrentWallet,
    getWalletInstance,
    resetWallet,
    backupWallet,
    
    // 计算属性
    currentWallet: getCurrentWallet(),
    walletCount: wallets.length
  };
};
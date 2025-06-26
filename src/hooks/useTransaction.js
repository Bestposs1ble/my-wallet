/**
 * 交易 Hook - 提供交易相关的状态和操作
 */
import { useState, useEffect, useCallback } from 'react';
import { transactionManager } from '../core/transaction/TransactionManager';
import { storageManager } from '../core/storage/StorageManager';
import { useWallet } from './useWallet';
import { useNetwork } from './useNetwork';
import { message } from 'antd';

export const useTransaction = () => {
  // 交易状态
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [gasSettings, setGasSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 依赖的 Hook
  const { getWalletInstance, getCurrentWallet } = useWallet();
  const { getCurrentProvider } = useNetwork();

  // 监听交易管理器事件
  useEffect(() => {
    const handleTransactionSent = (transaction) => {
      message.success('交易已发送');
    };

    const handleTransactionConfirmed = (transaction) => {
      message.success(`交易已确认: ${transaction.hash.slice(0, 10)}...`);
    };

    const handleTransactionFailed = (transaction) => {
      message.error(`交易失败: ${transaction.error || '未知错误'}`);
    };

    const handleTransactionAdded = (transaction) => {
      setPendingTransactions(prev => {
        const exists = prev.find(tx => tx.hash === transaction.hash);
        if (exists) return prev;
        return [transaction, ...prev];
      });
    };

    const handleTransactionUpdated = (transaction) => {
      // 更新待处理交易列表
      setPendingTransactions(prev => {
        if (transaction.status === 'pending') {
          return prev.map(tx => tx.hash === transaction.hash ? transaction : tx);
        } else {
          return prev.filter(tx => tx.hash !== transaction.hash);
        }
      });

      // 更新历史记录
      setTransactionHistory(prev => {
        const index = prev.findIndex(tx => tx.hash === transaction.hash);
        if (index !== -1) {
          const newHistory = [...prev];
          newHistory[index] = transaction;
          return newHistory;
        }
        return [transaction, ...prev];
      });
    };

    const handleError = (error) => {
      setError(error.message);
      message.error(error.message);
    };

    // 注册事件监听器
    transactionManager.on('transactionSent', handleTransactionSent);
    transactionManager.on('transactionConfirmed', handleTransactionConfirmed);
    transactionManager.on('transactionFailed', handleTransactionFailed);
    transactionManager.on('transactionAdded', handleTransactionAdded);
    transactionManager.on('transactionUpdated', handleTransactionUpdated);
    transactionManager.on('error', handleError);

    // 初始化时加载状态
    const state = transactionManager.getState();
    setPendingTransactions(state.pendingTransactions);
    setTransactionHistory(state.transactionHistory);
    setGasSettings(state.gasSettings);

    // 清理函数
    return () => {
      transactionManager.off('transactionSent', handleTransactionSent);
      transactionManager.off('transactionConfirmed', handleTransactionConfirmed);
      transactionManager.off('transactionFailed', handleTransactionFailed);
      transactionManager.off('transactionAdded', handleTransactionAdded);
      transactionManager.off('transactionUpdated', handleTransactionUpdated);
      transactionManager.off('error', handleError);
    };
  }, []);

  // 发送 ETH 交易
  const sendTransaction = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const wallet = getWalletInstance();
      const provider = getCurrentProvider();
      
      if (!wallet) {
        throw new Error('钱包未解锁');
      }
      
      if (!provider) {
        throw new Error('网络未连接');
      }

      const result = await transactionManager.sendTransaction(params, wallet, provider);
      
      // 保存交易历史到存储
      const currentWallet = getCurrentWallet();
      if (currentWallet) {
        const history = transactionManager.getTransactionHistory();
        await storageManager.saveTransactionHistory(history, currentWallet.address);
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      message.error(`发送交易失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getWalletInstance, getCurrentProvider, getCurrentWallet]);

  // 发送代币交易
  const sendTokenTransaction = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const wallet = getWalletInstance();
      const provider = getCurrentProvider();
      
      if (!wallet) {
        throw new Error('钱包未解锁');
      }
      
      if (!provider) {
        throw new Error('网络未连接');
      }

      const result = await transactionManager.sendTokenTransaction(params, wallet, provider);
      
      // 保存交易历史到存储
      const currentWallet = getCurrentWallet();
      if (currentWallet) {
        const history = transactionManager.getTransactionHistory();
        await storageManager.saveTransactionHistory(history, currentWallet.address);
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      message.error(`发送代币交易失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getWalletInstance, getCurrentProvider, getCurrentWallet]);

  // 估算 Gas 费用
  const estimateGas = useCallback(async (transaction) => {
    try {
      setLoading(true);
      setError(null);

      const provider = getCurrentProvider();
      
      if (!provider) {
        throw new Error('网络未连接');
      }

      const gasEstimate = await transactionManager.estimateGas(transaction, provider);
      
      return gasEstimate;
    } catch (error) {
      setError(error.message);
      message.error(`Gas 估算失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getCurrentProvider]);

  // 获取交易状态
  const getTransactionStatus = useCallback(async (txHash) => {
    try {
      const provider = getCurrentProvider();
      
      if (!provider) {
        throw new Error('网络未连接');
      }

      const status = await transactionManager.getTransactionStatus(txHash, provider);
      
      return status;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [getCurrentProvider]);

  // 加载交易历史
  const loadTransactionHistory = useCallback(async (address = null) => {
    try {
      setLoading(true);
      
      const targetAddress = address || getCurrentWallet()?.address;
      
      if (!targetAddress) {
        return [];
      }

      const history = await storageManager.getTransactionHistory(targetAddress);
      setTransactionHistory(history);
      
      return history;
    } catch (error) {
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getCurrentWallet]);

  // 清除交易历史
  const clearTransactionHistory = useCallback(() => {
    transactionManager.clearHistory();
    setTransactionHistory([]);
    message.success('交易历史已清除');
  }, []);

  // 重新发送交易（加速）
  const speedUpTransaction = useCallback(async (txHash, newGasPrice) => {
    try {
      setLoading(true);
      setError(null);

      // 找到原始交易
      const originalTx = pendingTransactions.find(tx => tx.hash === txHash);
      if (!originalTx) {
        throw new Error('未找到原始交易');
      }

      // 创建新的交易参数
      const newTxParams = {
        to: originalTx.to,
        value: originalTx.value,
        data: originalTx.data,
        gasLimit: originalTx.gasLimit,
        gasPrice: newGasPrice,
        nonce: originalTx.nonce // 使用相同的 nonce
      };

      // 发送新交易
      const result = await sendTransaction(newTxParams);
      
      message.success('加速交易已发送');
      return result;
    } catch (error) {
      setError(error.message);
      message.error(`加速交易失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [pendingTransactions, sendTransaction]);

  // 取消交易
  const cancelTransaction = useCallback(async (txHash, gasPrice) => {
    try {
      setLoading(true);
      setError(null);

      // 找到原始交易
      const originalTx = pendingTransactions.find(tx => tx.hash === txHash);
      if (!originalTx) {
        throw new Error('未找到原始交易');
      }

      const currentWallet = getCurrentWallet();
      if (!currentWallet) {
        throw new Error('钱包未解锁');
      }

      // 创建取消交易（发送 0 ETH 到自己）
      const cancelTxParams = {
        to: currentWallet.address,
        value: '0',
        gasLimit: '21000',
        gasPrice: gasPrice,
        nonce: originalTx.nonce // 使用相同的 nonce
      };

      // 发送取消交易
      const result = await sendTransaction(cancelTxParams);
      
      message.success('取消交易已发送');
      return result;
    } catch (error) {
      setError(error.message);
      message.error(`取消交易失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [pendingTransactions, getCurrentWallet, sendTransaction]);

  // 获取交易详情
  const getTransactionDetails = useCallback((txHash) => {
    // 先从待处理交易中查找
    let transaction = pendingTransactions.find(tx => tx.hash === txHash);
    
    // 如果没找到，从历史记录中查找
    if (!transaction) {
      transaction = transactionHistory.find(tx => tx.hash === txHash);
    }
    
    return transaction;
  }, [pendingTransactions, transactionHistory]);

  // 获取交易统计
  const getTransactionStats = useCallback(() => {
    const totalTransactions = transactionHistory.length;
    const confirmedTransactions = transactionHistory.filter(tx => tx.status === 'confirmed').length;
    const failedTransactions = transactionHistory.filter(tx => tx.status === 'failed').length;
    const pendingCount = pendingTransactions.length;

    return {
      total: totalTransactions,
      confirmed: confirmedTransactions,
      failed: failedTransactions,
      pending: pendingCount,
      successRate: totalTransactions > 0 ? (confirmedTransactions / totalTransactions * 100).toFixed(2) : 0
    };
  }, [transactionHistory, pendingTransactions]);

  return {
    // 状态
    pendingTransactions,
    transactionHistory,
    gasSettings,
    loading,
    error,
    
    // 方法
    sendTransaction,
    sendTokenTransaction,
    estimateGas,
    getTransactionStatus,
    loadTransactionHistory,
    clearTransactionHistory,
    speedUpTransaction,
    cancelTransaction,
    getTransactionDetails,
    
    // 工具方法
    getTransactionStats,
    
    // 计算属性
    pendingCount: pendingTransactions.length,
    historyCount: transactionHistory.length,
    transactionStats: getTransactionStats()
  };
};
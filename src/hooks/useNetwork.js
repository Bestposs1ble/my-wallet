/**
 * 网络 Hook - 提供网络相关的状态和操作
 */
import { useState, useEffect, useCallback } from 'react';
import { networkManager } from '../core/network/NetworkManager';
import { storageManager } from '../core/storage/StorageManager';
import { message } from 'antd';

export const useNetwork = () => {
  // 网络状态
  const [currentNetwork, setCurrentNetwork] = useState('mainnet');
  const [networks, setNetworks] = useState({});
  const [provider, setProvider] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // 初始化网络状态
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        setLoading(true);
        
        // 读取网络配置
        const networksConfig = await storageManager.getNetworks();
        const currentNetworkId = await storageManager.getCurrentNetwork();
        
        // 初始化网络管理器
        await networkManager.initialize(networksConfig, currentNetworkId);
        
        setIsInitialized(true);
      } catch (error) {
        setError(`初始化网络失败: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeNetwork();
  }, []);

  // 监听网络管理器事件
  useEffect(() => {
    const handleInitialized = ({ networks: nets, currentNetwork: current }) => {
      setNetworks(nets);
      setCurrentNetwork(current);
      setConnectionStatus('connected');
    };

    const handleNetworkChanged = ({ to, network }) => {
      setCurrentNetwork(to);
      message.success(`已切换到 ${network.name}`);
    };

    const handleNetworkAdded = ({ networkId, network }) => {
      setNetworks(prev => ({ ...prev, [networkId]: network }));
      message.success(`已添加网络 ${network.name}`);
    };

    const handleNetworkRemoved = ({ networkId, network }) => {
      setNetworks(prev => {
        const newNetworks = { ...prev };
        delete newNetworks[networkId];
        return newNetworks;
      });
      message.success(`已删除网络 ${network.name}`);
    };

    const handleProviderUpdated = ({ provider: newProvider }) => {
      setProvider(newProvider);
      setConnectionStatus('connected');
    };

    const handleError = (error) => {
      setError(error.message);
      setConnectionStatus('error');
      message.error(error.message);
    };

    // 注册事件监听器
    networkManager.on('initialized', handleInitialized);
    networkManager.on('networkChanged', handleNetworkChanged);
    networkManager.on('networkAdded', handleNetworkAdded);
    networkManager.on('networkRemoved', handleNetworkRemoved);
    networkManager.on('providerUpdated', handleProviderUpdated);
    networkManager.on('error', handleError);

    // 清理函数
    return () => {
      networkManager.off('initialized', handleInitialized);
      networkManager.off('networkChanged', handleNetworkChanged);
      networkManager.off('networkAdded', handleNetworkAdded);
      networkManager.off('networkRemoved', handleNetworkRemoved);
      networkManager.off('providerUpdated', handleProviderUpdated);
      networkManager.off('error', handleError);
    };
  }, []);

  // 切换网络
  const switchNetwork = useCallback(async (networkId) => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const network = await networkManager.switchNetwork(networkId);
      
      // 保存当前网络到存储
      await storageManager.saveCurrentNetwork(networkId);
      
      return network;
    } catch (error) {
      setError(error.message);
      setConnectionStatus('error');
      message.error(`切换网络失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 添加自定义网络
  const addCustomNetwork = useCallback(async (networkConfig) => {
    try {
      setLoading(true);
      setError(null);

      const networkId = await networkManager.addCustomNetwork(networkConfig);
      
      // 保存网络配置到存储
      const updatedNetworks = networkManager.getAllNetworks();
      await storageManager.saveNetworks(updatedNetworks);
      
      return networkId;
    } catch (error) {
      setError(error.message);
      message.error(`添加网络失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除自定义网络
  const removeCustomNetwork = useCallback(async (networkId) => {
    try {
      setLoading(true);
      setError(null);

      networkManager.removeCustomNetwork(networkId);
      
      // 保存网络配置到存储
      const updatedNetworks = networkManager.getAllNetworks();
      await storageManager.saveNetworks(updatedNetworks);
      
    } catch (error) {
      setError(error.message);
      message.error(`删除网络失败: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查网络状态
  const checkNetworkStatus = useCallback(async (networkId = null) => {
    try {
      setLoading(true);
      const status = await networkManager.checkNetworkStatus(networkId);
      
      if (status.connected) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
      
      return status;
    } catch (error) {
      setError(error.message);
      setConnectionStatus('error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取当前网络配置
  const getCurrentNetworkConfig = useCallback(() => {
    return networkManager.getCurrentNetworkConfig();
  }, []);

  // 获取当前 Provider
  const getCurrentProvider = useCallback(() => {
    return networkManager.getCurrentProvider();
  }, []);

  // 获取所有网络
  const getAllNetworks = useCallback(() => {
    return networkManager.getAllNetworks();
  }, []);

  // 检查是否为测试网络
  const isTestNetwork = useCallback((networkId = null) => {
    const targetNetworkId = networkId || currentNetwork;
    const network = networks[targetNetworkId];
    return network ? network.isTestnet : false;
  }, [currentNetwork, networks]);

  // 检查是否为自定义网络
  const isCustomNetwork = useCallback((networkId = null) => {
    const targetNetworkId = networkId || currentNetwork;
    const network = networks[targetNetworkId];
    return network ? network.isCustom : false;
  }, [currentNetwork, networks]);

  // 获取网络符号
  const getNetworkSymbol = useCallback((networkId = null) => {
    const targetNetworkId = networkId || currentNetwork;
    const network = networks[targetNetworkId];
    return network ? network.symbol : 'ETH';
  }, [currentNetwork, networks]);

  // 获取区块浏览器链接
  const getBlockExplorerUrl = useCallback((type, value, networkId = null) => {
    const targetNetworkId = networkId || currentNetwork;
    const network = networks[targetNetworkId];
    
    if (!network || !network.blockExplorer) {
      return null;
    }

    const baseUrl = network.blockExplorer;
    
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${value}`;
      case 'address':
        return `${baseUrl}/address/${value}`;
      case 'block':
        return `${baseUrl}/block/${value}`;
      case 'token':
        return `${baseUrl}/token/${value}`;
      default:
        return baseUrl;
    }
  }, [currentNetwork, networks]);

  return {
    // 状态
    currentNetwork,
    networks,
    provider,
    isInitialized,
    loading,
    error,
    connectionStatus,
    
    // 方法
    switchNetwork,
    addCustomNetwork,
    removeCustomNetwork,
    checkNetworkStatus,
    getCurrentNetworkConfig,
    getCurrentProvider,
    getAllNetworks,
    
    // 工具方法
    isTestNetwork,
    isCustomNetwork,
    getNetworkSymbol,
    getBlockExplorerUrl,
    
    // 计算属性
    currentNetworkConfig: getCurrentNetworkConfig(),
    currentProvider: getCurrentProvider(),
    allNetworks: getAllNetworks(),
    networkSymbol: getNetworkSymbol(),
    isCurrentTestNetwork: isTestNetwork(),
    isCurrentCustomNetwork: isCustomNetwork()
  };
};
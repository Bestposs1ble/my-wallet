/**
 * 网络管理器 - 负责网络配置和切换
 * 职责：网络管理、Provider 管理、网络配置等
 */
import EventEmitter from 'events';
import * as blockchainService from '../../services/blockchainService';

export class NetworkManager extends EventEmitter {
  constructor() {
    super();
    this.currentNetwork = 'mainnet';
    this.networks = {};
    this.provider = null;
    this.isInitialized = false;
  }

  /**
   * 初始化网络管理器
   * @param {Object} networksConfig - 网络配置
   * @param {string} currentNetworkId - 当前网络ID
   */
  async initialize(networksConfig, currentNetworkId = 'mainnet') {
    try {
      this.networks = networksConfig || this.getDefaultNetworks();
      this.currentNetwork = currentNetworkId;
      
      // 初始化 Provider
      await this.updateProvider(this.currentNetwork);
      
      this.isInitialized = true;
      this.emit('initialized', {
        networks: this.networks,
        currentNetwork: this.currentNetwork
      });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取默认网络配置
   * @returns {Object} 默认网络配置
   */
  getDefaultNetworks() {
    return {
      mainnet: {
        name: 'Ethereum Mainnet',
        url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        chainId: 1,
        symbol: 'ETH',
        blockExplorer: 'https://etherscan.io',
        isTestnet: false
      },
      goerli: {
        name: 'Goerli Testnet',
        url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        chainId: 5,
        symbol: 'ETH',
        blockExplorer: 'https://goerli.etherscan.io',
        isTestnet: true
      },
      sepolia: {
        name: 'Sepolia Testnet',
        url: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        chainId: 11155111,
        symbol: 'ETH',
        blockExplorer: 'https://sepolia.etherscan.io',
        isTestnet: true
      },
      polygon: {
        name: 'Polygon Mainnet',
        url: 'https://polygon-rpc.com',
        chainId: 137,
        symbol: 'MATIC',
        blockExplorer: 'https://polygonscan.com',
        isTestnet: false
      },
      bsc: {
        name: 'BSC Mainnet',
        url: 'https://bsc-dataseed1.binance.org',
        chainId: 56,
        symbol: 'BNB',
        blockExplorer: 'https://bscscan.com',
        isTestnet: false
      }
    };
  }

  /**
   * 切换网络
   * @param {string} networkId - 网络ID
   * @returns {Promise<Object>} 网络配置
   */
  async switchNetwork(networkId) {
    try {
      if (!this.networks[networkId]) {
        throw new Error(`未找到网络配置: ${networkId}`);
      }

      const previousNetwork = this.currentNetwork;
      this.currentNetwork = networkId;

      // 更新 Provider
      await this.updateProvider(networkId);

      // 触发事件
      this.emit('networkChanged', {
        from: previousNetwork,
        to: networkId,
        network: this.networks[networkId]
      });

      return this.networks[networkId];
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 添加自定义网络
   * @param {Object} networkConfig - 网络配置
   * @returns {Promise<string>} 网络ID
   */
  async addCustomNetwork(networkConfig) {
    try {
      const { name, url, chainId, symbol, blockExplorer } = networkConfig;

      // 验证必需字段
      if (!name || !url || !chainId || !symbol) {
        throw new Error('网络配置缺少必需字段');
      }

      // 检查 chainId 是否已存在
      const existingNetwork = Object.values(this.networks).find(
        network => network.chainId === chainId
      );

      if (existingNetwork) {
        throw new Error(`Chain ID ${chainId} 已存在`);
      }

      // 生成网络ID
      const networkId = `custom_${chainId}`;

      // 添加网络配置
      const newNetwork = {
        name,
        url,
        chainId,
        symbol,
        blockExplorer: blockExplorer || '',
        isTestnet: chainId !== 1 && chainId !== 137 && chainId !== 56, // 简单判断
        isCustom: true,
        addedAt: Date.now()
      };

      this.networks[networkId] = newNetwork;

      // 触发事件
      this.emit('networkAdded', {
        networkId,
        network: newNetwork
      });

      this.emit('networksChanged', this.networks);

      return networkId;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 删除自定义网络
   * @param {string} networkId - 网络ID
   */
  removeCustomNetwork(networkId) {
    try {
      const network = this.networks[networkId];
      
      if (!network) {
        throw new Error('网络不存在');
      }

      if (!network.isCustom) {
        throw new Error('无法删除内置网络');
      }

      if (this.currentNetwork === networkId) {
        throw new Error('无法删除当前使用的网络');
      }

      delete this.networks[networkId];

      this.emit('networkRemoved', { networkId, network });
      this.emit('networksChanged', this.networks);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 更新 Provider
   * @param {string} networkId - 网络ID
   * @returns {Promise<Object>} Provider 实例
   */
  async updateProvider(networkId) {
    try {
      const network = this.networks[networkId];
      
      if (!network) {
        throw new Error(`未找到网络配置: ${networkId}`);
      }

      // 直接创建 Provider，避免循环依赖
      this.provider = blockchainService.createProvider(network.url, network.chainId);

      // 测试连接
      try {
        const networkInfo = await this.provider.getNetwork();
        console.log(`成功连接到网络: ${networkInfo.name} (${networkInfo.chainId})`);
        
        this.emit('providerUpdated', {
          networkId,
          provider: this.provider,
          networkInfo
        });
      } catch (testError) {
        console.warn(`网络连接测试失败: ${testError.message}`);
      }

      return this.provider;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取当前网络配置
   * @returns {Object|null} 当前网络配置
   */
  getCurrentNetworkConfig() {
    return this.networks[this.currentNetwork] || null;
  }

  /**
   * 获取当前 Provider
   * @returns {Object|null} 当前 Provider
   */
  getCurrentProvider() {
    return this.provider;
  }

  /**
   * 获取所有网络配置
   * @returns {Object} 所有网络配置
   */
  getAllNetworks() {
    return { ...this.networks };
  }

  /**
   * 检查网络连接状态
   * @param {string} networkId - 网络ID（可选）
   * @returns {Promise<Object>} 连接状态
   */
  async checkNetworkStatus(networkId = null) {
    try {
      const targetNetworkId = networkId || this.currentNetwork;
      const network = this.networks[targetNetworkId];
      
      if (!network) {
        throw new Error(`网络不存在: ${targetNetworkId}`);
      }

      // 如果是当前网络，使用现有 Provider
      let provider = this.provider;
      if (networkId && networkId !== this.currentNetwork) {
        // 创建临时 Provider 进行测试
        provider = blockchainService.createProvider(network.url, network.chainId);
      }

      const startTime = Date.now();
      const networkInfo = await provider.getNetwork();
      const responseTime = Date.now() - startTime;

      return {
        networkId: targetNetworkId,
        network,
        connected: true,
        responseTime,
        chainId: networkInfo.chainId,
        name: networkInfo.name
      };
    } catch (error) {
      return {
        networkId: networkId || this.currentNetwork,
        network: this.networks[networkId || this.currentNetwork],
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * 获取网络状态
   * @returns {Object} 网络管理器状态
   */
  getState() {
    return {
      currentNetwork: this.currentNetwork,
      networks: this.networks,
      provider: this.provider,
      isInitialized: this.isInitialized,
      currentNetworkConfig: this.getCurrentNetworkConfig()
    };
  }
}

// 创建单例实例
export const networkManager = new NetworkManager();
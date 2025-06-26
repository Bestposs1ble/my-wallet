/**
 * 存储管理器 - 负责数据持久化和缓存
 * 职责：加密存储、数据同步、缓存管理等
 */
import EventEmitter from 'events';
import { set, get, del, clear } from 'idb-keyval';
import { encryptData, decryptData } from '../../utils/ethersHelper';

export class StorageManager extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.encryptionKey = null;
    this.isInitialized = false;
  }

  /**
   * 初始化存储管理器
   * @param {string} password - 加密密码
   */
  async initialize(password) {
    try {
      this.encryptionKey = password;
      this.isInitialized = true;
      
      // 预加载常用数据到缓存
      await this.preloadCache();
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 预加载缓存
   */
  async preloadCache() {
    try {
      // 预加载网络配置
      const networks = await this.getNetworks();
      if (networks) {
        this.cache.set('networks', networks);
      }

      // 预加载设置
      const settings = await this.getSettings();
      if (settings) {
        this.cache.set('settings', settings);
      }

      // 预加载当前网络
      const currentNetwork = await this.getCurrentNetwork();
      if (currentNetwork) {
        this.cache.set('currentNetwork', currentNetwork);
      }
    } catch (error) {
      console.warn('预加载缓存失败:', error);
    }
  }

  /**
   * 加密存储数据到 IndexedDB
   * @param {string} key - 存储键
   * @param {any} data - 要存储的数据
   * @param {boolean} encrypt - 是否加密（默认true）
   */
  async setSecure(key, data, encrypt = true) {
    try {
      let storageData = data;
      
      if (encrypt && this.encryptionKey) {
        storageData = encryptData(data, this.encryptionKey);
      }
      
      await set(key, storageData);
      
      // 更新缓存
      this.cache.set(key, data);
      
      this.emit('dataStored', { key, encrypted: encrypt });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 从 IndexedDB 解密读取数据
   * @param {string} key - 存储键
   * @param {boolean} decrypt - 是否解密（默认true）
   * @returns {Promise<any>} 解密后的数据
   */
  async getSecure(key, decrypt = true) {
    try {
      // 先检查缓存
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const storageData = await get(key);
      
      if (!storageData) {
        return null;
      }

      let data = storageData;
      
      if (decrypt && this.encryptionKey) {
        data = decryptData(storageData, this.encryptionKey);
      }
      
      // 更新缓存
      this.cache.set(key, data);
      
      return data;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 删除存储数据
   * @param {string} key - 存储键
   */
  async remove(key) {
    try {
      await del(key);
      this.cache.delete(key);
      
      this.emit('dataRemoved', { key });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 清空所有存储数据
   */
  async clearAll() {
    try {
      await clear();
      this.cache.clear();
      
      this.emit('allDataCleared');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 存储钱包数据
   * @param {Array} wallets - 钱包列表
   * @param {string} password - 加密密码
   */
  async saveWallets(wallets, password = null) {
    const encryptionPassword = password || this.encryptionKey;
    if (!encryptionPassword) {
      throw new Error('需要密码才能保存钱包');
    }
    
    await this.setSecure('wallets', wallets, true);
    
    // 同时保存到 localStorage 作为备份
    try {
      const encryptedData = encryptData(wallets, encryptionPassword);
      localStorage.setItem('metamask-clone-wallets', encryptedData);
    } catch (error) {
      console.warn('保存到 localStorage 失败:', error);
    }
  }

  /**
   * 读取钱包数据
   * @param {string} password - 解密密码
   * @returns {Promise<Array>} 钱包列表
   */
  async getWallets(password = null) {
    const decryptionPassword = password || this.encryptionKey;
    if (!decryptionPassword) {
      throw new Error('需要密码才能读取钱包');
    }

    try {
      // 优先从 IndexedDB 读取
      const wallets = await this.getSecure('wallets', true);
      if (wallets) {
        return wallets;
      }

      // 回退到 localStorage
      const encryptedData = localStorage.getItem('metamask-clone-wallets');
      if (encryptedData) {
        const walletsFromLS = decryptData(encryptedData, decryptionPassword);
        // 迁移到 IndexedDB
        await this.setSecure('wallets', walletsFromLS, true);
        return walletsFromLS;
      }

      return [];
    } catch (error) {
      console.error('读取钱包失败:', error);
      throw new Error('无法解密钱包数据');
    }
  }

  /**
   * 检查是否有存储的钱包
   * @returns {Promise<boolean>} 是否有钱包
   */
  async hasWallets() {
    try {
      // 检查 IndexedDB
      const walletsFromDB = await get('wallets');
      if (walletsFromDB) {
        return true;
      }

      // 检查 localStorage
      const walletsFromLS = localStorage.getItem('metamask-clone-wallets');
      return !!walletsFromLS;
    } catch (error) {
      console.error('检查钱包存在性失败:', error);
      return false;
    }
  }

  /**
   * 存储主助记词
   * @param {string} mnemonic - 助记词
   * @param {string} password - 加密密码
   */
  async saveMasterMnemonic(mnemonic, password = null) {
    const encryptionPassword = password || this.encryptionKey;
    if (!encryptionPassword) {
      throw new Error('需要密码才能保存助记词');
    }
    
    await this.setSecure('masterMnemonic', mnemonic, true);
  }

  /**
   * 读取主助记词
   * @param {string} password - 解密密码
   * @returns {Promise<string>} 助记词
   */
  async getMasterMnemonic(password = null) {
    const decryptionPassword = password || this.encryptionKey;
    if (!decryptionPassword) {
      throw new Error('需要密码才能读取助记词');
    }
    
    return await this.getSecure('masterMnemonic', true);
  }

  /**
   * 存储网络配置
   * @param {Object} networks - 网络配置
   */
  async saveNetworks(networks) {
    await this.setSecure('networks', networks, false);
    localStorage.setItem('metamask-clone-networks', JSON.stringify(networks));
  }

  /**
   * 读取网络配置
   * @returns {Promise<Object>} 网络配置
   */
  async getNetworks() {
    try {
      // 优先从缓存读取
      if (this.cache.has('networks')) {
        return this.cache.get('networks');
      }

      // 从 IndexedDB 读取
      let networks = await this.getSecure('networks', false);
      
      if (!networks) {
        // 回退到 localStorage
        const networksFromLS = localStorage.getItem('metamask-clone-networks');
        if (networksFromLS) {
          networks = JSON.parse(networksFromLS);
          // 迁移到 IndexedDB
          await this.setSecure('networks', networks, false);
        }
      }

      return networks || this.getDefaultNetworks();
    } catch (error) {
      console.error('读取网络配置失败:', error);
      return this.getDefaultNetworks();
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
      }
    };
  }

  /**
   * 存储当前网络
   * @param {string} networkId - 网络ID
   */
  async saveCurrentNetwork(networkId) {
    await this.setSecure('currentNetwork', networkId, false);
    localStorage.setItem('metamask-clone-current-network', networkId);
  }

  /**
   * 读取当前网络
   * @returns {Promise<string>} 网络ID
   */
  async getCurrentNetwork() {
    try {
      // 优先从缓存读取
      if (this.cache.has('currentNetwork')) {
        return this.cache.get('currentNetwork');
      }

      // 从 IndexedDB 读取
      let currentNetwork = await this.getSecure('currentNetwork', false);
      
      if (!currentNetwork) {
        // 回退到 localStorage
        currentNetwork = localStorage.getItem('metamask-clone-current-network');
        if (currentNetwork) {
          // 迁移到 IndexedDB
          await this.setSecure('currentNetwork', currentNetwork, false);
        }
      }

      return currentNetwork || 'mainnet';
    } catch (error) {
      console.error('读取当前网络失败:', error);
      return 'mainnet';
    }
  }

  /**
   * 存储设置
   * @param {Object} settings - 设置对象
   */
  async saveSettings(settings) {
    await this.setSecure('settings', settings, false);
    localStorage.setItem('metamask-clone-settings', JSON.stringify(settings));
  }

  /**
   * 读取设置
   * @returns {Promise<Object>} 设置对象
   */
  async getSettings() {
    try {
      // 优先从缓存读取
      if (this.cache.has('settings')) {
        return this.cache.get('settings');
      }

      // 从 IndexedDB 读取
      let settings = await this.getSecure('settings', false);
      
      if (!settings) {
        // 回退到 localStorage
        const settingsFromLS = localStorage.getItem('metamask-clone-settings');
        if (settingsFromLS) {
          settings = JSON.parse(settingsFromLS);
          // 迁移到 IndexedDB
          await this.setSecure('settings', settings, false);
        }
      }

      return settings || this.getDefaultSettings();
    } catch (error) {
      console.error('读取设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 获取默认设置
   * @returns {Object} 默认设置
   */
  getDefaultSettings() {
    return {
      autoLock: 15, // 15分钟自动锁定
      showTestNetworks: false,
      currency: 'USD',
      language: 'zh-CN',
      notifications: true,
      analytics: false
    };
  }

  /**
   * 存储代币列表
   * @param {Array} tokens - 代币列表
   * @param {string} networkId - 网络ID
   */
  async saveTokens(tokens, networkId) {
    const key = `tokens_${networkId}`;
    await this.setSecure(key, tokens, false);
    localStorage.setItem(`metamask-clone-${key}`, JSON.stringify(tokens));
  }

  /**
   * 读取代币列表
   * @param {string} networkId - 网络ID
   * @returns {Promise<Array>} 代币列表
   */
  async getTokens(networkId) {
    try {
      const key = `tokens_${networkId}`;
      
      // 从 IndexedDB 读取
      let tokens = await this.getSecure(key, false);
      
      if (!tokens) {
        // 回退到 localStorage
        const tokensFromLS = localStorage.getItem(`metamask-clone-${key}`);
        if (tokensFromLS) {
          tokens = JSON.parse(tokensFromLS);
          // 迁移到 IndexedDB
          await this.setSecure(key, tokens, false);
        }
      }

      return tokens || [];
    } catch (error) {
      console.error('读取代币列表失败:', error);
      return [];
    }
  }

  /**
   * 存储交易历史
   * @param {Array} transactions - 交易列表
   * @param {string} address - 钱包地址
   */
  async saveTransactionHistory(transactions, address) {
    const key = `txHistory_${address}`;
    await this.setSecure(key, transactions, true);
  }

  /**
   * 读取交易历史
   * @param {string} address - 钱包地址
   * @returns {Promise<Array>} 交易列表
   */
  async getTransactionHistory(address) {
    try {
      const key = `txHistory_${address}`;
      return await this.getSecure(key, true) || [];
    } catch (error) {
      console.error('读取交易历史失败:', error);
      return [];
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.emit('cacheCleared');
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }

  /**
   * 获取存储管理器状态
   * @returns {Object} 状态对象
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      hasEncryptionKey: !!this.encryptionKey,
      cacheStats: this.getCacheStats()
    };
  }
}

// 创建单例实例
export const storageManager = new StorageManager();
/**
 * 钱包管理器 - 负责钱包的核心操作
 * 职责：钱包创建、导入、切换、派生账户等
 */
import { ethers } from 'ethers';
import * as ethersHelper from '../../utils/ethersHelper';
import EventEmitter from 'events';

export class WalletManager extends EventEmitter {
  constructor() {
    super();
    this.wallets = [];
    this.currentWalletIndex = 0;
    this.masterMnemonic = null;
    this.isLocked = true;
  }

  /**
   * 创建新钱包
   * @param {string} password - 加密密码
   * @param {string} mnemonic - 助记词（可选）
   * @returns {Promise<Object>} 创建的钱包信息
   */
  async createWallet(password, mnemonic = null) {
    try {
      // 生成或使用提供的助记词
      const walletMnemonic = mnemonic || ethersHelper.generateMnemonic();
      
      // 验证助记词
      if (!ethersHelper.validateMnemonic(walletMnemonic)) {
        throw new Error('无效的助记词');
      }

      // 创建第一个账户
      const derivationPath = "m/44'/60'/0'/0/0";
      const wallet = ethersHelper.createWalletFromMnemonic(walletMnemonic, derivationPath);
      
      const walletData = {
        address: wallet.address,
        name: '账户1',
        path: "m/44'/60'/0'/0/0",
        index: 0,
        createdAt: Date.now()
      };

      // 设置钱包状态
      this.wallets = [walletData];
      this.currentWalletIndex = 0;
      this.masterMnemonic = walletMnemonic;
      this.isLocked = false;

      // 触发事件
      this.emit('walletCreated', {
        wallet: walletData,
        mnemonic: walletMnemonic
      });

      this.emit('walletsChanged', this.wallets);
      this.emit('currentWalletChanged', walletData);

      return {
        wallet: walletData,
        mnemonic: walletMnemonic
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 导入钱包
   * @param {string} password - 加密密码
   * @param {string} mnemonic - 助记词
   * @returns {Promise<Object>} 导入的钱包信息
   */
  async importWallet(password, mnemonic) {
    try {
      // 验证助记词
      if (!ethersHelper.validateMnemonic(mnemonic)) {
        throw new Error('无效的助记词');
      }

      // 创建钱包
      const derivationPath = "m/44'/60'/0'/0/0";
      const wallet = ethersHelper.createWalletFromMnemonic(mnemonic, derivationPath);
      
      const walletData = {
        address: wallet.address,
        name: '导入账户1',
        path: "m/44'/60'/0'/0/0",
        index: 0,
        createdAt: Date.now(),
        imported: true
      };

      // 设置钱包状态
      this.wallets = [walletData];
      this.currentWalletIndex = 0;
      this.masterMnemonic = mnemonic;
      this.isLocked = false;

      // 触发事件
      this.emit('walletImported', {
        wallet: walletData,
        mnemonic
      });

      this.emit('walletsChanged', this.wallets);
      this.emit('currentWalletChanged', walletData);

      return {
        wallet: walletData,
        mnemonic
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 通过私钥导入钱包
   * @param {string} privateKey - 私钥
   * @returns {Promise<Object>} 导入的钱包信息
   */
  async importWalletByPrivateKey(privateKey) {
    try {
      // 验证并创建钱包
      const wallet = new ethers.Wallet(privateKey);
      
      const walletData = {
        address: wallet.address,
        name: `导入账户${this.wallets.length + 1}`,
        privateKey: privateKey,
        createdAt: Date.now(),
        imported: true,
        fromPrivateKey: true
      };

      // 添加到钱包列表
      this.wallets.push(walletData);

      // 触发事件
      this.emit('walletImported', { wallet: walletData });
      this.emit('walletsChanged', this.wallets);

      return walletData;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 添加派生账户
   * @param {string} name - 账户名称
   * @returns {Promise<Object>} 新创建的账户
   */
  async addDerivedAccount(name = null) {
    try {
      if (!this.masterMnemonic) {
        throw new Error('需要主助记词才能派生新账户');
      }

      const accountIndex = this.wallets.filter(w => !w.fromPrivateKey).length;
      const path = `m/44'/60'/0'/0/${accountIndex}`;
      
      // 创建新账户
      const wallet = ethersHelper.createWalletFromMnemonic(this.masterMnemonic, path);
      
      const walletData = {
        address: wallet.address,
        name: name || `账户${accountIndex + 1}`,
        path,
        index: accountIndex,
        createdAt: Date.now()
      };

      // 添加到钱包列表
      this.wallets.push(walletData);

      // 触发事件
      this.emit('accountAdded', walletData);
      this.emit('walletsChanged', this.wallets);

      return walletData;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 切换当前钱包
   * @param {number} index - 钱包索引
   */
  switchWallet(index) {
    try {
      if (index < 0 || index >= this.wallets.length) {
        throw new Error('无效的钱包索引');
      }

      this.currentWalletIndex = index;
      const currentWallet = this.wallets[index];

      this.emit('currentWalletChanged', currentWallet);
      this.emit('walletSwitched', { index, wallet: currentWallet });

      return currentWallet;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取当前钱包
   * @returns {Object|null} 当前钱包对象
   */
  getCurrentWallet() {
    if (this.wallets.length === 0 || this.currentWalletIndex >= this.wallets.length) {
      return null;
    }
    return this.wallets[this.currentWalletIndex];
  }

  /**
   * 获取钱包的以太坊钱包实例
   * @param {number} index - 钱包索引（可选，默认当前钱包）
   * @returns {ethers.Wallet} 以太坊钱包实例
   */
  getWalletInstance(index = null) {
    const walletIndex = index !== null ? index : this.currentWalletIndex;
    const walletData = this.wallets[walletIndex];
    
    if (!walletData) {
      throw new Error('钱包不存在');
    }

    if (walletData.fromPrivateKey) {
      return new ethers.Wallet(walletData.privateKey);
    } else {
      if (!this.masterMnemonic) {
        throw new Error('需要助记词才能创建钱包实例');
      }
      const path = walletData.path || `m/44'/60'/0'/0/${walletData.index || 0}`;
      return ethersHelper.createWalletFromMnemonic(this.masterMnemonic, path);
    }
  }

  /**
   * 锁定钱包
   */
  lock() {
    this.isLocked = true;
    this.masterMnemonic = null;
    this.wallets = [];
    this.currentWalletIndex = 0;

    this.emit('walletLocked');
    this.emit('walletsChanged', []);
  }

  /**
   * 解锁钱包
   * @param {string} password - 密码
   * @param {Array} wallets - 钱包列表
   * @param {string} mnemonic - 主助记词
   */
  unlock(password, wallets, mnemonic = null) {
    this.isLocked = false;
    this.wallets = wallets || [];
    this.masterMnemonic = mnemonic;
    this.currentWalletIndex = 0;

    this.emit('walletUnlocked');
    this.emit('walletsChanged', this.wallets);
    
    if (this.wallets.length > 0) {
      this.emit('currentWalletChanged', this.wallets[0]);
    }
  }

  /**
   * 重置钱包（删除所有数据）
   */
  reset() {
    this.wallets = [];
    this.currentWalletIndex = 0;
    this.masterMnemonic = null;
    this.isLocked = true;

    this.emit('walletReset');
    this.emit('walletsChanged', []);
  }

  /**
   * 获取钱包状态
   * @returns {Object} 钱包状态
   */
  getState() {
    return {
      wallets: this.wallets,
      currentWalletIndex: this.currentWalletIndex,
      isLocked: this.isLocked,
      hasWallets: this.wallets.length > 0,
      currentWallet: this.getCurrentWallet()
    };
  }

  /**
   * 删除钱包账户
   * @param {number} index - 要删除的钱包索引
   * @returns {Promise<boolean>} 操作结果
   */
  async deleteWallet(index) {
    try {
      if (index < 0 || index >= this.wallets.length) {
        throw new Error('无效的钱包索引');
      }

      if (this.wallets.length === 1) {
        throw new Error('不能删除唯一的钱包账户');
      }

      // 获取要删除的钱包信息
      const walletToDelete = this.wallets[index];

      // 从列表中移除
      this.wallets = this.wallets.filter((_, i) => i !== index);

      // 如果删除的是当前选中的钱包，则切换到第一个钱包
      if (this.currentWalletIndex === index) {
        this.currentWalletIndex = 0;
        this.emit('currentWalletChanged', this.wallets[0]);
      } else if (this.currentWalletIndex > index) {
        // 如果删除的钱包索引小于当前钱包，则当前索引需要减1
        this.currentWalletIndex--;
      }

      // 触发事件
      this.emit('walletDeleted', walletToDelete);
      this.emit('walletsChanged', this.wallets);

      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 导出钱包私钥
   * @param {number} index - 钱包索引
   * @param {string} password - 钱包密码（用于验证）
   * @returns {Promise<string>} 私钥
   */
  async exportPrivateKey(index, password) {
    try {
      if (this.isLocked) {
        throw new Error('钱包已锁定，请先解锁');
      }

      if (index < 0 || index >= this.wallets.length) {
        throw new Error('无效的钱包索引');
      }

      const walletData = this.wallets[index];

      // 如果是从私钥导入的钱包，直接返回存储的私钥
      if (walletData.fromPrivateKey && walletData.privateKey) {
        return walletData.privateKey;
      }

      // 如果是从助记词派生的钱包，需要从助记词派生私钥
      if (!this.masterMnemonic) {
        throw new Error('无法导出私钥，缺少主助记词');
      }

      const path = walletData.path || `m/44'/60'/0'/0/${walletData.index || 0}`;
      const wallet = ethersHelper.createWalletFromMnemonic(this.masterMnemonic, path);
      
      // 记录导出私钥的操作
      this.emit('privateKeyExported', { address: walletData.address, index });

      return wallet.privateKey;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 重命名钱包账户
   * @param {number} index - 钱包索引
   * @param {string} newName - 新名称
   * @returns {Promise<Object>} 更新后的钱包信息
   */
  async renameWallet(index, newName) {
    try {
      if (index < 0 || index >= this.wallets.length) {
        throw new Error('无效的钱包索引');
      }

      if (!newName || newName.trim() === '') {
        throw new Error('名称不能为空');
      }

      // 更新钱包名称
      this.wallets[index] = {
        ...this.wallets[index],
        name: newName.trim()
      };

      const updatedWallet = this.wallets[index];

      // 触发事件
      this.emit('walletRenamed', { index, wallet: updatedWallet });
      this.emit('walletsChanged', this.wallets);

      // 如果是当前钱包，也触发当前钱包变更事件
      if (index === this.currentWalletIndex) {
        this.emit('currentWalletChanged', updatedWallet);
      }

      return updatedWallet;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}

// 创建单例实例
export const walletManager = new WalletManager();
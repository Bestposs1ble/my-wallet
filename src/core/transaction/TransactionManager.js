/**
 * 交易管理器 - 负责交易的创建、发送、跟踪
 * 职责：交易构建、签名、发送、状态跟踪等
 */
import { ethers } from 'ethers';
import EventEmitter from 'events';
import * as ethersHelper from '../../utils/ethersHelper';

export class TransactionManager extends EventEmitter {
  constructor() {
    super();
    this.pendingTransactions = new Map();
    this.transactionHistory = [];
    this.gasSettings = {
      gasPrice: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasLimit: null
    };
  }

  /**
   * 发送交易
   * @param {Object} params - 交易参数
   * @param {Object} wallet - 钱包实例
   * @param {Object} provider - Provider 实例
   * @returns {Promise<Object>} 交易结果
   */
  async sendTransaction(params, wallet, provider) {
    try {
      const {
        to,
        value,
        data = '0x',
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce
      } = params;

      // 验证参数
      if (!ethers.utils.isAddress(to)) {
        throw new Error('无效的接收地址');
      }

      if (!value || ethers.BigNumber.from(value).lt(0)) {
        throw new Error('无效的转账金额');
      }

      // 连接钱包到 Provider
      const connectedWallet = wallet.connect(provider);

      // 构建交易对象
      const transaction = {
        to,
        value,
        data
      };

      // 设置 Gas 参数
      if (gasLimit) {
        transaction.gasLimit = gasLimit;
      }

      // 处理 Gas 价格（EIP-1559 vs Legacy）
      const network = await provider.getNetwork();
      const supportsEIP1559 = network.chainId === 1 || network.chainId === 5 || network.chainId === 11155111;

      if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
        transaction.maxFeePerGas = maxFeePerGas;
        transaction.maxPriorityFeePerGas = maxPriorityFeePerGas;
        transaction.type = 2; // EIP-1559
      } else if (gasPrice) {
        transaction.gasPrice = gasPrice;
        transaction.type = 0; // Legacy
      }

      // 设置 nonce
      if (nonce !== undefined) {
        transaction.nonce = nonce;
      }

      // 估算 Gas Limit（如果未提供）
      if (!transaction.gasLimit) {
        try {
          transaction.gasLimit = await connectedWallet.estimateGas(transaction);
          // 增加 20% 的缓冲
          transaction.gasLimit = transaction.gasLimit.mul(120).div(100);
        } catch (error) {
          console.warn('Gas 估算失败，使用默认值:', error);
          transaction.gasLimit = ethers.BigNumber.from('21000');
        }
      }

      // 发送交易
      const txResponse = await connectedWallet.sendTransaction(transaction);

      // 创建交易记录
      const txRecord = {
        hash: txResponse.hash,
        from: wallet.address,
        to,
        value,
        data,
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice || transaction.maxFeePerGas,
        nonce: txResponse.nonce,
        timestamp: Date.now(),
        status: 'pending',
        networkId: network.chainId,
        type: transaction.type || 0
      };

      // 添加到待处理交易
      this.pendingTransactions.set(txResponse.hash, {
        ...txRecord,
        txResponse
      });

      // 添加到历史记录
      this.transactionHistory.unshift(txRecord);

      // 触发事件
      this.emit('transactionSent', txRecord);
      this.emit('transactionAdded', txRecord);

      // 开始监控交易状态
      this.monitorTransaction(txResponse.hash, provider);

      return {
        hash: txResponse.hash,
        transaction: txRecord
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 发送代币交易
   * @param {Object} params - 代币交易参数
   * @param {Object} wallet - 钱包实例
   * @param {Object} provider - Provider 实例
   * @returns {Promise<Object>} 交易结果
   */
  async sendTokenTransaction(params, wallet, provider) {
    try {
      const {
        tokenAddress,
        to,
        amount,
        decimals,
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas
      } = params;

      // 验证参数
      if (!ethers.utils.isAddress(tokenAddress)) {
        throw new Error('无效的代币地址');
      }

      if (!ethers.utils.isAddress(to)) {
        throw new Error('无效的接收地址');
      }

      // 创建代币合约实例
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)',
          'function balanceOf(address owner) view returns (uint256)'
        ],
        wallet.connect(provider)
      );

      // 转换金额为 wei
      const tokenAmount = ethers.utils.parseUnits(amount.toString(), decimals);

      // 检查余额
      const balance = await tokenContract.balanceOf(wallet.address);
      if (balance.lt(tokenAmount)) {
        throw new Error('代币余额不足');
      }

      // 构建交易数据
      const data = tokenContract.interface.encodeFunctionData('transfer', [to, tokenAmount]);

      // 发送交易
      return await this.sendTransaction({
        to: tokenAddress,
        value: '0',
        data,
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas
      }, wallet, provider);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 监控交易状态
   * @param {string} txHash - 交易哈希
   * @param {Object} provider - Provider 实例
   */
  async monitorTransaction(txHash, provider) {
    try {
      const pendingTx = this.pendingTransactions.get(txHash);
      if (!pendingTx) return;

      // 等待交易确认
      const receipt = await pendingTx.txResponse.wait();

      // 更新交易状态
      const updatedTx = {
        ...pendingTx,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        confirmations: receipt.confirmations,
        confirmedAt: Date.now()
      };

      // 从待处理列表中移除
      this.pendingTransactions.delete(txHash);

      // 更新历史记录
      const historyIndex = this.transactionHistory.findIndex(tx => tx.hash === txHash);
      if (historyIndex !== -1) {
        this.transactionHistory[historyIndex] = updatedTx;
      }

      // 触发事件
      this.emit('transactionConfirmed', updatedTx);
      this.emit('transactionUpdated', updatedTx);

    } catch (error) {
      // 交易失败
      const pendingTx = this.pendingTransactions.get(txHash);
      if (pendingTx) {
        const failedTx = {
          ...pendingTx,
          status: 'failed',
          error: error.message,
          failedAt: Date.now()
        };

        this.pendingTransactions.delete(txHash);

        // 更新历史记录
        const historyIndex = this.transactionHistory.findIndex(tx => tx.hash === txHash);
        if (historyIndex !== -1) {
          this.transactionHistory[historyIndex] = failedTx;
        }

        this.emit('transactionFailed', failedTx);
        this.emit('transactionUpdated', failedTx);
      }

      this.emit('error', error);
    }
  }

  /**
   * 获取交易状态
   * @param {string} txHash - 交易哈希
   * @param {Object} provider - Provider 实例
   * @returns {Promise<Object>} 交易状态
   */
  async getTransactionStatus(txHash, provider) {
    try {
      // 先检查本地记录
      const localTx = this.transactionHistory.find(tx => tx.hash === txHash);
      
      // 从区块链获取最新状态
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (receipt) {
        return {
          hash: txHash,
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          confirmations: receipt.confirmations,
          local: localTx
        };
      } else {
        // 检查交易是否存在
        const tx = await provider.getTransaction(txHash);
        if (tx) {
          return {
            hash: txHash,
            status: 'pending',
            blockNumber: tx.blockNumber,
            local: localTx
          };
        } else {
          return {
            hash: txHash,
            status: 'not_found',
            local: localTx
          };
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 估算 Gas 费用
   * @param {Object} transaction - 交易对象
   * @param {Object} provider - Provider 实例
   * @returns {Promise<Object>} Gas 估算结果
   */
  async estimateGas(transaction, provider) {
    try {
      const { to, value = '0', data = '0x', from } = transaction;

      // 估算 Gas Limit
      const gasLimit = await provider.estimateGas({
        to,
        value,
        data,
        from
      });

      // 获取 Gas 价格
      const network = await provider.getNetwork();
      const supportsEIP1559 = network.chainId === 1 || network.chainId === 5 || network.chainId === 11155111;

      let gasEstimate = {
        gasLimit: gasLimit.mul(120).div(100), // 增加 20% 缓冲
        estimatedGasLimit: gasLimit
      };

      if (supportsEIP1559) {
        // EIP-1559 费用估算
        const feeData = await provider.getFeeData();
        gasEstimate = {
          ...gasEstimate,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          baseFee: feeData.gasPrice,
          type: 2
        };
      } else {
        // Legacy 费用估算
        const gasPrice = await provider.getGasPrice();
        gasEstimate = {
          ...gasEstimate,
          gasPrice,
          type: 0
        };
      }

      return gasEstimate;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取待处理交易列表
   * @returns {Array} 待处理交易列表
   */
  getPendingTransactions() {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * 获取交易历史
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @returns {Array} 交易历史列表
   */
  getTransactionHistory(limit = 50, offset = 0) {
    return this.transactionHistory.slice(offset, offset + limit);
  }

  /**
   * 清除交易历史
   */
  clearHistory() {
    this.transactionHistory = [];
    this.emit('historyCleared');
  }

  /**
   * 获取交易管理器状态
   * @returns {Object} 状态对象
   */
  getState() {
    return {
      pendingTransactions: this.getPendingTransactions(),
      transactionHistory: this.transactionHistory,
      gasSettings: this.gasSettings,
      pendingCount: this.pendingTransactions.size,
      historyCount: this.transactionHistory.length
    };
  }
}

// 创建单例实例
export const transactionManager = new TransactionManager();
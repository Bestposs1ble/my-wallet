import { ethers } from 'ethers';
import { getNetworks, getCurrentNetwork } from './storageService';
import * as ethersHelper from '../utils/ethersHelper';

// 全局提供者实例
let provider = null;

/**
 * 初始化区块链服务
 * @returns {ethers.providers.Provider} 初始化的提供者
 */
const initBlockchainService = () => {
  try {
    const networks = getNetworks();
    const currentNetwork = getCurrentNetwork();
    const network = networks[currentNetwork];
    
    if (!network || !network.url) {
      throw new Error(`未找到网络配置: ${currentNetwork}`);
    }
    
    provider = ethersHelper.createProvider(network.url, network.chainId);
    return provider;
  } catch (error) {
    console.error('初始化区块链服务失败:', error);
    throw error;
  }
};

/**
 * 获取当前提供者，如果不存在则初始化
 * @returns {ethers.providers.Provider} 以太坊提供者
 */
const getProvider = () => {
  if (!provider) {
    provider = initBlockchainService();
  }
  return provider;
};

/**
 * 更新提供者为新的网络配置
 * @param {string} networkId 网络ID
 * @returns {ethers.providers.Provider} 更新后的提供者
 */
const updateProvider = (networkId) => {
  const networks = getNetworks();
  const network = networks[networkId];
  
  if (!network || !network.url) {
    throw new Error(`未找到网络配置: ${networkId}`);
  }
  
  console.log(`更新网络提供者: ${networkId}, URL=${network.url}, chainId=${network.chainId}`);
  
  try {
    provider = ethersHelper.createProvider(network.url, network.chainId);
    
    // 测试网络连接
    provider.getNetwork()
      .then(network => console.log(`成功连接到网络: ${network.name} (${network.chainId})`))
      .catch(err => console.error('网络连接测试失败:', err));
      
    return provider;
  } catch (error) {
    console.error(`创建提供者失败: ${error.message}`);
    throw error;
  }
};

/**
 * 获取ETH余额
 * @param {string} address 钱包地址
 * @returns {Promise<string>} ETH余额(以太为单位)
 */
const getEthBalance = async (address) => {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const currentProvider = getProvider();
      console.log(`使用提供者URL: ${currentProvider.connection?.url || '未知'}`);
      
      // 检查网络连接
      try {
        const network = await currentProvider.getNetwork();
        console.log(`当前连接的网络: chainId=${network.chainId}, name=${network.name}`);
      } catch (networkError) {
        console.warn(`获取网络信息失败: ${networkError.message}`);
      }
      
      // 获取余额
      const balance = await ethersHelper.getBalance(currentProvider, address);
      console.log(`成功获取余额: ${balance} ETH`);
      return balance;
    } catch (error) {
      attempts++;
      console.error(`获取ETH余额失败(尝试 ${attempts}/${maxAttempts}):`, error);
      
      if (attempts >= maxAttempts) {
        throw error;
      }
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('获取余额失败: 达到最大重试次数');
};

/**
 * 获取当前区块号
 * @returns {Promise<number>} 当前区块号
 */
const getCurrentBlockNumber = async () => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getBlockNumber();
  } catch (error) {
    console.error('获取当前区块号失败:', error);
    throw error;
  }
};

/**
 * 获取当前Gas价格
 * @returns {Promise<ethers.BigNumber>} Gas价格(wei)
 */
const getGasPrice = async () => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getGasPrice();
  } catch (error) {
    console.error('获取Gas价格失败:', error);
    throw error;
  }
};

/**
 * 获取交易收据
 * @param {string} txHash 交易哈希
 * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
 */
const getTransactionReceipt = async (txHash) => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getTransactionReceipt(txHash);
  } catch (error) {
    console.error('获取交易收据失败:', error);
    throw error;
  }
};

/**
 * 获取交易详情
 * @param {string} txHash 交易哈希
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易详情
 */
const getTransaction = async (txHash) => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.getTransaction(txHash);
  } catch (error) {
    console.error('获取交易详情失败:', error);
    throw error;
  }
};

/**
 * 发送已签名的交易
 * @param {string} signedTx 已签名的交易
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
const sendSignedTransaction = async (signedTx) => {
  try {
    const currentProvider = getProvider();
    return await currentProvider.sendTransaction(signedTx);
  } catch (error) {
    console.error('发送已签名交易失败:', error);
    throw error;
  }
};

/**
 * 创建并发送交易
 * @param {ethers.Wallet} wallet 钱包对象(已连接provider)
 * @param {string} toAddress 接收地址
 * @param {string|number} amount 发送数量(以太)
 * @param {object} options 交易选项
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
const sendTransaction = async (wallet, toAddress, amount, options = {}) => {
  try {
    if (!wallet.provider) {
      const currentProvider = getProvider();
      wallet = wallet.connect(currentProvider);
    }
    
    return await ethersHelper.sendTransaction(wallet, toAddress, amount, options);
  } catch (error) {
    console.error('发送交易失败:', error);
    throw error;
  }
};

/**
 * 检查地址是否为有效的以太坊地址
 * @param {string} address 要检查的地址
 * @returns {boolean} 是否有效
 */
const isValidAddress = (address) => {
  return ethers.utils.isAddress(address);
};

/**
 * 计算交易的预估Gas费
 * @param {object} txObject 交易对象
 * @returns {Promise<{gasFee: string, gasLimit: ethers.BigNumber, gasPrice: ethers.BigNumber}>} Gas信息
 */
const estimateTransactionGas = async (txObject) => {
  try {
    const currentProvider = getProvider();
    const gasPrice = await currentProvider.getGasPrice();
    const gasLimit = await currentProvider.estimateGas(txObject);
    
    // 计算总gas费用 (wei)
    const gasFeeWei = gasPrice.mul(gasLimit);
    // 转换为ETH
    const gasFee = ethers.utils.formatEther(gasFeeWei);
    
    return {
      gasFee,
      gasLimit,
      gasPrice
    };
  } catch (error) {
    console.error('计算交易Gas费失败:', error);
    throw error;
  }
};

export {
  initBlockchainService,
  getProvider,
  updateProvider,
  getEthBalance,
  getCurrentBlockNumber,
  getGasPrice,
  getTransactionReceipt,
  getTransaction,
  sendSignedTransaction,
  sendTransaction,
  isValidAddress,
  estimateTransactionGas
}; 
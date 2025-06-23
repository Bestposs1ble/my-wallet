import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import CryptoJS from 'crypto-js';

/**
 * 创建随机助记词
 * @param {number} strength 熵的位数，默认128位(12个单词)，可选160位(15个单词)或256位(24个单词)
 * @returns {string} 生成的助记词
 */
export const createMnemonic = (strength = 128) => {
  return bip39.generateMnemonic(strength);
};

/**
 * 验证助记词是否有效
 * @param {string} mnemonic 助记词
 * @returns {boolean} 是否有效
 */
export const validateMnemonic = (mnemonic) => {
  return bip39.validateMnemonic(mnemonic);
};

/**
 * 从助记词派生HD钱包
 * @param {string} mnemonic 助记词
 * @param {string} path 派生路径，默认为 m/44'/60'/0'/0/0 (以太坊主路径)
 * @returns {ethers.Wallet} 钱包对象
 */
export const createWalletFromMnemonic = (mnemonic, path = "m/44'/60'/0'/0/0") => {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('无效的助记词');
  }
  return ethers.Wallet.fromMnemonic(mnemonic, path);
};

/**
 * 从特定助记词派生多个账户
 * @param {string} mnemonic 助记词
 * @param {number} startIndex 起始索引
 * @param {number} count 要派生的账户数量
 * @returns {Array<ethers.Wallet>} 钱包对象数组
 */
export const deriveMultipleWallets = (mnemonic, startIndex = 0, count = 5) => {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('无效的助记词');
  }

  const wallets = [];
  
  for (let i = 0; i < count; i++) {
    const path = `m/44'/60'/0'/0/${startIndex + i}`;
    try {
      const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
      wallets.push(wallet);
    } catch (error) {
      console.error(`派生路径 ${path} 失败:`, error);
    }
  }
  
  return wallets;
};

/**
 * 从私钥创建钱包
 * @param {string} privateKey 私钥(带或不带0x前缀)
 * @returns {ethers.Wallet} 钱包对象
 */
export const createWalletFromPrivateKey = (privateKey) => {
  // 确保私钥有 0x 前缀
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  try {
    return new ethers.Wallet(formattedKey);
  } catch (error) {
    throw new Error(`无效的私钥格式: ${error.message}`);
  }
};

/**
 * 随机创建钱包
 * @returns {ethers.Wallet} 随机生成的钱包对象
 */
export const createRandomWallet = () => {
  return ethers.Wallet.createRandom();
};

/**
 * 加密钱包(Keystore格式)
 * @param {ethers.Wallet} wallet 钱包对象
 * @param {string} password 加密密码
 * @returns {Promise<string>} JSON格式的加密钱包
 */
export const encryptWallet = async (wallet, password) => {
  try {
    return await wallet.encrypt(password);
  } catch (error) {
    throw new Error(`钱包加密失败: ${error.message}`);
  }
};

/**
 * 解密Keystore钱包
 * @param {string} encryptedJson JSON格式的加密钱包
 * @param {string} password 解密密码
 * @returns {Promise<ethers.Wallet>} 解密后的钱包对象
 */
export const decryptWallet = async (encryptedJson, password) => {
  try {
    return await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
  } catch (error) {
    throw new Error(`钱包解密失败: ${error.message}`);
  }
};

/**
 * 使用AES加密数据
 * @param {object|string} data 要加密的数据
 * @param {string} password 加密密钥
 * @returns {string} 加密后的字符串
 */
export const encryptData = (data, password) => {
  const dataString = typeof data === 'object' ? JSON.stringify(data) : data.toString();
  return CryptoJS.AES.encrypt(dataString, password).toString();
};

/**
 * 解密AES加密的数据
 * @param {string} encryptedData 加密的数据字符串
 * @param {string} password 解密密钥
 * @returns {object|string} 解密后的数据
 */
export const decryptData = (encryptedData, password) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    try {
      return JSON.parse(decryptedText);
    } catch (e) {
      return decryptedText;
    }
  } catch (e) {
    throw new Error('解密失败，请检查密码是否正确');
  }
};

/**
 * 获取钱包ETH余额
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @param {string} address 钱包地址
 * @returns {Promise<string>} ETH余额(以太为单位)
 */
export const getBalance = async (provider, address) => {
  try {
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    throw new Error(`获取余额失败: ${error.message}`);
  }
};

/**
 * 估算Gas价格
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {Promise<ethers.BigNumber>} Gas价格(wei)
 */
export const estimateGasPrice = async (provider) => {
  try {
    return await provider.getGasPrice();
  } catch (error) {
    throw new Error(`获取Gas价格失败: ${error.message}`);
  }
};

/**
 * 创建交易对象
 * @param {string} to 接收地址
 * @param {string|number} value 发送数量(以太)
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @param {object} options 额外选项
 * @returns {Promise<object>} 交易对象
 */
export const createTransaction = async (to, value, provider, options = {}) => {
  try {
    // 转换为wei
    const valueInWei = ethers.utils.parseEther(value.toString());
    
    // 获取gasPrice
    const gasPrice = options.gasPrice || await provider.getGasPrice();
    
    // 估算gasLimit (如果没有提供)
    let gasLimit = options.gasLimit;
    if (!gasLimit) {
      const estimateGas = await provider.estimateGas({
        to,
        value: valueInWei
      });
      // 添加一点缓冲空间
      gasLimit = estimateGas.mul(12).div(10); // 120% of estimated gas
    }
    
    return {
      to,
      value: valueInWei,
      gasLimit,
      gasPrice,
      nonce: options.nonce,
      chainId: options.chainId || (await provider.getNetwork()).chainId,
    };
  } catch (error) {
    throw new Error(`创建交易失败: ${error.message}`);
  }
};

/**
 * 发送ETH交易
 * @param {ethers.Wallet} wallet 已连接provider的钱包对象
 * @param {string} toAddress 接收地址
 * @param {string|number} amount 发送数量(以太)
 * @param {object} options 交易选项
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
export const sendTransaction = async (wallet, toAddress, amount, options = {}) => {
  if (!wallet.provider) {
    throw new Error('钱包未连接到提供者');
  }
  
  try {
    const tx = await createTransaction(
      toAddress,
      amount,
      wallet.provider,
      options
    );
    
    return await wallet.sendTransaction(tx);
  } catch (error) {
    throw new Error(`发送交易失败: ${error.message}`);
  }
};

/**
 * 连接钱包到提供者
 * @param {ethers.Wallet} wallet 钱包对象
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {ethers.Wallet} 连接后的钱包
 */
export const connectWalletToProvider = (wallet, provider) => {
  return wallet.connect(provider);
};

/**
 * 创建以太坊提供者
 * @param {string} rpcUrl RPC URL
 * @param {number} chainId 链ID
 * @returns {ethers.providers.JsonRpcProvider} 以太坊提供者
 */
export const createProvider = (rpcUrl, chainId) => {
  // 当提供chainId时，创建带有chainId的provider
  if (chainId) {
    const network = {
      chainId,
      name: getNetworkNameByChainId(chainId)
    };
    return new ethers.providers.JsonRpcProvider(rpcUrl, network);
  }
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

/**
 * 根据链ID获取网络名称
 * @param {number} chainId 链ID
 * @returns {string} 网络名称
 */
export const getNetworkNameByChainId = (chainId) => {
  const networks = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
    56: 'bsc',
    137: 'polygon',
    42161: 'arbitrum',
    10: 'optimism',
    250: 'fantom',
    1337: 'localhost'
  };
  return networks[chainId] || 'unknown';
};

/**
 * 根据地址创建衍生账户名称
 * @param {number} index 账户索引
 * @param {string} address 地址
 * @returns {string} 账户名称
 */
export const createAccountName = (index, address) => {
  return `Account ${index + 1} (${address.substring(0, 6)}...${address.substring(address.length - 4)})`;
};

/**
 * 获取默认的Provider
 * @returns {ethers.providers.Provider} 默认提供者
 */
export const getDefaultProvider = () => {
  return ethers.getDefaultProvider();
};

/**
 * 校验以太坊地址
 * @param {string} address
 * @returns {boolean}
 */
export const isValidAddress = (address) => {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * 缩短地址显示
 * @param {string} address 钱包地址
 * @param {number} frontChars 前面保留的字符数，默认为6
 * @param {number} endChars 后面保留的字符数，默认为4
 * @returns {string} 缩短后的地址
 */
export const shortenAddress = (address, frontChars = 6, endChars = 4) => {
  if (!address) return '';
  if (!isValidAddress(address)) return address;
  if (address.length <= frontChars + endChars) return address;
  
  return `${address.slice(0, frontChars)}...${address.slice(-endChars)}`;
};

/**
 * ERC20代币标准ABI
 */
export const ERC20_ABI = [
  // 只包含必要的函数
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  // 事件
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

/**
 * 创建ERC20代币合约实例
 * @param {string} tokenAddress 代币合约地址
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {ethers.Contract} 代币合约实例
 */
export const createTokenContract = (tokenAddress, provider) => {
  return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
};

/**
 * 获取ERC20代币信息
 * @param {string} tokenAddress 代币合约地址
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {Promise<{name: string, symbol: string, decimals: number}>} 代币信息
 */
export const getTokenInfo = async (tokenAddress, provider) => {
  try {
    const contract = createTokenContract(tokenAddress, provider);
    
    // 并行获取所有信息
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals()
    ]);
    
    return { name, symbol, decimals: Number(decimals) };
  } catch (error) {
    console.error('获取代币信息失败:', error);
    throw new Error(`获取代币信息失败: ${error.message}`);
  }
};

/**
 * 获取ERC20代币余额
 * @param {string} tokenAddress 代币合约地址
 * @param {string} walletAddress 钱包地址
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {Promise<{balance: string, formatted: string}>} 代币余额(原始值和格式化值)
 */
export const getTokenBalance = async (tokenAddress, walletAddress, provider) => {
  try {
    const contract = createTokenContract(tokenAddress, provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(walletAddress);
    
    // 格式化余额为可读格式
    const formatted = ethers.utils.formatUnits(balance, decimals);
    
    return {
      balance: balance.toString(), // 原始余额(大数)
      formatted // 格式化后的余额
    };
  } catch (error) {
    console.error('获取代币余额失败:', error);
    throw new Error(`获取代币余额失败: ${error.message}`);
  }
};

/**
 * 发送ERC20代币交易
 * @param {ethers.Wallet} wallet 已连接provider的钱包对象
 * @param {string} tokenAddress 代币合约地址
 * @param {string} toAddress 接收地址
 * @param {string|number} amount 发送数量(代币单位)
 * @param {object} options 交易选项
 * @returns {Promise<ethers.providers.TransactionResponse>} 交易响应
 */
export const sendTokenTransaction = async (wallet, tokenAddress, toAddress, amount, options = {}) => {
  if (!wallet.provider) {
    throw new Error('钱包未连接到提供者');
  }
  
  try {
    const contract = createTokenContract(tokenAddress, wallet.provider);
    const connectedContract = contract.connect(wallet);
    
    // 获取代币精度
    const decimals = await contract.decimals();
    
    // 转换为代币最小单位
    const amountInSmallestUnit = ethers.utils.parseUnits(amount.toString(), decimals);
    
    // 准备交易选项
    const overrides = {};
    if (options.gasPrice) overrides.gasPrice = options.gasPrice;
    if (options.gasLimit) overrides.gasLimit = options.gasLimit;
    if (options.nonce !== undefined) overrides.nonce = options.nonce;
    
    // 发送交易
    const tx = await connectedContract.transfer(toAddress, amountInSmallestUnit, overrides);
    
    return tx;
  } catch (error) {
    console.error('发送代币交易失败:', error);
    throw new Error(`发送代币交易失败: ${error.message}`);
  }
};

/**
 * 批量获取多个ERC20代币余额
 * @param {Array<{address: string}>} tokens 代币列表
 * @param {string} walletAddress 钱包地址
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {Promise<Object>} 代币余额映射 {tokenAddress: {balance, formatted}}
 */
export const getMultipleTokenBalances = async (tokens, walletAddress, provider) => {
  const balances = {};
  
  // 并行获取所有代币余额
  await Promise.all(tokens.map(async (token) => {
    try {
      const result = await getTokenBalance(token.address, walletAddress, provider);
      balances[token.address] = result;
    } catch (error) {
      console.error(`获取代币 ${token.address} 余额失败:`, error);
      balances[token.address] = { balance: '0', formatted: '0' };
    }
  }));
  
  return balances;
}; 
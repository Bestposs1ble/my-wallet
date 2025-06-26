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
 * 生成随机助记词 (createMnemonic 的别名)
 * @param {number} strength 熵的位数
 * @returns {string} 生成的助记词
 */
export const generateMnemonic = createMnemonic;

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
    // 创建交易对象
    const tx = {
      to,
      value: ethers.utils.parseEther(value.toString())
    };
    
    // 处理gasPrice
    if (options.gasPrice) {
      // 如果传入的是字符串，将其解析为gwei单位的BigNumber
      tx.gasPrice = typeof options.gasPrice === 'string' 
        ? ethers.utils.parseUnits(options.gasPrice, 'gwei')
        : options.gasPrice;
    } else {
      // 否则获取网络当前gasPrice
      tx.gasPrice = await provider.getGasPrice();
    }
    
    // 处理gasLimit
    if (options.gasLimit) {
      // 如果传入的是字符串，将其解析为BigNumber
      tx.gasLimit = typeof options.gasLimit === 'string' 
        ? ethers.BigNumber.from(options.gasLimit)
        : options.gasLimit;
    } else {
      // 否则估算gasLimit
      const from = options.from || null;
      const estimatedGas = await provider.estimateGas({
        to: tx.to,
        value: tx.value,
        from
      });
      // 增加20%的安全系数
      tx.gasLimit = estimatedGas.mul(120).div(100);
    }
    
    // 添加nonce（如果提供）
    if (options.nonce !== undefined) {
      tx.nonce = options.nonce;
    }
    
    // 添加chainId（如果提供）
    if (options.chainId) {
      tx.chainId = options.chainId;
    } else {
      const network = await provider.getNetwork();
      tx.chainId = network.chainId;
    }
    
    return tx;
  } catch (error) {
    console.error('创建交易失败:', error);
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
    console.log('======= 交易准备 =======');
    console.log('发送方地址:', wallet.address);
    console.log('接收方地址:', toAddress);
    console.log('发送金额:', amount, 'ETH');
    console.log('交易选项:', options);
    
    // 创建交易对象
    const tx = {
      to: toAddress,
      value: ethers.utils.parseEther(amount.toString())
    };
    
    console.log('解析后的金额(wei):', tx.value.toString());
    
    // 获取网络信息
    const network = await wallet.provider.getNetwork();
    console.log('当前网络:', network);
    
    // 处理gasPrice
    if (options.gasPrice) {
      // 如果传入的是字符串，将其解析为gwei单位的BigNumber
      tx.gasPrice = ethers.utils.parseUnits(options.gasPrice, 'gwei');
      console.log('使用自定义gasPrice:', options.gasPrice, 'Gwei =', tx.gasPrice.toString(), 'wei');
    } else {
      // 否则获取网络当前gasPrice
      tx.gasPrice = await wallet.provider.getGasPrice();
      console.log('使用网络gasPrice:', ethers.utils.formatUnits(tx.gasPrice, 'gwei'), 'Gwei =', tx.gasPrice.toString(), 'wei');
      
      // 如果是本地网络(Ganache)，确保gasPrice不会太高
      if (network.chainId === 1337) {
        const suggestedGasPrice = ethers.utils.parseUnits('20', 'gwei'); // 20 Gwei应该足够了
        if (tx.gasPrice.gt(suggestedGasPrice)) {
          console.log('本地网络检测到高gasPrice，调整为更合理的值');
          tx.gasPrice = suggestedGasPrice;
          console.log('调整后的gasPrice:', ethers.utils.formatUnits(tx.gasPrice, 'gwei'), 'Gwei');
        }
      }
    }
    
    // 处理gasLimit
    if (options.gasLimit) {
      // 如果传入的是字符串，将其解析为BigNumber
      tx.gasLimit = ethers.BigNumber.from(options.gasLimit);
      console.log('使用自定义gasLimit:', tx.gasLimit.toString());
    } else {
      // 否则估算gasLimit
      try {
        const estimateOptions = {
          to: tx.to,
          value: tx.value,
          from: wallet.address
        };
        console.log('估算gasLimit的参数:', estimateOptions);
        
        const estimatedGas = await wallet.provider.estimateGas(estimateOptions);
        console.log('估算的原始gasLimit:', estimatedGas.toString());
        
        // 增加20%的安全系数
        tx.gasLimit = estimatedGas.mul(120).div(100);
        console.log('增加安全系数后的gasLimit:', tx.gasLimit.toString());
      } catch (estimateError) {
        console.error('估算gasLimit失败:', estimateError);
        // 使用默认值
        tx.gasLimit = ethers.BigNumber.from('21000');
        console.log('使用默认gasLimit:', tx.gasLimit.toString());
      }
    }
    
    // 添加nonce和chainId（如果提供）
    if (options.nonce !== undefined) {
      tx.nonce = options.nonce;
      console.log('使用自定义nonce:', tx.nonce);
    } else {
      // 获取当前nonce
      tx.nonce = await wallet.provider.getTransactionCount(wallet.address);
      console.log('使用当前nonce:', tx.nonce);
    }
    
    // 获取chainId
    if (options.chainId) {
      tx.chainId = options.chainId;
      console.log('使用自定义chainId:', tx.chainId);
    } else {
      tx.chainId = network.chainId;
      console.log('使用网络chainId:', tx.chainId);
    }
    
    // 检查余额是否足够
    const balance = await wallet.provider.getBalance(wallet.address);
    const totalCost = tx.value.add(tx.gasLimit.mul(tx.gasPrice));
    
    console.log('======= 余额检查 =======');
    console.log('当前余额:', ethers.utils.formatEther(balance), 'ETH =', balance.toString(), 'wei');
    console.log('交易金额:', ethers.utils.formatEther(tx.value), 'ETH =', tx.value.toString(), 'wei');
    console.log('Gas成本:', ethers.utils.formatEther(tx.gasLimit.mul(tx.gasPrice)), 'ETH =', tx.gasLimit.mul(tx.gasPrice).toString(), 'wei');
    console.log('总成本:', ethers.utils.formatEther(totalCost), 'ETH =', totalCost.toString(), 'wei');
    console.log('余额是否足够:', balance.gte(totalCost) ? '是' : '否');
    
    if (balance.lt(totalCost)) {
      const errorMsg = `余额不足以支付交易费用。需要: ${ethers.utils.formatEther(totalCost)} ETH, 可用: ${ethers.utils.formatEther(balance)} ETH`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('======= 发送交易 =======');
    console.log('最终交易对象:', {
      to: tx.to,
      value: tx.value.toString(),
      gasPrice: tx.gasPrice.toString(),
      gasLimit: tx.gasLimit.toString(),
      nonce: tx.nonce,
      chainId: tx.chainId
    });
    
    // 发送交易
    const response = await wallet.sendTransaction(tx);
    console.log('交易已发送:', response.hash);
    return response;
  } catch (error) {
    console.error('发送交易详细错误:', error);
    
    // 尝试解析错误
    if (error.error && error.error.body) {
      try {
        const errorBody = JSON.parse(error.error.body);
        console.error('RPC错误详情:', errorBody);
        if (errorBody.error && errorBody.error.message) {
          console.error('RPC错误消息:', errorBody.error.message);
        }
      } catch (parseError) {
        console.error('无法解析错误体:', error.error.body);
      }
    }
    
    throw error;
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

/**
 * 解析交易失败的原因
 * @param {string} errorData 错误数据
 * @returns {string|null} 解析后的错误原因
 */
export const parseRevertReason = (errorData) => {
  try {
    // 检查是否是标准的revert reason格式
    if (errorData && errorData.startsWith('0x08c379a0')) {
      // 解析Error(string)的ABI编码
      const abiCoder = new ethers.utils.AbiCoder();
      const reason = abiCoder.decode(['string'], '0x' + errorData.slice(10));
      return reason[0];
    }
    
    // 检查是否是Panic错误
    if (errorData && errorData.startsWith('0x4e487b71')) {
      // 解析Panic(uint256)的ABI编码
      const abiCoder = new ethers.utils.AbiCoder();
      const code = abiCoder.decode(['uint256'], '0x' + errorData.slice(10));
      const panicCodes = {
        0x01: '断言失败',
        0x11: '算术运算中的上溢或下溢',
        0x12: '除以零',
        0x21: '转换为枚举类型时值越界',
        0x22: '访问存储字节数组时索引不正确',
        0x31: '弹出空数组',
        0x32: '数组访问越界',
        0x41: '内存分配溢出',
        0x51: '调用不存在的内部函数'
      };
      
      const errorCode = '0x' + code[0].toHexString().slice(2).padStart(2, '0');
      return panicCodes[errorCode] || `未知Panic错误(${errorCode})`;
    }
    
    // 检查是否是自定义错误
    if (errorData && errorData.length >= 10) {
      // 尝试解析自定义错误的签名
      const errorSignature = errorData.slice(0, 10);
      const knownErrors = {
        '0x08c379a0': 'Error(string)',
        '0x4e487b71': 'Panic(uint256)',
        '0x01e0c128': 'TransferFailed()',
        '0x7939f424': 'InsufficientBalance()',
        '0x0a14c4b5': 'InvalidAddress()',
        '0x19169f20': 'NotOwner()',
        '0x82b42900': 'Paused()',
        '0xa9802a8c': 'NotAuthorized()'
      };
      
      return knownErrors[errorSignature] || '未知的自定义错误';
    }
    
    return null;
  } catch (error) {
    console.error('解析revert原因失败:', error);
    return null;
  }
};

/**
 * 格式化交易错误消息
 * @param {Error} error 交易错误对象
 * @returns {string} 格式化后的错误消息
 */
export const formatTransactionError = (error) => {
  // 尝试解析错误信息
  let errorMessage = '交易失败';
  
  try {
    if (error.message) {
      if (error.message.includes('insufficient funds')) {
        return '余额不足以支付交易费用';
      }
      if (error.message.includes('nonce too low')) {
        return '交易nonce值过低，请刷新页面重试';
      }
      if (error.message.includes('gas price too low')) {
        return 'Gas价格过低，请提高Gas价格后重试';
      }
      if (error.message.includes('gas limit')) {
        return 'Gas限制设置不正确';
      }
      if (error.message.includes('user rejected')) {
        return '用户拒绝了交易';
      }
      
      // 提取错误信息
      errorMessage = error.message.split('(')[0].trim();
      if (errorMessage.length > 100) {
        errorMessage = errorMessage.substring(0, 100) + '...';
      }
    }
    
    // 尝试解析revert原因
    if (error.data) {
      const revertReason = parseRevertReason(error.data);
      if (revertReason) {
        return `合约执行失败: ${revertReason}`;
      }
    }
    
    return errorMessage;
  } catch (e) {
    return '交易失败，请稍后重试';
  }
};

/**
 * 从助记词获取钱包并连接到Provider
 * @param {string} mnemonic 助记词
 * @param {string} path 派生路径
 * @param {ethers.providers.Provider} provider 以太坊提供者
 * @returns {ethers.Wallet} 已连接Provider的钱包实例
 */
export const getWalletWithProvider = (mnemonic, path, provider) => {
  if (!mnemonic) {
    throw new Error('需要助记词才能获取钱包');
  }
  
  if (!provider) {
    throw new Error('需要Provider才能连接钱包');
  }
  
  // 从助记词派生钱包
  const wallet = createWalletFromMnemonic(mnemonic, path);
  
  // 连接到Provider
  return wallet.connect(provider);
}; 
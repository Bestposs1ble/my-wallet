import { ethers } from 'ethers';
import EventEmitter from 'events';

class EthereumProvider extends EventEmitter {
  constructor(walletContext) {
    super();
    
    // 初始化状态
    this._walletContext = walletContext;
    this._chainId = '0x1'; // 默认以太坊主网
    this._connected = false;
    this._accounts = [];
    this._isMetaMask = true;
    this._selectedAddress = null;
    this._initialized = false;
    this._pending = false;
    
    // 初始化API
    this.initialize();
  }

  // 初始化Provider
  initialize() {
    if (this._initialized) return;
    
    this._initialized = true;
    
    // 监听钱包上下文变化
    this._walletContext.addListener('walletChanged', this._handleWalletChanged.bind(this));
    this._walletContext.addListener('networkChanged', this._handleNetworkChanged.bind(this));
    this._walletContext.addListener('accountsChanged', this._handleAccountsChanged.bind(this));
    
    // 初始化状态
    this._syncState();
  }

  // 同步状态从钱包上下文
  async _syncState() {
    const { isLocked, getCurrentWallet, currentNetwork, networks } = this._walletContext;
    
    // 只有解锁状态才能同步账户
    if (!isLocked) {
      const currentWallet = getCurrentWallet();
      if (currentWallet) {
        this._accounts = [currentWallet.address];
        this._selectedAddress = currentWallet.address;
      } else {
        this._accounts = [];
        this._selectedAddress = null;
      }
    } else {
      this._accounts = [];
      this._selectedAddress = null;
    }
    
    // 同步网络ID
    const networkConfig = networks[currentNetwork];
    if (networkConfig && networkConfig.chainId) {
      this._chainId = '0x' + networkConfig.chainId.toString(16);
    }
    
    this._connected = !isLocked && this._accounts.length > 0;
    
    // 通知状态变化
    this._notifyStateChange();
  }

  // 处理钱包变化事件
  _handleWalletChanged() {
    this._syncState();
  }
  
  // 处理网络变化事件
  _handleNetworkChanged(networkId) {
    const { networks } = this._walletContext;
    const networkConfig = networks[networkId];
    
    if (networkConfig && networkConfig.chainId) {
      const newChainId = '0x' + networkConfig.chainId.toString(16);
      if (this._chainId !== newChainId) {
        this._chainId = newChainId;
        this.emit('chainChanged', this._chainId);
      }
    }
    
    this._syncState();
  }
  
  // 处理账户变化事件
  _handleAccountsChanged(accounts) {
    this._accounts = accounts || [];
    this._selectedAddress = accounts && accounts.length > 0 ? accounts[0] : null;
    this.emit('accountsChanged', this._accounts);
    this._syncState();
  }
  
  // 通知状态变化
  _notifyStateChange() {
    if (this._connected) {
      this.emit('connect', { chainId: this._chainId });
    } else {
      this.emit('disconnect', { code: 1000, reason: '用户断开连接' });
    }
  }
  
  // MetaMask API请求处理
  async request(payload) {
    if (this._pending) {
      throw new Error('请求处理中，请等待上一个请求完成');
    }
    
    this._pending = true;
    
    try {
      const { method, params = [] } = payload;
      
      // 处理不同的方法
      switch (method) {
        case 'eth_accounts':
          return this._handleEthAccounts();
          
        case 'eth_requestAccounts':
          return this._handleEthRequestAccounts();
          
        case 'eth_chainId':
          return this._handleEthChainId();
          
        case 'eth_sendTransaction':
          return this._handleEthSendTransaction(params);
          
        case 'eth_signTransaction':
          return this._handleEthSignTransaction(params);
          
        case 'personal_sign':
          return this._handlePersonalSign(params);
          
        case 'eth_sign':
          return this._handleEthSign(params);
          
        case 'eth_getBalance':
          return this._handleEthGetBalance(params);
          
        case 'eth_call':
          return this._handleEthCall(params);
          
        case 'net_version':
          return this._handleNetVersion();
          
        case 'wallet_switchEthereumChain':
          return this._handleSwitchEthereumChain(params);
          
        case 'wallet_addEthereumChain':
          return this._handleAddEthereumChain(params);
          
        case 'wallet_watchAsset':
          return this._handleWatchAsset(params);
          
        default:
          throw new Error(`不支持的方法: ${method}`);
      }
    } finally {
      this._pending = false;
    }
  }
  
  // 处理eth_accounts
  async _handleEthAccounts() {
    if (this._walletContext.isLocked) {
      return [];
    }
    return this._accounts;
  }
  
  // 处理eth_requestAccounts
  async _handleEthRequestAccounts() {
    if (this._walletContext.isLocked) {
      throw new Error('钱包已锁定，请先解锁');
    }
    
    // 触发获取用户授权的UI
    const approved = await this._requestUserApproval({
      type: 'connect',
      origin: window.location.origin,
      title: '连接请求',
      message: `${window.location.origin} 请求连接到您的钱包`
    });
    
    if (!approved) {
      throw new Error('用户拒绝了连接请求');
    }
    
    return this._accounts;
  }
  
  // 处理eth_chainId
  async _handleEthChainId() {
    return this._chainId;
  }
  
  // 处理eth_sendTransaction
  async _handleEthSendTransaction(params) {
    if (this._walletContext.isLocked) {
      throw new Error('钱包已锁定，请先解锁');
    }
    
    if (!params || !params[0]) {
      throw new Error('无效的交易参数');
    }
    
    const txParams = params[0];
    
    // 检查发送地址是否是当前选中的地址
    const currentWallet = this._walletContext.getCurrentWallet();
    if (!currentWallet || currentWallet.address.toLowerCase() !== txParams.from.toLowerCase()) {
      throw new Error('发送地址不匹配当前账户');
    }
    
    // 获取用户授权
    const approved = await this._requestUserApproval({
      type: 'transaction',
      origin: window.location.origin,
      title: '交易请求',
      message: `${window.location.origin} 请求发送交易`,
      transaction: txParams
    });
    
    if (!approved) {
      throw new Error('用户拒绝了交易请求');
    }
    
    // 发送交易
    const result = await this._walletContext.sendTransaction(
      txParams.to,
      ethers.utils.formatEther(txParams.value || '0x0'),
      {
        gasPrice: txParams.gasPrice,
        gasLimit: txParams.gas,
        data: txParams.data,
        nonce: txParams.nonce
      }
    );
    
    return result.hash;
  }
  
  // 处理eth_signTransaction
  async _handleEthSignTransaction(params) {
    if (this._walletContext.isLocked) {
      throw new Error('钱包已锁定，请先解锁');
    }
    
    // 尚未实现，待完善
    throw new Error('方法尚未实现');
  }
  
  // 处理personal_sign
  async _handlePersonalSign(params) {
    if (this._walletContext.isLocked) {
      throw new Error('钱包已锁定，请先解锁');
    }
    
    // 参数格式: [message, address]
    const [message, address] = params;
    
    // 检查地址是否是当前选中的地址
    const currentWallet = this._walletContext.getCurrentWallet();
    if (!currentWallet || currentWallet.address.toLowerCase() !== address.toLowerCase()) {
      throw new Error('签名地址不匹配当前账户');
    }
    
    // 获取用户授权
    const approved = await this._requestUserApproval({
      type: 'sign',
      origin: window.location.origin,
      title: '签名请求',
      message: `${window.location.origin} 请求签名消息`,
      data: message
    });
    
    if (!approved) {
      throw new Error('用户拒绝了签名请求');
    }
    
    // 签名消息
    return this._walletContext.signMessage(message);
  }
  
  // 处理eth_sign
  async _handleEthSign(params) {
    // eth_sign的参数顺序与personal_sign相反: [address, message]
    const [address, message] = params;
    return this._handlePersonalSign([message, address]);
  }
  
  // 处理eth_getBalance
  async _handleEthGetBalance(params) {
    const [address, blockTag] = params;
    const { provider } = this._walletContext;
    
    try {
      const balance = await provider.getBalance(address, blockTag || 'latest');
      return balance.toHexString();
    } catch (error) {
      throw new Error(`获取余额失败: ${error.message}`);
    }
  }
  
  // 处理eth_call
  async _handleEthCall(params) {
    const [callObject, blockTag] = params;
    const { provider } = this._walletContext;
    
    try {
      return await provider.call(callObject, blockTag || 'latest');
    } catch (error) {
      throw new Error(`合约调用失败: ${error.message}`);
    }
  }
  
  // 处理net_version
  async _handleNetVersion() {
    return this._chainId.startsWith('0x') 
      ? parseInt(this._chainId.slice(2), 16).toString() 
      : this._chainId;
  }
  
  // 处理wallet_switchEthereumChain
  async _handleSwitchEthereumChain(params) {
    const { chainId } = params[0];
    
    // 转换链ID格式
    const decimalChainId = chainId.startsWith('0x') 
      ? parseInt(chainId.slice(2), 16)
      : parseInt(chainId);
    
    // 获取对应的网络配置
    const { networks } = this._walletContext;
    const networkEntry = Object.entries(networks).find(
      ([, config]) => config.chainId === decimalChainId
    );
    
    if (!networkEntry) {
      throw new Error(`不支持的链ID: ${chainId}`);
    }
    
    const networkId = networkEntry[0];
    
    // 获取用户授权
    const approved = await this._requestUserApproval({
      type: 'switchNetwork',
      origin: window.location.origin,
      title: '切换网络请求',
      message: `${window.location.origin} 请求切换到 ${networks[networkId].name} 网络`
    });
    
    if (!approved) {
      throw new Error('用户拒绝了切换网络请求');
    }
    
    // 切换网络
    this._walletContext.switchNetwork(networkId);
    return null;
  }
  
  // 处理wallet_addEthereumChain
  async _handleAddEthereumChain(params) {
    const chainInfo = params[0];
    const { chainId, chainName, rpcUrls, blockExplorerUrls, nativeCurrency } = chainInfo;
    
    // 转换链ID格式
    const decimalChainId = chainId.startsWith('0x') 
      ? parseInt(chainId.slice(2), 16)
      : parseInt(chainId);
    
    // 获取用户授权
    const approved = await this._requestUserApproval({
      type: 'addNetwork',
      origin: window.location.origin,
      title: '添加网络请求',
      message: `${window.location.origin} 请求添加 ${chainName} 网络`,
      networkInfo: chainInfo
    });
    
    if (!approved) {
      throw new Error('用户拒绝了添加网络请求');
    }
    
    // 添加网络配置
    const networkId = `custom-${decimalChainId}`;
    const networkConfig = {
      name: chainName,
      chainId: decimalChainId,
      rpcUrl: rpcUrls[0],
      blockExplorerUrl: blockExplorerUrls?.[0] || '',
      symbol: nativeCurrency?.symbol || 'ETH',
      decimals: nativeCurrency?.decimals || 18
    };
    
    this._walletContext.addCustomNetwork(networkId, networkConfig);
    
    // 自动切换到新添加的网络
    this._walletContext.switchNetwork(networkId);
    
    return null;
  }
  
  // 处理wallet_watchAsset
  async _handleWatchAsset(params) {
    const { type, options } = params;
    
    if (type !== 'ERC20') {
      throw new Error(`不支持的资产类型: ${type}`);
    }
    
    const { address, symbol, decimals, image } = options;
    
    // 获取用户授权
    const approved = await this._requestUserApproval({
      type: 'watchAsset',
      origin: window.location.origin,
      title: '添加代币请求',
      message: `${window.location.origin} 请求添加 ${symbol} 代币`,
      token: { address, symbol, decimals, image }
    });
    
    if (!approved) {
      throw new Error('用户拒绝了添加代币请求');
    }
    
    // 添加代币
    const result = await this._walletContext.addToken({
      address,
      symbol,
      decimals,
      image
    });
    
    return result;
  }
  
  // 通用方法：请求用户授权
  async _requestUserApproval(request) {
    // 这个方法会被真实的UI实现替换
    // 在实际应用中会显示Modal弹窗让用户确认或拒绝请求
    console.log('请求用户授权:', request);
    
    // 默认批准所有请求，在真实实现中应该由用户手动批准
    return new Promise(resolve => {
      // 模拟用户批准
      setTimeout(() => resolve(true), 500);
    });
  }
}

// 导出类与创建Provider的方法
export { EthereumProvider };

export function createEthereumProvider(walletContext) {
  return new EthereumProvider(walletContext);
} 
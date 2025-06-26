/**
 * 新架构测试文件 - 验证核心管理器功能
 */
import { walletManager } from '../core/transaction/wallet/WalletManager';
import { networkManager } from '../core/network/NetworkManager';
import { transactionManager } from '../core/transaction/TransactionManager';
import { storageManager } from '../core/storage/StorageManager';

// 测试钱包管理器
export const testWalletManager = async () => {
  console.log('🧪 测试钱包管理器...');
  
  try {
    // 测试创建钱包
    const result = await walletManager.createWallet('test123');
    console.log('✅ 钱包创建成功:', result.wallet.address);
    
    // 测试添加派生账户
    const newAccount = await walletManager.addDerivedAccount('测试账户2');
    console.log('✅ 派生账户创建成功:', newAccount.address);
    
    // 测试切换钱包
    const switched = walletManager.switchWallet(1);
    console.log('✅ 钱包切换成功:', switched.name);
    
    // 测试获取状态
    const state = walletManager.getState();
    console.log('✅ 钱包状态:', {
      walletCount: state.wallets.length,
      currentIndex: state.currentWalletIndex,
      isLocked: state.isLocked
    });
    
    return true;
  } catch (error) {
    console.error('❌ 钱包管理器测试失败:', error);
    return false;
  }
};

// 测试网络管理器
export const testNetworkManager = async () => {
  console.log('🧪 测试网络管理器...');
  
  try {
    // 测试初始化
    const networks = {
      mainnet: {
        name: 'Ethereum Mainnet',
        url: 'https://mainnet.infura.io/v3/test',
        chainId: 1,
        symbol: 'ETH'
      },
      goerli: {
        name: 'Goerli Testnet',
        url: 'https://goerli.infura.io/v3/test',
        chainId: 5,
        symbol: 'ETH'
      }
    };
    
    await networkManager.initialize(networks, 'mainnet');
    console.log('✅ 网络管理器初始化成功');
    
    // 测试添加自定义网络
    const customNetworkId = await networkManager.addCustomNetwork({
      name: 'Test Network',
      url: 'http://localhost:8545',
      chainId: 1337,
      symbol: 'TEST'
    });
    console.log('✅ 自定义网络添加成功:', customNetworkId);
    
    // 测试网络切换
    await networkManager.switchNetwork('goerli');
    console.log('✅ 网络切换成功: Goerli');
    
    // 测试获取状态
    const state = networkManager.getState();
    console.log('✅ 网络状态:', {
      currentNetwork: state.currentNetwork,
      networkCount: Object.keys(state.networks).length,
      isInitialized: state.isInitialized
    });
    
    return true;
  } catch (error) {
    console.error('❌ 网络管理器测试失败:', error);
    return false;
  }
};

// 测试存储管理器
export const testStorageManager = async () => {
  console.log('🧪 测试存储管理器...');
  
  try {
    // 测试初始化
    await storageManager.initialize('test123');
    console.log('✅ 存储管理器初始化成功');
    
    // 测试安全存储
    const testData = { test: 'data', timestamp: Date.now() };
    await storageManager.setSecure('test_key', testData, true);
    console.log('✅ 数据加密存储成功');
    
    // 测试安全读取
    const retrievedData = await storageManager.getSecure('test_key', true);
    console.log('✅ 数据解密读取成功:', retrievedData);
    
    // 测试网络配置存储
    const networks = {
      mainnet: { name: 'Ethereum', chainId: 1 },
      goerli: { name: 'Goerli', chainId: 5 }
    };
    await storageManager.saveNetworks(networks);
    const savedNetworks = await storageManager.getNetworks();
    console.log('✅ 网络配置存储成功:', Object.keys(savedNetworks));
    
    // 测试缓存统计
    const cacheStats = storageManager.getCacheStats();
    console.log('✅ 缓存统计:', cacheStats);
    
    return true;
  } catch (error) {
    console.error('❌ 存储管理器测试失败:', error);
    return false;
  }
};

// 测试交易管理器
export const testTransactionManager = () => {
  console.log('🧪 测试交易管理器...');
  
  try {
    // 测试获取状态
    const state = transactionManager.getState();
    console.log('✅ 交易管理器状态:', {
      pendingCount: state.pendingCount,
      historyCount: state.historyCount
    });
    
    // 测试交易统计
    const stats = transactionManager.getState();
    console.log('✅ 交易统计获取成功');
    
    return true;
  } catch (error) {
    console.error('❌ 交易管理器测试失败:', error);
    return false;
  }
};

// 运行所有测试
export const runAllTests = async () => {
  console.log('🚀 开始架构测试...\n');
  
  const results = {
    wallet: await testWalletManager(),
    network: await testNetworkManager(),
    storage: await testStorageManager(),
    transaction: testTransactionManager()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('钱包管理器:', results.wallet ? '✅ 通过' : '❌ 失败');
  console.log('网络管理器:', results.network ? '✅ 通过' : '❌ 失败');
  console.log('存储管理器:', results.storage ? '✅ 通过' : '❌ 失败');
  console.log('交易管理器:', results.transaction ? '✅ 通过' : '❌ 失败');
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 总体结果: ${passedCount}/${totalCount} 通过`);
  
  if (passedCount === totalCount) {
    console.log('🎉 所有测试通过！新架构工作正常。');
  } else {
    console.log('⚠️  部分测试失败，需要检查相关模块。');
  }
  
  return results;
};

// 性能测试
export const performanceTest = () => {
  console.log('⚡ 开始性能测试...');
  
  // 测试管理器创建时间
  const startTime = performance.now();
  
  // 创建多个管理器实例（模拟重复使用）
  for (let i = 0; i < 100; i++) {
    walletManager.getState();
    networkManager.getState();
    transactionManager.getState();
    storageManager.getState();
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`✅ 性能测试完成: ${duration.toFixed(2)}ms (100次状态获取)`);
  console.log(`📈 平均每次: ${(duration / 100).toFixed(2)}ms`);
  
  return {
    totalTime: duration,
    averageTime: duration / 100,
    operationsPerSecond: 100 / (duration / 1000)
  };
};

// 内存使用测试
export const memoryTest = () => {
  console.log('💾 开始内存测试...');
  
  if (performance.memory) {
    const before = performance.memory.usedJSHeapSize;
    
    // 创建一些测试数据
    const testData = [];
    for (let i = 0; i < 1000; i++) {
      testData.push({
        id: i,
        data: `test_data_${i}`,
        timestamp: Date.now()
      });
    }
    
    const after = performance.memory.usedJSHeapSize;
    const increase = after - before;
    
    console.log(`✅ 内存使用测试完成:`);
    console.log(`   测试前: ${(before / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   测试后: ${(after / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   增加: ${(increase / 1024).toFixed(2)} KB`);
    
    return {
      before: before,
      after: after,
      increase: increase
    };
  } else {
    console.log('⚠️  浏览器不支持 performance.memory API');
    return null;
  }
};

// 导出测试函数供开发时使用
if (typeof window !== 'undefined') {
  window.testArchitecture = {
    runAllTests,
    performanceTest,
    memoryTest,
    testWalletManager,
    testNetworkManager,
    testStorageManager,
    testTransactionManager
  };
}
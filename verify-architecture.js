#!/usr/bin/env node

/**
 * 新架构验证脚本
 * 检查所有必需的文件是否存在，依赖是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证新架构...\n');

// 需要检查的文件列表
const requiredFiles = [
  // 核心管理器
  'src/core/transaction/wallet/WalletManager.js',
  'src/core/network/NetworkManager.js',
  'src/core/transaction/TransactionManager.js',
  'src/core/storage/StorageManager.js',
  
  // 自定义 Hooks
  'src/hooks/useWallet.js',
  'src/hooks/useNetwork.js',
  'src/hooks/useTransaction.js',
  
  // 新的 Context
  'src/context/WalletProvider.js',
  
  // 配置和测试
  'src/config/architecture.js',
  'src/test/ArchitectureTest.js',
  'src/pages/ArchitectureTest.js',
  
  // 示例和文档
  'src/components/examples/WalletExample.js',
  'src/AppNew.js',
  'src/index-new.js',
  'MIGRATION_GUIDE.md',
  'REFACTORING_SUMMARY.md',
  'DEPLOYMENT_GUIDE.md'
];

// 检查文件是否存在
let allFilesExist = true;
let missingFiles = [];

console.log('📁 检查必需文件...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
    missingFiles.push(file);
  }
});

console.log('\n📦 检查依赖导入...');

// 检查关键导入
const importChecks = [
  {
    file: 'src/App.js',
    pattern: /from ['"]\.\/context\/WalletProvider['"]/,
    description: 'App.js 使用新的 WalletProvider'
  },
  {
    file: 'src/core/transaction/wallet/WalletManager.js',
    pattern: /class WalletManager extends EventEmitter/,
    description: 'WalletManager 继承 EventEmitter'
  },
  {
    file: 'src/hooks/useWallet.js',
    pattern: /export const useWallet/,
    description: 'useWallet Hook 导出'
  },
  {
    file: 'src/context/WalletProvider.js',
    pattern: /export const WalletProvider/,
    description: 'WalletProvider 导出'
  }
];

let allImportsCorrect = true;

importChecks.forEach(check => {
  if (fs.existsSync(check.file)) {
    const content = fs.readFileSync(check.file, 'utf8');
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.description}`);
    } else {
      console.log(`❌ ${check.description} - 导入不正确`);
      allImportsCorrect = false;
    }
  } else {
    console.log(`⚠️  ${check.description} - 文件不存在`);
  }
});

console.log('\n🔧 检查配置文件...');

// 检查 package.json
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['ethers', 'antd', 'react', 'react-dom', 'react-router-dom'];
  
  let depsOk = true;
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ 依赖 ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ 缺少依赖: ${dep}`);
      depsOk = false;
    }
  });
  
  if (!depsOk) {
    allImportsCorrect = false;
  }
} else {
  console.log('❌ package.json 不存在');
  allImportsCorrect = false;
}

console.log('\n📊 验证结果汇总:');
console.log('================');

if (allFilesExist && allImportsCorrect) {
  console.log('🎉 所有检查通过！新架构已准备就绪。');
  console.log('\n🚀 下一步操作:');
  console.log('1. 运行 npm start 启动项目');
  console.log('2. 访问 http://localhost:3000/test 进行功能测试');
  console.log('3. 在控制台运行 window.testArchitecture.runAllTests()');
  console.log('4. 查看 DEPLOYMENT_GUIDE.md 了解详细部署步骤');
  
  process.exit(0);
} else {
  console.log('❌ 验证失败，需要修复以下问题:');
  
  if (!allFilesExist) {
    console.log('\n缺少文件:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  if (!allImportsCorrect) {
    console.log('\n导入或配置问题需要修复');
  }
  
  console.log('\n🔧 修复建议:');
  console.log('1. 确保所有新架构文件已创建');
  console.log('2. 检查导入路径是否正确');
  console.log('3. 运行 npm install 安装依赖');
  console.log('4. 查看 MIGRATION_GUIDE.md 了解详细步骤');
  
  process.exit(1);
}
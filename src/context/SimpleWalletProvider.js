/**
 * 简化的钱包 Provider - 避免循环依赖
 * 注意：此文件已废弃，请使用 WalletContext.js
 * 此文件仅作为兼容层，直接重导出 WalletContext.js
 */
import { WalletProvider, useWallet, WalletContext } from './WalletContext';

// 重导出所有内容
export { WalletProvider, useWallet, WalletContext }; 
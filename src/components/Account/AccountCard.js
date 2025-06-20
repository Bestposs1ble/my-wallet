import React from 'react';
import { Spin } from 'antd';
import { SendOutlined, QrcodeOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import AccountAvatar from './AccountAvatar';
import AddressDisplay from '../Wallet/AddressDisplay';

/**
 * 账户信息卡片组件
 * 
 * @param {Object} wallet - 钱包对象，包含地址、名称等信息
 * @param {number} index - 钱包索引
 * @param {string} balance - 钱包余额
 * @param {string} networkSymbol - 当前网络代币符号
 * @param {boolean} loading - 是否正在加载数据
 * @param {Function} onSend - 发送按钮点击处理函数
 * @param {Function} onReceive - 接收按钮点击处理函数
 * @returns {JSX.Element}
 */
const AccountCard = ({ 
  wallet, 
  index, 
  balance, 
  networkSymbol = 'ETH', 
  loading = false,
  onSend,
  onReceive
}) => {
  if (!wallet) {
    return (
      <div className="glass-effect rounded-2xl p-6 flex items-center justify-center h-64">
        <p className="text-gray-500">当前无可用账户</p>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-2xl p-6 overflow-hidden relative">
      {/* 账户信息 */}
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <AccountAvatar address={wallet.address} size={48} />
        </div>
        <div className="flex-grow">
          <h3 className="font-display font-semibold text-lg text-dark-800">
            {wallet.name || `账户${index + 1}`}
          </h3>
          <AddressDisplay address={wallet.address} short={true} showCopyButton={true} />
        </div>
      </div>

      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full transform translate-x-16 -translate-y-16 opacity-50"></div>
      
      {/* 余额显示 */}
      <div className="mt-8 mb-2">
        <p className="text-sm text-gray-500">{networkSymbol} 余额</p>
        <div className="relative">
          {loading ? (
            <div className="flex items-center space-x-3 h-12">
              <Spin size="small" />
              <span className="text-gray-400">加载中...</span>
            </div>
          ) : (
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-dark-800">{parseFloat(balance).toFixed(5)}</span>
              <span className="ml-2 text-gray-500">{networkSymbol}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 价值显示（假设ETH使用USD汇率）*/}
      {networkSymbol === 'ETH' && (
        <p className="text-sm text-gray-500 mb-6">
          ≈ ${(parseFloat(balance) * 3200).toFixed(2)} USD
        </p>
      )}
      
      {/* 操作按钮 */}
      <div className="flex space-x-3 mt-4">
        <button
          onClick={onSend}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-primary text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <SendOutlined />
          <span>发送</span>
        </button>
        <button
          onClick={onReceive}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-200 bg-white text-dark-800 font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          <QrcodeOutlined />
          <span>接收</span>
        </button>
      </div>
    </div>
  );
};

AccountCard.propTypes = {
  wallet: PropTypes.shape({
    address: PropTypes.string.isRequired,
    name: PropTypes.string
  }),
  index: PropTypes.number.isRequired,
  balance: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  networkSymbol: PropTypes.string,
  loading: PropTypes.bool,
  onSend: PropTypes.func.isRequired,
  onReceive: PropTypes.func.isRequired
};

export default AccountCard; 
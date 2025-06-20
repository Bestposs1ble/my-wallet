import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  SendOutlined, 
  SwapOutlined, 
  DownOutlined, 
  FilterOutlined,
  ExportOutlined,
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

/**
 * 交易列表组件 - 显示交易记录并支持过滤和查看详情
 * 
 * @param {Array} transactions - 交易数组
 * @param {boolean} loading - 是否正在加载数据
 * @param {Function} onViewDetails - 查看交易详情的回调
 * @param {string} networkExplorerUrl - 区块浏览器URL前缀
 * @returns {JSX.Element}
 */
const TransactionList = ({ 
  transactions = [], 
  loading = false,
  onViewDetails,
  networkExplorerUrl = 'https://etherscan.io/tx/'
}) => {
  const [filter, setFilter] = useState('all'); // all, sent, received, swap, pending
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // 交易类型图标映射
  const typeIcons = {
    send: <SendOutlined className="text-orange-500" />,
    receive: <ExportOutlined className="text-green-500 transform rotate-180" />,
    swap: <SwapOutlined className="text-blue-500" />,
    contract: <SwapOutlined className="text-purple-500" />
  };
  
  // 交易状态图标映射
  const statusIcons = {
    confirmed: <CheckCircleOutlined className="text-green-500" />,
    pending: <ClockCircleOutlined className="text-yellow-500" />,
    failed: <ExclamationCircleOutlined className="text-red-500" />
  };
  
  // 格式化时间戳为相对时间
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const txDate = new Date(timestamp);
    const diffMs = now - txDate;
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    
    if (diffSecs < 60) return `${diffSecs}秒前`;
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    
    return txDate.toLocaleDateString();
  };
  
  // 过滤交易
  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'pending') return tx.status === 'pending';
    return tx.type === filter;
  });
  
  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return '-';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="space-y-4">
      {/* 标题和过滤器 */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg text-dark-800">交易历史</h3>
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center space-x-1 text-sm text-gray-600 py-1 px-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            <FilterOutlined />
            <span>
              {filter === 'all' ? '全部交易' : 
               filter === 'send' ? '转出' : 
               filter === 'receive' ? '转入' : 
               filter === 'swap' ? '兑换' : 
               filter === 'pending' ? '待处理' : '全部交易'}
            </span>
            <DownOutlined className="text-xs" />
          </button>
          
          {/* 过滤菜单 */}
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {[
                  { id: 'all', name: '全部交易' },
                  { id: 'send', name: '转出' },
                  { id: 'receive', name: '转入' },
                  { id: 'swap', name: '兑换' },
                  { id: 'pending', name: '待处理' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setFilter(option.id);
                      setShowFilterMenu(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${filter === option.id ? 'bg-gray-100 text-primary-600' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 交易列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="spinner"></div>
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => (
            <div 
              key={tx.hash}
              onClick={() => onViewDetails && onViewDetails(tx)}
              className="group bg-white hover:bg-gray-50 rounded-xl border border-gray-200 p-3 cursor-pointer transition-colors"
            >
              <div className="flex items-start">
                {/* 交易类型图标 */}
                <div className="p-2 rounded-full bg-gray-100 mr-3">
                  {typeIcons[tx.type] || typeIcons.send}
                </div>
                
                {/* 交易内容 */}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {tx.type === 'send' ? '发送' : 
                       tx.type === 'receive' ? '接收' : 
                       tx.type === 'swap' ? '兑换' : '合约交互'}
                    </span>
                    <span className={`font-mono font-medium ${tx.type === 'send' ? 'text-orange-500' : 'text-green-500'}`}>
                      {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.symbol || 'ETH'}
                    </span>
                  </div>
                  
                  {/* 交易详情 */}
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      {statusIcons[tx.status]}
                      <span>
                        {tx.type === 'send' ? `发送至 ${formatAddress(tx.to)}` : 
                         tx.type === 'receive' ? `从 ${formatAddress(tx.from)} 接收` : 
                         tx.type === 'swap' ? `${formatAddress(tx.from)} → ${formatAddress(tx.to)}` : 
                         `与合约 ${formatAddress(tx.to)} 交互`}
                      </span>
                    </div>
                    <span>{formatTimestamp(tx.timestamp)}</span>
                  </div>
                </div>
                
                {/* 查看详情箭头 */}
                <div className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              
              {/* Gas费用 */}
              {tx.gasUsed && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                  <span>Gas费用</span>
                  <span>{tx.gasUsed} Gwei</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-gray-200 rounded-xl bg-white">
          <div className="bg-gray-100 p-3 rounded-full mb-4">
            <SwapOutlined className="text-2xl text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-dark-800">暂无交易记录</h4>
          <p className="text-gray-500 text-center mt-2">
            {filter === 'all' 
              ? '您的交易记录将显示在这里' 
              : `没有找到${
                  filter === 'send' ? '转出' : 
                  filter === 'receive' ? '转入' : 
                  filter === 'swap' ? '兑换' : '待处理'
                }的交易记录`}
          </p>
        </div>
      )}
      
      {/* 查看更多按钮 */}
      {filteredTransactions.length > 0 && filteredTransactions.length >= 5 && (
        <div className="text-center">
          <a 
            href={`${networkExplorerUrl.replace('/tx/', '/address/')}${transactions[0]?.from || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-800 text-sm font-medium inline-flex items-center"
          >
            在区块浏览器中查看更多交易
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
      
      {/* Loading spinner CSS */}
      <style jsx>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #3b82f6;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

TransactionList.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      hash: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['send', 'receive', 'swap', 'contract']),
      to: PropTypes.string,
      from: PropTypes.string,
      amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      symbol: PropTypes.string,
      status: PropTypes.oneOf(['confirmed', 'pending', 'failed']),
      timestamp: PropTypes.number,
      gasUsed: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ),
  loading: PropTypes.bool,
  onViewDetails: PropTypes.func,
  networkExplorerUrl: PropTypes.string
};

export default TransactionList; 
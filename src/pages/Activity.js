import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  SearchOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  DownOutlined,
  HistoryOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';
import TransactionList from '../components/Wallet/TransactionList';
import TransactionDetailsModal from '../components/Wallet/TransactionDetailsModal';

/**
 * 活动记录页面 - 显示所有交易记录和活动历史
 * 
 * @returns {JSX.Element}
 */
const Activity = () => {
  // 从上下文获取钱包状态和方法
  const {
    isLocked,
    transactions = [],
    loadingTransactions = false,
    currentNetwork,
    networks = {}
  } = useWallet();
  
  // 本地状态
  const [filter, setFilter] = useState('all'); // all, sent, received, failed, pending
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // all, tx, token, nft, dapp
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // 如果钱包已锁定，重定向到登录页面
  if (isLocked) {
    return <Navigate to="/login" />;
  }
  
  // 过滤交易列表
  const filteredTransactions = transactions
    ? transactions.filter(tx => {
        // 按类型过滤
        if (filter !== 'all') {
          if (filter === 'pending' && tx.status !== 'pending') return false;
          if (filter === 'failed' && tx.status !== 'failed') return false;
          if (filter === 'sent' && tx.type !== 'send') return false;
          if (filter === 'received' && tx.type !== 'receive') return false;
        }
        
        // 按类别过滤
        if (activeCategory !== 'all') {
          if (activeCategory === 'token' && !tx.isToken) return false;
          if (activeCategory === 'nft' && !tx.isNFT) return false;
          if (activeCategory === 'dapp' && !tx.isDApp) return false;
          if (activeCategory === 'tx' && (tx.isToken || tx.isNFT || tx.isDApp)) return false;
        }
        
        // 按搜索词过滤
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            tx.hash.toLowerCase().includes(term) ||
            (tx.to && tx.to.toLowerCase().includes(term)) ||
            (tx.from && tx.from.toLowerCase().includes(term)) ||
            (tx.dappName && tx.dappName.toLowerCase().includes(term))
          );
        }
        
        return true;
      })
    : [];
  
  // 按时间分组交易
  const getGroupedTransactions = () => {
    const now = new Date();
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };
    
    // 获取今天、昨天、本周、本月的时间范围
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - (now.getDay() * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // 按时间范围分组
    filteredTransactions.forEach(tx => {
      const txTime = tx.timestamp;
      
      if (txTime >= todayStart) {
        groups.today.push(tx);
      } else if (txTime >= yesterdayStart) {
        groups.yesterday.push(tx);
      } else if (txTime >= weekStart) {
        groups.thisWeek.push(tx);
      } else if (txTime >= monthStart) {
        groups.thisMonth.push(tx);
      } else {
        groups.older.push(tx);
      }
    });
    
    return groups;
  };
  
  // 获取区块浏览器URL
  const getExplorerUrl = () => {
    const network = networks[currentNetwork];
    return network?.explorerUrl || 'https://etherscan.io/tx/';
  };
  
  // 查看交易详情
  const handleViewTransaction = (tx) => {
    setSelectedTransaction(tx);
  };
  
  // 关闭交易详情模态框
  const handleCloseDetails = () => {
    setSelectedTransaction(null);
  };
  
  // 分组后的交易
  const groupedTransactions = getGroupedTransactions();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-dark-800">活动</h1>
          
          {/* 类别过滤器 */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="flex items-center space-x-1 text-sm text-gray-600 py-1 px-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <PieChartOutlined />
              <span>
                {activeCategory === 'all' ? '全部类型' : 
                 activeCategory === 'tx' ? '交易' : 
                 activeCategory === 'token' ? '代币' : 
                 activeCategory === 'nft' ? 'NFT' : 
                 activeCategory === 'dapp' ? 'DApp' : '全部类型'}
              </span>
              <DownOutlined className="text-xs" />
            </button>
            
            {showCategoryMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {[
                    { id: 'all', name: '全部类型' },
                    { id: 'tx', name: '交易' },
                    { id: 'token', name: '代币' },
                    { id: 'nft', name: 'NFT' },
                    { id: 'dapp', name: 'DApp' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setActiveCategory(option.id);
                        setShowCategoryMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${activeCategory === option.id ? 'bg-gray-100 text-primary-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 搜索和筛选栏 */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400" 
              placeholder="搜索交易哈希或地址"
            />
          </div>
          
          {/* 过滤按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center space-x-1 text-sm text-gray-600 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FilterOutlined />
              <span>
                {filter === 'all' ? '全部' : 
                 filter === 'sent' ? '转出' : 
                 filter === 'received' ? '转入' : 
                 filter === 'failed' ? '失败' : 
                 filter === 'pending' ? '待处理' : '全部'}
              </span>
              <DownOutlined className="text-xs" />
            </button>
            
            {/* 过滤菜单 */}
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {[
                    { id: 'all', name: '全部' },
                    { id: 'sent', name: '转出' },
                    { id: 'received', name: '转入' },
                    { id: 'pending', name: '待处理' },
                    { id: 'failed', name: '失败' }
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
        
        {/* 活动列表 */}
        <div className="space-y-6">
          {/* 今天 */}
          {groupedTransactions.today.length > 0 && (
            <div>
              <h3 className="flex items-center text-sm font-medium text-gray-500 mb-3">
                <ClockCircleOutlined className="mr-2" />
                今天
              </h3>
              <TransactionList 
                transactions={groupedTransactions.today}
                onViewDetails={handleViewTransaction}
                networkExplorerUrl={getExplorerUrl()}
              />
            </div>
          )}
          
          {/* 昨天 */}
          {groupedTransactions.yesterday.length > 0 && (
            <div>
              <h3 className="flex items-center text-sm font-medium text-gray-500 mb-3">
                <ClockCircleOutlined className="mr-2" />
                昨天
              </h3>
              <TransactionList 
                transactions={groupedTransactions.yesterday}
                onViewDetails={handleViewTransaction}
                networkExplorerUrl={getExplorerUrl()}
              />
            </div>
          )}
          
          {/* 本周 */}
          {groupedTransactions.thisWeek.length > 0 && (
            <div>
              <h3 className="flex items-center text-sm font-medium text-gray-500 mb-3">
                <ClockCircleOutlined className="mr-2" />
                本周
              </h3>
              <TransactionList 
                transactions={groupedTransactions.thisWeek}
                onViewDetails={handleViewTransaction}
                networkExplorerUrl={getExplorerUrl()}
              />
            </div>
          )}
          
          {/* 本月 */}
          {groupedTransactions.thisMonth.length > 0 && (
            <div>
              <h3 className="flex items-center text-sm font-medium text-gray-500 mb-3">
                <ClockCircleOutlined className="mr-2" />
                本月
              </h3>
              <TransactionList 
                transactions={groupedTransactions.thisMonth}
                onViewDetails={handleViewTransaction}
                networkExplorerUrl={getExplorerUrl()}
              />
            </div>
          )}
          
          {/* 更早 */}
          {groupedTransactions.older.length > 0 && (
            <div>
              <h3 className="flex items-center text-sm font-medium text-gray-500 mb-3">
                <ClockCircleOutlined className="mr-2" />
                更早
              </h3>
              <TransactionList 
                transactions={groupedTransactions.older}
                onViewDetails={handleViewTransaction}
                networkExplorerUrl={getExplorerUrl()}
              />
            </div>
          )}
          
          {/* 无数据提示 */}
          {Object.values(groupedTransactions).every(group => group.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <HistoryOutlined className="text-3xl text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-dark-800 mb-2">无活动记录</h3>
              <p className="text-gray-500 text-center max-w-xs">
                {searchTerm || filter !== 'all' || activeCategory !== 'all'
                  ? '没有符合筛选条件的活动记录'
                  : '您的活动记录将显示在这里'}
              </p>
              
              {(searchTerm || filter !== 'all' || activeCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                    setActiveCategory('all');
                  }}
                  className="mt-4 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  清除筛选条件
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 交易详情模态框 */}
      <TransactionDetailsModal
        visible={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={handleCloseDetails}
        networkExplorerUrl={getExplorerUrl()}
      />
    </div>
  );
};

export default Activity; 
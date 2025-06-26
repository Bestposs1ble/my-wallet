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
  ExclamationCircleOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  UpOutlined,
  RocketOutlined,
  StopOutlined,
  CloseOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Tooltip, Badge, Spin, Popconfirm, Modal, message } from 'antd';

/**
 * 交易列表组件 - 显示交易记录并支持过滤和查看详情
 * 
 * @param {Array} transactions - 交易数组
 * @param {boolean} loading - 是否正在加载数据
 * @param {Function} onViewDetails - 查看交易详情的回调
 * @param {string} networkExplorerUrl - 区块浏览器URL前缀
 * @param {Function} onSpeedUp - 交易加速回调
 * @param {Function} onCancel - 交易取消回调
 * @param {Function} onFilterByToken - 按代币过滤回调
 * @returns {JSX.Element}
 */
const TransactionList = ({ 
  transactions = [], 
  loading = false,
  onViewDetails,
  networkExplorerUrl = 'https://etherscan.io/tx/',
  onSpeedUp,
  onCancel,
  onFilterByToken
}) => {
  const [filter, setFilter] = useState('all'); // all, sent, received, swap, pending, failed
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [pageSize, setPageSize] = useState(10); // 每页显示的交易数
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [loadingMore, setLoadingMore] = useState(false); // 加载更多状态
  const [tokenFilter, setTokenFilter] = useState(null); // 代币过滤
  const [speedingUp, setSpeedingUp] = useState(false); // 加速中状态
  const [cancelling, setCancelling] = useState(false); // 取消中状态
  const [selectedTx, setSelectedTx] = useState(null); // 选中的交易
  const [confirmModalVisible, setConfirmModalVisible] = useState(false); // 确认模态框
  const [confirmAction, setConfirmAction] = useState(null); // 确认操作类型
  
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
    failed: <ExclamationCircleOutlined className="text-red-500" />,
    cancelled: <StopOutlined className="text-red-500" />,
    replaced: <RocketOutlined className="text-blue-500" />
  };
  
  // 状态描述映射
  const statusText = {
    confirmed: '已确认',
    pending: '处理中',
    failed: '失败',
    cancelled: '已取消',
    replaced: '已替换'
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
  
  // 格式化完整时间
  const formatFullTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // 过滤交易
  const filteredTransactions = transactions.filter(tx => {
    // 首先按状态/类型过滤
    if (filter === 'all') {
      // 不过滤
    } else if (filter === 'pending') {
      if (tx.status !== 'pending') return false;
    } else if (filter === 'failed') {
      if (tx.status !== 'failed' && tx.status !== 'cancelled') return false;
    } else {
      if (tx.type !== filter) return false;
    }
    
    // 然后按代币过滤
    if (tokenFilter) {
      if (tx.tokenAddress !== tokenFilter) return false;
    }
    
    return true;
  });
  
  // 分页处理
  const paginatedTransactions = filteredTransactions.slice(0, currentPage * pageSize);
  const hasMoreTransactions = filteredTransactions.length > paginatedTransactions.length;
  
  // 加载更多交易
  const loadMoreTransactions = () => {
    if (hasMoreTransactions) {
      setLoadingMore(true);
      // 模拟异步加载
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setLoadingMore(false);
      }, 500);
    }
  };
  
  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return '-';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 获取待处理交易数量
  const pendingCount = transactions.filter(tx => tx.status === 'pending').length;
  
  // 处理交易加速
  const handleSpeedUp = (tx) => {
    setSelectedTx(tx);
    setConfirmAction('speedup');
    setConfirmModalVisible(true);
  };
  
  // 处理交易取消
  const handleCancel = (tx) => {
    setSelectedTx(tx);
    setConfirmAction('cancel');
    setConfirmModalVisible(true);
  };
  
  // 确认操作
  const handleConfirmAction = async () => {
    if (!selectedTx) return;
    
    try {
      if (confirmAction === 'speedup') {
        setSpeedingUp(true);
        await onSpeedUp(selectedTx.hash);
        message.success('交易加速请求已提交');
      } else if (confirmAction === 'cancel') {
        setCancelling(true);
        await onCancel(selectedTx.hash);
        message.success('交易取消请求已提交');
      }
    } catch (error) {
      message.error(error.message || '操作失败');
    } finally {
      setSpeedingUp(false);
      setCancelling(false);
      setConfirmModalVisible(false);
      setSelectedTx(null);
    }
  };
  
  // 处理按代币过滤
  const handleFilterByToken = (tokenAddress) => {
    if (tokenFilter === tokenAddress) {
      // 如果已经选择了该代币，则取消过滤
      setTokenFilter(null);
      if (onFilterByToken) {
        onFilterByToken(null);
      }
    } else {
      setTokenFilter(tokenAddress);
      if (onFilterByToken) {
        onFilterByToken(tokenAddress);
      }
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 标题和过滤器 */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg text-dark-800">
          交易历史
          {pendingCount > 0 && (
            <Badge 
              count={pendingCount} 
              style={{ backgroundColor: '#faad14', marginLeft: 8 }} 
              title={`${pendingCount}个待处理交易`}
            />
          )}
        </h3>
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
               filter === 'pending' ? '待处理' : 
               filter === 'failed' ? '失败' : '全部交易'}
            </span>
            <DownOutlined className="text-xs" />
          </button>
          
          {/* 过滤菜单 */}
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {[
                  { id: 'all', name: '全部交易' },
                  { id: 'pending', name: `待处理${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
                  { id: 'send', name: '转出' },
                  { id: 'receive', name: '转入' },
                  { id: 'swap', name: '兑换' },
                  { id: 'failed', name: '失败' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setFilter(option.id);
                      setShowFilterMenu(false);
                      setCurrentPage(1); // 重置到第一页
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
      
      {/* 代币过滤标签 */}
      {tokenFilter && (
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">按代币过滤:</span>
          <div 
            className="flex items-center bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-blue-100"
            onClick={() => handleFilterByToken(null)}
          >
            {tokenFilter === 'ETH' ? 'ETH' : `代币 (${formatAddress(tokenFilter)})`}
            <CloseOutlined className="ml-1" />
          </div>
        </div>
      )}
      
      {/* 交易列表 */}
      {loading && paginatedTransactions.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        </div>
      ) : filteredTransactions.length > 0 ? (
        <div>
          <div className="space-y-2">
            {paginatedTransactions.map((tx) => (
              <div 
                key={tx.hash}
                className="group bg-white hover:bg-gray-50 rounded-xl border border-gray-200 p-3 cursor-pointer transition-colors"
              >
                <div className="flex items-start">
                  {/* 交易类型图标 */}
                  <div className="p-2 rounded-full bg-gray-100 mr-3">
                    {typeIcons[tx.type] || typeIcons.send}
                  </div>
                  
                  {/* 交易内容 */}
                  <div className="flex-1" onClick={() => onViewDetails && onViewDetails(tx)}>
                    <div className="flex justify-between">
                      <div className="flex items-center">
                        <span className="font-medium">
                          {tx.type === 'send' ? '发送' : 
                           tx.type === 'receive' ? '接收' : 
                           tx.type === 'swap' ? '兑换' : '合约交互'}
                        </span>
                        
                        {/* 代币标签 */}
                        {tx.tokenAddress && tx.tokenAddress !== 'ETH' && (
                          <span 
                            className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs cursor-pointer hover:bg-blue-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterByToken(tx.tokenAddress);
                            }}
                          >
                            {tx.symbol || 'Token'}
                          </span>
                        )}
                        
                        {/* 交易状态标签 */}
                        <Tooltip title={tx.error || statusText[tx.status]}>
                          <span className="ml-2">
                            {tx.status === 'pending' ? (
                              <Badge status="processing" text={<span className="text-xs text-yellow-500">处理中</span>} />
                            ) : tx.status === 'confirmed' ? (
                              <Badge status="success" text={<span className="text-xs text-green-500">已确认 
                                {tx.confirmations > 1 ? ` (${tx.confirmations})` : ''}
                              </span>} />
                            ) : tx.status === 'cancelled' ? (
                              <Badge status="error" text={<span className="text-xs text-red-500">已取消</span>} />
                            ) : tx.status === 'replaced' ? (
                              <Badge status="warning" text={<span className="text-xs text-blue-500">已替换</span>} />
                            ) : (
                              <Badge status="error" text={<span className="text-xs text-red-500">失败</span>} />
                            )}
                          </span>
                        </Tooltip>
                      </div>
                      <span className={`font-mono font-medium ${tx.type === 'send' ? 'text-orange-500' : 'text-green-500'}`}>
                        {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.symbol || 'ETH'}
                      </span>
                    </div>
                    
                    {/* 交易详情 */}
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span>
                          {tx.type === 'send' ? `发送至 ${formatAddress(tx.to)}` : 
                           tx.type === 'receive' ? `从 ${formatAddress(tx.from)} 接收` : 
                           tx.type === 'swap' ? `${formatAddress(tx.from)} → ${formatAddress(tx.to)}` : 
                           `与合约 ${formatAddress(tx.to)} 交互`}
                        </span>
                      </div>
                      <Tooltip title={formatFullTime(tx.timestamp)}>
                        <span>{formatTimestamp(tx.timestamp)}</span>
                      </Tooltip>
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="ml-2 flex items-center space-x-1">
                    {/* 待处理交易可以加速或取消 */}
                    {tx.status === 'pending' && (
                      <>
                        <Tooltip title="加速交易">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeedUp(tx);
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            <RocketOutlined />
                          </button>
                        </Tooltip>
                        
                        <Tooltip title="取消交易">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(tx);
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <StopOutlined />
                          </button>
                        </Tooltip>
                      </>
                    )}
                    
                    {/* 查看详情按钮 */}
                    <Tooltip title="查看详情">
                      <button 
                        onClick={() => onViewDetails && onViewDetails(tx)}
                        className="p-1.5 text-gray-400 group-hover:text-blue-500 transition-colors"
                      >
                        <InfoCircleOutlined />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                
                {/* 如果是被替换的交易，显示替换信息 */}
                {tx.replacedBy && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      {tx.speedUp ? '已被加速交易替换' : '已被取消交易替换'}: 
                      <a 
                        href={`${networkExplorerUrl}${tx.replacedBy}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatAddress(tx.replacedBy)}
                      </a>
                    </span>
                  </div>
                )}
                
                {/* 如果是替换交易，显示原交易信息 */}
                {tx.originalTx && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      {tx.isSpeedUp ? '加速交易，替换' : '取消交易，替换'}: 
                      <a 
                        href={`${networkExplorerUrl}${tx.originalTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatAddress(tx.originalTx)}
                      </a>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* 加载更多按钮 */}
          {hasMoreTransactions && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMoreTransactions}
                disabled={loadingMore}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <LoadingOutlined className="mr-2" />
                ) : (
                  <DownOutlined className="mr-2" />
                )}
                加载更多
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>暂无交易记录</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-blue-500 hover:underline"
            >
              查看全部交易
            </button>
          )}
        </div>
      )}
      
      {/* 交易操作确认模态框 */}
      <Modal
        title={confirmAction === 'speedup' ? '加速交易' : '取消交易'}
        open={confirmModalVisible}
        onCancel={() => {
          setConfirmModalVisible(false);
          setSelectedTx(null);
        }}
        onOk={handleConfirmAction}
        confirmLoading={speedingUp || cancelling}
        okText={confirmAction === 'speedup' ? '加速' : '取消交易'}
        cancelText="关闭"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              <div className="flex items-start">
                <WarningOutlined className="text-yellow-500 text-lg mr-2 mt-0.5" />
                <p className="text-sm text-gray-700">
                  {confirmAction === 'speedup' ? (
                    '加速交易将通过提高Gas价格来尝试更快地确认您的交易。这将产生额外的交易费用。'
                  ) : (
                    '取消交易将尝试使用相同的nonce发送一个新交易，以替换原始交易。这将产生额外的交易费用。'
                  )}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">交易哈希:</span>
                <span className="font-medium font-mono">{formatAddress(selectedTx.hash)}</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">接收地址:</span>
                <span className="font-medium font-mono">{formatAddress(selectedTx.to)}</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">金额:</span>
                <span className="font-medium">{selectedTx.amount} {selectedTx.symbol || 'ETH'}</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">Gas价格:</span>
                <span className="font-medium">{selectedTx.gasPrice} Gwei</span>
              </div>
              <div className="flex justify-between px-2 py-1.5">
                <span className="text-gray-500">新Gas价格:</span>
                <span className="font-medium text-blue-500">
                  {confirmAction === 'speedup' ? 
                    `约 ${(parseFloat(selectedTx.gasPrice) * 1.3).toFixed(2)} Gwei (+30%)` : 
                    `约 ${(parseFloat(selectedTx.gasPrice) * 1.3).toFixed(2)} Gwei (+30%)`}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

TransactionList.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      hash: PropTypes.string.isRequired,
      from: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
      value: PropTypes.string,
      amount: PropTypes.string,
      symbol: PropTypes.string,
      type: PropTypes.string,
      status: PropTypes.string,
      timestamp: PropTypes.number,
      gasPrice: PropTypes.string,
      gasLimit: PropTypes.string,
      tokenAddress: PropTypes.string,
      replacedBy: PropTypes.string,
      originalTx: PropTypes.string,
      isSpeedUp: PropTypes.bool,
      isCancelTx: PropTypes.bool
    })
  ),
  loading: PropTypes.bool,
  onViewDetails: PropTypes.func,
  networkExplorerUrl: PropTypes.string,
  onSpeedUp: PropTypes.func,
  onCancel: PropTypes.func,
  onFilterByToken: PropTypes.func
};

export default TransactionList; 
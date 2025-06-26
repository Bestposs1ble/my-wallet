import React, { useState } from 'react';
import { Spin, Dropdown, Modal, Input, Form, message } from 'antd';
import { SendOutlined, QrcodeOutlined, MoreOutlined, EditOutlined, KeyOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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
 * @param {Function} onRename - 重命名账户处理函数
 * @param {Function} onExportPrivateKey - 导出私钥处理函数
 * @param {Function} onDelete - 删除账户处理函数
 * @param {boolean} isLastWallet - 是否为最后一个钱包
 * @returns {JSX.Element}
 */
const AccountCard = ({ 
  wallet, 
  index, 
  balance, 
  networkSymbol = 'ETH', 
  loading = false,
  onSend,
  onReceive,
  onRename,
  onExportPrivateKey,
  onDelete,
  isLastWallet = false
}) => {
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [exportedKey, setExportedKey] = useState('');
  const [form] = Form.useForm();

  if (!wallet) {
    return (
      <div className="glass-effect rounded-2xl p-6 flex items-center justify-center h-64">
        <p className="text-gray-500">当前无可用账户</p>
      </div>
    );
  }

  // 处理重命名
  const handleRename = async () => {
    if (!newName.trim()) {
      message.error('账户名称不能为空');
      return;
    }
    
    setConfirmLoading(true);
    try {
      await onRename(index, newName);
      setRenameModalVisible(false);
      message.success('账户重命名成功');
    } catch (error) {
      message.error(error.message || '重命名失败');
    } finally {
      setConfirmLoading(false);
      setNewName('');
    }
  };

  // 处理导出私钥
  const handleExportPrivateKey = async () => {
    if (!password) {
      message.error('请输入密码');
      return;
    }
    
    setConfirmLoading(true);
    try {
      const privateKey = await onExportPrivateKey(index, password);
      setExportedKey(privateKey);
    } catch (error) {
      message.error(error.message || '导出私钥失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  // 处理删除账户
  const handleDelete = async () => {
    setConfirmLoading(true);
    try {
      await onDelete(index);
      setDeleteModalVisible(false);
    } catch (error) {
      message.error(error.message || '删除账户失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  // 复制私钥
  const copyPrivateKey = () => {
    navigator.clipboard.writeText(exportedKey)
      .then(() => message.success('私钥已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 关闭导出私钥模态框并重置状态
  const closeExportModal = () => {
    setExportModalVisible(false);
    setPassword('');
    setExportedKey('');
  };

  // 账户操作菜单
  const accountMenu = {
    items: [
      {
        key: '1',
        icon: <EditOutlined />,
        label: '重命名账户',
        onClick: () => setRenameModalVisible(true)
      },
      {
        key: '2',
        icon: <KeyOutlined />,
        label: '导出私钥',
        onClick: () => setExportModalVisible(true)
      },
      {
        key: '3',
        icon: <DeleteOutlined />,
        label: '删除账户',
        danger: true,
        disabled: isLastWallet,
        onClick: () => setDeleteModalVisible(true)
      }
    ]
  };

  return (
    <>
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
          <div>
            <Dropdown menu={accountMenu} placement="bottomRight" trigger={['click']}>
              <button className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <MoreOutlined style={{ fontSize: '20px' }} />
              </button>
            </Dropdown>
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

      {/* 重命名模态框 */}
      <Modal
        title="重命名账户"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setNewName('');
        }}
        confirmLoading={confirmLoading}
        okText="确认"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input
              placeholder="输入新的账户名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={20}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导出私钥模态框 */}
      <Modal
        title="导出私钥"
        open={exportModalVisible}
        onCancel={closeExportModal}
        footer={exportedKey ? [
          <button 
            key="close" 
            onClick={closeExportModal}
            className="px-4 py-2 border border-gray-300 rounded-lg text-dark-800 hover:bg-gray-50"
          >
            关闭
          </button>,
          <button 
            key="copy" 
            onClick={copyPrivateKey}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
          >
            复制私钥
          </button>
        ] : [
          <button 
            key="cancel" 
            onClick={closeExportModal}
            className="px-4 py-2 border border-gray-300 rounded-lg text-dark-800 hover:bg-gray-50"
          >
            取消
          </button>,
          <button 
            key="export" 
            onClick={handleExportPrivateKey}
            disabled={!password || confirmLoading}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmLoading ? '导出中...' : '导出'}
          </button>
        ]}
        width={550}
      >
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg flex items-start">
          <ExclamationCircleOutlined className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            警告：私钥是控制您账户资产的关键，泄露私钥将导致资产丢失。请确保在安全的环境下导出并妥善保管私钥。
          </p>
        </div>
        
        {!exportedKey ? (
          <Form layout="vertical">
            <Form.Item
              label="输入密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                placeholder="输入您的钱包密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>
          </Form>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">账户私钥：</p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-sm break-all">
              {exportedKey}
            </div>
          </div>
        )}
      </Modal>

      {/* 删除账户确认模态框 */}
      <Modal
        title="删除账户"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        confirmLoading={confirmLoading}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
          <ExclamationCircleOutlined className="mr-2 mt-0.5 flex-shrink-0" />
          <p>
            您确定要删除此账户吗？此操作不可撤销。<br/>
            <span className="text-sm mt-1 block">
              请确保您已备份此账户的私钥，否则将无法恢复账户及其资产。
            </span>
          </p>
        </div>
        <p className="text-gray-600">
          账户地址: <span className="font-mono">{wallet.address}</span>
        </p>
      </Modal>
    </>
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
  onReceive: PropTypes.func.isRequired,
  onRename: PropTypes.func,
  onExportPrivateKey: PropTypes.func,
  onDelete: PropTypes.func,
  isLastWallet: PropTypes.bool
};

export default AccountCard; 
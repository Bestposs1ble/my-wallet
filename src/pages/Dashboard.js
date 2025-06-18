import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout, Menu, Card, Row, Col, Typography, Button, Spin, Statistic, Tabs, Table, Modal, Form, Input, Select } from 'antd';
import {
  WalletOutlined,
  SendOutlined,
  SwapOutlined,
  AppstoreOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  CopyOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';
import * as ethersHelper from '../utils/ethersHelper';
import QRCode from 'qrcode.react';
import '../styles/Dashboard.css';
import Jazzicon from 'react-jazzicon';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Dashboard = () => {
  const {
    isLocked,
    wallets,
    currentWalletIndex,
    currentNetwork,
    networks,
    provider,
    accountBalances,
    pendingTransactions,
    error,
    loading,
    lock,
    addDerivedAccount,
    switchWallet,
    switchNetwork,
    getCurrentWallet,
    getCurrentWalletBalance
  } = useWallet();

  const [collapsed, setCollapsed] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [sendForm] = Form.useForm();
  const [addAccountForm] = Form.useForm();
  const [gasPrice, setGasPrice] = useState(null);

  // 如果钱包已锁定，重定向到登录页面
  if (isLocked) {
    return <Navigate to="/login" />;
  }

  const currentWallet = getCurrentWallet();
  const currentBalance = getCurrentWalletBalance();
  const networkConfig = networks[currentNetwork];

  // 地址缩略显示
  const shortAddress = (addr) => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';

  // 账户头像
  const AccountAvatar = ({ address, size = 32 }) => (
    <Jazzicon diameter={size} seed={parseInt(address?.slice(2, 10), 16) || 0} />
  );

  // 处理复制地址
  const handleCopyAddress = () => {
    if (currentWallet) {
      navigator.clipboard.writeText(currentWallet.address);
      // 可以加入复制成功的提示
    }
  };

  // 处理发送交易
  const handleSend = () => {
    setShowSendModal(true);
  };

  // 提交发送交易表单
  const handleSendSubmit = async (values) => {
    try {
      // 发送交易逻辑 - 这需要通过上下文中的sendTransaction方法实现
      setShowSendModal(false);
      sendForm.resetFields();
    } catch (error) {
      console.error('发送交易失败:', error);
    }
  };

  // 添加账户
  const handleAddAccount = async (values) => {
    try {
      await addDerivedAccount(values.name);
      setShowAddAccountModal(false);
      addAccountForm.resetFields();
    } catch (error) {
      console.error('添加账户失败:', error);
    }
  };

  // 切换网络
  const handleNetworkChange = (value) => {
    switchNetwork(value);
    setShowNetworkModal(false);
  };

  // 渲染账户列表
  const renderAccounts = () => {
    return wallets.map((wallet, index) => (
      <Menu.Item
        key={wallet.address}
        icon={<UserOutlined />}
        className={index === currentWalletIndex ? 'active-account' : ''}
        onClick={() => switchWallet(index)}
      >
        {wallet.name || `账户 ${index + 1}`}
      </Menu.Item>
    ));
  };

  // 渲染交易记录
  const renderTransactions = () => {
    const columns = [
      {
        title: '交易哈希',
        dataIndex: 'hash',
        key: 'hash',
        render: (text) => <Text ellipsis>{text}</Text>,
      },
      {
        title: '接收方',
        dataIndex: 'to',
        key: 'to',
        render: (text) => <Text ellipsis>{text}</Text>,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (text) => (
          <Text type={text === 'confirmed' ? 'success' : 'warning'}>
            {text === 'confirmed' ? '已确认' : '待处理'}
          </Text>
        ),
      },
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (text) => new Date(text).toLocaleString(),
      }
    ];

    return (
      <Table 
        columns={columns}
        dataSource={pendingTransactions} 
        rowKey="hash"
        pagination={false}
        size="small"
      />
    );
  };

  // 主界面渲染
  return (
    <Layout className="dashboard-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        className="dashboard-sider"
      >
        <div className="logo">
          <WalletOutlined style={{ fontSize: '24px' }} />
          {!collapsed && <span className="logo-text">MetaMask Clone</span>}
        </div>
        <Menu theme="light" mode="inline" defaultSelectedKeys={['dashboard']}>
          <Menu.Item key="dashboard" icon={<AppstoreOutlined />}>
            仪表盘
          </Menu.Item>
          <Menu.Item key="send" icon={<SendOutlined />} onClick={handleSend}>
            发送
          </Menu.Item>
          <Menu.Item key="receive" icon={<QrcodeOutlined />} onClick={() => setShowReceiveModal(true)}>
            接收
          </Menu.Item>
          <Menu.Item key="swap" icon={<SwapOutlined />}>
            兑换
          </Menu.Item>
          <Menu.SubMenu key="accounts" icon={<UserOutlined />} title="账户">
            {renderAccounts()}
            <Menu.Item key="add-account" icon={<PlusOutlined />} onClick={() => setShowAddAccountModal(true)}>
              添加账户
            </Menu.Item>
          </Menu.SubMenu>
          <Menu.Item key="settings" icon={<SettingOutlined />}>
            设置
          </Menu.Item>
          <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={lock}>
            锁定钱包
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header className="dashboard-header">
          <div className="header-left">
            <img src="/favicon.ico" alt="logo" style={{ width: 32, marginRight: 12 }} />
            <Button type="text" onClick={() => setShowNetworkModal(true)} style={{ fontWeight: 600 }}>
              {networkConfig?.name || '未知网络'}
            </Button>
          </div>
          <div className="header-right">
            {currentWallet && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AccountAvatar address={currentWallet.address} size={32} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{currentWallet.name || `账户${currentWalletIndex + 1}`}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{shortAddress(currentWallet.address)}</div>
                </div>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={handleCopyAddress}
                  title="复制地址"
                />
                <Button
                  type="text"
                  icon={<QrcodeOutlined />}
                  onClick={() => setShowReceiveModal(true)}
                  title="显示二维码"
                />
              </div>
            )}
          </div>
        </Header>
        <Content className="dashboard-content">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card className="account-card" bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 8px #eee' }}>
                {currentWallet ? (
                  <>
                    <div className="account-header" style={{ alignItems: 'center', gap: 16 }}>
                      <AccountAvatar address={currentWallet.address} size={40} />
                      <div>
                        <Title level={4} style={{ margin: 0 }}>{currentWallet.name || `账户${currentWalletIndex + 1}`}</Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>{shortAddress(currentWallet.address)}</Text>
                      </div>
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={handleCopyAddress}
                        title="复制地址"
                      />
                      <Button
                        type="text"
                        icon={<QrcodeOutlined />}
                        onClick={() => setShowReceiveModal(true)}
                        title="显示二维码"
                      />
                    </div>
                    <Statistic
                      title={`余额 (${networkConfig?.symbol || 'ETH'})`}
                      value={currentBalance}
                      precision={6}
                      loading={loading}
                      style={{ margin: '24px 0 8px 0' }}
                    />
                    <div className="account-actions-row">
                      <Button type="primary" icon={<SendOutlined />} onClick={handleSend} style={{ borderRadius: 20 }}>
                        发送
                      </Button>
                      <Button icon={<QrcodeOutlined />} onClick={() => setShowReceiveModal(true)} style={{ borderRadius: 20 }}>
                        接收
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="no-wallet">
                    <Text>当前无可用账户</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="活动" className="activity-card">
                <Tabs defaultActiveKey="1">
                  <TabPane tab="近期交易" key="1">
                    {pendingTransactions && pendingTransactions.length > 0 ? (
                      renderTransactions()
                    ) : (
                      <div className="no-transactions">
                        <Text>暂无交易记录</Text>
                      </div>
                    )}
                  </TabPane>
                  <TabPane tab="代币" key="2">
                    <div className="no-tokens">
                      <Text>暂无代币</Text>
                    </div>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* 发送交易模态框 */}
      <Modal
        title="发送交易"
        visible={showSendModal}
        onCancel={() => setShowSendModal(false)}
        footer={null}
      >
        <Form
          form={sendForm}
          layout="vertical"
          onFinish={handleSendSubmit}
        >
          <Form.Item
            name="to"
            label="接收地址"
            rules={[{ required: true, message: '请输入接收地址' }]}
          >
            <Input placeholder="输入以太坊地址" />
          </Form.Item>
          <Form.Item
            name="amount"
            label={`金额 (${networkConfig?.symbol || 'ETH'})`}
            rules={[{ required: true, message: '请输入发送金额' }]}
          >
            <Input type="number" min="0" step="0.000001" placeholder="0.0" />
          </Form.Item>
          <Form.Item
            name="gasPrice"
            label="Gas价格 (Gwei)"
          >
            <Input type="number" min="1" placeholder="自动" />
          </Form.Item>
          <div className="modal-actions">
            <Button onClick={() => setShowSendModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              发送
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 接收交易模态框 */}
      <Modal
        title="接收交易"
        visible={showReceiveModal}
        onCancel={() => setShowReceiveModal(false)}
        footer={null}
      >
        {currentWallet && (
          <div className="receive-modal">
            <div className="qr-code">
              <QRCode value={currentWallet.address} size={200} />
            </div>
            <div className="wallet-address">
              <Text strong>钱包地址：</Text>
              <Text>{currentWallet.address}</Text>
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={handleCopyAddress}
              />
            </div>
            <Text type="secondary">扫描上面的二维码或复制地址以接收付款</Text>
          </div>
        )}
      </Modal>

      {/* 添加账户模态框 */}
      <Modal
        title="添加账户"
        visible={showAddAccountModal}
        onCancel={() => setShowAddAccountModal(false)}
        footer={null}
      >
        <Form
          form={addAccountForm}
          layout="vertical"
          onFinish={handleAddAccount}
        >
          <Form.Item
            name="name"
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input placeholder="输入账户名称" />
          </Form.Item>
          <div className="modal-actions">
            <Button onClick={() => setShowAddAccountModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              添加
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 切换网络模态框 */}
      <Modal
        title="切换网络"
        visible={showNetworkModal}
        onCancel={() => setShowNetworkModal(false)}
        footer={null}
      >
        <Form layout="vertical">
          <Form.Item label="选择网络">
            <Select
              defaultValue={currentNetwork}
              onChange={handleNetworkChange}
              style={{ width: '100%' }}
            >
              {Object.entries(networks).map(([id, network]) => (
                <Select.Option key={id} value={id}>
                  {network.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Dashboard; 
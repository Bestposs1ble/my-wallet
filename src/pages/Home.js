import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Card, Row, Col, Space } from 'antd';
import { 
  WalletOutlined, 
  SafetyOutlined, 
  ThunderboltOutlined, 
  BranchesOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import '../styles/Home.css';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();

  return (
    <Layout className="home-layout">
      <Header className="home-header">
        <div className="logo">
          <WalletOutlined className="logo-icon" />
          <span className="logo-text">MetaMask Clone</span>
        </div>
        <div className="header-actions">
          <Button type="primary" onClick={() => navigate('/create')}>
            创建钱包
          </Button>
          <Button onClick={() => navigate('/login')}>
            解锁钱包
          </Button>
        </div>
      </Header>
      
      <Content className="home-content">
        <div className="hero-section">
          <Title className="hero-title">
            一个安全、易用的以太坊钱包
          </Title>
          <Paragraph className="hero-description">
            管理您的加密资产、交易代币和连接去中心化应用
          </Paragraph>
          <Space size="large">
            <Button type="primary" size="large" onClick={() => navigate('/create')}>
              开始使用
            </Button>
            <Button size="large" onClick={() => navigate('/login')}>
              已有钱包？登录
            </Button>
          </Space>
        </div>
        
        <div className="features-section">
          <Title level={2} className="section-title">
            主要特性
          </Title>
          <Row gutter={[24, 24]} className="feature-cards">
            <Col xs={24} sm={12} lg={8}>
              <Card 
                className="feature-card"
                title={
                  <div className="feature-title">
                    <SafetyOutlined className="feature-icon" />
                    <span>安全第一</span>
                  </div>
                }
              >
                <Paragraph>
                  您的私钥和助记词均加密存储在本地，永不上传至服务器，确保您的资产安全。
                </Paragraph>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Card 
                className="feature-card"
                title={
                  <div className="feature-title">
                    <ThunderboltOutlined className="feature-icon" />
                    <span>便捷交易</span>
                  </div>
                }
              >
                <Paragraph>
                  轻松发送和接收代币，查看交易历史，估算Gas费用，一键完成交易。
                </Paragraph>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Card 
                className="feature-card"
                title={
                  <div className="feature-title">
                    <BranchesOutlined className="feature-icon" />
                    <span>HD钱包支持</span>
                  </div>
                }
              >
                <Paragraph>
                  支持BIP39和BIP44标准的分层确定性钱包，一个助记词可派生多个账户。
                </Paragraph>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Card 
                className="feature-card"
                title={
                  <div className="feature-title">
                    <GlobalOutlined className="feature-icon" />
                    <span>多链支持</span>
                  </div>
                }
              >
                <Paragraph>
                  支持以太坊主网和多个测试网络，未来将支持更多EVM兼容链。
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
      
      <Footer className="home-footer">
        <div className="footer-content">
          <p>MetaMask Clone ©2023 用于学习和展示，非官方产品</p>
          <p>本项目仅供学习和参考，切勿用于生产环境</p>
        </div>
      </Footer>
    </Layout>
  );
};

export default Home; 
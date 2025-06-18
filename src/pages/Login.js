import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';
import '../styles/Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const { unlock, isLocked, loading, error } = useWallet();
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  useEffect(() => {
    // 如果已经解锁，跳转到仪表板页面
    if (!isLocked) {
      navigate('/dashboard');
    }
  }, [isLocked, navigate]);
  
  const handleChange = (e) => {
    setPassword(e.target.value);
    setLocalError('');
  };
  
  const handleLogin = async () => {
    if (!password) {
      setLocalError('请输入密码');
      return;
    }
    
    try {
      const success = await unlock(password);
      
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      setLocalError(error.message || '解锁钱包失败');
    }
  };
  
  const goToCreateWallet = () => {
    navigate('/create');
  };
  
  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>解锁钱包</Title>
          <LockOutlined style={{ fontSize: 64, display: 'block', margin: '0 auto 24px', color: '#1890ff' }} />
        </div>
        
        <Form layout="vertical">
          <Form.Item label="密码">
            <Input.Password
              placeholder="请输入密码"
              value={password}
              onChange={handleChange}
              onPressEnter={handleLogin}
              prefix={<UnlockOutlined />}
            />
          </Form.Item>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {localError && <Alert message={localError} type="error" showIcon />}
            {error && <Alert message={error} type="error" showIcon />}
            
            <Button
              type="primary"
              block
              onClick={handleLogin}
              loading={loading}
            >
              解锁
            </Button>
            
            <div style={{ textAlign: 'center' }}>
              <Text>
                <a onClick={goToCreateWallet}>没有钱包？创建或导入一个钱包</a>
              </Text>
            </div>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 
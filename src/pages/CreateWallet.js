import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Form, Input, Tabs, Alert, Typography, Space, Checkbox, Row, Col } from 'antd';
import { KeyOutlined, BookOutlined, LockOutlined, SafetyOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';
import '../styles/CreateWallet.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const CreateWallet = () => {
  const navigate = useNavigate();
  const { createHDWallet, importHDWalletByMnemonic, importWalletByPrivateKey, error, loading } = useWallet();
  
  const [formData, setFormData] = useState({
    name: '',
    mnemonic: '',
    privateKey: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  });
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [createdMnemonic, setCreatedMnemonic] = useState('');
  const [step, setStep] = useState(1);
  const [verificationWords, setVerificationWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [formError, setFormError] = useState('');
  const [shuffledWords, setShuffledWords] = useState([]);
  
  useEffect(() => {
    if (step === 3 && createdMnemonic) {
      const words = createdMnemonic.split(' ');
      setShuffledWords([...words].sort(() => 0.5 - Math.random()));
    }
  }, [step, createdMnemonic]);
  
  // 输入改变处理函数
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'agreedToTerms' ? checked : value
    });
    
    // 清除错误提示
    setFormError('');
  };
  
  // 创建新钱包
  const handleCreate = async () => {
    if (!formData.name) {
      setFormError('请输入钱包名称');
      return;
    }
    
    if (!formData.password) {
      setFormError('请输入密码');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setFormError('两次输入的密码不一致');
      return;
    }
    
    if (formData.password.length < 8) {
      setFormError('密码长度至少为8位');
      return;
    }
    
    if (!formData.agreedToTerms) {
      setFormError('请同意服务条款');
      return;
    }
    
    try {
      // 创建新的HD钱包
      const result = await createHDWallet(formData.name, formData.password);
      
      if (result) {
        setCreatedMnemonic(result.mnemonic);
        
        // 准备验证词组
        const words = result.mnemonic.split(' ');
        // 随机选择3个位置的单词进行验证
        const indexes = [];
        while (indexes.length < 3) {
          const randomIndex = Math.floor(Math.random() * words.length);
          if (!indexes.includes(randomIndex)) {
            indexes.push(randomIndex);
          }
        }
        
        setVerificationWords(indexes.map(index => ({
          index,
          word: words[index]
        })));
        
        setStep(2);
      }
    } catch (e) {
      setFormError(e.message || '创建钱包失败');
    }
  };
  
  // 进行助记词验证
  const handleVerify = () => {
    // 检查是否选择了正确的验证单词
    const isCorrect = verificationWords.every(({ index, word }) => 
      selectedWords.find(w => w.index === index && w.word === word)
    );
    
    if (!isCorrect) {
      setFormError('助记词验证失败，请重新确认');
      return;
    }
    
    // 验证成功，跳转到主界面
    navigate('/dashboard');
  };
  
  // 导入钱包 - 助记词
  const handleImportByMnemonic = async () => {
    if (!formData.name) {
      setFormError('请输入钱包名称');
      return;
    }
    
    if (!formData.mnemonic) {
      setFormError('请输入助记词');
      return;
    }
    
    if (!formData.password) {
      setFormError('请输入密码');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setFormError('两次输入的密码不一致');
      return;
    }
    
    if (formData.password.length < 8) {
      setFormError('密码长度至少为8位');
      return;
    }
    
    if (!formData.agreedToTerms) {
      setFormError('请同意服务条款');
      return;
    }
    
    try {
      // 通过助记词导入HD钱包
      const result = await importHDWalletByMnemonic(
        formData.mnemonic.trim(),
        formData.name,
        formData.password
      );
      
      if (result) {
        navigate('/dashboard');
      }
    } catch (e) {
      setFormError(e.message || '导入钱包失败');
    }
  };
  
  // 导入钱包 - 私钥
  const handleImportByPrivateKey = async () => {
    if (!formData.name) {
      setFormError('请输入钱包名称');
      return;
    }
    
    if (!formData.privateKey) {
      setFormError('请输入私钥');
      return;
    }
    
    if (!formData.password) {
      setFormError('请输入密码');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setFormError('两次输入的密码不一致');
      return;
    }
    
    if (formData.password.length < 8) {
      setFormError('密码长度至少为8位');
      return;
    }
    
    if (!formData.agreedToTerms) {
      setFormError('请同意服务条款');
      return;
    }
    
    try {
      // 通过私钥导入钱包
      const result = await importWalletByPrivateKey(
        formData.privateKey.trim(),
        formData.name
      );
      
      if (result) {
        navigate('/dashboard');
      }
    } catch (e) {
      setFormError(e.message || '导入钱包失败');
    }
  };
  
  // 选择验证单词
  const handleWordSelect = (index, word) => {
    const existingIndex = selectedWords.findIndex(w => w.index === index);
    
    if (existingIndex >= 0) {
      // 如果已经选择过这个位置的单词，则替换
      const newSelectedWords = [...selectedWords];
      newSelectedWords[existingIndex] = { index, word };
      setSelectedWords(newSelectedWords);
    } else {
      // 否则添加新单词
      setSelectedWords([...selectedWords, { index, word }]);
    }
  };
  
  // 清除选择的单词
  const clearSelectedWords = () => {
    setSelectedWords([]);
  };
  
  // 渲染助记词显示
  const renderMnemonicDisplay = () => {
    const words = createdMnemonic.split(' ');
    
    return (
      <div className="mnemonic-container">
        <div className="mnemonic-words">
          {words.map((word, index) => (
            <div key={index} className="mnemonic-word">
              <span className="word-index">{index + 1}.</span>
              <span className="word">{word}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // 渲染助记词验证界面
  const renderVerificationStep = () => {
    if (!createdMnemonic) return null;
    return (
      <div className="verification-container">
        <Title level={3}>验证助记词</Title>
        <Paragraph>
          请点击下方的单词，按照助记词的正确顺序选择标记的几个单词
        </Paragraph>
        <div className="verification-prompt">
          {verificationWords.map(({ index }) => (
            <div key={index} className="verification-word">
              <span className="word-index">{index + 1}.</span>
              <span className="word">
                {selectedWords.find(w => w.index === index)?.word || '_____'}
              </span>
            </div>
          ))}
        </div>
        <div className="word-selection">
          {shuffledWords.map((word, idx) => (
            <Button
              key={idx}
              className="word-button"
              onClick={() => {
                const nextEmptyVerification = verificationWords.find(
                  v => !selectedWords.some(sw => sw.index === v.index)
                );
                if (nextEmptyVerification) {
                  handleWordSelect(nextEmptyVerification.index, word);
                }
              }}
              disabled={selectedWords.some(sw => sw.word === word)}
            >
              {word}
            </Button>
          ))}
        </div>
        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
          {formError && <Alert message={formError} type="error" showIcon />}
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={clearSelectedWords}>清除</Button>
            <Button
              type="primary"
              onClick={handleVerify}
              disabled={selectedWords.length !== verificationWords.length}
              loading={loading}
            >
              确认
            </Button>
          </Space>
        </Space>
      </div>
    );
  };
  
  // 渲染创建钱包表单
  const renderCreateWalletForm = () => (
    <Form layout="vertical">
      <Form.Item label="钱包名称">
        <Input 
          name="name" 
          placeholder="输入钱包名称" 
          value={formData.name}
          onChange={handleChange}
          prefix={<SafetyOutlined />}
        />
      </Form.Item>
      
      <Form.Item label="密码">
        <Input.Password 
          name="password" 
          placeholder="设置强密码" 
          value={formData.password}
          onChange={handleChange}
          prefix={<LockOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      
      <Form.Item label="确认密码">
        <Input.Password 
          name="confirmPassword" 
          placeholder="再次输入密码" 
          value={formData.confirmPassword}
          onChange={handleChange}
          prefix={<LockOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      
      <Form.Item>
        <Checkbox 
          name="agreedToTerms" 
          checked={formData.agreedToTerms}
          onChange={handleChange}
        >
          我已阅读并同意服务条款
        </Checkbox>
      </Form.Item>
      
      {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      <Button 
        type="primary" 
        block 
        onClick={handleCreate}
        loading={loading}
      >
        创建钱包
      </Button>
    </Form>
  );
  
  // 渲染助记词导入表单
  const renderImportMnemonicForm = () => (
    <Form layout="vertical">
      <Form.Item label="钱包名称">
        <Input 
          name="name" 
          placeholder="输入钱包名称" 
          value={formData.name}
          onChange={handleChange}
          prefix={<SafetyOutlined />}
        />
      </Form.Item>
      
      <Form.Item label="助记词">
        <Input.TextArea 
          name="mnemonic" 
          placeholder="输入助记词，用空格分隔" 
          value={formData.mnemonic}
          onChange={handleChange}
          autoSize={{ minRows: 3 }}
          style={{ fontFamily: 'monospace' }}
        />
        <Text type="secondary">通常是12个单词，用空格分隔</Text>
      </Form.Item>
      
      <Form.Item label="密码">
        <Input.Password 
          name="password" 
          placeholder="设置强密码" 
          value={formData.password}
          onChange={handleChange}
          prefix={<LockOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      
      <Form.Item label="确认密码">
        <Input.Password 
          name="confirmPassword" 
          placeholder="再次输入密码" 
          value={formData.confirmPassword}
          onChange={handleChange}
          prefix={<LockOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      
      <Form.Item>
        <Checkbox 
          name="agreedToTerms" 
          checked={formData.agreedToTerms}
          onChange={handleChange}
        >
          我已阅读并同意服务条款
        </Checkbox>
      </Form.Item>
      
      {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      <Button 
        type="primary" 
        block 
        onClick={handleImportByMnemonic}
        loading={loading}
      >
        导入钱包
      </Button>
    </Form>
  );
  
  // 渲染私钥导入表单
  const renderImportPrivateKeyForm = () => (
    <Form layout="vertical">
      <Form.Item label="钱包名称">
        <Input 
          name="name" 
          placeholder="输入钱包名称" 
          value={formData.name}
          onChange={handleChange}
          prefix={<SafetyOutlined />}
        />
      </Form.Item>
      
      <Form.Item label="私钥">
        <Input.Password 
          name="privateKey" 
          placeholder="输入私钥" 
          value={formData.privateKey}
          onChange={handleChange}
          prefix={<KeyOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
        <Text type="secondary">请输入以0x开头的私钥，或去掉0x前缀</Text>
      </Form.Item>
      
      <Form.Item label="密码">
        <Input.Password 
          name="password" 
          placeholder="设置强密码" 
          value={formData.password}
          onChange={handleChange}
          prefix={<LockOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      
      <Form.Item label="确认密码">
        <Input.Password 
          name="confirmPassword" 
          placeholder="再次输入密码" 
          value={formData.confirmPassword}
          onChange={handleChange}
          prefix={<LockOutlined />}
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Form.Item>
      
      <Form.Item>
        <Checkbox 
          name="agreedToTerms" 
          checked={formData.agreedToTerms}
          onChange={handleChange}
        >
          我已阅读并同意服务条款
        </Checkbox>
      </Form.Item>
      
      {formError && <Alert message={formError} type="error" showIcon style={{ marginBottom: 16 }} />}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      
      <Button 
        type="primary" 
        block 
        onClick={handleImportByPrivateKey}
        loading={loading}
      >
        导入钱包
      </Button>
    </Form>
  );
  
  // 显示助记词步骤
  const renderMnemonicStep = () => (
    <div className="mnemonic-step">
      <Title level={3}>备份助记词</Title>
      <Alert 
        message="重要提示"
        description={
          <div>
            <p>请将下面的助记词抄写在安全的地方，这是恢复钱包的唯一方式。</p>
            <p>助记词一旦丢失无法找回，请务必妥善保管。</p>
            <p>请不要截图或以电子方式保存。</p>
          </div>
        }
        type="warning" 
        showIcon 
        style={{ marginBottom: 16 }}
      />
      
      <div className="mnemonic-display">
        <div className="mnemonic-mask" style={{ display: showMnemonic ? 'none' : 'flex' }}>
          <Button onClick={() => setShowMnemonic(true)}>点击查看助记词</Button>
        </div>
        {renderMnemonicDisplay()}
      </div>
      
      <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
        <Button 
          type="primary" 
          block 
          onClick={() => setStep(3)}
          disabled={!showMnemonic}
        >
          我已安全备份助记词
        </Button>
      </Space>
    </div>
  );
  
  // 主页面渲染
  return (
    <div className="create-wallet-container">
      <Card className="create-wallet-card">
        <div className="header">
          <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
            {step === 1 ? (
              activeTab === 'create' ? '创建新钱包' : '导入钱包'
            ) : step === 2 ? '备份助记词' : '验证助记词'}
          </Title>
        </div>
        
        <div className="content">
          {step === 1 ? (
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              centered
            >
              <TabPane tab="创建钱包" key="create">
                {renderCreateWalletForm()}
              </TabPane>
              <TabPane tab="导入助记词" key="importMnemonic">
                {renderImportMnemonicForm()}
              </TabPane>
              <TabPane tab="导入私钥" key="importPrivateKey">
                {renderImportPrivateKeyForm()}
              </TabPane>
            </Tabs>
          ) : step === 2 ? (
            renderMnemonicStep()
          ) : (
            renderVerificationStep()
          )}
        </div>
      </Card>
    </div>
  );
};

export default CreateWallet; 
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message, Progress, Checkbox, Tooltip, Steps } from 'antd';
import { 
  KeyOutlined, 
  BookOutlined, 
  LockOutlined, 
  SafetyOutlined, 
  EyeInvisibleOutlined, 
  EyeOutlined,
  LeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';
import '../styles/CreateWallet.css';
import { saveAs } from 'file-saver';

// 引入自定义组件
import MnemonicDisplay from '../components/Wallet/MnemonicDisplay';
import MnemonicVerification from '../components/Wallet/MnemonicVerification';
import PasswordInput from '../components/Wallet/PasswordInput';
import TermsAgreement from '../components/Wallet/TermsAgreement';

const CreateWallet = ({ step: routeStep }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createHDWallet, importHDWalletByMnemonic, importWalletByPrivateKey, error, loading } = useWallet();
  
  // 本地加载状态
  const [isCreating, setIsCreating] = useState(false);
  
  // MetaMask的创建钱包步骤: 1. 密码创建 2. 备份助记词 3. 确认助记词
  const [currentStep, setCurrentStep] = useState(
    routeStep === "password" ? 0 :
    routeStep === "backup" ? 1 :
    routeStep === "confirm" ? 2 : 0
  );
  
  // 表单数据
  const [walletData, setWalletData] = useState({
    name: "我的钱包",  // 默认钱包名称
    mnemonic: '',
    privateKey: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
    secureBackupConfirmed: false
  });
  
  // 界面状态
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [formError, setFormError] = useState('');
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationWords, setVerificationWords] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);

  // 从location state中加载助记词等数据
  useEffect(() => {
    if (location.state) {
      const { mnemonic, password, name } = location.state;
      if (mnemonic) {
        setWalletData(prev => ({
          ...prev,
          mnemonic,
          password: password || prev.password,
          name: name || prev.name
        }));
      }
    }
  }, [location]);

  // 计算密码强度
  useEffect(() => {
    const password = walletData.password;
    
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    // 长度检查
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    
    // 复杂度检查
    if (/[a-z]/.test(password)) strength += 15; // 小写字母
    if (/[A-Z]/.test(password)) strength += 15; // 大写字母
    if (/[0-9]/.test(password)) strength += 15; // 数字
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25; // 特殊字符
    
    // 设置最终强度（最高100）
    setPasswordStrength(Math.min(100, strength));
    
  }, [walletData.password]);

  // 准备验证单词
  useEffect(() => {
    if (currentStep === 2 && walletData.mnemonic) {
      const mnemonicWords = walletData.mnemonic.split(' ');
      // 随机选择3个需要验证的单词
      const indices = [];
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * mnemonicWords.length);
        if (!indices.includes(idx)) {
          indices.push(idx);
        }
      }
      setSelectedIndices(indices);
      setVerificationWords(
        indices.map(idx => ({
          index: idx,
          word: mnemonicWords[idx],
          isCorrect: false
        }))
      );
    }
  }, [currentStep, walletData.mnemonic]);

  // 表单变更处理
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setWalletData({
      ...walletData,
      [name]: name.includes('agreed') || name.includes('confirmed') ? checked : value
    });
    setFormError('');
  };

  // 获取密码强度颜色
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 80) return '#52c41a'; // 绿色
    if (passwordStrength >= 50) return '#faad14'; // 黄色
    if (passwordStrength >= 30) return '#fa8c16'; // 橙色
    return '#f5222d'; // 红色
  };

  // 获取密码强度文本
  const getPasswordStrengthText = () => {
    if (passwordStrength >= 80) return '强';
    if (passwordStrength >= 50) return '中';
    if (passwordStrength >= 30) return '弱';
    return '非常弱';
  };

  // 创建钱包逻辑
  const handleCreateWallet = async () => {
    // 第一步：验证密码并创建钱包
    if (!walletData.password) {
      setFormError('请输入密码');
      return;
    }
    
    if (walletData.password.length < 8) {
      setFormError('密码长度至少为8位');
      return;
    }
    
    if (passwordStrength < 40) {
      setFormError('密码强度不足，请设置更复杂的密码');
      return;
    }
    
    if (walletData.password !== walletData.confirmPassword) {
      setFormError('两次输入的密码不一致');
      return;
    }
    
    if (!walletData.agreedToTerms) {
      setFormError('请同意使用条款');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // 创建HD钱包
      const result = await createHDWallet(walletData.name, walletData.password);
      
      if (result && result.mnemonic) {
        // 成功创建，保存助记词，进入下一步
        setWalletData(prev => ({...prev, mnemonic: result.mnemonic}));
        navigate('/create/backup', { 
          state: { 
            mnemonic: result.mnemonic, 
            password: walletData.password,
            name: walletData.name
          }
        });
      } else {
        setFormError('创建钱包失败');
      }
    } catch (err) {
      setFormError(err.message || '创建钱包失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 处理助记词验证
  const handleVerifyMnemonic = (selectedWords) => {
    const mnemonicWords = walletData.mnemonic.split(' ');
    let allCorrect = true;
    
    for (let i = 0; i < verificationWords.length; i++) {
      const wordObj = verificationWords[i];
      if (selectedWords[i] !== mnemonicWords[wordObj.index]) {
        allCorrect = false;
        break;
      }
    }
    
    if (allCorrect) {
      setVerificationComplete(true);
      message.success('助记词验证成功！');
      // 延迟一会儿再导航到仪表板
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
      setFormError('助记词验证失败，请检查您的选择');
    }
  };

  // 返回上一步
  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/');
    } else if (currentStep === 1) {
      navigate('/create/password');
    } else if (currentStep === 2) {
      navigate('/create/backup', { 
        state: { 
          mnemonic: walletData.mnemonic,
          password: walletData.password,
          name: walletData.name
        } 
      });
    }
  };

  // 进行到下一步
  const handleNext = () => {
    if (currentStep === 0) {
      handleCreateWallet();
    } else if (currentStep === 1) {
      if (!walletData.secureBackupConfirmed) {
        setFormError('请确认已安全备份助记词');
        return;
      }
      navigate('/create/confirm', { 
        state: { 
          mnemonic: walletData.mnemonic,
          password: walletData.password,
          name: walletData.name
        } 
      });
    }
  };

  // 渲染步骤指示器
  const renderSteps = () => (
    <Steps
      current={currentStep}
      items={[
        { title: '创建密码' },
        { title: '备份助记词' },
        { title: '确认助记词' }
      ]}
      className="mb-8"
      size="small"
    />
  );

  // 渲染第一步：创建密码
  const renderPasswordStep = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">创建密码</h2>
        <p className="text-gray-600">该密码将用于解锁您的钱包</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            新密码
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <LockOutlined />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="w-full py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="至少8位字符"
              value={walletData.password}
              onChange={handleInputChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
            >
              {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>
          
          {walletData.password && (
            <div className="mt-2">
              <div className="flex items-center mb-1">
                <Tooltip title={`密码强度: ${passwordStrength}%`}>
                  <Progress 
                    percent={passwordStrength} 
                    size="small" 
                    strokeColor={getPasswordStrengthColor()}
                    showInfo={false}
                    className="flex-1 mr-2"
                  />
                </Tooltip>
                <span className="text-xs" style={{color: getPasswordStrengthColor()}}>
                  {getPasswordStrengthText()}
                </span>
              </div>
              <p className="text-xs text-gray-500">建议混合使用大小写字母、数字和特殊字符</p>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            确认密码
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <LockOutlined />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="再次输入密码"
              value={walletData.confirmPassword}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="pt-2">
          <Checkbox
            name="agreedToTerms"
            checked={walletData.agreedToTerms}
            onChange={handleInputChange}
          >
            我同意 <a href="#" className="text-blue-600 hover:underline">使用条款</a>
          </Checkbox>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoCircleOutlined className="text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>重要提示：</strong> MetaMask 永远无法帮您恢复密码。我们将在下一步为您创建一个安全恢复助记词，请务必妥善保管。
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 渲染第二步：备份助记词
  const renderBackupStep = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">备份助记词</h2>
        <p className="text-gray-600">这是您恢复钱包的唯一方式，请将其安全保管</p>
      </div>
      
      <div className="space-y-6">
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleOutlined className="text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>警告：</strong> 请勿向任何人透露您的备份短语，并将其存储在安全的地方。否则，您的资产可能会被盗。
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div className="grid grid-cols-3 gap-2">
            {walletData.mnemonic && walletData.mnemonic.split(' ').map((word, index) => (
              <div key={index} className="flex items-center p-2 bg-white rounded border border-gray-200">
                <span className="text-gray-500 text-xs mr-2">{index + 1}.</span>
                <span className="font-mono">{word}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="pt-2">
          <Checkbox
            name="secureBackupConfirmed"
            checked={walletData.secureBackupConfirmed}
            onChange={handleInputChange}
          >
            我已将助记词安全备份
          </Checkbox>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoCircleOutlined className="text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>提示：</strong> 将这些单词按顺序记下来并存储在安全的地方。您将需要这些单词来验证您的钱包。
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 渲染第三步：确认助记词
  const renderConfirmStep = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">确认助记词</h2>
        <p className="text-gray-600">请按顺序选择下列单词，确认您已正确记下助记词</p>
      </div>
      
      <div className="space-y-6">
        {verificationComplete ? (
          <div className="bg-green-50 p-6 rounded-md text-center">
            <CheckCircleOutlined className="text-green-500 text-4xl mb-2" />
            <h3 className="text-xl font-medium text-green-800 mb-1">验证成功!</h3>
            <p className="text-green-600">您的钱包已经创建完成</p>
          </div>
        ) : (
          <>
            <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
              <MnemonicVerification 
                mnemonicWords={walletData.mnemonic ? walletData.mnemonic.split(' ') : []}
                selectedIndices={selectedIndices}
                onComplete={handleVerifyMnemonic}
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InfoCircleOutlined className="text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    请选择第{selectedIndices.map(i => ` ${i+1}`).join('、')} 个单词，验证您记下的助记词。
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center py-10 px-4">
      {/* Logo或返回按钮 */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <ArrowLeftOutlined className="mr-1" />
          {currentStep === 0 ? '返回主页' : '返回上一步'}
        </button>
        
        <div className="text-xl font-bold text-gray-800">
          创建钱包
        </div>
        
        <div className="w-6"></div> {/* 占位元素保持布局平衡 */}
      </div>
      
      {/* 主要内容卡片 */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        {/* 步骤指示器 */}
        {renderSteps()}
        
        {/* 错误提示 */}
        {(formError || error) && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-3 rounded-md flex items-start">
            <ExclamationCircleOutlined className="flex-shrink-0 mt-0.5 mr-2" />
            <span>{formError || error}</span>
          </div>
        )}
        
        {/* 根据当前步骤渲染不同内容 */}
        {currentStep === 0 && renderPasswordStep()}
        {currentStep === 1 && renderBackupStep()}
        {currentStep === 2 && renderConfirmStep()}
        
        {/* 按钮区域 - 仅在验证未完成时显示 */}
        {(currentStep !== 2 || !verificationWords.length) && (
          <div className="mt-8">
            <button
              disabled={isCreating || loading || (currentStep === 2 && !verificationWords.length)}
              onClick={handleNext}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                isCreating || loading || (currentStep === 2 && !verificationWords.length)
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCreating || loading ? '处理中...' : currentStep === 0 ? '创建' : currentStep === 1 ? '继续' : '验证助记词'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWallet;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Progress, Tooltip } from 'antd';
import { 
  BookOutlined, 
  LockOutlined, 
  SafetyOutlined, 
  EyeInvisibleOutlined, 
  EyeOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';

const ImportWallet = () => {
  const navigate = useNavigate();
  const { importHDWalletByMnemonic, error } = useWallet();
  
  const [formData, setFormData] = useState({
    name: '',
    mnemonic: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mnemonicValid, setMnemonicValid] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // 验证助记词格式
  useEffect(() => {
    if (!formData.mnemonic) {
      setMnemonicValid(null);
      return;
    }

    try {
      const trimmedMnemonic = formData.mnemonic.trim();
      const words = trimmedMnemonic.split(/\s+/);
      
      if (words.length !== 12 && words.length !== 15 && words.length !== 24) {
        throw new Error('助记词必须是12、15或24个单词');
      }
      
      // 这里只是简单检查，完整验证会在导入时进行
      if (words.some(word => word.length < 3)) {
        throw new Error('助记词中包含无效单词');
      }
      
      setMnemonicValid(true);
      setFormError('');
    } catch (error) {
      setMnemonicValid(false);
      setFormError(error.message || '无效的助记词格式');
    }
  }, [formData.mnemonic]);

  // 计算密码强度
  useEffect(() => {
    const password = formData.password;
    
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
    
  }, [formData.password]);

  // 处理表单输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (name !== 'mnemonic') {
      setFormError('');
    }
  };

  // 验证输入
  const validateInputs = () => {
    if (!formData.name) {
      setFormError('请输入钱包名称');
      return false;
    }
    
    if (formData.password.length < 8) {
      setFormError('密码长度至少为8位');
      return false;
    }
    
    if (passwordStrength < 40) {
      setFormError('密码强度不足，请使用更复杂的密码');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setFormError('两次输入的密码不一致');
      return false;
    }

    if (!formData.mnemonic) {
      setFormError('请输入助记词');
      return false;
    }
    
    if (mnemonicValid !== true) {
      setFormError('助记词格式不正确');
      return false;
    }

    return true;
  };

  // 处理导入
  const handleImport = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    try {
      // 导入助记词
      const result = await importHDWalletByMnemonic(
        formData.mnemonic.trim(),
        formData.name,
        formData.password
      );

      if (result) {
        message.success('钱包导入成功！');
        navigate('/dashboard');
      } else {
        setFormError(error || '导入钱包失败');
      }
    } catch (err) {
      setFormError(err.message || '导入钱包失败');
    } finally {
      setLoading(false);
    }
  };

  // 返回主页
  const handleBack = () => {
    navigate('/');
  };

  // 获取密码强度颜色
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 80) return 'green';
    if (passwordStrength >= 50) return 'gold';
    if (passwordStrength >= 30) return 'orange';
    return 'red';
  };

  // 获取密码强度文本
  const getPasswordStrengthText = () => {
    if (passwordStrength >= 80) return '强';
    if (passwordStrength >= 50) return '中';
    if (passwordStrength >= 30) return '弱';
    return '非常弱';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* 背景装饰元素 */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 right-40 w-72 h-72 bg-secondary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>

      {/* 返回按钮 */}
      <button 
        onClick={handleBack}
        className="absolute top-6 left-6 flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors"
      >
        <ArrowLeftOutlined />
        <span>返回首页</span>
      </button>

      {/* 主卡片 */}
      <div className="glass-effect w-full max-w-md rounded-2xl p-8 shadow-glass-lg">
        <h1 className="font-display text-2xl font-bold text-dark-800 mb-6">
          <BookOutlined className="mr-2" />
          通过助记词恢复钱包
        </h1>

        {/* 表单内容 */}
        <div className="space-y-5">
          {/* 钱包名称字段 */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">钱包名称</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <SafetyOutlined />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="输入钱包名称"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* 助记词字段 */}
          <div className="mb-4">
            <label htmlFor="mnemonic" className="block text-sm font-medium text-gray-700 mb-1">
              助记词
              {mnemonicValid === true && (
                <CheckCircleOutlined className="ml-2 text-green-500" />
              )}
              {mnemonicValid === false && (
                <CloseCircleOutlined className="ml-2 text-red-500" />
              )}
            </label>
            <textarea
              id="mnemonic"
              name="mnemonic"
              rows={3}
              className={`w-full py-2 px-3 border ${
                mnemonicValid === true 
                  ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                  : mnemonicValid === false 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              } rounded-lg font-mono`}
              placeholder="输入助记词，用空格分隔"
              value={formData.mnemonic}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-gray-500">通常是12个单词，用空格分隔</p>
          </div>

          {/* 密码字段 */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <LockOutlined />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="w-full py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="设置强密码（至少8位）"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
              >
                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </button>
            </div>
            
            {formData.password && (
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

          {/* 确认密码字段 */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <LockOutlined />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="w-full py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">两次输入的密码不一致</p>
            )}
          </div>

          {/* 错误提示 */}
          {formError && (
            <div className="rounded-md bg-red-50 p-3 mb-4">
              <div className="flex items-center">
                <ExclamationCircleOutlined className="text-red-500 mr-2" />
                <span className="text-sm text-red-500">{formError}</span>
              </div>
            </div>
          )}

          {/* 导入按钮 */}
          <div>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading 
                  ? 'bg-primary-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
            >
              {loading ? '导入中...' : '恢复钱包'}
            </button>
          </div>

          {/* 安全提示 */}
          <div className="mt-6">
            <div className="bg-blue-50 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <SafetyOutlined className="text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">安全提示</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>• 助记词一旦丢失无法找回</p>
                    <p>• 请勿向任何人透露您的助记词</p>
                    <p>• 任何获得您助记词的人都可以控制您的资产</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportWallet; 
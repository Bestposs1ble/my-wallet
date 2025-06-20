import React, { useState } from 'react';
import { LockOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 密码输入组件，支持密码强度提示、显示/隐藏密码和密码确认
 * 
 * @param {boolean} confirmPassword - 是否需要确认密码输入
 * @param {boolean} showStrengthMeter - 是否显示密码强度指示器
 * @param {string} passwordValue - 密码值
 * @param {string} confirmPasswordValue - 确认密码值
 * @param {function} onPasswordChange - 密码变更回调
 * @param {function} onConfirmPasswordChange - 确认密码变更回调
 * @returns {JSX.Element}
 */
const PasswordInput = ({ 
  confirmPassword = true, 
  showStrengthMeter = true,
  passwordValue = '',
  confirmPasswordValue = '',
  onPasswordChange,
  onConfirmPasswordChange
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    level: 0, // 0-3, 0表示无密码，3表示强密码
    percent: 0 // 0-100
  });
  
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  // 评估密码强度
  const evaluatePasswordStrength = (password) => {
    if (!password) {
      return { level: 0, percent: 0 };
    }

    let level = 0;
    let percent = 0;

    // 基本长度检查
    if (password.length >= 8) {
      level += 1;
      percent += 30;
    }

    // 包含字母和数字
    if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) {
      level += 1;
      percent += 30;
    }

    // 包含特殊字符
    if (/[^a-zA-Z0-9]/.test(password)) {
      level += 1;
      percent += 40;
    }

    return { level, percent: Math.min(100, percent) };
  };

  // 处理密码变更
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    const strength = evaluatePasswordStrength(value);
    setPasswordStrength(strength);
    
    // 验证密码
    if (value.length < 8) {
      setPasswordError('密码长度至少为8位');
    } else {
      setPasswordError('');
    }
    
    // 验证确认密码
    if (confirmPasswordValue && value !== confirmPasswordValue) {
      setConfirmError('两次输入的密码不一致');
    } else if (confirmPasswordValue) {
      setConfirmError('');
    }
    
    if (onPasswordChange) {
      onPasswordChange(value);
    }
  };
  
  // 处理确认密码变更
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    
    // 验证确认密码
    if (passwordValue !== value) {
      setConfirmError('两次输入的密码不一致');
    } else {
      setConfirmError('');
    }
    
    if (onConfirmPasswordChange) {
      onConfirmPasswordChange(value);
    }
  };

  // 获取密码强度颜色
  const getStrengthColor = () => {
    const { level } = passwordStrength;
    if (level === 0) return 'bg-red-500';
    if (level === 1) return 'bg-yellow-500';
    if (level === 2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  // 获取密码强度描述文本
  const getStrengthText = () => {
    const { level } = passwordStrength;
    if (level === 0) return { text: '弱', color: 'text-red-500' };
    if (level === 1) return { text: '中等', color: 'text-yellow-500' };
    if (level === 2) return { text: '强', color: 'text-green-500' };
    return { text: '非常强', color: 'text-blue-500' };
  };

  const strengthInfo = getStrengthText();

  return (
    <div className="space-y-4">
      {/* 密码输入 */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">密码</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <LockOutlined />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className={`w-full py-2 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors
              ${passwordError ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="输入至少8位密码"
            value={passwordValue}
            onChange={handlePasswordChange}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
          >
            {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </button>
        </div>
        {passwordError && <p className="mt-1 text-sm text-red-500">{passwordError}</p>}
        
        {/* 密码强度指示器 */}
        {showStrengthMeter && passwordValue && (
          <div className="mt-2">
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getStrengthColor()}`} 
                style={{ width: `${passwordStrength.percent}%`, transition: 'width 0.3s ease' }}
              ></div>
            </div>
            <p className={`text-right text-xs mt-1 ${strengthInfo.color}`}>
              密码强度: {strengthInfo.text}
            </p>
          </div>
        )}
      </div>
      
      {/* 确认密码 */}
      {confirmPassword && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <LockOutlined />
            </div>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              className={`w-full py-2 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors
                ${confirmError ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="再次输入密码"
              value={confirmPasswordValue}
              onChange={handleConfirmPasswordChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
            >
              {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>
          {confirmError && <p className="mt-1 text-sm text-red-500">{confirmError}</p>}
        </div>
      )}
    </div>
  );
};

PasswordInput.propTypes = {
  confirmPassword: PropTypes.bool,
  showStrengthMeter: PropTypes.bool,
  passwordValue: PropTypes.string,
  confirmPasswordValue: PropTypes.string,
  onPasswordChange: PropTypes.func,
  onConfirmPasswordChange: PropTypes.func
};

export default PasswordInput; 
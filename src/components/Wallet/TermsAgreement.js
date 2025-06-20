import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 服务条款同意组件
 * 
 * @param {boolean} checked - 是否勾选
 * @param {function} onChange - 状态变化回调
 * @returns {JSX.Element}
 */
const TermsAgreement = ({ 
  checked = false, 
  onChange,
  error = ''
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="terms-agreement"
            name="terms-agreement"
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="terms-agreement" className="font-medium text-gray-700">
            我已阅读并同意
            <a href="#terms" className="text-primary-600 hover:text-primary-800 ml-1 mr-1">《服务条款》</a>
            和
            <a href="#privacy" className="text-primary-600 hover:text-primary-800 ml-1">《隐私政策》</a>
          </label>
        </div>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      
      <div className="pl-5 text-xs text-gray-500 flex items-start space-x-1">
        <InfoCircleOutlined className="flex-shrink-0 mt-0.5" />
        <span>我了解我的资产安全和恢复完全依赖于我自己的助记词备份，任何人都无法为我找回丢失的密钥。</span>
      </div>
    </div>
  );
};

TermsAgreement.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  error: PropTypes.string
};

export default TermsAgreement; 
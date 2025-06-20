import React, { useState, useEffect } from 'react';
import { InfoCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 助记词验证组件 - 用于验证用户记住了助记词
 * 
 * @param {string} mnemonic - 完整的助记词字符串
 * @param {Array} verificationIndexes - 需要验证的单词索引数组 [0, 2, 5]
 * @param {Function} onVerifySuccess - 验证成功回调
 * @param {Function} onVerifyFail - 验证失败回调
 * @returns {JSX.Element}
 */
const MnemonicVerification = ({ 
  mnemonic = '', 
  verificationIndexes = [0, 3, 11], 
  onVerifySuccess,
  onVerifyFail 
}) => {
  const [shuffledWords, setShuffledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  // 将助记词分割为单词数组并打乱顺序
  useEffect(() => {
    if (mnemonic) {
      const words = mnemonic.split(' ');
      setShuffledWords([...words].sort(() => 0.5 - Math.random()));
    }
  }, [mnemonic]);

  // 处理助记词单词点击
  const handleWordSelect = (word) => {
    setSelectedWords([...selectedWords, word]);
    setVerificationError(null);
  };

  // 处理已选单词删除
  const handleWordRemove = (index) => {
    const newSelectedWords = [...selectedWords];
    newSelectedWords.splice(index, 1);
    setSelectedWords(newSelectedWords);
    setVerificationError(null);
  };

  // 清除所有已选择的单词
  const clearSelectedWords = () => {
    setSelectedWords([]);
    setVerificationError(null);
    setVerificationSuccess(false);
  };

  // 验证选择的单词是否正确
  const verifySelectedWords = () => {
    const words = mnemonic.split(' ');
    
    // 确保选择了正确数量的单词
    if (selectedWords.length !== verificationIndexes.length) {
      setVerificationError(`请选择${verificationIndexes.length}个单词以完成验证`);
      return;
    }

    // 验证每个位置的单词是否正确
    for (let i = 0; i < verificationIndexes.length; i++) {
      const index = verificationIndexes[i];
      if (selectedWords[i] !== words[index]) {
        if (onVerifyFail) {
          onVerifyFail();
        }
        setVerificationError('助记词验证失败，请检查顺序');
        return;
      }
    }

    // 验证成功
    setVerificationSuccess(true);
    if (onVerifySuccess) {
      onVerifySuccess();
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 overflow-hidden relative">
      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full transform translate-x-16 -translate-y-16 opacity-40"></div>
      
      <div className="space-y-6 relative">
        {/* 标题 */}
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold text-lg text-dark-800">验证助记词</h3>
          {verificationSuccess && (
            <span className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
              <CheckCircleOutlined className="mr-1" /> 验证成功
            </span>
          )}
        </div>
        
        {/* 验证说明 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoCircleOutlined className="text-lg text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                请按顺序选择第<span className="font-semibold">{verificationIndexes.map(i => i + 1).join('、')}</span>个单词，以验证您是否正确备份了助记词。
              </p>
            </div>
          </div>
        </div>

        {/* 选择的单词区域 */}
        <div className="bg-gray-50 p-5 rounded-xl shadow-inner min-h-[80px]">
          <div className="flex flex-wrap gap-2">
            {selectedWords.length > 0 ? (
              selectedWords.map((word, index) => (
                <div 
                  key={index} 
                  className="bg-white px-3 py-1.5 rounded-lg flex items-center border border-gray-200 shadow-sm group"
                >
                  <span className="font-mono font-medium">{word}</span>
                  <button
                    onClick={() => handleWordRemove(index)}
                    className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="w-full text-center text-gray-500">
                请从下方选择单词
              </div>
            )}
          </div>
        </div>
        
        {/* 验证错误提示 */}
        {verificationError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center space-x-2">
            <ExclamationCircleOutlined />
            <span>{verificationError}</span>
          </div>
        )}

        {/* 单词选择区域 */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {shuffledWords.map((word, index) => (
              <button
                key={index}
                onClick={() => handleWordSelect(word)}
                disabled={selectedWords.includes(word)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all transform hover:-translate-y-0.5 
                  ${selectedWords.includes(word)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-200 shadow-sm hover:shadow text-dark-800'}`}
              >
                {word}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button
            onClick={clearSelectedWords}
            disabled={selectedWords.length === 0}
            className={`px-4 py-2 rounded-lg text-sm 
              ${selectedWords.length === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white border border-gray-200 text-dark-800 hover:bg-gray-50'}`}
          >
            清空选择
          </button>
          <button 
            onClick={verifySelectedWords}
            className={`px-4 py-2 rounded-lg text-sm font-medium 
              ${verificationSuccess 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
          >
            {verificationSuccess ? '已验证' : '验证'}
          </button>
        </div>
      </div>
    </div>
  );
};

MnemonicVerification.propTypes = {
  mnemonic: PropTypes.string.isRequired,
  verificationIndexes: PropTypes.arrayOf(PropTypes.number),
  onVerifySuccess: PropTypes.func,
  onVerifyFail: PropTypes.func
};

export default MnemonicVerification; 
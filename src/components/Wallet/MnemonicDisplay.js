import React, { useState } from 'react';
import { message } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';

/**
 * 助记词显示组件 - 用于显示、复制和下载助记词
 * 
 * @param {string} mnemonic - 助记词字符串
 * @param {string} title - 组件标题
 * @param {boolean} showCopyButton - 是否显示复制按钮
 * @param {boolean} showDownloadButton - 是否显示下载按钮
 * @returns {JSX.Element}
 */
const MnemonicDisplay = ({ 
  mnemonic = '', 
  title = '助记词', 
  showCopyButton = true, 
  showDownloadButton = true 
}) => {
  const [showMnemonic, setShowMnemonic] = useState(false);

  // 将助记词分割为单词数组
  const mnemonicWords = mnemonic ? mnemonic.split(' ') : [];

  // 处理复制助记词
  const handleCopyMnemonic = () => {
    if (mnemonic) {
      navigator.clipboard.writeText(mnemonic);
      message.success('助记词已复制到剪贴板');
    }
  };

  // 处理下载助记词
  const handleDownloadMnemonic = () => {
    if (mnemonic) {
      const content = `这是您的助记词备份，请妥善保管，不要分享给任何人！\n\n${mnemonic}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'mnemonic-backup.txt');
      message.success('助记词备份已下载');
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 overflow-hidden relative">
      {/* 装饰性背景元素 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full transform translate-x-16 -translate-y-16 opacity-50"></div>
      
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex justify-between items-center">
          <h3 className="font-display font-semibold text-lg text-dark-800">{title}</h3>
          <button 
            onClick={() => setShowMnemonic(!showMnemonic)}
            className="flex items-center text-primary-600 hover:text-primary-700 px-2 py-1 rounded-md text-sm font-medium transition-colors"
          >
            {showMnemonic ? <EyeInvisibleOutlined className="mr-1" /> : <EyeOutlined className="mr-1" />}
            {showMnemonic ? '隐藏' : '显示'}
          </button>
        </div>

        {/* 安全提示 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleOutlined className="text-lg text-yellow-600" />
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-sm text-yellow-800">安全提示</h4>
              <div className="text-sm text-yellow-700 mt-1">
                请将您的助记词抄写在纸上，并保存在安全的地方。这是恢复钱包的唯一方式，一旦丢失将无法找回！
              </div>
            </div>
          </div>
        </div>

        {/* 助记词显示区域 */}
        <div className="bg-gray-50 p-5 rounded-xl shadow-inner">
          {showMnemonic ? (
            <div className="grid grid-cols-3 gap-2">
              {mnemonicWords.map((word, index) => (
                <div key={index} className="bg-white p-2 rounded-lg flex items-center border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-400 mr-2 w-4">{index + 1}.</span>
                  <span className="font-mono font-medium">{word}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center">
              <div className="bg-gray-200 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                <EyeOutlined className="text-xl text-gray-500" />
              </div>
              <p className="text-gray-500 text-center">点击"显示"查看助记词</p>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4">
          {showCopyButton && (
            <button 
              onClick={handleCopyMnemonic}
              disabled={!showMnemonic}
              className={`flex items-center px-4 py-2 rounded-lg ${showMnemonic 
                ? 'bg-white border border-gray-200 text-dark-800 hover:bg-gray-50' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'} transition-colors`}
            >
              <CopyOutlined className="mr-2" />
              复制助记词
            </button>
          )}
          {showDownloadButton && (
            <button
              onClick={handleDownloadMnemonic}
              disabled={!showMnemonic}
              className={`flex items-center px-4 py-2 rounded-lg ${showMnemonic 
                ? 'bg-primary-600 text-white hover:bg-primary-700' 
                : 'bg-primary-300 text-white cursor-not-allowed'} transition-colors`}
            >
              <DownloadOutlined className="mr-2" />
              下载备份
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

MnemonicDisplay.propTypes = {
  mnemonic: PropTypes.string.isRequired,
  title: PropTypes.string,
  showCopyButton: PropTypes.bool,
  showDownloadButton: PropTypes.bool
};

export default MnemonicDisplay; 
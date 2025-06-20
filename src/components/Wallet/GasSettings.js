import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { QuestionCircleOutlined, EditOutlined } from '@ant-design/icons';

/**
 * Gas设置组件 - 提供Gas费用的选择和自定义
 * 
 * @param {Object} gasInfo - Gas信息，包括建议价格
 * @param {Function} onChange - Gas设置变更回调
 * @param {Object} initialValues - 初始Gas设置
 * @returns {JSX.Element}
 */
const GasSettings = ({ 
  gasInfo = {}, 
  onChange,
  initialValues = {}
}) => {
  // Gas预设选项
  const GAS_PRESETS = {
    low: { name: '经济', multiplier: 0.8, waitTime: '可能 > 15分钟' },
    medium: { name: '标准', multiplier: 1, waitTime: '< 5分钟' },
    high: { name: '快速', multiplier: 1.5, waitTime: '< 30秒' }
  };
  
  // 状态
  const [selectedPreset, setSelectedPreset] = useState('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gasLimit, setGasLimit] = useState(initialValues.gasLimit || 21000);
  const [maxFeePerGas, setMaxFeePerGas] = useState(0);
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState(0);
  
  // 获取基础Gas价格
  const baseGasPrice = gasInfo.baseFeePerGas || 30; // gwei
  
  // 当Gas信息变化时，更新Gas设置
  useEffect(() => {
    if (gasInfo) {
      const preset = GAS_PRESETS[selectedPreset];
      const newMaxFeePerGas = Math.round(baseGasPrice * preset.multiplier * 100) / 100;
      const newMaxPriorityFeePerGas = Math.round(baseGasPrice * 0.1 * preset.multiplier * 100) / 100;
      
      setMaxFeePerGas(newMaxFeePerGas);
      setMaxPriorityFeePerGas(newMaxPriorityFeePerGas);
      
      // 通知父组件
      if (onChange) {
        onChange({
          gasLimit,
          maxFeePerGas: newMaxFeePerGas,
          maxPriorityFeePerGas: newMaxPriorityFeePerGas,
          presetName: preset.name
        });
      }
    }
  }, [gasInfo, selectedPreset]);
  
  // 处理高级设置变更
  const handleAdvancedChange = () => {
    if (onChange) {
      onChange({
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        presetName: 'custom'
      });
    }
  };
  
  // 计算总费用
  const calculateTotalFee = () => {
    const gasFee = (maxFeePerGas * gasLimit) / 1e9; // 转换为ETH单位
    return gasFee.toFixed(8);
  };
  
  // 工具提示组件
  const Tooltip = ({ children, title }) => {
    const [show, setShow] = useState(false);
    
    return (
      <span 
        className="relative inline-block"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
        {show && (
          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-lg shadow-sm max-w-xs">
            {title}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </span>
    );
  };
  
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-dark-800">Gas设置</h3>
        <span className="text-xs text-gray-500">当前网络: {gasInfo.networkName || "以太坊"}</span>
      </div>
      
      {/* 预设选项 */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(GAS_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => setSelectedPreset(key)}
            className={`px-3 py-3 rounded-xl border flex flex-col items-center transition-colors
              ${selectedPreset === key 
                ? 'border-primary-500 bg-primary-50 text-primary-600' 
                : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <span className="text-sm font-medium">{preset.name}</span>
            <span className={`text-xs ${selectedPreset === key ? 'text-primary-500' : 'text-gray-500'}`}>
              {Math.round(baseGasPrice * preset.multiplier)} Gwei
            </span>
            <span className={`text-xs ${selectedPreset === key ? 'text-primary-500' : 'text-gray-500'} mt-1`}>
              {preset.waitTime}
            </span>
          </button>
        ))}
      </div>
      
      {/* 预计费用 */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">预计总费用</span>
          <span className="font-medium">{calculateTotalFee()} ETH</span>
        </div>
        <div className="mt-1 flex justify-between items-center text-xs text-gray-500">
          <span>Gas价格 ({gasInfo.unit || "Gwei"})</span>
          <span>
            {showAdvanced ? maxFeePerGas : Math.round(baseGasPrice * GAS_PRESETS[selectedPreset].multiplier)}
          </span>
        </div>
        <div className="mt-1 flex justify-between items-center text-xs text-gray-500">
          <span>Gas限制</span>
          <span>{gasLimit}</span>
        </div>
      </div>
      
      {/* 高级设置 */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-primary-600 hover:text-primary-800"
        >
          <EditOutlined className="mr-1" />
          {showAdvanced ? '隐藏高级设置' : '显示高级设置'}
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Gas限制
                  <Tooltip title="交易能消耗的最大Gas数量，标准ETH转账为21,000">
                    <QuestionCircleOutlined className="ml-1 text-gray-400 text-xs" />
                  </Tooltip>
                </label>
                <span className="text-xs text-gray-500">单位</span>
              </div>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setGasLimit(value);
                  handleAdvancedChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="21000"
                step="1000"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  最大费用
                  <Tooltip title="你愿意为此交易支付的最高价格，包括优先费">
                    <QuestionCircleOutlined className="ml-1 text-gray-400 text-xs" />
                  </Tooltip>
                </label>
                <span className="text-xs text-gray-500">{gasInfo.unit || "Gwei"}</span>
              </div>
              <input
                type="number"
                value={maxFeePerGas}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setMaxFeePerGas(value);
                  handleAdvancedChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="0"
                step="0.1"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  优先费
                  <Tooltip title="支付给矿工的小费，以激励他们优先处理你的交易">
                    <QuestionCircleOutlined className="ml-1 text-gray-400 text-xs" />
                  </Tooltip>
                </label>
                <span className="text-xs text-gray-500">{gasInfo.unit || "Gwei"}</span>
              </div>
              <input
                type="number"
                value={maxPriorityFeePerGas}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setMaxPriorityFeePerGas(value);
                  handleAdvancedChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

GasSettings.propTypes = {
  gasInfo: PropTypes.shape({
    baseFeePerGas: PropTypes.number,
    networkName: PropTypes.string,
    unit: PropTypes.string
  }),
  onChange: PropTypes.func,
  initialValues: PropTypes.shape({
    gasLimit: PropTypes.number,
    maxFeePerGas: PropTypes.number,
    maxPriorityFeePerGas: PropTypes.number
  })
};

export default GasSettings; 
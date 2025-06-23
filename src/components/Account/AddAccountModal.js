import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Radio, Alert, Tooltip } from 'antd';
import PropTypes from 'prop-types';
import { KeyOutlined, EyeOutlined, EyeInvisibleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import * as ethers from 'ethers';
import { isValidAddress } from '../../utils/ethersHelper';

/**
 * 添加账户模态框组件
 * 
 * @param {boolean} visible - 是否显示模态框
 * @param {Function} onCancel - 关闭模态框的回调函数
 * @param {Function} onSubmit - 添加账户的回调函数
 * @param {boolean} loading - 是否正在加载
 * @param {string} error - 错误信息
 * @returns {JSX.Element}
 */
const AddAccountModal = ({ 
  visible = false, 
  onCancel, 
  onSubmit,
  loading = false,
  error = null
}) => {
  const [form] = Form.useForm();
  const [accountType, setAccountType] = useState('derived');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyValid, setPrivateKeyValid] = useState(null);
  const [privateKeyAddress, setPrivateKeyAddress] = useState('');
  
  // 提交表单，调用添加账户函数
  const handleSubmit = (values) => {
    onSubmit(values);
  };

  // 校验私钥有效性
  useEffect(() => {
    const privateKey = form.getFieldValue('privateKey');
    if (!privateKey) {
      setPrivateKeyValid(null);
      setPrivateKeyAddress('');
      return;
    }

    try {
      const key = privateKey.trim();
      const formattedKey = key.startsWith('0x') ? key : `0x${key}`;
      
      if (!key.startsWith('0x') && !/^[0-9a-fA-F]{64}$/.test(key)) {
        throw new Error('私钥必须是64个16进制字符');
      }
      
      if (key.startsWith('0x') && !/^0x[0-9a-fA-F]{64}$/.test(key)) {
        throw new Error('私钥必须是0x开头的66个字符');
      }
      
      // 尝试创建钱包验证私钥
      const wallet = new ethers.Wallet(formattedKey);
      if (!isValidAddress(wallet.address)) {
        throw new Error('无法从私钥派生有效地址');
      }
      
      setPrivateKeyValid(true);
      setPrivateKeyAddress(wallet.address);
    } catch (error) {
      setPrivateKeyValid(false);
      setPrivateKeyAddress('');
    }
  }, [form.getFieldValue('privateKey')]);
  
  // 重置表单
  const resetFormFields = () => {
    setAccountType('derived');
    setShowPrivateKey(false);
    setPrivateKeyValid(null);
    setPrivateKeyAddress('');
    form.resetFields();
  };

  // 关闭模态框时重置表单
  const handleCancel = () => {
    resetFormFields();
    onCancel();
  };
  
  // 账户类型变更处理
  const handleAccountTypeChange = (e) => {
    setAccountType(e.target.value);
  };
  
  return (
    <Modal
      title="添加账户"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      afterClose={resetFormFields}
    >
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: 'derived' }}
      >
        <Form.Item
          name="name"
          label="账户名称"
          rules={[{ required: true, message: '请输入账户名称' }]}
        >
          <Input placeholder="输入账户名称" autoFocus />
        </Form.Item>
        
        <Form.Item
          name="type"
          label="账户类型"
        >
          <Radio.Group onChange={handleAccountTypeChange} value={accountType}>
            <Radio value="derived">从当前HD钱包派生新账户</Radio>
            <Radio value="imported">导入私钥</Radio>
          </Radio.Group>
        </Form.Item>
        
        {accountType === 'imported' && (
          <Form.Item
            name="privateKey"
            label={
              <div className="flex items-center">
                <span>私钥</span>
                {privateKeyValid === true && (
                  <Tooltip title={`派生地址: ${privateKeyAddress}`}>
                    <CheckCircleOutlined className="ml-2 text-green-500" />
                  </Tooltip>
                )}
                {privateKeyValid === false && (
                  <Tooltip title="无效的私钥格式">
                    <CloseCircleOutlined className="ml-2 text-red-500" />
                  </Tooltip>
                )}
              </div>
            }
            rules={[
              { required: true, message: '请输入私钥' },
              () => ({
                validator(_, value) {
                  if (!value || privateKeyValid === true) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('无效的私钥格式'));
                }
              })
            ]}
          >
            <Input 
              prefix={<KeyOutlined />}
              type={showPrivateKey ? "text" : "password"}
              placeholder="输入以太坊私钥(带或不带0x前缀)"
              className="font-mono"
              suffix={
                <Button 
                  type="text" 
                  icon={showPrivateKey ? <EyeInvisibleOutlined /> : <EyeOutlined />} 
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  style={{ marginRight: -12 }}
                />
              }
            />
          </Form.Item>
        )}
        
        {accountType === 'imported' && privateKeyValid === true && privateKeyAddress && (
          <Alert
            message={`地址: ${privateKeyAddress.slice(0, 8)}...${privateKeyAddress.slice(-6)}`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>取消</Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            disabled={accountType === 'imported' && privateKeyValid !== true}
          >
            添加
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

AddAccountModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string
};

export default AddAccountModal; 
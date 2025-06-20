import React from 'react';
import { Modal, Form, Input, Button, Slider, Space, Typography, Divider } from 'antd';
import PropTypes from 'prop-types';

const { Text } = Typography;

/**
 * 发送交易模态框组件
 * 
 * @param {boolean} visible - 是否显示模态框
 * @param {Function} onCancel - 关闭模态框的回调函数
 * @param {Function} onSend - 发送交易的回调函数
 * @param {string} networkSymbol - 当前网络代币符号
 * @param {Object} gasPrice - 当前Gas价格信息
 * @param {number} balance - 当前账户余额
 * @param {boolean} loading - 是否正在处理交易
 * @returns {JSX.Element}
 */
const SendTransactionModal = ({
  visible = false,
  onCancel,
  onSend,
  networkSymbol = 'ETH',
  gasPrice = null,
  balance = 0,
  loading = false
}) => {
  const [form] = Form.useForm();
  
  // 提交表单，调用发送交易函数
  const handleSubmit = (values) => {
    onSend(values);
  };

  // 设置最大可用金额
  const setMaxAmount = () => {
    form.setFieldsValue({ amount: balance });
  };

  return (
    <Modal
      title="发送交易"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          gasPrice: gasPrice ? gasPrice.medium : '',
        }}
      >
        <Form.Item
          name="to"
          label="接收地址"
          rules={[{ required: true, message: '请输入接收地址' }]}
        >
          <Input placeholder="输入以太坊地址" />
        </Form.Item>

        <Form.Item
          name="amount"
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>{`金额 (${networkSymbol})`}</span>
              <Text type="secondary" style={{ cursor: 'pointer' }} onClick={setMaxAmount}>
                余额: {balance} {networkSymbol}
              </Text>
            </div>
          }
          rules={[
            { required: true, message: '请输入发送金额' },
            { 
              validator: (_, value) => {
                if (value && parseFloat(value) > balance) {
                  return Promise.reject('余额不足');
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <Input type="number" min="0" step="0.000001" placeholder="0.0" />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>交易费用设置</Text>
        </Divider>

        {gasPrice ? (
          <>
            <Form.Item name="gasPrice" label="Gas价格">
              <Slider
                min={gasPrice.low}
                max={gasPrice.high}
                step={1}
                marks={{
                  [gasPrice.low]: '低',
                  [gasPrice.medium]: '中',
                  [gasPrice.high]: '高'
                }}
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', marginBottom: 16 }}>
              预估花费时间: {form.getFieldValue('gasPrice') >= gasPrice.high ? '< 30秒' : '< 2分钟'}
            </Text>
          </>
        ) : (
          <Form.Item
            name="gasPrice"
            label="Gas价格 (Gwei)"
          >
            <Input type="number" min="1" placeholder="自动" />
          </Form.Item>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            发送
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

SendTransactionModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  networkSymbol: PropTypes.string,
  gasPrice: PropTypes.shape({
    low: PropTypes.number,
    medium: PropTypes.number,
    high: PropTypes.number
  }),
  balance: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  loading: PropTypes.bool
};

export default SendTransactionModal; 
import React from 'react';
import { Modal, Button, Typography, Badge, Alert } from 'antd';
import {
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  SendOutlined,
  SwapOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { ethers } from 'ethers';

const { Text, Title, Paragraph } = Typography;

const shortenAddress = (address) => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatValue = (value) => {
  if (typeof value === 'string' && value.startsWith('0x')) {
    // 可能是ETH金额，尝试转换
    try {
      const eth = ethers.utils.formatEther(value);
      const numEth = parseFloat(eth);
      if (!isNaN(numEth)) {
        return `${numEth} ETH (${value})`;
      }
    } catch (e) {
      // 忽略错误，不是有效的ETH值
    }
    
    // 可能是地址，显示缩写形式
    if (value.length === 42) {
      return shortenAddress(value);
    }
  }
  
  // 其他值直接返回
  return value.toString();
};

// 格式化交易数据
const formatTransactionData = (txData) => {
  if (!txData) return {};
  
  const formatted = { ...txData };
  
  // 格式化值
  if (formatted.value) {
    try {
      formatted.formattedValue = ethers.utils.formatEther(formatted.value);
    } catch (e) {
      formatted.formattedValue = '0';
    }
  }
  
  return formatted;
};

// 连接请求组件
const ConnectRequest = ({ request, onApprove, onReject }) => {
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <Badge.Ribbon text={request.origin} color="blue">
          <div className="bg-blue-50 p-6 rounded-lg">
            <LinkOutlined className="text-5xl text-blue-500 mb-2" />
            <Title level={4} className="mt-2">网站请求连接</Title>
          </div>
        </Badge.Ribbon>
      </div>
      
      <Alert
        message="站点请求访问您的账户"
        description={
          <div>
            <p>授权允许该站点查看您的账户地址，既可用于识别也可用于执行交易。</p>
            <p className="text-gray-500">请务必核实该站点的URL，不要连接不信任的站点。</p>
          </div>
        }
        type="info"
        showIcon
        className="mb-4"
      />
      
      <div className="flex justify-between mt-8">
        <Button size="large" onClick={onReject} icon={<CloseCircleOutlined />} danger>
          拒绝
        </Button>
        <Button size="large" type="primary" onClick={onApprove} icon={<CheckCircleOutlined />}>
          连接
        </Button>
      </div>
    </div>
  );
};

// 交易请求组件
const TransactionRequest = ({ request, onApprove, onReject }) => {
  const tx = formatTransactionData(request.transaction);
  
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <Badge.Ribbon text={request.origin} color="green">
          <div className="bg-green-50 p-6 rounded-lg">
            <SendOutlined className="text-5xl text-green-500 mb-2" />
            <Title level={4} className="mt-2">交易请求</Title>
          </div>
        </Badge.Ribbon>
      </div>
      
      <div className="mb-4">
        <div className="mb-2">
          <Text type="secondary">从:</Text>
          <div className="font-mono">{shortenAddress(tx.from)}</div>
        </div>
        <div className="mb-2">
          <Text type="secondary">至:</Text>
          <div className="font-mono">{shortenAddress(tx.to)}</div>
        </div>
        <div className="mb-2">
          <Text type="secondary">金额:</Text>
          <div>{tx.formattedValue || '0'} ETH</div>
        </div>
      </div>
      
      <Alert
        message="交易安全提示"
        description="请在确认交易前，仔细检查交易信息，特别是接收地址和金额。交易一旦提交将无法撤销。"
        type="warning"
        showIcon
        className="mb-4"
      />
      
      <div className="flex justify-between mt-8">
        <Button size="large" onClick={onReject} icon={<CloseCircleOutlined />} danger>
          拒绝
        </Button>
        <Button size="large" type="primary" onClick={onApprove} icon={<CheckCircleOutlined />}>
          确认
        </Button>
      </div>
    </div>
  );
};

// 签名请求组件
const SignRequest = ({ request, onApprove, onReject }) => {
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <Badge.Ribbon text={request.origin} color="purple">
          <div className="bg-purple-50 p-6 rounded-lg">
            <LockOutlined className="text-5xl text-purple-500 mb-2" />
            <Title level={4} className="mt-2">签名请求</Title>
          </div>
        </Badge.Ribbon>
      </div>
      
      <Alert
        message="站点请求消息签名"
        description="签名并不会直接花费您的资产，但对不明来源的签名请求应当保持谨慎。恶意签名可能会授权不安全的操作。"
        type="info"
        showIcon
        className="mb-4"
      />
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <Text type="secondary">签名数据:</Text>
        <div className="bg-white p-2 mt-2 rounded border border-gray-200 font-mono text-xs break-all max-h-56 overflow-y-auto">
          {request.data}
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button size="large" onClick={onReject} icon={<CloseCircleOutlined />} danger>
          拒绝
        </Button>
        <Button size="large" type="primary" onClick={onApprove} icon={<CheckCircleOutlined />}>
          签名
        </Button>
      </div>
    </div>
  );
};

// 添加网络请求组件
const AddNetworkRequest = ({ request, onApprove, onReject }) => {
  const networkInfo = request.networkInfo;
  
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <Badge.Ribbon text={request.origin} color="orange">
          <div className="bg-orange-50 p-6 rounded-lg">
            <SwapOutlined className="text-5xl text-orange-500 mb-2" />
            <Title level={4} className="mt-2">添加网络</Title>
          </div>
        </Badge.Ribbon>
      </div>
      
      <Alert
        message="站点请求添加新网络"
        description="添加新网络意味着您信任该网络的数据源与安全性。请确认网络信息准确无误。"
        type="info"
        showIcon
        className="mb-4"
      />
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="mb-2">
          <Text type="secondary">网络名称:</Text>
          <div>{networkInfo.chainName}</div>
        </div>
        <div className="mb-2">
          <Text type="secondary">链ID:</Text>
          <div>{networkInfo.chainId}</div>
        </div>
        <div className="mb-2">
          <Text type="secondary">RPC URL:</Text>
          <div className="break-all">{networkInfo.rpcUrls[0]}</div>
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button size="large" onClick={onReject} icon={<CloseCircleOutlined />} danger>
          拒绝
        </Button>
        <Button size="large" type="primary" onClick={onApprove} icon={<CheckCircleOutlined />}>
          添加网络
        </Button>
      </div>
    </div>
  );
};

// 切换网络请求组件
const SwitchNetworkRequest = ({ request, onApprove, onReject }) => {
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <Badge.Ribbon text={request.origin} color="cyan">
          <div className="bg-cyan-50 p-6 rounded-lg">
            <SwapOutlined className="text-5xl text-cyan-500 mb-2" />
            <Title level={4} className="mt-2">切换网络</Title>
          </div>
        </Badge.Ribbon>
      </div>
      
      <Alert
        message="站点请求切换网络"
        description={`站点请求将您的网络切换到 ${request.message.split('请求切换到')[1] || '其他网络'}`}
        type="info"
        showIcon
        className="mb-4"
      />
      
      <div className="flex justify-between mt-8">
        <Button size="large" onClick={onReject} icon={<CloseCircleOutlined />} danger>
          拒绝
        </Button>
        <Button size="large" type="primary" onClick={onApprove} icon={<CheckCircleOutlined />}>
          切换网络
        </Button>
      </div>
    </div>
  );
};

// 添加代币请求组件
const WatchAssetRequest = ({ request, onApprove, onReject }) => {
  const token = request.token;
  
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <Badge.Ribbon text={request.origin} color="gold">
          <div className="bg-yellow-50 p-6 rounded-lg">
            <DollarOutlined className="text-5xl text-yellow-500 mb-2" />
            <Title level={4} className="mt-2">添加代币</Title>
          </div>
        </Badge.Ribbon>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="mb-2">
          <Text type="secondary">代币符号:</Text>
          <div>{token.symbol}</div>
        </div>
        <div className="mb-2">
          <Text type="secondary">代币地址:</Text>
          <div className="font-mono">{shortenAddress(token.address)}</div>
        </div>
        <div className="mb-2">
          <Text type="secondary">小数位数:</Text>
          <div>{token.decimals}</div>
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button size="large" onClick={onReject} icon={<CloseCircleOutlined />} danger>
          拒绝
        </Button>
        <Button size="large" type="primary" onClick={onApprove} icon={<CheckCircleOutlined />}>
          添加代币
        </Button>
      </div>
    </div>
  );
};

// 主组件
const DappRequestModal = ({ request, onApprove, onReject, open }) => {
  if (!request) {
    return null;
  }
  
  let content;
  let title;
  
  switch (request.type) {
    case 'connect':
      title = '连接请求';
      content = <ConnectRequest request={request} onApprove={onApprove} onReject={onReject} />;
      break;
    case 'transaction':
      title = '交易请求';
      content = <TransactionRequest request={request} onApprove={onApprove} onReject={onReject} />;
      break;
    case 'sign':
      title = '签名请求';
      content = <SignRequest request={request} onApprove={onApprove} onReject={onReject} />;
      break;
    case 'addNetwork':
      title = '添加网络';
      content = <AddNetworkRequest request={request} onApprove={onApprove} onReject={onReject} />;
      break;
    case 'switchNetwork':
      title = '切换网络';
      content = <SwitchNetworkRequest request={request} onApprove={onApprove} onReject={onReject} />;
      break;
    case 'watchAsset':
      title = '添加代币';
      content = <WatchAssetRequest request={request} onApprove={onApprove} onReject={onReject} />;
      break;
    default:
      title = '未知请求';
      content = (
        <div className="p-4 text-center">
          <ExclamationCircleOutlined className="text-5xl text-yellow-500 mb-4" />
          <Title level={4}>未知类型的请求</Title>
          <Text type="secondary">请求类型: {request.type}</Text>
          <div className="flex justify-between mt-8">
            <Button size="large" onClick={onReject} danger>拒绝</Button>
          </div>
        </div>
      );
  }
  
  return (
    <Modal
      title={<div className="flex items-center"><Badge status="processing" /><span className="ml-2">{title}</span></div>}
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      width={450}
      centered
      className="dapp-request-modal"
    >
      {content}
    </Modal>
  );
};

export default DappRequestModal; 
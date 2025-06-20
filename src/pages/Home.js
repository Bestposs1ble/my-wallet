import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Carousel } from 'antd';
import { 
  WalletOutlined, 
  SafetyOutlined, 
  ThunderboltOutlined, 
  BranchesOutlined,
  LockOutlined,
  CheckCircleOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useWallet } from '../context/WalletContext';

// 我们不再需要导入CSS文件，因为我们使用Tailwind
// import '../styles/Home.css';

const { Paragraph } = Typography;

// 欢迎页轮播内容
const welcomeSlides = [
  {
    title: "安全访问Web3",
    description: "BestPossible 深受数百万人信任，是一款可以让所有人进入web3世界的安全钱包。",
    icon: <SafetyOutlined style={{ fontSize: '48px' }} />
  },
  {
    title: "掌控您的数字资产",
    description: "只有您能访问您的资产。我们永远不会收集您的私钥和助记词。",
    icon: <LockOutlined style={{ fontSize: '48px' }} />
  },
  {
    title: "一站式区块链工具",
    description: "发送、接收、交易加密货币，并连接到去中心化应用。",
    icon: <ThunderboltOutlined style={{ fontSize: '48px' }} />
  }
];

const Home = () => {
  const navigate = useNavigate();
  const { hasWallets } = useWallet();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center space-x-2 mb-4">
          <div className="bg-primary-600 text-white p-3 rounded-lg">
            <WalletOutlined className="text-2xl" />
          </div>
          <span className="font-display font-bold text-3xl text-dark-800">BestPossible</span>
        </div>
        <h1 className="font-display text-xl text-gray-600">欢迎使用</h1>
      </div>
      
      {/* 轮播介绍 */}
      <div className="w-full max-w-md mb-10">
        <Carousel autoplay dotPosition="bottom">
          {welcomeSlides.map((slide, index) => (
            <div key={index} className="px-6 py-8 text-center">
              <div className="flex justify-center mb-6 text-primary-600">
                {slide.icon}
              </div>
              <h2 className="text-2xl font-display font-bold mb-4">{slide.title}</h2>
              <p className="text-gray-600">{slide.description}</p>
            </div>
          ))}
        </Carousel>
      </div>
      
      {/* 主要操作按钮 */}
      <div className="w-full max-w-md space-y-4 mb-8">
        <button 
          onClick={() => navigate('/create')} 
          className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-md flex items-center justify-center"
        >
          创建新钱包
        </button>
        
        <button 
          onClick={() => navigate('/import')} 
          className="w-full py-3 px-4 border border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center"
        >
          <BookOutlined className="mr-1" />
          通过助记词恢复钱包
        </button>
      </div>
      
      {hasWallets && (
        <button 
          onClick={() => navigate('/login')} 
          className="text-primary-600 hover:underline flex items-center"
        >
          <LockOutlined className="mr-1" /> 已有钱包，去解锁
        </button>
      )}
      
      {/* 用户协议 */}
      <div className="mt-12 text-center max-w-md">
        <div className="flex items-start mb-4">
          <CheckCircleOutlined className="text-green-500 mt-1 flex-shrink-0" />
          <p className="text-sm text-gray-600 ml-2 text-left">
            通过创建或导入钱包，即表示您同意我们的
            <a href="#" className="text-primary-600 hover:underline">使用条款</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home; 
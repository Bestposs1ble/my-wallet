import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 你同样可以将错误日志上报给服务器
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的 UI 并渲染
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              应用出现错误
            </h2>
            <div className="text-sm text-gray-600 mb-4">
              <p className="font-semibold">错误信息:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {this.state.error && this.state.error.toString()}
              </pre>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              <p className="font-semibold">错误堆栈:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
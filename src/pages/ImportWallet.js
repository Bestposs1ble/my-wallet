import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Paper,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { useWallet } from '../context/WalletContext';

// 定义Tab面板组件
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`import-tabpanel-${index}`}
      aria-labelledby={`import-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ImportWallet = () => {
  const navigate = useNavigate();
  const { importWalletByPrivateKey, importWalletByMnemonic, error } = useWallet();
  
  const [tabValue, setTabValue] = useState(0);
  const [walletName, setWalletName] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [imported, setImported] = useState(false);
  const [importedWallet, setImportedWallet] = useState(null);

  // Tab变化处理
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setValidationError('');
  };

  // 验证输入
  const validateInputs = () => {
    if (!walletName) {
      setValidationError('请输入钱包名称');
      return false;
    }
    
    if (password.length < 8) {
      setValidationError('密码长度至少为8位');
      return false;
    }
    
    if (password !== confirmPassword) {
      setValidationError('两次输入的密码不一致');
      return false;
    }

    if (tabValue === 0 && !privateKey) {
      setValidationError('请输入私钥');
      return false;
    }

    if (tabValue === 1 && !mnemonic) {
      setValidationError('请输入助记词');
      return false;
    }

    return true;
  };

  // 处理导入
  const handleImport = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      let result;
      
      if (tabValue === 0) {
        // 导入私钥
        result = await importWalletByPrivateKey(privateKey, walletName);
      } else {
        // 导入助记词
        result = await importWalletByMnemonic(mnemonic, walletName);
      }

      if (result) {
        setImportedWallet(result);
        setImported(true);
      } else {
        setValidationError('导入钱包失败');
      }
    } catch (error) {
      setValidationError(error.message);
    }
  };

  // 进入仪表盘
  const handleFinish = () => {
    navigate('/dashboard');
  };

  // 返回主页
  const handleBack = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          导入钱包
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3 }}>
          {!imported ? (
            <>
              {validationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {validationError}
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="fullWidth" 
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="私钥" id="import-tab-0" aria-controls="import-tabpanel-0" />
                <Tab label="助记词" id="import-tab-1" aria-controls="import-tabpanel-1" />
              </Tabs>
              
              {/* 基本信息，所有Tab共享 */}
              <Box sx={{ mt: 3, mb: 2 }}>
                <TextField
                  label="钱包名称"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                />
                <TextField
                  label="密码"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="密码至少需要8位"
                />
                <TextField
                  label="确认密码"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Box>
              
              {/* 私钥面板 */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="body2" paragraph>
                  请输入您的以太坊私钥以导入钱包。
                </Typography>
                <TextField
                  label="私钥"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  helperText="通常以0x开头的64个字符"
                />
              </TabPanel>
              
              {/* 助记词面板 */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="body2" paragraph>
                  请输入您的助记词以导入钱包（通常为12个单词，用空格分隔）。
                </Typography>
                <TextField
                  label="助记词"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={4}
                  margin="normal"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  helperText="示例: apple banana cherry ..."
                />
              </TabPanel>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                >
                  返回
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleImport}
                >
                  导入
                </Button>
              </Box>
            </>
          ) : (
            // 导入成功页面
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                钱包导入成功！
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                钱包信息
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="body1" gutterBottom>
                    <strong>名称:</strong> {importedWallet.name}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>地址:</strong> {importedWallet.address.slice(0, 8)}...{importedWallet.address.slice(-6)}
                  </Typography>
                </CardContent>
              </Card>
              
              <Typography variant="body2" paragraph color="text.secondary">
                您可以在仪表盘中查看和管理您的钱包了。
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleFinish}
              >
                进入钱包
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ImportWallet; 
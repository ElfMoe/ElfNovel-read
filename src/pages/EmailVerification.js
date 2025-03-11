import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/global.css';

function EmailVerification() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('pendingVerificationEmail');

  const cardStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    transition: 'all 0.3s ease'
  };

  const handleGmailRedirect = () => {
    window.open('https://mail.google.com', '_blank');
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div style={cardStyle} className="p-4 text-center">
            <h2 className="mb-4" style={{ color: theme.text }}>验证您的邮箱</h2>
            
            <div className="alert alert-info" role="alert">
              我们已经向您的邮箱 {userEmail} 发送了验证链接。
              请查收邮件并点击验证链接完成注册。
            </div>

            <p className="mb-4" style={{ color: theme.text }}>
              验证完成后，您将自动登录并跳转到首页。
            </p>

            <div className="d-grid gap-3">
              <button 
                onClick={handleGmailRedirect}
                className="btn button-hover"
                style={{
                  backgroundColor: theme.accent,
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem'
                }}
              >
                打开 Gmail
              </button>

              <button 
                onClick={handleLoginRedirect}
                className="btn"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.accent,
                  border: `1px solid ${theme.accent}`,
                  padding: '0.75rem'
                }}
              >
                返回登录页面
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification; 
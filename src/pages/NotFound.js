import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

function NotFound() {
  const { theme } = useTheme();
  
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '2rem',
    textAlign: 'center',
    color: theme.text
  };
  
  const cardStyle = {
    backgroundColor: theme.cardBg,
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    maxWidth: '600px',
    width: '100%',
    border: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease'
  };

  return (
    <div className="container">
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
          <h2 style={{ marginBottom: '2rem' }}>页面未找到</h2>
          <p style={{ marginBottom: '2rem', color: theme.textSecondary }}>
            抱歉，您访问的页面不存在或已被移除。
          </p>
          <Link 
            to="/" 
            className="btn"
            style={{ 
              backgroundColor: theme.accent,
              color: '#fff',
              padding: '0.75rem 1.5rem',
              textDecoration: 'none',
              borderRadius: '0.375rem',
              fontWeight: 'bold'
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound; 
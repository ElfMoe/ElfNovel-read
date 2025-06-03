import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/global.css';

function Footer() {
  const { theme } = useTheme();

  return (
    <footer 
      style={{
        backgroundColor: theme.primary,
        borderTop: `1px solid ${theme.border}`,
        padding: '1.5rem 0',
        marginTop: 0
      }}
    >
      <div className="container">
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <div className="d-flex align-items-center gap-4">
            <Link 
              to="/"
              className="link-hover"
              style={{ 
                color: theme.textSecondary,
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              Home
            </Link>
            <Link 
              to="/about"
              className="link-hover"
              style={{ 
                color: theme.textSecondary,
                textDecoration: 'none',
                fontSize: '0.9rem'
              }}
            >
              about
            </Link>
            <a 
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="link-hover"
              style={{ 
                color: theme.textSecondary,
                textDecoration: 'none',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <i className="bi bi-github"></i>
              GitHub
            </a>
          </div>
          <p 
            style={{ 
              color: theme.textSecondary,
              margin: 0,
              fontSize: '0.9rem'
            }}
          >
            © 2024  Elf Novel Reading
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

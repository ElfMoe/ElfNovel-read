import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/global.css';

function Navbar() {
  const { user, logout } = useUser();
  const { theme, isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // 添加箭头动画效果
  React.useEffect(() => {
    // 处理下拉菜单打开时的箭头旋转
    const handleDropdownShown = (e) => {
      const arrow = e.target.querySelector('.bi-chevron-down');
      if (arrow) {
        arrow.style.transform = 'rotate(180deg)';
      }
    };

    // 处理下拉菜单关闭时的箭头恢复
    const handleDropdownHidden = (e) => {
      const arrow = e.target.querySelector('.bi-chevron-down');
      if (arrow) {
        arrow.style.transform = 'rotate(0)';
      }
    };

    // 为所有下拉菜单按钮添加事件监听
    const dropdownButtons = document.querySelectorAll('[data-bs-toggle="dropdown"]');
    
    dropdownButtons.forEach(button => {
      button.addEventListener('shown.bs.dropdown', handleDropdownShown);
      button.addEventListener('hidden.bs.dropdown', handleDropdownHidden);
    });

    // 清理函数
    return () => {
      dropdownButtons.forEach(button => {
        button.removeEventListener('shown.bs.dropdown', handleDropdownShown);
        button.removeEventListener('hidden.bs.dropdown', handleDropdownHidden);
      });
    };
  }, []);

  const navStyle = {
    backgroundColor: theme.primary,
    borderBottom: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease',
    position: 'relative',
    zIndex: 10000 // 添加高层级，确保导航栏显示在其他页面元素之上
  };

  const buttonStyle = {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.border}`,
    color: theme.text,
    transition: 'all 0.2s ease',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  };

  const dropdownStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };
  
  const mobileMenuStyle = {
    position: 'fixed',
    top: '72px', // 导航栏高度
    left: menuOpen ? '0' : '-100%',
    width: '100%',
    height: 'calc(100vh - 72px)',
    backgroundColor: theme.primary,
    zIndex: 10000, // 增加z-index，确保它高于其他页面元素
    transition: 'left 0.3s ease',
    borderTop: `1px solid ${theme.border}`,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '1rem',
    overflowY: 'auto'
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav style={navStyle} className="py-3">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <Link to="/" style={{ color: theme.text, textDecoration: 'none' }}>
              <h1 className="h4 mb-0 link-hover">Elf Novel Read</h1>
            </Link>
            
            {/* 桌面导航 - 在大屏幕上显示 */}
            <div className="d-none d-md-flex align-items-center">
              <Link to="/" className="link-hover" style={{ color: theme.textSecondary, textDecoration: 'none', marginRight: '30px' }}>
                Home
              </Link>
              <Link to="/novels" className="link-hover" style={{ color: theme.textSecondary, textDecoration: 'none', marginRight: '30px' }}>
                Novel Library
              </Link>
              <Link to="/search" className="link-hover" style={{ color: theme.textSecondary, textDecoration: 'none', marginRight: '30px' }}>
                Search
              </Link>
              {user && (
                <>
                  <div className="dropdown" style={{ marginLeft: '-8px' }}>
                    <button 
                      style={{
                        ...buttonStyle,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: theme.textSecondary,
                        padding: '0.5rem 0.6rem'
                      }}
                      className="link-hover"
                      type="button" 
                      id="readerDropdown" 
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Reader Center
                      <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.75rem', transition: 'transform 0.2s' }}></i>
                    </button>
                    <ul className="dropdown-menu" style={dropdownStyle}>
                      <li>
                        <Link 
                          className="dropdown-item link-hover" 
                          to="/reader/favorites"
                          style={{ color: theme.text }}
                        >
                          <i className="bi bi-bookmark-heart me-2"></i>
                          My Bookshelf
                        </Link>
                      </li>
                      <li>
                        <Link 
                          className="dropdown-item link-hover" 
                          to="/reader/history"
                          style={{ color: theme.text }}
                        >
                          <i className="bi bi-clock-history me-2"></i>
                          Reading History
                        </Link>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="dropdown" style={{ marginLeft: '0px' }}>
                    <button 
                      style={{
                        ...buttonStyle,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: theme.textSecondary,
                        padding: '0.5rem 0.6rem'
                      }}
                      className="link-hover"
                      type="button" 
                      id="authorDropdown" 
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Author Center
                      <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.75rem', transition: 'transform 0.2s' }}></i>
                    </button>
                    <ul className="dropdown-menu" style={dropdownStyle}>
                      <li>
                        <Link 
                          className="dropdown-item link-hover" 
                          to="/author/dashboard"
                          style={{ color: theme.text }}
                        >
                          <i className="bi bi-speedometer2 me-2"></i>
                          Author Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link 
                          className="dropdown-item link-hover" 
                          to="/author/novels"
                          style={{ color: theme.text }}
                        >
                          <i className="bi bi-journal-text me-2"></i>
                          My Works
                        </Link>
                      </li>
                      <li>
                        <Link 
                          className="dropdown-item link-hover" 
                          to="/author/novels/create"
                          style={{ color: theme.text }}
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          Create a new novel
                        </Link>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* 桌面端用户控件 */}
            <div className="d-none d-md-flex align-items-center gap-3">
              {user ? (
                <div className="dropdown">
                  <button 
                    style={buttonStyle}
                    className="button-hover"
                    type="button" 
                    id="userDropdown" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-person-circle me-1"></i>
                    {user.username}
                    <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.75rem', transition: 'transform 0.2s' }}></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end" style={dropdownStyle}>
                    <li>
                      <Link 
                        className="dropdown-item link-hover" 
                        to="/profile"
                        style={{ color: theme.text }}
                      >
                        <i className="bi bi-person me-2"></i>
                        Personal Center
                      </Link>
                    </li>
                    <li>
                      <Link 
                        className="dropdown-item link-hover" 
                        to="/user-home"
                        style={{ color: theme.text }}
                      >
                        <i className="bi bi-person-vcard me-2"></i>
                        Personal Homepage
                      </Link>
                    </li>
                    <li>
                      <Link 
                        className="dropdown-item link-hover" 
                        to="/reader/favorites"
                        style={{ color: theme.text }}
                      >
                        <i className="bi bi-bookmark-heart me-2"></i>
                        My Collection
                      </Link>
                    </li>
                    <li>
                      <Link 
                        className="dropdown-item link-hover" 
                        to="/reader/history"
                        style={{ color: theme.text }}
                      >
                        <i className="bi bi-clock-history me-2"></i>
                        Reading History
                      </Link>
                    </li>
                    <li><hr style={{ borderColor: theme.border }} /></li>
                    <li>
                      <button 
                        className="dropdown-item button-hover"
                        onClick={logout}
                        style={{ color: theme.accent }}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Log out
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="d-flex gap-2">
                  <Link 
                    to="/login"
                    style={{
                      ...buttonStyle,
                      border: `1px solid ${theme.accent}`,
                      color: theme.accent,
                      textDecoration: 'none'
                    }}
                    className="button-hover"
                  >
                    Log in
                  </Link>
                  <Link 
                    to="/register" 
                    style={{
                      ...buttonStyle,
                      border: `1px solid ${theme.accent}`,
                      backgroundColor: theme.accent,
                      color: '#ffffff',
                      textDecoration: 'none'
                    }}
                    className="button-hover"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              <button
                onClick={toggleTheme}
                style={{
                  ...buttonStyle,
                  fontSize: '1.2rem',
                  padding: '0.4rem 0.6rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
                className="btn-theme button-hover"
              >
                {isDark ? (
                  <i className="bi bi-sun"></i>
                ) : (
                  <i className="bi bi-moon-stars"></i>
                )}
              </button>
            </div>
            
            {/* 汉堡菜单按钮 - 只在小屏幕上显示，位于最右侧 */}
            <button 
              className="d-md-none"
              onClick={toggleMenu}
              style={{
                ...buttonStyle,
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.text,
                padding: '0.5rem',
                fontSize: '1.5rem'
              }}
            >
              <i className={`bi ${menuOpen ? 'bi-x' : 'bi-list'}`}></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* 移动端菜单 */}
      <div style={mobileMenuStyle} className="d-md-none">
        <div className="container">
          <Link to="/" className="d-block py-2 px-3" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
            <i className="bi bi-house-door me-2"></i>Home
          </Link>
          <Link to="/novels" className="d-block py-2 px-3" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
            <i className="bi bi-book me-2"></i>Novel Library
          </Link>
          <Link to="/search" className="d-block py-2 px-3" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
            <i className="bi bi-search me-2"></i>search
          </Link>
          
          {user && (
            <>
              <div className="mt-2 mb-2 px-3">
                <p className="mb-1" style={{ color: theme.textSecondary, fontWeight: 'bold' }}>读者中心</p>
                <Link to="/reader/favorites" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-bookmark-heart me-2"></i>My Bookshelf
                </Link>
                <Link to="/reader/history" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-clock-history me-2"></i>Reading History
                </Link>
              </div>
              
              <div className="mb-2 px-3">
                <p className="mb-1" style={{ color: theme.textSecondary, fontWeight: 'bold' }}>作者中心</p>
                <Link to="/author/dashboard" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-speedometer2 me-2"></i>Author Dashboard
                </Link>
                <Link to="/author/novels" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-journal-text me-2"></i>My Works
                </Link>
                <Link to="/author/novels/create" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-plus-circle me-2"></i>Create a new novel
                </Link>
              </div>
              
              <div className="mb-2 px-3">
              <p className="mb-1" style={{ color: theme.textSecondary, fontWeight: 'bold' }}>个人</p>
                <Link to="/profile" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-person me-2"></i>Personal Center
                </Link>
                <Link to="/user-home" className="d-block py-2 ps-4" style={{ color: theme.text, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <i className="bi bi-person-vcard me-2"></i>Personal Homepage
                </Link>
                <button 
                  className="d-block w-100 text-start py-2 ps-4 border-0 bg-transparent"
                  onClick={() => {logout(); setMenuOpen(false);}}
                  style={{ color: theme.accent }}
                >
                  <i className="bi bi-box-arrow-right me-2"></i>Log out
                </button>
              </div>
            </>
          )}
          
          {!user && (
            <div className="mt-3 d-flex gap-2 px-3">
              <Link 
                to="/login"
                style={{
                  ...buttonStyle,
                  border: `1px solid ${theme.accent}`,
                  color: theme.accent,
                  textDecoration: 'none'
                }}
                className="flex-grow-1 text-center"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link 
                to="/register" 
                style={{
                  ...buttonStyle,
                  border: `1px solid ${theme.accent}`,
                  backgroundColor: theme.accent,
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
                className="flex-grow-1 text-center"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
          
          <div className="mt-3 px-3">
            <button
              onClick={() => {toggleTheme(); setMenuOpen(false);}}
              style={{
                ...buttonStyle,
                width: '100%',
                justifyContent: 'center'
              }}
              className="btn-theme button-hover"
            >
              {isDark ? (
                <><i className="bi bi-sun me-2"></i> Switch to light mode</>
              ) : (
                <><i className="bi bi-moon-stars me-2"></i> Switch to dark mode</>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 

import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    primary: '#1a1a1a',
    secondary: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    accent: '#4f9eff',
    accentRgb: '79, 158, 255',
    border: '#404040',
    background: '#121212',
    cardBg: '#1e1e1e',
    hover: '#333333',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
    modalText: '#e0e0e0',
    inputBg: '#2a2a2a',
    inputText: '#ffffff'
  },
  light: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    accent: '#1a73e8',
    accentRgb: '26, 115, 232',
    border: '#e5e5e5',
    background: '#f8f9fa',
    cardBg: '#ffffff',
    hover: '#f0f0f0',
    danger: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
    modalText: '#333333',
    inputBg: '#ffffff',
    inputText: '#333333'
  }
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // 默认使用暗色主题
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const theme = isDark ? themes.dark : themes.light;
    
    // 设置CSS变量
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    document.documentElement.style.setProperty('--accent-color-rgb', theme.accentRgb);
    document.documentElement.style.setProperty('--text-color', theme.text);
    document.documentElement.style.setProperty('--background-color', theme.background);
    document.documentElement.style.setProperty('--card-bg', theme.cardBg);
    document.documentElement.style.setProperty('--border-color', theme.border);
    
    // 更新body样式
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
  }, [isDark]);

  const theme = isDark ? themes.dark : themes.light;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 
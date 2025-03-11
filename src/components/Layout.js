import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';
import Footer from './Footer';

function Layout({ children }) {
  const { theme } = useTheme();

  return (
    <div 
      style={{ 
        backgroundColor: theme.background,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Navbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;

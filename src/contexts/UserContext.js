import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 加载用户信息
    const loadUser = () => {
      const savedUser = authAPI.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      console.log('UserContext login response:', response);
      
      if (response.success) {
        setUser(response.user);
      }
      
      // 直接返回API响应，不做额外处理
      return response;
      
    } catch (error) {
      console.error('UserContext login error:', error);
      return { 
        success: false, 
        type: 'error',
        message: '登录请求失败，请检查网络连接'
      };
    }
  };

  const register = async (userData) => {
    try {
      console.log('UserContext - 发送注册请求:', userData);
      
      // 确保所有必需字段都存在
      if (!userData.username || !userData.email || !userData.password) {
        console.error('UserContext - 注册数据不完整:', userData);
        return { 
          success: false, 
          message: '注册数据不完整',
          field: !userData.username ? 'username' : (!userData.email ? 'email' : 'password')
        };
      }
      
      const response = await authAPI.register(userData);
      console.log('UserContext - 注册响应:', response);
      
      // 注册成功后不设置用户状态，等待邮箱验证
      return response;
    } catch (error) {
      console.error('UserContext - 注册错误:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || '注册失败，请稍后重试',
        field: error.response?.data?.field
      };
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  // 添加updateUser函数
  const updateUser = (userData) => {
    setUser(prevUser => {
      // 更新用户数据
      const updatedUser = { ...prevUser, ...userData };
      
      // 更新localStorage中的用户数据
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    });
  };

  // 添加验证邮箱状态的方法
  const verifyEmailStatus = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      if (response.success) {
        setUser(response.user);
      }
      return response;
    } catch (error) {
      console.error('验证邮箱状态出错:', error);
      return {
        success: false,
        message: '验证邮箱失败，请稍后重试'
      };
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser,
      updateUser,
      login, 
      logout,
      register,
      verifyEmailStatus,
      isAuthenticated: !!user
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 
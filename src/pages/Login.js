import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import '../styles/global.css';

function Login() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { login } = useUser();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    identifier: '',
    password: '',
    submit: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 验证规则
  const validateIdentifier = (identifier) => {
    if (!identifier) return '请输入用户名或邮箱';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return '请输入密码';
    if (password.length < 6) return '密码长度不正确';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 实时验证
    let error = '';
    switch (name) {
      case 'identifier':
        error = validateIdentifier(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      default:
        break;
    }

    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 提交前再次验证所有字段
    const newErrors = {
      identifier: validateIdentifier(formData.identifier),
      password: validatePassword(formData.password)
    };

    setErrors(prev => ({
      ...prev,
      ...newErrors
    }));

    // 如果有任何错误，不提交表单
    if (Object.values(newErrors).some(error => error !== '')) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(formData);
      if (result.success) {
        navigate('/');
      } else {
        // 显示错误信息，根据错误类型提供不同的错误消息
        let errorMessage = '';
        
        // 显示不同类型的错误消息
        switch (result.type) {
          case 'not_found':
            errorMessage = '账号不存在，请先注册';
            break;
          case 'invalid_credentials':
            errorMessage = '用户名/邮箱或密码错误';
            break;
          case 'unverified':
            errorMessage = '您的邮箱尚未验证，请先验证邮箱后再登录';
            break;
          case 'auth_error':
            errorMessage = '认证失败，请重新登录';
            break;
          case 'network_error':
            errorMessage = '网络连接错误，请检查您的网络';
            break;
          default:
            // 使用后端返回的消息或默认消息
            errorMessage = result.message || '登录失败，请检查您的输入信息';
        }
        
        
        setErrors(prev => ({
          ...prev,
          submit: errorMessage
        }));
      }
    } catch (err) {
      console.error('Login unexpected error:', err); // 添加日志
      setErrors(prev => ({
        ...prev,
        submit: '登录过程中发生错误，请检查您的网络连接'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    transition: 'all 0.3s ease'
  };

  const inputStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    color: theme.text
  };

  const errorStyle = {
    color: theme.error,
    fontSize: '0.875rem',
    marginTop: '0.25rem'
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div style={cardStyle} className="p-4">
            <h2 className="text-center mb-4" style={{ color: theme.text }}>用户登录</h2>
            
            {errors.submit && (
              <div className="alert" role="alert" style={{
                backgroundColor: theme.error,
                color: '#ffffff',
                border: 'none'
              }}>
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label" style={{ color: theme.text }}>
                  用户名/邮箱
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.identifier ? 'is-invalid' : ''}`}
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
                {errors.identifier && <div style={errorStyle}>{errors.identifier}</div>}
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: theme.text }}>密码</label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                {errors.password && <div style={errorStyle}>{errors.password}</div>}
              </div>

              <button 
                type="submit" 
                className="btn w-100 button-hover"
                style={{
                  backgroundColor: theme.accent,
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem'
                }}
                disabled={isLoading}
              >
                {isLoading ? '登录中...' : '登录'}
              </button>

              <div className="text-center mt-3">
                <Link 
                  to="/register" 
                  className="link-hover"
                  style={{ 
                    color: theme.accent,
                    textDecoration: 'none' 
                  }}
                >
                  还没有账号？立即注册
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 
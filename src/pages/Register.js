import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import '../styles/global.css';

function Register() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { register } = useUser();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 密码规则
  const passwordRules = [
    { rule: '长度在6-20个字符之间', regex: /.{6,20}/ },
    { rule: '至少包含一个大写字母', regex: /[A-Z]/ },
    { rule: '至少包含一个小写字母', regex: /[a-z]/ },
    { rule: '至少包含一个数字', regex: /[0-9]/ },
    { rule: '至少包含一个特殊字符 (!@#$%^&*)', regex: /[!@#$%^&*]/ }
  ];

  // 验证规则
  const validateUsername = (username) => {
    if (!username) return '请输入用户名';
    if (username.length < 2) return '用户名至少需要2个字符';
    if (username.length > 20) return '用户名不能超过20个字符';
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) return '用户名只能包含字母、数字、下划线和中文';
    if (/^\d+$/.test(username)) return '用户名不能只包含数字';
    return '';
  };

  const validateEmail = (email) => {
    if (!email) return '请输入邮箱地址';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) return '请输入有效的Gmail邮箱地址';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return '请输入密码';
    const failedRules = passwordRules.filter(rule => !rule.regex.test(password));
    if (failedRules.length > 0) {
      return failedRules[0].rule;
    }
    return '';
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return '请确认密码';
    if (password !== confirmPassword) return '两次输入的密码不一致';
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
      case 'username':
        error = validateUsername(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        if (formData.confirmPassword) {
          const confirmError = validateConfirmPassword(value, formData.confirmPassword);
          setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.password, value);
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
    setErrors(prev => ({ ...prev, submit: '' })); // 清除之前的错误

    // 提交前再次验证所有字段
    const newErrors = {
      username: validateUsername(formData.username),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword)
    };

    setErrors(newErrors);

    // 如果有任何错误，不提交表单
    if (Object.values(newErrors).some(error => error !== '')) {
      setIsLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      
      // 添加调试日志，检查registerData是否包含所有必需字段
      console.log('准备提交的注册数据:', JSON.stringify(registerData));
      
      // 确保所有必需字段都存在且不为空
      if (!registerData.username || !registerData.email || !registerData.password) {
        setErrors(prev => ({
          ...prev,
          submit: '注册数据不完整，请确保填写所有必填字段'
        }));
        setIsLoading(false);
        return;
      }
      
      // 显示处理中的状态
      setErrors(prev => ({ ...prev, submit: '正在处理注册请求...' }));
      
      const result = await register(registerData);
      console.log('注册结果:', result);
      
      // 注册成功逻辑
      if (result && result.success) {
        // 成功状态
        setErrors(prev => ({ ...prev, submit: `注册成功！正在跳转到邮箱验证页面...` }));
        localStorage.setItem('pendingVerificationEmail', formData.email);
        
        // 延迟跳转，给用户时间看到成功消息
        setTimeout(() => {
          navigate('/verify-email');
        }, 1500);
        return;
      } 
      
      // 处理后端返回的具体错误
      if (result.message && result.message.includes('Missing credentials')) {
        // 这是邮件服务器错误，但用户注册可能已成功
        setErrors(prev => ({
          ...prev,
          submit: '注册成功，但发送验证邮件时出现问题。请联系管理员或稍后再试。'
        }));
        // 存储邮箱以便后续验证
        localStorage.setItem('pendingVerificationEmail', formData.email);
        
        // 延迟导航到验证页面
        setTimeout(() => {
          navigate('/verify-email');
        }, 3000);
      } else if (result.message && result.message.includes('用户名或邮箱已被使用')) {
        // 尝试确定是用户名还是邮箱重复
        setErrors(prev => ({
          ...prev,
          submit: '用户名或邮箱已被使用，请尝试使用其他用户名或邮箱'
        }));
      } else if (result.field) {
        setErrors(prev => ({
          ...prev,
          [result.field]: result.message,
          submit: `${result.field}字段验证失败: ${result.message}`
        }));
      } else if (result.validationErrors) {
        // 处理多个验证错误
        const errorObj = {};
        result.validationErrors.forEach(err => {
          errorObj[err.field] = err.message;
        });
        setErrors(prev => ({
          ...prev,
          ...errorObj,
          submit: '注册信息验证失败，请检查表单'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          submit: result.message || '注册失败，请稍后重试'
        }));
      }
    } catch (err) {
      console.error('注册过程中出现错误:', err);
      setErrors(prev => ({
        ...prev,
        submit: '注册过程中发生意外错误，请刷新页面重试'
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

  const passwordRuleStyle = {
    fontSize: '0.875rem',
    color: theme.textSecondary,
    marginTop: '0.5rem',
    padding: '0.75rem',
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.25rem'
  };

  const checkPasswordRule = (rule) => {
    return rule.regex.test(formData.password);
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div style={cardStyle} className="p-4">
            <h2 className="text-center mb-4" style={{ color: theme.text }}>注册</h2>
            
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
                  用户名
                  <small className="ms-1" style={{ color: theme.textSecondary }}>
                    (2-20个字符，必须包含字母或中文，可包含数字和下划线)
                  </small>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
                {errors.username && <div style={errorStyle}>{errors.username}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label" style={{ color: theme.text }}>
                  Gmail邮箱
                  <small className="ms-1" style={{ color: theme.textSecondary }}>
                    (必须使用Gmail邮箱)
                  </small>
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
                {errors.email && <div style={errorStyle}>{errors.email}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label" style={{ color: theme.text }}>
                  密码
                  <small 
                    className="ms-1" 
                    style={{ color: theme.accent, cursor: 'pointer' }}
                    onClick={() => setShowPasswordRules(!showPasswordRules)}
                  >
                    {showPasswordRules ? '隐藏密码规则' : '查看密码规则'}
                  </small>
                </label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setShowPasswordRules(true)}
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
                {showPasswordRules && (
                  <div style={passwordRuleStyle}>
                    <div className="mb-2">密码必须满足以下条件：</div>
                    {passwordRules.map((rule, index) => (
                      <div 
                        key={index}
                        style={{ 
                          color: checkPasswordRule(rule) ? theme.success : theme.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '0.25rem'
                        }}
                      >
                        <i className={`bi ${checkPasswordRule(rule) ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>
                        {rule.rule}
                      </div>
                    ))}
                  </div>
                )}
                {errors.password && <div style={errorStyle}>{errors.password}</div>}
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: theme.text }}>确认密码</label>
                <div className="input-group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
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
                {isLoading ? '注册中...' : '注册'}
              </button>

              <div className="text-center mt-3">
                <Link 
                  to="/login" 
                  className="link-hover"
                  style={{ 
                    color: theme.accent,
                    textDecoration: 'none' 
                  }}
                >
                  已有账号？立即登录
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register; 
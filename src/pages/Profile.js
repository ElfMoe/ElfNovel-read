import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { userAPI } from '../services/api';
import { toast } from 'react-toastify';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { generateTextAvatar, getFullImageUrl } from '../utils/imageUtils';

function Profile() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated, setUser, logout } = useUser();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    penName: '',
    bio: '',
    avatar: ''
  });

  // 表单验证状态
  const [validation, setValidation] = useState({
    username: { valid: true, message: '' },
    email: { valid: true, message: '' },
    penName: { valid: true, message: '' }
  });

  // 密码修改状态
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 密码可见性状态
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // 密码规则显示状态
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  // 密码修改成功状态
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  // 密码规则
  const passwordRules = [
    { rule: '长度在6-20个字符之间', regex: /.{6,20}/ },
    { rule: '至少包含一个大写字母', regex: /[A-Z]/ },
    { rule: '至少包含一个小写字母', regex: /[a-z]/ },
    { rule: '至少包含一个数字', regex: /[0-9]/ },
    { rule: '至少包含一个特殊字符 (!@#$%^&*)', regex: /[!@#$%^&*]/ }
  ];

  // 密码修改验证
  const [passwordValidation, setPasswordValidation] = useState({
    currentPassword: { valid: true, message: '' },
    newPassword: { valid: true, message: '' },
    confirmPassword: { valid: true, message: '' }
  });

  // 模态框状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // 头像上传相关
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      // 设置表单数据
      setFormData({
        username: user.username || '',
        email: user.email || '',
        penName: user.penName || '',
        bio: user.profile?.bio || '',
        avatar: user.avatar || ''
      });

      // 设置头像预览 - 先尝试生成一个文本头像作为备用
      const textAvatar = generateTextAvatar(user.username);
      
      // 如果有头像，则尝试加载它，否则使用文本头像
      if (user.avatar) {
        setAvatarPreview(getFullImageUrl(user.avatar));
        console.log('设置用户头像: ', getFullImageUrl(user.avatar));
      } else {
        setAvatarPreview(textAvatar);
        console.log('设置文本头像，因为用户没有上传头像');
      }
    } else if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // 处理表单字段变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除对应字段的验证错误
    if (validation[name] && !validation[name].valid) {
      setValidation(prev => ({
        ...prev,
        [name]: { valid: true, message: '' }
      }));
    }
  };

  // 处理密码字段变化
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 实时验证相关字段
    if (name === 'newPassword' && passwordData.confirmPassword) {
      // 如果修改了新密码，且已经输入了确认密码，则验证两者是否一致
      if (value !== passwordData.confirmPassword) {
        setPasswordValidation(prev => ({
          ...prev,
          confirmPassword: { valid: false, message: '两次输入的密码不一致' }
        }));
      } else {
        setPasswordValidation(prev => ({
          ...prev,
          confirmPassword: { valid: true, message: '' }
        }));
      }
    } else if (name === 'confirmPassword') {
      // 如果修改了确认密码，验证与新密码是否一致
      if (value !== passwordData.newPassword) {
        setPasswordValidation(prev => ({
          ...prev,
          confirmPassword: { valid: false, message: '两次输入的密码不一致' }
        }));
      } else {
        setPasswordValidation(prev => ({
          ...prev,
          confirmPassword: { valid: true, message: '' }
        }));
      }
    }
    
    // 清除对应字段的验证错误
    if (passwordValidation[name] && !passwordValidation[name].valid) {
      setPasswordValidation(prev => ({
        ...prev,
        [name]: { valid: true, message: '' }
      }));
    }
  };

  // 验证个人资料表单
  const validateForm = () => {
    const newValidation = {
      username: { valid: true, message: '' },
      email: { valid: true, message: '' },
      penName: { valid: true, message: '' }
    };
    
    let isValid = true;
    
    // 验证用户名
    if (!formData.username.trim()) {
      newValidation.username = { valid: false, message: '请输入用户名' };
      isValid = false;
    } else if (formData.username.length < 2) {
      newValidation.username = { valid: false, message: '用户名不能少于2个字符' };
      isValid = false;
    }
    
    // 验证邮箱
    if (!formData.email.trim()) {
      newValidation.email = { valid: false, message: '请输入邮箱' };
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newValidation.email = { valid: false, message: '请输入有效的邮箱地址' };
      isValid = false;
    }
    
    // 验证笔名
    if (formData.penName && formData.penName.length < 2) {
      newValidation.penName = { valid: false, message: '笔名不能少于2个字符' };
      isValid = false;
    }
    
    setValidation(newValidation);
    return isValid;
  };

  // 验证密码表单
  const validatePasswordForm = () => {
    const newValidation = {
      currentPassword: { valid: true, message: '' },
      newPassword: { valid: true, message: '' },
      confirmPassword: { valid: true, message: '' }
    };
    
    let isValid = true;
    
    // 验证当前密码
    if (!passwordData.currentPassword) {
      newValidation.currentPassword = { valid: false, message: '请输入当前密码' };
      isValid = false;
    }
    
    // 验证新密码
    if (!passwordData.newPassword) {
      newValidation.newPassword = { valid: false, message: '请输入新密码' };
      isValid = false;
    } else {
      // 检查密码是否符合规则
      const failedRules = passwordRules.filter(rule => !rule.regex.test(passwordData.newPassword));
      if (failedRules.length > 0) {
        newValidation.newPassword = { valid: false, message: failedRules[0].rule };
        isValid = false;
      }
    }
    
    // 验证确认密码
    if (!passwordData.confirmPassword) {
      newValidation.confirmPassword = { valid: false, message: '请确认新密码' };
      isValid = false;
    } else if (passwordData.confirmPassword !== passwordData.newPassword) {
      newValidation.confirmPassword = { valid: false, message: '两次输入的密码不一致' };
      isValid = false;
    }
    
    setPasswordValidation(newValidation);
    return isValid;
  };

  // 检查密码规则
  const checkPasswordRule = (rule) => {
    return rule.regex.test(passwordData.newPassword);
  };

  // 提交个人资料表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // 构建提交数据
      const profileData = {
        username: formData.username,
        penName: formData.penName,
        profile: {
          bio: formData.bio
        }
      };
      
      // 调用API更新个人资料
      const response = await userAPI.updateUserProfile(profileData);
      
      if (!response.success) {
        setError(response.message);
        setLoading(false);
        return;
      }
      
      setSuccess(true);
      
      // 更新用户信息
      setUser(response.data);
      
      toast.success('个人资料更新成功！');
    } catch (err) {
      console.error('更新个人资料出错:', err);
      setError(err.response?.data?.message || '更新个人资料失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 处理头像上传
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.match('image.*')) {
      toast.error('请选择图片文件');
      return;
    }
    
    // 验证文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // 上传头像
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      // 调用上传API
      const response = await userAPI.uploadAvatar(formData);
      
      if (!response.success) {
        toast.error(response.message || '头像上传失败');
        setIsUploading(false);
        return;
      }
      
      // 更新表单数据和用户信息
      setFormData(prev => ({
        ...prev,
        avatar: response.data.avatar
      }));
      
      // 更新用户上下文中的头像
      setUser(prev => ({
        ...prev,
        avatar: response.data.avatar
      }));
      
      // 设置头像预览使用完整URL
      setAvatarPreview(getFullImageUrl(response.data.avatar));
      
      toast.success('头像上传成功！');
    } catch (err) {
      console.error('头像上传出错:', err);
      toast.error(err.response?.data?.message || '头像上传失败，请稍后再试');
    } finally {
      setIsUploading(false);
    }
  };

  // 切换密码可见性
  const togglePasswordVisibility = (field) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // 处理修改密码
  const handleUpdatePassword = async () => {
    // 重置成功状态
    setPasswordUpdateSuccess(false);
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setIsSubmittingPassword(true);
    
    try {
      const response = await userAPI.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (!response.success) {
        // 检查所有可能的原密码错误信息格式
        const errorMessage = response.message?.toLowerCase() || '';
        if (
          errorMessage.includes('当前密码不正确') || 
          errorMessage.includes('密码错误') || 
          errorMessage.includes('原密码') || 
          errorMessage.includes('current password') || 
          errorMessage.includes('incorrect password')
        ) {
          // 明确提示用户是原密码错误
          setPasswordValidation(prev => ({
            ...prev,
            currentPassword: { valid: false, message: '当前密码不正确' }
          }));
          toast.error('当前密码不正确，请检查后重试');
        } else {
          // 其他错误
          toast.error(response.message || '密码更新失败');
        }
        setIsSubmittingPassword(false);
        return;
      }
      
      // 设置成功状态，但不立即关闭模态框
      setPasswordUpdateSuccess(true);
      
      // 显示成功消息
      toast.success('密码更新成功！');
      
      // 3秒后关闭模态框
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordUpdateSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('密码更新出错:', err);
      
      // 尝试从错误响应中提取有用的信息
      const errorMessage = err.response?.data?.message?.toLowerCase() || '';
      if (
        errorMessage.includes('当前密码不正确') || 
        errorMessage.includes('密码错误') || 
        errorMessage.includes('原密码') || 
        errorMessage.includes('current password') || 
        errorMessage.includes('incorrect password')
      ) {
        // 明确提示用户是原密码错误
        setPasswordValidation(prev => ({
          ...prev,
          currentPassword: { valid: false, message: '当前密码不正确' }
        }));
        toast.error('当前密码不正确，请检查后重试');
      } else {
        // 其他错误
        toast.error(err.response?.data?.message || '密码更新失败，请稍后再试');
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // 处理删除账号
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('请输入"DELETE"确认删除账号');
      return;
    }
    
    setIsSubmittingDelete(true);
    
    try {
      const response = await userAPI.deleteAccount();
      
      if (!response.success) {
        toast.error(response.message || '账号删除失败');
        setIsSubmittingDelete(false);
        return;
      }
      
      toast.success('账号已成功删除，感谢您使用我们的服务！');
      setShowDeleteAccountModal(false);
      
      // 登出并重定向到首页
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('账号删除出错:', err);
      toast.error(err.response?.data?.message || '账号删除失败，请稍后再试');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // 处理头像显示错误 - 单独的函数方便调用
  const handleAvatarError = () => {
    if (formData.username) {
      // 生成文本头像并设置
      const textAvatar = generateTextAvatar(formData.username);
      setAvatarPreview(textAvatar);
    }
  };

  // 样式定义
  const cardStyle = {
    backgroundColor: theme.cardBg,
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease'
  };

  const inputStyle = {
    backgroundColor: isDark ? theme.cardBg : theme.input,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    transition: 'all 0.2s ease'
  };

  const btnPrimaryStyle = {
    backgroundColor: theme.accent,
    color: '#fff',
    border: 'none',
    minWidth: '120px'
  };

  const btnSecondaryStyle = {
    backgroundColor: isDark ? 'transparent' : theme.input,
    color: theme.text,
    border: `1px solid ${theme.border}`
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container py-5">
      <h1 style={{ color: theme.text, marginBottom: '2rem' }}>个人资料</h1>
      
      <div className="row">
        <div className="col-md-8">
          <div style={cardStyle}>
            <form onSubmit={handleSubmit}>
              {success && (
                <div className="alert alert-success mb-4">
                  个人资料更新成功！
                </div>
              )}
              
              {error && (
                <div className="alert alert-danger mb-4">
                  {error}
                </div>
              )}
              
              {/* 用户名 */}
              <div className="mb-4">
                <label 
                  htmlFor="username" 
                  className="form-label"
                  style={{ color: theme.text, fontWeight: 'bold' }}
                >
                  用户名 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="form-control"
                  style={inputStyle}
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="请输入用户名"
                />
                {!validation.username.valid && (
                  <div className="text-danger mt-1">{validation.username.message}</div>
                )}
              </div>
              
              {/* 邮箱 */}
              <div className="mb-4">
                <label 
                  htmlFor="email" 
                  className="form-label"
                  style={{ color: theme.text, fontWeight: 'bold' }}
                >
                  邮箱 <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  style={inputStyle}
                  value={formData.email}
                  onChange={handleChange}
                  disabled // 邮箱不允许修改
                  placeholder="请输入邮箱"
                />
                <small style={{ color: theme.textSecondary }}>
                  邮箱地址不可修改
                </small>
              </div>
              
              {/* 笔名 */}
              <div className="mb-4">
                <label 
                  htmlFor="penName" 
                  className="form-label"
                  style={{ color: theme.text, fontWeight: 'bold' }}
                >
                  笔名 <span style={{ color: theme.accent }}>（作为作者发布作品时显示）</span>
                </label>
                <input
                  type="text"
                  id="penName"
                  name="penName"
                  className="form-control"
                  style={inputStyle}
                  value={formData.penName}
                  onChange={handleChange}
                  placeholder="请输入笔名"
                />
                {!validation.penName.valid && (
                  <div className="text-danger mt-1">{validation.penName.message}</div>
                )}
                <div className="form-text" style={{ color: theme.textSecondary }}>
                  设置笔名后，您的所有创作将使用此笔名
                </div>
                <div className="form-text" style={{ color: theme.accent }}>
                  <i className="fas fa-info-circle me-1"></i>
                  更改笔名后，您之前创作的所有小说也将同步更新作者名
                </div>
              </div>
              
              {/* 个人简介 */}
              <div className="mb-4">
                <label 
                  htmlFor="bio" 
                  className="form-label"
                  style={{ color: theme.text, fontWeight: 'bold' }}
                >
                  个人简介
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  className="form-control"
                  style={{ ...inputStyle, minHeight: '120px' }}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="介绍一下自己吧..."
                />
              </div>
              
              <div className="d-flex justify-content-end">
                <button 
                  type="submit" 
                  className="btn"
                  style={btnPrimaryStyle}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      更新中...
                    </>
                  ) : '保存更改'}
                </button>
              </div>
            </form>
          </div>
          
          {/* 删除账号卡片 */}
          <div style={{ ...cardStyle, borderColor: '#dc3545' }}>
            <h4 style={{ color: theme.text }}>删除账号</h4>
            <p style={{ color: theme.textSecondary }}>
              警告：此操作不可逆，删除账号后将无法恢复您的个人信息和数据。
            </p>
            <button 
              className="btn btn-danger"
              onClick={() => setShowDeleteAccountModal(true)}
            >
              删除我的账号
            </button>
          </div>
        </div>
        
        <div className="col-md-4">
          {/* 头像卡片 */}
          <div style={cardStyle}>
            <div className="text-center mb-4">
              <div 
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  backgroundColor: '#000000', // 使用黑色作为底色
                  margin: '0 auto',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="用户头像" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => handleAvatarError()}
                  />
                ) : formData.username ? (
                  // 如果没有预览但有用户名，直接显示文字（作为备用）
                  <div 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      color: '#ffffff' // 白色文字
                    }}
                  >
                    {formData.username.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      fontSize: '3rem',
                      color: '#ffffff' // 白色文字
                    }}
                  >
                    <i className="bi bi-person"></i>
                  </div>
                )}
                
                {/* 上传覆盖层 */}
                <div 
                  style={{ 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.25rem',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    fontSize: '0.75rem'
                  }}
                >
                  {isUploading ? '上传中...' : '点击更新'}
                </div>
                
                {/* 隐藏的文件输入 */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                  accept="image/*"
                />
              </div>
            </div>
            
            <h4 style={{ color: theme.text, textAlign: 'center' }}>
              {formData.username}
            </h4>
            {formData.penName && (
              <p style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: '1rem' }}>
                笔名：{formData.penName}
              </p>
            )}
            
            <hr style={{ borderColor: theme.border }} />
            
            {/* 账户安全 */}
            <div style={{ marginTop: '1rem' }}>
              <h5 style={{ color: theme.text }}>账户安全</h5>
              <button 
                type="button" 
                className="btn w-100 mt-2"
                style={btnSecondaryStyle}
                onClick={() => setShowPasswordModal(true)}
              >
                修改密码
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 修改密码模态框 */}
      <Modal 
        show={showPasswordModal} 
        onHide={() => {
          if (!isSubmittingPassword) {
            setShowPasswordModal(false);
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
            setPasswordUpdateSuccess(false);
          }
        }}
        centered
        contentClassName={isDark ? 'bg-dark' : ''}
      >
        <Modal.Header 
          closeButton 
          style={{ 
            backgroundColor: isDark ? theme.cardBg : '#fff',
            borderColor: theme.border
          }}
        >
          <Modal.Title style={{ color: theme.text }}>修改密码</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: isDark ? theme.cardBg : '#fff' }}>
          {passwordUpdateSuccess ? (
            <div className="text-center p-4">
              <div className="mb-3" style={{ fontSize: '4rem', color: theme.success }}>
                <i className="bi bi-check-circle"></i>
              </div>
              <h4 style={{ color: theme.text }}>密码修改成功！</h4>
              <p style={{ color: theme.textSecondary }}>您的密码已更新，窗口将在3秒后自动关闭。</p>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <label 
                  htmlFor="currentPassword" 
                  className="form-label"
                  style={{ color: theme.text }}
                >
                  当前密码
                </label>
                <div className="input-group">
                  <input
                    type={passwordVisibility.currentPassword ? "text" : "password"}
                    className={`form-control ${!passwordValidation.currentPassword.valid ? 'is-invalid' : ''}`}
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => togglePasswordVisibility('currentPassword')}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    <i className={`bi bi-eye${passwordVisibility.currentPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                {!passwordValidation.currentPassword.valid && (
                  <div className="text-danger mt-1">{passwordValidation.currentPassword.message}</div>
                )}
              </div>
              
              <div className="mb-3">
                <label 
                  htmlFor="newPassword" 
                  className="form-label"
                  style={{ color: theme.text }}
                >
                  新密码
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
                    type={passwordVisibility.newPassword ? "text" : "password"}
                    className={`form-control ${!passwordValidation.newPassword.valid ? 'is-invalid' : ''}`}
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    onFocus={() => setShowPasswordRules(true)}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => togglePasswordVisibility('newPassword')}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    <i className={`bi bi-eye${passwordVisibility.newPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                
                {showPasswordRules && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.75rem', 
                    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                    borderRadius: '0.25rem' 
                  }}>
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
                
                {!passwordValidation.newPassword.valid && (
                  <div className="text-danger mt-1">{passwordValidation.newPassword.message}</div>
                )}
              </div>
              
              <div className="mb-3">
                <label 
                  htmlFor="confirmPassword" 
                  className="form-label"
                  style={{ color: theme.text }}
                >
                  确认新密码
                </label>
                <div className="input-group">
                  <input
                    type={passwordVisibility.confirmPassword ? "text" : "password"}
                    className={`form-control ${!passwordValidation.confirmPassword.valid ? 'is-invalid' : ''}`}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    <i className={`bi bi-eye${passwordVisibility.confirmPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
                {!passwordValidation.confirmPassword.valid && (
                  <div className="text-danger mt-1">{passwordValidation.confirmPassword.message}</div>
                )}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer 
          style={{ 
            backgroundColor: isDark ? theme.cardBg : '#fff',
            borderColor: theme.border
          }}
        >
          {!passwordUpdateSuccess && (
            <>
              <Button 
                variant="secondary" 
                onClick={() => setShowPasswordModal(false)}
                style={{ 
                  ...btnSecondaryStyle,
                  minWidth: 'unset'
                }}
                disabled={isSubmittingPassword}
              >
                取消
              </Button>
              <Button 
                variant="primary" 
                onClick={handleUpdatePassword}
                disabled={isSubmittingPassword}
                style={{ 
                  ...btnPrimaryStyle,
                  minWidth: 'unset'
                }}
              >
                {isSubmittingPassword ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    处理中...
                  </>
                ) : '修改密码'}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
      
      {/* 删除账号确认模态框 */}
      <Modal 
        show={showDeleteAccountModal} 
        onHide={() => setShowDeleteAccountModal(false)}
        centered
        contentClassName={isDark ? 'bg-dark' : ''}
      >
        <Modal.Header 
          closeButton 
          style={{ 
            backgroundColor: isDark ? theme.cardBg : '#fff',
            borderColor: theme.border
          }}
        >
          <Modal.Title style={{ color: theme.text }}>删除账号</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: isDark ? theme.cardBg : '#fff' }}>
          <div className="alert alert-danger">
            <strong>警告：</strong> 删除账号是不可逆操作，您的所有数据将被永久删除。
          </div>
          
          <p style={{ color: theme.text }}>
            请输入"DELETE"以确认删除您的账号：
          </p>
          
          <input
            type="text"
            className="form-control"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            style={inputStyle}
          />
        </Modal.Body>
        <Modal.Footer 
          style={{ 
            backgroundColor: isDark ? theme.cardBg : '#fff',
            borderColor: theme.border
          }}
        >
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteAccountModal(false)}
            style={{ 
              ...btnSecondaryStyle,
              minWidth: 'unset'
            }}
          >
            取消
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteAccount}
            disabled={isSubmittingDelete || deleteConfirmation !== 'DELETE'}
          >
            {isSubmittingDelete ? '处理中...' : '确认删除'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Profile; 
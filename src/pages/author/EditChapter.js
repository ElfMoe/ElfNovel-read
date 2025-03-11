import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { authorAPI } from '../../services/api';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

function EditChapter() {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { novelId, chapterId } = useParams();
  
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    chapterNumber: '',
    isExtra: false
  });
  const [originalChapterNumber, setOriginalChapterNumber] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchChapterData();
    }
  }, [isAuthenticated, novelId, chapterId]);
  
  const fetchChapterData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取小说信息
      const novelResponse = await authorAPI.getNovelDetail(novelId);
      
      // 获取章节详情
      const chapterResponse = await authorAPI.getChapterDetail(novelId, chapterId);
      
      if (novelResponse.success) {
        setNovel(novelResponse.data);
      } else {
        console.error('获取小说信息失败:', novelResponse.message);
        setError(novelResponse.message || '获取小说信息失败');
      }
      
      if (chapterResponse.success) {
        const chapterData = chapterResponse.data;
        setFormData({
          title: chapterData.title || '',
          content: chapterData.content || '',
          chapterNumber: chapterData.chapterNumber || '',
          isExtra: chapterData.isExtra || false
        });
        setOriginalChapterNumber(chapterData.chapterNumber);
      } else {
        console.error('获取章节详情失败:', chapterResponse.message);
        setError(prevError => prevError || chapterResponse.message || '获取章节详情失败');
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载数据时出错，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // 清除相关字段的错误
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
    
    // 清除成功消息
    if (successMessage) {
      setSuccessMessage('');
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = '请输入章节标题';
    } else if (formData.title.length > 100) {
      errors.title = '章节标题不能超过100个字符';
    }
    
    if (!formData.content.trim()) {
      errors.content = '请输入章节内容';
    }
    
    if (!formData.chapterNumber || isNaN(formData.chapterNumber) || formData.chapterNumber < 1) {
      errors.chapterNumber = '请输入有效的章节号（必须大于0）';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitLoading(true);
      setError(null);
      
      const response = await authorAPI.updateChapter(novelId, chapterId, {
        ...formData,
        chapterNumber: parseInt(formData.chapterNumber)
      });
      
      if (response.success) {
        setSuccessMessage('章节更新成功！');
        
        // 立即跳转到章节管理页面
        navigate(`/author/novels/${novelId}/chapters`);
      } else {
        setError(response.message || '更新章节失败');
      }
    } catch (err) {
      console.error('更新章节时出错:', err);
      setError('更新章节时出错，请稍后再试');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // 计算总字数（去除空格和标点符号）
  const calculateWordCount = (content) => {
    if (!content) return 0;
    return content.replace(/\s+/g, '').length;
  };
  
  // 样式定义
  const containerStyle = {
    padding: '2rem',
    color: theme.text,
    backgroundColor: theme.pageBg,
    minHeight: '100vh'
  };
  
  const cardStyle = {
    backgroundColor: theme.cardBg,
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease'
  };
  
  const formControlStyle = {
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    border: `1px solid ${theme.border}`,
    marginBottom: '1rem'
  };
  
  const textareaStyle = {
    ...formControlStyle,
    minHeight: '500px',
    fontFamily: 'monospace'
  };
  
  return (
    <div style={containerStyle}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: theme.text }}>编辑章节</h2>
        <div>
          <Link 
            to={`/author/novels/${novelId}/chapters`}
            className="btn btn-sm"
            style={{ 
              backgroundColor: theme.cardBg,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            返回章节管理
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div style={cardStyle} className="text-center py-5">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.textSecondary, marginTop: '1rem' }}>正在加载数据...</p>
        </div>
      ) : error ? (
        <div style={cardStyle}>
          <div className="alert alert-danger">{error}</div>
        </div>
      ) : (
        <>
          {/* 小说信息卡片 */}
          <div style={cardStyle} className="mb-4">
            <h3 style={{ color: theme.text, margin: 0 }}>《{novel?.title}》</h3>
            <p style={{ color: theme.textSecondary, marginTop: '0.5rem' }}>
              作者: {novel?.authorName} | 状态: {novel?.status} | 编辑章节: 第 {originalChapterNumber} 章
            </p>
          </div>
          
          {/* 编辑章节表单 */}
          <div style={cardStyle}>
            <Form onSubmit={handleSubmit}>
              {successMessage && (
                <div className="alert alert-success mb-3">{successMessage}</div>
              )}
              
              <div className="row mb-3">
                <div className="col-md-9">
                  <Form.Group>
                    <Form.Label style={{ color: theme.text, fontWeight: 'bold' }}>章节标题</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="请输入章节标题"
                      style={formControlStyle}
                      isInvalid={!!formErrors.title}
                    />
                    {formErrors.title && (
                      <Form.Control.Feedback type="invalid">
                        {formErrors.title}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                </div>
                <div className="col-md-3">
                  <Form.Group>
                    <Form.Label style={{ color: theme.text, fontWeight: 'bold' }}>章节号</Form.Label>
                    <Form.Control
                      type="number"
                      name="chapterNumber"
                      value={formData.chapterNumber}
                      onChange={handleInputChange}
                      min="1"
                      style={formControlStyle}
                      isInvalid={!!formErrors.chapterNumber}
                    />
                    {formErrors.chapterNumber && (
                      <Form.Control.Feedback type="invalid">
                        {formErrors.chapterNumber}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>
                </div>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  id="isExtra"
                  name="isExtra"
                  label="标记为番外章节"
                  checked={formData.isExtra}
                  onChange={handleInputChange}
                  style={{ color: theme.text }}
                  disabled={novel?.status === '已完结'}
                />
                <small style={{ color: theme.textSecondary }}>
                  番外章节将在章节列表和阅读页面特别标识
                </small>
                {novel?.status === '已完结' && (
                  <div className="alert alert-warning mt-2" style={{ fontSize: '0.9rem' }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    小说已完结，章节自动标记为番外。若需要取消番外标记，请先将小说状态改为"连载中"。
                  </div>
                )}
              </Form.Group>
              
              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label style={{ color: theme.text, fontWeight: 'bold', margin: 0 }}>章节内容</Form.Label>
                  <span style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                    当前字数: {calculateWordCount(formData.content)}
                  </span>
                </div>
                <Form.Control
                  as="textarea"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="请在这里输入章节内容..."
                  style={textareaStyle}
                  isInvalid={!!formErrors.content}
                />
                {formErrors.content && (
                  <Form.Control.Feedback type="invalid">
                    {formErrors.content}
                  </Form.Control.Feedback>
                )}
              </Form.Group>
              
              <div className="d-flex justify-content-end gap-2 mt-4">
                <Link 
                  to={`/author/novels/${novelId}/chapters`}
                  className="btn"
                  style={{ 
                    backgroundColor: theme.cardBg,
                    color: theme.text,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  取消
                </Link>
                <Button 
                  type="submit" 
                  disabled={submitLoading}
                  style={{ 
                    backgroundColor: theme.accent,
                    borderColor: theme.accent
                  }}
                >
                  {submitLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      保存中...
                    </>
                  ) : '保存修改'}
                </Button>
              </div>
            </Form>
          </div>
        </>
      )}
    </div>
  );
}

export default EditChapter; 
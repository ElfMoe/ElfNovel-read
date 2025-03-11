import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { authorAPI } from '../../services/api';
import { getFullImageUrl } from '../../utils/imageUtils';
import { toast } from 'react-toastify';

// API基础URL，用于静态资源
const API_BASE_URL = 'http://localhost:5001';

// 定义所有可用标签
const allTags = {
  // 按题材分类
  题材: [
    '奇幻', '玄幻', '武侠', '修真', '科幻', '赛博朋克', '未来世界', '星际战争', 
    '末日废土', '克苏鲁', '神话传说', '历史', '架空历史', '东方玄幻', '西方魔幻', 
    '仙侠', '灵异鬼怪', '无限流', '末日生存', 'AI觉醒', '校园'
  ],
  // 按风格分类
  风格: [
    '搞笑', '治愈', '暗黑', '热血', '轻松', '沉重', '现实向', '赛高', '励志', 
    '哲学思考', '反乌托邦', '赛博未来', '甜宠', '伪纪实', '复仇', '悬疑', '心理', 
    '推理', '侦探', '黑道'
  ],
  // 按主角设定分类
  主角: [
    '男主', '女主', '无性别', '群像', '独自冒险', '反派主角', '穿越者', '重生者', 
    '非人类', 'AI主角', '龙傲天', '废柴逆袭', '天才流', '变身流', '笑面虎', '冷酷无情'
  ],
  // 按情感分类
  情感: [
    '言情', '纯爱', '百合', '耽美', '养成', '青梅竹马', '先婚后爱', '豪门恩怨', 
    '禁忌之恋', '宫斗', '黑化', '单恋', '修罗场', 'HE', 'BE', '开放结局'
  ],
  // 按世界观分类
  世界观: [
    '西方奇幻', '东方玄幻', '修真世界', '赛博世界', '剑与魔法', '未来都市', '末世', 
    '近未来', '克系', '神话世界', '现实向', '多元宇宙', '武侠江湖'
  ],
  // 其他流派
  其他: [
    '无限流', '综漫', '综影视', '短篇', '长篇', '短篇合集', '剧情向', '角色扮演', 
    '轻小说', '网游', '电子竞技', '经营模拟', '直播', '克隆与基因'
  ]
};

function EditNovel() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { novelId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [noPenName, setNoPenName] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  
  // 标签操作反馈
  const [tagFeedback, setTagFeedback] = useState({
    show: false,
    message: '',
    type: '' // 'success', 'warning', 'info'
  });
  
  // 展开/折叠分类状态
  const [expandedCategories, setExpandedCategories] = useState({
    题材: true,
    风格: false,
    主角: false,
    情感: false,
    世界观: false,
    其他: false
  });
  
  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    longDescription: '',
    categories: ['其他'],
    tags: [],
    status: '连载中',
    cover: null,
    coverTemplate: 1,
    useCustomCover: false
  });

  // 表单验证
  const [validation, setValidation] = useState({
    title: { valid: true, message: '' },
    shortDescription: { valid: true, message: '' },
    longDescription: { valid: true, message: '' }
  });
  
  // 获取小说详情
  useEffect(() => {
    const fetchNovelDetails = async () => {
      try {
        setLoading(true);
        console.log('开始获取小说详情，ID:', novelId);
        const response = await authorAPI.getNovelDetail(novelId);
        console.log('获取到小说详情:', response);
        
        if (response.success && response.data) {    
          const novel = response.data;
          console.log('小说详情数据:', novel);
          
          // 检查是否使用自定义封面
          const isCustomCover = novel.cover && !novel.cover.includes('templates/cover-template');
          console.log('是否使用自定义封面:', isCustomCover);
          console.log('封面路径:', novel.cover);
          
          // 设置表单数据
          setFormData({
            title: novel.title || '',
            shortDescription: novel.shortDescription || '',
            longDescription: novel.longDescription || '',
            categories: novel.categories || [],
            tags: novel.tags || [],
            status: novel.status || '连载中',
            cover: null, // 不加载现有封面文件，只显示
            coverTemplate: novel.coverTemplate || 1,
            useCustomCover: isCustomCover
          });
          
          // 根据小说的分类和标签，展开相应的分类
          const expandState = {
            题材: false,
            风格: false,
            主角: false,
            情感: false,
            世界观: false,
            其他: false
          };
          
          // 检查小说的分类和标签属于哪个类别，并展开那个类别
          [...novel.categories, ...novel.tags].forEach(tag => {
            for (const [category, tagList] of Object.entries(allTags)) {
              if (tagList.includes(tag)) {
                expandState[category] = true;
                break;
              }
            }
          });
          
          // 至少展开一个分类
          if (!Object.values(expandState).some(v => v)) {
            expandState.题材 = true;
          }
          
          setExpandedCategories(expandState);
          setError(null);
        } else {
          setError(response.message || '获取小说详情失败');
          navigate('/author/novels');
        }
      } catch (err) {
        console.error('获取小说详情出错:', err);
        setError('获取小说详情时出错，请稍后再试');
        navigate('/author/novels');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && novelId) {
      fetchNovelDetails();
    } else if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, novelId, navigate, user]);
  
  // 检查用户是否已设置笔名
  useEffect(() => {
    if (user && !user.penName) {
      setNoPenName(true);
    } else {
      setNoPenName(false);
    }
  }, [user]);
  
  // 处理表单输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 验证输入
    validateField(name, value);
  };
  
  // 验证字段
  const validateField = (name, value) => {
    let isValid = true;
    let message = '';
    
    switch (name) {
      case 'title':
        if (!value.trim()) {
          isValid = false;
          message = '请输入小说标题';
        } else if (value.length > 100) {
          isValid = false;
          message = '标题不能超过100个字符';
        }
        break;
      case 'shortDescription':
        if (!value.trim()) {
          isValid = false;
          message = '请输入短简介';
        } else if (value.length > 150) {
          isValid = false;
          message = '短简介不能超过150个字符';
        }
        break;
      case 'longDescription':
        if (value.length > 2000) {
          isValid = false;
          message = '详细描述不能超过2000个字符';
        }
        break;
      default:
        break;
    }
    
    setValidation(prev => ({
      ...prev,
      [name]: { valid: isValid, message }
    }));
    
    return isValid;
  };
  
  // 验证所有字段
  const validateForm = () => {
    const fields = ['title', 'shortDescription', 'longDescription'];
    let isValid = true;
    
    fields.forEach(field => {
      const fieldValid = validateField(field, formData[field]);
      if (!fieldValid) isValid = false;
    });
    
    return isValid;
  };
  
  // 展开/折叠分类
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // 处理标签变化
  const handleTagChange = (tag) => {
    // 检查标签是否已被选中
    const isSelected = formData.categories.includes(tag) || formData.tags.includes(tag);
    
    // 先清除之前的反馈
    setTagFeedback({ show: false, message: '', type: '' });
    
    // 如果标签已被选中，则删除它
    if (isSelected) {
      // 如果是在categories中
      if (formData.categories.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          categories: prev.categories.filter(t => t !== tag)
        }));
      } 
      // 如果是在tags中
      else if (formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: prev.tags.filter(t => t !== tag)
        }));
      }
      
      // 如果没有选择任何分类，自动添加"其他"
      if (formData.categories.length === 1 && formData.categories[0] === tag) {
        setFormData(prev => ({
          ...prev,
          categories: ['其他']
        }));
      }
    } 
    // 如果标签未被选中，则添加它
    else {
      // 计算当前标签总数（categories + tags）
      const totalTagsCount = formData.categories.filter(cat => cat !== '其他').length + formData.tags.length;
      
      // 检查是否超出总标签限制（7个）
      if (totalTagsCount >= 7) {
        setTagFeedback({
          show: true,
          message: '您已选择了7个分类/标签，已达到上限。如需添加新分类，请先删除已有的分类或标签。',
          type: 'warning'
        });
        return;
      }
      
      // 如果是预设标签，添加到categories
      const isPresetTag = Object.values(allTags).flat().includes(tag);
      if (isPresetTag) {
        // 移除"其他"标签，添加新标签
        setFormData(prev => ({
          ...prev,
          categories: [...prev.categories.filter(cat => cat !== '其他'), tag]
        }));
        
        // 显示成功提示
        setTagFeedback({
          show: true,
          message: `已添加"${tag}"标签`,
          type: 'success'
        });
      }
    }
  };
  
  // 处理标签输入
  const handleTagInput = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const tagValue = e.target.value.trim();
      if (!tagValue) return;
      
      // 先清除之前的反馈
      setTagFeedback({ show: false, message: '', type: '' });
      
      // 检查是否与预设标签重复
      const isPresetTag = Object.values(allTags).flat().includes(tagValue);
      if (isPresetTag) {
        // 检查该标签是否已被选择
        const isSelected = formData.categories.includes(tagValue) || formData.tags.includes(tagValue);
        
        if (isSelected) {
          setTagFeedback({
            show: true,
            message: `"${tagValue}"标签已经在您的选择中`,
            type: 'info'
          });
        } else {
          // 自动为用户选择该标签
          // 计算当前标签总数
          const totalTagsCount = formData.categories.filter(cat => cat !== '其他').length + formData.tags.length;
          
          // 检查是否超出总标签限制（7个）
          if (totalTagsCount >= 7) {
            setTagFeedback({
              show: true,
              message: '您已选择了7个分类/标签，已达到上限。如需添加新分类，请先删除已有的分类或标签。',
              type: 'warning'
            });
            e.target.value = '';
            return;
          }
          
          // 移除"其他"标签，添加新标签
          setFormData(prev => ({
            ...prev,
            categories: [...prev.categories.filter(cat => cat !== '其他'), tagValue]
          }));
          
          setTagFeedback({
            show: true,
            message: `已自动为您选择"${tagValue}"标签`,
            type: 'success'
          });
        }
        
        e.target.value = '';
        return;
      }
      
      // 检查是否与已有自定义标签重复
      if (formData.tags.includes(tagValue)) {
        setTagFeedback({
          show: true,
          message: `您已添加过"${tagValue}"标签`,
          type: 'warning'
        });
        e.target.value = '';
        return;
      }
      
      // 计算当前自定义标签数量
      const currentTagsCount = formData.tags.length;
      
      // 计算当前标签总数（categories + tags）
      const totalTagsCount = formData.categories.filter(cat => cat !== '其他').length + currentTagsCount;
      
      // 检查是否超出自定义标签限制（2个）
      if (currentTagsCount >= 2) {
        setTagFeedback({
          show: true,
          message: '您已添加2个自定义标签，已达到上限。如需添加新标签，请先删除已有的标签。',
          type: 'warning'
        });
        e.target.value = '';
        return;
      }
      
      // 检查是否超出总标签限制（7个）
      if (totalTagsCount >= 7) {
        setTagFeedback({
          show: true,
          message: '分类和标签总数不能超过7个。如需添加新标签，请先删除已有的分类或标签。',
          type: 'warning'
        });
        e.target.value = '';
        return;
      }
      
      // 添加标签
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagValue]
      }));
      
      setTagFeedback({
        show: true,
        message: `已添加自定义标签"${tagValue}"`,
        type: 'success'
      });
      
      // 清空输入框
      e.target.value = '';
    }
  };
  
  // 移除标签
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // 处理封面图片上传
  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.type.match('image.*')) {
        alert('请上传图片文件');
        return;
      }
      
      // 验证文件大小（最大10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过10MB');
        return;
      }
      
      // 设置封面文件
      setFormData(prev => ({
        ...prev,
        cover: file,
        useCustomCover: true
      }));
      
      // 创建预览URL
      setCoverPreview(URL.createObjectURL(file));
      
      console.log('封面上传成功:', file.name);
    } else {
      console.log('没有选择文件或操作被取消');
    }
  };

  // 选择默认封面模板
  const handleTemplateChange = (templateId) => {
    setFormData(prev => ({
      ...prev,
      coverTemplate: templateId,
      useCustomCover: false
    }));
    
    // 当选择模板时，如果有文件预览，清除它
    if (coverPreview) {
      setCoverPreview(null);
    }
    
    console.log(`已选择封面模板 ${templateId}`);
  };

  // 切换使用自定义封面或默认模板
  const toggleCoverType = (useCustom) => {
    setFormData(prev => ({
      ...prev,
      useCustomCover: useCustom
    }));
    
    console.log(`切换封面类型: ${useCustom ? '自定义封面' : '默认模板'}`);
  };

  // 默认封面模板数据
  const coverTemplates = [
    { id: 1, name: '简约黑', color: '#000000', textColor: '#FFFFFF', borderColor: '#333333' },
    { id: 2, name: '简约白', color: '#FFFFFF', textColor: '#000000', borderColor: '#CCCCCC' },
    { id: 3, name: '深蓝', color: '#1a237e', textColor: '#FFFFFF', borderColor: '#0d47a1' },
    { id: 4, name: '红色系', color: '#b71c1c', textColor: '#FFFFFF', borderColor: '#7f0000' },
    { id: 5, name: '青绿', color: '#004d40', textColor: '#FFFFFF', borderColor: '#00251a' },
    { id: 6, name: '紫色梦幻', color: '#4a148c', textColor: '#FFFFFF', borderColor: '#12005e' },
  ];

  // 渲染默认封面预览 - 使用实际的模板图片
  const renderTemplateCover = (template) => {
    return (
      <div 
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}
      >
        <img 
          src={`${API_BASE_URL}/templates/cover-template-${template.id}.jpg`}
          alt={`封面模板 ${template.id}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill'
          }}
          onError={(e) => {
            console.log('模板封面加载失败:', e.target.src);
            if (!e.target.src.includes('default-cover.jpg')) {
              e.target.onerror = null;
              e.target.src = `${API_BASE_URL}/images/default-cover.jpg`;
            }
          }}
        />
      </div>
    );
  };
  
  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 检查是否有笔名
    if (!user.penName) {
      toast.error('请先在个人资料中设置笔名');
      setNoPenName(true);
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('准备提交数据:', formData);
      
      // 准备要提交的数据
      const novelData = new FormData();
      novelData.append('title', formData.title);
      novelData.append('shortDescription', formData.shortDescription);
      novelData.append('longDescription', formData.longDescription);
      novelData.append('status', formData.status);
      
      // 添加分类和标签
      formData.categories.forEach(category => {
        novelData.append('categories[]', category);
      });
      
      formData.tags.forEach(tag => {
        novelData.append('tags[]', tag);
      });
      
      // 处理封面上传
      if (formData.useCustomCover) {
        if (formData.cover) {
          // 如果上传了新封面
          console.log('添加新的自定义封面:', formData.cover.name);
          novelData.append('cover', formData.cover);
        } else if (formData.coverUrl) {
          // 如果没有上传新封面但有现有封面，保留现有封面
          console.log('保留现有自定义封面:', formData.coverUrl);
          novelData.append('keepExistingCover', 'true');
        }
      } else {
        // 使用模板封面
        console.log('使用模板封面:', formData.coverTemplate);
        novelData.append('coverTemplate', formData.coverTemplate);
      }
      
      // 检查FormData内容（仅用于调试）
      for (let [key, value] of novelData.entries()) {
        console.log(`${key}: ${value instanceof File ? value.name : value}`);
      }
      
      // 调用API更新小说
      console.log('正在发送更新请求到后端...');
      const response = await authorAPI.updateNovel(novelId, novelData);
      console.log('后端响应:', response);
      
      if (response.success) {
        console.log('小说更新成功，即将跳转到小说列表');
        setSuccess(true);
        // 3秒后跳转到小说列表页
        setTimeout(() => {
          navigate('/author/novels');
        }, 3000);
      } else {
        console.error('更新小说失败:', response.message);
        setError(response.message || '更新小说失败');
      }
    } catch (err) {
      console.error('更新小说出错:', err);
      setError('更新小说时出错，请稍后再试');
    } finally {
      setLoading(false);
    }
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

  const inputStyle = {
    backgroundColor: isDark ? '#333333' : '#f5f5f5',
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    transition: 'all 0.2s ease'
  };

  const tagStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    margin: '0.25rem',
    backgroundColor: theme.accent + '30',
    color: theme.accent,
    borderRadius: '0.25rem',
    fontSize: '0.875rem'
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-5">
        <div style={cardStyle}>
          <h2 style={{ color: theme.text }}>请先登录</h2>
          <p style={{ color: theme.textSecondary }}>
            您需要登录后才能编辑小说。
          </p>
          <Link 
            to="/login" 
            className="btn"
            style={{ backgroundColor: theme.accent, color: '#fff' }}
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !success) {
    return (
      <div className="container py-5">
        <div style={cardStyle}>
          <div className="d-flex justify-content-center">
            <div className="spinner-border" role="status" style={{ color: theme.accent }}>
              <span className="visually-hidden">加载中...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 设置笔名提示组件
  if (noPenName) {
    return (
      <div className="container py-5">
        <div className="card" style={{ ...cardStyle }}>
          <div className="card-body">
            <h2 style={{ color: theme.text }}>请先设置笔名</h2>
            <div className="alert alert-warning">
              您需要在个人资料中设置笔名后才能编辑小说。
            </div>
            <p style={{ color: theme.textSecondary }}>
              笔名是您作为作者发布作品时显示的名称，读者将通过笔名识别您的作品。
            </p>
            <Link 
              to="/profile" 
              className="btn"
              style={{ 
                backgroundColor: theme.accent,
                color: '#fff',
                marginTop: '1rem'
              }}
            >
              前往设置笔名
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 style={{ color: theme.text, marginBottom: '0.5rem' }}>编辑小说</h1>
          {user?.penName && (
            <div style={{ color: theme.textSecondary }}>
              笔名：<strong style={{ color: theme.accent }}>{user.penName}</strong>
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn"
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            color: theme.text
          }}
          onClick={() => navigate(-1)}
        >
          返回
        </button>
      </div>
      <div style={cardStyle}>
        <h2 style={{ color: theme.text, marginBottom: '1.5rem' }}>编辑小说</h2>
        
        {success && (
          <div className="alert alert-success" role="alert">
            小说更新成功，即将跳转到小说列表...
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <h4 style={{ color: theme.text }}>封面设置</h4>
            <div className="row">
              <div className="col-md-4">
                <div style={{
                  width: '100%',
                  aspectRatio: '2/3',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                  {formData.useCustomCover ? (
                    formData.cover ? (
                      // 新上传的自定义封面
                      <img 
                        src={URL.createObjectURL(formData.cover)} 
                        alt="封面预览" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : formData.coverUrl ? (
                      // 已有的自定义封面
                      <img 
                        src={formData.coverUrl.startsWith('http') 
                          ? formData.coverUrl 
                          : `${API_BASE_URL}${formData.coverUrl}`} 
                        alt="现有封面" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          if (!e.target.src.includes('default-cover.jpg')) {
                            console.log('封面加载失败，使用默认封面', e.target.src);
                            e.target.onerror = null;
                            e.target.src = `${API_BASE_URL}/images/default-cover.jpg`;
                          }
                        }}
                      />
                    ) : (
                      // 没有封面时显示提示
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: theme.cardBg,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: theme.textSecondary,
                        flexDirection: 'column',
                        padding: '10px'
                      }}>
                        <i className="bi bi-image" style={{fontSize: '2rem'}}></i>
                        <p>点击下方"上传封面"按钮</p>
                      </div>
                    )
                  ) : (
                    // 使用模板封面
                    <img 
                      src={`${API_BASE_URL}/templates/cover-template-${formData.coverTemplate}.jpg`}
                      alt={`封面模板 ${formData.coverTemplate}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        console.log('模板封面加载失败:', e.target.src);
                        if (!e.target.src.includes('default-cover.jpg')) {
                          e.target.onerror = null;
                          e.target.src = `${API_BASE_URL}/images/default-cover.jpg`;
                        }
                      }}
                    />
                  )}
                </div>

                <div className="text-center mb-3">
                  <small style={{ color: theme.textSecondary }}>封面预览</small>
                </div>
              </div>
              
              <div className="col-md-8">
                <div className="mb-3">
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="useCustomCover"
                      checked={formData.useCustomCover}
                      onChange={(e) => toggleCoverType(e.target.checked)}
                      style={{ backgroundColor: formData.useCustomCover ? theme.accent : '' }}
                    />
                    <label className="form-check-label" htmlFor="useCustomCover" style={{ color: theme.text }}>
                      使用自定义封面
                    </label>
                  </div>

                  {formData.useCustomCover ? (
                    <div className="mb-3">
                      <label className="btn" style={{ 
                        backgroundColor: theme.accent,
                        color: '#fff',
                        cursor: 'pointer'
                      }}>
                        <i className="bi bi-upload me-2"></i>
                        上传封面
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleCoverUpload}
                        />
                      </label>
                      <small className="d-block mt-2" style={{ color: theme.textSecondary }}>
                        推荐尺寸: 600x900像素，JPG或PNG格式，最大10MB
                      </small>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label style={{ color: theme.text, display: 'block', marginBottom: '0.5rem' }}>
                          选择封面模板
                        </label>
                      </div>
                      <div className="row">
                        {coverTemplates.map(template => (
                          <div key={template.id} className="col-md-4 col-sm-6 mb-3">
                            <div 
                              onClick={() => handleTemplateChange(template.id)}
                              style={{
                                cursor: 'pointer',
                                padding: '8px',
                                border: formData.coverTemplate === template.id 
                                  ? `2px solid ${theme.accent}` 
                                  : `1px solid ${theme.border}`,
                                borderRadius: '5px',
                                backgroundColor: theme.cardBg,
                                boxShadow: formData.coverTemplate === template.id 
                                  ? `0 0 5px ${theme.accent}` 
                                  : 'none',
                                transition: 'all 0.2s',
                                height: '80px'
                              }}
                            >
                              <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: template.color,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: template.textColor,
                                fontSize: '12px',
                                borderRadius: '3px'
                              }}>
                                {template.name}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <small style={{ color: theme.textSecondary }}>
                        默认封面将自动添加小说标题和作者名称
                      </small>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label 
              htmlFor="title" 
              className="form-label"
              style={{ color: theme.text, fontWeight: 'bold' }}
            >
              小说标题 <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-control"
              style={inputStyle}
              value={formData.title}
              onChange={handleChange}
              placeholder="请输入小说标题（100字以内）"
            />
            {!validation.title.valid && (
              <div className="text-danger mt-1">{validation.title.message}</div>
            )}
          </div>
          
          <div className="mb-4">
            <label 
              htmlFor="shortDescription" 
              className="form-label"
              style={{ color: theme.text, fontWeight: 'bold' }}
            >
              短简介 <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              className="form-control"
              style={inputStyle}
              rows="2"
              value={formData.shortDescription}
              onChange={handleChange}
              placeholder="请输入简短的小说介绍（150字以内）"
            ></textarea>
            <small style={{ color: theme.textSecondary }}>
              {formData.shortDescription.length}/150
            </small>
            {!validation.shortDescription.valid && (
              <div className="text-danger mt-1">{validation.shortDescription.message}</div>
            )}
          </div>
          
          <div className="mb-4">
            <label 
              htmlFor="longDescription" 
              className="form-label"
              style={{ color: theme.text, fontWeight: 'bold' }}
            >
              详细描述
            </label>
            <textarea
              id="longDescription"
              name="longDescription"
              className="form-control"
              style={inputStyle}
              rows="5"
              value={formData.longDescription}
              onChange={handleChange}
              placeholder="请输入详细描述，介绍您的小说内容、世界观、主要角色等信息"
            ></textarea>
            {!validation.longDescription.valid && (
              <div className="text-danger mt-1">{validation.longDescription.message}</div>
            )}
          </div>
          
          <div className="mb-4">
            <label 
              className="form-label"
              style={{ color: theme.text, fontWeight: 'bold' }}
            >
              分类与标签
            </label>
            
            {/* 已选标签展示 */}
            <div className="mb-3">
              <div style={{ marginBottom: '0.5rem', color: theme.textSecondary }}>
                已选择标签:
              </div>
              <div>
                {formData.categories.filter(cat => cat !== '其他').map(category => (
                  <span key={category} style={{
                    ...tagStyle,
                    backgroundColor: theme.accent + '20',
                    color: theme.accent
                  }}>
                    {category}
                    <i 
                      className="bi bi-x ms-1" 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => handleTagChange(category)}
                    ></i>
                  </span>
                ))}
                
                {formData.tags.map(tag => (
                  <span key={tag} style={tagStyle}>
                    {tag}
                    <i 
                      className="bi bi-x ms-1" 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => removeTag(tag)}
                    ></i>
                  </span>
                ))}
                
                {formData.categories.length === 1 && formData.categories[0] === '其他' && formData.tags.length === 0 && (
                  <span style={{
                    ...tagStyle,
                    backgroundColor: '#6c757d20',
                    color: '#6c757d'
                  }}>
                    其他
                  </span>
                )}
              </div>
              <small style={{ color: theme.textSecondary }}>
                已选择 {formData.categories.filter(cat => cat !== '其他').length + formData.tags.length}/7 个标签 
                (分类与标签总数不能超过7个，请合理选择)
              </small>
            </div>
            
            {/* 标签操作反馈信息 */}
            {tagFeedback.show && (
              <div className="tag-feedback" style={{
                backgroundColor: tagFeedback.type === 'success' ? `${theme.success}20` : 
                                tagFeedback.type === 'warning' ? `${theme.warning}20` : 
                                `${theme.info}20`,
                color: tagFeedback.type === 'success' ? theme.success : 
                      tagFeedback.type === 'warning' ? theme.warning : 
                      theme.info,
                borderLeftColor: tagFeedback.type === 'success' ? theme.success : 
                                tagFeedback.type === 'warning' ? theme.warning : 
                                theme.info
              }}>
                <i className={`bi ${
                  tagFeedback.type === 'success' ? 'bi-check-circle' : 
                  tagFeedback.type === 'warning' ? 'bi-exclamation-triangle' : 
                  'bi-info-circle'
                }`}></i>
                {tagFeedback.message}
              </div>
            )}
            
            {/* 分类标签选择 */}
            <div className="card" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
              <div className="card-body">
                {/* 分类选项卡 */}
                <div className="accordion" id="tagCategoriesAccordion">
                  {Object.keys(allTags).map(category => (
                    <div className="accordion-item" key={category} style={{
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${theme.border}`,
                      marginBottom: '0.5rem'
                    }}>
                      <h2 className="accordion-header" id={`heading-${category}`}>
                        <button
                          className={`accordion-button ${!expandedCategories[category] ? 'collapsed' : ''}`}
                          type="button"
                          onClick={() => toggleCategory(category)}
                          style={{
                            backgroundColor: theme.cardBg,
                            color: theme.text,
                            boxShadow: 'none',
                            borderBottom: expandedCategories[category] ? `1px solid ${theme.border}` : 'none'
                          }}
                        >
                          {category}类标签
                        </button>
                      </h2>
                      
                      <div 
                        className={`accordion-collapse collapse ${expandedCategories[category] ? 'show' : ''}`}
                        id={`collapse-${category}`}
                      >
                        <div className="accordion-body">
                          <div className="d-flex flex-wrap gap-2">
                            {allTags[category].map(tag => {
                              const isSelected = formData.categories.includes(tag) || formData.tags.includes(tag);
                              return (
                                <span 
                                  key={tag}
                                  onClick={() => handleTagChange(tag)}
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.5rem',
                                    margin: '0.25rem',
                                    backgroundColor: isSelected ? theme.accent : theme.cardBg,
                                    color: isSelected ? '#fff' : theme.text,
                                    borderRadius: '0.25rem',
                                    border: `1px solid ${isSelected ? theme.accent : theme.border}`,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 自定义标签输入 */}
            <div className="mt-3">
              <label 
                htmlFor="customTag" 
                className="form-label"
                style={{ color: theme.text }}
              >
                自定义标签（按Enter添加）
              </label>
              <input
                type="text"
                id="customTag"
                className="form-control"
                style={inputStyle}
                onKeyDown={handleTagInput}
                placeholder="输入自定义标签后按Enter添加"
              />
              <small style={{ color: theme.textSecondary }}>
                已添加 {formData.tags.length}/2 个自定义标签 
                (自定义标签最多添加2个)
              </small>
            </div>
          </div>
          
          <div className="mb-4">
            <label 
              htmlFor="status" 
              className="form-label"
              style={{ color: theme.text, fontWeight: 'bold' }}
            >
              连载状态
            </label>
            <select
              id="status"
              name="status"
              className="form-select"
              style={inputStyle}
              value={formData.status}
              onChange={handleChange}
            >
              <option value="连载中">连载中</option>
              <option value="已完结">已完结</option>
              <option value="暂停更新">暂停更新</option>
            </select>
            {formData.status === '已完结' && (
              <div className="alert alert-info mt-2" style={{ fontSize: '0.9rem' }}>
                <i className="bi bi-info-circle me-2"></i>
                <strong>小说已完结提示：</strong> 
                <ul className="mb-0 mt-1">
                  <li>完结后仍可添加新章节，但会自动标记为"番外"</li>
                  <li>如需继续连载，可随时将状态改回"连载中"</li>
                  <li>完结状态会在小说页面特别标识，提升读者体验</li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="d-flex justify-content-between">
            <Link 
              to="/author/novels" 
              className="btn"
              style={{
                backgroundColor: theme.cardBg,
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              返回
            </Link>
            <button 
              type="submit" 
              className="btn"
              style={{
                backgroundColor: theme.accent,
                color: '#fff'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  更新中...
                </>
              ) : '保存修改'}
            </button>
          </div>
        </form>
      </div>
      
      {/* 添加全局CSS来修复折叠箭头在暗色模式下的显示问题 */}
      <style jsx="true">{`
        .accordion-button::after {
          background-color: transparent; /* 移除背景 */
          border-radius: 0; /* 移除边框圆角 */
          padding: 0; /* 移除内边距 */
          filter: ${isDark ? 'brightness(10)' : 'none'}; /* 在暗色模式下让箭头变白 */
        }
        
        /* 控制箭头大小 */
        .accordion-button:not(.collapsed)::after,
        .accordion-button.collapsed::after {
          background-size: 0.8rem;
        }
        
        /* 添加标签操作的提示样式 */
        .tag-feedback {
          background-color: ${theme.accent}20;
          color: ${theme.accent};
          border-left: 3px solid ${theme.accent};
          padding: 0.5rem 1rem;
          margin: 0.5rem 0;
          font-size: 0.9rem;
          border-radius: 0.25rem;
          display: flex;
          align-items: center;
        }
        
        .tag-feedback i {
          margin-right: 0.5rem;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}

export default EditNovel; 
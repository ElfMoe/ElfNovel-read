import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { authorAPI } from '../../services/api';
import { toast } from 'react-toastify';

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

function CreateNovel() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [noPenName, setNoPenName] = useState(false);
  
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
    coverTemplate: 1, // 默认模板
    useCustomCover: false // 是否使用自定义封面
  });

  // 检查用户是否已设置笔名
  useEffect(() => {
    if (user && !user.penName) {
      setNoPenName(true);
    } else {
      setNoPenName(false);
    }
  }, [user]);

  // 表单验证状态
  const [validation, setValidation] = useState({
    title: { valid: true, message: '' },
    shortDescription: { valid: true, message: '' },
    longDescription: { valid: true, message: '' }
  });

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

  // 展开/折叠分类
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const [tagFeedback, setTagFeedback] = useState({
    show: false,
    message: '',
    type: '' // 'success', 'warning', 'info'
  });

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

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      
      // 先清除之前的反馈
      setTagFeedback({ show: false, message: '', type: '' });
      
      // 检查是否与预设标签重复
      const isPresetTag = Object.values(allTags).flat().includes(newTag);
      if (isPresetTag) {
        // 检查该标签是否已被选择
        const isSelected = formData.categories.includes(newTag) || formData.tags.includes(newTag);
        
        if (isSelected) {
          setTagFeedback({
            show: true,
            message: `"${newTag}"标签已经在您的选择中`,
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
            categories: [...prev.categories.filter(cat => cat !== '其他'), newTag]
          }));
          
          setTagFeedback({
            show: true,
            message: `已自动为您选择"${newTag}"标签`,
            type: 'success'
          });
        }
        
        e.target.value = '';
        return;
      }
      
      // 检查是否与已有自定义标签重复
      if (formData.tags.includes(newTag)) {
        setTagFeedback({
          show: true,
          message: `您已添加过"${newTag}"标签`,
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
      
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      
      setTagFeedback({
        show: true,
        message: `已添加自定义标签"${newTag}"`,
        type: 'success'
      });
      
      e.target.value = '';
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const validateForm = () => {
    // 调试用：输出当前表单数据
    console.log('验证表单数据:', JSON.stringify(formData, null, 2));
    
    const newValidation = {
      title: { valid: true, message: '' },
      shortDescription: { valid: true, message: '' },
      longDescription: { valid: true, message: '' }
    };
    
    let isValid = true;
    
    // 验证标题
    if (!formData.title.trim()) {
      newValidation.title = { valid: false, message: '请输入小说标题' };
      isValid = false;
      console.log('标题验证失败');
    } else if (formData.title.length > 100) {
      newValidation.title = { valid: false, message: '标题不能超过100个字符' };
      isValid = false;
      console.log('标题长度验证失败');
    }
    
    // 验证简短描述
    if (!formData.shortDescription.trim()) {
      newValidation.shortDescription = { valid: false, message: '请输入简短描述' };
      isValid = false;
      console.log('简短描述验证失败');
    } else if (formData.shortDescription.length > 200) {
      newValidation.shortDescription = { valid: false, message: '简短描述不能超过200个字符' };
      isValid = false;
      console.log('简短描述长度验证失败');
    }
    
    // 验证详细描述
    if (!formData.longDescription.trim()) {
      newValidation.longDescription = { valid: false, message: '请输入详细描述' };
      isValid = false;
      console.log('详细描述验证失败');
    }
    
    setValidation(newValidation);
    console.log('验证结果:', isValid, newValidation);
    return isValid;
  };

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
    
    setLoading(true);
    setError(null);
    
    try {
      // 准备基本信息 - JSON格式
      const novelData = {
        title: formData.title,
        authorName: user?.penName || '',
        shortDescription: formData.shortDescription,
        longDescription: formData.longDescription,
        status: formData.status,
        categories: formData.categories,
        tags: formData.tags,
        useCustomCover: formData.useCustomCover,
        coverTemplate: formData.coverTemplate
      };
      
      // 调用API创建小说
      console.log('正在创建小说，提交JSON数据:', JSON.stringify(novelData, null, 2));
      
      const response = await authorAPI.createNovel(novelData);
      console.log('创建小说响应详情:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('小说基本信息创建成功');
        const novelId = response.data?._id || response.data?.id;
        
        if (!novelId) {
          console.error('无法获取新创建小说的ID');
          setError('小说创建成功，但无法获取ID');
        } else {
          // 处理封面
          if (formData.useCustomCover && formData.cover) {
            // 上传自定义封面
            try {
              console.log('开始上传自定义封面');
              
              // 使用FormData上传封面
              const coverData = new FormData();
              coverData.append('cover', formData.cover);
              
              const coverResponse = await authorAPI.uploadNovelCover(novelId, coverData);
              console.log('封面上传响应:', JSON.stringify(coverResponse, null, 2));
              
              if (coverResponse.success) {
                console.log('封面上传成功');
              } else {
                console.error('封面上传失败:', coverResponse.message);
                setError('小说创建成功，但封面上传失败: ' + coverResponse.message);
              }
            } catch (coverError) {
              console.error('封面上传出错:', coverError);
              setError('小说创建成功，但封面上传失败');
            }
          } else {
            // 使用默认模板
            try {
              console.log(`开始设置封面模板: ${formData.coverTemplate}`);
              
              const templateResponse = await authorAPI.setNovelCoverTemplate(novelId, formData.coverTemplate);
              console.log('设置封面模板响应:', JSON.stringify(templateResponse, null, 2));
              
              if (templateResponse.success) {
                console.log('封面模板设置成功');
              } else {
                console.error('封面模板设置失败:', templateResponse.message);
                setError('小说创建成功，但封面模板设置失败: ' + templateResponse.message);
              }
            } catch (templateError) {
              console.error('设置封面模板出错:', templateError);
              setError('小说创建成功，但封面模板设置失败');
            }
          }
        }
        
        // 设置成功状态并准备跳转
        setSuccess(true);
        console.log('小说创建完成，准备跳转');
        
        // 延迟2秒跳转到小说列表页
        setTimeout(() => {
          navigate('/author/novels');
        }, 2000);
      } else {
        console.error('创建小说失败:', response.message);
        setError(response.message || '创建小说失败，请稍后再试');
      }
    } catch (err) {
      console.error('创建小说出错:', err);
      setError(err.message || '创建小说失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 处理封面上传
  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log(`封面文件选择: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB, 类型: ${file.type}`);
      
      // 检查文件类型
      if (!file.type.match('image.*')) {
        console.error('文件类型无效:', file.type);
        setError('请上传图片文件（JPG, PNG, GIF）');
        return;
      }
      
      // 检查文件大小 (限制为10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.error('文件太大:', file.size);
        setError('图片大小不能超过10MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        cover: file,
        useCustomCover: true
      }));
      console.log('封面文件已设置，封面类型切换为自定义');
      
      // 预览上传的图片
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('文件读取成功，设置预览');
        setCoverPreview(e.target.result);
      };
      reader.onerror = (e) => {
        console.error('文件读取失败:', e);
        setError('封面预览生成失败');
      };
      reader.readAsDataURL(file);
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

  // 封面预览
  const [coverPreview, setCoverPreview] = useState(null);

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
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
    const templateUrl = `${baseUrl}/templates/cover-template-${template.id}.jpg`;
    
    return (
      <div 
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <img 
          src={templateUrl}
          alt={`${template.name}模板`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={(e) => {
            console.log('模板封面加载失败，回退到样式模拟:', e);
            // 图片加载失败时回退到样式模拟版本
            e.target.style.display = 'none';
            e.target.parentNode.style.backgroundColor = template.color;
            e.target.parentNode.style.color = template.textColor;
            e.target.parentNode.style.border = `2px solid ${template.borderColor}`;
            e.target.parentNode.style.display = 'flex';
            e.target.parentNode.style.flexDirection = 'column';
            e.target.parentNode.style.justifyContent = 'center';
            e.target.parentNode.style.alignItems = 'center';
            e.target.parentNode.style.padding = '15px';
            e.target.parentNode.style.textAlign = 'center';
            
            // 创建标题和作者名称的元素
            const titleDiv = document.createElement('div');
            titleDiv.style.fontSize = '14px';
            titleDiv.style.marginBottom = '8px';
            titleDiv.innerText = formData.title || '小说标题';
            
            const authorDiv = document.createElement('div');
            authorDiv.style.fontSize = '10px';
            authorDiv.innerText = user?.penName || '作者笔名';
            
            // 清空容器并添加新元素
            e.target.parentNode.innerHTML = '';
            e.target.parentNode.appendChild(titleDiv);
            e.target.parentNode.appendChild(authorDiv);
          }}
        />
      </div>
    );
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
            您需要登录后才能创建小说。
          </p>
          <Link 
            to="/login" 
            className="btn"
            style={{ 
              backgroundColor: theme.accent,
              color: '#fff',
              marginTop: '1rem'
            }}
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  if (noPenName) {
    return (
      <div className="container py-5">
        <div style={cardStyle}>
          <h2 style={{ color: theme.text }}>请先设置笔名</h2>
          <div className="alert alert-warning">
            您需要在个人资料中设置笔名后才能创建小说。
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
    );
  }

  if (success) {
    return (
      <div className="container py-5">
        <div style={cardStyle} className="text-center py-5">
          <i className="bi bi-check-circle" style={{ fontSize: '3rem', color: '#28a745' }}></i>
          <h3 style={{ color: theme.text, marginTop: '1rem' }}>小说创建成功！</h3>
          <p style={{ color: theme.textSecondary }}>请稍候，正在跳转到您的作品列表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 style={{ color: theme.text, marginBottom: '1rem' }}>创建新小说</h1>
      
      {/* 优化折叠箭头在暗色模式下的显示问题 */}
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
      
      {user?.penName && (
        <div style={{ marginBottom: '2rem', color: theme.textSecondary }}>
          您将以笔名 <strong style={{ color: theme.accent }}>{user.penName}</strong> 发布作品
        </div>
      )}
      
      <div style={cardStyle}>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="cover" 
              className="form-label"
              style={{ color: theme.text, fontWeight: 'bold' }}
            >
              封面设置
            </label>
            
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
                    coverPreview ? (
                      <img 
                        src={coverPreview} 
                        alt="封面预览" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: theme.cardBg,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: theme.textSecondary
                      }}>
                        点击下方"上传封面"按钮
                      </div>
                    )
                  ) : (
                    renderTemplateCover(coverTemplates.find(t => t.id === formData.coverTemplate))
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
                          id="cover"
                          name="cover"
                          style={{ display: 'none' }}
                          onChange={handleCoverUpload}
                          accept="image/*"
                        />
                      </label>
                      <small className="ms-3" style={{ color: theme.textSecondary }}>
                        支持JPG、PNG格式，大小不超过10MB
                      </small>
                    </div>
                  ) : (
                    <>
                      <label className="form-label" style={{ color: theme.text }}>
                        选择默认封面模板
                      </label>
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
              简短描述 <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              id="shortDescription"
              name="shortDescription"
              className="form-control"
              style={inputStyle}
              value={formData.shortDescription}
              onChange={handleChange}
              placeholder="请输入简短描述（200字以内）"
            />
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
              详细描述 <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              id="longDescription"
              name="longDescription"
              className="form-control"
              style={{ 
                ...inputStyle, 
                minHeight: '150px',
                resize: 'vertical' 
              }}
              value={formData.longDescription}
              onChange={handleChange}
              placeholder="请输入详细描述，介绍您的小说内容、世界观、主要角色等信息"
            />
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
              小说状态
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
              <option value="暂停更新">暂停更新</option>
            </select>
          </div>
          
          <div className="d-flex justify-content-between">
            <button 
              type="button" 
              className="btn" 
              onClick={() => navigate(-1)}
              style={{
                backgroundColor: 'transparent',
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              取消
            </button>
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
                  创建中...
                </>
              ) : '创建小说'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateNovel;
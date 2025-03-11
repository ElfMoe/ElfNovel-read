import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { userAPI } from '../services/api';
import { authorAPI, novelAPI } from '../services/api';
import { getFullImageUrl, generateTextAvatar } from '../utils/imageUtils';

function UserHome() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { userId } = useParams(); // 获取URL中的userId参数
  
  // 用户基本信息
  const [userProfile, setUserProfile] = useState(null);
  
  // 用户创作的小说
  const [authoredNovels, setAuthoredNovels] = useState([]);
  const [hasNoNovels, setHasNoNovels] = useState(false);
  const [novelChapters, setNovelChapters] = useState({}); // 存储小说章节信息
  
  // 用户收藏的小说
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(true); // 是否显示收藏，默认显示
  // 用于调试的收藏总数
  const [totalFavorites, setTotalFavorites] = useState(0);
  
  // 加载状态
  const [profileLoading, setProfileLoading] = useState(true);
  const [novelsLoading, setNovelsLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  
  // 错误状态 - 不再显示错误信息，只用于内部处理
  const [profileError, setProfileError] = useState(null);
  const [novelsError, setNovelsError] = useState(null);
  const [favoritesError, setFavoritesError] = useState(null);

  // 是否是当前用户查看自己的页面
  const [isSelfProfile, setIsSelfProfile] = useState(true);
  
  // 展开描述功能
  const [expandedDesc, setExpandedDesc] = useState({});
  
  // 添加新状态来管理标签展示
  const [expandedTags, setExpandedTags] = useState({});
  
  // 切换展开/收起描述
  const toggleDescExpand = (novelId) => {
    setExpandedDesc(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  };

  // 切换标签展开/收起
  const toggleTagsExpand = (novelId) => {
    setExpandedTags(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  };

  // 页面样式 - 确保黑暗模式整体背景颜色正确
  const pageStyle = {
    backgroundColor: isDark ? theme.background : '#fff',
    color: theme.text,
    minHeight: 'calc(100vh - 56px)', // 减去导航栏高度
    paddingTop: '2rem',
    paddingBottom: '2rem'
  };
  
  // 容器样式
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 15px'
  };

  // 卡片样式
  const cardStyle = {
    backgroundColor: theme.cardBg,
    color: theme.text,
    borderColor: theme.border,
    borderRadius: '0.5rem',
    boxShadow: isDark ? '0 5px 15px rgba(0, 0, 0, 0.5)' : '0 5px 15px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    marginBottom: '2rem'
  };

  const cardHeaderStyle = {
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    borderColor: theme.border,
    color: theme.text,
    padding: '0.75rem 1.25rem'
  };

  const cardBodyStyle = {
    backgroundColor: theme.cardBg,
    color: theme.text,
    padding: '1.25rem'
  };

  // 小说卡片样式
  const novelCardStyle = {
    ...cardStyle,
    height: '100%',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    marginBottom: '0',
    backgroundColor: theme.cardBg
  };

  // 小说卡片内容区域样式
  const novelCardBodyStyle = {
    ...cardBodyStyle,
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  };

  // 小说封面样式
  const coverStyle = {
    width: '100%',
    aspectRatio: '2/3', // 标准书籍封面比例
    objectFit: 'cover',
    objectPosition: 'center',
    borderRadius: '0.5rem 0.5rem 0 0'
  };

  // 标签样式 - 圆形风格，与其他页面一致
  const tagStyle = {
    display: 'inline-block',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    color: isDark ? '#ffffff' : '#333333',
    padding: '0.1rem 0.4rem',
    borderRadius: '9999px', // 完全圆形边角
    marginRight: '0.35rem',
    marginBottom: '0.25rem',
    fontSize: '0.7rem'
  };

  // 收藏项目样式
  const favoriteItemStyle = {
    ...cardStyle,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    height: '100%',
    marginBottom: '0'
  };

  // 状态样式 - 连载中使用青色
  const getStatusStyle = (novel) => {
    let bgColor, textColor;
    
    if (novel.isCompleted || novel.status === 'completed') {
      bgColor = 'rgba(220, 53, 69, 0.2)';
      textColor = '#dc3545'; // 红色
    } else if (novel.status === 'paused' || novel.status === '暂停更新') {
      bgColor = 'rgba(255, 193, 7, 0.2)';
      textColor = '#ffc107'; // 黄色
    } else {
      bgColor = 'rgba(40, 167, 69, 0.2)';
      textColor = '#28a745'; // 青色
    }
    
    return {
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      backgroundColor: bgColor,
      color: textColor
    };
  };

  // 帮助函数：比较用户ID（考虑到一个可能是字符串，一个可能是对象中的属性）
  const isSameUser = (id1, id2) => {
    if (!id1 || !id2) return false;
    
    // 如果id1是对象，尝试获取其id属性
    const userId1 = typeof id1 === 'object' && id1.id ? id1.id : id1;
    // 如果id2是对象，尝试获取其id属性
    const userId2 = typeof id2 === 'object' && id2.id ? id2.id : id2;
    
    // 将两个ID转换为字符串进行比较
    return String(userId1) === String(userId2);
  };

  // 对所有Bootstrap卡片强制应用我们的样式（覆盖默认样式）
  useEffect(() => {
    // 添加全局样式来确保所有卡片及其子元素的背景色
    if (!document.getElementById('user-home-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'user-home-styles';
      styleElement.textContent = `
        /* 强制覆盖所有卡片及其子元素的背景色 */
        .user-home-page .card {
          background-color: ${theme.cardBg} !important;
        }
        
        .user-home-page .card-header {
          background-color: ${isDark ? '#2a2a2a' : '#f0f0f0'} !important;
          border-color: ${theme.border} !important;
        }
        
        .user-home-page .card-body {
          background-color: ${theme.cardBg} !important;
        }
        
        /* 页面整体背景 */
        .user-home-page {
          background-color: ${isDark ? theme.background : '#fff'} !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // 清理样式
      const styleElement = document.getElementById('user-home-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [theme, isDark]);

  useEffect(() => {
    // 判断是否是查看自己的主页
    const checkSelfProfile = () => {
      if (userId) {
        // URL中有userId参数时，判断是否是当前登录用户
        if (isAuthenticated && user && isSameUser(user, userId)) {
          setIsSelfProfile(true);
        } else {
          setIsSelfProfile(false);
        }
      } else {
        // 没有userId参数时，默认显示当前登录用户的主页
        setIsSelfProfile(true);
      }
    };

    checkSelfProfile();
    
    console.log('UserHome检查 - isAuthenticated:', isAuthenticated);
    console.log('UserHome检查 - user:', user);
    console.log('UserHome检查 - userId:', userId);
    console.log('UserHome检查 - isSelfProfile:', isSelfProfile);

    // 根据不同情况获取数据
    if (userId) {
      // 有用户ID时，无论是否登录，都获取该用户的公开信息
      console.log('UserHome获取 - 根据ID获取用户信息:', userId);
      fetchSpecificUserProfile(userId);
      fetchSpecificUserNovels(userId);
      fetchSpecificUserFavorites(userId);
    } else if (isAuthenticated) {
      // 无用户ID，但已登录，获取当前用户信息
      console.log('UserHome获取 - 获取当前用户信息');
      fetchUserProfile();
      fetchAuthoredNovels();
      fetchFavorites();
    } else {
      // 未登录且无用户ID，重定向到登录页
      console.log('UserHome获取 - 重定向到登录页');
      navigate('/login');
    }
    
  }, [isAuthenticated, user, userId, navigate]);

  // 获取特定用户的个人资料
  const fetchSpecificUserProfile = async (targetUserId) => {
    try {
      console.log('开始获取目标用户资料 - 用户ID:', targetUserId);
      setProfileLoading(true);
      setProfileError(null);
      
      // 调用获取指定用户信息的API
      const response = await userAPI.getUserProfileById(targetUserId);
      console.log('获取用户资料API响应:', response);
      
      if (response && response.success) {
        setUserProfile(response.data);
      } else {
        console.error('获取用户资料失败：', response?.message || '未知错误');
        setProfileError(response?.message || '获取用户资料失败');
        
        // 如果用户不存在，给出特殊提示
        if (response?.message === '未找到用户' || response?.status === 404) {
          // 可以考虑显示"用户不存在"页面或重定向
          console.log('用户不存在，可能需要重定向');
        }
      }
    } catch (err) {
      console.error('获取用户资料出错：', err);
      setProfileError('获取用户资料出错');
    } finally {
      setProfileLoading(false);
    }
  };

  // 获取特定用户的创作小说
  const fetchSpecificUserNovels = async (targetUserId) => {
    try {
      console.log('开始获取目标用户创作小说 - 用户ID:', targetUserId);
      setNovelsLoading(true);
      setNovelsError(null);
      
      // 调用获取指定用户小说的API
      const response = await novelAPI.getNovelsByAuthor(targetUserId);
      console.log('获取用户创作小说API响应:', response);
      
      if (response && response.success) {
        // 处理获取到的小说数据
        const novelsData = response.data || [];
        console.log('获取到的小说原始数据:', novelsData);
        
        if (Array.isArray(novelsData) && novelsData.length > 0) {
          // 处理小说数据，与fetchAuthoredNovels类似
          const processedNovels = novelsData.map(novel => {
            // 与fetchAuthoredNovels中的处理方式相同
            const hasCategories = novel.categories && Array.isArray(novel.categories);
            const hasTags = novel.tags && Array.isArray(novel.tags);
            
            const processedCategories = hasCategories ? novel.categories : 
                                      (novel.categories ? [novel.categories] : []);
            const processedTags = hasTags ? novel.tags : 
                                 (novel.tags ? [novel.tags] : []);
            
            return {
              ...novel,
              status: novel.status || 'ongoing',
              isCompleted: novel.status === 'completed',
              readCount: novel.readCount || novel.readers || 0,
              favoriteCount: novel.favoriteCount || novel.collections || 0,
              categories: processedCategories,
              tags: processedTags
            };
          });
          
          console.log('处理后的小说数据:', processedNovels);
          setAuthoredNovels(processedNovels);
          setHasNoNovels(false);
          
          // 为每本小说获取章节信息
          processedNovels.forEach(novel => {
            if (novel._id) {
              fetchNovelChapters(novel._id);
            } else {
              console.error('小说缺少_id字段:', novel);
            }
          });
        } else {
          console.log('目标用户没有创作小说或返回的数据不是数组:', novelsData);
          setAuthoredNovels([]);
          setHasNoNovels(true);
        }
      } else {
        console.error('获取用户创作小说失败或响应格式不正确:', response);
        setNovelsError('获取创作小说失败');
        setAuthoredNovels([]);
        setHasNoNovels(true);
      }
    } catch (err) {
      console.error('获取用户创作小说出错:', err);
      console.error('错误详情:', err.message, err.stack);
      setNovelsError('获取用户创作小说出错');
      setAuthoredNovels([]);
      setHasNoNovels(true);
    } finally {
      setNovelsLoading(false);
    }
  };

  // 原有的获取当前用户个人资料的函数
  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      
      // 使用Profile页面相同的API获取用户信息
      const response = await userAPI.getUserProfile();
      
      if (response.success) {
        setUserProfile(response.data);
      } else {
        console.error('获取用户资料失败：', response.message);
        setProfileError('获取用户资料失败');
      }
    } catch (err) {
      console.error('获取用户资料出错：', err);
      setProfileError('获取用户资料出错');
    } finally {
      setProfileLoading(false);
    }
  };

  // 获取用户创作的小说
  const fetchAuthoredNovels = async () => {
    try {
      setNovelsLoading(true);
      setNovelsError(null);
      
      // 使用作者页面相同的API获取创作的小说
      const response = await authorAPI.getAuthorNovels();
      
      // 输出API返回的原始数据
      console.log('获取作者小说API返回:', response);
      
      if (response.success) {
        // 检查是否有创作的小说 - 注意novels嵌套在data内
        const novelsData = response.data?.novels || [];
        
        console.log('获取到的小说数据:', novelsData);
        
        if (Array.isArray(novelsData) && novelsData.length > 0) {
          // 输出每本小说的标签信息
          novelsData.forEach((novel, index) => {
            console.log(`小说 #${index + 1} ${novel.title} 的标签信息:`);
            console.log('  - 分类:', novel.categories);
            console.log('  - 标签:', novel.tags);
          });
        
          // 确保每本小说都有正确的状态和统计数据
          const processedNovels = novelsData.map(novel => {
            // 检查categories和tags字段
            const hasCategories = novel.categories && Array.isArray(novel.categories);
            const hasTags = novel.tags && Array.isArray(novel.tags);
            
            // 如果标签存在但不是数组，尝试转换
            const processedCategories = hasCategories ? novel.categories : 
                                      (novel.categories ? [novel.categories] : []);
            const processedTags = hasTags ? novel.tags : 
                                 (novel.tags ? [novel.tags] : []);
            
            return {
              ...novel,
              status: novel.status || 'ongoing',
              isCompleted: novel.status === 'completed',
              readCount: novel.readCount || novel.readers || 0,
              favoriteCount: novel.favoriteCount || novel.collections || 0,
              categories: processedCategories,
              tags: processedTags
            };
          });
          
          console.log('处理后的小说数据:', processedNovels);
          
          setAuthoredNovels(processedNovels);
          setHasNoNovels(false);
          
          // 为每本小说获取章节数
          processedNovels.forEach(novel => {
            fetchNovelChapters(novel._id);
          });
        } else {
          setAuthoredNovels([]);
          setHasNoNovels(true);
        }
      } else {
        console.error('获取创作小说失败：', response.message);
        setNovelsError('获取创作小说失败');
      }
    } catch (error) {
      console.error('获取创作小说出错:', error);
      setNovelsError('获取创作小说出错');
    } finally {
      setNovelsLoading(false);
    }
  };
  
  // 获取小说章节
  const fetchNovelChapters = async (novelId) => {
    try {
      const response = await novelAPI.getNovelChapters(novelId);
      
      if (response.success) {
        // 更新小说章节信息
        setNovelChapters(prev => ({
          ...prev,
          [novelId]: {
            count: response.data.length,
            chapters: response.data.slice(0, 3) // 只保存前3章用于显示
          }
        }));
      } else {
        console.error(`获取小说 ${novelId} 章节失败:`, response.message);
      }
    } catch (err) {
      console.error(`获取小说 ${novelId} 章节错误:`, err);
    }
  };

  // 获取用户收藏的小说
  const fetchFavorites = async () => {
    try {
      console.log("开始获取收藏...");
      setFavoritesLoading(true);
      setFavoritesError(null);
      
      // 修改：获取用户全部收藏，将limit设置为较大值确保获取所有收藏
      const response = await userAPI.getFavorites({ page: 1, limit: 100 }); // 增加limit确保获取所有收藏
      
      if (response.success) {
        console.log('获取到收藏数据:', response.data);
        console.log('收藏总数:', response.total);
        setTotalFavorites(response.total || 0);
        
        // 处理收藏数据，确保每个收藏项都有必要的属性
        const processedFavorites = (response.data || []).map(item => {
          // 检查item.novel是否存在
          if (!item.novel) {
            console.error('收藏项缺少novel数据:', item);
            return null;
          }
          
          console.log(`处理收藏项: ${item.novel.title}`, item.novel);
          
          return {
            ...item,
            novel: {
              ...item.novel,
              readCount: item.novel.readCount || item.novel.readers || 0,
              favoriteCount: item.novel.favoriteCount || item.novel.collections || 0,
              // 确保正确处理categories和tags
              categories: Array.isArray(item.novel.categories) ? item.novel.categories : 
                        (typeof item.novel.categories === 'string' ? [item.novel.categories] : []),
              tags: Array.isArray(item.novel.tags) ? item.novel.tags : 
                   (typeof item.novel.tags === 'string' ? [item.novel.tags] : []),
              isCompleted: item.novel.status === 'completed' || item.novel.status === '已完结',
              status: item.novel.status || 'ongoing', // 确保有状态字段
              totalChapters: item.novel.totalChapters || 0
            }
          };
        }).filter(item => item !== null); // 过滤掉无效的收藏项
        
        console.log('处理后的收藏数据:', processedFavorites);
        setFavorites(processedFavorites);
        
        // 为每本收藏的小说获取章节信息
        processedFavorites.forEach(item => {
          if (item.novel && item.novel._id) {
            fetchNovelChapters(item.novel._id);
          }
        });
      } else {
        console.error('获取收藏失败：', response.message);
        setFavoritesError('获取收藏失败');
      }
    } catch (err) {
      console.error('获取收藏出错：', err);
      setFavoritesError('获取收藏出错');
    } finally {
      setFavoritesLoading(false);
    }
  };

  // 添加新函数：获取特定用户的收藏
  const fetchSpecificUserFavorites = async (targetUserId) => {
    try {
      console.log("开始获取目标用户收藏...");
      setFavoritesLoading(true);
      setFavoritesError(null);
      
      // 调用获取指定用户收藏的API
      const response = await userAPI.getUserFavoritesById(targetUserId);
      
      if (response.success) {
        console.log('获取到目标用户收藏数据:', response.data);
        console.log('目标用户收藏总数:', response.total);
        setTotalFavorites(response.total || 0);
        
        // 处理收藏数据，与fetchFavorites中的处理方式相同
        const processedFavorites = (response.data || []).map(item => {
          if (!item.novel) {
            console.error('收藏项缺少novel数据:', item);
            return null;
          }
          
          return {
            ...item,
            novel: {
              ...item.novel,
              readCount: item.novel.readCount || item.novel.readers || 0,
              favoriteCount: item.novel.favoriteCount || item.novel.collections || 0,
              categories: Array.isArray(item.novel.categories) ? item.novel.categories : 
                        (typeof item.novel.categories === 'string' ? [item.novel.categories] : []),
              tags: Array.isArray(item.novel.tags) ? item.novel.tags : 
                   (typeof item.novel.tags === 'string' ? [item.novel.tags] : []),
              isCompleted: item.novel.status === 'completed' || item.novel.status === '已完结',
              status: item.novel.status || 'ongoing',
              totalChapters: item.novel.totalChapters || 0
            }
          };
        }).filter(item => item !== null);
        
        setFavorites(processedFavorites);
        
        // 为每本收藏的小说获取章节信息
        processedFavorites.forEach(item => {
          if (item.novel && item.novel._id) {
            fetchNovelChapters(item.novel._id);
          }
        });
      } else {
        console.error('获取目标用户收藏失败：', response.message);
        setFavoritesError('获取收藏失败');
      }
    } catch (err) {
      console.error('获取目标用户收藏出错：', err);
      setFavoritesError('获取收藏出错');
    } finally {
      setFavoritesLoading(false);
    }
  };

  // 切换收藏显示状态
  const toggleFavoritesDisplay = () => {
    setShowFavorites(!showFavorites);
  };

  // 处理头像加载错误
  const handleAvatarError = (e) => {
    if (userProfile && userProfile.username) {
      e.target.src = generateTextAvatar(userProfile.username);
    } else if (user && user.username) {
      e.target.src = generateTextAvatar(user.username);
    } else {
      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23777">?</text></svg>';
    }
  };

  // 处理点击小说卡片的事件
  const handleNovelClick = async (novelId, lastReadChapter, hasVisited) => {
    try {
      // 首先更新阅读历史
      await userAPI.addReadingHistory(novelId);
      
      // 如果有阅读历史且已经访问过
      if (lastReadChapter && hasVisited) {
        // 检查lastReadChapter是否为对象
        if (typeof lastReadChapter === 'object' && lastReadChapter.chapterNumber) {
          // 如果是对象，获取chapterNumber属性
          navigate(`/novel/${novelId}/read/${lastReadChapter.chapterNumber}`);
        } else {
          // 直接使用章节号
          navigate(`/novel/${novelId}/read/${lastReadChapter}`);
        }
      } else {
        // 没有阅读历史或首次访问，导航到小说详情页
        navigate(`/novel/${novelId}`);
      }
    } catch (error) {
      console.error('导航到小说页面出错:', error);
      // 出错时直接导航到小说详情页
      navigate(`/novel/${novelId}`);
    }
  };

  // 获取小说状态文本
  const getStatusText = (novel) => {
    if (novel.isCompleted || novel.status === 'completed') {
      return '已完结';
    } else if (novel.status === 'paused' || novel.status === '暂停更新') {
      return '暂停更新';
    } else {
      return '连载中';
    }
  };

  // 截断文本，并在末尾添加省略号
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!isAuthenticated) {
    return null; // 用户未登录，返回空
  }

  return (
    <div className="user-home-page" style={pageStyle}>
      <div style={containerStyle}>
        {/* 如果有错误且没有用户资料，显示错误信息 */}
        {profileError && !userProfile ? (
          <div className="alert alert-danger mt-4" role="alert">
            {profileError === '未找到用户' ? '该用户不存在' : profileError}
          </div>
        ) : (
          <>
            {/* 用户基本信息卡片 */}
            <div className="card mb-4" style={{...cardStyle}}>
              <div className="card-body d-flex" style={{...cardBodyStyle, padding: '1.5rem'}}>
                <div className="me-4" style={{ width: '100px', height: '100px', flexShrink: 0 }}>
                  {profileLoading ? (
                    <div className="text-center w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: isDark ? '#2a2a2a' : '#f0f0f0', borderRadius: '50%' }}>
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">加载中...</span>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={userProfile?.avatar ? getFullImageUrl(userProfile.avatar) : generateTextAvatar(userProfile?.username || 'U')} 
                      alt="用户头像" 
                      className="rounded-circle img-fluid"
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                      onError={handleAvatarError}
                    />
                  )}
                </div>
                <div className="flex-grow-1">
                  {profileLoading ? (
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">加载中...</span>
                    </div>
                  ) : (
                    <div>
                      <h2 className="mb-2" style={{ color: theme.text }}>{userProfile?.username || '用户'}</h2>
                      {userProfile?.penName && (
                        <h5 className="mb-3" style={{ color: theme.textSecondary }}>笔名: {userProfile.penName}</h5>
                      )}
                      <p className="mb-3" style={{ color: theme.text }}>
                        {userProfile?.profile?.bio || userProfile?.bio || '这个用户还没有填写个人简介'}
                      </p>
                      
                      {/* 只有查看自己的主页时才显示这些按钮 */}
                      {isSelfProfile && (
                        <div className="d-flex flex-wrap mt-3">
                          <Link to="/profile" className="btn btn-outline-primary me-2 mb-2">
                            编辑个人资料
                          </Link>
                          <Link to="/author/dashboard" className="btn btn-outline-secondary me-2 mb-2">
                            作者仪表盘
                          </Link>
                          <Link to="/reader/favorites" className="btn btn-outline-success me-2 mb-2">
                            所有收藏
                          </Link>
                          <Link to="/reader/history" className="btn btn-outline-info mb-2">
                            阅读历史
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 用户创作的小说部分 */}
            <div className="card" style={{...cardStyle}}>
              <div className="card-header" style={{...cardHeaderStyle}}>
                <h4>{isSelfProfile ? '我的创作' : `${userProfile?.username || '用户'}的创作`}</h4>
              </div>
              <div className="card-body" style={{...cardBodyStyle}}>
                {novelsLoading ? (
                  <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">加载中...</span>
                    </div>
                  </div>
                ) : (userProfile?.novelCount > 0 && authoredNovels.length === 0) ? (
                  <div className="text-center p-5">
                    <p>{`${userProfile?.username || '该用户'}有${userProfile.novelCount}部作品，但它们可能未公开发布。`}</p>
                    {isSelfProfile && (
                      <div className="mt-3">
                        <p>要查看和管理您的所有创作，请访问作者仪表盘。</p>
                        <Link to="/author/dashboard" className="btn btn-primary mt-2">
                          前往作者仪表盘
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (authoredNovels.length === 0) ? (
                  <div className="text-center p-5">
                    <p>{isSelfProfile ? 
                      '你还没有创作小说。点击下方按钮开始你的创作之旅！' : 
                      `${userProfile?.username || '该用户'}还没有创作小说。`}</p>
                    
                    {isSelfProfile && (
                      <Link to="/author/create" className="btn btn-primary mt-3">
                        开始创作
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="row g-4">
                    {authoredNovels.map(novel => (
                      <div key={novel._id} className="col-12 col-md-6 col-lg-4">
                        <div 
                          className="card h-100 hover-lift" 
                          style={novelCardStyle}
                          onClick={() => navigate(`/novel/${novel._id}`)}
                        >
                          <div className="position-relative">
                            <img
                              src={novel.cover ? getFullImageUrl(novel.cover) : '/images/default-cover.jpg'}
                              alt={novel.title}
                              style={coverStyle}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/default-cover.jpg';
                              }}
                            />
                            
                            {/* 状态标签 */}
                            <div 
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                backgroundColor: novel.status === 'completed' ? '#dc3545' :
                                               novel.status === 'paused' ? '#ffc107' : '#28a745',
                                color: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                              }}
                            >
                              {getStatusText(novel)}
                            </div>
                          </div>
                          
                          <div className="card-body d-flex flex-column" style={novelCardBodyStyle}>
                            <h5 className="card-title" style={{ fontSize: '1.1rem', color: theme.text }}>《{novel.title}》</h5>
                            
                            {/* 章节数量和统计信息 */}
                            <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.9rem', color: theme.textSecondary }}>
                              <span>共 {novelChapters[novel._id]?.count || novel.totalChapters || 0} 章</span>
                              <div className="d-flex">
                                <span title="阅读量" className="me-2"><i className="bi bi-eye"></i> {novel.readCount || novel.readers || 0}</span>
                                <span title="收藏量"><i className="bi bi-bookmark"></i> {novel.favoriteCount || novel.collections || 0}</span>
                              </div>
                            </div>
                            
                            {/* 小说简介 - 添加展开/收起功能 */}
                            {novel.shortDescription && (
                              <div>
                                <p className="card-text" style={{ fontSize: '0.9rem', color: theme.text, flex: '1' }}>
                                  {expandedDesc[novel._id] 
                                    ? novel.shortDescription 
                                    : truncateText(novel.shortDescription, 100)}
                                  {novel.shortDescription.length > 100 && (
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDescExpand(novel._id);
                                      }}
                                      style={{ 
                                        color: theme.accent, 
                                        cursor: 'pointer',
                                        marginLeft: '5px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {expandedDesc[novel._id] ? ' 收起' : ' 查看更多'}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                            
                            {/* 标签 */}
                            <div className="mt-2">
                              {(() => {
                                // 合并categories和tags
                                const allTags = [];
                                
                                // 调试输出
                                console.log(`小说${novel.title}的标签信息:`, {
                                  categories: novel.categories,
                                  tags: novel.tags
                                });
                                
                                if (novel.categories && novel.categories.length > 0) {
                                  // 过滤掉"其他"标签
                                  const filteredCategories = novel.categories.filter(cat => cat !== '其他');
                                  allTags.push(...filteredCategories);
                                }
                                if (novel.tags && novel.tags.length > 0) {
                                  allTags.push(...novel.tags);
                                }
                                
                                console.log(`合并后的标签:`, allTags);
                                
                                // 没有标签时显示"其他"
                                if (allTags.length === 0) {
                                  return <span style={tagStyle}>其他</span>;
                                }
                                
                                // 展开状态或标签数量少于4个时显示所有标签
                                if (expandedTags[novel._id] || allTags.length <= 3) {
                                  return (
                                    <>
                                      {allTags.map((tag, index) => (
                                        <span key={`tag-${novel._id}-${index}`} style={tagStyle}>{tag}</span>
                                      ))}
                                      {allTags.length > 3 && (
                                        <span 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTagsExpand(novel._id);
                                          }}
                                          style={{ 
                                            color: theme.accent, 
                                            cursor: 'pointer',
                                            marginLeft: '5px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          收起标签
                                        </span>
                                      )}
                                    </>
                                  );
                                } else {
                                  // 未展开且标签数量超过3个时，只显示前3个
                                  return (
                                    <>
                                      {allTags.slice(0, 3).map((tag, index) => (
                                        <span key={`tag-${novel._id}-${index}`} style={tagStyle}>{tag}</span>
                                      ))}
                                      {allTags.length > 3 && (
                                        <span 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTagsExpand(novel._id);
                                          }}
                                          style={{ 
                                            color: theme.accent, 
                                            cursor: 'pointer',
                                            marginLeft: '5px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          查看全部标签
                                        </span>
                                      )}
                                    </>
                                  );
                                }
                              })()}
                            </div>
                            
                            {/* 底部信息栏：更新时间或最新章节 */}
                            <div className="mt-auto pt-2" style={{ fontSize: '0.85rem', color: theme.textSecondary, borderTop: `1px solid ${theme.border}` }}>
                              <div className="d-flex justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-clock me-1"></i>
                                  更新于：{novel.updatedAt ? new Date(novel.updatedAt).toLocaleDateString() : '未知'}
                                </span>
                                {novelChapters[novel._id]?.chapters && novelChapters[novel._id].chapters.length > 0 && (
                                  <span 
                                    className="text-truncate" 
                                    style={{ maxWidth: '60%' }}
                                    title={novelChapters[novel._id].chapters[0].title}
                                  >
                                    最新: {truncateText(novelChapters[novel._id].chapters[0].title, 15)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 创建新小说的卡片 - 只有查看自己的主页时才显示 */}
            {isSelfProfile && (
              <div className="card" style={{...cardStyle}}>
                <div className="card-header" style={{...cardHeaderStyle}}>
                  <h4>创建新小说</h4>
                </div>
                <div className="card-body" style={{...cardBodyStyle}}>
                  <div className="text-center py-4">
                    <p className="mb-3">有新的创作灵感？开始创作新的小说吧！</p>
                    <Link to="/author/novels/create" className="btn btn-primary">
                      开始创作
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 收藏的小说部分 */}
            {showFavorites && (
              <div className="card" style={{...cardStyle}}>
                <div className="card-header d-flex justify-content-between align-items-center" style={{...cardHeaderStyle}}>
                  <h4>{isSelfProfile ? '我的收藏' : `${userProfile?.username || '用户'}的收藏`}{favorites.length > 0 ? ` (${favorites.length})` : ''}</h4>
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      color: theme.text
                    }}
                    onClick={toggleFavoritesDisplay}
                  >
                    {showFavorites ? '收起' : '展开'}
                  </button>
                </div>
                <div className="card-body" style={{...cardBodyStyle}}>
                  {favoritesLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border" style={{ color: theme.accent }} role="status">
                        <span className="visually-hidden">加载中...</span>
                      </div>
                    </div>
                  ) : favorites.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="mb-0" style={{ color: theme.text }}>还没有收藏小说</p>
                    </div>
                  ) : (
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                      {favorites.map(item => (
                        <div key={item._id} className="col">
                          <div 
                            style={{
                              ...favoriteItemStyle,
                              backgroundColor: theme.cardBg
                            }} 
                            className="favorite-card hover-lift"
                            onClick={() => handleNovelClick(item.novel._id, item.novel.lastReadChapter, item.novel.hasVisited)}
                          >
                            <div className="d-flex">
                              {/* 小说封面 */}
                              <div style={{
                                minWidth: '90px',
                                width: '90px', 
                                height: '135px',
                                overflow: 'hidden',
                                borderRadius: '4px',
                                marginRight: '15px',
                                position: 'relative'
                              }}>
                                {/* 只保留已完结标签 */}
                                {item.novel.isCompleted && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '0',
                                    left: '0',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    padding: '2px 8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    borderRadius: '0 0 4px 0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 1
                                  }}>
                                    已完结
                                  </div>
                                )}
                              
                                <img 
                                  src={getFullImageUrl(item.novel.cover, '/images/default-cover.jpg')}
                                  alt={item.novel.title}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                  }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/default-cover.jpg';
                                  }}
                                />
                              </div>
                              
                              {/* 小说信息 */}
                              <div className="d-flex flex-column justify-content-between flex-grow-1">
                                <div>
                                  <h5 style={{ color: theme.text, marginBottom: '5px', fontSize: '1rem' }}>
                                    《{item.novel.title || '无标题'}》
                                  </h5>
                                  <p style={{ 
                                    color: theme.textSecondary, 
                                    fontSize: '0.9rem',
                                    marginBottom: '5px'
                                  }}>
                                    作者：{item.novel.author || item.novel.authorName || '佚名'}
                                  </p>
                                  <div className="d-flex align-items-center mb-2">
                                    <span style={getStatusStyle(item.novel)}>
                                      {getStatusText(item.novel)}
                                    </span>
                                    <span style={{
                                      fontSize: '0.8rem', 
                                      color: theme.textSecondary,
                                      marginLeft: '8px'
                                    }}>
                                      {item.novel.totalChapters || novelChapters[item.novel._id]?.count || 0}章
                                    </span>
                                  </div>
                                  
                                  {/* 统计信息 */}
                                  <div style={{ 
                                    display: 'flex', 
                                    fontSize: '0.8rem', 
                                    color: theme.textSecondary,
                                    marginBottom: '5px'
                                  }}>
                                    <span title="阅读量" className="me-3">
                                      <i className="bi bi-eye me-1"></i>
                                      {(() => {
                                        // 调试输出
                                        console.log(`小说 ${item.novel.title} 的阅读量:`, 
                                          item.novel.readCount, item.novel.readers);
                                        return item.novel.readCount || item.novel.readers || 0;
                                      })()}
                                    </span>
                                    <span title="收藏量">
                                      <i className="bi bi-bookmark me-1"></i>
                                      {(() => {
                                        // 调试输出
                                        console.log(`小说 ${item.novel.title} 的收藏量:`, 
                                          item.novel.favoriteCount, item.novel.collections);
                                        return item.novel.favoriteCount || item.novel.collections || 0;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* 最近更新时间 */}
                                {item.novel.updatedAt && (
                                  <div style={{ 
                                    fontSize: '0.8rem', 
                                    color: theme.textSecondary,
                                    marginTop: '5px'
                                  }}>
                                    <i className="bi bi-clock-history me-1"></i>
                                    更新于：{new Date(item.novel.updatedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserHome;
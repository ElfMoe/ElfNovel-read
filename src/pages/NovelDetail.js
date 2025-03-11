import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { novelAPI, userAPI, commentAPI } from '../services/api';
import { checkTokenValidity, testNovelDetailAPI } from '../services/debugHelper';
import { getFullImageUrl, generateTextAvatar } from '../utils/imageUtils';
import '../styles/ChapterList.css';  // 导入相同的样式文件
import '../styles/global.css';
import axios from 'axios';

function NovelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useUser();

  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notification, setNotification] = useState(null); // 添加消息通知状态
  
  // 添加新的状态来控制回复功能
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  
  // 添加删除确认对话框状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(''); // 'comment' 或 'reply'
  const [parentCommentId, setParentCommentId] = useState(null); // 用于回复的删除
  
  // 添加本地错误提示状态
  const [localErrors, setLocalErrors] = useState({});
  
  // 添加强制刷新状态
  const [refreshFlag, setRefreshFlag] = useState(0);
  
  // 添加控制回复显示的状态
  const [expandedReplies, setExpandedReplies] = useState({});
  
  // 添加用于导航到用户主页的函数
  const navigateToUserProfile = (userId) => {
    if (userId) {
      navigate(`/user/${userId}`);
    } else {
      console.log('无法导航：用户ID不存在');
      setNotification({
        type: 'warning',
        message: '无法访问该用户主页'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };
  
  // 获取小说详情信息
  useEffect(() => {
    const fetchNovelDetail = async () => {
      try {
        setLoading(true);
        
        // 检查登录状态和令牌有效性
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          checkTokenValidity();
        }
        
        console.log('开始获取小说详情，ID:', id);
        
        // 尝试获取小说详情
        let novelResponse;
        try {
          // 使用API服务
          novelResponse = await novelAPI.getNovelDetail(id);
          console.log('通过API服务获取小说详情结果:', novelResponse);
        } catch (apiError) {
          console.error('API服务获取小说详情失败，尝试直接测试:', apiError);
          
          // 如果API服务失败，尝试直接测试
          novelResponse = await testNovelDetailAPI(id);
          console.log('直接测试获取小说详情结果:', novelResponse);
        }
        
        if (!novelResponse.success) {
          setError(novelResponse.message || '获取小说详情失败');
          return;
        }
        
        // 打印标签信息
        console.log('小说标签 - categories:', novelResponse.data.categories);
        console.log('小说标签 - tags:', novelResponse.data.tags);
        
        // 打印作者信息
        console.log('小说作者信息:', {
          authorName: novelResponse.data.authorName,
          creator: novelResponse.data.creator
        });
        
        // 设置小说数据
        setNovel(novelResponse.data);
        
        // 获取章节列表
        try {
          const chaptersResponse = await novelAPI.getNovelChapters(id);
          console.log('章节列表API完整响应:', chaptersResponse);
          
          if (chaptersResponse.success) {
            // 设置章节列表，只取前3章用于显示
            setChapters(chaptersResponse.data.slice(0, 3));
          } else {
            console.error('获取章节列表失败:', chaptersResponse.message);
          }
        } catch (chapterError) {
          console.error('获取章节列表出错:', chapterError);
        }
        
        // 检查是否已收藏（仅当用户已登录）
        if (isAuthenticated) {
          try {
            const favoriteResponse = await userAPI.checkFavorite(id);
            if (favoriteResponse.success) {
              setIsFavorite(favoriteResponse.isFavorite);
            }
          } catch (favoriteError) {
            console.error('检查收藏状态出错:', favoriteError);
          }
          
          // 记录用户访问历史
          try {
            console.log('记录用户访问历史:', id);
            const historyResponse = await userAPI.addReadingHistory(id);
            if (historyResponse.success) {
              console.log('访问历史记录成功:', historyResponse.data);
            } else {
              console.error('访问历史记录失败:', historyResponse.message);
            }
          } catch (historyError) {
            console.error('记录访问历史失败:', historyError);
          }
        }
      } catch (err) {
        console.error('加载小说详情出错:', err);
        setError('加载小说详情时发生错误，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNovelDetail();
    
    // 加载评论
    fetchNovelComments();
    
  }, [id, isAuthenticated, refreshFlag]);  // 依赖项添加isAuthenticated
  
  // 加入/移除书架
  const toggleFavorite = async () => {
    // 检查用户是否已登录
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      navigate('/login', { state: { from: `/novel/${id}` } });
      return;
    }
    
    try {
      if (isFavorite) {
        // 尝试移除收藏
        console.log('尝试移除收藏，小说ID:', id);
        const response = await userAPI.removeFromFavorites(id);
        console.log('移除收藏响应:', response);
        
        if (response.success) {
          setIsFavorite(false);
          // 显示成功消息
          showNotification('已从书架移除');
        } else {
          console.error('移除收藏失败:', response.message);
          
          // 如果是未找到收藏的错误，可能是前后端状态不一致，自动修正状态
          if (response.message && (
              response.message.includes('未找到') || 
              response.message.includes('not found') ||
              response.message.includes('无权限')
          )) {
            console.log('收藏可能已被移除，更新状态为未收藏');
            setIsFavorite(false);
          } else {
            // 其他错误才显示提示
            showNotification('从书架移除失败: ' + (response.message || '未知错误'), 'error');
          }
        }
      } else {
        // 尝试添加收藏
        console.log('尝试添加收藏，小说ID:', id);
        const response = await userAPI.addToFavorites(id);
        console.log('添加收藏响应:', response);
        
        if (response.success) {
          setIsFavorite(true);
          // 显示成功消息
          showNotification('已添加到书架');
        } else {
          console.error('添加收藏失败:', response.message);
          
          // 如果是已收藏的错误，自动修正状态
          if (response.message && (
              response.message.includes('已收藏') || 
              response.message.includes('already')
          )) {
            console.log('小说可能已被收藏，更新状态为已收藏');
            setIsFavorite(true);
          } else {
            // 其他错误才显示提示
            showNotification('添加到书架失败: ' + (response.message || '未知错误'), 'error');
          }
        }
      }
    } catch (err) {
      console.error('操作收藏出错:', err);
      showNotification('操作失败，请稍后再试', 'error');
    }
  };

  // 获取小说留言（包括章节留言）
  const fetchNovelComments = async (page = 1) => {
    try {
      setCommentLoading(true);
      setCommentError(null);

      const response = await commentAPI.getNovelComments(id, page);

      if (response.success) {
        console.log('获取到的评论数据:', response.data.comments);
        // 检查每条评论是否有replies字段
        response.data.comments.forEach(comment => {
          console.log(`评论ID: ${comment._id}，回复数量:`, comment.replies ? comment.replies.length : 0);
        });
        
        setComments(response.data.comments);
        setTotalComments(response.data.pagination.total);
      } else {
        setCommentError(response.message || '获取留言失败');
      }
    } catch (err) {
      console.error('获取小说留言失败:', err);
      setCommentError(err.message || '获取留言失败，请稍后再试');
    } finally {
      setCommentLoading(false);
    }
  };

  // 提交新留言
  const handleSubmitComment = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setCommentError('请先登录后再发表留言');
      return;
    }

    if (!newComment.trim()) {
      setCommentError('留言内容不能为空');
      return;
    }

    try {
      setSubmitting(true);
      setCommentError(null);

      const response = await commentAPI.createComment({
        content: newComment,
        novelId: id
      });

      if (response.success) {
        setNewComment('');
        setCommentSuccess('留言发布成功！');

        // 刷新留言列表
        fetchNovelComments();

        // 3秒后清除成功消息
        setTimeout(() => {
          setCommentSuccess(null);
        }, 3000);
      } else {
        setCommentError(response.message || '发布留言失败');
      }
    } catch (err) {
      console.error('发布留言失败:', err);
      setCommentError(err.message || '发布留言失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  // 点赞留言
  const handleLikeComment = async (commentId) => {
    if (!isAuthenticated) {
      setCommentError('请先登录后再点赞');
      return;
    }

    try {
      const response = await commentAPI.likeComment(commentId);

      if (response.success) {
        // 更新留言列表中的点赞数
        setComments(comments.map(comment =>
          comment._id === commentId
            ? { ...comment, likes: response.data.likes, likedBy: [...(comment.likedBy || []), user._id] }
            : comment
        ));
      }
    } catch (err) {
      console.error('点赞失败:', err);
      setCommentError(err.message || '点赞失败，请稍后再试');
    }
  };

  // 取消点赞
  const handleUnlikeComment = async (commentId) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await commentAPI.unlikeComment(commentId);

      if (response.success) {
        // 更新留言列表中的点赞数
        setComments(comments.map(comment =>
          comment._id === commentId
            ? {
                ...comment,
                likes: response.data.likes,
                likedBy: (comment.likedBy || []).filter(id => id !== user._id)
              }
            : comment
        ));
      }
    } catch (err) {
      console.error('取消点赞失败:', err);
    }
  };

  // 页码变化
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchNovelComments(page);
  };

  // 渲染分页控件
  const renderPagination = () => {
    if (totalComments <= 10) return null;

    const totalPages = Math.ceil(totalComments / 10);

    // 简单的分页控件
    return (
      <div className="d-flex justify-content-center mt-4">
        <nav>
          <ul className="pagination">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  backgroundColor: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
              >
                上一页
              </button>
            </li>
            {[...Array(totalPages).keys()].map(page => (
              <li key={page + 1} className={`page-item ${currentPage === page + 1 ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page + 1)}
                  style={{
                    backgroundColor: currentPage === page + 1 ? theme.accent : theme.cardBg,
                    color: currentPage === page + 1 ? 'white' : theme.text,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  {page + 1}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  backgroundColor: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`
                }}
              >
                下一页
              </button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  // 留言相关状态
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentError, setCommentError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(null);

  // 显示通知的函数
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    
    // 3秒后自动清除通知
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const containerStyle = {
    backgroundColor: theme.background,
    color: theme.text,
    minHeight: '100vh',
    padding: '2rem 0'
  };

  const cardStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    padding: '2rem',
    marginBottom: '2rem',
    maxWidth: '1000px',
    margin: '0 auto 2rem auto'
  };

  const buttonStyle = {
    backgroundColor: theme.accent,
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const tagStyle = {
    backgroundColor: theme.secondary,
    color: theme.text,
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    margin: '0.25rem',
    display: 'inline-block',
    fontSize: '0.875rem'
  };

  const commentStyle = {
    padding: '1rem',
    marginBottom: '1rem',
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    transition: 'all 0.3s ease'
  };

  const textareaStyle = {
    backgroundColor: theme.inputBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    padding: '0.75rem',
    width: '100%',
    minHeight: '100px',
    resize: 'vertical'
  };

  // 开始阅读，跳转到阅读页面
  const startReading = () => {
    navigate(`/novel/${id}/read`);
  };

  // 处理用户头像URL的函数
  const getUserAvatar = (user) => {
    if (!user) {
      return '/images/avatars/default-avatar.jpg';
    }
    
    // 如果有avatar并且是完整URL则直接返回
    if (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
      return user.avatar;
    }
    
    // 如果有avatar但不是完整URL，则添加域名前缀
    if (user.avatar && user.avatar !== 'undefined' && user.avatar !== 'null' && user.avatar !== '/images/default-avatar.jpg') {
      // 使用getFullImageUrl处理路径
      return typeof getFullImageUrl === 'function' 
        ? getFullImageUrl(user.avatar) 
        : `${window.location.origin}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`;
    }
    
    // 如果没有头像或是默认头像，使用generateTextAvatar生成文本头像
    if (user.username) {
      try {
        // 为用户生成一个固定的背景色（基于用户名）
        const generateColorFromUsername = (username) => {
          let hash = 0;
          for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
          }
          const color = '#' + ('000000' + (hash & 0xFFFFFF).toString(16)).slice(-6);
          return color;
        };
        
        const backgroundColor = generateColorFromUsername(user.username);
        return generateTextAvatar(user.username, backgroundColor);
      } catch (err) {
        console.error('生成文本头像失败:', err);
      }
    }
    
    // 如果上述方法都失败，返回默认头像
    return '/images/avatars/default-avatar.jpg';
  };

  // 处理回复提交
  const handleSubmitReply = async (e, commentId, replyToUserId) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setCommentError('请先登录后再回复留言');
      return;
    }
    
    if (!replyContent.trim()) {
      setCommentError('回复内容不能为空');
      return;
    }
    
    try {
      setReplySubmitting(true);
      setCommentError(null);
      
      // 构建回复数据
      const replyData = {
        content: replyContent,
        novelId: id,
        commentId: replyingTo.parentComment || commentId // 使用parentComment或原始commentId
      };
      
      // 如果是回复的回复，添加对应用户ID
      if (replyToUserId) {
        replyData.replyToUserId = replyToUserId;
      }
      
      console.log('发送回复数据:', replyData);
      
      const response = await commentAPI.replyToComment(replyData);
      
      if (response.success) {
        setReplyContent('');
        setReplyingTo(null);
        setCommentSuccess('回复发布成功！');
        
        // 刷新留言列表
        await fetchNovelComments();
        
        // 自动展开被回复的评论的回复列表
        setExpandedReplies(prev => ({
          ...prev,
          [commentId]: true
        }));
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setCommentSuccess(null);
        }, 3000);
      } else {
        setCommentError(response.message || '回复发布失败');
      }
    } catch (err) {
      console.error('回复留言失败:', err);
      setCommentError(err.message || '回复发布失败，请稍后再试');
    } finally {
      setReplySubmitting(false);
    }
  };

  // 处理展开/折叠回复的函数
  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // 修改回复渲染函数，添加回复点赞和回复功能
  const renderReplies = (comment) => {
    if (!comment.replies || comment.replies.length === 0) return null;
    
    const isExpanded = expandedReplies[comment._id] || false;
    const replyCount = comment.replies.length;
    
    return (
      <div 
        style={{ 
          marginTop: '0.8rem',
          paddingLeft: '1.5rem',
          borderLeft: `2px solid ${theme.border}`
        }}
        className="replies"
      >
        {/* 回复折叠/展开按钮 */}
        <div 
          style={{ 
            padding: '0.5rem 0', 
            color: theme.accent,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            marginBottom: isExpanded ? '0.8rem' : 0
          }}
          onClick={() => toggleReplies(comment._id)}
        >
          <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} me-1`}></i>
          {isExpanded ? '收起回复' : `查看全部 ${replyCount} 条回复`}
        </div>
        
        {/* 回复列表 */}
        {isExpanded && comment.replies.map(reply => (
          <div 
            key={reply._id} 
            style={{
              padding: '0.8rem',
              marginBottom: '0.8rem',
              backgroundColor: `${theme.cardBg}70`,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`
            }}
          >
            <div className="d-flex align-items-start gap-2">
              <img
                src={getUserAvatar(reply.user)}
                alt={reply.user?.username || '用户'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `1px solid ${theme.border}`,
                  cursor: reply.user?._id ? 'pointer' : 'default'
                }}
                onClick={() => reply.user?._id ? navigateToUserProfile(reply.user._id) : null}
                title={reply.user?._id ? "查看用户主页" : ""}
                onError={(e) => {
                  console.log('头像加载失败，使用默认头像');
                  e.target.src = '/images/avatars/default-avatar.jpg';
                }}
              />
              <div style={{ flex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div 
                    style={{ 
                      color: theme.accent, 
                      fontWeight: 'bold', 
                      fontSize: '0.95rem',
                      cursor: reply.user?._id ? 'pointer' : 'default',
                      textDecoration: reply.user?._id ? 'underline' : 'none',
                    }}
                    onClick={() => reply.user?._id ? navigateToUserProfile(reply.user._id) : null}
                    title={reply.user?._id ? "查看用户主页" : ""}
                  >
                    {reply.user?.penName || reply.user?.username}
                  </div>
                  <div style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                    {new Date(reply.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                
                {/* 如果是回复其他回复，显示回复对象 */}
                {reply.replyToUser && (
                  <div style={{
                    color: theme.textSecondary,
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    回复 <span style={{ color: theme.accent }}>{reply.replyToUser?.penName || reply.replyToUser?.username}</span>
                  </div>
                )}
                
                <div style={{ 
                  color: theme.text,
                  marginBottom: '0.5rem',
                  fontSize: '1rem'
                }}>
                  {reply.content}
                </div>
                
                {/* 回复的操作按钮：点赞和回复 */}
                <div className="d-flex align-items-center gap-3">
                  {/* 点赞按钮 */}
                  <button
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: (reply.likedBy || []).includes(user?._id) ? theme.accent : theme.textSecondary,
                      cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if ((reply.likedBy || []).includes(user?._id)) {
                        handleUnlikeComment(reply._id);
                      } else {
                        handleLikeComment(reply._id);
                      }
                    }}
                    disabled={!isAuthenticated}
                  >
                    <i className={`bi ${(reply.likedBy || []).includes(user?._id) ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}></i>
                    <span className="ms-1">{reply.likes || 0}</span>
                  </button>
                  
                  {/* 回复按钮 */}
                  <button
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: replyingTo?._id === reply._id ? theme.accent : theme.textSecondary,
                      cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      console.log('点击回复按钮 (回复)', reply._id);
                      if (!isAuthenticated) {
                        setCommentError('请先登录后再回复留言');
                        return;
                      }
                      
                      // 如果当前已经选中了这条回复，取消选中
                      if (replyingTo && replyingTo._id === reply._id) {
                        setReplyingTo(null);
                      } else {
                        // 否则选中当前回复，并记住这是对评论的回复
                        setReplyingTo({
                          ...reply,
                          parentComment: comment._id // 记录父评论ID
                        });
                        setReplyContent('');
                      }
                      // 强制刷新组件
                      setRefreshFlag(prev => prev + 1);
                    }}
                    disabled={!isAuthenticated}
                  >
                    <i className="bi bi-reply"></i>
                    <span className="ms-1">回复{replyingTo?._id === reply._id ? '中' : ''}</span>
                  </button>

                  {/* 回复的删除按钮 */}
                  {canDeleteComment(reply) && (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: theme.danger || '#dc3545',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleDeleteReply(reply._id, comment._id)}
                      title="删除回复"
                    >
                      <i className="bi bi-trash"></i>
                      <span className="ms-1">删除</span>
                    </button>
                  )}
                </div>
                
                {/* 如果当前正在回复这条回复，显示回复表单 */}
                {replyingTo && replyingTo._id === reply._id && (
                  <div 
                    style={{ 
                      backgroundColor: `${theme.cardBg}80`,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '1rem' 
                    }}
                    className="nested-reply-form"
                  >
                    <div className="d-flex align-items-center mb-2">
                      <small style={{ color: theme.textSecondary }}>
                        回复给: <span style={{ color: theme.accent }}>{reply.user?.penName || reply.user?.username}</span>
                      </small>
                      <button 
                        className="ms-auto btn-close" 
                        style={{ fontSize: '0.7rem' }}
                        onClick={() => {
                          console.log('关闭回复表单');
                          setReplyingTo(null);
                        }}
                        aria-label="关闭"
                      ></button>
                    </div>
                    
                    <form onSubmit={(e) => handleSubmitReply(e, comment._id, reply.user?._id)}>
                      <div className="mb-2">
                        <textarea
                          style={{
                            ...textareaStyle,
                            minHeight: '80px'
                          }}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="写下你的回复..."
                          disabled={!isAuthenticated || replySubmitting}
                        />
                      </div>
                      
                      <div className="d-flex justify-content-end">
                        <button
                          type="submit"
                          style={{
                            ...buttonStyle,
                            fontSize: '0.9rem',
                            padding: '0.3rem 0.8rem',
                            opacity: isAuthenticated && !replySubmitting ? 1 : 0.6,
                            cursor: isAuthenticated && !replySubmitting ? 'pointer' : 'not-allowed'
                          }}
                          disabled={!isAuthenticated || replySubmitting}
                        >
                          {replySubmitting ? '提交中...' : '发布回复'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 修改回复表单渲染函数，添加更多调试信息
  const renderReplyForm = (comment) => {
    console.log('渲染回复表单', {
      replyingTo: replyingTo?._id,
      commentId: comment._id,
      shouldShow: replyingTo?._id === comment._id
    });
    
    if (!replyingTo || replyingTo._id !== comment._id) return null;
    
    return (
      <div 
        style={{ 
          backgroundColor: `${theme.cardBg}80`, // 透明度80%
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem' 
        }}
        className="reply-form"
      >
        <div className="d-flex align-items-center mb-2">
          <small style={{ color: theme.textSecondary }}>
            回复给: <span style={{ color: theme.accent }}>{comment.user?.penName || comment.user?.username}</span>
          </small>
          <button 
            className="ms-auto btn-close" 
            style={{ fontSize: '0.7rem' }}
            onClick={() => {
              console.log('关闭回复表单');
              setReplyingTo(null);
            }}
            aria-label="关闭"
          ></button>
        </div>
        
        <form onSubmit={(e) => handleSubmitReply(e, comment._id, replyingTo.user?._id)}>
          <div className="mb-2">
            <textarea
              style={{
                ...textareaStyle,
                minHeight: '80px'
              }}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="写下你的回复..."
              disabled={!isAuthenticated || replySubmitting}
            />
          </div>
          
          <div className="d-flex justify-content-end">
            <button
              type="submit"
              style={{
                ...buttonStyle,
                fontSize: '0.9rem',
                padding: '0.3rem 0.8rem',
                opacity: isAuthenticated && !replySubmitting ? 1 : 0.6,
                cursor: isAuthenticated && !replySubmitting ? 'pointer' : 'not-allowed'
              }}
              disabled={!isAuthenticated || replySubmitting}
            >
              {replySubmitting ? '提交中...' : '发布回复'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // 修改删除评论的处理函数
  const handleDeleteComment = async (commentId) => {
    // 检查权限
    const comment = comments.find(c => c._id === commentId);
    if (!comment) return;

    if (!canDeleteComment(comment)) {
      // 没有权限，直接显示错误消息
      setLocalErrors({
        ...localErrors,
        [commentId]: '您没有权限删除此留言'
      });
      
      // 3秒后自动清除错误消息
      setTimeout(() => {
        setLocalErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[commentId];
          return newErrors;
        });
      }, 3000);
      return;
    }
    
    // 有权限，显示确认对话框
    setCommentToDelete(commentId);
    setDeleteType('comment');
    setShowDeleteModal(true);
  };

  // 检查用户是否可以删除评论
  const canDeleteComment = (comment) => {
    console.log('======= 权限检查开始 =======');
    console.log('用户对象:', user);
    console.log('认证状态:', isAuthenticated);
    console.log('评论对象:', comment);
    console.log('小说对象:', novel);
    
    if (!user || !isAuthenticated) {
      console.log('用户未登录，不能删除评论');
      return false;
    }
    
    // 确保评论和用户ID是字符串类型进行比较，修正字段名不匹配的问题
    const commentUserId = comment.user && comment.user._id ? String(comment.user._id) : '';
    // 用户对象使用id而不是_id
    const currentUserId = user.id ? String(user.id) : '';
    // 从novel.creator获取作者ID，而不是novel.author._id
    const novelAuthorId = novel && novel.creator ? String(novel.creator) : '';
    
    // 用户可以删除自己的评论
    const isCommentAuthor = commentUserId === currentUserId;
    console.log('权限检查 - 是否是评论作者:', isCommentAuthor, 
                '评论用户ID:', commentUserId, 
                '当前用户ID:', currentUserId);
    
    // 作者可以删除自己作品下的评论
    const isNovelAuthor = novelAuthorId && currentUserId === novelAuthorId;
    console.log('权限检查 - 是否是小说作者:', isNovelAuthor, 
                '小说作者ID:', novelAuthorId);
    
    // 管理员可以删除任何评论
    const isAdmin = user.role === 'admin';
    console.log('权限检查 - 是否是管理员:', isAdmin, '用户角色:', user.role);
    
    const canDelete = isCommentAuthor || isNovelAuthor || isAdmin;
    console.log('最终删除权限:', canDelete);
    console.log('======= 权限检查结束 =======');
    
    return canDelete;
  };

  // 修改删除回复的处理函数
  const handleDeleteReply = async (replyId, commentId) => {
    // 找到评论和回复
    const comment = comments.find(c => c._id === commentId);
    if (!comment || !comment.replies) return;
    
    const reply = comment.replies.find(r => r._id === replyId);
    if (!reply) return;
    
    if (!canDeleteComment(reply)) {
      // 没有权限，直接显示错误消息
      setLocalErrors({
        ...localErrors,
        [replyId]: '您没有权限删除此回复'
      });
      
      // 3秒后自动清除错误消息
      setTimeout(() => {
        setLocalErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[replyId];
          return newErrors;
        });
      }, 3000);
      return;
    }
    
    // 有权限，显示确认对话框
    setCommentToDelete(replyId);
    setParentCommentId(commentId);
    setDeleteType('reply');
    setShowDeleteModal(true);
  };

  // 如果正在加载
  if (loading) {
    return (
      <div style={containerStyle} className="d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.text, marginTop: '1rem' }}>正在加载小说信息...</p>
        </div>
      </div>
    );
  }

  // 确认删除评论函数
  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    
    try {
      setShowDeleteModal(false);
      
      const response = await commentAPI.deleteComment(commentToDelete);

      if (response.success) {
        // 更新评论列表，移除被删除的评论
        setComments(comments.filter(comment => comment._id !== commentToDelete));
        // 更新评论总数
        setTotalComments(prevTotal => Math.max(0, prevTotal - 1));
        setCommentSuccess('留言已成功删除');
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setCommentSuccess(null);
        }, 3000);
      } else {
        setCommentError(response.message || '删除留言失败');
      }
    } catch (err) {
      console.error('删除留言失败:', err);
      setCommentError(err.message || '删除留言失败，请稍后再试');
    } finally {
      // 重置状态
      setCommentToDelete(null);
      setDeleteType('');
    }
  };

  // 确认删除回复函数
  const confirmDeleteReply = async () => {
    if (!commentToDelete || !parentCommentId) return;
    
    try {
      setShowDeleteModal(false);
      
      const response = await commentAPI.deleteComment(commentToDelete);

      if (response.success) {
        // 更新评论列表，移除被删除的回复
        setComments(comments.map(comment => {
          if (comment._id !== parentCommentId) return comment;
          return {
            ...comment,
            replies: (comment.replies || []).filter(reply => reply._id !== commentToDelete)
          };
        }));
        
        // 更新评论总数
        setTotalComments(prevTotal => Math.max(0, prevTotal - 1));
        
        setCommentSuccess('回复已成功删除');
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setCommentSuccess(null);
        }, 3000);
      } else {
        setCommentError(response.message || '删除回复失败');
      }
    } catch (err) {
      console.error('删除回复失败:', err);
      setCommentError(err.message || '删除回复失败，请稍后再试');
    } finally {
      // 重置状态
      setCommentToDelete(null);
      setParentCommentId(null);
      setDeleteType('');
    }
  };

  // 如果加载出错
  if (error) {
    return (
      <div style={containerStyle} className="container">
        <div className="alert alert-danger text-center mt-5" role="alert">
          {error}
          <div className="mt-3">
            <button 
              onClick={() => navigate('/')}
              className="btn button-hover"
              style={buttonStyle}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果未找到小说
  if (!novel) {
    return (
      <div style={containerStyle} className="container">
        <div className="alert alert-warning text-center mt-5" role="alert">
          未找到小说信息
          <div className="mt-3">
            <button 
              onClick={() => navigate('/')}
              className="btn button-hover"
              style={buttonStyle}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 格式化小说状态
  let formattedStatus = '已完结';
  // 显式检查各种可能的"连载中"值
  if (novel.status === '连载中' || novel.status === 'ongoing') {
    formattedStatus = '连载中';
  }
  console.log('小说状态:', novel.status, '格式化后:', formattedStatus);
  
  // 格式化小说字数
  const formattedWordCount = novel.wordCount ? `${novel.wordCount}字` : '0字';
  
  // 格式化更新时间
  const formattedUpdateTime = new Date(novel.updatedAt).toLocaleDateString('zh-CN');

  // 打印调试信息
  console.log('Novel data:', {
    id: novel._id,
    title: novel.title,
    wordCount: novel.wordCount,
    totalChapters: novel.totalChapters,
    chapterCount: novel.chaptersCount,
    status: novel.status,
    updatedAt: novel.updatedAt,
    chapters: chapters.length
  });

  return (
    <div style={containerStyle} className="container-fluid novel-detail-page">
      {/* 添加自定义删除确认对话框 */}
      {showDeleteModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050
          }}
          className="delete-modal"
        >
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <h5 style={{ color: theme.text, marginBottom: '1rem' }}>
              确认删除
            </h5>
            <p style={{ color: theme.text, marginBottom: '1.5rem' }}>
              {deleteType === 'comment' 
                ? '您确定要删除这条留言吗？删除后将无法恢复。' 
                : '您确定要删除这条回复吗？删除后将无法恢复。'}
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                style={{
                  backgroundColor: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowDeleteModal(false);
                  setCommentToDelete(null);
                  setParentCommentId(null);
                  setDeleteType('');
                }}
              >
                取消
              </button>
              <button
                style={{
                  backgroundColor: theme.danger || '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={() => {
                  if (deleteType === 'comment') {
                    confirmDeleteComment();
                  } else {
                    confirmDeleteReply();
                  }
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="row">
        {/* 消息通知 */}
        {notification && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              borderRadius: '4px',
              backgroundColor: notification.type === 'error' ? '#dc3545' : '#28a745',
              color: 'white',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 1000,
              maxWidth: '300px',
              animation: 'fadeIn 0.3s'
            }}
          >
            {notification.message}
          </div>
        )}
        
        <div className="container">
          {/* 顶部信息区 */}
          <div style={cardStyle}>
            <div className="row align-items-center">
              <div className="col-md-4 text-center" style={{ 
                background: 'transparent', // 确保背景透明
                padding: '15px' // 保持一定的内边距
              }}>
                <img 
                  src={getFullImageUrl(novel.cover || novel.coverImg, '/images/default-cover.jpg', {
                    title: novel.title,
                    author: novel.authorName || novel.author
                  })} 
                  alt={novel.title} 
                  style={{ 
                    width: '280px', // 固定宽度
                    height: '400px', // 固定高度
                    objectFit: 'fill', // 强制拉伸填充
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)', // 增强阴影效果
                    borderRadius: '8px' // 增大圆角
                  }}
                  onError={(e) => {
                    if (!e.target.src.includes('default-cover.jpg')) {
                      console.log('封面加载失败，使用默认封面', e.target.src);
                      e.target.onerror = null;
                      e.target.src = `${window.location.origin}/images/default-cover.jpg`;
                    }
                  }}
                />
              </div>
              <div className="col-md-8">
                <h1 style={{ 
                  color: theme.text, 
                  marginBottom: '1rem',
                  fontSize: '2.5rem',
                  fontWeight: 'bold'
                }}>
                  《{novel.title}》
                </h1>
                <div style={{ 
                  color: theme.textSecondary, 
                  marginBottom: '1rem',
                  fontSize: '1.2rem'
                }}>
                  作者：
                  <span 
                    onClick={() => {
                      // 检查creator字段是否存在
                      if (novel.creator && novel.creator._id) {
                        // 如果creator是对象且有_id字段
                        navigateToUserProfile(novel.creator._id);
                      } else if (novel.creator) {
                        // 如果creator直接是ID
                        navigateToUserProfile(novel.creator);
                      } else {
                        console.log('无法导航：作者ID不存在');
                        setNotification({
                          type: 'warning',
                          message: '无法访问该作者主页'
                        });
                        setTimeout(() => setNotification(null), 3000);
                      }
                    }}
                    style={{ 
                      color: theme.accent, 
                      cursor: novel.creator ? 'pointer' : 'default',
                      textDecoration: novel.creator ? 'underline' : 'none',
                      fontWeight: 'bold'
                    }}
                    title={novel.creator ? "查看作者主页" : "无法访问作者主页"}
                  >
                    {novel.authorName}
                  </span>
                </div>
                <div className="mb-3">
                  {/* 显示分类和标签的组合 */}
                  {(() => {
                    // 准备分类和标签
                    const categories = novel.categories?.filter(cat => cat !== '其他') || [];
                    const tags = novel.tags || [];
                    
                    // 合并分类和标签
                    const allTags = [...categories, ...tags];
                    
                    // 如果有标签则显示，没有则显示"其他"
                    if (allTags.length > 0) {
                      return allTags.map((tag, index) => (
                        <span 
                          key={`tag-${index}`} 
                          className="hover-effect"
                          style={{
                            ...tagStyle,
                            display: 'inline-block'
                          }}
                        >
                          {tag}
                        </span>
                      ));
                    } else {
                      return (
                        <span 
                          className="hover-effect"
                          style={{
                            ...tagStyle,
                            display: 'inline-block'
                          }}
                        >
                          其他
                        </span>
                      );
                    }
                  })()}
                </div>
                <div style={{ 
                  color: theme.textSecondary, 
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem'
                }}>
                  <div>字数：{formattedWordCount}</div>
                  <div>
                    状态：
                    {formattedStatus === '已完结' ? (
                      <span style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>
                        已完结
                      </span>
                    ) : formattedStatus === '暂停更新' ? (
                      <span style={{
                        backgroundColor: '#ffc107',
                        color: 'black',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.9rem'
                      }}>
                        暂停更新
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.9rem'
                      }}>
                        连载中
                      </span>
                    )}
                  </div>
                  <div>总章节：{novel.totalChapters || chapters.length}</div>
                  <div>最近更新：{formattedUpdateTime}</div>
                  <div>阅读人数：{novel.readers || 0}</div>
                  <div>收藏人数：{novel.collections || 0}</div>
                </div>
                <div className="d-flex gap-3">
                  <button 
                    onClick={startReading} 
                    className="button-hover"
                    style={{
                      ...buttonStyle,
                      fontSize: '1.1rem',
                      padding: '0.75rem 2rem'
                    }}
                  >
                    开始阅读
                  </button>
                  <button 
                    onClick={toggleFavorite}
                    className="button-hover"
                    style={{
                      ...buttonStyle,
                      backgroundColor: isFavorite ? theme.accent : 'transparent',
                      border: `1px solid ${theme.accent}`,
                      color: isFavorite ? '#ffffff' : theme.accent
                    }}
                  >
                    {isFavorite ? '已收藏' : '加入书架'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 作品简介 */}
          <div style={cardStyle}>
            <h3 style={{ 
              color: theme.text, 
              marginBottom: '1.5rem',
              fontSize: '1.8rem',
              borderBottom: `2px solid ${theme.accent}`,
              paddingBottom: '0.5rem'
            }}>
              作品简介
            </h3>
            <p style={{ 
              color: theme.text,
              whiteSpace: 'pre-line',
              lineHeight: '1.8',
              fontSize: '1.1rem',
              textIndent: '0'
            }}>
              {novel.longDescription || novel.description || novel.shortDescription || '暂无简介'}
            </p>
          </div>

          {/* 所有章节 */}
          <div style={cardStyle}>
            <h3 style={{ 
              color: theme.text, 
              marginBottom: '1.5rem',
              fontSize: '1.8rem',
              borderBottom: `2px solid ${theme.accent}`,
              paddingBottom: '0.5rem'
            }}>
              所有章节
            </h3>
            {chapters.length > 0 ? (
              <div className="chapter-list">
                {chapters.map((chapter) => (
                  <div
                    key={chapter._id}
                    onClick={() => navigate(`/novel/${id}/read/${chapter.chapterNumber}`)}
                    className="list-item-hover"
                    style={{
                      padding: '1rem',
                      margin: '0.5rem 0',
                      borderRadius: '0.25rem',
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${theme.border}`,
                      color: theme.text
                    }}
                  >
                    {chapter.isExtra ? (
                      <>番外：{chapter.title}</>
                    ) : (
                      <>第{chapter.chapterNumber}章：{chapter.title}</>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.text }}>暂无章节</p>
            )}
            <button 
              onClick={() => navigate(`/novel/${id}/chapters`)}
              className="button-hover"
              style={{
                ...buttonStyle,
                backgroundColor: 'transparent',
                border: `1px solid ${theme.accent}`,
                color: theme.accent,
                marginTop: '1rem',
                width: '100%'
              }}
            >
              查看完整目录
            </button>
          </div>

          {/* 读者评论区 */}
          <div style={cardStyle}>
            <h3 style={{ 
              color: theme.text, 
              marginBottom: '1.5rem',
              fontSize: '1.8rem',
              borderBottom: `2px solid ${theme.accent}`,
              paddingBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>读者评论 <small style={{ color: theme.textSecondary }}>({totalComments})</small></span>
              <button
                style={{
                  ...buttonStyle,
                  fontSize: '1rem',
                  padding: '0.5rem 1rem'
                }}
                className="btn button-hover"
              >
                写评论
              </button>
            </h3>
            
            {/* 发表留言 */}
            <div 
              style={{ 
                backgroundColor: theme.cardBg, 
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem' 
              }}
              className="comment-form"
            >
              <h5 style={{ color: theme.text, marginBottom: '1rem' }}>
                发表留言
              </h5>
              
              {!isAuthenticated && (
                <div className="alert alert-warning">
                  请先登录后再发表留言
                </div>
              )}
              
              {commentError && (
                <div className="alert alert-danger">
                  {commentError}
                </div>
              )}
              
              {commentSuccess && (
                <div className="alert alert-success">
                  {commentSuccess}
                </div>
              )}
              
              <form onSubmit={handleSubmitComment}>
                <div className="mb-3">
                  <textarea
                    style={textareaStyle}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      isAuthenticated 
                        ? `说点什么吧，关于《${novel?.title || ''}》` 
                        : "请先登录后再发表留言"
                    }
                    disabled={!isAuthenticated || submitting}
                  />
                </div>
                
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    style={{
                      ...buttonStyle,
                      opacity: isAuthenticated && !submitting ? 1 : 0.6,
                      cursor: isAuthenticated && !submitting ? 'pointer' : 'not-allowed'
                    }}
                    disabled={!isAuthenticated || submitting}
                  >
                    {submitting ? '提交中...' : '发表留言'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* 留言列表 */}
            <div className="comments">
              {commentLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border" role="status" style={{ color: theme.accent }}>
                    <span className="visually-hidden">加载中...</span>
                  </div>
                  <p style={{ color: theme.text, marginTop: '1rem' }}>正在加载留言...</p>
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment._id} className="card-hover" style={commentStyle}>
                    <div className="d-flex align-items-start gap-3">
                      <img
                        src={getUserAvatar(comment.user)}
                        alt={comment.user?.username || '用户'}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `1px solid ${theme.border}`,
                          cursor: comment.user?._id ? 'pointer' : 'default'
                        }}
                        onClick={() => comment.user?._id ? navigateToUserProfile(comment.user._id) : null}
                        title={comment.user?._id ? "查看用户主页" : ""}
                        onError={(e) => {
                          console.log('头像加载失败，使用默认头像');
                          e.target.src = '/images/avatars/default-avatar.jpg';
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div 
                            style={{ 
                              color: theme.accent, 
                              fontWeight: 'bold',
                              cursor: comment.user?._id ? 'pointer' : 'default',
                              textDecoration: comment.user?._id ? 'underline' : 'none',
                            }}
                            onClick={() => comment.user?._id ? navigateToUserProfile(comment.user._id) : null}
                            title={comment.user?._id ? "查看用户主页" : ""}
                          >
                            {comment.user.penName || comment.user.username}
                          </div>
                          <div style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                            {new Date(comment.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        
                        {/* 显示来自哪个章节的留言 */}
                        {comment.chapter && (
                          <div style={{ 
                            color: theme.textSecondary, 
                            fontSize: '0.9rem',
                            marginBottom: '0.5rem'
                          }}>
                            评论自：
                            <Link 
                              to={`/novels/${novel?._id}/chapters/${comment.chapterNumber}`} 
                              style={{ color: theme.accent }}
                            >
                              第{comment.chapterNumber}章: {comment.chapter.title}
                            </Link>
                          </div>
                        )}
                        
                        <div style={{ 
                          color: theme.text,
                          marginBottom: '0.5rem',
                          fontSize: '1.1rem'
                        }}>
                          {comment.content}
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <button
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: (comment.likedBy || []).includes(user?._id) ? theme.accent : theme.textSecondary,
                              cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => {
                              if ((comment.likedBy || []).includes(user?._id)) {
                                handleUnlikeComment(comment._id);
                              } else {
                                handleLikeComment(comment._id);
                              }
                            }}
                            disabled={!isAuthenticated}
                          >
                            <i className={`bi ${(comment.likedBy || []).includes(user?._id) ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}></i>
                            <span className="ms-1">{comment.likes || 0}</span>
                          </button>
                          <button
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: replyingTo?._id === comment._id ? theme.accent : theme.textSecondary,
                              cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => {
                              console.log('点击回复按钮', comment._id);
                              if (!isAuthenticated) {
                                setCommentError('请先登录后再回复留言');
                                return;
                              }
                              // 如果当前已经选中了这条评论，取消选中
                              if (replyingTo && replyingTo._id === comment._id) {
                                setReplyingTo(null);
                              } else {
                                // 否则选中当前评论
                                setReplyingTo(comment);
                                setReplyContent('');
                              }
                              // 强制刷新组件
                              setRefreshFlag(prev => prev + 1);
                            }}
                            disabled={!isAuthenticated}
                          >
                            <i className="bi bi-reply"></i>
                            <span className="ms-1">回复{replyingTo?._id === comment._id ? '中' : ''}</span>
                          </button>
                          {/* 在回复按钮旁边添加删除按钮（仅在用户有权限时显示） */}
                          {canDeleteComment(comment) && (
                            <button
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: theme.danger || '#dc3545',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => handleDeleteComment(comment._id)}
                              title="删除评论"
                            >
                              <i className="bi bi-trash"></i>
                              <span className="ms-1">删除</span>
                            </button>
                          )}
                        </div>
                        
                        {/* 本地错误消息 */}
                        {localErrors[comment._id] && (
                          <div 
                            style={{
                              backgroundColor: 'rgba(220, 53, 69, 0.1)',
                              color: theme.danger || '#dc3545',
                              padding: '0.5rem',
                              borderRadius: '4px',
                              marginTop: '0.5rem',
                              fontSize: '0.9rem'
                            }}
                          >
                            <i className="bi bi-exclamation-circle me-2"></i>
                            {localErrors[comment._id]}
                          </div>
                        )}
                        
                        {/* 渲染回复表单 */}
                        {renderReplyForm(comment)}
                        
                        {/* 渲染回复列表 */}
                        {renderReplies(comment)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ 
                  color: theme.textSecondary, 
                  textAlign: 'center', 
                  padding: '2rem',
                  backgroundColor: theme.cardBg,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`
                }}>
                  暂无评论，快来发表第一个评论吧！
                </div>
              )}
            </div>

            {comments.length > 0 && renderPagination()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NovelDetail; 
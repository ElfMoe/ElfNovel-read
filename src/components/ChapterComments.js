import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { commentAPI } from '../services/api';
import { getFullImageUrl, generateTextAvatar } from '../utils/imageUtils';

/**
 * 章节留言组件
 * 
 * 显示特定章节的留言，并允许用户发布新留言
 */
const ChapterComments = ({ novelId, chapterId, novelTitle, chapterNumber, chapterTitle, novelAuthorId }) => {
  const { user, isAuthenticated } = useUser();
  const { theme } = useTheme();
  
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [expandedReplies, setExpandedReplies] = useState({});
  
  // 添加删除确认对话框状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(''); // 'comment' 或 'reply'
  const [parentCommentId, setParentCommentId] = useState(null); // 用于回复的删除
  
  // 添加本地错误提示状态
  const [localErrors, setLocalErrors] = useState({});
  
  // 样式定义
  const commentCardStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease'
  };
  
  const buttonStyle = {
    backgroundColor: theme.accent,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
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
  
  // 加载章节留言
  const fetchComments = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await commentAPI.getChapterComments(chapterId, page);
      
      if (response.success) {
        console.log('The chapter comment data obtained:', response.data.comments);
        // 检查每条评论是否有replies字段
        response.data.comments.forEach(comment => {
          console.log(`Chapter Comment ID: ${comment._id}，Number of replies:`, comment.replies ? comment.replies.length : 0);
        });
        
        setComments(response.data.comments);
        setTotalComments(response.data.pagination.total);
      } else {
        setError(response.message || 'Failed to retrieve message');
      }
    } catch (err) {
      console.error('Failed to get chapter message:', err);
      setError(err.message || 'Failed to retrieve message, please try again later');
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载留言
  useEffect(() => {
    if (chapterId) {
      console.log('Load chapter comments, chapter ID:', chapterId);
      console.log('Current user status:', user);
      console.log('Current certification status:', isAuthenticated);
      fetchComments();
    }
  }, [chapterId, refreshFlag, isAuthenticated]);
  
  // 提交新留言
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in before posting a message');
      return;
    }
    
    if (!newComment.trim()) {
      setError('The message content cannot be empty');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await commentAPI.createComment({
        content: newComment,
        novelId,
        chapterId
      });
      
      if (response.success) {
        setNewComment('');
        setSuccess('Message posted successfully！');
        
        // 刷新留言列表
        fetchComments();
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.message || 'Failed to post message');
      }
    } catch (err) {
      console.error('Failed to post message:', err);
      setError(err.message || 'Failed to post message, please try again later');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 点赞留言
  const handleLikeComment = async (commentId) => {
    if (!isAuthenticated) {
      setError('Please log in before liking');
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
      console.error('Like failed:', err);
      setError(err.message || 'Like failed, please try again later');
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
      console.error('Failed to cancel like:', err);
    }
  };
  
  // 页码变化
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchComments(page);
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
        console.error('Failed to generate text avatar:', err);
      }
    }
    
    // 如果上述方法都失败，返回默认头像
    return '/images/avatars/default-avatar.jpg';
  };
  
  // 处理回复提交
  const handleSubmitReply = async (e, commentId, replyToUserId) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in before replying to the message');
      return;
    }
    
    if (!replyContent.trim()) {
      setError(' Errorr.. faça login antes de responder');
      return;
    }
    
    try {
      setReplySubmitting(true);
      setError(null);
      
      // 构建回复数据
      const replyData = {
        content: replyContent,
        novelId: novelId,
        commentId: replyingTo.parentComment || commentId, // 使用parentComment或原始commentId
        chapterId: chapterId
      };
      
      // 如果是回复的回复，添加对应用户ID
      if (replyToUserId) {
        replyData.replyToUserId = replyToUserId;
      }
      
      console.log('Send reply data:', replyData);
      
      const response = await commentAPI.replyToComment(replyData);
      
      if (response.success) {
        setReplyContent('');
        setReplyingTo(null);
        setSuccess('Reply posted successfully！');
        
        // 刷新留言列表
        await fetchComments();
        
        // 自动展开被回复的评论的回复列表
        setExpandedReplies(prev => ({
          ...prev,
          [commentId]: true
        }));
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.message || 'Reply post failed');
      }
    } catch (err) {
      console.error('Failed to reply to message:', err);
      setError(err.message || 'Reply post failed, please try again later');
    } finally {
      setReplySubmitting(false);
    }
  };
  
  // 添加渲染回复表单的函数
  const renderReplyForm = (comment) => {
    console.log('Rendering the response form', {
      replyingTo: replyingTo?._id,
      commentId: comment._id,
      shouldShow: replyingTo?._id === comment._id
    });
    
    if (!replyingTo || replyingTo._id !== comment._id) return null;
    
    return (
      <div 
        style={{ 
          backgroundColor: `${theme.cardBg}80`,
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
              console.log('Close reply form');
              setReplyingTo(null);
            }}
            aria-label="closer"
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
              placeholder="Write your reply..."
              disabled={!isAuthenticated || replySubmitting}
            />
          </div>
          
          <div className="d-flex justify-content-end">
            <button
              type="submit"
              style={{
                backgroundColor: theme.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '0.3rem 0.8rem',
                fontSize: '0.9rem',
                cursor: isAuthenticated && !replySubmitting ? 'pointer' : 'not-allowed',
                opacity: isAuthenticated && !replySubmitting ? 1 : 0.6
              }}
              disabled={!isAuthenticated || replySubmitting}
            >
              {replySubmitting ? 'Submitting...' : 'Post a reply'}
            </button>
          </div>
        </form>
      </div>
    );
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
          {isExpanded ? 'Close reply' : `View All ${replyCount} Replys`}
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
                alt={reply.user?.username || 'user'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `1px solid ${theme.border}`
                }}
                onError={(e) => {
                  console.log('Avatar loading failed, using default avatar');
                  e.target.src = '/images/avatars/default-avatar.jpg';
                }}
              />
              <div style={{ flex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div style={{ color: theme.accent, fontWeight: 'bold', fontSize: '0.95rem' }}>
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
                      console.log('Click the reply button (Reply)', reply._id);
                      if (!isAuthenticated) {
                        setError('Please log in before replying to the message');
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
                    <span className="ms-1">reply{replyingTo?._id === reply._id ? 'middle' : ''}</span>
                  </button>
                  
                  {/* 添加删除回复按钮 */}
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
                    >
                      <i className="bi bi-trash"></i>
                      <span className="ms-1">delete</span>
                    </button>
                  )}
                </div>
                
                {/* 本地错误提示（回复） */}
                {localErrors[reply._id] && (
                  <div 
                    style={{
                      backgroundColor: 'rgba(220, 53, 69, 0.1)',
                      color: theme.danger || '#dc3545',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginTop: '0.5rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <i className="bi bi-exclamation-circle me-2"></i>
                    {localErrors[reply._id]}
                  </div>
                )}
                
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
                          console.log('Close reply form');
                          setReplyingTo(null);
                        }}
                        aria-label="cancel"
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
                          placeholder="Write your reply..."
                          disabled={!isAuthenticated || replySubmitting}
                        />
                      </div>
                      
                      <div className="d-flex justify-content-end">
                        <button
                          type="submit"
                          style={{
                            backgroundColor: theme.accent,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.3rem 0.8rem',
                            fontSize: '0.9rem',
                            cursor: isAuthenticated && !replySubmitting ? 'pointer' : 'not-allowed',
                            opacity: isAuthenticated && !replySubmitting ? 1 : 0.6
                          }}
                          disabled={!isAuthenticated || replySubmitting}
                        >
                          {replySubmitting ? 'Submitting...' : 'Post a reply'}
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
  
  // 修改删除评论的处理函数
  const handleDeleteComment = async (commentId) => {
    // 检查权限
    const comment = comments.find(c => c._id === commentId);
    if (!comment) return;

    if (!canDeleteComment(comment)) {
      // 没有权限，直接显示错误消息
      setLocalErrors({
        ...localErrors,
        [commentId]: 'You do not have permission to delete this message'
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

  // 修改确认删除评论的函数
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
        setSuccess('Message successfully deleted');
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.message || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError(err.message || 'Failed to delete message, please try again later');
    } finally {
      // 重置状态
      setCommentToDelete(null);
      setDeleteType('');
    }
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
        [replyId]: 'You do not have permission to delete this reply'
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

  // 确认删除回复的函数
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
        
        setSuccess('Reply successfully deleted');
        
        // 3秒后清除成功消息
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.message || 'Failed to delete reply');
      }
    } catch (err) {
      console.error('Failed to delete reply:', err);
      setError(err.message || 'Failed to delete reply, please try again later');
    } finally {
      // 重置状态
      setCommentToDelete(null);
      setParentCommentId(null);
      setDeleteType('');
    }
  };
  
  // 检查用户是否可以删除评论
  const canDeleteComment = (comment) => {
    console.log('======= Comment deletion permission check started =======');
    console.log('User Object:', user);
    console.log('Certification Status:', isAuthenticated);
    console.log('Comments:', comment);
    console.log('Novel author ID:', novelAuthorId);
    
    if (!user || !isAuthenticated) {
      console.log('The user is not logged in, and cannot delete comments');
      return false;
    }
    
    // 确保评论和用户ID是字符串类型进行比较，修正字段名不匹配的问题
    const commentUserId = comment.user && comment.user._id ? String(comment.user._id) : '';
    // 用户对象使用id而不是_id
    const currentUserId = user.id ? String(user.id) : '';
    
    // 用户可以删除自己的评论
    const isCommentAuthor = commentUserId === currentUserId;
    console.log('Permission check - Is it the comment author:', isCommentAuthor, 
                'Comment User ID:', commentUserId, 
                'Current User ID:', currentUserId);
    
    // 管理员可以删除任何评论
    const isAdmin = user.role === 'admin';
    console.log('Permission check - Is it an administrator:', isAdmin, 'User roles:', user.role);
    
    // 检查是否为小说作者（需要从父组件传入novelAuthorId）
    const novelAuthorIdStr = novelAuthorId ? String(novelAuthorId) : '';
    const isNovelAuthor = novelAuthorIdStr && currentUserId === novelAuthorIdStr;
    console.log('Permission check - Is this the novel author:', isNovelAuthor, 
                'Novel author ID:', novelAuthorIdStr);
    
    // 根据实际权限返回结果
    const canDelete = isCommentAuthor || isAdmin || isNovelAuthor;
    console.log('Final deletion rights:', canDelete);
    console.log('======= Comment deletion permission check completed =======');
    
    return canDelete;
  };
  
  return (
    <div className="chapter-comments mt-5">
      <h4 style={{ color: theme.text, marginBottom: '1.5rem' }}>
        Chapter Message <small className="text-muted">({totalComments})</small>
      </h4>
      
      {/* 自定义删除确认对话框 */}
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
              Confirm Delete
            </h5>
            <p style={{ color: theme.text, marginBottom: '1.5rem' }}>
              {deleteType === 'comment' 
                ? 'Are you sure you want to delete this message? Once deleted, it cannot be recovered.' 
                : 'Are you sure you want to delete this reply? Once deleted, it cannot be restored.'}
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
                Cancel
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
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
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
          Leave a comment
        </h5>
        
        {!isAuthenticated && (
          <div className="alert alert-warning">
            Please log in before posting a message
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            {success}
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
                  ? `Say something about《${novelTitle}》No.${chapterNumber}chapter：${chapterTitle}` 
                  : "Please log in before posting a message"
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
              {submitting ? 'Submitting...' : 'Leave a comment'}
            </button>
          </div>
        </form>
      </div>
      
      {/* 留言列表 */}
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">loading...</span>
          </div>
          <p style={{ color: theme.text, marginTop: '1rem' }}>Loading messages...</p>
        </div>
      ) : comments.length > 0 ? (
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment._id} style={commentCardStyle} className="card-hover">
              <div className="d-flex align-items-start gap-3">
                <img
                  src={getUserAvatar(comment.user)}
                  alt={comment.user?.username || 'user'}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `1px solid ${theme.border}`
                  }}
                  onError={(e) => {
                    console.log('Avatar loading failed, using default avatar');
                    e.target.src = '/images/avatars/default-avatar.jpg';
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div style={{ color: theme.accent, fontWeight: 'bold' }}>
                      {comment.user.penName || comment.user.username}
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                      {new Date(comment.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
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
                    
                    {/* 修改回复按钮的点击事件处理函数 */}
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
                        console.log('Click the reply button', comment._id);
                        if (!isAuthenticated) {
                          setError('Please log in before replying to the message');
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
                      <span className="ms-1">回复{replyingTo?._id === comment._id ? 'middle' : ''}</span>
                    </button>
                    
                    {/* 添加删除按钮 */}
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
                      >
                        <i className="bi bi-trash"></i>
                        <span className="ms-1">delete</span>
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
          ))}
          
          {renderPagination()}
        </div>
      ) : (
        <div style={{ 
          color: theme.textSecondary, 
          textAlign: 'center', 
          padding: '2rem',
          backgroundColor: theme.cardBg,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`
        }}>
          No one has left a comment yet, be the first to leave a comment!
        </div>
      )}
    </div>
  );
};

export default ChapterComments; 

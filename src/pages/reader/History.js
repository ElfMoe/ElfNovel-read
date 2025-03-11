import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { userAPI, novelAPI } from '../../services/api';
import { getFullImageUrl } from '../../utils/imageUtils';

function History() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useUser();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  // 卡片样式
  const cardStyle = {
    backgroundColor: theme.cardBg,
    borderRadius: '0.5rem',
    boxShadow: `0 4px 6px rgba(0, 0, 0, ${isDark ? '0.3' : '0.1'})`,
    padding: '1rem',
    border: `1px solid ${theme.border}`,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    height: '100%'
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, currentPage]);

  // 添加新的useEffect，在页面获得焦点时刷新历史列表
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // 定义页面获得焦点时的处理函数
    const handleFocus = () => {
      console.log('历史页面获得焦点，刷新历史列表');
      fetchHistory();
    };
    
    // 添加事件监听器
    window.addEventListener('focus', handleFocus);
    
    // 清理函数
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, currentPage]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 调用API获取阅读历史
      const response = await userAPI.getReadingHistory({ 
        page: currentPage, 
        limit: 10 
      });
      
      console.log('阅读历史API响应:', response);
      
      if (response.success) {
        // 获取每个小说的详细信息，确保能拿到正确的totalChapters
        const historyData = response.data || [];
        console.log('原始阅读历史数据:', historyData);
        
        // 获取所有需要详细信息的小说ID
        const novelIds = historyData
          .filter(item => item && item.novel && item.novel._id)
          .map(item => item.novel._id);
          
        console.log('需要获取详情的小说ID列表:', novelIds);
        
        // 获取每本小说的详细信息
        const novelDetailsMap = {};
        await Promise.all(novelIds.map(async (novelId) => {
          try {
            const novelResponse = await novelAPI.getNovelDetail(novelId);
            console.log(`小说[${novelId}]详情获取结果:`, novelResponse);
            if (novelResponse.success && novelResponse.data) {
              novelDetailsMap[novelId] = novelResponse.data;
            }
          } catch (error) {
            console.error(`获取小说[${novelId}]详情失败:`, error);
          }
        }));
        
        console.log('小说详情映射:', novelDetailsMap);
        
        // 处理数据，添加额外的状态标记
        const processedHistories = historyData.map(item => {
          // 确保item和item.novel存在
          if (!item || !item.novel) {
            console.warn('历史数据不完整:', item);
            return null;
          }
          
          // 获取该小说的详细信息(如果有)
          const novelDetail = novelDetailsMap[item.novel._id] || {};
          console.log(`小说[${item.novel._id}]合并前信息:`, {
            fromHistory: item.novel,
            fromDetail: novelDetail
          });
          
          // 合并小说信息，优先使用novelDetail
          const mergedNovel = {
            ...item.novel,
            ...novelDetail,
            // 确保总章节数存在，优先使用novelDetail的值
            totalChapters: novelDetail.totalChapters || item.novel.totalChapters || 1
          };
          
          console.log(`小说[${item.novel._id}]合并后信息:`, mergedNovel);
          
          // 获取阅读时间和更新时间
          const lastReadAt = new Date(item.lastReadAt || Date.now());
          const updatedAt = new Date(mergedNovel.updatedAt || Date.now());
          
          // 确定是否刚更新 (3天内)
          // 只有当更新时间晚于最后访问时间才标记为"有更新"
          const isRecentlyUpdated = mergedNovel.updatedAt && 
            ((new Date() - updatedAt) / (1000 * 60 * 60 * 24) < 3) && // 3天内的更新
            updatedAt > lastReadAt; // 更新时间晚于最后访问时间
          
          // 获取章节数量和最后阅读章节
          const totalChapters = parseInt(mergedNovel.totalChapters || 0, 10);
          
          // 获取最后阅读章节和阅读进度
          let readProgress = 0;
          let lastReadChapter = item.lastChapter;
          
          // 获取最后阅读章节
          if (lastReadChapter && typeof lastReadChapter === 'object' && lastReadChapter.chapterNumber) {
            // 计算实际进度 - 已读章节 / 总章节数 * 100
            readProgress = totalChapters > 0 ? Math.round((lastReadChapter.chapterNumber / totalChapters) * 100) : 0;
          } else if (item.readingProgress) {
            // 没有章节信息，使用后端存储的进度
            readProgress = Math.min(Math.max(0, item.readingProgress || 0), 100);
          } else {
            // 即使有阅读历史但没有lastChapter，进度为0
            readProgress = 0;
          }
          
          // 修复日志输出，确保不直接输出可能是对象的lastReadChapter
          const lastReadChapterDisplay = lastReadChapter 
            ? (typeof lastReadChapter === 'object' 
              ? (lastReadChapter?.chapterNumber || '未知') 
              : (lastReadChapter || '未知'))
            : '未开始';
          
          console.log(`小说 ${mergedNovel.title} 的阅读进度: ${readProgress}%, 最后阅读章节: ${lastReadChapterDisplay}/${totalChapters}`);
          
          // 如果lastReadChapter是对象，只保存章节号；如果为null，保持为null
          const processedLastReadChapter = lastReadChapter
            ? (typeof lastReadChapter === 'object' && lastReadChapter?.chapterNumber 
              ? lastReadChapter.chapterNumber 
              : lastReadChapter)
            : null;
          
          return {
            ...item,
            novel: {
              ...mergedNovel,
              isCompleted: mergedNovel.status === '已完结',
              isRecentlyUpdated: isRecentlyUpdated,
              readProgress: readProgress,
              lastReadChapter: processedLastReadChapter,
              totalChapters: totalChapters,
              hasVisited: true // 历史记录必然已访问过
            }
          };
        }).filter(item => item !== null); // 过滤掉无效数据
        
        // 按照最后阅读时间排序（最新的在前面）
        const sortedHistories = processedHistories.sort((a, b) => {
          return new Date(b.lastReadAt) - new Date(a.lastReadAt);
        });
        
        console.log('处理后的历史数据:', sortedHistories);
        
        setHistory(sortedHistories);
        setTotalPages(response.totalPages || 1);
      } else {
        setError(response.message || '获取阅读历史失败');
      }
    } catch (err) {
      console.error('获取阅读历史出错:', err);
      setError('获取阅读历史时出错，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleNovelClick = async (novelId, lastReadChapter) => {
    try {
      // 更新阅读历史
      await userAPI.addReadingHistory(novelId);
      
      // 如果有最后阅读章节，直接跳转到该章节
      if (lastReadChapter) {
        navigate(`/novel/${novelId}/read/${lastReadChapter}`);
      } else {
        // 如果没有最后阅读章节，跳转到小说详情页
        navigate(`/novel/${novelId}`);
      }
    } catch (error) {
      console.error('处理小说点击失败:', error);
    }
  };

  const deleteHistoryItem = async (historyId, event) => {
    event.stopPropagation(); // 阻止事件冒泡
    
    try {
      const response = await userAPI.deleteReadingHistory(historyId);
      
      if (response.success) {
        // 从列表中移除该项
        setHistory(prevHistory => prevHistory.filter(item => item._id !== historyId));
        
        // 显示通知
        setNotification({
          message: '已从阅读历史中移除',
          type: 'success'
        });
        
        // 3秒后清除通知
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      } else {
        setNotification({
          message: response.message || '移除失败，请稍后再试',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
      setNotification({
        message: '删除失败，请稍后再试',
        type: 'error'
      });
    }
  };

  // 清除所有历史记录
  const clearAllHistory = async () => {
    try {
      const response = await userAPI.deleteReadingHistory('all');
      
      if (response.success) {
        // 清空历史列表
        setHistory([]);
        
        // 关闭确认对话框
        setShowConfirmModal(false);
        
        // 显示通知
        setNotification({
          message: '已清除所有阅读历史',
          type: 'success'
        });
        
        // 3秒后清除通知
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      } else {
        setNotification({
          message: response.message || '清除失败，请稍后再试',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('清除历史记录失败:', error);
      setNotification({
        message: '清除失败，请稍后再试',
        type: 'error'
      });
    }
  };

  // 确认对话框组件
  const ConfirmModal = () => (
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ backgroundColor: theme.cardBg, color: theme.text }}>
          <div className="modal-header" style={{ borderColor: theme.border }}>
            <h5 className="modal-title">确认清除</h5>
            <button type="button" className="btn-close" onClick={() => setShowConfirmModal(false)}></button>
          </div>
          <div className="modal-body">
            <p>确定要清除所有阅读历史记录吗？此操作不可撤销。</p>
          </div>
          <div className="modal-footer" style={{ borderColor: theme.border }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>取消</button>
            <button type="button" className="btn btn-danger" onClick={clearAllHistory}>确认清除</button>
          </div>
        </div>
      </div>
    </div>
  );

  // 通知组件
  const NotificationComponent = ({ message, type }) => (
    <div 
      className={`alert ${type === 'success' ? 'alert-success' : 'alert-danger'} position-fixed`}
      style={{
        top: '20px',
        right: '20px',
        zIndex: 1050,
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        maxWidth: '300px'
      }}
    >
      {message}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="container py-5">
        <div className="card" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
          <div className="card-body">
          <h2 style={{ color: theme.text }}>请先登录</h2>
          <p style={{ color: theme.textSecondary }}>
            您需要登录后才能查看阅读历史。
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
      </div>
    );
  }

  return (
    <div className="container py-5">
      {notification && (
        <NotificationComponent 
          message={notification.message} 
          type={notification.type} 
        />
      )}
      
      {showConfirmModal && <ConfirmModal />}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ color: theme.text, margin: 0 }}>阅读历史</h1>
        
        {history.length > 0 && (
          <button 
            className="btn btn-danger"
            onClick={() => setShowConfirmModal(true)}
          >
            <i className="bi bi-trash me-1"></i>
            清除所有历史
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="card text-center py-5" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.textSecondary, marginTop: '1rem' }}>正在加载阅读历史...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
          <div className="card-body">
          <div className="alert alert-danger">{error}</div>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="card text-center py-5" style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}>
          <i className="bi bi-clock-history" style={{ fontSize: '3rem', color: theme.textSecondary }}></i>
          <h3 style={{ color: theme.text, marginTop: '1rem' }}>暂无阅读记录</h3>
          <p style={{ color: theme.textSecondary }}>您的阅读记录将在此显示</p>
          <Link 
            to="/" 
            className="btn"
            style={{ 
              backgroundColor: theme.accent,
              color: '#fff',
              marginTop: '1rem'
            }}
          >
            去阅读小说
          </Link>
        </div>
      ) : (
        <div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            {history.map(item => (
              <div key={item._id} className="col mb-3">
                <div style={{
                  ...cardStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: '100%',
                  marginBottom: '-0.5rem'
                }} 
                className="history-card hover-lift"
                onClick={() => handleNovelClick(item.novel._id, item.novel.lastReadChapter)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 8px 15px rgba(0, 0, 0, ${isDark ? '0.4' : '0.15'})`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 6px rgba(0, 0, 0, ${isDark ? '0.3' : '0.1'})`;
                }}
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
                      {/* 已完结标签 */}
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
                      
                      {/* 有更新标签 - 只在小说没完结且有更新时显示 */}
                      {item.novel.isRecentlyUpdated && !item.novel.isCompleted && (
                        <div style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '2px 8px',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          borderRadius: '0 0 4px 0',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 1
                        }}>
                          有更新
                        </div>
                      )}
                      
                      <img 
                        src={getFullImageUrl(item.novel.cover, '/images/default-cover.jpg', {
                          title: item.novel.title || '无标题',
                          author: item.novel.author || item.novel.authorName || '佚名'
                        })}
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
                        <h5 style={{ color: theme.text, marginBottom: '5px' }}>《{item.novel.title || '无标题'}》</h5>
                        <p style={{ 
                          color: theme.textSecondary, 
                          fontSize: '0.9rem',
                          marginBottom: '5px'
                        }}>
                          作者：{item.novel.author || item.novel.authorName || '佚名'}
                        </p>
                        <div className="d-flex align-items-center mb-2">
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            backgroundColor: item.novel.isCompleted 
                              ? 'rgba(220, 53, 69, 0.2)' 
                              : item.novel.status === '暂停更新' 
                                ? 'rgba(255, 193, 7, 0.2)' 
                                : 'rgba(40, 167, 69, 0.2)',
                            color: item.novel.isCompleted 
                              ? '#dc3545' 
                              : item.novel.status === '暂停更新' 
                                ? '#ffc107' 
                                : '#28a745',
                            marginRight: '8px'
                          }}>
                            {item.novel.status || '连载中'}
                          </span>
                          <span style={{
                            fontSize: '0.8rem',
                            color: theme.textSecondary
                          }}>
                            {item.novel.totalChapters}章
                          </span>
                        </div>
                      </div>

                      {/* 阅读进度 */}
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                            阅读进度：{Math.round(item.novel.readProgress || 0)}%
                          </small>
                          <small style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                            已读：{item.novel.lastReadChapter || 0}/{item.novel.totalChapters || 0}章
                          </small>
                        </div>
                        <div style={{
                          height: '6px',
                          backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div 
                            style={{
                              height: '100%',
                              width: `${Math.round(item.novel.readProgress || 0)}%`,
                              backgroundColor: theme.accent,
                              borderRadius: '3px'
                            }}
                          ></div>
                        </div>
                        
                        {/* 最后阅读时间和删除按钮 */}
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <small style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                            最后阅读: {new Date(item.lastReadAt).toLocaleString('zh-CN', { 
                              year: 'numeric', 
                              month: 'numeric', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                          
                          {/* 删除按钮（垃圾桶图标） */}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.8rem',
                              borderRadius: '4px'
                            }}
                            onClick={(e) => deleteHistoryItem(item._id, e)}
                            title="删除此记录"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            ))}
          </div>

          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      style={{
                        backgroundColor: theme.cardBg,
                        color: theme.text,
                        borderColor: theme.border
                      }}
                    >
                      上一页
                    </button>
                  </li>
                  {[...Array(totalPages).keys()].map(num => (
                    <li key={num + 1} className={`page-item ${currentPage === num + 1 ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(num + 1)}
                        style={{
                          backgroundColor: currentPage === num + 1 ? theme.accent : theme.cardBg,
                          color: currentPage === num + 1 ? '#fff' : theme.text,
                          borderColor: theme.border
                        }}
                      >
                        {num + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      style={{
                        backgroundColor: theme.cardBg,
                        color: theme.text,
                        borderColor: theme.border
                      }}
                    >
                      下一页
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default History; 
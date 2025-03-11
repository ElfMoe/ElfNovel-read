import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { authorAPI } from '../../services/api';
import { novelAPI } from '../../services/api';
import { getFullImageUrl } from '../../utils/imageUtils';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

function Dashboard() {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [authorStats, setAuthorStats] = useState(null);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 删除小说相关状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNovelId, setDeleteNovelId] = useState(null);
  const [deleteNovelTitle, setDeleteNovelTitle] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAuthorData();
    }
  }, [isAuthenticated]);

  const fetchAuthorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 调用真实API获取作者数据
      const dashboardResponse = await authorAPI.getAuthorDashboard();
      const novelsResponse = await authorAPI.getAuthorNovels();
      
      console.log('仪表盘数据详情:', JSON.stringify(dashboardResponse, null, 2));
      console.log('小说列表数据详情:', JSON.stringify(novelsResponse, null, 2));

      // 处理仪表盘数据
      if (dashboardResponse.success) {
        console.log('处理仪表盘数据');
        // 提取统计数据
        const statsData = dashboardResponse.data?.authorStats || {
          genres: [],
          isVerified: false,
          totalReaders: 0,
          totalWordCount: 0,
          worksCount: 0,
          totalChapters: 0,
          totalCollections: 0
        };
        console.log('提取的统计数据:', statsData);
        console.log('章节总数:', statsData.totalChapters);
        setAuthorStats(statsData);
        
        // 提取小说列表
        const popularNovels = dashboardResponse.data?.popularNovels || [];
        if (popularNovels.length > 0) {
          setNovels(popularNovels);
        }
      } else {
        console.error('仪表盘数据获取失败:', dashboardResponse.message);
        setError(dashboardResponse.message || '获取作者统计数据失败');
      }

      // 处理小说列表数据
      if (novelsResponse.success) {
        console.log('处理小说列表数据');
        // 提取小说列表，确保数据存在
        const novelsData = novelsResponse.data?.novels || [];
        console.log('提取的小说数据:', novelsData);
        
        // 计算总收藏数
        const totalCollections = novelsData.reduce((sum, novel) => sum + (novel.collections || 0), 0);
        
        // 更新作者统计数据，添加总收藏数
        setAuthorStats(prevStats => ({
          ...prevStats,
          totalCollections: totalCollections
        }));
        
        setNovels(novelsData);
      } else {
        console.error('小说列表数据获取失败:', novelsResponse.message);
        setError(prevError => prevError || novelsResponse.message || '获取作者小说列表失败');
      }
    } catch (err) {
      console.error('获取作者数据出错:', err);
      setError('获取作者数据时出错，请稍后再试');
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

  // 表格样式
  const tableStyles = {
    table: {
      color: theme.text,
      backgroundColor: 'transparent',
      borderCollapse: 'separate',
      borderSpacing: '0 8px'
    },
    thead: {
      backgroundColor: theme.accent + '15', // 添加透明度
      borderRadius: '8px',
    },
    th: {
      color: theme.text,
      fontWeight: 'bold',
      padding: '12px 15px',
      borderBottom: 'none',
      fontSize: '0.9rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: 'transparent'
    },
    tr: {
      backgroundColor: theme.cardBg,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      transition: 'transform 0.2s',
      borderRadius: '8px',
      border: `1px solid ${theme.border}`
    },
    td: {
      padding: '12px 15px',
      verticalAlign: 'middle',
      borderTop: 'none',
      color: theme.text,
      fontSize: '0.95rem',
      backgroundColor: 'transparent'
    },
    coverImg: {
      width: '80px',
      height: '120px',
      objectFit: 'fill',
      borderRadius: '6px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
    },
    novelTitle: {
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: '4px'
    },
    novelAuthor: {
      fontSize: '0.85rem',
      color: theme.textSecondary
    },
    actionButton: {
      width: '36px',
      height: '36px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      transition: 'all 0.2s'
    }
  };

  // 打开删除确认对话框
  const handleDeleteClick = (novel) => {
    setDeleteNovelId(novel._id);
    setDeleteNovelTitle(novel.title);
    setDeleteConfirmation('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  // 关闭删除确认对话框
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteNovelId(null);
    setDeleteNovelTitle('');
    setDeleteConfirmation('');
    setDeleteError('');
  };

  // 处理删除确认输入
  const handleDeleteConfirmationChange = (e) => {
    setDeleteConfirmation(e.target.value);
    if (deleteError) setDeleteError('');
  };

  // 确认删除小说
  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== 'delete') {
      setDeleteError('请输入"delete"以确认删除');
      return;
    }

    try {
      setIsDeleting(true);
      const response = await authorAPI.deleteNovel(deleteNovelId);
      
      if (response.success) {
        // 从列表中移除已删除的小说
        setNovels(novels.filter(novel => novel._id !== deleteNovelId));
        // 更新作品数量
        setAuthorStats(prev => ({
          ...prev,
          worksCount: Math.max(0, prev.worksCount - 1)
        }));
        handleCloseDeleteModal();
      } else {
        setDeleteError(response.message || '删除小说失败');
      }
    } catch (err) {
      console.error('删除小说时出错:', err);
      setDeleteError('删除小说时出错，请稍后再试');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-5">
        <div style={cardStyle}>
          <h2 style={{ color: theme.text }}>请先登录</h2>
          <p style={{ color: theme.textSecondary }}>
            您需要登录后才能访问作者仪表盘。
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

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ color: theme.text }}>作者仪表盘</h1>
        <Link 
          to="/author/novels/create" 
          className="btn"
          style={{ 
            backgroundColor: theme.accent,
            color: '#fff'
          }}
        >
          <i className="bi bi-plus-circle me-2"></i>
          创建新小说
        </Link>
      </div>
      
      {/* 添加全局表格样式覆盖 */}
      <style jsx="true">{`
        .table {
          color: ${theme.text} !important;
          border-color: ${theme.border} !important;
        }
        .table thead tr {
          background-color: ${theme.accent + '15'} !important;
          color: ${theme.text} !important;
        }
        .table tbody tr {
          background-color: ${theme.cardBg} !important;
          color: ${theme.text} !important;
          border-color: ${theme.border} !important;
        }
        .table td, .table th {
          border-color: ${theme.border} !important;
          background-color: transparent !important;
        }
      `}</style>
      
      {loading ? (
        <div style={cardStyle} className="text-center py-5">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.textSecondary, marginTop: '1rem' }}>正在加载作者数据...</p>
        </div>
      ) : error ? (
        <div style={cardStyle}>
          <div className="alert alert-danger">{error}</div>
        </div>
      ) : (
        <>
          {/* 作者统计卡片 */}
          <div className="row row-cols-1 row-cols-md-3 row-cols-lg-5 g-4 mb-4">
            <div className="col">
              <div style={cardStyle} className="text-center h-100">
                <i className="bi bi-book" style={{ fontSize: '2rem', color: theme.accent }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>作品数量</h5>
                <p style={{ color: theme.textSecondary, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {authorStats?.worksCount || 0}
                </p>
              </div>
            </div>
            <div className="col">
              <div style={cardStyle} className="text-center h-100">
                <i className="bi bi-file-text" style={{ fontSize: '2rem', color: theme.accent }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>章节数量</h5>
                <p style={{ color: theme.textSecondary, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {authorStats?.totalChapters?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="col">
              <div style={cardStyle} className="text-center h-100">
                <i className="bi bi-pencil-square" style={{ fontSize: '2rem', color: theme.accent }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>总字数</h5>
                <p style={{ color: theme.textSecondary, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {authorStats?.totalWordCount?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="col">
              <div style={cardStyle} className="text-center h-100">
                <i className="bi bi-people" style={{ fontSize: '2rem', color: theme.accent }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>总阅读量</h5>
                <p style={{ color: theme.textSecondary, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {authorStats?.totalReaders?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <div className="col">
              <div style={cardStyle} className="text-center h-100">
                <i className="bi bi-bookmark-heart" style={{ fontSize: '2rem', color: theme.accent }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>总收藏数</h5>
                <p style={{ color: theme.textSecondary, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {authorStats?.totalCollections?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          {/* 我的作品 */}
          <div style={cardStyle}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 style={{ color: theme.text, margin: 0 }}>我的作品</h3>
              <Link 
                to="/author/novels/create" 
                className="btn btn-sm"
                style={{ 
                  backgroundColor: theme.accent,
                  color: '#fff',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.9rem'
                }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                新建作品
              </Link>
            </div>
            
            {novels.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-journal-x" style={{ fontSize: '3rem', color: theme.textSecondary }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>您还没有创建任何作品</h5>
                <p style={{ color: theme.textSecondary }}>开始创作您的第一部小说吧！</p>
                <Link 
                  to="/author/novels/create" 
                  className="btn"
                  style={{ 
                    backgroundColor: theme.accent,
                    color: '#fff',
                    marginTop: '1rem'
                  }}
                >
                  创建新小说
                </Link>
              </div>
            ) : (
              <>
                {/* 桌面版表格视图 - 在中大屏幕显示 */}
                <div className="d-none d-lg-block table-responsive">
                  <table className="table" style={tableStyles.table}>
                    <thead style={tableStyles.thead}>
                      <tr style={{ backgroundColor: 'transparent' }}>
                        {["封面", "作品信息", "章节数", "状态", "数据统计", "最后更新", "操作"].map(header => (
                          <th key={header} style={tableStyles.th} scope="col">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: theme.cardBg }}>
                      {novels.map(novel => (
                        <tr key={novel._id} style={tableStyles.tr}>
                          <td style={{...tableStyles.td, textAlign: 'center'}}>
                            <img 
                              src={getFullImageUrl(novel.cover, '/images/default-cover.jpg', {
                                title: novel.title,
                                author: novel.authorName
                              })} 
                              alt={novel.title}
                              style={tableStyles.coverImg}
                              onError={(e) => {
                                if (!e.target.src.includes('default-cover.jpg')) {
                                  console.log('封面加载失败，使用默认封面', e.target.src);
                                  e.target.onerror = null;
                                  e.target.src = `${window.location.origin}/images/default-cover.jpg`;
                                }
                              }}
                            />
                          </td>
                          <td style={tableStyles.td}>
                            <div style={tableStyles.novelTitle}>《{novel.title}》</div>
                            <div style={tableStyles.novelAuthor}>作者: {novel.authorName}</div>
                          </td>
                          <td style={tableStyles.td}>
                            <div className="text-center">
                              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{novel.totalChapters || 0}</div>
                              <div style={{ fontSize: '0.8rem', color: theme.textSecondary }}>章</div>
                            </div>
                          </td>
                          <td style={tableStyles.td}>
                            <span className="px-2 py-1 rounded" style={{
                              backgroundColor: novel.status === '连载中' 
                                ? '#28a745' 
                                : novel.status === '已完结' 
                                  ? '#dc3545' 
                                  : '#ffc107',
                              color: novel.status === '连载中' 
                                ? 'white' 
                                : novel.status === '已完结' 
                                  ? 'white' 
                                  : 'black',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '0.25rem'
                            }}>
                              {novel.status || '连载中'}
                            </span>
                          </td>
                          <td style={tableStyles.td}>
                            <div className="d-flex gap-3">
                              <div className="text-center">
                                <div><i className="bi bi-eye"></i> {novel.readers || 0}</div>
                                <small style={{ color: theme.textSecondary }}>阅读</small>
                              </div>
                              <div className="text-center">
                                <div><i className="bi bi-bookmark"></i> {novel.collections || 0}</div>
                                <small style={{ color: theme.textSecondary }}>收藏</small>
                              </div>
                            </div>
                          </td>
                          <td style={tableStyles.td}>
                            <div style={{ color: theme.textSecondary }}>
                              {new Date(novel.updatedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={tableStyles.td}>
                            <div className="d-flex gap-2">
                              <Link 
                                to={`/novel/${novel._id}`}
                                className="btn btn-sm"
                                title="查看"
                                style={{ 
                                  ...tableStyles.actionButton, 
                                  backgroundColor: theme.cardBg,
                                  color: theme.accent,
                                  border: `1px solid ${theme.accent}`
                                }}
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                              <Link 
                                to={`/author/novels/${novel._id}`}
                                className="btn btn-sm"
                                title="编辑"
                                style={{ 
                                  ...tableStyles.actionButton, 
                                  backgroundColor: theme.accent,
                                  color: '#fff'
                                }}
                              >
                                <i className="bi bi-pencil-square"></i>
                              </Link>
                              <Link 
                                to={`/author/novels/${novel._id}/chapters/create`}
                                className="btn btn-sm"
                                title="更新章节"
                                style={{ 
                                  ...tableStyles.actionButton, 
                                  backgroundColor: '#28a745',
                                  color: '#fff',
                                  fontWeight: 'bold'
                                }}
                              >
                                <i className="bi bi-plus-circle-fill"></i>
                              </Link>
                              <Link 
                                to={`/author/novels/${novel._id}/chapters`}
                                className="btn btn-sm"
                                title="章节管理"
                                style={{ 
                                  ...tableStyles.actionButton, 
                                  backgroundColor: theme.secondary,
                                  color: '#fff'
                                }}
                              >
                                <i className="bi bi-list-ul" style={{ color: '#fff' }}></i>
                              </Link>
                              <button 
                                className="btn btn-sm"
                                title="删除作品"
                                onClick={() => handleDeleteClick(novel)}
                                style={{ 
                                  ...tableStyles.actionButton, 
                                  backgroundColor: theme.danger,
                                  color: '#fff'
                                }}
                              >
                                <i className="bi bi-trash" style={{ color: '#fff' }}></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* 移动端卡片视图 - 在小屏幕显示 */}
                <div className="d-lg-none">
                  <div className="row g-3">
                    {novels.map(novel => (
                      <div key={novel._id} className="col-12">
                        <div style={{
                          ...cardStyle,
                          padding: '1rem',
                          borderRadius: '0.5rem',
                        }}>
                          <div className="d-flex">
                            <div style={{ 
                              width: '80px', 
                              marginRight: '1rem',
                              flexShrink: 0
                            }}>
                              <img 
                                src={getFullImageUrl(novel.cover, '/images/default-cover.jpg', {
                                  title: novel.title,
                                  author: novel.authorName
                                })} 
                                alt={novel.title}
                                style={{
                                  width: '100%',
                                  aspectRatio: '2/3',
                                  objectFit: 'cover',
                                  borderRadius: '0.25rem'
                                }}
                                onError={(e) => {
                                  if (!e.target.src.includes('default-cover.jpg')) {
                                    e.target.onerror = null;
                                    e.target.src = `${window.location.origin}/images/default-cover.jpg`;
                                  }
                                }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                color: theme.text,
                                marginBottom: '0.25rem'
                              }}>
                                《{novel.title}》
                              </div>
                              <div style={{ 
                                fontSize: '0.9rem', 
                                color: theme.textSecondary,
                                marginBottom: '0.5rem'
                              }}>
                                作者: {novel.authorName}
                              </div>
                              
                              <div className="d-flex align-items-center mb-2" style={{ gap: '0.75rem' }}>
                                <span className="px-2 py-1" style={{
                                  backgroundColor: novel.status === '连载中' 
                                    ? '#28a745' 
                                    : novel.status === '已完结' 
                                      ? '#dc3545' 
                                      : '#ffc107',
                                  color: novel.status === '连载中' 
                                    ? 'white' 
                                    : novel.status === '已完结' 
                                      ? 'white' 
                                      : 'black',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '0.25rem'
                                }}>
                                  {novel.status || '连载中'}
                                </span>
                                
                                <span style={{ 
                                  fontSize: '0.85rem',
                                  color: theme.textSecondary
                                }}>
                                  <i className="bi bi-book me-1"></i>
                                  {novel.totalChapters || 0}章
                                </span>
                                
                                <span style={{ 
                                  fontSize: '0.85rem',
                                  color: theme.textSecondary
                                }}>
                                  {new Date(novel.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <div className="d-flex gap-3 mb-3">
                                <div style={{ fontSize: '0.85rem' }}>
                                  <i className="bi bi-eye me-1"></i> {novel.readers || 0}
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                  <i className="bi bi-bookmark me-1"></i> {novel.collections || 0}
                                </div>
                              </div>
                              
                              <div className="d-flex flex-wrap gap-2">
                                <Link 
                                  to={`/novel/${novel._id}`}
                                  className="btn btn-sm"
                                  title="查看"
                                  style={{ 
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: theme.cardBg,
                                    color: theme.accent,
                                    border: `1px solid ${theme.accent}`,
                                    borderRadius: '0.375rem'
                                  }}
                                >
                                  <i className="bi bi-eye me-1"></i>查看
                                </Link>
                                <Link 
                                  to={`/author/novels/${novel._id}`}
                                  className="btn btn-sm"
                                  title="编辑"
                                  style={{ 
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: theme.accent,
                                    color: 'white',
                                    borderRadius: '0.375rem'
                                  }}
                                >
                                  <i className="bi bi-pencil-square me-1"></i>编辑
                                </Link>
                                <Link 
                                  to={`/author/novels/${novel._id}/chapters/create`}
                                  className="btn btn-sm"
                                  title="更新章节"
                                  style={{ 
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: '#28a745',
                                    color: '#fff',
                                    borderRadius: '0.375rem'
                                  }}
                                >
                                  <i className="bi bi-plus-circle-fill me-1"></i>新增
                                </Link>
                                <Link 
                                  to={`/author/novels/${novel._id}/chapters`}
                                  className="btn btn-sm"
                                  title="章节管理"
                                  style={{ 
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: theme.secondary,
                                    color: '#fff',
                                    borderRadius: '0.375rem'
                                  }}
                                >
                                  <i className="bi bi-list-ul me-1"></i>章节
                                </Link>
                                <button 
                                  className="btn btn-sm"
                                  title="删除作品"
                                  onClick={() => handleDeleteClick(novel)}
                                  style={{ 
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: theme.danger,
                                    color: '#fff',
                                    borderRadius: '0.375rem'
                                  }}
                                >
                                  <i className="bi bi-trash me-1"></i>删除
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* 删除确认对话框 */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered backdrop="static">
        <Modal.Header style={{
          backgroundColor: theme.cardBg,
          borderBottom: `1px solid ${theme.border}`,
          color: theme.modalText
        }}>
          <Modal.Title>确认删除</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{
          backgroundColor: theme.cardBg,
          color: theme.modalText
        }}>
          <p>您确定要删除《{deleteNovelTitle}》吗？此操作<strong>不可逆</strong>，删除后所有相关内容将永久丢失！</p>
          <p>请在下方输入<strong>"delete"</strong>以确认删除：</p>
          <Form.Group>
            <Form.Control 
              type="text" 
              value={deleteConfirmation} 
              onChange={handleDeleteConfirmationChange}
              placeholder="请输入 delete"
              style={{
                backgroundColor: theme.inputBg,
                color: theme.inputText,
                border: `1px solid ${theme.border}`
              }}
            />
          </Form.Group>
          {deleteError && <p className="text-danger mt-2">{deleteError}</p>}
        </Modal.Body>
        <Modal.Footer style={{
          backgroundColor: theme.cardBg,
          borderTop: `1px solid ${theme.border}`
        }}>
          <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting}>
            取消
          </Button>
          <Button 
            variant="danger" 
            onClick={handleConfirmDelete} 
            disabled={deleteConfirmation !== 'delete' || isDeleting}
          >
            {isDeleting ? '删除中...' : '确认删除'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Dashboard; 
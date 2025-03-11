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

function Novels() {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
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
      fetchNovels();
    }
  }, [isAuthenticated]);

  const fetchNovels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 调用真实API获取小说列表
      const response = await authorAPI.getAuthorNovels();
      
      if (response.success) {
        // 提取小说列表数据
        const novelsData = response.data?.novels || [];
        
        // 确保数据有效
        if (Array.isArray(novelsData) && novelsData.length > 0) {
          setNovels(novelsData);
        } else {
          setNovels([]);
        }
      } else {
        console.error('获取小说列表失败:', response.message);
        setError(response.message || '获取作品列表失败');
      }
    } catch (err) {
      console.error('获取作品列表出错:', err);
      setError('获取作品列表时出错，请稍后再试');
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

  // 表格样式 - 与Dashboard保持一致
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
      letterSpacing: '0.5px'
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
      fontSize: '0.95rem'
    },
    coverImg: {
      width: '100px',
      height: '150px',
      objectFit: 'fill',
      borderRadius: '8px',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
      marginRight: '1.5rem',
      backgroundColor: 'transparent'
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
    },
    novelCard: {
      backgroundColor: theme.cardBg,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '1.8rem',
      marginBottom: '1.5rem',
      border: `1px solid ${theme.border}`,
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'flex-start'
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
        handleCloseDeleteModal();
        // 可以添加一个成功提示
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
            您需要登录后才能查看您的作品列表。
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
        <h1 style={{ color: theme.text }}>我的作品</h1>
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
      
      {/* 添加全局样式覆盖 */}
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
          <p style={{ color: theme.textSecondary, marginTop: '1rem' }}>正在加载作品列表...</p>
        </div>
      ) : error ? (
        <div style={cardStyle}>
          <div className="alert alert-danger">{error}</div>
        </div>
      ) : novels.length === 0 ? (
        <div style={cardStyle} className="text-center py-5">
          <i className="bi bi-journal-x" style={{ fontSize: '3rem', color: theme.textSecondary }}></i>
          <h3 style={{ color: theme.text, marginTop: '1rem' }}>您还没有创建任何作品</h3>
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
        <div className="row g-4">
          {novels.map(novel => (
            <div key={novel._id} className="col-12">
              <div style={tableStyles.novelCard}>
                <div className="d-md-flex">
                  <div className="d-flex justify-content-center mb-3 mb-md-0">
                    <img 
                      src={getFullImageUrl(novel.cover, '/images/default-cover.jpg', {
                        title: novel.title,
                        author: novel.authorName
                      })} 
                      alt={novel.title}
                      style={{
                        ...tableStyles.coverImg,
                        width: '120px',
                        maxWidth: '120px',
                        height: '180px',
                      }}
                      onLoad={() => console.log(`封面加载成功: ${novel.title}`)}
                      onError={(e) => {
                        if (!e.target.src.includes('default-cover.jpg')) {
                          console.log('封面加载失败，使用默认封面', e.target.src);
                          e.target.onerror = null;
                          e.target.src = `${window.location.origin}/images/default-cover.jpg`;
                        }
                      }}
                    />
                  </div>
                  <div className="d-flex flex-column flex-grow-1">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2">
                      <h4 style={{ color: theme.text, margin: 0 }}>《{novel.title}》</h4>
                      <span className="px-2 py-1 rounded mt-2 mt-md-0" style={{
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
                        {novel.status}
                      </span>
                    </div>
                    
                    <p style={{ color: theme.textSecondary, fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {novel.shortDescription || '暂无简介'}
                    </p>
                    
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-end mt-auto">
                      <div className="d-flex flex-wrap gap-3 mb-3 mb-md-0">
                        <div>
                          <small style={{ color: theme.textSecondary }}>章节</small>
                          <div style={{ fontWeight: 'bold' }}>{novel.totalChapters || 0}</div>
                        </div>
                        <div>
                          <small style={{ color: theme.textSecondary }}>阅读量</small>
                          <div style={{ fontWeight: 'bold' }}>{novel.readers || 0}</div>
                        </div>
                        <div>
                          <small style={{ color: theme.textSecondary }}>收藏</small>
                          <div style={{ fontWeight: 'bold' }}>{novel.collections || 0}</div>
                        </div>
                        <div>
                          <small style={{ color: theme.textSecondary }}>最后更新</small>
                          <div>{new Date(novel.updatedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      
                      <div className="d-flex flex-wrap gap-2">
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
                          <span className="d-none d-sm-inline ms-1">查看</span>
                        </Link>
                        <Link 
                          to={`/author/novels/${novel._id}`}
                          className="btn btn-sm"
                          title="编辑作品"
                          style={{ 
                            ...tableStyles.actionButton, 
                            backgroundColor: theme.accent,
                            color: '#fff'
                          }}
                        >
                          <i className="bi bi-pencil-square"></i>
                          <span className="d-none d-sm-inline ms-1">编辑</span>
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
                          <span className="d-none d-sm-inline ms-1">新增</span>
                        </Link>
                        <Link 
                          to={`/author/novels/${novel._id}/chapters`}
                          className="btn btn-sm"
                          title="管理章节"
                          style={{ 
                            ...tableStyles.actionButton, 
                            backgroundColor: theme.secondary,
                            color: '#fff'
                          }}
                        >
                          <i className="bi bi-list-ul" style={{ color: '#fff' }}></i>
                          <span className="d-none d-sm-inline ms-1">章节</span>
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
                          <span className="d-none d-sm-inline ms-1">删除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

export default Novels; 
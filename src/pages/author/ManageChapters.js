import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { authorAPI } from '../../services/api';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { toast } from 'react-toastify';

function ManageChapters() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { novelId } = useParams();
  
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 章节删除相关状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChapterId, setDeleteChapterId] = useState(null);
  const [deleteChapterTitle, setDeleteChapterTitle] = useState('');
  const [deleteChapterNumber, setDeleteChapterNumber] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 添加状态修改相关状态
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchNovelAndChapters();
    }
  }, [isAuthenticated, novelId]);
  
  const fetchNovelAndChapters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始获取小说和章节数据，小说ID:', novelId);
      
      // 获取小说信息
      const novelResponse = await authorAPI.getNovelDetail(novelId);
      console.log('小说详情响应:', novelResponse);
      
      // 获取章节列表
      const chaptersResponse = await authorAPI.getNovelChapters(novelId);
      console.log('章节列表响应:', chaptersResponse);
      
      if (novelResponse.success) {
        setNovel(novelResponse.data);
        console.log('设置小说数据:', novelResponse.data);
      } else {
        console.error('获取小说信息失败:', novelResponse.message);
        setError(novelResponse.message || '获取小说信息失败');
      }
      
      if (chaptersResponse.success) {
        console.log('章节数据请求成功，数据:', chaptersResponse.data);
        // 检查数据格式
        if (Array.isArray(chaptersResponse.data)) {
          setChapters(chaptersResponse.data);
          console.log('设置章节数据，数量:', chaptersResponse.data.length);
        } else {
          console.error('章节数据不是数组:', chaptersResponse.data);
          setChapters([]);
          setError('章节数据格式错误');
        }
      } else {
        console.error('获取章节列表失败:', chaptersResponse.message);
        setError(prevError => prevError || chaptersResponse.message || '获取章节列表失败');
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载数据时出错，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteClick = (chapter) => {
    setDeleteChapterId(chapter._id);
    setDeleteChapterTitle(chapter.title);
    setDeleteChapterNumber(chapter.chapterNumber);
    setDeleteConfirmation('');
    setDeleteError('');
    setShowDeleteModal(true);
  };
  
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteChapterId(null);
    setDeleteChapterTitle('');
    setDeleteConfirmation('');
    setDeleteError('');
  };
  
  const handleDeleteConfirmationChange = (e) => {
    setDeleteConfirmation(e.target.value);
    if (deleteError) setDeleteError('');
  };
  
  // 检查章节是否可以删除（只能删除最大章节号的章节）
  const isChapterDeletable = (chapterNumber) => {
    if (!chapters || chapters.length === 0) return false;
    
    // 获取最大章节号
    const maxChapterNumber = Math.max(...chapters.map(ch => ch.chapterNumber));
    
    // 如果当前章节是最大章节号，则可以删除
    return chapterNumber === maxChapterNumber;
  };
  
  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== 'delete') {
      setDeleteError('请输入 "delete" 以确认删除');
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await authorAPI.deleteChapter(novelId, deleteChapterId);
      
      if (response.success) {
        console.log('章节删除成功，刷新数据');
        
        // 强制刷新所有相关数据
        try {
          // 同时刷新小说详情和章节列表
          await Promise.all([
            authorAPI.getNovelDetail(novelId),
            authorAPI.getNovelChapters(novelId)
          ]);
          
          console.log('数据刷新完成，重新获取最新数据');
        } catch (refreshError) {
          console.error('强制刷新失败:', refreshError);
        }
        
        // 重新获取数据，确保页面显示最新状态
        await fetchNovelAndChapters();
        handleCloseDeleteModal();
      } else {
        setDeleteError(response.message || '删除章节失败');
      }
    } catch (err) {
      console.error('删除章节时出错:', err);
      setDeleteError('删除章节时出错，请稍后再试');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 添加状态修改功能
  const handleStatusClick = () => {
    setNewStatus(novel?.status || '连载中');
    setShowStatusModal(true);
  };

  const handleStatusChange = (e) => {
    setNewStatus(e.target.value);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
  };

  const handleUpdateStatus = async () => {
    try {
      setIsUpdatingStatus(true);
      
      console.log('开始更新小说状态，小说ID:', novelId, '新状态:', newStatus);
      
      // 调用API更新小说状态
      const response = await authorAPI.updateNovelStatus(novelId, newStatus);
      console.log('状态更新API响应:', response);
      
      if (response.success) {
        // 更新本地小说状态
        setNovel(prev => {
          const updated = { ...prev, status: newStatus };
          console.log('更新后的小说对象:', updated);
          return updated;
        });
        
        toast.success('小说状态更新成功');
        setShowStatusModal(false);
        
        // 重新获取小说信息，确保状态已更新
        setTimeout(() => {
          fetchNovelAndChapters();
        }, 500);
      } else {
        console.error('更新状态失败:', response);
        
        // 尝试直接修改小说对象
        try {
          console.log('尝试直接修改小说对象...');
          // 直接更新小说状态
          setNovel(prev => {
            if (!prev) return prev;
            const updated = { ...prev, status: newStatus };
            console.log('直接更新后的小说对象:', updated);
            return updated;
          });
          
          toast.success('小说状态已在本地更新');
          setShowStatusModal(false);
          
          // 显示警告
          setTimeout(() => {
            toast.warning('服务器同步可能失败，请刷新页面确认状态');
          }, 1000);
        } catch (localUpdateError) {
          console.error('本地更新失败:', localUpdateError);
          toast.error('更新状态失败: ' + (response.message || '未知错误'));
        }
      }
    } catch (err) {
      console.error('更新小说状态出错:', err);
      toast.error('更新状态时出错，请稍后再试');
    } finally {
      setIsUpdatingStatus(false);
    }
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
  
  const tableStyles = {
    table: {
      borderColor: theme.border,
      color: theme.text,
      marginBottom: 0
    },
    thead: {
      backgroundColor: theme.accent + '15',
      color: theme.text
    },
    th: {
      borderColor: theme.border,
      fontWeight: 'bold',
      padding: '0.75rem',
      color: theme.text,
      textAlign: 'center'
    },
    tr: {
      borderColor: theme.border
    },
    td: {
      borderColor: theme.border,
      padding: '0.75rem',
      verticalAlign: 'middle'
    },
    actionButton: {
      fontSize: '0.85rem',
      padding: '0.25rem 0.5rem'
    }
  };
  
  return (
    <div style={containerStyle}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: theme.text }}>章节管理</h2>
        <div className="d-flex gap-2">
          <Link 
            to={`/author/novels/${novelId}`}
            className="btn btn-sm"
            style={{ 
              backgroundColor: theme.cardBg,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            返回小说管理
          </Link>
          <Link 
            to={`/author/novels/${novelId}/chapters/create`}
            className="btn btn-sm"
            style={{ 
              backgroundColor: theme.accent,
              color: '#fff'
            }}
          >
            <i className="bi bi-plus-circle me-2"></i>
            添加新章节
          </Link>
        </div>
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
          <p style={{ color: theme.textSecondary, marginTop: '1rem' }}>正在加载章节数据...</p>
        </div>
      ) : error ? (
        <div style={cardStyle}>
          <div className="alert alert-danger">{error}</div>
          <div className="text-center mt-3">
            <button 
              className="btn" 
              onClick={fetchNovelAndChapters}
              style={{ 
                backgroundColor: theme.accent,
                color: '#fff'
              }}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              重新加载
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 小说信息卡片 */}
          <div style={cardStyle} className="mb-4">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h3 style={{ color: theme.text, margin: 0 }}>《{novel?.title}》</h3>
                <p style={{ color: theme.textSecondary, marginTop: '0.5rem' }}>
                  作者: {novel?.authorName} | 总章节数: {chapters.length}
                </p>
              </div>
              <div className="d-flex align-items-center">
                <span style={{ 
                  marginRight: '10px',
                  color: theme.textSecondary
                }}>
                  状态: 
                </span>
                <button 
                  onClick={handleStatusClick}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: novel?.status === '连载中' 
                      ? '#28a745' 
                      : novel?.status === '已完结' 
                        ? '#dc3545' 
                        : '#ffc107',
                    color: novel?.status === '连载中' || novel?.status === '已完结'
                      ? 'white' 
                      : 'black',
                    border: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  {novel?.status || '连载中'}
                  <i className="bi bi-pencil-fill ms-2" style={{ fontSize: '0.7rem' }}></i>
                </button>
              </div>
            </div>
          </div>
          
          {/* 章节列表 */}
          <div style={cardStyle}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 style={{ color: theme.text, margin: 0 }}>章节列表</h4>
              {chapters && chapters.length > 0 && (
                <span style={{ color: theme.textSecondary, fontSize: '0.9rem' }}>
                  共 {chapters.length} 章
                </span>
              )}
            </div>
            
            {!chapters || chapters.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-journal-text" style={{ fontSize: '3rem', color: theme.textSecondary }}></i>
                <h5 style={{ color: theme.text, marginTop: '1rem' }}>暂无章节</h5>
                <p style={{ color: theme.textSecondary }}>开始创建您的第一章吧！</p>
                <Link 
                  to={`/author/novels/${novelId}/chapters/create`} 
                  className="btn"
                  style={{ 
                    backgroundColor: theme.accent,
                    color: '#fff',
                    marginTop: '1rem'
                  }}
                >
                  创建第一章
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={tableStyles.table}>
                  <thead style={tableStyles.thead}>
                    <tr>
                      <th style={tableStyles.th} width="8%">章节号</th>
                      <th style={tableStyles.th} width="40%">标题</th>
                      <th style={tableStyles.th} width="12%">字数</th>
                      <th style={tableStyles.th} width="12%">阅读量</th>
                      <th style={tableStyles.th} width="15%">更新时间</th>
                      <th style={tableStyles.th} width="17%">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chapter) => (
                      <tr key={chapter._id} style={tableStyles.tr}>
                        <td style={{...tableStyles.td, textAlign: 'center'}}>
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: theme.text,
                            padding: chapter.isExtra ? '0.1rem 0.4rem' : '0',
                            backgroundColor: chapter.isExtra ? `${theme.accent}30` : 'transparent',
                            borderRadius: '0.25rem'
                          }}>
                            {chapter.isExtra ? (
                              <>番外</>
                            ) : (
                              chapter.chapterNumber
                            )}
                          </span>
                        </td>
                        <td style={{...tableStyles.td, color: theme.text}}>
                          {chapter.title}
                        </td>
                        <td style={{...tableStyles.td, textAlign: 'center', color: theme.text}}>
                          {chapter.wordCount}
                        </td>
                        <td style={{...tableStyles.td, textAlign: 'center', color: theme.text}}>
                          {chapter.viewCount || 0}
                        </td>
                        <td style={{...tableStyles.td, textAlign: 'center', color: theme.textSecondary}}>
                          {new Date(chapter.updatedAt).toLocaleDateString()}
                        </td>
                        <td style={tableStyles.td}>
                          <div className="d-flex gap-2 justify-content-center">
                            <Link 
                              to={`/novel/${novelId}/read/${chapter.chapterNumber}`}
                              className="btn btn-sm"
                              title="预览"
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
                              to={`/author/novels/${novelId}/chapters/${chapter._id}/edit`}
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
                            <button 
                              className="btn btn-sm"
                              title={isChapterDeletable(chapter.chapterNumber) 
                                ? "删除章节" 
                                : "只能删除最新章节"}
                              onClick={() => handleDeleteClick(chapter)}
                              disabled={!isChapterDeletable(chapter.chapterNumber)}
                              style={{ 
                                ...tableStyles.actionButton, 
                                backgroundColor: isChapterDeletable(chapter.chapterNumber) 
                                  ? theme.danger 
                                  : theme.cardBg,
                                color: isChapterDeletable(chapter.chapterNumber) 
                                  ? '#fff' 
                                  : theme.textSecondary,
                                opacity: isChapterDeletable(chapter.chapterNumber) ? 1 : 0.5,
                                cursor: isChapterDeletable(chapter.chapterNumber) 
                                  ? 'pointer' 
                                  : 'not-allowed'
                              }}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* 删除确认对话框 */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered backdrop="static">
        <Modal.Header style={{
          backgroundColor: theme.cardBg,
          borderBottom: `1px solid ${theme.border}`,
          color: theme.text
        }}>
          <Modal.Title>确认删除章节</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{
          backgroundColor: theme.cardBg,
          color: theme.text
        }}>
          <p>您确定要删除第 {deleteChapterNumber} 章《{deleteChapterTitle}》吗？此操作<strong>不可逆</strong>！</p>
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
          <Button variant="secondary" onClick={handleCloseDeleteModal}>取消</Button>
          <Button variant="danger" onClick={handleConfirmDelete}>确认删除</Button>
        </Modal.Footer>
      </Modal>
      
      {/* 状态修改对话框 */}
      <Modal show={showStatusModal} onHide={handleCloseStatusModal} centered backdrop="static">
        <Modal.Header style={{
          backgroundColor: theme.cardBg,
          borderBottom: `1px solid ${theme.border}`,
          color: theme.text
        }}>
          <Modal.Title>修改小说状态</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{
          backgroundColor: theme.cardBg,
          color: theme.text
        }}>
          <Form.Group>
            <Form.Label>小说状态</Form.Label>
            <Form.Select 
              value={newStatus} 
              onChange={handleStatusChange}
              style={{
                backgroundColor: theme.inputBg,
                color: theme.inputText,
                border: `1px solid ${theme.border}`
              }}
            >
              <option value="连载中">连载中</option>
              <option value="已完结">已完结</option>
              <option value="暂停更新">暂停更新</option>
            </Form.Select>
            
            {newStatus === '已完结' && (
              <div className="alert alert-info mt-3" style={{ fontSize: '0.9rem' }}>
                <i className="bi bi-info-circle me-2"></i>
                <strong>小说已完结提示：</strong> 
                <ul className="mb-0 mt-1">
                  <li>完结后仍可添加新章节，但会自动标记为"番外"</li>
                  <li>如需继续连载，可随时将状态改回"连载中"</li>
                  <li>完结状态会在小说页面特别标识，提升读者体验</li>
                </ul>
              </div>
            )}
            
            {newStatus === '暂停更新' && (
              <div className="alert alert-warning mt-3" style={{ fontSize: '0.9rem' }}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>暂停更新提示：</strong> 
                <ul className="mb-0 mt-1">
                  <li>暂停更新状态会在小说页面显示，告知读者</li>
                  <li>您仍可以添加新章节或编辑现有章节</li>
                  <li>随时可以将状态改回"连载中"继续更新</li>
                </ul>
              </div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{
          backgroundColor: theme.cardBg,
          borderTop: `1px solid ${theme.border}`
        }}>
          <Button variant="secondary" onClick={handleCloseStatusModal}>取消</Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateStatus}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? '更新中...' : '确认修改'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ManageChapters;
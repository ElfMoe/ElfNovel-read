import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { novelAPI } from '../services/api';
import { getFullImageUrl } from '../utils/imageUtils';
import { Dropdown, Form, InputGroup } from 'react-bootstrap';
// import { FaSearch, FaFilter, FaSortAmountDown, FaClock, FaHeart, FaEye } from 'react-icons/fa';

function NovelLibrary() {
  const { theme, isDark } = useTheme();
  const navigate = useNavigate();
  
  // 小说数据
  const [novels, setNovels] = useState([]);
  const [filteredNovels, setFilteredNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [novelChapters, setNovelChapters] = useState({}); // 存储小说章节信息
  
  // 搜索和排序
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 9; // 每页显示9本小说，3行3列布局
  
  // 展开描述和标签功能
  const [expandedDesc, setExpandedDesc] = useState({});
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
  
  // 容器样式 - 增加最大宽度
  const containerStyle = {
    maxWidth: '1400px', // 增加最大宽度
    margin: '0 auto',
    padding: '0 30px' // 增加内边距
  };

  // 卡片样式
  const cardStyle = {
    backgroundColor: theme.cardBg,
    color: theme.text,
    borderColor: theme.border,
    borderRadius: '0.75rem', // 增加圆角
    boxShadow: isDark ? '0 5px 20px rgba(0, 0, 0, 0.5)' : '0 5px 20px rgba(0, 0, 0, 0.1)',
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

  // 小说卡片样式 - 增强卡片效果
  const novelCardStyle = {
    ...cardStyle,
    height: '100%',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    marginBottom: '0',
    backgroundColor: theme.cardBg,
    border: 'none', // 移除边框
    overflow: 'hidden'
  };

  // 小说卡片内容区域样式
  const novelCardBodyStyle = {
    ...cardBodyStyle,
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  };

  // 小说封面样式 - 增加高度和质量
  const coverStyle = {
    width: '100%',
    aspectRatio: '2/3', // 标准书籍封面比例
    objectFit: 'cover',
    objectPosition: 'center',
    borderRadius: '0.75rem 0.75rem 0 0', // 顶部圆角
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' // 封面阴影
  };

  // 标签样式 - 圆形风格
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

  // 状态样式
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

  // 对所有Bootstrap卡片强制应用我们的样式（覆盖默认样式）
  useEffect(() => {
    // 添加全局样式来确保所有卡片在暗模式下有正确的背景色
    if (!document.getElementById('novel-library-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'novel-library-styles';
      styleElement.textContent = `
        /* 强制覆盖所有卡片及其子元素的背景色 */
        .novel-library-page .card {
          background-color: ${theme.cardBg} !important;
        }
        
        .novel-library-page .card-header {
          background-color: ${isDark ? '#2a2a2a' : '#f0f0f0'} !important;
          border-color: ${theme.border} !important;
        }
        
        .novel-library-page .card-body {
          background-color: ${theme.cardBg} !important;
        }
        
        /* 页面整体背景 */
        .novel-library-page {
          background-color: ${isDark ? theme.background : '#fff'} !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // 清理样式
      const styleElement = document.getElementById('novel-library-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [theme, isDark]);

  // 获取小说章节信息
  const fetchNovelChapters = async (novelId) => {
    try {
      const response = await novelAPI.getNovelChapters(novelId, { limit: 1 });
      
      if (response.success) {
        setNovelChapters(prev => ({
          ...prev,
          [novelId]: {
            count: response.total || 0,
            chapters: response.data || []
          }
        }));
      }
    } catch (err) {
      console.error('获取小说章节信息出错：', err);
    }
  };

  // 获取所有小说
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 调用API获取小说列表
        const response = await novelAPI.getNovelList({ 
          page: 1, 
          limit: 100, // 初始获取较多小说，后续可改为分页加载
          sortBy: 'updatedAt',
          sortDirection: 'desc',
          includeDetails: true // 明确请求包含详细信息，包括标签和分类
        });
        
        // 调试输出完整的API响应
        console.log('API响应的完整小说数据:', response);
        
        if (response.success) {
          const novelsData = response.data || [];
          
          // 处理小说数据
          const processedNovels = novelsData.map(novel => {
            // 调试每本小说的原始数据
            console.log(`小说 ${novel.title} 的完整数据:`, novel);
            
            const hasCategories = novel.categories && Array.isArray(novel.categories);
            const hasTags = novel.tags && Array.isArray(novel.tags);
            
            // 尝试从其他可能的字段获取分类和标签信息
            let processedCategories = [];
            if (hasCategories) {
              processedCategories = novel.categories;
            } else if (novel.categories) {
              processedCategories = [novel.categories];
            } else if (novel.genre) {
              // 尝试从genre字段获取分类
              processedCategories = Array.isArray(novel.genre) ? novel.genre : [novel.genre];
            } else if (novel.categoryNames) {
              // 尝试从categoryNames字段获取分类
              processedCategories = Array.isArray(novel.categoryNames) ? novel.categoryNames : [novel.categoryNames];
            }
            
            let processedTags = [];
            if (hasTags) {
              processedTags = novel.tags;
            } else if (novel.tags) {
              processedTags = [novel.tags];
            } else if (novel.tagNames) {
              // 尝试从tagNames字段获取标签
              processedTags = Array.isArray(novel.tagNames) ? novel.tagNames : [novel.tagNames];
            }
            
            // 硬编码一些测试标签，如果API确实没有返回任何标签数据
            if (processedCategories.length === 0 && processedTags.length === 0) {
              if (novel.title.includes('反叛者')) {
                processedCategories = ['科幻', '赛博朋克'];
              } else if (novel.title.includes('春日')) {
                processedCategories = ['青春', '校园'];
                processedTags = ['恋爱', '日常'];
              } else if (novel.title.includes('王座')) {
                processedCategories = ['奇幻', '冒险'];
              } else {
                // 为其他小说提供默认分类
                processedCategories = ['其他'];
              }
            }
            
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
          
          setNovels(processedNovels);
          setFilteredNovels(processedNovels);
          setTotalPages(Math.ceil(processedNovels.length / ITEMS_PER_PAGE));
          
          // 为每本小说获取章节信息
          processedNovels.forEach(novel => {
            if (novel._id) {
              fetchNovelChapters(novel._id);
            }
          });
        } else {
          setError('获取小说列表失败');
        }
      } catch (err) {
        console.error('获取小说列表出错：', err);
        setError('获取小说列表出错');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNovels();
  }, []);

  // 处理搜索和排序
  useEffect(() => {
    // 先过滤
    let results = novels;
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      results = novels.filter(novel => 
        novel.title.toLowerCase().includes(term) || 
        novel.authorName.toLowerCase().includes(term) ||
        (novel.shortDescription && novel.shortDescription.toLowerCase().includes(term)) ||
        novel.categories.some(cat => cat.toLowerCase().includes(term)) ||
        novel.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // 再排序
    const sortedResults = [...results].sort((a, b) => {
      let valueA, valueB;
      
      switch(sortBy) {
        case 'updatedAt':
          valueA = new Date(a.updatedAt);
          valueB = new Date(b.updatedAt);
          break;
        case 'favoriteCount':
          valueA = a.favoriteCount;
          valueB = b.favoriteCount;
          break;
        case 'readCount':
          valueA = a.readCount;
          valueB = b.readCount;
          break;
        default:
          valueA = new Date(a.updatedAt);
          valueB = new Date(b.updatedAt);
      }
      
      // 根据排序方向返回比较结果
      return sortDirection === 'desc' ? (valueB - valueA) : (valueA - valueB);
    });
    
    setFilteredNovels(sortedResults);
    setTotalPages(Math.ceil(sortedResults.length / ITEMS_PER_PAGE));
    setCurrentPage(1); // 重置为第一页
  }, [novels, searchTerm, sortBy, sortDirection]);

  // 处理搜索输入变化
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // 处理高级搜索跳转
  const handleAdvancedSearch = () => {
    navigate('/search', { state: { initialTerm: searchTerm } });
  };

  // 处理排序变化
  const handleSortChange = (sort) => {
    if (sort === sortBy) {
      // 如果点击当前排序项，则切换排序方向
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // 否则切换排序项，并默认为降序
      setSortBy(sort);
      setSortDirection('desc');
    }
  };

  // 处理页码变化
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // 滚动到页面顶部
  };

  // 处理小说点击
  const handleNovelClick = (novelId) => {
    navigate(`/novel/${novelId}`);
  };

  // 获取当前页的小说
  const getCurrentPageNovels = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredNovels.slice(startIndex, endIndex);
  };

  // 获取状态文本
  const getStatusText = (novel) => {
    if (novel.isCompleted || novel.status === 'completed') {
      return '已完结';
    } else if (novel.status === 'paused' || novel.status === '暂停更新') {
      return '暂停更新';
    } else {
      return '连载中';
    }
  };

  // 截断文本
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // 渲染页码 - 优化分页器样式
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    // 显示最多5个页码
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    // 添加首页
    if (startPage > 1) {
      pages.push(
        <li key="first" className={`page-item ${currentPage === 1 ? 'active' : ''}`}>
          <button className="page-link" 
            style={{
              backgroundColor: currentPage === 1 ? theme.accent : 'transparent',
              color: currentPage === 1 ? '#fff' : theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              margin: '0 0.2rem',
              fontWeight: 'bold'
            }}
            onClick={() => handlePageChange(1)}>1
          </button>
        </li>
      );
      if (startPage > 2) {
        pages.push(
          <li key="ellipsis1" className="page-item disabled">
            <span className="page-link" style={{
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none'
            }}>...</span>
          </li>
        );
      }
    }
    
    // 添加页码
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button className="page-link" 
            style={{
              backgroundColor: currentPage === i ? theme.accent : 'transparent',
              color: currentPage === i ? '#fff' : theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              margin: '0 0.2rem',
              fontWeight: 'bold'
            }}
            onClick={() => handlePageChange(i)}>{i}</button>
        </li>
      );
    }
    
    // 添加末页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <li key="ellipsis2" className="page-item disabled">
            <span className="page-link" style={{
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none'
            }}>...</span>
          </li>
        );
      }
      pages.push(
        <li key="last" className={`page-item ${currentPage === totalPages ? 'active' : ''}`}>
          <button className="page-link" 
            style={{
              backgroundColor: currentPage === totalPages ? theme.accent : 'transparent',
              color: currentPage === totalPages ? '#fff' : theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '0.5rem',
              margin: '0 0.2rem',
              fontWeight: 'bold'
            }}
            onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
        </li>
      );
    }
    
    return (
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              style={{
                backgroundColor: 'transparent',
                color: currentPage === 1 ? theme.textSecondary : theme.accent,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                margin: '0 0.2rem',
                fontWeight: 'bold'
              }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left"></i> 上一页
            </button>
          </li>
          {pages}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              style={{
                backgroundColor: 'transparent',
                color: currentPage === totalPages ? theme.textSecondary : theme.accent,
                border: `1px solid ${theme.border}`,
                borderRadius: '0.5rem',
                margin: '0 0.2rem',
                fontWeight: 'bold'
              }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              下一页 <i className="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
    );
  };

  return (
    <div className="novel-library-page" style={{
      ...pageStyle,
      paddingBottom: '4rem'  // 增加底部间距
    }}>
      {/* 搜索和排序部分 - 移除外层容器 */}
      <div className="search-sort-section" style={{
        padding: '15px 30px',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 999  // 降低z-index，使其低于导航菜单但高于其他页面元素
      }}>
        <div className="row g-3 align-items-center">
          <div className="col-md-6 col-12">
            <InputGroup>
              <Form.Control
                placeholder="搜索小说标题、作者、标签..."
                value={searchTerm}
                onChange={handleSearchChange}
                style={{
                  backgroundColor: isDark ? '#333' : '#fff',
                  color: theme.text,
                  borderColor: theme.border,
                  borderRadius: '0.5rem 0 0 0.5rem',
                  height: '45px'
                }}
              />
              <button 
                className="btn" 
                style={{
                  backgroundColor: theme.accent,
                  color: '#fff',
                  borderColor: theme.accent,
                  borderRadius: '0 0.5rem 0.5rem 0',
                  height: '45px',
                  fontWeight: 'bold'
                }}
                onClick={handleAdvancedSearch}
              >
                <i className="bi bi-search me-1"></i> 精确搜索
              </button>
            </InputGroup>
          </div>
          <div className="col-md-6 col-12">
            <div className="d-flex flex-wrap justify-content-md-end">
              <Dropdown className="me-2 mb-2 mb-md-0" 
                align="end" 
                autoClose="outside"
              > 
                <Dropdown.Toggle 
                  variant={isDark ? 'dark' : 'light'} 
                  id="sort-dropdown"
                  style={{
                    backgroundColor: isDark ? '#333' : '#f8f9fa',
                    color: theme.text,
                    borderColor: theme.border,
                    borderRadius: '0.5rem',
                    height: '45px',
                    width: '100px'
                  }}
                >
                  <i className="bi bi-sort-down me-1"></i>
                  {sortDirection === 'desc' ? '降序' : '升序'}
                </Dropdown.Toggle>

                <Dropdown.Menu 
                  style={{
                    backgroundColor: isDark ? '#333' : '#fff',
                    color: theme.text,
                    borderColor: theme.border,
                    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                    borderRadius: '0.5rem',
                    marginTop: '0.5rem', 
                    position: 'absolute',
                    minWidth: '8rem',
                    zIndex: 999 // 添加z-index，确保它不会高于导航菜单
                  }}
                  popperConfig={{
                    strategy: 'fixed',  // 使用fixed定位策略
                    modifiers: [
                      {
                        name: 'offset',
                        options: {
                          offset: [0, 10],
                        },
                      },
                      {
                        name: 'preventOverflow',
                        options: {
                          boundary: document.body, // 使用body作为边界
                          padding: 10,
                        }
                      }
                    ],
                  }}
                >
                  <Dropdown.Item 
                    onClick={() => setSortDirection('desc')}
                    active={sortDirection === 'desc'}
                    style={{color: theme.text}}
                  >
                    降序
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => setSortDirection('asc')}
                    active={sortDirection === 'asc'}
                    style={{color: theme.text}}
                  >
                    升序
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <div className="btn-group flex-grow-1 flex-md-grow-0">
                <button 
                  className={`btn ${sortBy === 'updatedAt' ? 'btn-primary' : 'btn-outline-primary'}`}
                  style={{
                    borderRadius: sortBy === 'updatedAt' ? '0.5rem 0 0 0.5rem' : '0',
                    height: '45px',
                    fontWeight: 'bold',
                    padding: '0.375rem 0.5rem',
                    fontSize: window.innerWidth < 400 ? '0.8rem' : '1rem'
                  }}
                  onClick={() => handleSortChange('updatedAt')}
                >
                  <i className="bi bi-clock me-1"></i> 更新时间
                </button>
                <button 
                  className={`btn ${sortBy === 'favoriteCount' ? 'btn-primary' : 'btn-outline-primary'}`}
                  style={{
                    borderRadius: '0',
                    height: '45px',
                    fontWeight: 'bold',
                    padding: '0.375rem 0.5rem',
                    fontSize: window.innerWidth < 400 ? '0.8rem' : '1rem'
                  }}
                  onClick={() => handleSortChange('favoriteCount')}
                >
                  <i className="bi bi-bookmark me-1"></i> 收藏量
                </button>
                <button 
                  className={`btn ${sortBy === 'readCount' ? 'btn-primary' : 'btn-outline-primary'}`}
                  style={{
                    borderRadius: '0 0.5rem 0.5rem 0',
                    height: '45px',
                    fontWeight: 'bold',
                    padding: '0.375rem 0.5rem',
                    fontSize: window.innerWidth < 400 ? '0.8rem' : '1rem'
                  }}
                  onClick={() => handleSortChange('readCount')}
                >
                  <i className="bi bi-eye me-1"></i> 阅读量
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 小说列表部分 */}
      <div className="novel-list-section" style={{
        padding: '0 30px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <h4 style={{
          color: theme.text,
          fontWeight: 'bold',
          fontSize: '1.5rem',
          marginTop: '2rem',
          marginBottom: '1.5rem'
        }}>所有小说 ({filteredNovels.length})</h4>
        
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : filteredNovels.length === 0 ? (
          <div className="text-center p-5">
            <p>没有找到符合条件的小说</p>
          </div>
        ) : (
          <>
            <div className="row g-4">
              {getCurrentPageNovels().map(novel => (
                <div className="col-12 col-md-6 col-lg-4" key={novel._id}>
                  <div 
                    className="card h-100 hover-lift" 
                    style={{
                      ...novelCardStyle,
                      transform: 'translateY(0)',
                      boxShadow: isDark ? 
                        '0 8px 16px rgba(0, 0, 0, 0.4)' : 
                        '0 8px 16px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={() => handleNovelClick(novel._id)}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-10px)';
                      e.currentTarget.style.boxShadow = isDark ? 
                        '0 15px 30px rgba(0, 0, 0, 0.7)' : 
                        '0 15px 30px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isDark ? 
                        '0 8px 16px rgba(0, 0, 0, 0.4)' : 
                        '0 8px 16px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div className="position-relative">
                      <img 
                        src={novel.cover ? getFullImageUrl(novel.cover) : '/images/default-cover.jpg'} 
                        className="card-img-top" 
                        alt={`${novel.title}封面`}
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
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: novel.status === 'completed' ? '#dc3545' :
                                          novel.status === 'paused' ? '#ffc107' : '#28a745',
                          color: 'white',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}
                      >
                        {getStatusText(novel)}
                      </div>
                    </div>
                    
                    <div className="card-body d-flex flex-column" style={{
                      ...novelCardBodyStyle,
                      padding: '1.25rem'
                    }}>
                      <h5 className="card-title" style={{ 
                        fontSize: '1.1rem', 
                        color: theme.text,
                        fontWeight: 'bold',
                        marginBottom: '0.75rem'
                      }}>《{novel.title}》</h5>
                      
                      {/* 章节数量和统计信息 */}
                      <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '0.9rem', color: theme.textSecondary }}>
                        <span><i className="bi bi-book me-1"></i> {novelChapters[novel._id]?.count || novel.totalChapters || 0} 章</span>
                        <div className="d-flex">
                          <span title="阅读量" className="me-2"><i className="bi bi-eye"></i> {novel.readCount || novel.readers || 0}</span>
                          <span title="收藏量"><i className="bi bi-bookmark"></i> {novel.favoriteCount || novel.collections || 0}</span>
                        </div>
                      </div>
                      
                      {/* 小说简介 - 添加展开/收起功能 */}
                      {novel.shortDescription && (
                        <div>
                          <p className="card-text" style={{ 
                            fontSize: '0.9rem', 
                            color: theme.text, 
                            flex: '1',
                            lineHeight: '1.5',
                            marginBottom: '0.75rem'
                          }}>
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
                            return <span style={{
                              ...tagStyle,
                              padding: '0.15rem 0.5rem'
                            }}>其他</span>;
                          }
                          
                          // 展开状态或标签数量少于4个时显示所有标签
                          if (expandedTags[novel._id] || allTags.length <= 3) {
                            return (
                              <>
                                {allTags.map((tag, index) => (
                                  <span key={`tag-${novel._id}-${index}`} style={{
                                    ...tagStyle,
                                    padding: '0.15rem 0.5rem',
                                    marginBottom: '0.35rem'
                                  }}>{tag}</span>
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
                                  <span key={`tag-${novel._id}-${index}`} style={{
                                    ...tagStyle,
                                    padding: '0.15rem 0.5rem',
                                    marginBottom: '0.35rem'
                                  }}>{tag}</span>
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
                      <div className="mt-auto pt-2" style={{ 
                        fontSize: '0.85rem', 
                        color: theme.textSecondary, 
                        borderTop: `1px solid ${theme.border}`,
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem'
                      }}>
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
            
            {/* 分页器优化 */}
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
}

export default NovelLibrary; 
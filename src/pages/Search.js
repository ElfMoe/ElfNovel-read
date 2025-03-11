import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/global.css';
import { novelAPI } from '../services/api';
import { getFullImageUrl } from '../utils/imageUtils';

// 定义所有可用标签，与CreateNovel.js保持一致
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

// 预设字数范围选项
const wordCountRanges = [
  { label: '全部', minWordCount: 0, maxWordCount: 10000000 },
  { label: '10万字以下', minWordCount: 0, maxWordCount: 100000 },
  { label: '10-30万字', minWordCount: 100000, maxWordCount: 300000 },
  { label: '30-50万字', minWordCount: 300000, maxWordCount: 500000 },
  { label: '50-100万字', minWordCount: 500000, maxWordCount: 1000000 },
  { label: '100万字以上', minWordCount: 1000000, maxWordCount: 10000000 }
];

function Search() {
  const { theme, isDark } = useTheme();
  // 小说数据状态
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 搜索状态
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    author: '',
    status: '',
    wordCountRange: 0, // 默认选择"全部"
    tags: [],
    sortBy: 'updateTime', // 默认按更新时间排序
    sortDirection: 'desc', // 默认降序排列
    page: 1,
    limit: 12 // 每页显示12本小说
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

  // 标签反馈信息
  const [tagFeedback, setTagFeedback] = useState({
    show: false,
    message: '',
    type: '' // 'success', 'warning', 'info'
  });

  // 添加新的状态来控制标签展开
  const [expandedTagCards, setExpandedTagCards] = useState({});

  // 添加标签筛选模式切换状态
  const [tagFilterMode, setTagFilterMode] = useState('OR'); // 默认为OR模式（并集）

  // 获取小说数据
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        // 获取最新小说列表 - 这里使用更大的数量以便搜索
        const latestNovelsResponse = await novelAPI.getLatestNovels(50);
        
        if (latestNovelsResponse.success) {
          console.log('API返回的原始数据:', latestNovelsResponse.data);
          
          // 从列表中获取小说ID，然后获取每本小说的详细信息
          const novelDetails = await Promise.all(
            latestNovelsResponse.data.map(async (novel) => {
              // 获取每本小说的详细信息
              const detailResponse = await novelAPI.getNovelDetail(novel._id);
              if (detailResponse.success) {
                return detailResponse.data;
              }
              // 如果无法获取详情，则使用列表数据
              return novel;
            })
          );
          
          // 处理API返回的数据格式
          const formattedNovels = novelDetails.map(novel => {
            // 处理状态字段
            let novelStatus = '已完结';
            if (novel.status === '连载中' || novel.status === 'ongoing') {
              novelStatus = '连载中';
            } else if (novel.status === '暂停更新') {
              novelStatus = '暂停更新';
            }
            
            // 处理标签
            const allTags = [];
            if (novel.categories && novel.categories.length > 0) {
              const filteredCategories = novel.categories.filter(cat => cat !== '其他');
              allTags.push(...filteredCategories);
            }
            if (novel.tags && novel.tags.length > 0) {
              allTags.push(...novel.tags);
            }
            
            // 如果没有任何标签，才添加"其他"
            const finalTags = allTags.length > 0 ? allTags : ['其他'];
            
            // 确保获取收藏数和阅读量 - 打印原始数据调试
            console.log('单个小说详细数据:', novel);
            console.log('收藏数:', novel.collections, '阅读量:', novel.readers);
            
            return {
              id: novel._id,
              title: novel.title || '未知标题',
              author: novel.authorName || novel.author || '未知作者',
              cover: novel.cover || '/images/default-cover.jpg',
              description: novel.shortDescription || '暂无简介',
              tags: finalTags,
              wordCount: novel.wordCount || 0,
              updateTime: novel.updatedAt ? new Date(novel.updatedAt).toLocaleDateString('zh-CN') : '未知',
              status: novelStatus,
              collectionCount: novel.collections || 0, // 修改为正确的collections字段
              readCount: novel.readers || 0 // 修改为正确的readers字段
            };
          });
          
          setNovels(formattedNovels);
        } else {
          setError('获取小说列表失败: ' + latestNovelsResponse.message);
        }
      } catch (err) {
        setError('获取小说列表出错: ' + (err.message || '未知错误'));
        console.error('获取小说列表错误:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // 处理标签选择
  const handleTagToggle = (tag) => {
    // 先清除之前的反馈
    setTagFeedback({ show: false, message: '', type: '' });
    
    // 检查标签是否已被选中
    const isSelected = searchParams.tags.includes(tag);
    
    if (isSelected) {
      // 如果已选中，则移除
      setSearchParams(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }));
    } else {
      // 如果未选中，则添加（无数量限制）
    setSearchParams(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      
      setTagFeedback({
        show: true,
        message: `已添加"${tag}"标签`,
        type: 'success'
      });
    }
  };

  // 展开/折叠分类
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // 处理输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理字数范围选择
  const handleWordCountRangeChange = (index) => {
    setSearchParams(prev => ({
      ...prev,
      wordCountRange: index
    }));
  };

  // 处理排序方式变更
  const handleSortChange = (sortBy) => {
    setSearchParams(prev => ({
      ...prev,
      sortBy,
      page: 1 // 重置页码
    }));
  };

  // 处理排序方向变更
  const handleSortDirectionChange = () => {
    setSearchParams(prev => ({
      ...prev,
      sortDirection: prev.sortDirection === 'desc' ? 'asc' : 'desc',
      page: 1 // 重置页码
    }));
  };

  // 处理分页
  const handlePageChange = (newPage) => {
    setSearchParams(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // 切换标签筛选模式
  const toggleTagFilterMode = () => {
    setTagFilterMode(prev => prev === 'OR' ? 'AND' : 'OR');
    // 切换模式后重新筛选结果
    setSearchParams(prev => ({
      ...prev,
      page: 1 // 重置页码
    }));
  };

  // 过滤小说
  const filteredNovels = novels.filter(novel => {
    const matchesKeyword = !searchParams.keyword || 
      novel.title.toLowerCase().includes(searchParams.keyword.toLowerCase()) ||
      novel.description.toLowerCase().includes(searchParams.keyword.toLowerCase());

    const matchesAuthor = !searchParams.author ||
      novel.author.toLowerCase().includes(searchParams.author.toLowerCase());

    const matchesStatus = !searchParams.status || novel.status === searchParams.status;

    // 使用预设字数范围
    const selectedRange = wordCountRanges[searchParams.wordCountRange];
    const matchesWordCount = novel.wordCount >= selectedRange.minWordCount && 
                            novel.wordCount <= selectedRange.maxWordCount;

    // 标签匹配逻辑：根据选择的模式（AND/OR）匹配
    const matchesTags = searchParams.tags.length === 0 || (
      tagFilterMode === 'OR' 
        ? searchParams.tags.some(tag => novel.tags.includes(tag)) // OR 模式: 包含任一标签即可
        : searchParams.tags.every(tag => novel.tags.includes(tag)) // AND 模式: 必须包含所有标签
    );

    return matchesKeyword && matchesAuthor && matchesStatus && 
           matchesWordCount && matchesTags;
  });

  // 排序小说
  const sortedNovels = [...filteredNovels].sort((a, b) => {
    const sortFactor = searchParams.sortDirection === 'desc' ? -1 : 1;
    
    switch (searchParams.sortBy) {
      case 'updateTime':
        return sortFactor * (new Date(b.updateTime) - new Date(a.updateTime));
      case 'collectionCount':
        return sortFactor * (b.collectionCount - a.collectionCount);
      case 'readCount':
        return sortFactor * (b.readCount - a.readCount);
      default:
        return sortFactor * (new Date(b.updateTime) - new Date(a.updateTime));
    }
  });

  // 分页
  const totalPages = Math.ceil(sortedNovels.length / searchParams.limit);
  const paginatedNovels = sortedNovels.slice(
    (searchParams.page - 1) * searchParams.limit,
    searchParams.page * searchParams.limit
  );

  const inputStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    '&::placeholder': {
      color: theme.textSecondary
    }
  };

  // 更新卡片样式，添加hover效果
  const cardStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    transition: 'all 0.3s ease',
    height: '100%', // 确保卡片高度一致
    cursor: 'pointer'
  };

  // 添加hover样式
  const cardHoverStyle = {
    ...cardStyle,
    boxShadow: `0px 4px 12px rgba(0, 0, 0, 0.15)`,
    transform: 'translateY(-3px)'
  };

  const tagStyle = {
    backgroundColor: theme.secondary,
    color: theme.text,
    border: 'none',
    transition: 'all 0.2s ease'
  };

  const activeTagStyle = {
    backgroundColor: theme.accent,
    color: '#ffffff',
    border: 'none'
  };

  // 处理标签展开/收起
  const toggleTagsExpand = (novelId) => {
    setExpandedTagCards(prev => ({
      ...prev,
      [novelId]: !prev[novelId]
    }));
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ color: theme.text }}>高级搜索</h1>
        <Link 
          to="/" 
          className="button-hover"
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            textDecoration: 'none'
          }}
        >
          <i className="bi bi-house"></i> 返回首页
        </Link>
      </div>

      {/* 搜索表单 */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <label className="form-label" style={{ color: theme.text }}>关键词搜索</label>
          <input
            type="text"
            className="form-control"
            name="keyword"
            placeholder="搜索标题或描述..."
            value={searchParams.keyword}
            onChange={handleInputChange}
            style={inputStyle}
          />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" style={{ color: theme.text }}>作者名</label>
          <input
            type="text"
            className="form-control"
            name="author"
            placeholder="输入作者名..."
            value={searchParams.author}
            onChange={handleInputChange}
            style={inputStyle}
          />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label" style={{ color: theme.text }}>状态</label>
          <select
            className="form-select"
            name="status"
            value={searchParams.status}
            onChange={handleInputChange}
            style={inputStyle}
          >
            <option value="">全部</option>
            <option value="连载中">连载中</option>
            <option value="已完结">已完结</option>
          </select>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <label className="form-label" style={{ color: theme.text }}>字数范围</label>
          <div className="d-flex flex-wrap gap-2">
            {wordCountRanges.map((range, index) => (
              <button
                key={index}
                className={`btn btn-sm ${searchParams.wordCountRange === index ? 'button-hover' : ''}`}
                style={searchParams.wordCountRange === index ? activeTagStyle : tagStyle}
                onClick={() => handleWordCountRangeChange(index)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 标签选择 */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className="form-label mb-0" style={{ color: theme.text }}>标签筛选</label>
          <div>
            <button
              className="btn btn-sm me-2"
              style={{
                backgroundColor: tagFilterMode === 'OR' ? theme.accent : theme.cardBg,
                color: tagFilterMode === 'OR' ? '#fff' : theme.text,
                border: `1px solid ${theme.border}`,
                fontSize: '0.8rem'
              }}
              onClick={toggleTagFilterMode}
              title="OR模式：满足任一标签即可"
            >
              <i className="bi bi-union me-1"></i> 并集模式
            </button>
            <button
              className="btn btn-sm"
              style={{
                backgroundColor: tagFilterMode === 'AND' ? theme.accent : theme.cardBg,
                color: tagFilterMode === 'AND' ? '#fff' : theme.text,
                border: `1px solid ${theme.border}`,
                fontSize: '0.8rem'
              }}
              onClick={toggleTagFilterMode}
              title="AND模式：必须同时满足所有标签"
            >
              <i className="bi bi-intersect me-1"></i> 交集模式
            </button>
          </div>
        </div>

        {/* 标签筛选模式说明 */}
        <div style={{ 
          fontSize: '0.8rem', 
          color: theme.textSecondary, 
          marginBottom: '0.8rem',
          backgroundColor: `${theme.accent}10`,
          padding: '0.5rem',
          borderRadius: '0.25rem'
        }}>
          当前模式：<strong>{tagFilterMode === 'OR' ? '并集模式' : '交集模式'}</strong> 
          {tagFilterMode === 'OR' 
            ? '（满足任一选中标签的小说都会显示）' 
            : '（只显示同时满足所有选中标签的小说）'}
        </div>
        
        {/* 已选标签展示 */}
        <div className="mb-3">
          <div style={{ marginBottom: '0.5rem', color: theme.textSecondary }}>
            已选择标签:
          </div>
          <div className="d-flex flex-wrap gap-2">
            {searchParams.tags.length > 0 ? (
              searchParams.tags.map(tag => (
                <span key={tag} style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.5rem',
                  margin: '0.25rem',
                  backgroundColor: theme.accent + '20',
                  color: theme.accent,
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}>
                  {tag}
                  <i 
                    className="bi bi-x ms-1" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => handleTagToggle(tag)}
                  ></i>
                </span>
              ))
            ) : (
              <span style={{ color: theme.textSecondary }}>未选择任何标签</span>
            )}
          </div>
          <small style={{ color: theme.textSecondary }}>
            已选择 {searchParams.tags.length} 个标签
          </small>
        </div>
        
        {/* 标签操作反馈信息 */}
        {tagFeedback.show && (
          <div className="mb-3" style={{
            backgroundColor: tagFeedback.type === 'success' ? `${theme.success}20` : 
                            tagFeedback.type === 'warning' ? `${theme.warning}20` : 
                            `${theme.info}20`,
            color: tagFeedback.type === 'success' ? theme.success : 
                  tagFeedback.type === 'warning' ? theme.warning : 
                  theme.info,
            borderLeft: `3px solid ${tagFeedback.type === 'success' ? theme.success : 
                                    tagFeedback.type === 'warning' ? theme.warning : 
                                    theme.info}`,
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className={`bi ${
              tagFeedback.type === 'success' ? 'bi-check-circle' : 
              tagFeedback.type === 'warning' ? 'bi-exclamation-triangle' : 
              'bi-info-circle'
            } me-2`}></i>
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
                          const isSelected = searchParams.tags.includes(tag);
                          return (
                            <span 
                              key={tag}
                              onClick={() => handleTagToggle(tag)}
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
      </div>

      {/* 排序选项 */}
      <div className="mb-4">
        <label className="form-label" style={{ color: theme.text }}>排序方式</label>
        <div className="d-flex flex-wrap gap-2 mb-2">
          <button
            className={`btn btn-sm ${searchParams.sortBy === 'updateTime' ? 'button-hover' : ''}`}
            style={searchParams.sortBy === 'updateTime' ? activeTagStyle : tagStyle}
            onClick={() => handleSortChange('updateTime')}
          >
            按更新时间排序
          </button>
          <button
            className={`btn btn-sm ${searchParams.sortBy === 'collectionCount' ? 'button-hover' : ''}`}
            style={searchParams.sortBy === 'collectionCount' ? activeTagStyle : tagStyle}
            onClick={() => handleSortChange('collectionCount')}
          >
            按收藏数排序
          </button>
          <button
            className={`btn btn-sm ${searchParams.sortBy === 'readCount' ? 'button-hover' : ''}`}
            style={searchParams.sortBy === 'readCount' ? activeTagStyle : tagStyle}
            onClick={() => handleSortChange('readCount')}
          >
            按阅读量排序
          </button>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-sm"
            style={{
              ...tagStyle,
              backgroundColor: searchParams.sortDirection === 'desc' ? theme.accent : theme.cardBg,
              color: searchParams.sortDirection === 'desc' ? '#fff' : theme.text
            }}
            onClick={handleSortDirectionChange}
          >
            <i className="bi bi-sort-down"></i> 降序
          </button>
          <button
            className="btn btn-sm"
            style={{
              ...tagStyle,
              backgroundColor: searchParams.sortDirection === 'asc' ? theme.accent : theme.cardBg,
              color: searchParams.sortDirection === 'asc' ? '#fff' : theme.text
            }}
            onClick={handleSortDirectionChange}
          >
            <i className="bi bi-sort-up"></i> 升序
          </button>
        </div>
      </div>

      {/* 加载中状态 */}
      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.text, marginTop: '1rem' }}>正在加载小说数据...</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* 搜索结果 */}
      {!loading && !error && (
        <>
      <div className="mb-3">
            <h5 style={{ color: theme.textSecondary }}>
              找到 {filteredNovels.length} 本小说，当前显示第 {searchParams.page} 页，共 {totalPages} 页
            </h5>
      </div>

      <div className="row">
            {paginatedNovels.map(novel => (
              <div key={novel.id} className="col-md-3 col-sm-6 mb-4">
                <div 
                  style={{
                    ...cardStyle, 
                    display: 'flex', 
                    flexDirection: 'column',
                    ...(expandedTagCards[novel.id] ? cardHoverStyle : {})
                  }} 
                  className="p-3 card-hover"
                  onMouseEnter={() => {
                    if (!expandedTagCards[novel.id]) {
                      const cardElement = document.getElementById(`novel-card-${novel.id}`);
                      if (cardElement) {
                        cardElement.style.boxShadow = cardHoverStyle.boxShadow;
                        cardElement.style.transform = cardHoverStyle.transform;
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (!expandedTagCards[novel.id]) {
                      const cardElement = document.getElementById(`novel-card-${novel.id}`);
                      if (cardElement) {
                        cardElement.style.boxShadow = 'none';
                        cardElement.style.transform = 'none';
                      }
                    }
                  }}
                  id={`novel-card-${novel.id}`}
                >
                  <div className="d-flex mb-3">
                    {/* 封面图 */}
                    <div style={{ width: '80px', marginRight: '10px' }}>
                      <Link to={`/novel/${novel.id}`}>
                        <img 
                          src={getFullImageUrl(novel.cover, '/images/default-cover.jpg', {
                            title: novel.title,
                            author: novel.author
                          })} 
                          alt={novel.title} 
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                          onError={(e) => {
                            if (!e.target.src.includes('default-cover.jpg')) {
                              e.target.onerror = null;
                              e.target.src = `${window.location.origin}/images/default-cover.jpg`;
                            }
                          }}
                        />
                      </Link>
                    </div>
                    {/* 标题和作者 */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <Link to={`/novel/${novel.id}`} style={{ textDecoration: 'none' }}>
                        <h6 style={{ color: theme.text, marginBottom: '5px', fontSize: '1rem' }}>《{novel.title}》</h6>
                      </Link>
                      <div style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>作者：{novel.author}</div>
                      <div style={{ color: theme.textSecondary, fontSize: '0.75rem' }}>
                        {novel.status} · {novel.wordCount} 字
                      </div>
                      
                      {/* 先显示更新时间，然后收藏量和阅读量紧凑并排 */}
                      <div style={{ fontSize: '0.75rem', color: theme.textSecondary }}>
                        <div title="最后更新时间" className="mb-1">
                          <i className="bi bi-clock-history"></i> {novel.updateTime}
                        </div>
                        <div>
                          <span title="收藏数"><i className="bi bi-bookmark"></i> {novel.collectionCount}</span>
                          <span title="阅读量" className="ms-3"><i className="bi bi-eye"></i> {novel.readCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 简短描述 */}
                  <p style={{ color: theme.text, fontSize: '0.875rem', marginBottom: '10px', flex: '1 0 auto' }}>
                    {novel.description.length > 70 ? novel.description.substring(0, 70) + '...' : novel.description}
                  </p>
                  
                  {/* 标签 */}
              <div className="mb-2">
                    {/* 显示前3个标签或全部标签 */}
                    {(expandedTagCards[novel.id] ? novel.tags : novel.tags.slice(0, 3)).map((tag, index) => (
                  <span 
                    key={index} 
                    style={{
                      backgroundColor: theme.secondary,
                      color: theme.text,
                          padding: '0.1rem 0.4rem',
                      borderRadius: '9999px',
                          marginRight: '0.35rem',
                          marginBottom: '0.25rem',
                          fontSize: '0.7rem',
                          display: 'inline-block'
                        }}
                        onClick={(e) => e.stopPropagation()} // 防止冒泡触发卡片点击
                  >
                    {tag}
                  </span>
                ))}
                    
                    {/* 显示"更多标签"按钮，如果标签数量 > 3 且未展开 */}
                    {!expandedTagCards[novel.id] && novel.tags.length > 3 && (
                      <span 
                        style={{ 
                          color: theme.accent, 
                          fontSize: '0.7rem', 
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTagsExpand(novel.id);
                        }}
                      >
                        更多 {novel.tags.length - 3} 个标签
                      </span>
                    )}
                    
                    {/* 展开后显示"收起"按钮 */}
                    {expandedTagCards[novel.id] && novel.tags.length > 3 && (
                      <span 
                        style={{ 
                          color: theme.accent, 
                          fontSize: '0.7rem', 
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          display: 'block',
                          marginTop: '0.25rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTagsExpand(novel.id);
                        }}
                      >
                        收起标签
                      </span>
                    )}
              </div>
                  
                  {/* 阅读按钮 */}
              <Link 
                to={`/novel/${novel.id}`}
                    className="btn btn-sm w-100 button-hover mt-auto"
                style={{
                  backgroundColor: theme.accent,
                  color: '#ffffff',
                      border: 'none',
                      fontSize: '0.875rem',
                      padding: '0.3rem 0'
                }}
                    onClick={(e) => e.stopPropagation()} // 防止冒泡触发卡片点击
              >
                开始阅读
              </Link>
            </div>
          </div>
        ))}
      </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4 mb-5">
              <nav aria-label="搜索结果分页">
                <ul className="pagination">
                  <li className={`page-item ${searchParams.page === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(searchParams.page - 1)}
                      style={{
                        backgroundColor: theme.cardBg,
                        color: theme.text,
                        border: `1px solid ${theme.border}`
                      }}
                    >
                      上一页
                    </button>
                  </li>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i} className={`page-item ${searchParams.page === i + 1 ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(i + 1)}
                        style={{
                          backgroundColor: searchParams.page === i + 1 ? theme.accent : theme.cardBg,
                          color: searchParams.page === i + 1 ? '#fff' : theme.text,
                          border: `1px solid ${theme.border}`
                        }}
                      >
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${searchParams.page === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(searchParams.page + 1)}
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
          )}
        </>
      )}
    </div>
  );
}

export default Search; 
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { novelAPI, userAPI } from '../services/api';
import ChapterComments from '../components/ChapterComments';
import '../styles/global.css';

function NovelPage() {
  const { id, chapterId, novelId } = useParams();  // 获取URL中的小说ID和章节ID
  const navigate = useNavigate();
  const { theme, isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useUser();  // 获取用户登录状态

  // 兼容两种URL模式
  const actualNovelId = id || novelId;
  const isLegacyUrl = !!id;

  // 小说和章节信息状态
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapterContent, setCurrentChapterContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);  // 添加收藏状态

  // 当前阅读的章节索引
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);  // 全屏模式状态

  // 阅读设置状态
  const [readingSettings, setReadingSettings] = useState({
    fontSize: 18,
    lineHeight: 1.8,
    showSettings: false
  });

  // 添加处理URL路径转换的函数
  const getChapterPath = (novelId, chapterNumber) => {
    // 根据当前URL模式决定使用哪种路径格式
    if (isLegacyUrl) {
      return `/novel/${novelId}/read/${chapterNumber}`;
    } else {
      return `/novels/${novelId}/chapters/${chapterNumber}`;
    }
  };

  // 从 localStorage 加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('readingSettings');
    if (savedSettings) {
      setReadingSettings(prev => ({
        ...prev,
        ...JSON.parse(savedSettings)
      }));
    }
  }, []);

  // 获取小说信息和章节列表
  useEffect(() => {
    const fetchNovelData = async () => {
      try {
        setLoading(true);
        
        // 使用正确的ID获取小说详情
        const novelResponse = await novelAPI.getNovelDetail(actualNovelId);
        console.log('小说页面 - 小说详情API响应:', novelResponse);
        
        if (!novelResponse.success) {
          console.error('获取小说详情失败:', novelResponse.message);
          
          // 登录状态下获取失败，尝试使用最新小说列表API作为备用方法
          console.log('尝试备用方法获取小说详情...');
          const latestNovelsResponse = await novelAPI.getLatestNovels(20);
          
          if (latestNovelsResponse.success) {
            // 从最新小说列表中找到目标小说
            const targetNovel = latestNovelsResponse.data.find(novel => novel._id === actualNovelId);
            
            if (targetNovel) {
              console.log('从最新小说列表中找到目标小说:', targetNovel);
              setNovel(targetNovel);
            } else {
              setError(novelResponse.message || '获取小说详情失败');
              return;
            }
          } else {
            setError(novelResponse.message || '获取小说详情失败');
            return;
          }
        } else {
          // 小说详情获取成功
          setNovel(novelResponse.data);
        }
        
        // 获取章节列表
        const chaptersResponse = await novelAPI.getNovelChapters(actualNovelId);
        console.log('小说页面 - 章节列表API响应:', chaptersResponse);
        
        if (!chaptersResponse.success) {
          console.error('获取章节列表失败:', chaptersResponse.message);
          setError(chaptersResponse.message || '获取章节列表失败');
          return;
        }
        
        // 检查认证状态
        const isLoggedIn = localStorage.getItem('accessToken') !== null;
        console.log('用户登录状态:', isLoggedIn ? '已登录' : '未登录');
        
        // 如果用户已登录，检查是否已收藏
        if (isLoggedIn) {
          try {
            const favoriteResponse = await userAPI.checkFavorite(actualNovelId);
            if (favoriteResponse.success) {
              setIsFavorite(favoriteResponse.isFavorite);
            }
          } catch (err) {
            console.error('检查收藏状态失败:', err);
          }
        }
        
        // 设置章节列表
        setChapters(chaptersResponse.data);
        
        // 确定初始章节
        let initialChapter = 0;
        
        // 如果URL中指定了章节ID，则使用该章节
        if (chapterId) {
          const targetChapterNumber = parseInt(chapterId, 10);
          const chapterIndex = chaptersResponse.data.findIndex(
            ch => ch.chapterNumber === targetChapterNumber
          );
          
          if (chapterIndex !== -1) {
            initialChapter = chapterIndex;
          }
        } else {
          // 如果没有指定章节，尝试从本地存储加载上次阅读进度
          const savedProgress = localStorage.getItem(`novel_${actualNovelId}_progress`);
          if (savedProgress) {
            const savedIndex = parseInt(savedProgress, 10);
            if (savedIndex < chaptersResponse.data.length) {
              initialChapter = savedIndex;
            }
          }
        }
        
        // 设置当前章节
        setCurrentChapter(initialChapter);
        
        // 获取章节内容
        if (chaptersResponse.data.length > 0) {
          await loadChapterContent(chaptersResponse.data[initialChapter]);
        }
        
      } catch (err) {
        console.error('获取小说数据错误:', err);
        setError('获取小说数据时发生错误，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNovelData();
  }, [actualNovelId, chapterId]);

  // 加载章节内容
  const loadChapterContent = async (chapter) => {
    if (!chapter) return;
    
    try {
      setLoading(true);
      console.log('正在加载章节:', chapter);
      
      // 获取章节内容
      const response = await novelAPI.getChapterContent(actualNovelId, chapter.chapterNumber);
      console.log('获取到章节内容响应:', response);
      
      if (!response.success) {
        console.error('获取章节内容失败:', response.message);
        setError(`获取章节内容失败: ${response.message}`);
        return;
      }
      
      // 检查响应中是否包含章节内容
      if (!response.data || !response.data.chapter || !response.data.chapter.content) {
        console.error('章节内容为空或格式不正确:', response.data);
        setError('章节内容格式不正确');
        return;
      }
      
      console.log('设置章节内容:', response.data.chapter.content);
      // 记录章节的观看数
      const viewCount = response.data.chapter?.viewCount || 0;
      console.log(`章节观看数: ${viewCount}`);
      
      // 处理内容格式，确保每个段落都有正确的换行
      const formattedContent = response.data.chapter.content
        .split('\n')
        .filter(para => para.trim() !== '') // 过滤空行
        .map((para, index) => (
          <p key={index} style={{ marginBottom: '1rem' }}>{para}</p>
        ));
      
      setCurrentChapterContent(formattedContent);
      
      // 更新URL但不重新加载页面
      const path = getChapterPath(actualNovelId, chapter.chapterNumber);
      navigate(path, { replace: true });
      
    } catch (err) {
      console.error('获取章节内容错误:', err);
      setError('获取章节内容时发生错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 保存设置到 localStorage
  useEffect(() => {
    localStorage.setItem('readingSettings', JSON.stringify({
      fontSize: readingSettings.fontSize,
      lineHeight: readingSettings.lineHeight,
      showSettings: readingSettings.showSettings
    }));
  }, [readingSettings.fontSize, readingSettings.lineHeight, readingSettings.showSettings]);

  // 切换章节时滚动到顶部
  useEffect(() => {
    if (isFullscreen) {
      const contentContainer = document.querySelector('.fullscreen-content-container');
      if (contentContainer) {
        contentContainer.scrollTop = 0;
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [currentChapter, isFullscreen]);

  // 更新设置
  const updateSettings = (key, value) => {
    setReadingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 设置面板组件
  const SettingsPanel = () => (
    <div className="settings-panel" style={{
      backgroundColor: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 style={{ color: theme.text }} className="mb-0">阅读设置</h5>
        <button 
          onClick={() => updateSettings('showSettings', false)}
          className="theme-toggle-button"
          style={{
            ...buttonStyle,
            padding: '0.25rem 0.5rem'
          }}
        >
          <span style={{ position: 'relative', zIndex: 1 }}>
            <i className="bi bi-x"></i>
          </span>
          <div className="hover-overlay" />
        </button>
      </div>
      
      <div className="mb-3">
        <label className="form-label d-flex justify-content-between" style={{ color: theme.text }}>
          字体大小 ({readingSettings.fontSize}px)
        </label>
        <input
          type="range"
          className="form-range"
          min="14"
          max="24"
          value={readingSettings.fontSize}
          onChange={(e) => updateSettings('fontSize', parseInt(e.target.value))}
        />
      </div>

      <div className="mb-3">
        <label className="form-label d-flex justify-content-between" style={{ color: theme.text }}>
          行间距 ({readingSettings.lineHeight})
        </label>
        <input
          type="range"
          className="form-range"
          min="1.5"
          max="2.5"
          step="0.1"
          value={readingSettings.lineHeight}
          onChange={(e) => updateSettings('lineHeight', parseFloat(e.target.value))}
        />
      </div>

      <div className="mb-3">
        <label className="form-label" style={{ color: theme.text }}>显示主题</label>
        <button
          onClick={toggleTheme}
          className="theme-toggle-button"
          style={{
            ...buttonStyle,
            width: '100%',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <span style={{ 
            position: 'relative',
            zIndex: 1
          }}>
            {isDark ? '切换到浅色主题' : '切换到深色主题'}
            <i className={`bi bi-${isDark ? 'sun' : 'moon'} ms-2`}></i>
          </span>
          <div className="hover-overlay" />
        </button>
      </div>
    </div>
  );

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e) => {
      // ESC 退出全屏
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      // 左右方向键切换章节
      if (e.key === 'ArrowLeft' && currentChapter > 0) {
        handleChapterChange(currentChapter - 1);
      }
      if (e.key === 'ArrowRight' && currentChapter < chapters.length - 1) {
        handleChapterChange(currentChapter + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, currentChapter, chapters.length]);

  // 处理滚动到底部
  useEffect(() => {
    if (isFullscreen) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollHeight - scrollTop <= clientHeight + 100) {  // 距离底部100px时
          if (currentChapter < chapters.length - 1) {
            setCurrentChapter(prev => prev + 1);
          }
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isFullscreen, currentChapter, chapters.length]);

  // 切换章节
  const handleChapterChange = (index) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapter(index);
      loadChapterContent(chapters[index]);
      
      // 保存阅读进度到 localStorage
      localStorage.setItem(`novel_${actualNovelId}_progress`, index.toString());
      
      // 更新后端阅读进度
      if (isAuthenticated && chapters[index]) {
        updateReadingProgress(chapters[index]);
      }
      
      // 更新URL但不重新加载页面
      const path = getChapterPath(actualNovelId, chapters[index].chapterNumber);
      navigate(path, { replace: true });
      
      // 滚动到顶部
      if (isFullscreen) {
        // 在全屏模式下，需要延迟一下再滚动，确保内容已经更新
        setTimeout(() => {
          // 尝试找到全屏模式下的内容容器并滚动
          const contentContainer = document.querySelector('.fullscreen-content-container');
          if (contentContainer) {
            contentContainer.scrollTop = 0;
          } else {
            // 如果找不到特定容器，则尝试滚动整个窗口
            window.scrollTo(0, 0);
          }
        }, 50);
      } else {
        // 非全屏模式下，直接滚动窗口
        window.scrollTo(0, 0);
      }
    }
  };

  // 更新后端阅读进度
  const updateReadingProgress = async (chapter) => {
    if (!isAuthenticated || !novel || !chapter) return;
    
    try {
      console.log('更新阅读进度:', actualNovelId, chapter._id);
      
      // 计算阅读进度
      const chapterNumber = chapter.chapterNumber;
      const totalChapters = novel.totalChapters || chapters.length;
      
      console.log(`章节: ${chapterNumber}, 总章节: ${totalChapters}`);
      
      // 调用API更新阅读进度
      const response = await userAPI.updateReadingProgress(
        actualNovelId,
        chapter._id,
        chapterNumber
      );
      
      if (response.success) {
        console.log('阅读进度更新成功:', response.data);
      } else {
        console.error('阅读进度更新失败:', response.message);
      }
    } catch (err) {
      console.error('更新阅读进度出错:', err);
    }
  };

  // 添加组件卸载时保存阅读进度
  useEffect(() => {
    // 组件卸载时更新阅读进度
    return () => {
      if (isAuthenticated && novel && chapters[currentChapter]) {
        console.log('离开页面，保存最终阅读进度');
        updateReadingProgress(chapters[currentChapter]);
      }
    };
  }, [isAuthenticated, novel, chapters, currentChapter]);

  // 加载完成时更新阅读历史
  useEffect(() => {
    if (isAuthenticated && actualNovelId && !loading && novel) {
      // 记录访问历史，无需等待结果
      console.log('记录访问历史:', actualNovelId);
      userAPI.addReadingHistory(actualNovelId)
        .then(response => {
          if (response.success) {
            console.log('访问历史记录成功');
          } else {
            console.error('访问历史记录失败:', response.message);
          }
        })
        .catch(err => {
          console.error('记录访问历史失败:', err);
        });
    }
  }, [isAuthenticated, actualNovelId, loading, novel]);

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 在其他样式定义之前添加
  const buttonStyle = {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease'
  };

  // 添加收藏/取消收藏功能
  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/novel/${actualNovelId}/read` } });
      return;
    }
    
    try {
      if (isFavorite) {
        const response = await userAPI.removeFromFavorites(actualNovelId);
        if (response.success) {
          setIsFavorite(false);
          console.log('已从书架移除');
        } else {
          console.error('移除收藏失败:', response.message);
        }
      } else {
        const response = await userAPI.addToFavorites(actualNovelId);
        if (response.success) {
          setIsFavorite(true);
          console.log('已添加到书架');
        } else {
          console.error('添加收藏失败:', response.message);
        }
      }
    } catch (err) {
      console.error('操作收藏失败:', err);
    }
  };

  // 修改ChapterNavigation组件，添加收藏按钮
  const ChapterNavigation = () => (
    <div style={{
      backgroundColor: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: '0.5rem',
      padding: '1rem',
      marginTop: '1rem'
    }}>
      <div className="d-flex flex-column align-items-center">
        <div className="progress w-100 mb-3" style={{
          backgroundColor: theme.border,
          height: '0.5rem',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}>
          <div 
            className="progress-bar" 
            role="progressbar" 
            style={{
              width: `${((currentChapter + 1) / chapters.length) * 100}%`,
              backgroundColor: theme.accent
            }}
            aria-valuenow={((currentChapter + 1) / chapters.length) * 100}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        <div className="d-flex justify-content-between w-100 align-items-center">
          <button 
            onClick={() => currentChapter > 0 && handleChapterChange(currentChapter - 1)}
            className="btn"
            disabled={currentChapter === 0}
            style={{
              ...buttonStyle,
              opacity: currentChapter === 0 ? 0.5 : 1
            }}
          >
            <i className="bi bi-chevron-left me-1"></i>
            上一章
          </button>
          
          <div className="d-flex gap-2">
            <Link to={`/novel/${actualNovelId}`} className="btn" style={buttonStyle}>
              <i className="bi bi-info-circle me-1"></i>
              详情
            </Link>
            
            <button 
              onClick={toggleFavorite}
              className="btn"
              style={{
                ...buttonStyle,
                backgroundColor: isFavorite ? '#dc3545' : '#28a745',
                borderColor: isFavorite ? '#dc3545' : '#28a745',
                color: 'white'
              }}
            >
              <i className={`bi ${isFavorite ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'} me-1`}></i>
              {isFavorite ? '已收藏' : '收藏'}
            </button>
            
            <Link to="/reader/favorites" className="btn" style={buttonStyle}>
              <i className="bi bi-book me-1"></i>
              书架
            </Link>
          </div>
          
          <button 
            onClick={() => currentChapter < chapters.length - 1 && handleChapterChange(currentChapter + 1)}
            className="btn"
            disabled={currentChapter === chapters.length - 1}
            style={{
              ...buttonStyle,
              opacity: currentChapter === chapters.length - 1 ? 0.5 : 1
            }}
          >
            下一章
            <i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      </div>
    </div>
  );

  // 更新样式对象
  const contentContainerStyle = {
    backgroundColor: theme.cardBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    padding: '2rem',
    transition: 'all 0.3s ease',
    whiteSpace: 'pre-wrap', // 保留空格和换行
    textAlign: 'justify'   // 两端对齐，提高阅读体验
  };

  const chapterListStyle = {
    backgroundColor: theme.cardBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    transition: 'all 0.3s ease',
    maxHeight: '70vh',
    overflowY: 'auto'
  };

  const chapterButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.text,
    padding: '0.75rem 1rem',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: theme.hover
    }
  };

  const activeChapterStyle = {
    ...chapterButtonStyle,
    backgroundColor: theme.secondary,
    color: theme.accent
  };

  // 如果正在加载
  if (loading && !novel) {
    return (
      <div className="container mt-5 d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.text, marginTop: '1rem' }}>正在加载小说内容...</p>
        </div>
      </div>
    );
  }

  // 如果加载出错
  if (error && !novel) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          {error}
          <div className="mt-3">
            <button
              onClick={() => navigate('/')}
              className="btn"
              style={{
                backgroundColor: theme.accent,
                color: '#fff'
              }}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果未找到小说
  if (!novel && !loading) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning" role="alert">
          未找到小说信息
          <div className="mt-3">
            <button
              onClick={() => navigate('/')}
              className="btn"
              style={{
                backgroundColor: theme.accent,
                color: '#fff'
              }}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 修改全屏模式的样式
  if (isFullscreen) {
    return (
      <div 
        className="fullscreen-content-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.background,
          padding: '2rem',
          overflowY: 'auto',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
      >
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 style={{ color: theme.text }}>
              {novel?.title} - {chapters[currentChapter]?.title}
            </h2>
            <div className="d-flex gap-2">
              <button 
                className="theme-toggle-button"
                onClick={() => updateSettings('showSettings', !readingSettings.showSettings)}
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>
                  <i className="bi bi-gear"></i>
                </span>
                <div className="hover-overlay" />
              </button>
              <button 
                className="theme-toggle-button"
                onClick={toggleFullscreen}
                style={{
                  ...buttonStyle,
                  backgroundColor: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>
                  <i className="bi bi-fullscreen-exit"></i>
                </span>
                <div className="hover-overlay" />
              </button>
            </div>
          </div>

          {readingSettings.showSettings && <SettingsPanel />}
          
          {loading && (
            <div className="text-center my-3">
              <div className="spinner-border" role="status" style={{ color: theme.accent, width: '1.5rem', height: '1.5rem' }}>
                <span className="visually-hidden">加载中...</span>
              </div>
            </div>
          )}
          
          <div style={{
            ...contentContainerStyle,
            backgroundColor: theme.cardBg,
            fontSize: `${readingSettings.fontSize}px`,
            lineHeight: readingSettings.lineHeight
          }}>
            {/* 章节标题 */}
            <div className="text-center mb-4">
              <h2 className="mb-0" style={{ color: theme.text, fontSize: '1.5rem' }}>
                {chapters[currentChapter]?.isExtra ? (
                  <>番外：{chapters[currentChapter]?.title}</>
                ) : (
                  <>第{chapters[currentChapter]?.chapterNumber}章：{chapters[currentChapter]?.title}</>
                )}
              </h2>
            </div>
            
            {currentChapterContent || "正在加载章节内容..."}
          </div>

          <ChapterNavigation />
          
          {/* 章节留言区域 */}
          {!loading && currentChapterContent && chapters.length > 0 && (
            <ChapterComments 
              novelId={actualNovelId}
              chapterId={chapters[currentChapter]?._id}
              novelTitle={novel?.title || ''}
              chapterNumber={chapters[currentChapter]?.chapterNumber || (currentChapter + 1)}
              chapterTitle={chapters[currentChapter]?.title || ''}
              novelAuthorId={novel?.creator}
            />
          )}
        </div>
      </div>
    );
  }

  // 修改普通模式的样式
  return (
    <div className="container mt-5">
      <div className="row mb-4">
        <div className="col-md-8">
          <h1 style={{ color: theme.text }}>{typeof novel?.title === 'string' ? novel.title : '无标题'}</h1>
          <div style={{ color: theme.textSecondary }} className="mb-2">
            <span className="me-3">作者：{typeof novel?.authorName === 'string' ? novel.authorName : '佚名'}</span>
            <span className="me-3">
              字数：{
                novel?.wordCount >= 10000 
                  ? `${(novel.wordCount / 10000).toFixed(1)}万` 
                  : `${novel?.wordCount || 0}`
              }字
            </span>
            <span>状态：{typeof novel?.status === 'string' ? novel.status : '连载中'}</span>
          </div>
          <div className="mb-3">
            {/* 显示分类和标签的组合 */}
            {(() => {
              // 合并categories和tags
              const allTags = [];
              if (novel?.categories && novel?.categories.length > 0) {
                // 过滤掉"其他"标签
                const filteredCategories = novel.categories.filter(cat => cat !== '其他');
                allTags.push(...filteredCategories);
              }
              if (novel?.tags && novel?.tags.length > 0) {
                allTags.push(...novel.tags);
              }
              
              console.log('小说页面 - 处理后的标签:', allTags);
              
              if (allTags.length > 0) {
                return allTags.map((tag, index) => (
                  <span 
                    key={index} 
                    style={{
                      backgroundColor: theme.secondary,
                      color: theme.text,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      marginRight: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    {tag}
                  </span>
                ));
              } else {
                return (
                  <span 
                    style={{
                      backgroundColor: theme.secondary,
                      color: theme.text,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      marginRight: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    其他
                  </span>
                );
              }
            })()}
          </div>
          <p style={{ color: theme.text }} className="lead">
            {novel?.description}
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-md-3">
          <div style={chapterListStyle}>
            <div style={{
              borderBottom: `1px solid ${theme.border}`,
              padding: '1rem',
              color: theme.text
            }}>
              <h5 className="mb-0">目录</h5>
            </div>
            <div style={{ maxHeight: 'calc(70vh - 56px)', overflowY: 'auto' }}>
              {chapters && chapters.length > 0 ? (
                chapters.map((chapter, index) => (
                  <button
                    key={chapter._id || index}
                    onClick={() => handleChapterChange(index)}
                    style={{
                      ...chapterButtonStyle,
                      backgroundColor: currentChapter === index ? theme.hover : 'transparent',
                      borderBottom: index < chapters.length - 1 ? `1px solid ${theme.border}` : 'none',
                      fontWeight: currentChapter === index ? 'bold' : 'normal',
                    }}
                  >
                    {typeof chapter.title === 'string' 
                      ? (chapter.isExtra 
                          ? `番外: ${chapter.title}` 
                          : `第${chapter.chapterNumber}章: ${chapter.title}`)
                      : `第${index+1}章`
                    }
                  </button>
                ))
              ) : (
                <div style={{ padding: '1rem', color: theme.textSecondary, textAlign: 'center' }}>
                  暂无章节
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-9">
          <div style={contentContainerStyle}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 style={{ color: theme.text }} className="mb-0">
                <span className="current-chapter" style={{ color: theme.text }}>
                  {chapters[currentChapter]?.title ? (
                    chapters[currentChapter]?.isExtra ? (
                      `番外：${chapters[currentChapter]?.title}`
                    ) : (
                      `第${chapters[currentChapter]?.chapterNumber}章：${chapters[currentChapter]?.title}`
                    )
                  ) : "请选择章节"}
                </span>
              </h4>
              <div className="d-flex gap-2">
                <button 
                  className="theme-toggle-button"
                  onClick={() => updateSettings('showSettings', !readingSettings.showSettings)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    color: theme.text
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    <i className="bi bi-gear"></i>
                  </span>
                  <div className="hover-overlay" />
                </button>
                <button 
                  className="theme-toggle-button"
                  onClick={toggleFullscreen}
                  style={{
                    ...buttonStyle,
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    color: theme.text
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    <i className="bi bi-fullscreen"></i>
                  </span>
                  <div className="hover-overlay" />
                </button>
              </div>
            </div>

            {readingSettings.showSettings && <SettingsPanel />}

            {loading ? (
              <div className="text-center my-5">
                <div className="spinner-border" role="status" style={{ color: theme.accent }}>
                  <span className="visually-hidden">加载中...</span>
                </div>
                <p style={{ color: theme.text, marginTop: '1rem' }}>正在加载章节内容...</p>
              </div>
            ) : (
              <div style={{
                color: theme.text,
                fontSize: `${readingSettings.fontSize}px`,
                lineHeight: readingSettings.lineHeight,
                whiteSpace: 'pre-wrap'
              }}>
                {currentChapterContent ? (
                  currentChapterContent
                ) : (
                  <div className="alert alert-info">
                    请从左侧选择要阅读的章节，或者当前章节可能没有内容
                  </div>
                )}
              </div>
            )}

            <ChapterNavigation />
            
            {/* 章节留言区域 */}
            {!loading && currentChapterContent && chapters.length > 0 && (
              <ChapterComments 
                novelId={actualNovelId}
                chapterId={chapters[currentChapter]?._id}
                novelTitle={novel?.title || ''}
                chapterNumber={chapters[currentChapter]?.chapterNumber || (currentChapter + 1)}
                chapterTitle={chapters[currentChapter]?.title || ''}
                novelAuthorId={novel?.creator}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NovelPage;

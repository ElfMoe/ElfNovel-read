import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { userAPI, folderAPI } from '../../services/api';
import { getFullImageUrl } from '../../utils/imageUtils';
import axios from 'axios';

function Favorites() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useUser();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [notification, setNotification] = useState(null);
  const [allFavoritesCount, setAllFavoritesCount] = useState(0); // 存储全部收藏的数量
  const navigate = useNavigate();

  // 文件夹功能相关状态
  const [folders, setFolders] = useState([]);
  const [showFoldersSidebar, setShowFoldersSidebar] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [targetFavoriteId, setTargetFavoriteId] = useState(null);
  const [favoriteFolders, setFavoriteFolders] = useState({});

  // 添加文件夹选择模态窗口的状态
  const [showFolderSelectModal, setShowFolderSelectModal] = useState(false);
  const [currentNovelId, setCurrentNovelId] = useState(null);
  const [tempSelectedFolders, setTempSelectedFolders] = useState([]);

  // 新增：删除文件夹的确认对话框
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);

  // 直接获取收藏总数
  const getDirectTotalFavorites = async () => {
    try {
      console.log('直接获取收藏总数...');
      
      // 使用API函数获取收藏列表，只获取一条记录以提高效率
      const response = await userAPI.getFavorites({ page: 1, limit: 1 });
      
      if (response && response.success && response.total) {
        console.log('设置全部收藏数量:', response.total);
        setAllFavoritesCount(response.total);
        
        // 更新文件夹列表中默认文件夹的count
        setFolders(prevFolders => {
          return prevFolders.map(folder => {
            if (folder.isDefault) {
              return { ...folder, count: response.total };
            }
            return folder;
          });
        });
      } else {
        console.warn('获取收藏总数失败，响应不包含total字段:', response);
      }
    } catch (err) {
      console.error('直接获取收藏总数出错:', err);
      // 出错时不更新状态，保持原有数据
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
      fetchGroups();
      fetchFolders(); // 获取文件夹
      getDirectTotalFavorites();
    }
  }, [isAuthenticated, currentPage, selectedGroup]);

  // 添加新的useEffect，在页面获得焦点时刷新收藏列表
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // 定义页面获得焦点时的处理函数
    const handleFocus = () => {
      console.log('收藏页面获得焦点，刷新收藏列表');
      fetchFavorites();
    };
    
    // 添加事件监听器
    window.addEventListener('focus', handleFocus);
    
    // 清理函数
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, currentPage, selectedGroup]);

  const fetchGroups = async () => {
    try {
      setIsLoadingGroups(true);
      
      // 使用硬编码的分组数据，避免调用不存在的API
      setGroups(['默认收藏夹']);
      
      // 注释掉原来的API调用
      /*
      const response = await userAPI.getFavoriteGroups();
      if (response.success) {
        setGroups(response.data);
      } else {
        console.error('获取收藏分组失败：', response.message);
      }
      */
    } catch (err) {
      console.error('获取收藏分组出错：', err);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 准备请求参数
      const params = {
        page: currentPage,
        limit: 10
      };
      
      if (selectedGroup && !selectedGroup.startsWith('folder_')) {
        params.group = selectedGroup;
      }
      
      let response;
      
      // 如果选择了文件夹，从文件夹API获取收藏
      if (selectedGroup && selectedGroup.startsWith('folder_')) {
        const folderId = selectedGroup.replace('folder_', '');
        response = await folderAPI.getFolderFavorites(folderId, currentPage, 10);
      } else {
      // 调用API获取收藏列表
        response = await userAPI.getFavorites(params);
        
        // 如果是查看全部收藏，更新全部收藏的数量
        if (!selectedGroup && response.success && response.total) {
          setAllFavoritesCount(response.total);
        }
      }
      
      if (response.success) {
        // 获取用户的阅读历史，用于计算正确的阅读进度
        const historyResponse = await userAPI.getReadingHistory({ limit: 100 });
        const readingHistories = historyResponse.success ? historyResponse.data : [];
        
        // 处理数据，添加额外的状态标记
        const processedFavorites = (response.data || []).map(item => {
          // 确保item和item.novel存在
          if (!item || !item.novel) {
            console.warn('收藏数据不完整:', item);
            return null;
          }
          
          // 获取收藏时间和更新时间
          const addedAt = new Date(item.addedAt || Date.now());
          const updatedAt = new Date(item.novel.updatedAt || Date.now());
          
          // 从阅读历史中查找对应小说的记录
          const novelHistory = readingHistories.find(h => 
            h.novel && h.novel._id === item.novel._id
          );
          
          console.log(`小说 ${item.novel.title} 的阅读历史:`, novelHistory);
          
          // 确定是否访问过这本小说
          const hasVisited = !!novelHistory;
          
          // 确定最后阅读的章节号
          const lastReadChapter = hasVisited ? novelHistory.lastChapter : null;
          
          // 获取实际阅读时间
          const actualReadAt = novelHistory ? new Date(novelHistory.lastReadAt) : null;
          
          // 确定是否刚更新 (3天内)
          const isRecentlyUpdated = item.novel.updatedAt && 
            ((new Date() - updatedAt) / (1000 * 60 * 60 * 24) < 3) && // 3天内的更新
            (!actualReadAt || updatedAt > actualReadAt) && // 更新时间晚于最后访问时间
            updatedAt > addedAt; // 更新时间晚于收藏时间，确保新收藏的小说不会显示为有更新
          
          // 计算排序用的"最后阅读时间"
          let sortingReadAt = null;
          
          // 如果用户实际阅读过这本书，优先使用实际阅读时间
          if (actualReadAt) {
            sortingReadAt = actualReadAt;
          }
          
          // 如果书籍有更新且更新时间比实际阅读时间晚（或从未读过）
          // 只有在更新后未被阅读过的情况下，才使用更新时间作为排序依据
          if (isRecentlyUpdated && (!actualReadAt || updatedAt > actualReadAt)) {
            sortingReadAt = updatedAt;
          }
          
          // 获取章节数量和最后阅读章节
          const totalChapters = item.novel.totalChapters || 0;
          
          // 获取最后阅读章节和阅读进度
          let readProgress = 0;
          
          if (novelHistory) {
            // 获取最后阅读章节
            if (novelHistory.lastChapter && novelHistory.lastChapter.chapterNumber) {
              // 计算实际进度 - 已读章节 / 总章节数 * 100
              readProgress = Math.round((novelHistory.lastChapter.chapterNumber / totalChapters) * 100);
            } else if (novelHistory.readingProgress) {
              // 没有章节信息，使用后端存储的进度
              // 确保是合理范围内的值
              readProgress = Math.min(Math.max(0, novelHistory.readingProgress || 0), 100);
            } else {
              // 即使有阅读历史但没有lastChapter，进度为0
              readProgress = 0;
            }
          } else {
            // 没有阅读历史，设置为0进度
            readProgress = 0;
          }
          
          // 修复日志输出，确保不直接输出可能是对象的lastReadChapter
          const lastReadChapterDisplay = lastReadChapter 
            ? (typeof lastReadChapter === 'object' 
              ? (lastReadChapter?.chapterNumber || '未知') 
              : (lastReadChapter || '未知'))
            : '未开始';
          
          console.log(`小说 ${item.novel.title} 的阅读进度: ${readProgress}%, 最后阅读章节: ${lastReadChapterDisplay}/${totalChapters}`);
          
          // 如果lastReadChapter是对象，只保存章节号；如果为null，保持为null
          const processedLastReadChapter = lastReadChapter
            ? (typeof lastReadChapter === 'object' && lastReadChapter?.chapterNumber 
              ? lastReadChapter.chapterNumber 
              : lastReadChapter)
            : null;
          
          return {
            ...item,
            lastReadAt: sortingReadAt ? sortingReadAt.getTime() : null, // 使用计算的排序时间
            actualReadAt: actualReadAt ? actualReadAt.getTime() : null, // 保存实际阅读时间
            updatedAt: isRecentlyUpdated ? updatedAt.getTime() : null,  // 保存更新时间（仅对有更新的小说）
            novel: {
              ...item.novel,
              isCompleted: item.novel.status === '已完结', // 已完结状态，与有更新无关
              isRecentlyUpdated: isRecentlyUpdated,        // 是否有更新
              readProgress: readProgress,
              lastReadChapter: processedLastReadChapter,
              totalChapters: totalChapters,
              hasVisited: hasVisited
            }
          };
        }).filter(item => item !== null); // 过滤掉无效数据
        
        // 按lastReadAt排序（整合了"阅读时间"和"更新时间"的逻辑）
        const sortedFavorites = processedFavorites.sort((a, b) => {
          const aLastReadAt = a.lastReadAt || 0;
          const bLastReadAt = b.lastReadAt || 0;
          
          // 按"排序用的阅读时间"排序，最新的在前面
          return bLastReadAt - aLastReadAt;
        });
        
        setFavorites(sortedFavorites);
        // 修复：检查响应结构，兼容不同的API返回格式
        if (response.pagination && response.pagination.pages) {
          setTotalPages(response.pagination.pages);
        } else if (response.totalPages) {
          setTotalPages(response.totalPages);
        } else {
          setTotalPages(1); // 默认值
        }
        
        // 获取收藏与文件夹的关联
        if (sortedFavorites.length > 0) {
          fetchFavoriteFoldersData();
        }
      } else {
        setError(response.message || '获取收藏列表失败');
      }
    } catch (err) {
      console.error('获取收藏列表出错:', err);
      setError('获取收藏列表时出错，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const removeFavorite = async (favoriteId, event) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
    
    try {
      console.log('尝试移除收藏，ID:', favoriteId);
      // 此处应使用收藏记录的ID或者小说ID
      const response = await userAPI.removeFromFavorites(favoriteId);
      console.log('移除收藏响应:', response);
      
      if (response.success) {
        // 从列表中移除已删除的收藏
        setFavorites(prevFavorites => prevFavorites.filter(fav => fav.id !== favoriteId && fav.novel._id !== favoriteId));
        showNotification('已从书架移除');
      } else {
        console.error('移除收藏失败:', response.message);
        showNotification('移除失败: ' + (response.message || '未知错误'), 'error');
      }
    } catch (err) {
      console.error('移除收藏出错:', err);
      showNotification('移除失败，请稍后再试', 'error');
    }
  };

  const updateFavoriteGroup = async (favoriteId, group, event) => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
    
    try {
      const response = await userAPI.updateFavorite(favoriteId, { group });
      if (response.success) {
        // 更新列表中的分组信息
        setFavorites(prevFavorites => prevFavorites.map(fav => 
          fav.id === favoriteId ? { ...fav, group } : fav
        ));
        showNotification(`已移动到"${group}"`);
      } else {
        showNotification('更新收藏分组失败: ' + (response.message || '未知错误'), 'error');
      }
    } catch (err) {
      console.error('更新收藏分组出错:', err);
      showNotification('更新分组失败，请稍后再试', 'error');
    }
  };

  const cardStyle = {
    backgroundColor: theme.cardBg,
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '1.2rem',
    marginBottom: '1rem',
    border: `1px solid ${theme.border}`,
    transition: 'all 0.3s ease'
  };

  // 添加点击小说卡片的处理函数
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
        // 如果没有阅读历史或没访问过，跳转到小说详情页
        navigate(`/novel/${novelId}`);
      }
      
      // 刷新收藏列表（可选，取决于用户体验）
      // 注意：这里不会立即执行，因为navigate会导致组件卸载
      // 但当用户返回收藏页面时，useEffect会触发fetchFavorites
    } catch (error) {
      console.error('处理小说点击失败:', error);
    }
  };

  // 新增：文件夹相关函数
  const openCreateFolderModal = () => {
    setShowCreateFolderModal(true);
    setNewFolderName('');
    setNewFolderIcon('📁');
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setLoading(true);
      const response = await folderAPI.createFolder(newFolderName.trim(), newFolderIcon);
      
      if (response.success) {
        // 添加新创建的文件夹到列表
        setFolders(prev => [...prev, response.data]);
    
    // 如果是从收藏项中创建的，自动添加到该文件夹
    if (targetFavoriteId) {
          // 找到对应的收藏项
          const favoriteItem = favorites.find(item => item.novel._id === targetFavoriteId);
          if (favoriteItem) {
            await folderAPI.addToFolder(favoriteItem._id, response.data._id);
            
            // 更新收藏与文件夹的关联
            setFavoriteFolders(prev => {
              const newState = {...prev};
              if (!newState[targetFavoriteId]) {
                newState[targetFavoriteId] = [response.data._id];
              } else {
                newState[targetFavoriteId] = [...newState[targetFavoriteId], response.data._id];
              }
              return newState;
            });
          }
          
      setTargetFavoriteId(null);
    }
    
    setShowCreateFolderModal(false);
    showNotification('文件夹创建成功');
      } else {
        showNotification(response.message || '创建文件夹失败', 'error');
      }
    } catch (err) {
      console.error('创建文件夹出错：', err);
      showNotification('创建文件夹出错，请稍后再试', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 打开文件夹选择模态窗口
  const openFolderSelectModal = (novelId, event) => {
    if (event) {
      event.stopPropagation();
    }
    setCurrentNovelId(novelId);
    
    // 创建一个临时状态来存储选择的文件夹
    const currentFolders = favoriteFolders[novelId] || [];
    setTempSelectedFolders([...currentFolders]);
    
    setShowFolderSelectModal(true);
  };
  
  // 临时切换文件夹选择状态（不立即应用）
  const toggleTempFolderSelection = (folderId) => {
    setTempSelectedFolders(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      } else {
        return [...prev, folderId];
      }
    });
  };
  
  // 应用文件夹选择更改
  const applyFolderChanges = async () => {
    try {
      setLoading(true);
      
      // 找到对应的收藏项
      const favoriteItem = favorites.find(item => item.novel._id === currentNovelId);
      if (!favoriteItem) {
        showNotification('找不到对应的收藏项', 'error');
        setLoading(false);
        return;
      }
      
      const favoriteId = favoriteItem._id;
      
      // 获取当前的文件夹关联
      const currentFolders = favoriteFolders[currentNovelId] || [];
      
      // 计算需要添加和删除的文件夹
      const toAdd = tempSelectedFolders.filter(id => !currentFolders.includes(id));
      const toRemove = currentFolders.filter(id => !tempSelectedFolders.includes(id));
      
      // 添加到新文件夹
      for (const folderId of toAdd) {
        await folderAPI.addToFolder(favoriteId, folderId);
      }
      
      // 从旧文件夹中移除
      for (const folderId of toRemove) {
        await folderAPI.removeFromFolder(favoriteId, folderId);
      }
      
      // 更新前端状态
      setFavoriteFolders(prev => {
        const newState = {...prev};
        newState[currentNovelId] = [...tempSelectedFolders];
      return newState;
    });
    
      // 如果当前正在查看某个文件夹，并且从该文件夹中移除了小说，则从当前显示的列表中移除该小说
      if (selectedGroup && selectedGroup.startsWith('folder_')) {
        const currentFolderId = selectedGroup.replace('folder_', '');
        if (toRemove.includes(currentFolderId)) {
          setFavorites(prev => prev.filter(item => item.novel._id !== currentNovelId));
        }
      }

  // 更新文件夹计数
      await fetchFolders();
      
      showNotification('文件夹设置已更新');
      setShowFolderSelectModal(false);
    } catch (err) {
      console.error('更新文件夹关联出错：', err);
      showNotification('操作失败，请稍后再试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFoldersSidebar = () => {
    setShowFoldersSidebar(!showFoldersSidebar);
  };

  // 检查收藏项是否在文件夹中
  const isInFolder = (novelId, folderId) => {
    return favoriteFolders[novelId]?.includes(folderId) || false;
  };
  
  // 检查收藏项是否在临时选择的文件夹中
  const isInTempFolder = (folderId) => {
    return tempSelectedFolders.includes(folderId);
  };

  const confirmDeleteFolder = (folderId) => {
    // 找到要删除的文件夹
    const folder = folders.find(f => f._id === folderId);
    if (!folder) return;
    
    // 不能删除默认文件夹
    if (folder.isDefault) {
      showNotification('不能删除默认文件夹', 'error');
      return;
    }
    
    setFolderToDelete(folder);
    setShowDeleteFolderModal(true);
  };
  
  const deleteFolder = async () => {
    if (!folderToDelete) return;
    
    try {
      const response = await folderAPI.deleteFolder(folderToDelete._id);
      if (response.success) {
        // 如果当前正在查看要删除的文件夹，则切换到全部收藏
        if (selectedGroup === `folder_${folderToDelete._id}`) {
          setSelectedGroup(null);
        }
        
        showNotification('文件夹删除成功');
        await fetchFolders();
        setShowDeleteFolderModal(false);
      } else {
        console.error('删除文件夹失败:', response.message);
        showNotification('删除文件夹失败: ' + (response.message || '未知错误'), 'error');
      }
    } catch (err) {
      console.error('删除文件夹出错:', err);
      showNotification('删除文件夹出错，请稍后再试', 'error');
    }
  };

  // 新增：检测子菜单位置并调整垂直方向
  const adjustSubmenuPosition = (e) => {
    // 获取触发元素
    const button = e.currentTarget;
    // 获取子菜单
    const submenu = button.nextElementSibling;
    
    if (!submenu) return;
    
    // 延迟一帧执行，确保DOM已更新
    setTimeout(() => {
      // 获取按钮位置信息
      const buttonRect = button.getBoundingClientRect();
      // 获取视窗高度
      const windowHeight = window.innerHeight;
      // 获取子菜单高度
      const submenuHeight = submenu.offsetHeight;
      
      // 计算子菜单底部位置
      const submenuBottom = buttonRect.top + submenuHeight;
      
      // 如果子菜单底部超出视窗，向上对齐
      if (submenuBottom > windowHeight - 20) { // 添加20px的缓冲
        submenu.classList.add('position-adjusted');
      } else {
        submenu.classList.remove('position-adjusted');
      }
    }, 0);
  };

  // 获取文件夹列表
  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await folderAPI.getFolders();
      
      if (response.success) {
        // 找到默认文件夹（全部收藏）
        const defaultFolder = response.data.find(folder => folder.isDefault);
        
        // 如果存在默认文件夹，确保其count值为allFavoritesCount
        if (defaultFolder && allFavoritesCount > 0) {
          defaultFolder.count = allFavoritesCount;
        }
        
        // 设置文件夹列表，包括修改后的默认文件夹
        setFolders(response.data);
        
        // 获取每个收藏所在的文件夹
        await fetchFavoriteFoldersData();
      } else {
        console.error('获取文件夹失败：', response.message);
        showNotification('获取文件夹失败，请稍后再试', 'error');
      }
    } catch (err) {
      console.error('获取文件夹出错：', err);
      showNotification('获取文件夹出错，请稍后再试', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 获取收藏与文件夹的关联数据
  const fetchFavoriteFoldersData = async () => {
    try {
      // 创建一个映射对象，存储每个收藏所在的文件夹
      const folderMap = {};
      
      // 对每个收藏项获取其所在的文件夹
      const promises = favorites.map(async (item) => {
        if (item && item.novel && item._id) {
          try {
            const response = await folderAPI.getFavoriteFolders(item._id);
            if (response.success) {
              // 提取非默认文件夹的ID
              const folderIds = response.data
                .filter(folder => !folder.isDefault)
                .map(folder => folder._id);
              
              // 使用小说ID作为键，因为在UI中我们使用小说ID来标识收藏
              folderMap[item.novel._id] = folderIds;
            }
          } catch (err) {
            console.error(`获取收藏 ${item._id} 的文件夹关联失败:`, err);
          }
        }
      });
      
      // 等待所有请求完成
      await Promise.all(promises);
      
      // 更新状态
      setFavoriteFolders(folderMap);
    } catch (err) {
      console.error('获取收藏文件夹关联数据出错：', err);
    }
  };

  // 获取默认文件夹的ID
  const getDefaultFolderId = () => {
    const defaultFolder = folders.find(folder => folder.isDefault);
    return defaultFolder ? defaultFolder._id : null;
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-5">
        <div style={cardStyle}>
          <h2 style={{ color: theme.text }}>请先登录</h2>
          <p style={{ color: theme.textSecondary }}>
            您需要登录后才能查看收藏列表。
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
    <div className="container mt-4">
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            padding: '1rem',
            backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545',
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
      
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <h1 style={{ color: theme.text, marginBottom: 0, marginRight: '1rem' }}>我的收藏</h1>
          <button 
            className="btn btn-sm"
            onClick={toggleFoldersSidebar}
            style={{
              backgroundColor: showFoldersSidebar ? theme.accent : 'transparent',
              color: showFoldersSidebar ? 'white' : theme.text,
              borderColor: theme.border,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <i className="bi bi-folder2-open"></i>
            文件夹
            <i className={`bi bi-chevron-${showFoldersSidebar ? 'down' : 'right'} small`}></i>
          </button>
        </div>
      </div>
      
      {/* 文件夹折叠面板 */}
      {showFoldersSidebar && (
        <div 
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            padding: '0.5rem'
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2 px-2">
            <h5 style={{ color: theme.text, marginBottom: 0 }}>我的文件夹</h5>
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={openCreateFolderModal}
              style={{
                borderColor: theme.accent,
                color: theme.accent
              }}
            >
              <i className="bi bi-plus-lg me-1"></i>
              新建
            </button>
          </div>
          
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button 
              className={`btn btn-sm ${selectedGroup === null ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setSelectedGroup(null)}
              style={{
                backgroundColor: selectedGroup === null ? theme.accent : 'transparent',
                color: selectedGroup === null ? 'white' : theme.text,
                borderColor: theme.border
              }}
            >
              <i className="bi bi-collection me-1"></i>
              全部收藏
              <span className="ms-1 badge rounded-pill bg-light text-dark">
                {allFavoritesCount}
              </span>
            </button>
            
            {folders
              .filter(folder => !folder.isDefault) // 过滤掉默认文件夹
              .map(folder => (
              <button 
                key={folder._id}
                className={`btn btn-sm ${selectedGroup === `folder_${folder._id}` ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedGroup(`folder_${folder._id}`)}
                style={{
                  backgroundColor: selectedGroup === `folder_${folder._id}` ? theme.accent : 'transparent',
                  color: selectedGroup === `folder_${folder._id}` ? 'white' : theme.text,
                  borderColor: theme.border,
                  position: 'relative',
                  paddingRight: '30px' // 为删除图标留出空间
                }}
              >
                <span className="me-1">{folder.icon}</span>
                {folder.name}
                <span className="ms-1 badge rounded-pill bg-light text-dark">
                  {folder.count}
                </span>
                
                {/* 删除按钮 */}
                {!folder.isDefault && (
                  <span
                    className="folder-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      confirmDeleteFolder(folder._id);
                    }}
                    style={{
                      position: 'absolute',
                      right: '5px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: selectedGroup === `folder_${folder._id}` ? 'white' : theme.text,
                      opacity: 0.7,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px'
                    }}
                    title="删除文件夹"
                  >
                    <i className="bi bi-x"></i>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 创建文件夹模态窗口 */}
      {showCreateFolderModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: theme.cardBg,
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '350px',
            maxWidth: '90%'
          }}>
            <h5 style={{color: theme.text}}>创建新文件夹</h5>
            <div className="mb-3">
              <label style={{color: theme.text, display: 'block', marginBottom: '0.5rem'}}>
                文件夹名称
              </label>
              <input 
                type="text" 
                className="form-control"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="输入文件夹名称"
                style={{
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border
                }}
              />
            </div>
            
            <div className="mb-3">
              <label style={{color: theme.text, display: 'block', marginBottom: '0.5rem'}}>
                选择图标
              </label>
              <div className="d-flex flex-wrap gap-2">
                {['📚', '📖', '🔖', '⭐', '🌟', '❤️', '🔥', '✨', '🎯'].map(icon => (
                  <div 
                    key={icon}
                    onClick={() => setNewFolderIcon(icon)}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      borderRadius: '0.25rem',
                      backgroundColor: newFolderIcon === icon ? theme.hover : 'transparent',
                      border: newFolderIcon === icon ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowCreateFolderModal(false)}
                style={{
                  borderColor: theme.border,
                  color: theme.text
                }}
              >
                取消
              </button>
              <button
                className="btn"
                disabled={!newFolderName.trim()}
                onClick={createFolder}
                style={{
                  backgroundColor: theme.accent,
                  color: 'white',
                  opacity: newFolderName.trim() ? 1 : 0.6
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      
      
      {/* 保留原有的加载状态、错误状态和空收藏状态 */}
      {loading ? (
        <div style={cardStyle} className="text-center py-5">
          <div className="spinner-border" role="status" style={{ color: theme.accent }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p style={{ color: theme.textSecondary, marginTop: '1rem' }}>正在加载收藏列表...</p>
        </div>
      ) : error ? (
        <div style={cardStyle}>
          <div className="alert alert-danger">{error}</div>
        </div>
      ) : favorites.length === 0 ? (
        <div style={cardStyle} className="text-center py-5">
          <i className="bi bi-bookmark-x" style={{ fontSize: '3rem', color: theme.textSecondary }}></i>
          {selectedGroup && selectedGroup.startsWith('folder_') ? (
            // 自定义文件夹为空的提示
            <>
              <h3 style={{ color: theme.text, marginTop: '1rem' }}>此文件夹中还没有小说</h3>
              <p style={{ color: theme.textSecondary }}>您可以从收藏列表中添加小说到此文件夹</p>
              <button 
                className="btn"
                onClick={() => setSelectedGroup(null)}
                style={{ 
                  backgroundColor: theme.accent,
                  color: '#fff',
                  marginTop: '1rem'
                }}
              >
                查看全部收藏
              </button>
            </>
          ) : (
            // 全部收藏为空的提示
            <>
          <h3 style={{ color: theme.text, marginTop: '1rem' }}>您还没有收藏任何小说</h3>
          <p style={{ color: theme.textSecondary }}>浏览小说并添加到您的收藏列表</p>
          <Link 
            to="/" 
            className="btn"
            style={{ 
              backgroundColor: theme.accent,
              color: '#fff',
              marginTop: '1rem'
            }}
          >
            浏览小说
          </Link>
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            {favorites.map(item => (
              <div key={item.id} className="col mb-3">
                <div style={{
                  ...cardStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: '100%',
                  marginBottom: '-0.5rem'
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
                            {item.novel.status}
                          </span>
                          <span style={{
                            fontSize: '0.8rem',
                            color: theme.textSecondary
                          }}>
                            {item.novel.totalChapters}章
                          </span>
                          
                          {/* 显示文件夹标签 */}
                          {favoriteFolders[item.novel._id]?.length > 0 && (
                            <div style={{ marginLeft: '8px' }}>
                              {favoriteFolders[item.novel._id].map(folderId => {
                                const folder = folders.find(f => f.id === folderId);
                                if (!folder) return null;
                                return (
                                  <span 
                                    key={folderId}
                                    style={{
                                      fontSize: '0.8rem',
                                      color: theme.accent,
                                      marginRight: '4px'
                                    }}
                                  >
                                    {folder.icon}
                                  </span>
                                );
                              })}
                            </div>
                          )}
            </div>
          </div>

                      {/* 阅读进度 */}
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                            阅读进度：{Math.round(item.novel.readProgress || 0)}%
                          </small>
                          <small style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
                            {item.novel.lastReadChapter ? (item.novel.lastReadChapter || 0) : 0}/{item.novel.totalChapters || 0}
                          </small>
                        </div>
                        <div className="reading-progress-container">
                          <div 
                            className="reading-progress-bar"
                            style={{ width: `${Math.round(item.novel.readProgress || 0)}%` }}
                          ></div>
                        </div>
                        
                        {/* 选项菜单 */}
                        <div className="d-flex justify-content-end mt-2">
                          <div className="dropdown">
                            <button className="btn btn-sm btn-outline-secondary action-icon-btn" 
                              type="button" 
                              onClick={(e) => e.stopPropagation()} 
                              data-bs-toggle="dropdown" 
                              aria-expanded="false"
                              style={{
                                fontSize: '0.9rem',
                                borderColor: theme.border,
                                color: theme.textSecondary
                              }}
                            >
                              <i className="bi bi-three-dots"></i>
                            </button>
                            <ul className="dropdown-menu" style={{backgroundColor: theme.cardBg, borderColor: theme.border, padding: '5px 0'}}>
                              <li>
                                <button 
                                  className="dropdown-item dropdown-menu-item" 
                                  onClick={(e) => removeFavorite(item.novel._id, e)}
                                  style={{
                                    color: theme.text, 
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  <i className="bi bi-trash me-2"></i>移除收藏
                                </button>
                              </li>
                              <li><hr className="dropdown-divider" style={{borderColor: theme.border}}/></li>
                              <li>
                                <Link to={`/novel/${item.novel._id}`} 
                                  className="dropdown-item dropdown-menu-item" 
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    color: theme.text, 
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    display: 'block'
                                  }}
                                >
                                  <i className="bi bi-book me-2"></i>小说详情页
                                </Link>
                              </li>
                              <li><hr className="dropdown-divider" style={{borderColor: theme.border}}/></li>
                              <li>
                                <button 
                                  className="dropdown-item dropdown-menu-item" 
                                  onClick={(e) => openFolderSelectModal(item.novel._id, e)}
                                  style={{
                                    color: theme.text, 
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  <i className="bi bi-folder me-2"></i>收藏文件夹管理
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 保留原有的分页控制部分 */}
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
                  {Array.from({length: totalPages}, (_, i) => i + 1).map(num => (
                    <li key={num} className={`page-item ${currentPage === num ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(num)}
                        style={{
                          backgroundColor: currentPage === num ? theme.accent : theme.cardBg,
                          color: currentPage === num ? '#fff' : theme.text,
                          borderColor: theme.border
                        }}
                      >
                        {num}
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

          {/* 文件夹选择模态窗口 */}
          {showFolderSelectModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1100
            }}>
              {/* 直接在模态窗口内添加style标签 */}
              <style>
                {`
                  .folder-list-container::-webkit-scrollbar {
                    width: 8px !important;
                    height: 8px !important;
                  }
                  
                  .folder-list-container::-webkit-scrollbar-track {
                    background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} !important;
                    border-radius: 4px !important;
                  }
                  
                  .folder-list-container::-webkit-scrollbar-thumb {
                    background: ${isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.3)'} !important;
                    border-radius: 4px !important;
                  }
                  
                  .folder-list-container::-webkit-scrollbar-thumb:hover {
                    background: ${isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.5)'} !important;
                  }
                `}
              </style>

              <div style={{
                backgroundColor: theme.cardBg,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                width: '400px',
                maxWidth: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 style={{color: theme.text, margin: 0}}>管理收藏文件夹</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowFolderSelectModal(false)}
                    style={{
                      color: theme.text,
                      opacity: 0.7,
                      filter: isDark ? 'invert(1)' : 'none' // 在暗色主题下反转颜色
                    }}
                    aria-label="关闭"
                  ></button>
                </div>
                
                <div style={{marginBottom: '1rem'}}>
                  <p style={{color: theme.textSecondary, fontSize: '0.9rem', marginBottom: '1rem'}}>
                    选择要添加到的文件夹
                  </p>
                  
                  {folders.length === 0 ? (
                    <p style={{color: theme.textSecondary, fontStyle: 'italic'}}>
                      暂无文件夹，请先创建一个
                    </p>
                  ) : (
                    <div 
                      className="modal-scroll-container folder-list-container" 
                      style={{
                        border: `1px solid ${theme.border}`,
                        backgroundColor: isDark ? theme.background : 'rgba(0,0,0,0.02)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        borderRadius: '4px'
                      }}
                    >
                      {folders
                        .filter(folder => !folder.isDefault) // 过滤掉默认文件夹
                        .map(folder => (
                        <div 
                          key={folder._id}
                          className="folder-item"
                          style={{
                            padding: '10px 12px',
                            borderBottom: `1px solid ${theme.border}50`,
                            backgroundColor: isInTempFolder(folder._id) ? 
                              (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 
                              'transparent'
                          }}
                        >
                          <div className="d-flex align-items-center w-100">
                            <div style={{ 
                              minWidth: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <input
                                type="checkbox"
                                id={`folder-${folder._id}`}
                                checked={isInTempFolder(folder._id)}
                                onChange={() => toggleTempFolderSelection(folder._id)}
                                style={{
                                  cursor: 'pointer'
                                }}
                              />
                            </div>
                            <label 
                              className="ms-2 flex-grow-1" 
                              style={{
                                color: theme.text,
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                marginBottom: 0
                              }}
                            >
                              <span className="me-2">{folder.icon}</span>
                              {folder.name}
                              <span className="ms-2 badge rounded-pill" style={{
                                backgroundColor: isDark ? theme.cardBg : theme.secondary,
                                color: theme.text,
                                fontSize: '0.75rem'
                              }}>
                                {folder.count}
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                      
                      {/* 新建文件夹选项 */}
                      <div 
                        className="folder-item"
                        style={{
                          padding: '10px 12px',
                          borderTop: `1px solid ${theme.border}50`,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                        }}
                        onClick={(e) => {
                          openCreateFolderModal();
                          setTargetFavoriteId(currentNovelId);
                          setShowFolderSelectModal(false); // 关闭当前模态窗口
                        }}
                      >
                        <div className="d-flex align-items-center w-100">
                          <div style={{ 
                            minWidth: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <i className="bi bi-plus-circle" style={{ 
                              color: theme.accent,
                              fontSize: '1rem'
                            }}></i>
                          </div>
                          <label 
                            className="ms-2" 
                            style={{
                              color: theme.accent,
                              cursor: 'pointer',
                              fontSize: '0.95rem',
                              fontWeight: 'bold',
                              marginBottom: 0
                            }}
                          >
                            新建文件夹
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <button
                    className="btn btn-outline-secondary modal-action-btn hover-strong"
                    onClick={() => setShowFolderSelectModal(false)}
                    style={{
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    关闭
                  </button>
                  <button
                    className="btn modal-action-btn hover-strong"
                    onClick={applyFolderChanges}
                    style={{
                      backgroundColor: theme.accent,
                      color: isDark ? '#000' : 'white'
                    }}
                  >
                    确认
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 删除文件夹确认对话框 */}
      {showDeleteFolderModal && folderToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: theme.cardBg,
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '350px',
            maxWidth: '90%'
          }}>
            <h5 style={{color: theme.text}}>确认删除文件夹</h5>
            <p style={{color: theme.text, marginTop: '1rem'}}>
              您确定要删除文件夹 "{folderToDelete.icon} {folderToDelete.name}" 吗？
            </p>
            <p style={{color: theme.textSecondary, fontSize: '0.9rem'}}>
              文件夹中的小说不会被删除，但会从此文件夹中移除。
            </p>
            
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowDeleteFolderModal(false)}
                style={{
                  borderColor: theme.border,
                  color: theme.text
                }}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={deleteFolder}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white'
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Favorites; 
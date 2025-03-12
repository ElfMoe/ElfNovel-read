import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/home.css';
import { novelAPI } from '../services/api'; // 导入API服务
import { getFullImageUrl } from '../utils/imageUtils'; // 导入图片处理工具
import { useUser } from '../contexts/UserContext';

// 导入背景图片 - 每个场景使用不同图片
import fantasyBg from '../assets/FantasyPicture1.jpg'; // 当前图片用于奇幻场景
// 其他场景的图片需要添加到assets文件夹并在这里导入
// 以下是占位符，实际使用时请替换为真实图片
import welcomeBg from '../assets/Welcome.jpg'; // 临时用当前图片，需要替换为不同奇幻风格
import scifiBg from '../assets/CyberpunkPage.jpg';   // 临时用当前图片，需要替换为科技风格
import romanceBg from '../assets/Romance.jpg'; // 临时用当前图片，需要替换为校园风格
import endBg from '../assets/Welcome.jpg';     // 临时用当前图片，需要替换为结束场景风格

// 导入移动版背景图片
import welcomeBgMobile from '../assets/Welcome_Mobile.jpg';
import fantasyBgMobile from '../assets/Fantasy_Mobile.jpg';
import scifiBgMobile from '../assets/Scific_Mobile.jpg';
import romanceBgMobile from '../assets/Romance_Mobile.jpg';
// 结束场景暂时使用欢迎场景的移动版图片
import endBgMobile from '../assets/Welcome_Mobile.jpg';

// 真实图片路径
const UPLOADS_PATH = '/uploads/';

function Home() {
  const { theme, isDark } = useTheme();
  
  // 设置小说数据状态
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(false); // 用于强制重新渲染
  
  // 移除全局图片加载状态，改为每个分类单独的加载状态
  const [fantasyImgLoaded, setFantasyImgLoaded] = useState(false);
  const [scifiImgLoaded, setScifiImgLoaded] = useState(false);
  const [romanceImgLoaded, setRomanceImgLoaded] = useState(false);
  
  // 分类后的小说数据 - 移除默认值
  const [fantasyNovels, setFantasyNovels] = useState([]);
  const [scifiNovels, setScifiNovels] = useState([]);
  const [romanceNovels, setRomanceNovels] = useState([]);
  
  // 当前活跃的小说索引
  const [activeFantasyIndex, setActiveFantasyIndex] = useState(0);
  const [activeScifiIndex, setActiveScifiIndex] = useState(0);
  const [activeRomanceIndex, setActiveRomanceIndex] = useState(0);
  
  // 卡片扩展状态
  const [expandedCards, setExpandedCards] = useState({
    fantasy: false,
    scifi: false,
    romance: false
  });
  
  // 用于卡片切换动画
  const [cardTransition, setCardTransition] = useState({
    fantasy: '',
    scifi: '',
    romance: ''
  });
  
  // 用于添加滚动监听
  const [scrollY, setScrollY] = useState(0);
  
  // 创建引用以检查视口
  const welcomeTextRef = useRef(null);
  const endContentRef = useRef(null);
  const fantasyShowcaseRef = useRef(null);
  const scifiShowcaseRef = useRef(null);
  const romanceShowcaseRef = useRef(null);
  
  // 文本内容引用数组
  const fantasyTextRefs = useRef([...Array(3)].map(() => React.createRef()));
  const scifiTextRefs = useRef([...Array(3)].map(() => React.createRef()));
  const romanceTextRefs = useRef([...Array(3)].map(() => React.createRef()));
  
  // 添加提示文本数据
  const hintTexts = {
    fantasy: "触碰这本魔法典籍，隐藏的奇幻世界等待你揭开...",
    scifi: "接触全息投影，未来科技的秘密向你敞开...",
    romance: "轻抚这本心动日记，青春故事即将展开..."
  };
  
  // 添加点击提示数据，更符合主题的表述
  const clickHintTexts = {
    fantasy: "施展魔法，揭晓更多奥秘",
    scifi: "激活全息系统，解锁完整记录",
    romance: "翻开日记，阅读完整故事"
  };
  
  // 获取小说数据
  useEffect(() => {
    const fetchNovels = async () => {
      console.log('开始获取小说数据...');
      try {
        // 获取更多小说，增加样本数量以便更好地分类
        const response = await novelAPI.getLatestNovels(30);
        console.log('API响应完整数据:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          console.log('成功获取基础小说数据:', response.data);
          
          // 从列表中获取小说ID，然后获取每本小说的详细信息
          console.log('开始获取详细信息...');
          const novelDetails = await Promise.all(
            response.data.map(async (novel) => {
              try {
                // 获取每本小说的详细信息
                const detailResponse = await novelAPI.getNovelDetail(novel._id);
                console.log(`小说 ${novel.title} 详细信息:`, detailResponse);
                if (detailResponse.success) {
                  return detailResponse.data;
                }
                // 如果无法获取详情，则使用列表数据
                return novel;
              } catch (err) {
                console.error(`获取小说 ${novel.title} 详情失败:`, err);
                return novel;
              }
            })
          );
          
          console.log('所有小说详细信息获取完成:', novelDetails);
          
          // 检查小说数据结构
          if (novelDetails.length > 0) {
            const sampleNovel = novelDetails[0];
            console.log('小说详细数据结构示例:', {
              id: sampleNovel._id,
              title: sampleNovel.title,
              author: sampleNovel.authorName,
              categories: sampleNovel.categories,
              tags: sampleNovel.tags,
              collections: sampleNovel.collections,
              readers: sampleNovel.readers,
              allFields: Object.keys(sampleNovel)
            });
          }
          
          // 不再等待所有图片加载完成，而是在UI组件中单独处理每个图片
          // 直接整理数据
          organizeNovelsByCategory(novelDetails);
        } else {
          console.log('API返回成功但数据为空，使用空数组');
          // 使用空数组
          setFantasyNovels([]);
          setScifiNovels([]);
          setRomanceNovels([]);
        }
      } catch (error) {
        console.error('获取小说列表失败:', error);
        // 出错时使用空数组
        setFantasyNovels([]);
        setScifiNovels([]);
        setRomanceNovels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  // 按分类整理小说数据
  const organizeNovelsByCategory = (allNovels) => {
    console.log('获取到的小说详细数据:', allNovels);
    
    if (allNovels && allNovels.length > 0) {
      // 将所有小说数据处理成统一格式
      const processedNovels = allNovels.map(novel => {
        console.log('处理单本小说数据:', novel);
        console.log('小说封面路径:', novel.cover);
        console.log('小说分类和标签:', {
          categories: novel.categories,
          tags: novel.tags,
          collections: novel.collections
        });
        
        // 确保categories和tags是数组
        const categories = Array.isArray(novel.categories) ? novel.categories : [];
        const tags = Array.isArray(novel.tags) ? novel.tags : [];
        
        // 获取收藏数
        const collections = novel.collections || 0;
        
        return {
          id: novel._id,
          title: novel.title,
          author: novel.authorName,
          description: novel.shortDescription,
          coverImage: novel.cover,
          categories,
          tags,
          collections,
          readers: novel.readers || 0,
          status: novel.status || '连载中'
        };
      });
      
      console.log('处理后的小说数据:', processedNovels);
      
      // 设置所有小说
      setNovels(processedNovels);
      
      // 根据分类过滤小说
      // 1. 奇幻小说 - 查找categories中包含奇幻相关标签的小说
      const fantasyFiltered = processedNovels
        .filter(novel => {
          // 检查categories中是否包含奇幻相关分类
          return novel.categories.some(cat => 
            cat === '奇幻' || cat === '魔幻' || cat === '玄幻' || cat === '仙侠'
          );
        })
        .sort((a, b) => b.collections - a.collections)
        .slice(0, 3);
      
      // 2. 科幻小说 - 查找categories中包含科幻相关标签的小说
      const scifiFiltered = processedNovels
        .filter(novel => {
          // 检查categories中是否包含科幻相关分类
          return novel.categories.some(cat => 
            cat === '科幻' || cat === '賽博朋克' || cat === '科技'
          );
        })
        .sort((a, b) => b.collections - a.collections)
        .slice(0, 3);
      
      // 3. 言情小说 - 查找categories中包含言情相关标签的小说
      const romanceFiltered = processedNovels
        .filter(novel => {
          // 检查categories中是否包含言情相关分类
          return novel.categories.some(cat => 
            cat === '言情' || cat === '爱情' || cat === '少女'
          );
        })
        .sort((a, b) => b.collections - a.collections)
        .slice(0, 3);
      
      console.log('过滤后的奇幻小说:', fantasyFiltered);
      console.log('过滤后的科幻小说:', scifiFiltered);
      console.log('过滤后的言情小说:', romanceFiltered);
      
      // 如果过滤后的数组为空，使用收藏数最多的小说
      const sortedByCollections = [...processedNovels].sort((a, b) => b.collections - a.collections);
      
      console.log('按收藏数排序的小说:', sortedByCollections.map(n => ({
        title: n.title,
        collections: n.collections
      })));
      
      // 设置最终数据
      setFantasyNovels(fantasyFiltered.length > 0 ? fantasyFiltered : sortedByCollections.slice(0, 3));
      setScifiNovels(scifiFiltered.length > 0 ? scifiFiltered : sortedByCollections.slice(0, 3));
      setRomanceNovels(romanceFiltered.length > 0 ? romanceFiltered : sortedByCollections.slice(0, 3));
    } else {
      console.log('未获取到小说数据或数据为空，使用空数组');
      // 使用空数组
      setFantasyNovels([]);
      setScifiNovels([]);
      setRomanceNovels([]);
    }
  };
  
  // 检查元素是否在视口中
  const isInViewport = (element, offset = 0) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.top <= (window.innerHeight - offset) &&
      rect.bottom >= offset
    );
  };
  
  // 滚动监听
  const handleScroll = () => {
    setScrollY(window.scrollY);
    
    // 检查各个部分是否在视口中，并添加动画类
    const elements = [
      welcomeTextRef.current,
      endContentRef.current,
      fantasyShowcaseRef.current,
      scifiShowcaseRef.current,
      romanceShowcaseRef.current,
      ...fantasyTextRefs.current.map(ref => ref.current),
      ...scifiTextRefs.current.map(ref => ref.current),
      ...romanceTextRefs.current.map(ref => ref.current)
    ];
    
    elements.forEach(element => {
      if (element && isInViewport(element, 100)) {
        element.classList.add('in-view');
      }
    });
  };
  
  // 添加窗口大小变化监听，确保在调整窗口大小时重新渲染以切换合适的背景图片
  useEffect(() => {
    const handleResize = () => {
      // 强制重新渲染组件
      setForceUpdate(prev => !prev);
      
      // 检测设备方向变化，特别是iPad横竖屏切换
      const isLandscape = window.innerWidth > window.innerHeight;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isIPad = /iPad/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream);
      
      if (isIPad) {
        console.log(`iPad ${isLandscape ? '横屏' : '竖屏'} 模式，重新加载图片`);
        // 重置图片加载状态，强制重新加载
        setFantasyImgLoaded(false);
        setScifiImgLoaded(false);
        setRomanceImgLoaded(false);
        
        // 如果是横屏模式，iPad将使用与桌面相同的样式，无需特殊处理
        if (isLandscape) {
          console.log('iPad横屏模式，使用与桌面相同的背景样式');
          // 移除任何可能应用的特殊样式
          document.querySelectorAll('.section').forEach(section => {
            // 重置为默认值，让CSS媒体查询接管
            section.style.backgroundSize = '';
            section.style.backgroundPosition = '';
            section.style.animation = '';
            section.style.backgroundAttachment = '';
          });
        } else {
          console.log('iPad竖屏模式，使用移动设备样式');
          // 竖屏模式使用移动设备样式
          document.querySelectorAll('.section').forEach(section => {
            section.style.backgroundSize = 'cover';
            section.style.backgroundPosition = 'center';
            section.style.animation = 'none';
            section.style.backgroundAttachment = 'scroll';
          });
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // 初始化时执行一次
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  
  // 滚动监听
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // 获取背景样式
  const getBackgroundStyle = (imagePath, position) => {
    // 检测是否为iOS设备
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // 检测是否为iPad
    const isIPad = /iPad/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream);
    
    // 检测iPad是否处于横屏模式
    const isIPadLandscape = isIPad && window.innerWidth > window.innerHeight;
    
    // 检测是否为移动设备（屏幕宽度小于768px）
    const isMobile = window.innerWidth < 768 || (isIOS && !isIPadLandscape);
    
    // 使用forceUpdate状态确保在窗口大小变化时重新计算
    // eslint-disable-next-line no-unused-vars
    const _ = forceUpdate;
    
    // 根据设备类型选择合适的背景图片
    let backgroundImage = imagePath;
    
    // 如果是移动设备，但不是iPad横屏，使用移动版图片
    if (isMobile) {
      console.log('使用移动版图片', isIOS ? '(iOS设备)' : '(窄屏设备)');
      if (imagePath === welcomeBg) backgroundImage = welcomeBgMobile;
      else if (imagePath === fantasyBg) backgroundImage = fantasyBgMobile;
      else if (imagePath === scifiBg) backgroundImage = scifiBgMobile;
      else if (imagePath === romanceBg) backgroundImage = romanceBgMobile;
      else if (imagePath === endBg) backgroundImage = endBgMobile;
    } else {
      console.log('使用桌面版图片');
    }
    
    // iPad横屏模式 - 完全使用与桌面相同的设置
    if (isIPadLandscape) {
      console.log('iPad横屏模式：完全使用桌面版设置');
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: position,
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        transition: 'background-position 0.5s ease-out'
      };
    }
    // 其他iOS设备保持原有处理
    else if (isIOS) {
      return {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: position,
        backgroundAttachment: 'scroll', // 非iPad横屏的iOS设备使用scroll
        backgroundRepeat: 'no-repeat',
        transition: 'background-position 0.5s ease-out',
        willChange: 'background-position',
        transform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        WebkitPerspective: 1000,
        WebkitTransform: 'translate3d(0,0,0)'
      };
    }
    
    // 桌面版的默认设置
    return {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: position,
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
      transition: 'background-position 0.5s ease-out'
    };
  };
  
  // 默认封面颜色（如果图片加载失败）
  const defaultCovers = {
    fantasy: 'linear-gradient(135deg, rgb(100, 50, 150), rgb(40, 10, 80))',
    scifi: 'linear-gradient(135deg, rgb(20, 60, 120), rgb(0, 20, 60))',
    romance: 'linear-gradient(135deg, rgb(180, 80, 120), rgb(120, 40, 80))'
  };
  
  // 添加图片加载错误处理
  const handleImageError = (type, index) => {
    console.log(`封面图片加载失败: ${type} 索引 ${index}`);
    // 可以在这里设置默认图片
  };
  
  // 卡片扩展切换
  const toggleCardExpand = (type) => {
    setExpandedCards(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // 奇幻小说导航
  const nextFantasyNovel = (e) => {
    e.stopPropagation();
    
    // 设置切换动画类
    setCardTransition({
      ...cardTransition,
      fantasy: 'sliding-left'
    });
    
    // 延迟切换，让动画有时间显示
    setTimeout(() => {
      const nextIndex = (activeFantasyIndex + 1) % fantasyNovels.length;
      setActiveFantasyIndex(nextIndex);
      setFantasyImgLoaded(false); // 重置加载状态
      
      // 重置动画类
      setTimeout(() => {
        setCardTransition({
          ...cardTransition,
          fantasy: ''
        });
      }, 50);
    }, 300);
  };
  
  const prevFantasyNovel = (e) => {
    e.stopPropagation();
    
    // 设置切换动画类
    setCardTransition({
      ...cardTransition,
      fantasy: 'sliding-right'
    });
    
    // 延迟切换，让动画有时间显示
    setTimeout(() => {
      const prevIndex = (activeFantasyIndex - 1 + fantasyNovels.length) % fantasyNovels.length;
      setActiveFantasyIndex(prevIndex);
      setFantasyImgLoaded(false); // 重置加载状态
      
      // 重置动画类
      setTimeout(() => {
        setCardTransition({
          ...cardTransition,
          fantasy: ''
        });
      }, 50);
    }, 300);
  };
  
  // 科幻小说导航
  const nextScifiNovel = (e) => {
    e.stopPropagation();
    
    // 设置切换动画类
    setCardTransition({
      ...cardTransition,
      scifi: 'sliding-left'
    });
    
    // 延迟切换，让动画有时间显示
    setTimeout(() => {
      const nextIndex = (activeScifiIndex + 1) % scifiNovels.length;
      setActiveScifiIndex(nextIndex);
      setScifiImgLoaded(false); // 重置加载状态
      
      // 重置动画类
      setTimeout(() => {
        setCardTransition({
          ...cardTransition,
          scifi: ''
        });
      }, 50);
    }, 300);
  };
  
  const prevScifiNovel = (e) => {
    e.stopPropagation();
    
    // 设置切换动画类
    setCardTransition({
      ...cardTransition,
      scifi: 'sliding-right'
    });
    
    // 延迟切换，让动画有时间显示
    setTimeout(() => {
      const prevIndex = (activeScifiIndex - 1 + scifiNovels.length) % scifiNovels.length;
      setActiveScifiIndex(prevIndex);
      setScifiImgLoaded(false); // 重置加载状态
      
      // 重置动画类
      setTimeout(() => {
        setCardTransition({
          ...cardTransition,
          scifi: ''
        });
      }, 50);
    }, 300);
  };
  
  // 言情小说导航
  const nextRomanceNovel = (e) => {
    e.stopPropagation();
    
    // 设置切换动画类
    setCardTransition({
      ...cardTransition,
      romance: 'sliding-left'
    });
    
    // 延迟切换，让动画有时间显示
    setTimeout(() => {
      const nextIndex = (activeRomanceIndex + 1) % romanceNovels.length;
      setActiveRomanceIndex(nextIndex);
      setRomanceImgLoaded(false); // 重置加载状态
      
      // 重置动画类
      setTimeout(() => {
        setCardTransition({
          ...cardTransition,
          romance: ''
        });
      }, 50);
    }, 300);
  };
  
  const prevRomanceNovel = (e) => {
    e.stopPropagation();
    
    // 设置切换动画类
    setCardTransition({
      ...cardTransition,
      romance: 'sliding-right'
    });
    
    // 延迟切换，让动画有时间显示
    setTimeout(() => {
      const prevIndex = (activeRomanceIndex - 1 + romanceNovels.length) % romanceNovels.length;
      setActiveRomanceIndex(prevIndex);
      setRomanceImgLoaded(false); // 重置加载状态
      
      // 重置动画类
      setTimeout(() => {
        setCardTransition({
          ...cardTransition,
          romance: ''
        });
      }, 50);
    }, 300);
  };
  
  // 文本数据
  const fantasyTexts = [
    {
      heading: "魔法的世界",
      paragraphs: [
        "魔法的星尘在指尖悄然闪烁，古老的森林中传来了遥远的吟唱，空气中弥漫着令人沉醉的花香。",
        "你是否听见远方传来的低语？那是命运的邀请函。"
      ]
    },
    {
      heading: "古老的秘密",
      paragraphs: [
        "群山之中，隱藏著被遺忘的神廟，壁畫上的符文記載著遠古的魔法與預言。",
        "勇者們踏上旅途，尋找那傳説中能實現願望的神器。"
      ]
    },
    {
      heading: "命運的選擇",
      paragraphs: [
        "當龍與鳳鳴響徹天際，世界的平衡將被打破，選擇的時刻即將到來。",
        "在奇幻的大陸上，冒險者們正踏上旅途，書寫屬於自己的傳奇。"
      ]
    }
  ];
  
  const scifiTexts = [
    {
      heading: "科幻的未來",
      paragraphs: [
        "告别了魔法与剑影，城市的霓虹灯已经亮起。",
        "此刻，你置身于流光溢彩的未来之城，摩天大楼间穿梭着轻盈的飞行器。"
      ]
    },
    {
      heading: "數字世界",
      paragraphs: [
        "數據流淌如河，代碼構築的虛擬世界比現實更加真實。",
        "當人類的意識能自由穿梭于虛擬與現實之間，我們還能分清什麽是真實嗎？"
      ]
    },
    {
      heading: "人與機器",
      paragraphs: [
        "冰冷的機械背後，隱藏的是人類的渴望與掙扎。",
        "當人工智能產生自我意識，我們將如何定義生命的邊界。",
        "準備好體驗科技與人性交織的碰撞了嗎？"
      ]
    }
  ];
  
  const romanceTexts = [
    {
      heading: "溫馨校園",
      paragraphs: [
        "漫步于清新校园，记忆中熟悉的钟声悠悠响起。",
        "温暖的阳光洒在书页之上，那是青涩年代独有的纯真。"
      ]
    },
    {
      heading: "心動瞬間",
      paragraphs: [
        "偶然的對視，不經意的碰觸，心跳的頻率仿佛被調整了節奏。",
        "那些悄然萌生的情愫，如春日的嫩芽，等待著綻放的時刻。"
      ]
    },
    {
      heading: "永恆的承諾",
      paragraphs: [
        "年少之間的相遇，宛如初開的花朵，悄然綻放于春風中。",
        "平凡的日常因爲有了你的參與，而變得分外美好。",
        "那些看似簡單的約定，卻是我們最珍貴的回憶。"
      ]
    }
  ];

  return (
    <div className="home-container" style={{ 
      flex: '1',
      display: 'flex', 
      flexDirection: 'column',
      marginBottom: '-5px' // 防止可能存在的微小空隙
    }}>
      {/* 欢迎场景 */}
      <section className="section welcome-section" style={getBackgroundStyle(welcomeBg, 'center top')}>
        <div className="content-block">
          <div className="welcome-text" ref={welcomeTextRef}>
            <h1>欢迎来到小熊閲讀</h1>
            <p>在這裏，你將踏上一段未曾想象的奇妙旅程。</p>
            <p>準備好了嗎？冒險，即將開始</p>
            
            <div className="scroll-indicator">
              <span>向下滚動開始冒險</span>
              <i className="bi bi-chevron-double-down"></i>
            </div>
          </div>
        </div>
      </section>

      {/* 场景二：奇幻风格 - 多内容块 */}
      <section className="section fantasy-section" style={getBackgroundStyle(fantasyBg, 'center center')}>
        {/* 文本内容块1 */}
        <div className="content-block">
          <div className="text-content" ref={fantasyTextRefs.current[0]}>
            <h2>{fantasyTexts[0].heading}</h2>
            {fantasyTexts[0].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* 文本内容块2 */}
        <div className="content-block">
          <div className="text-content" ref={fantasyTextRefs.current[1]}>
            <h2>{fantasyTexts[1].heading}</h2>
            {fantasyTexts[1].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* 文本内容块3 */}
        <div className="content-block">
          <div className="text-content" ref={fantasyTextRefs.current[2]}>
            <h2>{fantasyTexts[2].heading}</h2>
            {fantasyTexts[2].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* 小说展示 */}
        <div className="content-block">
          <div className="novel-showcase" ref={fantasyShowcaseRef}>
            <div className="novel-display">
              <div 
                className={`novel-card ${cardTransition.fantasy} ${expandedCards.fantasy ? 'expanded' : ''}`}
                onClick={() => toggleCardExpand('fantasy')}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'transparent' // 恢复透明背景
                }}
              >
                {!fantasyImgLoaded && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 2
                  }}>
                    <div className="loading-spinner"></div>
                    <span style={{color: 'white', marginLeft: '10px'}}>加载封面中...</span>
                  </div>
                )}
                {fantasyNovels.length > 0 ? (
                  <img 
                    src={getFullImageUrl(fantasyNovels[activeFantasyIndex].coverImage, '/uploads/default-cover.jpg', {
                      title: fantasyNovels[activeFantasyIndex].title,
                      author: fantasyNovels[activeFantasyIndex].author
                    })}
                    alt={fantasyNovels[activeFantasyIndex].title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 1,
                      border: 'none' // 移除边框
                    }}
                    onLoad={() => {
                      console.log('奇幻小说封面加载成功');
                      setFantasyImgLoaded(true);
                    }}
                    onError={(e) => {
                      console.log('奇幻小说封面加载失败，详细路径:', e.target.src);
                      console.log('当前奇幻小说数据:', fantasyNovels[activeFantasyIndex]);
                      
                      // 检查是否是iOS设备
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                      
                      if (isIOS) {
                        console.log('检测到iOS设备，使用特殊处理');
                        // 在iOS上，尝试使用不同的缓存策略
                        const timestamp = new Date().getTime();
                        const originalSrc = e.target.src.split('?')[0]; // 移除可能存在的查询参数
                        e.target.src = `${originalSrc}?t=${timestamp}`;
                        
                        // 如果再次失败，使用默认图片
                        e.target.onerror = () => {
                          console.log('iOS设备上二次加载失败，使用默认图片');
                          e.target.src = getFullImageUrl('/uploads/default-cover.jpg');
                          e.target.onerror = null; // 防止无限循环
                          setFantasyImgLoaded(true);
                        };
                      } else {
                        // 非iOS设备使用原来的逻辑
                        // 直接使用绝对路径尝试一次
                        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://novel-reading-website-backend.onrender.com';
                        const directUrl = `${baseUrl}${fantasyNovels[activeFantasyIndex].coverImage}`;
                        console.log('尝试直接使用绝对路径:', directUrl);
                        e.target.src = directUrl;
                        
                        e.target.onerror = () => {
                          console.log('直接路径也加载失败，尝试使用备选图片');
                          e.target.src = getFullImageUrl('/uploads/default-cover.jpg');
                          e.target.onerror = () => {
                            console.log('备选封面也加载失败，设为已加载状态');
                            setFantasyImgLoaded(true);
                            e.target.style.display = 'none';
                          };
                        };
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: 1
                  }}>
                    <span style={{color: 'white'}}>暂无小说</span>
                  </div>
                )}
                
                {fantasyNovels.length > 0 && (
                  <div className="card-click-hint">
                    <span>{clickHintTexts.fantasy}</span>
                    <i className="bi bi-sparkle"></i>
                  </div>
                )}
              </div>
              
              <div className="novel-info-bar">
                <button onClick={prevFantasyNovel} className="control-btn" disabled={fantasyNovels.length <= 1}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                
                <div className="novel-brief">
                  {fantasyNovels.length > 0 ? (
                    <>
                      <div className="novel-title">《{fantasyNovels[activeFantasyIndex].title}》</div>
                      <div className="novel-author">作者：{fantasyNovels[activeFantasyIndex].author}</div>
                    </>
                  ) : (
                    <>
                      <div className="novel-title">暂无奇幻小说</div>
                      <div className="novel-author">敬请期待</div>
                    </>
                  )}
                </div>
                
                <button onClick={nextFantasyNovel} className="control-btn" disabled={fantasyNovels.length <= 1}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
              
              {/* 展开时显示的简介 */}
              {expandedCards.fantasy && fantasyNovels.length > 0 && (
                <div className="novel-description">
                  <p>{fantasyNovels[activeFantasyIndex].description}</p>
                  <Link to={`/novel/${fantasyNovels[activeFantasyIndex].id}`} className="read-btn" style={{ backgroundColor: theme.accent, color: 'white' }}>
                    开始阅读
                  </Link>
                </div>
              )}
            </div>
            
            {/* 将提示文字移到这里 */}
            <p className="category-hint">
              {fantasyNovels.length > 0 ? "魔法之书已现身，伸手触碰或许能唤醒沉睡的力量..." : "魔法之书正在寻找勇者..."}
            </p>
          </div>
        </div>
        
        {/* 过渡内容 */}
        <div className="content-block">
          <div className="transition-text">
            <p>奇幻的故事暂时告一段落，但旅程尚未结束……</p>
          </div>
        </div>
      </section>

      {/* 场景三：科技世界 - 多内容块 */}
      <section className="section scifi-section" style={getBackgroundStyle(scifiBg, 'center center')}>
        {/* 文本内容块1 */}
        <div className="content-block">
          <div className="text-content" ref={scifiTextRefs.current[0]}>
            <h2>{scifiTexts[0].heading}</h2>
            {scifiTexts[0].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
        </div>
      </div>

        {/* 文本内容块2 */}
        <div className="content-block">
          <div className="text-content" ref={scifiTextRefs.current[1]}>
            <h2>{scifiTexts[1].heading}</h2>
            {scifiTexts[1].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* 文本内容块3 */}
        <div className="content-block">
          <div className="text-content" ref={scifiTextRefs.current[2]}>
            <h2>{scifiTexts[2].heading}</h2>
            {scifiTexts[2].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* 小说展示 */}
        <div className="content-block">
          <div className="novel-showcase" ref={scifiShowcaseRef}>
            <div className="novel-display">
              <div 
                className={`novel-card ${cardTransition.scifi} ${expandedCards.scifi ? 'expanded' : ''}`}
                onClick={() => toggleCardExpand('scifi')}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'transparent'
                }}
              >
                {!scifiImgLoaded && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 2
                  }}>
                    <div className="loading-spinner"></div>
                    <span style={{color: 'white', marginLeft: '10px'}}>加载封面中...</span>
                  </div>
                )}
                {scifiNovels.length > 0 ? (
                  <img 
                    src={getFullImageUrl(scifiNovels[activeScifiIndex].coverImage, '/uploads/default-cover.jpg', {
                      title: scifiNovels[activeScifiIndex].title,
                      author: scifiNovels[activeScifiIndex].author
                    })}
                    alt={scifiNovels[activeScifiIndex].title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 1,
                      border: 'none' // 移除边框
                    }}
                    onLoad={() => {
                      console.log('科幻小说封面加载成功');
                      setScifiImgLoaded(true);
                    }}
                    onError={(e) => {
                      console.log('科幻小说封面加载失败，详细路径:', e.target.src);
                      console.log('当前科幻小说数据:', scifiNovels[activeScifiIndex]);
                      
                      // 检查是否是iOS设备
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                      
                      if (isIOS) {
                        console.log('检测到iOS设备，使用特殊处理');
                        // 在iOS上，尝试使用不同的缓存策略
                        const timestamp = new Date().getTime();
                        const originalSrc = e.target.src.split('?')[0]; // 移除可能存在的查询参数
                        e.target.src = `${originalSrc}?t=${timestamp}`;
                        
                        // 如果再次失败，使用默认图片
                        e.target.onerror = () => {
                          console.log('iOS设备上二次加载失败，使用默认图片');
                          e.target.src = getFullImageUrl('/uploads/default-cover.jpg');
                          e.target.onerror = null; // 防止无限循环
                          setScifiImgLoaded(true);
                        };
                      } else {
                        // 非iOS设备使用原来的逻辑
                        // 直接使用绝对路径尝试一次
                        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://novel-reading-website-backend.onrender.com';
                        const directUrl = `${baseUrl}${scifiNovels[activeScifiIndex].coverImage}`;
                        console.log('尝试直接使用绝对路径:', directUrl);
                        e.target.src = directUrl;
                        
                        e.target.onerror = () => {
                          console.log('直接路径也加载失败，尝试使用备选图片');
                          e.target.src = getFullImageUrl('/uploads/default-cover.jpg');
                          e.target.onerror = () => {
                            console.log('备选封面也加载失败，设为已加载状态');
                            setScifiImgLoaded(true);
                            e.target.style.display = 'none';
                          };
                        };
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: 1
                  }}>
                    <span style={{color: 'white'}}>暂无小说</span>
                  </div>
                )}
                
                {scifiNovels.length > 0 && (
                  <div className="card-click-hint">
                    <span>{clickHintTexts.scifi}</span>
                    <i className="bi bi-cpu"></i>
                  </div>
                )}
              </div>
              
              <div className="novel-info-bar">
                <button onClick={prevScifiNovel} className="control-btn" disabled={scifiNovels.length <= 1}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                
                <div className="novel-brief">
                  {scifiNovels.length > 0 ? (
                    <>
                      <div className="novel-title">《{scifiNovels[activeScifiIndex].title}》</div>
                      <div className="novel-author">作者：{scifiNovels[activeScifiIndex].author}</div>
                    </>
                  ) : (
                    <>
                      <div className="novel-title">暂无科幻小说</div>
                      <div className="novel-author">敬请期待</div>
                    </>
                  )}
                </div>
                
                <button onClick={nextScifiNovel} className="control-btn" disabled={scifiNovels.length <= 1}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
              
              {/* 展开时显示的简介 */}
              {expandedCards.scifi && scifiNovels.length > 0 && (
                <div className="novel-description">
                  <p>{scifiNovels[activeScifiIndex].description}</p>
                  <Link to={`/novel/${scifiNovels[activeScifiIndex].id}`} className="read-btn" style={{ backgroundColor: theme.accent, color: 'white' }}>
                    开始阅读
                  </Link>
                </div>
              )}
            </div>
            
            {/* 将提示文字移到这里 */}
            <p className="category-hint">
              {scifiNovels.length > 0 ? "未来之门已开启，接近全息影像以解锁更多数据..." : "数据库正在加载中..."}
            </p>
          </div>
        </div>
        
        {/* 过渡内容 */}
        <div className="content-block">
          <div className="transition-text">
            <p>科技的脉搏渐渐远去，回归本源的时刻已悄然降临。</p>
          </div>
        </div>
      </section>

      {/* 场景四：温馨浪漫风格 - 多内容块 */}
      <section className="section romance-section" style={getBackgroundStyle(romanceBg, 'center center')}>
        {/* 文本内容块1 */}
        <div className="content-block">
          <div className="text-content" ref={romanceTextRefs.current[0]}>
            <h2>{romanceTexts[0].heading}</h2>
            {romanceTexts[0].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        {/* 文本内容块2 */}
        <div className="content-block">
          <div className="text-content" ref={romanceTextRefs.current[1]}>
            <h2>{romanceTexts[1].heading}</h2>
            {romanceTexts[1].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
                  </div>
        
        {/* 文本内容块3 */}
        <div className="content-block">
          <div className="text-content" ref={romanceTextRefs.current[2]}>
            <h2>{romanceTexts[2].heading}</h2>
            {romanceTexts[2].paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                  </div>
        
        {/* 小说展示 */}
        <div className="content-block">
          <div className="novel-showcase" ref={romanceShowcaseRef}>
            <div className="novel-display">
              <div 
                className={`novel-card ${cardTransition.romance} ${expandedCards.romance ? 'expanded' : ''}`}
                onClick={() => toggleCardExpand('romance')}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'transparent'
                }}
              >
                {!romanceImgLoaded && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 2
                  }}>
                    <div className="loading-spinner"></div>
                    <span style={{color: 'white', marginLeft: '10px'}}>加载封面中...</span>
                  </div>
                )}
                {romanceNovels.length > 0 ? (
                  <img 
                    src={getFullImageUrl(romanceNovels[activeRomanceIndex].coverImage, '/uploads/default-cover.jpg', {
                      title: romanceNovels[activeRomanceIndex].title,
                      author: romanceNovels[activeRomanceIndex].author
                    })}
                    alt={romanceNovels[activeRomanceIndex].title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 1,
                      border: 'none' // 移除边框
                    }}
                    onLoad={() => {
                      console.log('言情小说封面加载成功');
                      setRomanceImgLoaded(true);
                    }}
                    onError={(e) => {
                      console.log('言情小说封面加载失败，详细路径:', e.target.src);
                      console.log('当前言情小说数据:', romanceNovels[activeRomanceIndex]);
                      
                      // 检查是否是iOS设备
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                      
                      if (isIOS) {
                        console.log('检测到iOS设备，使用特殊处理');
                        // 在iOS上，尝试使用不同的缓存策略
                        const timestamp = new Date().getTime();
                        const originalSrc = e.target.src.split('?')[0]; // 移除可能存在的查询参数
                        e.target.src = `${originalSrc}?t=${timestamp}`;
                        
                        // 如果再次失败，使用默认图片
                        e.target.onerror = () => {
                          console.log('iOS设备上二次加载失败，使用默认图片');
                          e.target.src = getFullImageUrl('/uploads/default-cover.jpg');
                          e.target.onerror = null; // 防止无限循环
                          setRomanceImgLoaded(true);
                        };
                      } else {
                        // 非iOS设备使用原来的逻辑
                        // 直接使用绝对路径尝试一次
                        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://novel-reading-website-backend.onrender.com';
                        const directUrl = `${baseUrl}${romanceNovels[activeRomanceIndex].coverImage}`;
                        console.log('尝试直接使用绝对路径:', directUrl);
                        e.target.src = directUrl;
                        
                        e.target.onerror = () => {
                          console.log('直接路径也加载失败，尝试使用备选图片');
                          e.target.src = getFullImageUrl('/uploads/default-cover.jpg');
                          e.target.onerror = () => {
                            console.log('备选封面也加载失败，设为已加载状态');
                            setRomanceImgLoaded(true);
                            e.target.style.display = 'none';
                          };
                        };
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: 1
                  }}>
                    <span style={{color: 'white'}}>暂无小说</span>
                  </div>
                )}
                
                {romanceNovels.length > 0 && (
                  <div className="card-click-hint">
                    <span>{clickHintTexts.romance}</span>
                    <i className="bi bi-heart"></i>
                  </div>
                )}
              </div>
              
              <div className="novel-info-bar">
                <button onClick={prevRomanceNovel} className="control-btn" disabled={romanceNovels.length <= 1}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                
                <div className="novel-brief">
                  {romanceNovels.length > 0 ? (
                    <>
                      <div className="novel-title">《{romanceNovels[activeRomanceIndex].title}》</div>
                      <div className="novel-author">作者：{romanceNovels[activeRomanceIndex].author}</div>
                    </>
                  ) : (
                    <>
                      <div className="novel-title">暂无言情小说</div>
                      <div className="novel-author">敬请期待</div>
                    </>
                  )}
                </div>
                
                <button onClick={nextRomanceNovel} className="control-btn" disabled={romanceNovels.length <= 1}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
              
              {/* 展开时显示的简介 */}
              {expandedCards.romance && romanceNovels.length > 0 && (
                <div className="novel-description">
                  <p>{romanceNovels[activeRomanceIndex].description}</p>
                  <Link to={`/novel/${romanceNovels[activeRomanceIndex].id}`} className="read-btn" style={{ backgroundColor: theme.accent, color: 'white' }}>
                    开始阅读
                  </Link>
                </div>
              )}
            </div>
            
            {/* 将提示文字移到这里 */}
            <p className="category-hint">
              {romanceNovels.length > 0 ? "心动笔记本正在翻动，靠近它以感受青春的心跳..." : "少女心动中..."}
            </p>
          </div>
        </div>
      </section>

      {/* 结束语 */}
      <section className="section end-section" 
        style={{
          ...getBackgroundStyle(endBg, 'center bottom'),
          marginBottom: 0,
          paddingBottom: 0
        }}
      >
        <div className="content-block" style={{ paddingBottom: '4rem' }}>
          <div className="end-content" ref={endContentRef}>
            <h2>你的旅途才刚刚开始</h2>
            <p>故事的大门已然打开。</p>
            <p>现在，请尽情探索属于你的世界吧。</p>
            <div className="cta-buttons">
              <Link to="/novels" className="cta-btn" style={{ backgroundColor: theme.accent, color: 'white' }}>
                浏览更多小说
              </Link>
              <Link to="/register" className="cta-btn-secondary" style={{ borderColor: theme.accent, color: theme.accent }}>
                创建账号
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;

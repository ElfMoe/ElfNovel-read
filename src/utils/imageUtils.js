/**
 * 确保图片URL是完整路径
 * @param {string} url - 图片路径
 * @param {string} defaultImage - 默认图片路径
 * @param {object} options - 额外选项，如标题、作者名称等
 * @returns {string} 完整的图片URL
 */
export const getFullImageUrl = (url, defaultImage = '/images/default-cover.jpg', options = {}) => {
  console.log('getFullImageUrl 输入URL:', url);
  
  // 获取API基础URL
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://novel-reading-website-backend.onrender.com';
  
  // 如果URL是空或undefined，直接返回默认图片的绝对路径
  if (!url) {
    const defaultUrl = `${baseUrl}${defaultImage}`;
    console.log('URL为空，使用默认图片:', defaultUrl);
    return defaultUrl;
  }
  
  // 如果已经是Cloudinary的URL，直接返回
  if (url.includes('cloudinary.com')) {
    console.log('是Cloudinary URL，直接返回:', url);
    return url;
  }
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('已是完整URL，直接返回:', url);
    return url;
  }
  
  // 如果是默认图片路径，返回带有baseUrl的绝对路径
  if (url === defaultImage) {
    const fullDefaultUrl = `${baseUrl}${defaultImage}`;
    console.log('是默认图片路径，添加baseUrl:', fullDefaultUrl);
    return fullDefaultUrl;
  }
  
  // 如果是模板封面并且有额外参数
  if (url.includes('/templates/cover-template-') && (options.title || options.author)) {
    let fullUrl = `${baseUrl}${url}`;
    
    // 添加查询参数
    const params = new URLSearchParams();
    if (options.title) {
      params.append('title', options.title);
      console.log(`添加标题参数: ${options.title}`);
    }
    if (options.author) {
      params.append('author', options.author);
      console.log(`添加作者参数: ${options.author}`);
    }
    
    const finalUrl = `${fullUrl}?${params.toString()}`;
    console.log(`封面模板完整URL: ${finalUrl}`);
    return finalUrl;
  }
  
  // 如果是相对路径，添加API基础URL
  let finalUrl;
  if (url.startsWith('/')) {
    finalUrl = `${baseUrl}${url}`;
  } else {
    finalUrl = `${baseUrl}/${url}`;
  }
  
  // 尝试一个替代方法 - 使用fetch验证图片是否可访问
  fetch(finalUrl, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        console.log('图片URL可访问:', finalUrl);
      } else {
        console.warn('图片URL可能不可访问:', finalUrl, response.status);
      }
    })
    .catch(error => {
      console.error('验证图片URL时出错:', finalUrl, error);
    });
  
  console.log('生成的完整URL:', finalUrl);
  return finalUrl;
};

/**
 * 获取封面模板类名
 * @param {number} templateId - 模板ID
 * @returns {string} 模板类名
 */
export const getCoverTemplateClass = (templateId) => {
  return `cover-template-${templateId || 1}`;
};

/**
 * 检测图片是否存在
 * @param {string} url - 图片URL
 * @returns {Promise<boolean>} 图片是否存在
 */
export const imageExists = async (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      console.log('图片验证成功:', url);
      resolve(true);
    };
    img.onerror = () => {
      console.warn('图片验证失败:', url);
      resolve(false);
    };
    img.src = url;
  });
};

/**
 * 生成文本头像（如果用户没有上传头像）
 * @param {string} username - 用户名
 * @param {string} backgroundColor - 可选，背景颜色
 * @param {string} textColor - 可选，文本颜色
 * @returns {string} 头像的Data URL
 */
export const generateTextAvatar = (username, backgroundColor = '#000000', textColor = '#ffffff') => {
  if (!username) return '';
  
  // 获取用户名的第一个字符
  const initial = username.charAt(0).toUpperCase();
  
  // 如果没有指定背景颜色，则使用默认的黑色背景
  if (!backgroundColor) {
    backgroundColor = '#000000'; // 黑色背景
  }
  
  // 创建一个Canvas元素
  const canvas = document.createElement('canvas');
  const size = 200; // 生成较大尺寸以获得更好的质量
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  
  // 绘制背景
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);
  
  // 绘制文本 - 使用更小的字体确保能完全显示
  ctx.fillStyle = textColor;
  const fontSize = size * 0.4; // 减小字体大小，从0.5降到0.4
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制文字
  ctx.fillText(initial, size / 2, size / 2);
  
  // 将结果转换为数据URL
  const dataUrl = canvas.toDataURL('image/png');
  
  return dataUrl;
};

// 获取API基础URL
const getApiBaseUrl = () => {
    return process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://novel-reading-website-backend.onrender.com';
};

// 转换图片URL
export const convertImageUrl = (url) => {
    if (!url) return '';
    
    // 如果已经是完整的URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // 如果是相对路径，添加API基础URL
    if (url.startsWith('/')) {
        return `${getApiBaseUrl()}${url}`;
    }
    
    // 如果没有前导斜杠，添加斜杠
    return `${getApiBaseUrl()}/${url}`;
};

// 验证图片URL是否可访问
export const validateImageUrl = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('验证图片URL时出错:', url, error);
        return false;
    }
};

// 获取默认封面
export const getDefaultCover = () => {
    return `${getApiBaseUrl()}/images/default-cover.jpg`;
};

// 处理图片加载错误
export const handleImageError = (event) => {
    event.target.src = getDefaultCover();
}; 
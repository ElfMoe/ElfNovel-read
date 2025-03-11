import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://novel-reading-website-backend.onrender.com/api';

console.log('API Base URL:', API_BASE_URL);
console.log('Environment:', process.env.NODE_ENV);

// 创建axios实例 - 不带凭据的常规请求
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true  // 添加这行以支持跨域认证
});

// 创建带凭据的axios实例 - 用于需要发送cookie的请求
const apiWithCredentials = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        
        // 不为小说详情和章节内容API添加认证头
        const isNovelDetailEndpoint = config.url.match(/\/novels\/[^\/]+$/);
        const isChapterContentEndpoint = config.url.match(/\/novels\/[^\/]+\/chapter\/\d+$/);
        
        // 作者API路径需要认证
        const isAuthorEndpoint = config.url.includes('/author/');
        
        if (token && (!isNovelDetailEndpoint && !isChapterContentEndpoint || isAuthorEndpoint)) {
            console.log(`为请求 ${config.url} 添加认证头`);
            config.headers.Authorization = `Bearer ${token}`;
        } else if (token && (isNovelDetailEndpoint || isChapterContentEndpoint) && !isAuthorEndpoint) {
            console.log(`跳过为 ${config.url} 添加认证头，避免登录状态问题`);
        } else {
            console.log(`没有令牌，不添加认证头: ${config.url}`);
        }
        
        // 对文件上传请求特殊处理
        if (config.data instanceof FormData) {
            console.log('检测到FormData请求，移除Content-Type，让浏览器自动设置');
            delete config.headers['Content-Type'];
            console.log('当前请求头:', JSON.stringify(config.headers));
        }
        // 如果请求明确设置了Content-Type，记录并保留
        else if (config.headers['Content-Type']) {
            console.log(`使用明确设置的Content-Type: ${config.headers['Content-Type']}`);
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        // 添加响应日志
        console.log(`API响应成功 [${response.config.method.toUpperCase()}] ${response.config.url}:`, 
                   JSON.stringify(response.data, null, 2));
        return response.data;
    },
    async (error) => {
        console.error('API Error Interceptor:', error);
        console.error('Error Response:', error.response?.data);
        console.error('Error Status:', error.response?.status);
        console.error('Error Request URL:', error.config?.url);
        console.error('Error Request Method:', error.config?.method);
        console.error('Error Request Headers:', error.config?.headers);
        
        const originalRequest = error.config;

        // 登录或注册错误直接传递给具体API方法
        const authUrls = ['/auth/login', '/auth/register', '/auth/verify-email'];
        if (authUrls.some(url => originalRequest.url.includes(url))) {
            return Promise.reject(error);
        }

        // 如果是401错误且不是刷新token的请求，且不是登录/注册请求
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
            originalRequest._retry = true;
            console.log('尝试刷新token...');

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    console.log('无法刷新token: 没有找到refreshToken');
                    throw new Error('No refresh token available');
                }

                // 尝试刷新token
                console.log('正在调用刷新token API...');
                const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                    refreshToken
                });
                console.log('刷新token响应:', response.data);

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                // 更新存储的token
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                console.log('token已更新');

                // 更新原始请求的Authorization header
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                console.log('重试原始请求...');

                // 重试原始请求
                return api(originalRequest);
            } catch (refreshError) {
                // 刷新token失败，清除所有认证信息
                console.error('刷新token失败:', refreshError);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                console.log('已清除用户认证信息');
                
                // 不再自动重定向，让各个组件自己处理认证错误
                // window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// 添加API响应数据验证辅助函数
const validateApiResponse = (response, defaultValue = null) => {
  if (!response) return defaultValue;
  if (typeof response === 'object' && response !== null) return response;
  try {
    if (typeof response === 'string') return JSON.parse(response);
    return defaultValue;
  } catch (e) {
    console.error('API响应数据验证失败:', e);
    return defaultValue;
  }
};

// 辅助函数：处理API响应
const handleApiResponse = (response) => {
  console.log('处理API响应:', response);
  
  // 检查响应是否有data属性
  if (response.data) {
    console.log('响应有data属性');
    // 如果data属性是对象，检查它是否有success字段
    if (typeof response.data === 'object' && 'success' in response.data) {
      console.log('data属性是对象且有success字段');
      // 提取分页相关字段
      const { success, data, message, total, totalPages, currentPage, count } = response.data;
      console.log('提取的字段:', { success, message, total, totalPages, currentPage, count });
      
      // 返回格式：{ success, data, message, total, totalPages, currentPage, count }
      const result = {
        success,
        data: data || {},
        message: message || '操作成功',
        total: total || count || 0,
        totalPages: totalPages || 1,
        currentPage: currentPage || 1,
        count: count || 0
      };
      console.log('处理后的结果:', result);
      return result;
    }
    
    console.log('data属性没有success字段，将整个response.data作为数据返回');
    // 如果data没有success字段，则认为整个response.data就是数据
    return {
      success: true,
      data: response.data,
      message: '操作成功'
    };
  }
  
  console.log('响应没有data属性');
  // 如果响应没有data属性但有success字段，直接返回
  if ('success' in response) {
    console.log('响应有success字段，直接返回');
    return response;
  }
  
  console.log('默认情况，认为操作成功');
  // 默认情况，认为操作成功
  return {
    success: true,
    data: response,
    message: '操作成功'
  };
};

// 认证相关API
export const authAPI = {
    // 用户注册 - 完全重写，尝试多种方式
    register: async (userData) => {
        console.log('===== 开始注册请求 =====');
        console.log('原始注册数据:', JSON.stringify(userData));
        
        // 确保提供confirmPassword字段
        if (!userData.confirmPassword && userData.password) {
            userData.confirmPassword = userData.password;
            console.log('自动添加confirmPassword字段');
        }
        
        // 添加一次性随机数，避免服务器缓存
        userData._cacheBust = new Date().getTime();
        console.log('添加缓存清除参数');
        
        // 尝试三种不同的请求方式
        const methods = ['json', 'form', 'direct'];
        
        for (const method of methods) {
            try {
                console.log(`尝试方法 ${method}...`);
                let response;
                
                // 创建干净的axios实例，避免拦截器干扰
                const cleanAxios = axios.create({
                    baseURL: API_BASE_URL,
                    timeout: 15000
                });
                
                if (method === 'json') {
                    // 方法1: 使用JSON格式
                    console.log('使用JSON格式发送请求');
                    response = await cleanAxios.post('/auth/register', userData, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }
                else if (method === 'form') {
                    // 方法2: 使用表单格式
                    console.log('使用表单格式发送请求');
                    const formData = new URLSearchParams();
                    Object.keys(userData).forEach(key => {
                        formData.append(key, userData[key]);
                    });
                    
                    response = await cleanAxios.post('/auth/register', formData, {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });
                }
                else {
                    // 方法3: 使用原生fetch
                    console.log('使用原生fetch发送请求');
                    const fetchResponse = await fetch(`${API_BASE_URL}/auth/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(userData)
                    });
                    
                    // 检查fetch响应状态
                    if (!fetchResponse.ok) {
                        const errorData = await fetchResponse.json();
                        console.log('Fetch错误详情:', errorData);
                        throw {
                            response: {
                                status: fetchResponse.status,
                                data: errorData
                            }
                        };
                    }
                    
                    response = { data: await fetchResponse.json() };
                }
                
                console.log(`方法 ${method} 成功:`, response.data);
                console.log('===== 注册请求成功完成 =====');
                return response.data;
            }
            catch (error) {
                console.error(`方法 ${method} 失败:`, error);
                console.error('错误状态码:', error.response?.status);
                console.error('错误数据:', error.response?.data);
                
                // 提取详细错误信息
                let errorMessage = '未知错误';
                let errorDetails = {};
                
                if (error.response?.data) {
                    if (typeof error.response.data === 'string') {
                        errorMessage = error.response.data;
                    } else {
                        errorMessage = error.response.data.message || '注册失败，请稍后重试';
                        errorDetails = error.response.data;
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                console.error('详细错误消息:', errorMessage);
                console.error('错误详情:', errorDetails);
                
                // 如果是最后一个方法，返回错误
                if (method === methods[methods.length - 1]) {
                    console.error('===== 所有注册尝试均失败 =====');
                    if (error.response?.data) {
                        return {
                            success: false,
                            message: error.response.data.message || '注册失败，请稍后重试',
                            field: error.response.data.field || null,
                            details: error.response.data
                        };
                    }
                    
                    return { 
                        success: false, 
                        message: errorMessage,
                        details: errorDetails,
                        field: null
                    };
                }
                
                // 不是最后一个方法，继续尝试下一个
                console.log(`尝试下一个方法...`);
            }
        }
    },

    // 用户登录
    login: async (credentials) => {
        try {
        const response = await api.post('/auth/login', credentials);
        if (response.success) {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
        } catch (error) {
            console.error('Login API error details:', error);
            console.error('Error response status:', error.response?.status);
            console.error('Error response data:', error.response?.data);
            console.error('Error response complete:', JSON.stringify(error.response, null, 2));
            
            // 确保提取后端返回的错误信息
            if (error.response?.data) {
                // 如果后端返回了结构化错误
                if (error.response.data.type && error.response.data.message) {
                    return error.response.data;
                }
                // 返回标准格式的错误对象
                const errorResponse = {
                    success: false,
                    type: error.response.status === 401 ? 'auth_error' : 'api_error',
                    message: error.response.data.message || '登录失败，请稍后重试'
                };
                return errorResponse;
            }
            
            // 仅在没有后端响应时提供默认错误信息
            const defaultError = {
                success: false,
                type: 'network_error',
                message: '网络连接错误，请检查您的网络'
            };
            return defaultError;
        }
    },

    // 退出登录
    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('pendingVerificationEmail');
    },

    // 验证邮箱
    verifyEmail: async (token) => {
        try {
            console.log('开始API请求验证邮箱, token:', token);
            
            // 确保令牌存在
            if (!token) {
                console.error('缺少验证令牌');
                return { 
                    success: false, 
                    message: '验证链接无效，缺少令牌' 
                };
            }
            
            // 尝试多种请求方式以增加成功率
            let response;
            
            // 方法1: 直接使用api实例
            try {
                console.log('方法1: 使用api实例发送请求');
                response = await api.get(`/auth/verify-email/${token}`);
                console.log('方法1成功:', response);
            } catch (error) {
                console.error('方法1失败:', error);
                
                // 方法2: 使用axios直接请求
                try {
                    console.log('方法2: 使用axios直接请求');
                    const axiosResponse = await axios.get(`${API_BASE_URL}/auth/verify-email/${token}`);
                    response = axiosResponse.data;
                    console.log('方法2成功:', response);
                } catch (error2) {
                    console.error('方法2失败:', error2);
                    throw error; // 使用原始错误继续处理
                }
            }
            
            console.log('验证响应:', response);
            if (response && response.success) {
                console.log('设置本地存储数据');
                localStorage.setItem('accessToken', response.accessToken);
                localStorage.setItem('refreshToken', response.refreshToken);
                
                // 确保用户对象存在并且isEmailVerified为true
                if (response.user) {
                    if (!response.user.isEmailVerified) {
                        console.warn('API响应中用户邮箱未验证，手动修正');
                        response.user.isEmailVerified = true;
                    }
                    localStorage.setItem('user', JSON.stringify(response.user));
                }
                
                localStorage.removeItem('pendingVerificationEmail');
            }
            return response;
        } catch (error) {
            console.error('验证邮箱API错误:', error);
            return {
                success: false,
                message: error.response?.data?.message || '邮箱验证失败，请稍后重试'
            };
        }
    },

    // 获取当前用户信息
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

// 小说阅读相关API
export const novelAPI = {
    // 获取小说列表
    getNovelList: async (params = {}) => {
        try {
            const { page = 1, limit = 10, sortBy = 'updatedAt', sortDirection = 'desc', includeDetails = false } = params;
            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', limit);
            queryParams.append('sortBy', sortBy);
            queryParams.append('sortDirection', sortDirection);
            
            if (params.category) queryParams.append('category', params.category);
            if (params.tag) queryParams.append('tag', params.tag);
            if (params.status) queryParams.append('status', params.status);
            
            console.log('获取小说列表，参数:', queryParams.toString());
            const response = await api.get(`/novels/list?${queryParams.toString()}`);
            console.log('获取小说列表成功，原始数据:', response);
            
            // 如果需要详细信息且API请求成功，则获取每本小说的详细信息
            if (includeDetails && response.success && response.data && response.data.length > 0) {
                console.log('需要获取小说详细信息，包括标签');
                
                // 获取每本小说的详细信息
                const novelDetailsPromises = response.data.map(async (novel) => {
                    try {
                        // 获取详细信息，包括tags和categories
                        const detailResponse = await novelAPI.getNovelDetail(novel._id);
                        if (detailResponse.success) {
                            // 合并详细信息与列表信息
                            return {
                                ...novel,
                                categories: detailResponse.data.categories || [],
                                tags: detailResponse.data.tags || []
                            };
                        }
                        return novel;
                    } catch (error) {
                        console.error(`获取小说 ${novel.title} 详细信息失败:`, error);
                        return novel;
                    }
                });
                
                // 等待所有详细信息请求完成
                const novelsWithDetails = await Promise.all(novelDetailsPromises);
                
                // 返回带有详细信息的结果
                return {
                    ...response,
                    data: novelsWithDetails
                };
            }
            
            return response;
        } catch (error) {
            console.error('获取小说列表失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取小说列表失败，请稍后再试',
                data: []
            };
        }
    },
    
    // 获取小说详情
    getNovelDetail: async (novelId) => {
        try {
            console.log('获取读者视角小说详情，ID:', novelId);
            console.log('当前认证状态:', localStorage.getItem('accessToken') ? '已登录' : '未登录');
            
            try {
                // 尝试使用带认证的请求
                const response = await api.get(`/novels/${novelId}`);
                console.log('获取读者视角小说详情成功，数据:', response);
                return response;
            } catch (apiError) {
                console.error('带认证的小说详情请求失败，尝试不带认证的请求:', apiError);
                
                // 如果带认证的请求失败，尝试不带认证的请求（临时解决方案）
                const response = await fetch(`${API_BASE_URL}/novels/${novelId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => res.json());
                
                console.log('不带认证的小说详情请求响应:', response);
                if (response.success) {
                    return response;
                }
                
                // 如果不带认证的请求也失败，抛出原始错误
                throw apiError;
            }
        } catch (error) {
            console.error('获取小说详情失败:', error);
            console.error('错误响应:', error.response?.data);
            console.error('错误状态码:', error.response?.status);
            
            // 如果是401错误，可能是token问题
            if (error.response?.status === 401) {
                console.error('认证失败，可能需要重新登录');
                // 可以在这里添加重定向到登录页的逻辑
            }
            
            return {
                success: false,
                message: error.response?.data?.message || '获取小说详情失败，请稍后再试'
            };
        }
    },
    
    // 获取小说章节列表
    getNovelChapters: async (novelId, params = {}) => {
        try {
            console.log('获取小说章节列表，ID:', novelId);
            console.log('当前认证状态:', localStorage.getItem('accessToken') ? '已登录' : '未登录');
            
            const { page = 1, limit = 50 } = params;
            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', limit);
            
            const response = await api.get(`/novels/${novelId}/chapters?${queryParams.toString()}`);
            console.log('获取小说章节列表成功，数据:', response);
            return response;
        } catch (error) {
            console.error('获取小说章节列表失败:', error);
            console.error('错误响应:', error.response?.data);
            console.error('错误状态码:', error.response?.status);
            
            // 如果是401错误，可能是token问题
            if (error.response?.status === 401) {
                console.error('认证失败，可能需要重新登录');
                // 可以在这里添加重定向到登录页的逻辑
            }
            
            return {
                success: false,
                message: error.response?.data?.message || '获取章节列表失败，请稍后再试'
            };
        }
    },
    
    // 获取章节内容
    getChapterContent: async (novelId, chapterNumber) => {
        try {
            console.log('获取章节内容，小说ID:', novelId, '章节号:', chapterNumber);
            console.log('当前认证状态:', localStorage.getItem('accessToken') ? '已登录' : '未登录');
            console.log('当前Cookie:', document.cookie || '无Cookie'); // 添加Cookie调试信息
            
            // 使用带凭据的API实例，确保Cookie可以被发送和接收
            const response = await apiWithCredentials.get(`/novels/${novelId}/chapter/${chapterNumber}`);
            console.log('获取章节内容成功，原始数据:', response);
            
            // 查看响应头中是否有设置Cookie
            console.log('响应头:', response.headers);
            
            // 确保响应中包含章节内容
            const result = handleApiResponse(response);
            
            // 如果返回的数据不包含content字段，添加一个默认值
            if (result.success && result.data && !result.data.content) {
                console.warn('章节内容为空，添加默认内容');
                result.data.content = '章节内容暂未上传';
            }
            
            // 确保章节标题
            if (result.success && result.data && !result.data.title) {
                result.data.title = `第${chapterNumber}章`;
            }
            
            return result;
        } catch (error) {
            console.error('获取章节内容失败:', error);
            console.error('错误响应:', error.response?.data);
            console.error('错误状态码:', error.response?.status);
            
            // 如果是401错误，可能是token问题
            if (error.response?.status === 401) {
                console.error('认证失败，可能需要重新登录');
                // 可以在这里添加重定向到登录页的逻辑
            }
            
            return {
                success: false,
                message: error.response?.data?.message || '获取章节内容失败，请稍后再试'
            };
        }
    },
    
    // 搜索小说
    searchNovels: async (keyword, params = {}) => {
        try {
            const { page = 1, limit = 10 } = params;
            const queryParams = new URLSearchParams();
            queryParams.append('keyword', keyword);
            queryParams.append('page', page);
            queryParams.append('limit', limit);
            
            const response = await api.get(`/novels/search?${queryParams.toString()}`);
            return response;
        } catch (error) {
            console.error('搜索小说失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '搜索小说失败，请稍后再试'
            };
        }
    },
    
    // 获取热门小说
    getPopularNovels: async (limit = 10) => {
        try {
            const response = await api.get(`/novels/popular?limit=${limit}`);
            return response;
        } catch (error) {
            console.error('获取热门小说失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取热门小说失败，请稍后再试'
            };
        }
    },
    
    // 获取最新小说
    getLatestNovels: async (limit = 10) => {
        try {
            console.log('获取最新小说，参数:', limit);
            const response = await api.get(`/novels/latest?limit=${limit}`);
            console.log('获取最新小说成功，原始数据:', response);
            return response;
        } catch (error) {
            console.error('获取最新小说失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取最新小说失败，请稍后再试'
            };
        }
    },
    
    // 获取分类小说
    getNovelsByCategory: async (categoryId, params = {}) => {
        try {
            const { page = 1, limit = 10 } = params;
            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', limit);
            
            const response = await api.get(`/novels/category/${categoryId}?${queryParams.toString()}`);
            return response;
        } catch (error) {
            console.error('获取分类小说失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取分类小说失败，请稍后再试'
            };
        }
    },
    
    // 获取作者创作的小说
    getNovelsByAuthor: async (authorId) => {
        try {
            console.log('调用获取作者创作的小说API - 作者ID:', authorId);
            const endpoint = `/novels/author/${authorId}`;
            console.log('请求端点:', endpoint);
            
            const response = await api.get(endpoint);
            
            console.log('获取作者小说响应完整数据:', response);
            console.log('响应数据类型:', typeof response);
            console.log('响应是否有data属性:', response.hasOwnProperty('data'));
            console.log('响应是否有success属性:', response.hasOwnProperty('success'));
            
            if (response && response.data) {
                return {
                    success: true,
                    data: response.data || [],
                    message: '获取成功'
                };
            } else if (response && response.success !== undefined) {
                // 直接返回API响应
                return response;
            } else {
                // 兼容处理
                return {
                    success: true,
                    data: Array.isArray(response) ? response : [],
                    message: '获取成功'
                };
            }
        } catch (error) {
            console.error('获取作者小说失败:', error);
            console.error('错误详情:', error.message);
            console.error('错误响应:', error.response?.data);
            return {
                success: false,
                message: error.response?.data?.message || '获取作者小说失败，请稍后再试',
                data: []
            };
        }
    }
};

// 用户中心相关API
export const userAPI = {
    // 获取用户信息
    getUserProfile: async () => {
        try {
            const response = await api.get('/users/me');
            return response;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取用户信息失败，请稍后再试'
            };
        }
    },
    
    // 更新用户信息
    updateUserProfile: async (profileData) => {
        try {
            const response = await api.put('/users/profile', profileData);
            
            // 如果更新成功，同时更新本地存储的用户信息
            if (response.success && response.data) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const updatedUser = { ...user, ...response.data };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            }
            
            return response;
        } catch (error) {
            console.error('更新用户信息失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '更新用户信息失败，请稍后再试'
            };
        }
    },
    
    // 上传头像
    uploadAvatar: async (formData) => {
        try {
            const response = await api.post('/users/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // 如果上传成功，同时更新本地存储的用户头像
            if (response.success && response.data) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const updatedUser = { ...user, avatar: response.data.avatar };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            }
            
            return response;
        } catch (error) {
            console.error('上传头像失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '上传头像失败，请稍后再试'
            };
        }
    },
    
    // 更新密码
    updatePassword: async (passwordData) => {
        try {
            const response = await api.put('/users/password', passwordData);
            return response;
        } catch (error) {
            console.error('更新密码失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '更新密码失败，请稍后再试'
            };
        }
    },
    
    // 删除账号
    deleteAccount: async () => {
        try {
            const response = await api.delete('/users/account');
            return response;
        } catch (error) {
            console.error('删除账号失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '删除账号失败，请稍后再试'
            };
        }
    },
    
    // 获取阅读历史
    getReadingHistory: async (params = {}) => {
        try {
            const { page = 1, limit = 10 } = params;
            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', limit);
            
            const response = await api.get(`/users/reading-history?${queryParams.toString()}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取阅读历史失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取阅读历史失败，请稍后再试'
            };
        }
    },
    
    // 添加阅读历史 - 记录用户访问小说
    addReadingHistory: async (novelId) => {
        try {
            const response = await api.post('/users/reading-history', { novel: novelId });
            return handleApiResponse(response);
        } catch (error) {
            console.error('添加阅读历史失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '添加阅读历史失败'
            };
        }
    },
    
    // 更新阅读进度
    updateReadingProgress: async (novelId, chapterId, lastReadChapter) => {
        try {
            const response = await api.put(`/users/reading-progress/${novelId}`, {
                chapterId,
                lastReadChapter
            });
            return handleApiResponse(response);
        } catch (error) {
            console.error('更新阅读进度失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '更新阅读进度失败'
            };
        }
    },
    
    // 删除阅读历史
    deleteReadingHistory: async (historyId) => {
        try {
            const response = await api.delete(`/users/reading-history/${historyId}`);
            return response;
        } catch (error) {
            console.error('删除阅读历史失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '删除阅读历史失败，请稍后再试'
            };
        }
    },
    
    // 检查小说是否已收藏
    checkFavorite: async (novelId) => {
        try {
            // 修复：后端没有/check/路径，直接在路径参数中使用novelId
            const response = await api.get(`/users/favorites/${novelId}/check`);
            const result = handleApiResponse(response);
            
            // 确保返回包含isFavorite字段
            if (result.success && typeof result.isFavorite === 'undefined') {
                result.isFavorite = !!result.data; // 如果data有值则认为已收藏
            }
            
            return result;
        } catch (error) {
            console.error('检查收藏状态失败:', error);
            // 错误时默认未收藏
            return {
                success: false,
                isFavorite: false,
                message: '检查收藏状态失败'
            };
        }
    },
    
    // 添加小说到收藏
    addToFavorites: async (novelId, group = '默认分组') => {
        try {
            // 确保请求体正确
            const requestData = {
                novel: novelId,  // 修改键名为novel以匹配后端期望
                group: group
            };
            
            const response = await api.post('/users/favorites', requestData);
            return handleApiResponse(response);
        } catch (error) {
            console.error('添加收藏失败:', error, error.response?.data);
            return {
                success: false,
                message: error.response?.data?.message || '添加收藏失败'
            };
        }
    },
    
    // 从收藏中移除小说
    removeFromFavorites: async (novelId) => {
        try {
            console.log('发送移除收藏请求，ID:', novelId);
            
            // 首先尝试通过小说ID查找收藏记录
            let favoriteId = novelId;
            
            try {
                // 先查询收藏ID
                const checkResponse = await api.get(`/users/favorites/${novelId}/check`);
                const checkResult = handleApiResponse(checkResponse);
                
                if (checkResult.success && checkResult.data && checkResult.data.id) {
                    // 如果能找到收藏记录，使用收藏记录的ID
                    favoriteId = checkResult.data.id;
                    console.log('找到收藏记录，使用收藏ID:', favoriteId);
                }
            } catch (checkError) {
                console.log('查询收藏ID失败，将直接使用传入的ID:', novelId);
            }
            
            // 发送删除请求
            const response = await api.delete(`/users/favorites/${favoriteId}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('移除收藏失败:', error, error.response?.data);
            return {
                success: false,
                message: error.response?.data?.message || '移除收藏失败'
            };
        }
    },
    
    // 记录用户阅读章节
    recordReading: async (novelId, chapterId) => {
        try {
            console.log(`记录阅读进度: 小说ID=${novelId}, 章节ID=${chapterId}`);
            
            const response = await api.post('/users/reading-history/record', {
                novel: novelId,
                chapterNumber: chapterId
            });
            
            return handleApiResponse(response);
        } catch (error) {
            console.error('记录阅读进度失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '记录阅读进度失败'
            };
        }
    },
    
    // 获取收藏列表
    getFavorites: async (params = {}) => {
        try {
            console.log('调用getFavorites，参数:', params);
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.group) queryParams.append('group', params.group);
            
            console.log('请求URL:', `/users/favorites?${queryParams.toString()}`);
            const response = await api.get(`/users/favorites?${queryParams.toString()}`);
            console.log('获取收藏列表原始响应:', response);
            
            const result = handleApiResponse(response);
            console.log('获取收藏列表处理后响应:', result);
            
            return result;
        } catch (error) {
            console.error('获取收藏列表失败:', error);
            return {
                success: false,
                data: [],
                total: 0,
                totalPages: 0,
                currentPage: params.page || 1,
                message: '获取收藏列表失败'
            };
        }
    },
    
    // 更新收藏分组
    updateFavorite: async (favoriteId, data) => {
        try {
            const response = await api.put(`/users/favorites/${favoriteId}`, data);
            return handleApiResponse(response);
        } catch (error) {
            console.error('更新收藏失败:', error);
            return {
                success: false,
                message: '更新收藏失败'
            };
        }
    },
    
    // 获取用户的收藏分组
    getFavoriteGroups: async () => {
        try {
            const response = await api.get('/users/favorites/groups');
            const result = handleApiResponse(response);
            
            // 标准化返回结构
            if (result.success) {
                // 确保返回的是数组格式
                if (!Array.isArray(result.data)) {
                    // 如果是groups字段存储的数组
                    if (result.groups && Array.isArray(result.groups)) {
                        result.data = result.groups.map(g => g.name || g);
                    } else {
                        // 默认空数组
                        result.data = ['默认收藏夹'];
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('获取收藏分组失败:', error);
            return {
                success: false,
                data: ['默认收藏夹'], // 默认返回一个分组
                message: '获取收藏分组失败'
            };
        }
    },
    
    // 获取指定用户信息
    getUserProfileById: async (userId) => {
        try {
            console.log('获取指定用户信息:', userId);
            const response = await api.get(`/users/${userId}/profile`);
            console.log('获取指定用户信息响应:', response);
            return response;
        } catch (error) {
            console.error('获取指定用户信息失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取用户信息失败，请稍后再试'
            };
        }
    },
    
    // 在userAPI对象中添加获取指定用户收藏的方法
    getUserFavoritesById: async (userId, params = {}) => {
        try {
            console.log('获取指定用户收藏:', userId, params);
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit || 100);
            if (params.group) queryParams.append('group', params.group);
            
            const response = await api.get(`/users/${userId}/favorites?${queryParams.toString()}`);
            console.log('获取指定用户收藏响应:', response);
            
            return {
                success: true,
                data: response.data || [],
                total: response.total || (response.data ? response.data.length : 0),
                message: '获取成功'
            };
        } catch (error) {
            console.error('获取指定用户收藏失败:', error);
            return {
                success: false,
                data: [],
                total: 0,
                message: error.response?.data?.message || '获取收藏失败，请稍后再试'
            };
        }
    }
};

// 读者API
export const readerAPI = {
  // 获取收藏夹
  getFavorites: async (page = 1, limit = 10) => {
    try {
      // 模拟API响应
      // 实际API应该是
      // const response = await axios.get(`/api/reader/favorites?page=${page}&limit=${limit}`);
      // return response.data;
      
      // 模拟延时
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        favorites: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0
        }
      };
    } catch (error) {
      console.error('获取收藏夹失败:', error);
      throw error;
    }
  },
  
  // 获取阅读历史
  getHistory: async (page = 1, limit = 10) => {
    try {
      // 模拟API响应
      // 实际API应该是
      // const response = await axios.get(`/api/reader/history?page=${page}&limit=${limit}`);
      // return response.data;
      
      // 模拟延时
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        history: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0
        }
      };
    } catch (error) {
      console.error('获取阅读历史失败:', error);
      throw error;
    }
  },
  
  // 添加到收藏夹
  addToFavorites: async (novelId) => {
    try {
      // 实际API应该是
      // const response = await axios.post(`/api/reader/favorites`, { novelId });
      // return response.data;
      
      // 模拟延时
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return { success: true };
    } catch (error) {
      console.error('添加收藏失败:', error);
      throw error;
    }
  },
  
  // 从收藏夹移除
  removeFromFavorites: async (favoriteId) => {
    try {
      // 实际API应该是
      // const response = await axios.delete(`/api/reader/favorites/${favoriteId}`);
      // return response.data;
      
      // 模拟延时
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return { success: true };
    } catch (error) {
      console.error('移除收藏失败:', error);
      throw error;
    }
  }
};

// 作者API
export const authorAPI = {
  // 获取作者仪表盘数据
  getAuthorDashboard: async () => {
    try {
      // 调用真实API
      const response = await api.get('/author/stats');
      console.log('API原始响应 - 获取作者仪表盘数据:', JSON.stringify(response, null, 2));
      console.log('作者统计数据中的章节总数:', response.data?.authorStats?.totalChapters);
      
      // 映射后端返回的数据结构到前端期望的结构
      const authorStats = response.data?.authorStats || {
        genres: [],
        isVerified: false,
        totalReaders: 0,
        totalWordCount: 0,
        worksCount: 0,
        totalChapters: 0
      };
      
      console.log('处理后的作者统计数据:', JSON.stringify(authorStats, null, 2));
      
      return {
        success: true,
        data: {
          authorStats,
          popularNovels: response.data?.popularNovels || [],
          recentNovels: response.data?.recentNovels || []
        },
        message: '获取成功'
      };
    } catch (error) {
      console.error('获取作者仪表盘数据失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false, 
        message: error.response?.data?.message || '获取作者仪表盘数据失败，请稍后再试',
        data: {
          authorStats: {
            genres: [],
            isVerified: false,
            totalReaders: 0,
            totalWordCount: 0,
            worksCount: 0,
            totalChapters: 0
          },
          popularNovels: [],
          recentNovels: []
        }
      };
    }
  },

  // 获取作者的所有小说
  getAuthorNovels: async () => {
    try {
      // 调用真实API
      const response = await api.get('/author/novels');
      console.log('API原始响应 - 获取作者小说列表:', JSON.stringify(response, null, 2));
      
      // 映射后端返回的数据结构到前端期望的结构
      return {
        success: true,
        data: {
          novels: response.data || []
        },
        message: '获取成功'
      };
    } catch (error) {
      console.error('获取作者小说列表失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '获取作者小说列表失败，请稍后再试',
        data: {
          novels: []
        }
      };
    }
  },
  
  // 创建新小说
  createNovel: async (novelData) => {
    try {
      // 检查是否为FormData类型
      const isFormData = novelData instanceof FormData;
      console.log('创建小说请求类型:', isFormData ? 'FormData' : 'JSON');
      
      // 如果是JSON对象，显示详细内容
      if (!isFormData) {
        console.log('JSON数据内容:', JSON.stringify(novelData, null, 2));
      } else {
        // FormData内容检查
        console.log('FormData内容检查:');
        novelData.forEach((value, key) => {
          if (value instanceof File) {
            console.log(`键: ${key}, 文件名: ${value.name}, 大小: ${value.size}字节, 类型: ${value.type}`);
          } else {
            console.log(`键: ${key}, 值: ${value}`);
          }
        });
      }
      
      // 调用API，明确设置JSON Content-Type
      const response = await api.post('/author/novels', novelData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API原始响应 - 创建小说:', JSON.stringify(response, null, 2));
      
      // 确保返回格式一致
      return {
        success: true,
        data: response.data || response,
        message: response.message || '小说创建成功'
      };
    } catch (error) {
      console.error('创建小说失败:', error);
      console.error('错误详情:', error.response?.data);
      
      // 返回统一的错误格式
      return {
        success: false,
        message: error.response?.data?.message || '创建小说失败，请稍后再试'
      };
    }
  },
  
  // 上传小说封面
  uploadNovelCover: async (novelId, coverData) => {
    try {
      // 确保coverData是FormData类型
      if (!(coverData instanceof FormData)) {
        throw new Error('封面数据必须是FormData类型');
      }
      
      console.log(`为小说ID ${novelId} 上传封面`);
      
      // 检查FormData内容
      coverData.forEach((value, key) => {
        if (value instanceof File) {
          console.log(`封面数据: 键=${key}, 文件名=${value.name}, 大小=${value.size}字节, 类型=${value.type}`);
        } else {
          console.log(`封面数据: 键=${key}, 值=${value}`);
        }
      });
      
      // 调用API上传封面 - 不要设置Content-Type，让浏览器自动处理multipart/form-data
      const config = {
        headers: {} // 故意留空，让axios/浏览器自动设置正确的multipart/form-data和boundary
      };
      
      // 使用自定义配置调用API
      const response = await api.post(`/author/novels/${novelId}/cover`, coverData, config);
      
      console.log('API原始响应 - 上传封面:', JSON.stringify(response, null, 2));
      
      return {
        success: true,
        data: response.data || response,
        message: response.message || '封面上传成功'
      };
    } catch (error) {
      console.error('上传封面失败:', error);
      console.error('错误详情:', error.response?.data);
      
      return {
        success: false,
        message: error.response?.data?.message || '上传封面失败，请稍后再试'
      };
    }
  },
  
  // 设置小说封面模板
  setNovelCoverTemplate: async (novelId, templateId) => {
    try {
      console.log(`为小说ID ${novelId} 设置封面模板 ${templateId}`);
      
      // 调用API设置封面模板
      const response = await api.post(`/author/novels/${novelId}/cover-template`, {
        templateId: templateId
      });
      
      console.log('API原始响应 - 设置封面模板:', JSON.stringify(response, null, 2));
      
      return {
        success: true,
        data: response.data || response,
        message: response.message || '封面模板设置成功'
      };
    } catch (error) {
      console.error('设置封面模板失败:', error);
      console.error('错误详情:', error.response?.data);
      
      return {
        success: false,
        message: error.response?.data?.message || '设置封面模板失败，请稍后再试'
      };
    }
  },
  
  // 更新小说
  updateNovel: async (novelId, novelData) => {
    try {
      // 调用真实API
      console.log('发送更新小说请求，ID:', novelId);
      
      // 检查是否是FormData类型
      const isFormData = novelData instanceof FormData;
      console.log('数据类型是FormData:', isFormData);
      
      // 如果是FormData，不要手动设置Content-Type，让浏览器自动处理
      let config = {};
      if (isFormData) {
        // 移除自定义Content-Type，让浏览器自动设置boundary等信息
        console.log('使用FormData，让浏览器自动设置Content-Type');
      }
      
      // 检查novelData中的文件
      if (isFormData) {
        const coverFile = novelData.get('cover');
        if (coverFile instanceof File) {
          console.log('封面文件信息:', {
            name: coverFile.name,
            type: coverFile.type,
            size: coverFile.size
          });
        } else {
          console.log('未包含封面文件');
        }
      }
      
      const response = await api.put(`/author/novels/${novelId}`, novelData, config);
      console.log('API原始响应 - 更新小说:', response);
      
      // 返回统一格式的成功响应
      return {
        success: true,
        data: response.data || {},
        message: response.message || '小说信息已成功更新'
      };
    } catch (error) {
      console.error('更新小说失败:', error);
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误详情:', error.response.data);
      }
      return {
        success: false,
        message: error.response?.data?.message || '更新小说失败，请稍后再试',
        data: null
      };
    }
  },
  
  // 更新小说状态（单独的API）
  updateNovelStatus: async (novelId, status) => {
    try {
      console.log('发送更新小说状态请求，ID:', novelId, '新状态:', status);
      
      // 确保novelId和status都有效
      if (!novelId || !status) {
        console.error('无效的参数:', { novelId, status });
        return {
          success: false,
          message: '无效的参数'
        };
      }
      
      try {
        // 首先尝试使用专门的状态更新API
        // 构建请求URL和数据
        const url = `/author/novels/${novelId}/status`;
        const data = { status };
        console.log('请求URL:', url, '请求数据:', data);
        
        // 使用PUT方法
        const response = await api.put(url, data);
        console.log('原始API响应:', response);
        
        const result = handleApiResponse(response);
        console.log('处理后的响应:', result);
        
        return result;
      } catch (specialApiError) {
        console.warn('专门的状态更新API失败，尝试使用通用更新API:', specialApiError);
        
        // 如果专门的API失败，尝试使用通用的更新小说API
        const response = await api.put(`/author/novels/${novelId}`, { status });
        console.log('通用API响应:', response);
        
        const result = handleApiResponse(response);
        console.log('通用API处理后的响应:', result);
        
        return result;
      }
    } catch (error) {
      console.error('更新小说状态失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || error.message || '更新小说状态失败，请稍后再试'
      };
    }
  },
  
  // 删除小说
  deleteNovel: async (novelId) => {
    try {
      // 调用真实API
      const response = await api.delete(`/author/novels/${novelId}`);
      console.log('API原始响应 - 删除小说:', response);
      
      // 返回统一格式的成功响应
      return {
        success: true,
        data: response.data || {},
        message: response.message || '小说已成功删除'
      };
    } catch (error) {
      console.error('删除小说失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '删除小说失败，请稍后再试',
        data: null
      };
    }
  },
  
  // 获取小说详情（作者视角）
  getNovelDetail: async (novelId) => {
    try {
      // 使用模拟数据进行测试
      const useMockData = false; // 设置为false切换到真实API

      if (useMockData) {
        console.log('使用模拟数据 - 获取小说详情');
        // 返回模拟数据
        return {
          success: true,
          data: {
            _id: novelId,
            title: '模拟小说标题',
            authorName: '模拟作者',
            status: '连载中',
            cover: '/images/default-cover.jpg',
            shortDescription: '这是一个模拟的小说描述...',
            longDescription: '这是一个更长的模拟小说描述，包含更多的细节和信息...',
            wordCount: 12500,
            totalChapters: 5,
            readers: 120,
            collections: 45,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          message: '获取成功'
        };
      }

      // 调用真实API
      const response = await api.get(`/author/novels/${novelId}`);
      console.log('API原始响应 - 获取小说详情:', response);
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('获取小说详情失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '获取小说详情失败，请稍后再试',
        data: {}
      };
    }
  },
  
  // 获取小说的所有章节
  getNovelChapters: async (novelId) => {
    try {
      // 使用模拟数据进行测试
      const useMockData = false; // 设置为false切换到真实API

      if (useMockData) {
        console.log('使用模拟数据 - 获取小说章节列表');
        // 返回模拟数据
        const mockChapters = [];
        for (let i = 1; i <= 5; i++) {
          mockChapters.push({
            _id: `mock-chapter-${i}`,
            title: `第${i}章 测试章节标题${i}`,
            chapterNumber: i,
            novel: novelId,
            wordCount: 2000 + Math.floor(Math.random() * 1000),
            viewCount: Math.floor(Math.random() * 100),
            createdAt: new Date(Date.now() - (5-i) * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - (5-i) * 86400000).toISOString()
          });
        }
        
        return {
          success: true,
          data: mockChapters,
          message: '获取成功'
        };
      }

      console.log('获取小说章节列表, ID:', novelId);
      console.log('当前认证状态:', localStorage.getItem('accessToken') ? '已登录' : '未登录');
      // 确保使用作者API路由
      const response = await api.get(`/author/novels/${novelId}/chapters`);
      console.log('API原始响应 - 获取小说章节列表:', response);
      
      const result = handleApiResponse(response);
      console.log('处理后的响应:', result);
      
      // 确保data是数组
      if (!Array.isArray(result.data)) {
        console.error('章节列表数据不是数组:', result.data);
        
        // 如果data.data是数组，使用它
        if (result.data && Array.isArray(result.data.data)) {
          console.log('使用data.data作为章节列表');
          result.data = result.data.data;
        } else {
          console.log('将data设为空数组');
          result.data = [];
        }
      }
      
      return result;
    } catch (error) {
      console.error('获取小说章节列表失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '获取小说章节列表失败，请稍后再试',
        data: []
      };
    }
  },
  
  // 获取章节详情
  getChapterDetail: async (novelId, chapterId) => {
    try {
      // 使用模拟数据进行测试
      const useMockData = false; // 设置为false切换到真实API

      if (useMockData) {
        console.log('使用模拟数据 - 获取章节详情');
        // 通过chapterId解析章节号
        const chapterNumber = chapterId.includes('mock-chapter-') 
          ? parseInt(chapterId.replace('mock-chapter-', '')) 
          : 1;
        
        // 返回模拟数据
        return {
          success: true,
          data: {
            _id: chapterId,
            title: `第${chapterNumber}章 测试章节标题${chapterNumber}`,
            chapterNumber: chapterNumber,
            content: `这是第${chapterNumber}章的测试内容。\n\n这是第二段落测试内容。\n\n这是第三段落测试内容，包含更多的文字来模拟真实的章节内容。这个章节是用来测试章节编辑功能的。`,
            novel: {
              _id: novelId,
              title: '模拟小说标题',
              creator: 'mock-user-id'
            },
            wordCount: 2000 + Math.floor(Math.random() * 1000),
            viewCount: Math.floor(Math.random() * 100),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          message: '获取成功'
        };
      }
      
      console.log('获取章节详情, 小说ID:', novelId, '章节ID:', chapterId);
      console.log('当前认证状态:', localStorage.getItem('accessToken') ? '已登录' : '未登录');
      
      const response = await api.get(`/author/novels/${novelId}/chapters/${chapterId}`);
      console.log('API原始响应 - 获取章节详情:', response);
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('获取章节详情失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '获取章节详情失败，请稍后再试',
        data: {}
      };
    }
  },
  
  // 创建新章节
  createChapter: async (novelId, chapterData) => {
    try {
      // 使用模拟数据进行测试
      const useMockData = false; // 设置为false切换到真实API

      if (useMockData) {
        console.log('使用模拟数据 - 创建章节', chapterData);
        
        // 模拟成功创建章节
        setTimeout(() => console.log('章节创建成功'), 500);
        
        return {
          success: true,
          data: {
            _id: `mock-chapter-${chapterData.chapterNumber}`,
            ...chapterData,
            novel: novelId,
            wordCount: chapterData.content.replace(/\s+/g, '').length,
            viewCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          message: '章节创建成功'
        };
      }
      
      console.log('创建章节, 小说ID:', novelId);
      console.log('创建章节请求数据:', JSON.stringify(chapterData, null, 2));
      
      const response = await api.post(`/author/novels/${novelId}/chapters`, chapterData);
      console.log('API原始响应 - 创建章节:', response);
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('创建章节失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '创建章节失败，请稍后再试',
        data: {}
      };
    }
  },
  
  // 更新章节
  updateChapter: async (novelId, chapterId, chapterData) => {
    try {
      // 使用模拟数据进行测试
      const useMockData = false; // 设置为false切换到真实API

      if (useMockData) {
        console.log('使用模拟数据 - 更新章节', chapterData);
        
        // 模拟成功更新章节
        setTimeout(() => console.log('章节更新成功'), 500);
        
        return {
          success: true,
          data: {
            _id: chapterId,
            ...chapterData,
            novel: novelId,
            wordCount: chapterData.content.replace(/\s+/g, '').length,
            updatedAt: new Date().toISOString()
          },
          message: '章节更新成功'
        };
      }
      
      console.log('更新章节, 小说ID:', novelId, '章节ID:', chapterId);
      console.log('更新章节请求数据:', JSON.stringify(chapterData, null, 2));
      
      const response = await api.put(`/author/novels/${novelId}/chapters/${chapterId}`, chapterData);
      console.log('API原始响应 - 更新章节:', response);
      
      return handleApiResponse(response);
    } catch (error) {
      console.error('更新章节失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '更新章节失败，请稍后再试',
        data: {}
      };
    }
  },
  
  // 删除章节
  deleteChapter: async (novelId, chapterId) => {
    try {
      // 使用模拟数据进行测试
      const useMockData = false; // 设置为false切换到真实API

      if (useMockData) {
        console.log('使用模拟数据 - 删除章节', novelId, chapterId);
        
        // 模拟成功删除章节
        setTimeout(() => console.log('章节删除成功'), 500);
        
        return {
          success: true,
          message: '章节删除成功'
        };
      }
      
      console.log('删除章节, 小说ID:', novelId, '章节ID:', chapterId);
      
      const response = await api.delete(`/author/novels/${novelId}/chapters/${chapterId}`);
      console.log('API原始响应 - 删除章节:', response);
      
      const result = handleApiResponse(response);
      
      // 删除成功后，强制刷新小说详情
      if (result.success) {
        try {
          console.log('章节删除成功，刷新小说详情');
          // 获取最新的小说详情数据
          await api.get(`/author/novels/${novelId}`);
          console.log('小说详情已刷新');
        } catch (refreshError) {
          console.error('刷新小说详情失败:', refreshError);
        }
      }
      
      return result;
    } catch (error) {
      console.error('删除章节失败:', error);
      console.error('错误详情:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '删除章节失败，请稍后再试',
        data: {}
      };
    }
  }
};

// 文件夹相关API
export const folderAPI = {
    // 获取所有文件夹
    getFolders: async () => {
        try {
            const response = await api.get('/folders');
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取文件夹列表失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取文件夹列表失败'
            };
        }
    },
    
    // 创建文件夹
    createFolder: async (name, icon = '📁') => {
        try {
            const response = await api.post('/folders', { name, icon });
            return handleApiResponse(response);
        } catch (error) {
            console.error('创建文件夹失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '创建文件夹失败'
            };
        }
    },
    
    // 更新文件夹
    updateFolder: async (id, data) => {
        try {
            const response = await api.put(`/folders/${id}`, data);
            return handleApiResponse(response);
        } catch (error) {
            console.error('更新文件夹失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '更新文件夹失败'
            };
        }
    },
    
    // 删除文件夹
    deleteFolder: async (id) => {
        try {
            const response = await api.delete(`/folders/${id}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('删除文件夹失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '删除文件夹失败'
            };
        }
    },
    
    // 获取文件夹中的收藏
    getFolderFavorites: async (folderId, page = 1, limit = 20) => {
        try {
            const response = await api.get(`/folders/${folderId}/favorites`, {
                params: { page, limit }
            });
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取文件夹收藏失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取文件夹收藏失败'
            };
        }
    },
    
    // 获取收藏所在的文件夹
    getFavoriteFolders: async (favoriteId) => {
        try {
            const response = await api.get(`/folders/favorites/${favoriteId}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取收藏文件夹失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取收藏文件夹失败'
            };
        }
    },
    
    // 添加收藏到文件夹
    addToFolder: async (favoriteId, folderId) => {
        try {
            const response = await api.post('/folders/add', { favoriteId, folderId });
            return handleApiResponse(response);
        } catch (error) {
            console.error('添加收藏到文件夹失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '添加收藏到文件夹失败'
            };
        }
    },
    
    // 从文件夹中移除收藏
    removeFromFolder: async (favoriteId, folderId) => {
        try {
            const response = await api.delete(`/folders/${folderId}/favorites/${favoriteId}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('从文件夹移除收藏失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '从文件夹移除收藏失败'
            };
        }
    },
    
    // 更新收藏的文件夹
    updateFavoriteFolders: async (favoriteId, folderIds) => {
        try {
            const response = await api.put(`/folders/favorites/${favoriteId}`, { folderIds });
            return handleApiResponse(response);
        } catch (error) {
            console.error('更新收藏文件夹失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '更新收藏文件夹失败'
            };
        }
    }
};

// 留言/评论相关API
export const commentAPI = {
    // 获取小说的所有留言（包括章节留言）
    getNovelComments: async (novelId, page = 1, limit = 10) => {
        try {
            console.log('获取小说留言，ID:', novelId);
            const response = await api.get(`/comments/novel/${novelId}?page=${page}&limit=${limit}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取小说留言失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取留言失败，请稍后再试'
            };
        }
    },
    
    // 获取章节的留言
    getChapterComments: async (chapterId, page = 1, limit = 10) => {
        try {
            console.log('获取章节留言，ID:', chapterId);
            const response = await api.get(`/comments/chapter/${chapterId}?page=${page}&limit=${limit}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取章节留言失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取留言失败，请稍后再试'
            };
        }
    },
    
    // 获取用户的留言历史
    getUserComments: async (page = 1, limit = 10) => {
        try {
            console.log('获取用户留言历史');
            const response = await api.get(`/comments/user/history?page=${page}&limit=${limit}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('获取用户留言历史失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '获取留言历史失败，请稍后再试'
            };
        }
    },
    
    // 发布留言（小说或章节）
    createComment: async (data) => {
        try {
            console.log('发布留言:', data);
            const response = await api.post('/comments', data);
            return handleApiResponse(response);
        } catch (error) {
            console.error('发布留言失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '发布留言失败，请稍后再试'
            };
        }
    },
    
    // 删除留言
    deleteComment: async (commentId) => {
        try {
            console.log('删除留言，ID:', commentId);
            const response = await api.delete(`/comments/${commentId}`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('删除留言失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '删除留言失败，请稍后再试'
            };
        }
    },
    
    // 点赞留言
    likeComment: async (commentId) => {
        try {
            console.log('点赞留言，ID:', commentId);
            const response = await api.post(`/comments/${commentId}/like`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('点赞留言失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '点赞失败，请稍后再试'
            };
        }
    },
    
    // 取消点赞
    unlikeComment: async (commentId) => {
        try {
            console.log('取消点赞，ID:', commentId);
            const response = await api.delete(`/comments/${commentId}/like`);
            return handleApiResponse(response);
        } catch (error) {
            console.error('取消点赞失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '取消点赞失败，请稍后再试'
            };
        }
    },
    
    // 回复留言
    replyToComment: async (data) => {
        try {
            console.log('回复留言:', data);
            const response = await api.post('/comments/reply', data);
            return handleApiResponse(response);
        } catch (error) {
            console.error('回复留言失败:', error);
            return {
                success: false,
                message: error.response?.data?.message || '回复留言失败，请稍后再试'
            };
        }
    }
};

// 仅导出API实例
export { api, apiWithCredentials };
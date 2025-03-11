// 调试工具函数，用于诊断API和认证问题

export const checkTokenValidity = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    console.warn('没有找到访问令牌 (accessToken)');
    return false;
  }
  
  try {
    // 简单检查令牌格式
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('令牌格式无效，不是有效的JWT (应有3部分，用.分隔)');
      return false;
    }
    
    // 检查是否过期
    try {
      const payload = JSON.parse(atob(parts[1]));
      const expiry = payload.exp * 1000; // 转换为毫秒
      const now = Date.now();
      
      if (expiry < now) {
        console.error('令牌已过期', {
          过期时间: new Date(expiry).toLocaleString(),
          当前时间: new Date(now).toLocaleString(),
          剩余时间: '已过期'
        });
        return false;
      } else {
        console.log('令牌有效', {
          过期时间: new Date(expiry).toLocaleString(),
          当前时间: new Date(now).toLocaleString(),
          剩余时间: `${Math.round((expiry - now) / 1000 / 60)} 分钟`
        });
        return true;
      }
    } catch (e) {
      console.error('无法解析令牌负载', e);
      return false;
    }
  } catch (error) {
    console.error('检查令牌时出错', error);
    return false;
  }
};

export const testNovelDetailAPI = async (novelId) => {
  console.log('直接测试小说详情API');
  console.log('当前认证状态:', localStorage.getItem('accessToken') ? '已登录' : '未登录');
  
  try {
    // 不带认证头的请求
    const response = await fetch(`http://localhost:5001/api/novels/${novelId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => res.json());
    
    console.log('不带认证的小说详情请求响应:', response);
    return response;
  } catch (error) {
    console.error('测试小说详情API失败:', error);
    return { success: false, message: '测试API失败' };
  }
}; 
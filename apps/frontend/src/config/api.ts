// API 配置文件
export const API_CONFIG = {
  // 後端 API 基礎 URL
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // 認證相關端點
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
    UPDATE_USER: '/auth/update-user',
  },
  
  // 其他 API 端點可以在這裡添加
}

// 構建完整的 API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

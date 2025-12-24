import { buildApiUrl } from '../config/api'
import { useErrorStore } from '../stores/error'

// 獲取認證 token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

// 通用 API 請求函數
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken()
  const errorStore = useErrorStore()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    // 處理 401 錯誤（未授權）
    if (response.status === 401) {
      errorStore.showLogoutError()
      // 不拋出錯誤，讓調用方正常繼續（錯誤已通過 modal 顯示）
      // 返回一個 rejected promise，但不會觸發 catch（因為錯誤已通過 modal 顯示）
      return Promise.reject(new Error('Unauthorized'))
    }
    
    // 處理其他錯誤
    const errorData = await response.json().catch(() => ({ message: '請求失敗' }))
    const errorMessage = errorData.message || `HTTP error! status: ${response.status}`
    errorStore.showError(errorMessage)
    // 拋出錯誤，讓調用方知道請求失敗（錯誤已通過 modal 顯示）
    throw new Error(errorMessage)
  }
  
  return response.json()
}

// GET 請求
export const apiGet = <T>(endpoint: string): Promise<T> => {
  return apiRequest<T>(endpoint, { method: 'GET' })
}

// POST 請求
export const apiPost = <T>(endpoint: string, data?: any): Promise<T> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

// DELETE 請求
export const apiDelete = <T>(endpoint: string): Promise<T> => {
  return apiRequest<T>(endpoint, { method: 'DELETE' })
}


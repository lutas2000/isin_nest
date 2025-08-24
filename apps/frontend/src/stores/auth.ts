import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildApiUrl, API_CONFIG } from '../config/api'

export interface User {
  id: number
  userName: string
  isAdmin: boolean
  features: string[]
  staffId?: string
  createdAt: Date
  updatedAt: Date
}

export interface LoginResponse {
  access_token: string
}

export const useAuthStore = defineStore('auth', () => {
  // 狀態
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isAuthenticated = ref(false)

  // 計算屬性
  const isLoggedIn = computed(() => isAuthenticated.value && user.value !== null)
  const userRole = computed(() => user.value?.isAdmin ? 'admin' : 'user')
  const userName = computed(() => user.value?.userName || '')

  // 從 localStorage 恢復狀態
  const initializeAuth = () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')
    
    if (savedToken && savedUser) {
      try {
        token.value = savedToken
        user.value = JSON.parse(savedUser)
        isAuthenticated.value = true
      } catch (error) {
        console.error('Failed to restore auth state:', error)
        clearAuth()
      }
    }
  }

  // 登入
  const login = async (username: string, password: string) => {
    try {
      // 調用後端登入 API
      const response = await fetch(buildApiUrl(API_CONFIG.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: username,
          password: password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '登入失敗')
      }

      const loginData: LoginResponse = await response.json()
      
      // 獲取用戶信息（這裡需要調用另一個 API 或從 JWT 解析）
      // 暫時使用 username 作為基本信息
      const userInfo: User = {
        id: 0, // 暫時設為 0，實際應該從 JWT 或用戶 API 獲取
        userName: username,
        isAdmin: false, // 暫時設為 false，實際應該從 JWT 或用戶 API 獲取
        features: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // 保存到 store
      user.value = userInfo
      token.value = loginData.access_token
      isAuthenticated.value = true
      
      // 保存到 localStorage
      localStorage.setItem('auth_token', loginData.access_token)
      localStorage.setItem('auth_user', JSON.stringify(userInfo))
      
      return { success: true, user: userInfo }
    } catch (error) {
      console.error('Login failed:', error)
      const errorMessage = error instanceof Error ? error.message : '登入失敗'
      return { success: false, error: errorMessage }
    }
  }

  // 登出
  const logout = () => {
    clearAuth()
  }

  // 清除認證狀態
  const clearAuth = () => {
    user.value = null
    token.value = null
    isAuthenticated.value = false
    
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  // 檢查 token 是否有效
  const checkAuth = async () => {
    if (!token.value) {
      return false
    }
    
    try {
      // 調用後端 API 驗證 token（這裡可以調用一個受保護的端點來驗證）
      // 或者解析 JWT token 來檢查是否過期
      // 暫時返回 true，實際應該調用後端 API
      return true
    } catch (error) {
      console.error('Token validation failed:', error)
      clearAuth()
      return false
    }
  }

  return {
    // 狀態
    user,
    token,
    isAuthenticated,
    
    // 計算屬性
    isLoggedIn,
    userRole,
    userName,
    
    // 方法
    initializeAuth,
    login,
    logout,
    clearAuth,
    checkAuth
  }
})

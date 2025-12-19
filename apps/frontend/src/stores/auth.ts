import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildApiUrl, API_CONFIG } from '../config/api'

// Staff 資料（不含薪資相關欄位）
export interface Staff {
  id: string // 員工編號
  name: string // 姓名
  post?: string // 職稱
  work_group?: string // 工作組別
  department?: string // 部門
  is_foreign: boolean // 是否為外勞
  benifit: boolean // 是否參加福委會
  need_check: boolean // 是否需要打卡
  begain_work?: string // 到職日期
  stop_work?: string // 離職日期
  have_fake: boolean // 是否需要外帳
}

export interface User {
  id: number
  userName: string
  isAdmin: boolean
  features: string[]
  staff?: Staff | null // 關聯的員工資料
  createdAt: Date
  updatedAt: Date
}

export interface LoginResponse {
  access_token: string
  user: User
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
  const staff = computed(() => user.value?.staff || null)
  const staffId = computed(() => user.value?.staff?.id || null)
  const staffName = computed(() => user.value?.staff?.name || '')

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
      
      // 使用後端返回的用戶資料（包含 staff 資料）
      const userInfo: User = loginData.user
      
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
    staff,
    staffId,
    staffName,
    
    // 方法
    initializeAuth,
    login,
    logout,
    clearAuth,
    checkAuth
  }
})

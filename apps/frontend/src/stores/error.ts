import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ErrorType = 'error' | 'warning' | 'info'

export const useErrorStore = defineStore('error', () => {
  // 狀態
  const show = ref(false)
  const message = ref('')
  const type = ref<ErrorType>('error')
  const isLogoutError = ref(false)

  // 顯示一般錯誤
  const showError = (errorMessage: string, errorType: ErrorType = 'error') => {
    message.value = errorMessage
    type.value = errorType
    isLogoutError.value = false
    show.value = true
  }

  // 顯示登出錯誤（401）
  const showLogoutError = () => {
    message.value = '帳號已登出，請重新登入'
    type.value = 'error'
    isLogoutError.value = true
    show.value = true
  }

  // 清除錯誤
  const clearError = () => {
    show.value = false
    message.value = ''
    isLogoutError.value = false
  }

  return {
    // 狀態
    show,
    message,
    type,
    isLogoutError,
    
    // 方法
    showError,
    showLogoutError,
    clearError
  }
})





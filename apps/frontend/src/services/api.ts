import { buildApiUrl } from '../config/api'
import { useErrorStore } from '../stores/error'

// 獲取認證 token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

// 通用 API 請求函數
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  /** 為 true 時不跳出全域錯誤（仍會 throw，供呼叫端自行處理） */
  silent = false,
): Promise<T> => {
  const token = getAuthToken()
  const errorStore = useErrorStore()
  
  const isFormData = options.body instanceof FormData
  
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
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
      const errorData = await response.json().catch(() => ({ message: '' }))
      const errorMessage =
        typeof errorData.message === 'string' ? errorData.message : ''

      // 僅在 JWT／登入失效時視為登出；業務錯誤誤回 401 時仍顯示實際訊息
      const isAuthFailure =
        !errorMessage ||
        /token|jwt|登入|密碼|權限不足|admin|管理員/i.test(errorMessage)

      if (isAuthFailure) {
        errorStore.showLogoutError()
      } else if (!silent) {
        errorStore.showError(errorMessage || '未授權，請重新登入')
      }
      return Promise.reject(new Error(errorMessage || 'Unauthorized'))
    }
    
    // 處理其他錯誤
    const errorData = await response.json().catch(() => ({ message: '請求失敗' }))
    const errorMessage = errorData.message || `HTTP error! status: ${response.status}`
    if (!silent) {
      errorStore.showError(errorMessage)
    }
    // 拋出錯誤，讓調用方知道請求失敗（錯誤已通過 modal 顯示）
    throw new Error(errorMessage)
  }
  
  // 檢查響應是否有內容（某些 DELETE 請求可能返回空響應）
  const contentLength = response.headers.get('content-length')

  // 如果響應體為空，直接返回空對象
  if (contentLength === '0') {
    return {} as T
  }

  // 嘗試解析 JSON，如果失敗（空 body 或非 JSON 格式）則返回空對象
  try {
    const text = await response.text()
    if (!text.trim()) {
      return {} as T
    }
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

// GET 請求
export const apiGet = <T>(
  endpoint: string,
  params?: Record<string, any>,
  silent?: boolean,
): Promise<T> => {
  let url = endpoint
  if (params) {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ).toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }
  return apiRequest<T>(url, { method: 'GET' }, silent)
}

// POST 請求
export const apiPost = <T>(endpoint: string, data?: any): Promise<T> => {
  const isFormData = data instanceof FormData
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
  })
}

// DELETE 請求
export const apiDelete = <T>(endpoint: string): Promise<T> => {
  return apiRequest<T>(endpoint, { method: 'DELETE' })
}

// PUT 請求
export const apiPut = <T>(endpoint: string, data?: any): Promise<T> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

// PATCH 請求
export const apiPatch = <T>(endpoint: string, data?: any): Promise<T> => {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

export interface DownloadedFile {
  blob: Blob
  fileName: string
}

/** 解析 Content-Disposition 的檔名（支援 RFC 5987 `filename*=UTF-8''...`）。 */
const parseDispositionFileName = (header: string | null, fallback: string): string => {
  if (!header) return fallback
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      return fallback
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : fallback
}

/** 下載二進位檔案（xlsx 等）。錯誤處理與 apiRequest 一致。 */
export const apiDownload = async (endpoint: string, fallbackFileName = 'download'): Promise<DownloadedFile> => {
  const token = getAuthToken()
  const errorStore = useErrorStore()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(buildApiUrl(endpoint), { method: 'GET', headers })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '' }))
    const errorMessage = typeof errorData.message === 'string' ? errorData.message : ''
    if (response.status === 401) {
      errorStore.showLogoutError()
    } else {
      errorStore.showError(errorMessage || `下載失敗（HTTP ${response.status}）`)
    }
    throw new Error(errorMessage || `HTTP error! status: ${response.status}`)
  }
  return {
    blob: await response.blob(),
    fileName: parseDispositionFileName(response.headers.get('content-disposition'), fallbackFileName),
  }
}

/** 觸發瀏覽器儲存檔案。 */
export const saveDownloadedFile = ({ blob, fileName }: DownloadedFile): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

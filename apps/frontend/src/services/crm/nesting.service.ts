import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export interface NestingItem {
  id: string
  quantity: number
  processingTime?: number
  x?: number
  y?: number
  createdAt?: string
  updatedAt?: string
}

export interface Nesting {
  id: string
  nestingNumber: string
  orderId: string
  designWorkOrderId?: number
  material: string
  thickness: string
  quantity: number
  nestingImageFile?: string
  cncFile?: string
  x?: number
  y?: number
  cutLength?: number
  lineLength?: number
  processingTime?: number
  utilization?: number
  weight?: number
  scrap?: number
  order?: any
  designWorkOrder?: any
  nestingItems?: NestingItem[]
  createdAt?: string
  updatedAt?: string
}

export const nestingService = {
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<Nesting>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<Nesting>>(API_CONFIG.CRM.NESTINGS, params)
  },

  getByOrderId: (orderId: string): Promise<Nesting[]> => {
    return apiGet<Nesting[]>(`${API_CONFIG.CRM.NESTINGS}/by-order/${orderId}`)
  },

  getById: (id: string): Promise<Nesting> => {
    return apiGet<Nesting>(`${API_CONFIG.CRM.NESTINGS}/${id}`)
  },

  create: (data: Partial<Nesting>): Promise<Nesting> => {
    return apiPost<Nesting>(API_CONFIG.CRM.NESTINGS, data)
  },

  update: (id: string, data: Partial<Nesting>): Promise<Nesting> => {
    return apiPost<Nesting>(`${API_CONFIG.CRM.NESTINGS}/${id}`, data)
  },

  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.NESTINGS}/${id}`)
  },

  // 排版工件管理（若未來需要手動維護可擴充）
  addItem: (nestingId: string, data: Partial<NestingItem>): Promise<NestingItem> => {
    return apiPost<NestingItem>(`${API_CONFIG.CRM.NESTINGS}/${nestingId}/items`, data)
  },

  updateItem: (nestingId: string, itemId: string, quantity: number): Promise<NestingItem> => {
    return apiPatch<NestingItem>(`${API_CONFIG.CRM.NESTINGS}/${nestingId}/items/${itemId}`, { quantity })
  },

  removeItem: (nestingId: string, itemId: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.NESTINGS}/${nestingId}/items/${itemId}`)
  },

  importFromDocx: (formData: FormData): Promise<Nesting> => {
    return apiPost<Nesting>(`${API_CONFIG.CRM.NESTINGS}/import-docx`, formData)
  },
}

import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export enum NestingStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
}

export interface NestingItem {
  id: number
  nestingId: number
  orderItemId: number
  quantity: number
  orderItem?: any
  createdAt?: string
  updatedAt?: string
}

export interface Nesting {
  id: number
  nestingNumber: string
  orderId: string
  designWorkOrderId?: number
  material: string
  thickness: string
  quantity: number
  nestingImageFile?: string
  cncFile?: string
  status: NestingStatus
  notes?: string
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

  getById: (id: number): Promise<Nesting> => {
    return apiGet<Nesting>(`${API_CONFIG.CRM.NESTINGS}/${id}`)
  },

  create: (data: Partial<Nesting>): Promise<Nesting> => {
    return apiPost<Nesting>(API_CONFIG.CRM.NESTINGS, data)
  },

  update: (id: number, data: Partial<Nesting>): Promise<Nesting> => {
    return apiPost<Nesting>(`${API_CONFIG.CRM.NESTINGS}/${id}`, data)
  },

  finalize: (id: number): Promise<Nesting> => {
    return apiPatch<Nesting>(`${API_CONFIG.CRM.NESTINGS}/${id}/finalize`)
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.NESTINGS}/${id}`)
  },

  // 排版工件管理
  addItem: (nestingId: number, orderItemId: number, quantity?: number): Promise<NestingItem> => {
    return apiPost<NestingItem>(`${API_CONFIG.CRM.NESTINGS}/${nestingId}/items`, { orderItemId, quantity })
  },

  updateItem: (nestingId: number, itemId: number, quantity: number): Promise<NestingItem> => {
    return apiPatch<NestingItem>(`${API_CONFIG.CRM.NESTINGS}/${nestingId}/items/${itemId}`, { quantity })
  },

  removeItem: (nestingId: number, itemId: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.NESTINGS}/${nestingId}/items/${itemId}`)
  },
}

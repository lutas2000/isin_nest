import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export interface QuoteItem {
  id: string
  quoteId: string
  customerFile?: string
  material?: string
  thickness?: string
  notes?: string
  quantity: number
  unitPrice: number
  createdAt?: string
  updatedAt?: string
}

export interface Quote {
  id: string
  staffId: string
  customerId: string
  totalAmount: number
  notes?: string
  postProcessing?: string[]
  isSigned: boolean
  quoteItems?: QuoteItem[]
  staff?: any
  customer?: any
  createdAt?: string
  updatedAt?: string
}

export interface WorkOrder {
  id: string
  staffId: string
  customerId: string
  shippingMethod: string
  paymentMethod: string
  notes?: string
  amount: number
  isCompleted: boolean
  staff?: any
  customer?: any
  workOrderItems?: any[]
  createdAt?: string
  endedAt?: string
  updatedAt?: string
}

export const quoteService = {
  // 獲取所有報價單（支援分頁）
  getAll: (page?: number, limit?: number): Promise<Quote[] | PaginatedResponse<Quote>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<Quote[] | PaginatedResponse<Quote>>(API_CONFIG.CRM.QUOTES, params)
  },

  // 獲取單個報價單
  getById: (id: string): Promise<Quote> => {
    return apiGet<Quote>(`${API_CONFIG.CRM.QUOTES}/${id}`)
  },

  // 建立報價單
  create: (data: Partial<Quote>): Promise<Quote> => {
    return apiPost<Quote>(API_CONFIG.CRM.QUOTES, data)
  },

  // 更新報價單
  update: (id: string, data: Partial<Quote>): Promise<Quote> => {
    return apiPost<Quote>(`${API_CONFIG.CRM.QUOTES}/${id}`, data)
  },

  // 刪除報價單
  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.QUOTES}/${id}`)
  },

  // 將報價單轉換為工單
  convertToWorkOrder: (id: string, shippingMethod: string, paymentMethod: string): Promise<WorkOrder> => {
    return apiPost<WorkOrder>(`${API_CONFIG.CRM.QUOTES}/${id}/convert-to-work-order`, {
      shippingMethod,
      paymentMethod,
    })
  },
}

export const quoteItemService = {
  // 獲取所有報價單工件（不支援分頁，返回數組）
  getAll: (quoteId?: string): Promise<QuoteItem[]> => {
    const params: Record<string, any> = {}
    if (quoteId !== undefined) params.quoteId = quoteId
    return apiGet<QuoteItem[]>(API_CONFIG.CRM.QUOTE_ITEMS, params)
  },

  // 獲取所有報價單工件（支援分頁）
  getAllPaginated: (quoteId?: string, page?: number, limit?: number): Promise<PaginatedResponse<QuoteItem>> => {
    const params: Record<string, any> = {}
    if (quoteId !== undefined) params.quoteId = quoteId
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<QuoteItem>>(API_CONFIG.CRM.QUOTE_ITEMS, params)
  },

  // 獲取單個報價單工件
  getById: (id: string): Promise<QuoteItem> => {
    return apiGet<QuoteItem>(`${API_CONFIG.CRM.QUOTE_ITEMS}/${id}`)
  },

  // 建立報價單工件
  create: (data: Partial<QuoteItem>): Promise<QuoteItem> => {
    return apiPost<QuoteItem>(API_CONFIG.CRM.QUOTE_ITEMS, data)
  },

  // 更新報價單工件
  update: (id: string, data: Partial<QuoteItem>): Promise<QuoteItem> => {
    return apiPost<QuoteItem>(`${API_CONFIG.CRM.QUOTE_ITEMS}/${id}`, data)
  },

  // 刪除報價單工件
  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.QUOTE_ITEMS}/${id}`)
  },
}


import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'

export interface QuoteItem {
  id: number
  quoteId: number
  customerFile?: string
  material?: string
  thickness?: string
  processing?: string
  quantity: number
  unitPrice: number
  createdAt?: string
  updatedAt?: string
}

export interface Quote {
  id: number
  staffId: string
  customerId?: string
  totalAmount: number
  notes?: string
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
  // 獲取所有報價單
  getAll: (): Promise<Quote[]> => {
    return apiGet<Quote[]>(API_CONFIG.CRM.QUOTES)
  },

  // 獲取單個報價單
  getById: (id: number): Promise<Quote> => {
    return apiGet<Quote>(`${API_CONFIG.CRM.QUOTES}/${id}`)
  },

  // 建立報價單
  create: (data: Partial<Quote>): Promise<Quote> => {
    return apiPost<Quote>(API_CONFIG.CRM.QUOTES, data)
  },

  // 更新報價單
  update: (id: number, data: Partial<Quote>): Promise<Quote> => {
    return apiPost<Quote>(`${API_CONFIG.CRM.QUOTES}/${id}`, data)
  },

  // 刪除報價單
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.QUOTES}/${id}`)
  },

  // 將報價單轉換為工單
  convertToWorkOrder: (id: number): Promise<WorkOrder> => {
    return apiPost<WorkOrder>(`${API_CONFIG.CRM.QUOTES}/${id}/convert-to-work-order`)
  },
}

export const quoteItemService = {
  // 獲取所有報價單工件
  getAll: (quoteId?: number): Promise<QuoteItem[]> => {
    const url = quoteId
      ? `${API_CONFIG.CRM.QUOTE_ITEMS}?quoteId=${quoteId}`
      : API_CONFIG.CRM.QUOTE_ITEMS
    return apiGet<QuoteItem[]>(url)
  },

  // 獲取單個報價單工件
  getById: (id: number): Promise<QuoteItem> => {
    return apiGet<QuoteItem>(`${API_CONFIG.CRM.QUOTE_ITEMS}/${id}`)
  },

  // 建立報價單工件
  create: (data: Partial<QuoteItem>): Promise<QuoteItem> => {
    return apiPost<QuoteItem>(API_CONFIG.CRM.QUOTE_ITEMS, data)
  },

  // 更新報價單工件
  update: (id: number, data: Partial<QuoteItem>): Promise<QuoteItem> => {
    return apiPost<QuoteItem>(`${API_CONFIG.CRM.QUOTE_ITEMS}/${id}`, data)
  },

  // 刪除報價單工件
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.QUOTE_ITEMS}/${id}`)
  },
}


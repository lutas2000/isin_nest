import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export interface Customer {
  id: string
  companyName: string
  invoiceTitle?: string
  companyShortName?: string
  phones?: string[]
  taxIds?: string[]
  postalCode?: string
  address?: string
  deliveryAddress?: string
  bank?: string
  accountNumber?: string
  creditLimit: number
  accountReceivable: number
  fax?: string
  email?: string
  mainProducts?: string
  firstTransactionDate?: string
  lastTransactionDate?: string
  notes?: string
  contacts?: Contact[]
  createdAt?: string
  updatedAt?: string
}

export interface Contact {
  id: number
  name: string
  phones?: string[]
  email?: string
  customerId: string
  customer?: Customer
  createdAt?: string
  updatedAt?: string
}

export const customerService = {
  // 獲取所有客戶（支援分頁和搜尋）
  getAll: (page?: number, limit?: number, search?: string): Promise<Customer[] | PaginatedResponse<Customer>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    if (search !== undefined && search.trim()) params.search = search.trim()
    return apiGet<Customer[] | PaginatedResponse<Customer>>(API_CONFIG.CRM.CUSTOMERS, params)
  },

  // 獲取單個客戶
  getById: (id: string): Promise<Customer> => {
    return apiGet<Customer>(`${API_CONFIG.CRM.CUSTOMERS}/${id}`)
  },

  // 建立客戶
  create: (data: Partial<Customer>): Promise<Customer> => {
    return apiPost<Customer>(API_CONFIG.CRM.CUSTOMERS, data)
  },

  // 更新客戶
  update: (id: string, data: Partial<Customer>): Promise<Customer> => {
    return apiPost<Customer>(`${API_CONFIG.CRM.CUSTOMERS}/${id}`, data)
  },

  // 刪除客戶
  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.CUSTOMERS}/${id}`)
  },
}


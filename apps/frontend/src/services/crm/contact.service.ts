import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { Contact } from './customer.service'
import { PaginatedResponse } from '../../types/pagination'

export const contactService = {
  // 獲取所有聯絡人（支援分頁和搜尋）
  getAll: (customerId?: string, page?: number, limit?: number, search?: string): Promise<Contact[] | PaginatedResponse<Contact>> => {
    const params: Record<string, any> = {}
    if (customerId) params.customerId = customerId
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    if (search !== undefined && search.trim()) params.search = search.trim()
    return apiGet<Contact[] | PaginatedResponse<Contact>>(API_CONFIG.CRM.CONTACTS, params)
  },

  // 獲取單個聯絡人
  getById: (id: number): Promise<Contact> => {
    return apiGet<Contact>(`${API_CONFIG.CRM.CONTACTS}/${id}`)
  },

  // 建立聯絡人
  create: (data: Partial<Contact>): Promise<Contact> => {
    return apiPost<Contact>(API_CONFIG.CRM.CONTACTS, data)
  },

  // 更新聯絡人
  update: (id: number, data: Partial<Contact>): Promise<Contact> => {
    return apiPost<Contact>(`${API_CONFIG.CRM.CONTACTS}/${id}`, data)
  },

  // 刪除聯絡人
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.CONTACTS}/${id}`)
  },
}


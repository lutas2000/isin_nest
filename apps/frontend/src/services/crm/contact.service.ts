import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { Contact } from './customer.service'

export const contactService = {
  // 獲取所有聯絡人
  getAll: (customerId?: string): Promise<Contact[]> => {
    const url = customerId
      ? `${API_CONFIG.CRM.CONTACTS}?customerId=${customerId}`
      : API_CONFIG.CRM.CONTACTS
    return apiGet<Contact[]>(url)
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


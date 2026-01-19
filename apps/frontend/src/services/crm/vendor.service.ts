import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export interface Vendor {
  id: number
  name: string
  contactName?: string
  phone?: string
  address?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateVendorDto {
  name: string
  contactName?: string
  phone?: string
  address?: string
  notes?: string
}

export interface UpdateVendorDto {
  name?: string
  contactName?: string
  phone?: string
  address?: string
  notes?: string
}

export const vendorService = {
  // 獲取所有廠商（支援分頁）
  getAll: (page?: number, limit?: number, search?: string): Promise<PaginatedResponse<Vendor>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    if (search) params.search = search
    return apiGet<PaginatedResponse<Vendor>>(API_CONFIG.CRM.VENDORS, params)
  },

  // 獲取所有廠商（不分頁）
  getAllWithoutPagination: (): Promise<Vendor[]> => {
    return apiGet<Vendor[]>(API_CONFIG.CRM.VENDORS_ALL)
  },

  // 獲取單個廠商
  getById: (id: number): Promise<Vendor> => {
    return apiGet<Vendor>(`${API_CONFIG.CRM.VENDORS}/${id}`)
  },

  // 建立廠商
  create: (data: CreateVendorDto): Promise<Vendor> => {
    return apiPost<Vendor>(API_CONFIG.CRM.VENDORS, data)
  },

  // 更新廠商
  update: (id: number, data: UpdateVendorDto): Promise<Vendor> => {
    return apiPut<Vendor>(`${API_CONFIG.CRM.VENDORS}/${id}`, data)
  },

  // 刪除廠商
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.VENDORS}/${id}`)
  },
}

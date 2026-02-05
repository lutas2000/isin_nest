import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'
import type { Vendor } from './vendor.service'

/**
 * Processing 主檔（加工項目定義）
 */
export interface Processing {
  id: number
  name: string
  vendorId?: number
  vendor?: Vendor
  notes?: string
  displayOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateProcessingDto {
  name: string
  vendorId?: number
  notes?: string
  displayOrder?: number
  isActive?: boolean
}

export interface UpdateProcessingDto {
  name?: string
  vendorId?: number
  notes?: string
  displayOrder?: number
  isActive?: boolean
}

export const processingService = {
  // 獲取所有加工項目（支援分頁）
  getAll: (page?: number, limit?: number, includeInactive?: boolean): Promise<PaginatedResponse<Processing>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    if (includeInactive !== undefined) params.includeInactive = includeInactive
    return apiGet<PaginatedResponse<Processing>>(API_CONFIG.CRM.PROCESSINGS, params)
  },

  // 獲取所有啟用的加工項目（不分頁，用於下拉選單）
  getAllActive: (): Promise<Processing[]> => {
    return apiGet<Processing[]>(`${API_CONFIG.CRM.PROCESSINGS}/active`)
  },

  // 根據多個 ID 獲取加工項目
  getByIds: (ids: number[]): Promise<Processing[]> => {
    return apiPost<Processing[]>(`${API_CONFIG.CRM.PROCESSINGS}/by-ids`, { ids })
  },

  // 獲取單個加工項目
  getById: (id: number): Promise<Processing> => {
    return apiGet<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}`)
  },

  // 建立加工項目
  create: (data: CreateProcessingDto): Promise<Processing> => {
    return apiPost<Processing>(API_CONFIG.CRM.PROCESSINGS, data)
  },

  // 更新加工項目
  update: (id: number, data: UpdateProcessingDto): Promise<Processing> => {
    return apiPut<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}`, data)
  },

  // 停用加工項目
  deactivate: (id: number): Promise<Processing> => {
    return apiPatch<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}/deactivate`, {})
  },

  // 啟用加工項目
  activate: (id: number): Promise<Processing> => {
    return apiPatch<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}/activate`, {})
  },

  // 刪除加工項目
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.PROCESSINGS}/${id}`)
  },
}

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'
import type { Vendor } from './vendor.service'

export enum ProcessingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface Processing {
  id: number
  orderItemId: number
  processingCode: string
  isOutsourced: boolean
  status: ProcessingStatus
  vendorId?: number
  vendor?: Vendor
  startedAt?: string
  completedAt?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateProcessingDto {
  orderItemId: number
  processingCode: string
  isOutsourced?: boolean
  status?: ProcessingStatus
  vendorId?: number
  notes?: string
}

export interface UpdateProcessingDto {
  processingCode?: string
  isOutsourced?: boolean
  status?: ProcessingStatus
  vendorId?: number
  notes?: string
}

export const processingService = {
  // 獲取所有加工紀錄（支援分頁）
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<Processing>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<Processing>>(API_CONFIG.CRM.PROCESSINGS, params)
  },

  // 根據訂貨單工件 ID 獲取加工紀錄
  getByOrderItemId: (orderItemId: number): Promise<Processing[]> => {
    return apiGet<Processing[]>(`${API_CONFIG.CRM.PROCESSINGS}/by-order-item/${orderItemId}`)
  },

  // 向後兼容別名
  getByWorkOrderItemId: (orderItemId: number): Promise<Processing[]> => {
    return apiGet<Processing[]>(`${API_CONFIG.CRM.PROCESSINGS}/by-order-item/${orderItemId}`)
  },

  // 獲取單個加工紀錄
  getById: (id: number): Promise<Processing> => {
    return apiGet<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}`)
  },

  // 建立加工紀錄
  create: (data: CreateProcessingDto): Promise<Processing> => {
    return apiPost<Processing>(API_CONFIG.CRM.PROCESSINGS, data)
  },

  // 批次建立加工紀錄
  bulkCreate: (orderItemId: number, processingCodes: string[]): Promise<Processing[]> => {
    return apiPost<Processing[]>(`${API_CONFIG.CRM.PROCESSINGS}/bulk`, {
      orderItemId,
      processingCodes,
    })
  },

  // 更新加工紀錄
  update: (id: number, data: UpdateProcessingDto): Promise<Processing> => {
    return apiPut<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}`, data)
  },

  // 更新加工狀態
  updateStatus: (id: number, status: ProcessingStatus): Promise<Processing> => {
    return apiPatch<Processing>(`${API_CONFIG.CRM.PROCESSINGS}/${id}/status`, { status })
  },

  // 刪除加工紀錄
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.PROCESSINGS}/${id}`)
  },
}

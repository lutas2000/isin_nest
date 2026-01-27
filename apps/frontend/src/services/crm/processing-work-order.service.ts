import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export enum ProcessingWorkOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface ProcessingWorkOrder {
  id: number
  orderId: string
  orderItemId: number
  processingType: string
  assignedStaffId?: string
  status: ProcessingWorkOrderStatus
  notes?: string
  order?: any
  orderItem?: any
  assignedStaff?: any
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export const processingWorkOrderService = {
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<ProcessingWorkOrder>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<ProcessingWorkOrder>>(API_CONFIG.CRM.PROCESSING_WORK_ORDERS, params)
  },

  getByOrderId: (orderId: string): Promise<ProcessingWorkOrder[]> => {
    return apiGet<ProcessingWorkOrder[]>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/by-order/${orderId}`)
  },

  getByStatus: (status: ProcessingWorkOrderStatus): Promise<ProcessingWorkOrder[]> => {
    return apiGet<ProcessingWorkOrder[]>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/by-status`, { status })
  },

  getById: (id: number): Promise<ProcessingWorkOrder> => {
    return apiGet<ProcessingWorkOrder>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/${id}`)
  },

  create: (data: Partial<ProcessingWorkOrder>): Promise<ProcessingWorkOrder> => {
    return apiPost<ProcessingWorkOrder>(API_CONFIG.CRM.PROCESSING_WORK_ORDERS, data)
  },

  update: (id: number, data: Partial<ProcessingWorkOrder>): Promise<ProcessingWorkOrder> => {
    return apiPost<ProcessingWorkOrder>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/${id}`, data)
  },

  updateStatus: (id: number, status: ProcessingWorkOrderStatus): Promise<ProcessingWorkOrder> => {
    return apiPatch<ProcessingWorkOrder>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/${id}/status`, { status })
  },

  assign: (id: number, staffId: string): Promise<ProcessingWorkOrder> => {
    return apiPatch<ProcessingWorkOrder>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/${id}/assign`, { staffId })
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.PROCESSING_WORK_ORDERS}/${id}`)
  },
}

import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export enum CuttingWorkOrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface CuttingWorkOrder {
  id: number
  orderId: string
  nestingId?: number
  assignedStaffId?: string
  machineId?: string
  material?: string
  thickness?: string
  status: CuttingWorkOrderStatus
  notes?: string
  order?: any
  assignedStaff?: any
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export const cuttingWorkOrderService = {
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<CuttingWorkOrder>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<CuttingWorkOrder>>(API_CONFIG.CRM.CUTTING_WORK_ORDERS, params)
  },

  getByOrderId: (orderId: string): Promise<CuttingWorkOrder[]> => {
    return apiGet<CuttingWorkOrder[]>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/by-order/${orderId}`)
  },

  getByStatus: (status: CuttingWorkOrderStatus): Promise<CuttingWorkOrder[]> => {
    return apiGet<CuttingWorkOrder[]>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/by-status`, { status })
  },

  getById: (id: number): Promise<CuttingWorkOrder> => {
    return apiGet<CuttingWorkOrder>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/${id}`)
  },

  create: (data: Partial<CuttingWorkOrder>): Promise<CuttingWorkOrder> => {
    return apiPost<CuttingWorkOrder>(API_CONFIG.CRM.CUTTING_WORK_ORDERS, data)
  },

  update: (id: number, data: Partial<CuttingWorkOrder>): Promise<CuttingWorkOrder> => {
    return apiPost<CuttingWorkOrder>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/${id}`, data)
  },

  updateStatus: (id: number, status: CuttingWorkOrderStatus): Promise<CuttingWorkOrder> => {
    return apiPatch<CuttingWorkOrder>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/${id}/status`, { status })
  },

  assign: (id: number, staffId: string, machineId?: string): Promise<CuttingWorkOrder> => {
    return apiPatch<CuttingWorkOrder>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/${id}/assign`, { staffId, machineId })
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.CUTTING_WORK_ORDERS}/${id}`)
  },
}

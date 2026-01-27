import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export enum OutsourcingWorkOrderStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  RETURNED = 'returned',
}

export interface OutsourcingWorkOrder {
  id: number
  orderId: string
  orderItemId: number
  vendorId: number
  processingType: string
  status: OutsourcingWorkOrderStatus
  shippedAt?: string
  returnedAt?: string
  notes?: string
  order?: any
  orderItem?: any
  vendor?: any
  createdAt?: string
  updatedAt?: string
}

export const outsourcingWorkOrderService = {
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<OutsourcingWorkOrder>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<OutsourcingWorkOrder>>(API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS, params)
  },

  getByOrderId: (orderId: string): Promise<OutsourcingWorkOrder[]> => {
    return apiGet<OutsourcingWorkOrder[]>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/by-order/${orderId}`)
  },

  getByVendorId: (vendorId: number): Promise<OutsourcingWorkOrder[]> => {
    return apiGet<OutsourcingWorkOrder[]>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/by-vendor/${vendorId}`)
  },

  getByStatus: (status: OutsourcingWorkOrderStatus): Promise<OutsourcingWorkOrder[]> => {
    return apiGet<OutsourcingWorkOrder[]>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/by-status`, { status })
  },

  getById: (id: number): Promise<OutsourcingWorkOrder> => {
    return apiGet<OutsourcingWorkOrder>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/${id}`)
  },

  create: (data: Partial<OutsourcingWorkOrder>): Promise<OutsourcingWorkOrder> => {
    return apiPost<OutsourcingWorkOrder>(API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS, data)
  },

  update: (id: number, data: Partial<OutsourcingWorkOrder>): Promise<OutsourcingWorkOrder> => {
    return apiPost<OutsourcingWorkOrder>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/${id}`, data)
  },

  updateStatus: (id: number, status: OutsourcingWorkOrderStatus): Promise<OutsourcingWorkOrder> => {
    return apiPatch<OutsourcingWorkOrder>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/${id}/status`, { status })
  },

  ship: (id: number): Promise<OutsourcingWorkOrder> => {
    return apiPatch<OutsourcingWorkOrder>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/${id}/ship`)
  },

  markReturned: (id: number): Promise<OutsourcingWorkOrder> => {
    return apiPatch<OutsourcingWorkOrder>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/${id}/return`)
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.OUTSOURCING_WORK_ORDERS}/${id}`)
  },
}

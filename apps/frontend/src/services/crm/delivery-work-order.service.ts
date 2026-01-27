import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export enum DeliveryWorkOrderStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
}

export interface DeliveryWorkOrder {
  id: number
  orderId: string
  driverId?: string
  deliveryAddress?: string
  contactPhone?: string
  scheduledDate?: string
  status: DeliveryWorkOrderStatus
  notes?: string
  order?: any
  driver?: any
  createdAt?: string
  updatedAt?: string
  deliveredAt?: string
}

export const deliveryWorkOrderService = {
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<DeliveryWorkOrder>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<DeliveryWorkOrder>>(API_CONFIG.CRM.DELIVERY_WORK_ORDERS, params)
  },

  getByOrderId: (orderId: string): Promise<DeliveryWorkOrder[]> => {
    return apiGet<DeliveryWorkOrder[]>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/by-order/${orderId}`)
  },

  getByDriverId: (driverId: string): Promise<DeliveryWorkOrder[]> => {
    return apiGet<DeliveryWorkOrder[]>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/by-driver/${driverId}`)
  },

  getByStatus: (status: DeliveryWorkOrderStatus): Promise<DeliveryWorkOrder[]> => {
    return apiGet<DeliveryWorkOrder[]>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/by-status`, { status })
  },

  getById: (id: number): Promise<DeliveryWorkOrder> => {
    return apiGet<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}`)
  },

  create: (data: Partial<DeliveryWorkOrder>): Promise<DeliveryWorkOrder> => {
    return apiPost<DeliveryWorkOrder>(API_CONFIG.CRM.DELIVERY_WORK_ORDERS, data)
  },

  update: (id: number, data: Partial<DeliveryWorkOrder>): Promise<DeliveryWorkOrder> => {
    return apiPost<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}`, data)
  },

  updateStatus: (id: number, status: DeliveryWorkOrderStatus): Promise<DeliveryWorkOrder> => {
    return apiPatch<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}/status`, { status })
  },

  assignDriver: (id: number, driverId: string): Promise<DeliveryWorkOrder> => {
    return apiPatch<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}/assign-driver`, { driverId })
  },

  markReady: (id: number): Promise<DeliveryWorkOrder> => {
    return apiPatch<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}/ready`)
  },

  startDelivery: (id: number): Promise<DeliveryWorkOrder> => {
    return apiPatch<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}/start`)
  },

  markDelivered: (id: number): Promise<DeliveryWorkOrder> => {
    return apiPatch<DeliveryWorkOrder>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}/delivered`)
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.DELIVERY_WORK_ORDERS}/${id}`)
  },
}

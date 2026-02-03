import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

import type { Processing } from './processing.service'

// 訂貨單狀態
export enum OrderStatus {
  PENDING = 'pending',
  DESIGN = 'design',
  CUTTING = 'cutting',
  PROCESSING = 'processing',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
}

export interface OrderItem {
  id: number
  orderId: string
  cadFile?: string
  customerFile?: string
  material?: string
  thickness?: string
  quantity: number
  unit?: string
  source: string
  processing?: string
  unitPrice: number
  estimatedCuttingTime?: number
  drawingStaffId?: string
  drawingNumber?: string
  isNested: boolean
  nestingId?: number
  status: string
  notes?: string
  order?: Order
  drawingStaff?: any
  processingItems?: Processing[]
  createdAt?: string
  updatedAt?: string
}

export interface Order {
  id: string
  quoteId?: string
  staffId: string
  customerId: string
  shippingMethod: string
  paymentMethod: string
  notes?: string
  amount: number
  status: OrderStatus
  isCompleted: boolean
  staff?: any
  customer?: any
  orderItems?: OrderItem[]
  createdAt?: string
  endedAt?: string
  updatedAt?: string
}

// 為了向後兼容，保留 WorkOrder 和 WorkOrderItem 別名
export type WorkOrder = Order
export type WorkOrderItem = OrderItem

export const orderService = {
  // 獲取所有訂貨單（支援分頁）
  getAll: (page?: number, limit?: number): Promise<Order[] | PaginatedResponse<Order>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<Order[] | PaginatedResponse<Order>>(API_CONFIG.CRM.ORDERS, params)
  },

  // 獲取單個訂貨單
  getById: (id: string): Promise<Order> => {
    return apiGet<Order>(`${API_CONFIG.CRM.ORDERS}/${id}`)
  },

  // 建立訂貨單
  create: (data: Partial<Order>): Promise<Order> => {
    return apiPost<Order>(API_CONFIG.CRM.ORDERS, data)
  },

  // 更新訂貨單
  update: (id: string, data: Partial<Order>): Promise<Order> => {
    return apiPost<Order>(`${API_CONFIG.CRM.ORDERS}/${id}`, data)
  },

  // 刪除訂貨單
  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.ORDERS}/${id}`)
  },

  // 更新訂貨單狀態
  updateStatus: (id: string, status: OrderStatus): Promise<Order> => {
    return apiPost<Order>(`${API_CONFIG.CRM.ORDERS}/${id}/status`, { status })
  },

  // 完成訂貨單
  complete: (id: string): Promise<Order> => {
    return apiPost<Order>(`${API_CONFIG.CRM.ORDERS}/${id}/complete`)
  },
}

export const orderItemService = {
  // 獲取所有訂貨單工件（支援分頁）
  getAll: (orderId?: string, page?: number, limit?: number): Promise<OrderItem[] | PaginatedResponse<OrderItem>> => {
    const params: Record<string, any> = {}
    if (orderId) params.orderId = orderId
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<OrderItem[] | PaginatedResponse<OrderItem>>(API_CONFIG.CRM.ORDER_ITEMS, params)
  },

  // 獲取單個訂貨單工件
  getById: (id: number): Promise<OrderItem> => {
    return apiGet<OrderItem>(`${API_CONFIG.CRM.ORDER_ITEMS}/${id}`)
  },

  // 建立訂貨單工件
  create: (data: Partial<OrderItem>): Promise<OrderItem> => {
    return apiPost<OrderItem>(API_CONFIG.CRM.ORDER_ITEMS, data)
  },

  // 更新訂貨單工件
  update: (id: number, data: Partial<OrderItem>): Promise<OrderItem> => {
    return apiPost<OrderItem>(`${API_CONFIG.CRM.ORDER_ITEMS}/${id}`, data)
  },

  // 刪除訂貨單工件
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.ORDER_ITEMS}/${id}`)
  },
}

// 向後兼容別名
export const workOrderService = orderService
export const workOrderItemService = orderItemService

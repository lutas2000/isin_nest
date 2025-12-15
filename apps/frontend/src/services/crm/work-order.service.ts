import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'

export interface WorkOrderItem {
  id: number
  workOrderId: string
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
  status: string
  workOrder?: WorkOrder
  drawingStaff?: any
  createdAt?: string
  updatedAt?: string
}

export interface WorkOrder {
  id: string
  staffId: string
  customerId: string
  shippingMethod: string
  paymentMethod: string
  notes?: string
  amount: number
  isCompleted: boolean
  staff?: any
  customer?: any
  workOrderItems?: WorkOrderItem[]
  createdAt?: string
  endedAt?: string
  updatedAt?: string
}

export const workOrderService = {
  // 獲取所有工單
  getAll: (): Promise<WorkOrder[]> => {
    return apiGet<WorkOrder[]>(API_CONFIG.CRM.WORK_ORDERS)
  },

  // 獲取單個工單
  getById: (id: string): Promise<WorkOrder> => {
    return apiGet<WorkOrder>(`${API_CONFIG.CRM.WORK_ORDERS}/${id}`)
  },

  // 建立工單
  create: (data: Partial<WorkOrder>): Promise<WorkOrder> => {
    return apiPost<WorkOrder>(API_CONFIG.CRM.WORK_ORDERS, data)
  },

  // 更新工單
  update: (id: string, data: Partial<WorkOrder>): Promise<WorkOrder> => {
    return apiPost<WorkOrder>(`${API_CONFIG.CRM.WORK_ORDERS}/${id}`, data)
  },

  // 刪除工單
  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.WORK_ORDERS}/${id}`)
  },

  // 完成工單
  complete: (id: string): Promise<WorkOrder> => {
    return apiPost<WorkOrder>(`${API_CONFIG.CRM.WORK_ORDERS}/${id}/complete`)
  },
}

export const workOrderItemService = {
  // 獲取所有工單工件
  getAll: (workOrderId?: string): Promise<WorkOrderItem[]> => {
    const url = workOrderId
      ? `${API_CONFIG.CRM.WORK_ORDER_ITEMS}?workOrderId=${workOrderId}`
      : API_CONFIG.CRM.WORK_ORDER_ITEMS
    return apiGet<WorkOrderItem[]>(url)
  },

  // 獲取單個工單工件
  getById: (id: number): Promise<WorkOrderItem> => {
    return apiGet<WorkOrderItem>(`${API_CONFIG.CRM.WORK_ORDER_ITEMS}/${id}`)
  },

  // 建立工單工件
  create: (data: Partial<WorkOrderItem>): Promise<WorkOrderItem> => {
    return apiPost<WorkOrderItem>(API_CONFIG.CRM.WORK_ORDER_ITEMS, data)
  },

  // 更新工單工件
  update: (id: number, data: Partial<WorkOrderItem>): Promise<WorkOrderItem> => {
    return apiPost<WorkOrderItem>(`${API_CONFIG.CRM.WORK_ORDER_ITEMS}/${id}`, data)
  },

  // 刪除工單工件
  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.WORK_ORDER_ITEMS}/${id}`)
  },
}


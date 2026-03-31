import { apiGet, apiPost, apiPatch, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export enum DesignWorkOrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface DesignWorkOrder {
  id: number
  orderId: string
  orderItemId: number
  assignedStaffId?: string
  supervisorStaffId?: string
  drawingNumber?: string
  customerFile?: string
  status: DesignWorkOrderStatus
  priority: number
  notes?: string
  isDrawingGroup?: boolean
  parentDesignWorkOrderId?: number | null
  children?: DesignWorkOrder[]
  order?: any
  orderItem?: any
  assignedStaff?: any
  supervisorStaff?: any
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export interface DesignWorkOrderCncPreview {
  drawingNumber: string
  fileName: string
  extension: 'nc' | 'cnc'
  content: string
  width: number | null
  height: number | null
}

export const designWorkOrderService = {
  getAll: (page?: number, limit?: number): Promise<PaginatedResponse<DesignWorkOrder>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<PaginatedResponse<DesignWorkOrder>>(API_CONFIG.CRM.DESIGN_WORK_ORDERS, params)
  },

  getByOrderId: (orderId: string): Promise<DesignWorkOrder[]> => {
    return apiGet<DesignWorkOrder[]>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/by-order/${orderId}`)
  },

  getByStatus: (status: DesignWorkOrderStatus): Promise<DesignWorkOrder[]> => {
    return apiGet<DesignWorkOrder[]>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/by-status`, { status })
  },

  getById: (id: number): Promise<DesignWorkOrder> => {
    return apiGet<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}`)
  },

  getCncPreview: (id: number): Promise<DesignWorkOrderCncPreview> => {
    return apiGet<DesignWorkOrderCncPreview>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}/cnc-preview`)
  },

  create: (data: Partial<DesignWorkOrder>): Promise<DesignWorkOrder> => {
    return apiPost<DesignWorkOrder>(API_CONFIG.CRM.DESIGN_WORK_ORDERS, data)
  },

  update: (id: number, data: Partial<DesignWorkOrder>): Promise<DesignWorkOrder> => {
    return apiPost<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}`, data)
  },

  updateStatus: (id: number, status: DesignWorkOrderStatus): Promise<DesignWorkOrder> => {
    return apiPatch<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}/status`, { status })
  },

  assign: (id: number, staffId: string): Promise<DesignWorkOrder> => {
    return apiPatch<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}/assign`, { staffId })
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}`)
  },

  convertToGroup: (id: number): Promise<DesignWorkOrder> => {
    return apiPost<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}/convert-to-group`, {})
  },

  dissolveGroup: (id: number): Promise<DesignWorkOrder> => {
    return apiPost<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${id}/dissolve-group`, {})
  },

  addMember: (groupId: number, memberId: number): Promise<DesignWorkOrder> => {
    return apiPost<DesignWorkOrder>(`${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${groupId}/members`, {
      memberId,
    })
  },

  removeMember: (groupId: number, memberId: number): Promise<DesignWorkOrder> => {
    return apiDelete<DesignWorkOrder>(
      `${API_CONFIG.CRM.DESIGN_WORK_ORDERS}/${groupId}/members/${memberId}`,
    )
  },
}

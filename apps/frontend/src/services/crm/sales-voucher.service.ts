import { apiGet, apiPost, apiDelete } from '../api'
import { API_CONFIG } from '../../config/api'
import { PaginatedResponse } from '../../types/pagination'

export interface SalesVoucher {
  id: string
  orderId?: string | null
  staffId: string
  customerId: string
  shippingMethod: string
  paymentMethod: string
  notes?: string
  amount: number
  tax: number
  staff?: { id: string; name?: string }
  customer?: { id: string; companyName?: string; companyShortName?: string }
  order?: { id: string }
  salesVoucherItems?: SalesVoucherItem[]
  createdAt?: string
  updatedAt?: string
}

export interface SalesVoucherItem {
  id: number
  salesVoucherId: string
  cadFile?: string
  customerFile?: string
  material?: string
  thickness?: number
  quantity: number
  substitute?: string
  source: string
  processingIds?: number[]
  unitPrice: number
  estimatedCuttingTime?: number
  drawingNumber?: string
  nestingId?: number | null
  status: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateSalesVoucherPayload {
  sourceOrderId?: string
  staffId?: string
  customerId?: string
  shippingMethod?: string
  paymentMethod?: string
  notes?: string
  tax?: number
  orderId?: string | null
  items?: Array<{
    cadFile?: string
    customerFile?: string
    material?: string
    thickness?: number
    quantity?: number
    substitute?: string
    source: string
    processingIds?: number[]
    unitPrice?: number
    estimatedCuttingTime?: number
    drawingNumber?: string
    nestingId?: number | null
    status?: string
    notes?: string
  }>
}

export const salesVoucherService = {
  getAll: (
    page?: number,
    limit?: number,
  ): Promise<SalesVoucher[] | PaginatedResponse<SalesVoucher>> => {
    const params: Record<string, any> = {}
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<SalesVoucher[] | PaginatedResponse<SalesVoucher>>(
      API_CONFIG.CRM.SALES_VOUCHERS,
      params,
    )
  },

  getById: (id: string): Promise<SalesVoucher> => {
    return apiGet<SalesVoucher>(`${API_CONFIG.CRM.SALES_VOUCHERS}/${id}`)
  },

  create: (data: CreateSalesVoucherPayload): Promise<SalesVoucher> => {
    return apiPost<SalesVoucher>(API_CONFIG.CRM.SALES_VOUCHERS, data)
  },

  update: (id: string, data: Partial<SalesVoucher>): Promise<SalesVoucher> => {
    return apiPost<SalesVoucher>(`${API_CONFIG.CRM.SALES_VOUCHERS}/${id}`, data)
  },

  delete: (id: string): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.SALES_VOUCHERS}/${id}`)
  },
}

export const salesVoucherItemService = {
  getAll: (
    salesVoucherId?: string,
    page?: number,
    limit?: number,
  ): Promise<SalesVoucherItem[] | PaginatedResponse<SalesVoucherItem>> => {
    const params: Record<string, any> = {}
    if (salesVoucherId) params.salesVoucherId = salesVoucherId
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit
    return apiGet<SalesVoucherItem[] | PaginatedResponse<SalesVoucherItem>>(
      API_CONFIG.CRM.SALES_VOUCHER_ITEMS,
      params,
    )
  },

  getById: (id: number): Promise<SalesVoucherItem> => {
    return apiGet<SalesVoucherItem>(`${API_CONFIG.CRM.SALES_VOUCHER_ITEMS}/${id}`)
  },

  create: (data: Partial<SalesVoucherItem>): Promise<SalesVoucherItem> => {
    return apiPost<SalesVoucherItem>(API_CONFIG.CRM.SALES_VOUCHER_ITEMS, data)
  },

  update: (id: number, data: Partial<SalesVoucherItem>): Promise<SalesVoucherItem> => {
    return apiPost<SalesVoucherItem>(
      `${API_CONFIG.CRM.SALES_VOUCHER_ITEMS}/${id}`,
      data,
    )
  },

  delete: (id: number): Promise<void> => {
    return apiDelete<void>(`${API_CONFIG.CRM.SALES_VOUCHER_ITEMS}/${id}`)
  },
}

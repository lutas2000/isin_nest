import { apiGet } from './api'
import type { PaginatedResponse } from '@/types/pagination'

// These screens filter locally, so read every page rather than only the first 50 rows.
export async function getHrList<T>(endpoint: string): Promise<T[]> {
  const rows: T[] = []
  let page = 1
  while (true) {
    const result = await apiGet<T[] | PaginatedResponse<T>>(endpoint, { page, limit: 100 })
    if (Array.isArray(result)) return result
    if (!Array.isArray(result.data) || !Number.isFinite(result.totalPages)) {
      throw new Error('資料格式不正確，請重新載入')
    }
    rows.push(...result.data)
    if (page >= result.totalPages) return rows
    page += 1
  }
}

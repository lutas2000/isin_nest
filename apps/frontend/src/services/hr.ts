import { apiDelete, apiGet, apiPost, apiPut } from './api'
import { API_CONFIG } from '../config/api'
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

// ---------------------------------------------------------------------------
// 請假登錄（/staff-leaves）。時間一律是台北牆上時間字串 `YYYY-MM-DD HH:mm`。
// ---------------------------------------------------------------------------
export interface StaffLeave {
  id: number
  name: string
  type: string
  /** ISO 字串（timestamptz） */
  start_time: string
  end_time: string
  time: number
  verify: string
}

export interface LeaveBalance {
  name: string
  annualLeave: { periodStart: string; periodEnd: string; usedHours: number }
  sickLeave: { year: number; usedHours: number }
}

export interface LeaveDefaults {
  name: string
  date: string
  start_time: string
  end_time: string
  segment: { id: number; begain_time: string; end_time: string; cross_day: number } | null
}

export interface CreateLeaveInput {
  name: string
  type: string
  start_time: string
  end_time: string
}

export const getLeaveTypes = () => apiGet<string[]>(`${API_CONFIG.HR.STAFF_LEAVE}/types`)

export const getLeavesInRange = (start: string, end: string, name?: string) =>
  apiGet<StaffLeave[]>(`${API_CONFIG.HR.STAFF_LEAVE}/range`, { start, end, name })

export const getLeaveBalance = (name: string, date?: string) =>
  apiGet<LeaveBalance>(`${API_CONFIG.HR.STAFF_LEAVE}/balance`, { name, date })

export const getLeaveDefaults = (name: string, date: string) =>
  apiGet<LeaveDefaults>(`${API_CONFIG.HR.STAFF_LEAVE}/defaults`, { name, date })

export const createLeave = (input: CreateLeaveInput) =>
  apiPost<StaffLeave[]>(API_CONFIG.HR.STAFF_LEAVE, input)

export const deleteLeave = (id: number) =>
  apiDelete<{ message: string }>(`${API_CONFIG.HR.STAFF_LEAVE}/${id}`)

// ---------------------------------------------------------------------------
// 外帳工時（/staff-manhours2）
// ---------------------------------------------------------------------------
export interface StaffManhour2 {
  id: number
  name: string
  start_time: string | null
  end_time: string | null
  work_time: number
}

export interface CopyManhourResult {
  copied: number
  skipped: number
  rows: StaffManhour2[]
}

export const getManhour2 = (name: string, from: string, to: string) =>
  apiGet<StaffManhour2[]>(API_CONFIG.HR.STAFF_MANHOUR2, { name, from, to })

export const createManhour2 = (input: { name: string; start_time: string; end_time?: string }) =>
  apiPost<StaffManhour2>(API_CONFIG.HR.STAFF_MANHOUR2, input)

export const updateManhour2 = (id: number, input: { start_time?: string; end_time?: string | null }) =>
  apiPut<StaffManhour2>(`${API_CONFIG.HR.STAFF_MANHOUR2}/${id}`, input)

export const deleteManhour2 = (id: number) =>
  apiDelete<{ message: string }>(`${API_CONFIG.HR.STAFF_MANHOUR2}/${id}`)

export const copyManhourToFake = (name: string, from: string, to: string) =>
  apiPost<CopyManhourResult>(`${API_CONFIG.HR.STAFF_MANHOUR2}/copy-from-manhour`, { name, from, to })

// ---------------------------------------------------------------------------
// 台北牆上時間工具：後端回 ISO，畫面與輸入都用 `YYYY-MM-DD HH:mm`
// ---------------------------------------------------------------------------
const taipeiFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Taipei',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

/** ISO 或 Date → `YYYY-MM-DD HH:mm`（台北） */
export const toTaipeiMinute = (value: string | Date | null | undefined): string => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return taipeiFormatter.format(date).replace('T', ' ')
}

/** `YYYY-MM-DD HH:mm[:ss]` ↔ `<input type="datetime-local">` 的 `YYYY-MM-DDTHH:mm` */
export const toDatetimeLocal = (wallClock: string): string => wallClock.slice(0, 16).replace(' ', 'T')
export const fromDatetimeLocal = (local: string): string => local.replace('T', ' ')

export const todayTaipei = (): string => toTaipeiMinute(new Date()).slice(0, 10)

export const monthRange = (yearMonth: string): { start: string; end: string } => {
  const [year, month] = yearMonth.split('-').map(Number)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: `${yearMonth}-01`, end: `${yearMonth}-${String(last).padStart(2, '0')}` }
}

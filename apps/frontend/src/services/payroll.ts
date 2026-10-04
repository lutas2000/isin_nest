import { apiDownload, apiGet, apiPatch, apiPost, saveDownloadedFile } from './api'
import { API_CONFIG } from '../config/api'

// ---------------------------------------------------------------------------
// 型別：對應後端 hr/payroll 的 domain/types 與 snapshot entity
// ---------------------------------------------------------------------------
export type PayrollVariant = 'official' | 'foreign' | 'fake'
export type PayrollRunStatus = 'draft' | 'final'
export type VacationType = 'normal' | 'paid' | 'unpaid'

export interface ManualWageFields {
  bonus: number
  annualLeaveAdd: number
  annualLeaveDeduct: number
  advance: number
  otherDeduction: number
  taxWithheld: number
}

export type ManualWageMap = Record<string, Partial<ManualWageFields>>

export interface WageItems extends ManualWageFields {
  name: string
  baseSalary: number
  allowance: number
  overtimePay: number
  fullAttendance: number
  organizer: number
  nightAllowance: number
  mealAllowance: number
  additionTotal: number
  sickLeave: number
  personalLeave: number
  absenteeism: number
  officialHoliday: number
  unpaidLeave: number
  healthInsurance: number
  laborInsurance: number
  welfareFund: number
  deductionTotal: number
  pension: number
  netPay: number
}

export type WageKey = Exclude<keyof WageItems, 'name'>
export type ManualKey = keyof ManualWageFields

export interface OvertimeBuckets {
  paidHolidayWithin8: number
  paidHolidayOver8: number
  weekdayWithin2: number
  weekdayOver2: number
}

export interface StaffMonthSummary {
  name: string
  workHours: number
  overtimeHours: number
  leaveHours: number
  lateCount: number
  overtime: OvertimeBuckets
  leaveByType: Record<string, number>
  paidHolidayWorkedDays: number
  workedDays: number
}

export interface DayResult {
  name: string
  date: string
  vacationType: VacationType
  segmentsText: string
  work: number
  overtime: number
  leaveType: string
  leaveHours: number
  late: boolean
  weekdayFlag: 0 | 1
}

export interface PayrollPreviewDepartment {
  department: string
  hourSheetNames: string[]
  wageSheetNames: string[]
  days: DayResult[]
  summaries: StaffMonthSummary[]
  wages: WageItems[]
}

export interface PayrollPreview {
  period: { start: string; end: string }
  variant: PayrollVariant
  source: 'mariadb' | 'postgres'
  departments: PayrollPreviewDepartment[]
  warnings: string[]
}

export interface PayrollRun {
  id: number
  periodStart: string
  periodEnd: string
  variant: PayrollVariant
  department: string
  source: 'mariadb' | 'postgres'
  status: PayrollRunStatus
  warningsJson: string[]
  filePath: string | null
  fileSha256: string | null
  createdBy: number | null
  finalizedBy: number | null
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollRunStaff extends WageItems {
  id: number
  runId: number
  staffId: string
  isForeign: boolean
  needCheck: boolean
  wageOrder: number
  hourOrder: number | null
  workHours: number
  overtimeHours: number
  leaveHours: number
  lateCount: number
  paidHolidayWorkedDays: number
  workedDays: number
  overtimeJson: OvertimeBuckets
  leaveByTypeJson: Record<string, number>
  manualJson: Partial<ManualWageFields>
}

export interface PayrollRunDay extends DayResult {
  id: number
  runId: number
}

export interface PayrollRunDetail extends PayrollRun {
  staff: PayrollRunStaff[]
  days: PayrollRunDay[]
}

export interface PayrollPeriodInput {
  start: string
  end: string
  variant: PayrollVariant
  departments?: string[]
  manual?: ManualWageMap
}

export interface PayrollRunQuery {
  start?: string
  variant?: PayrollVariant
  department?: string
  status?: PayrollRunStatus
  limit?: number
}

// ---------------------------------------------------------------------------
// 常數：與後端 domain/payroll.ts、excel/payroll-workbook.builder.ts 一致
// ---------------------------------------------------------------------------
export const PAYROLL_FEATURE = 'hr-payroll'

export const VARIANT_LABELS: Record<PayrollVariant, string> = {
  official: '正式',
  foreign: '外勞',
  fake: '外帳',
}

export const STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: '草稿',
  final: '定稿',
}

export const VACATION_LABELS: Record<VacationType, string> = {
  normal: '平日',
  paid: '有薪假',
  unpaid: '無薪假',
}

export const DEFAULT_DEPARTMENTS: Record<PayrollVariant, string[]> = {
  official: ['銷管部', '生產部'],
  foreign: ['銷管部', '生產部'],
  fake: ['銷管部', '生產部', '打工'],
}

export const MANUAL_KEYS: ManualKey[] = [
  'bonus',
  'annualLeaveAdd',
  'annualLeaveDeduct',
  'advance',
  'otherDeduction',
  'taxWithheld',
]

export interface WageColumn {
  key: WageKey
  label: string
  /** 加項 / 減項 / 合計 / 其他，用於表頭分組與底色 */
  group: 'add' | 'deduct' | 'total' | 'other'
  manual?: boolean
}

/** 薪資表欄位順序，沿用舊報表（builder 的 wageRows）。 */
export const wageColumns = (variant: PayrollVariant): WageColumn[] => [
  { key: 'baseSalary', label: '本薪', group: 'add' },
  { key: 'allowance', label: '勤務津貼', group: 'add' },
  { key: 'overtimePay', label: '加班費', group: 'add' },
  { key: 'fullAttendance', label: '全勤獎', group: 'add' },
  { key: 'bonus', label: '獎金', group: 'add', manual: true },
  { key: 'annualLeaveAdd', label: '特休加', group: 'add', manual: true },
  { key: 'organizer', label: '幹部加給', group: 'add' },
  { key: 'nightAllowance', label: '夜班津貼', group: 'add' },
  { key: 'mealAllowance', label: '伙食津貼', group: 'add' },
  { key: 'additionTotal', label: '加項合計', group: 'total' },
  { key: 'sickLeave', label: '病假', group: 'deduct' },
  { key: 'personalLeave', label: '事假', group: 'deduct' },
  { key: 'absenteeism', label: '曠職', group: 'deduct' },
  { key: 'officialHoliday', label: '公休', group: 'deduct' },
  ...(variant === 'fake' ? [] : [{ key: 'annualLeaveDeduct', label: '特休減', group: 'deduct', manual: true } as WageColumn]),
  { key: 'unpaidLeave', label: '無薪假', group: 'deduct' },
  { key: 'healthInsurance', label: '健保費', group: 'deduct' },
  { key: 'laborInsurance', label: '勞保費', group: 'deduct' },
  { key: 'welfareFund', label: '福利基金', group: 'deduct' },
  { key: 'advance', label: '借支', group: 'deduct', manual: true },
  ...(variant === 'official' ? [] : [{ key: 'taxWithheld', label: '稅金代扣', group: 'deduct', manual: true } as WageColumn]),
  { key: 'otherDeduction', label: '其他代扣', group: 'deduct', manual: true },
  { key: 'deductionTotal', label: '減項合計', group: 'total' },
  { key: 'pension', label: '退休提撥', group: 'other' },
  { key: 'netPay', label: '實領', group: 'total' },
]

/**
 * 以新的手動欄位重算加項合計、減項合計與實領。
 * 公式與後端 domain/wage-items.ts 相同：手動欄位只以加法進入合計，
 * 正式版沒有稅金代扣、外帳版沒有特休減。
 */
export const applyManual = <T extends WageItems>(wage: T, manual: Partial<ManualWageFields>, variant: PayrollVariant): T => {
  const next: T = { ...wage }
  for (const key of MANUAL_KEYS) {
    if (manual[key] !== undefined) next[key] = manual[key] as T[typeof key]
  }
  if (variant === 'official') next.taxWithheld = 0
  if (variant === 'fake') next.annualLeaveDeduct = 0
  next.additionTotal =
    next.baseSalary + next.allowance + next.overtimePay + next.fullAttendance + next.bonus +
    next.annualLeaveAdd + next.organizer + next.nightAllowance + next.mealAllowance
  next.deductionTotal =
    next.sickLeave + next.personalLeave + next.absenteeism + next.officialHoliday + next.annualLeaveDeduct +
    next.unpaidLeave + next.healthInsurance + next.laborInsurance + next.welfareFund + next.advance +
    next.taxWithheld + next.otherDeduction
  next.netPay = next.additionTotal - next.deductionTotal
  return next
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export const previewPayroll = (input: PayrollPeriodInput) =>
  apiPost<PayrollPreview>(`${API_CONFIG.HR.PAYROLL}/preview`, input)

export const createPayrollRuns = (input: PayrollPeriodInput) =>
  apiPost<{ runs: PayrollRun[]; warnings: string[] }>(`${API_CONFIG.HR.PAYROLL}/runs`, input)

export const getPayrollRuns = (query: PayrollRunQuery) =>
  apiGet<PayrollRun[]>(`${API_CONFIG.HR.PAYROLL}/runs`, query)

export const getPayrollRun = (id: number) =>
  apiGet<PayrollRunDetail>(`${API_CONFIG.HR.PAYROLL}/runs/${id}`)

export const updatePayrollManual = (id: number, manual: ManualWageMap) =>
  apiPatch<PayrollRunDetail>(`${API_CONFIG.HR.PAYROLL}/runs/${id}/manual`, { manual })

export const finalizePayrollRun = (id: number) =>
  apiPost<PayrollRun>(`${API_CONFIG.HR.PAYROLL}/runs/${id}/finalize`)

export const downloadPayrollRunFile = async (id: number): Promise<void> => {
  const file = await apiDownload(`${API_CONFIG.HR.PAYROLL}/runs/${id}/file`, `payroll-run${id}.xlsx`)
  saveDownloadedFile(file)
}

// ---------------------------------------------------------------------------
// 顯示工具
// ---------------------------------------------------------------------------
export const formatMoney = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : Math.round(value).toLocaleString('zh-Hant-TW')

export const rocPeriodLabel = (start: string): string => {
  const [year, month] = start.split('-').map(Number)
  return `${year - 1911}年${month}月`
}

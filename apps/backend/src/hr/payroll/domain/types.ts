/**
 * 薪資計算純函式的輸入與輸出型別。
 *
 * 所有時間一律是台北牆上時間字串：日期 `YYYY-MM-DD`、時間 `HH:mm:ss`、
 * 日期時間 `YYYY-MM-DD HH:mm:ss`。純函式不處理時區，也不碰資料庫。
 */

export type PayrollVariant = 'official' | 'foreign' | 'fake';

export interface StaffRow {
  id: string;
  name: string;
  department: string | null;
  wage: number;
  allowance: number;
  organizer: number;
  labor_insurance: number;
  health_insurance: number;
  pension: number;
  is_foreign: boolean;
  benifit: boolean;
  need_check: boolean;
  have_fake: boolean;
  begain_work: string;
  stop_work: string | null;
}

export interface SegmentRow {
  id: number;
  name: string;
  begain_time: string;
  end_time: string;
  cross_day: boolean;
  duty: boolean;
  night_work: boolean;
  rest_time: number;
  rest_time2: number;
  create_date: string;
}

export interface ManhourRow {
  name: string;
  start_time: string;
  end_time: string | null;
}

export interface LeaveRow {
  name: string;
  type: string;
  start_time: string;
  end_time: string;
}

export interface PayrollPeriod {
  start: string;
  end: string;
}

export interface PayrollSourceData {
  period: PayrollPeriod;
  variant: PayrollVariant;
  staff: StaffRow[];
  segments: SegmentRow[];
  /** 依 variant 已選好來源（正式讀 staff_manhour，外帳的 have_fake 員工讀 staff_manhour2）。 */
  manhours: ManhourRow[];
  leaves: LeaveRow[];
  /** 日期 → 1 有薪假、0 無薪假；缺的日期是平日。 */
  vacations: Record<string, 0 | 1>;
}

/** 對應 Java HourPage.NORMAL / HAVE_WAGE / NO_WAGE */
export type VacationType = 'normal' | 'paid' | 'unpaid';

export interface DayResult {
  name: string;
  date: string;
  vacationType: VacationType;
  /** 打卡記錄表「打卡時段」欄的字串，例如 `08:00~17:00 ` */
  segmentsText: string;
  work: number;
  overtime: number;
  leaveType: string;
  leaveHours: number;
  late: 0 | 1;
  /** 打卡記錄表隱藏欄：平日 1、有薪假 0。無薪假視為平日。 */
  weekdayFlag: 0 | 1;
}

export interface OvertimeBuckets {
  /** 有薪假 ≤ 8 小時部分，倍率 1 */
  paidHolidayWithin8: number;
  /** 有薪假 > 8 小時部分，倍率 1.33 */
  paidHolidayOver8: number;
  /** 平日 ≤ 2 小時部分，倍率 1.33 */
  weekdayWithin2: number;
  /** 平日 > 2 小時部分，倍率 1.66 */
  weekdayOver2: number;
}

export interface StaffMonthSummary {
  name: string;
  workHours: number;
  overtimeHours: number;
  leaveHours: number;
  lateCount: number;
  overtime: OvertimeBuckets;
  leaveByType: Record<string, number>;
  /** 伙食津貼用：加班 ≥ 門檻的天數，門檻依外勞不同，於薪資計算時再查 */
  daysOvertimeAtLeast: (threshold: number) => number;
  /** 伙食津貼用：有薪假且有上班的天數 */
  paidHolidayWorkedDays: number;
  /** 夜班伙食津貼用：有上班的天數 */
  workedDays: number;
}

export interface ManualWageFields {
  bonus: number;
  annualLeaveAdd: number;
  annualLeaveDeduct: number;
  advance: number;
  otherDeduction: number;
  taxWithheld: number;
}

export interface WageItems {
  name: string;
  baseSalary: number;
  allowance: number;
  overtimePay: number;
  fullAttendance: number;
  bonus: number;
  annualLeaveAdd: number;
  organizer: number;
  nightAllowance: number;
  mealAllowance: number;
  additionTotal: number;
  sickLeave: number;
  personalLeave: number;
  absenteeism: number;
  officialHoliday: number;
  annualLeaveDeduct: number;
  unpaidLeave: number;
  healthInsurance: number;
  laborInsurance: number;
  welfareFund: number;
  advance: number;
  taxWithheld: number;
  otherDeduction: number;
  deductionTotal: number;
  pension: number;
  netPay: number;
}

export interface DepartmentResult {
  department: string;
  /** 打卡記錄表的員工順序 */
  hourSheetNames: string[];
  /** 薪資表的員工順序 */
  wageSheetNames: string[];
  days: DayResult[];
  summaries: StaffMonthSummary[];
  wages: WageItems[];
}

export interface PayrollResult {
  period: PayrollPeriod;
  variant: PayrollVariant;
  departments: DepartmentResult[];
  warnings: string[];
}

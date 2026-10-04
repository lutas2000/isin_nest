import { excelRound } from './rounding';
import {
  ManualWageFields,
  PayrollVariant,
  SegmentRow,
  StaffMonthSummary,
  StaffRow,
  WageItems,
} from './types';

/**
 * 單人薪資項目。移植自 Java `WageCaculate`，每個項目的公式見規劃文件 1.4 節。
 * 基數 = (本薪 + 勤務津貼) / 240。
 */

export const EMPTY_MANUAL_FIELDS: ManualWageFields = {
  bonus: 0,
  annualLeaveAdd: 0,
  annualLeaveDeduct: 0,
  advance: 0,
  otherDeduction: 0,
  taxWithheld: 0,
};

export interface WageItemsInput {
  staff: StaffRow;
  /** 夜班與責任制旗標來源：不看日期的最新段別（pickLatestSegment）。 */
  latestSegment: SegmentRow | null;
  summary: StaffMonthSummary;
  manual?: Partial<ManualWageFields>;
  variant: PayrollVariant;
}

const FULL_ATTENDANCE_RATE = 0.04;
const NIGHT_ALLOWANCE_RATE = 0.1;
const MEAL_ALLOWANCE = 50;
const WELFARE_FUND = 100;
const MONTHLY_HOURS = 240;

export function calculateWageItems(input: WageItemsInput): WageItems {
  const { staff, summary, variant } = input;
  const manual = { ...EMPTY_MANUAL_FIELDS, ...input.manual };
  const nightWork = input.latestSegment?.night_work ?? false;
  const needCheck = staff.need_check;
  const leave = (type: string) => summary.leaveByType[type] ?? 0;
  const base = (staff.wage + staff.allowance) / MONTHLY_HOURS;

  // 加班費：base × (有薪假≤8 + (有薪假>8 + 平日≤2) × 1.33 + 平日>2 × 1.66)，夜班 × 1.1
  let overtimePay = 0;
  if (needCheck) {
    const buckets = summary.overtime;
    let amount =
      base *
      (buckets.paidHolidayWithin8 +
        (buckets.paidHolidayOver8 + buckets.weekdayWithin2) * 1.33 +
        buckets.weekdayOver2 * 1.66);
    if (nightWork) amount *= 1.1;
    overtimePay = excelRound(amount);
  }

  // 全勤獎：本薪 4%，外勞不計，依請假與遲到遞減
  let fullAttendance = 0;
  if (needCheck && !staff.is_foreign) {
    const extra = staff.wage * FULL_ATTENDANCE_RATE;
    const sick = leave('病假');
    const personal = leave('事假');
    let ratio: number;
    if (leave('曠職') > 0) ratio = 0;
    else if (summary.lateCount >= 3) ratio = 0;
    else if (leave('產假') >= 16) ratio = 0;
    else if (sick >= 16) ratio = 0;
    else if (personal >= 8) ratio = 0;
    else if (sick >= 8) ratio = 0.2;
    else if (personal >= 4) ratio = 0.4;
    else if (sick >= 4) ratio = 0.4;
    else if (sick > 0) ratio = 0.7;
    else if (personal > 0) ratio = 0.7;
    else ratio = 1;
    fullAttendance = excelRound(ratio * extra);
  }

  // 夜班津貼：本薪 10% × (1 − 全部請假時數 / 720)
  let nightAllowance = 0;
  if (needCheck && nightWork) {
    const totalLeave = Object.values(summary.leaveByType).reduce((sum, hours) => sum + hours, 0);
    nightAllowance = excelRound(staff.wage * NIGHT_ALLOWANCE_RATE * (1 - totalLeave / 720));
  }

  // 伙食津貼
  let mealAllowance = 0;
  if (needCheck) {
    if (nightWork) {
      mealAllowance = excelRound(MEAL_ALLOWANCE * summary.workedDays);
    } else {
      const threshold = staff.is_foreign ? 6 : 3;
      mealAllowance = excelRound(
        MEAL_ALLOWANCE * (summary.daysOvertimeAtLeast(threshold) + summary.paidHolidayWorkedDays),
      );
    }
  }

  const deduct = (hours: number, wageRate: number, allowanceRate: number) =>
    needCheck
      ? excelRound((hours * (staff.wage * wageRate + staff.allowance * allowanceRate)) / MONTHLY_HOURS)
      : 0;

  const sickLeave = deduct(leave('病假'), 0.5, 0.5);
  const personalLeave = deduct(leave('事假'), 1, 1);
  const absenteeism = deduct(leave('曠職'), 1, 1);
  const officialHoliday = deduct(leave('公休'), 1, 0);
  const unpaidLeave = deduct(leave('無薪假'), 1, 1);
  const welfareFund = staff.benifit ? 0 : WELFARE_FUND;
  const taxWithheld = variant === 'official' ? 0 : manual.taxWithheld;

  const additionTotal =
    staff.wage +
    staff.allowance +
    overtimePay +
    fullAttendance +
    manual.bonus +
    manual.annualLeaveAdd +
    staff.organizer +
    nightAllowance +
    mealAllowance;

  // 減項合計不含退休提撥；外帳版沒有特休減列
  const deductionTotal =
    sickLeave +
    personalLeave +
    absenteeism +
    officialHoliday +
    (variant === 'fake' ? 0 : manual.annualLeaveDeduct) +
    unpaidLeave +
    staff.health_insurance +
    staff.labor_insurance +
    welfareFund +
    manual.advance +
    taxWithheld +
    manual.otherDeduction;

  return {
    name: staff.name,
    baseSalary: staff.wage,
    allowance: staff.allowance,
    overtimePay,
    fullAttendance,
    bonus: manual.bonus,
    annualLeaveAdd: manual.annualLeaveAdd,
    organizer: staff.organizer,
    nightAllowance,
    mealAllowance,
    additionTotal,
    sickLeave,
    personalLeave,
    absenteeism,
    officialHoliday,
    annualLeaveDeduct: variant === 'fake' ? 0 : manual.annualLeaveDeduct,
    unpaidLeave,
    healthInsurance: staff.health_insurance,
    laborInsurance: staff.labor_insurance,
    welfareFund,
    advance: manual.advance,
    taxWithheld,
    otherDeduction: manual.otherDeduction,
    deductionTotal,
    pension: staff.pension,
    netPay: additionTotal - deductionTotal,
  };
}

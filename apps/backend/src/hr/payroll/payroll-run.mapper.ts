import { DepartmentResult, PayrollSourceData, StaffMonthSummary, WageItems } from './domain/types';
import { PayrollRunDay } from './entities/payroll-run-day.entity';
import { PayrollRunStaff } from './entities/payroll-run-staff.entity';
import { ManualWageMap } from './dto/payroll.dto';

/** API 回傳的月彙總：StaffMonthSummary 去掉函式欄位。 */
export type StaffMonthSummaryView = Omit<StaffMonthSummary, 'daysOvertimeAtLeast'>;

export function toSummaryView(summary: StaffMonthSummary): StaffMonthSummaryView {
  const { daysOvertimeAtLeast: _omit, ...rest } = summary;
  return rest;
}

const WAGE_KEYS: Array<keyof Omit<WageItems, 'name'>> = [
  'baseSalary', 'allowance', 'overtimePay', 'fullAttendance', 'bonus', 'annualLeaveAdd',
  'organizer', 'nightAllowance', 'mealAllowance', 'additionTotal', 'sickLeave', 'personalLeave',
  'absenteeism', 'officialHoliday', 'annualLeaveDeduct', 'unpaidLeave', 'healthInsurance',
  'laborInsurance', 'welfareFund', 'advance', 'taxWithheld', 'otherDeduction', 'deductionTotal',
  'pension', 'netPay',
];

/** 把一個部門的計算結果展開成 payroll_run_staff 列（不含 run_id）。 */
export function toRunStaffRows(
  input: PayrollSourceData,
  result: DepartmentResult,
  manual: ManualWageMap,
): Partial<PayrollRunStaff>[] {
  const staffByName = new Map(input.staff.map((row) => [row.name, row]));
  return result.wageSheetNames.map((name, wageOrder) => {
    const staff = staffByName.get(name);
    if (!staff) throw new Error(`計算結果包含不在輸入內的員工 ${name}`);
    const summary = result.summaries[wageOrder];
    const wage = result.wages[wageOrder];
    const hourOrder = result.hourSheetNames.indexOf(name);
    const row: Partial<PayrollRunStaff> = {
      staffId: staff.id,
      name,
      isForeign: staff.is_foreign,
      needCheck: staff.need_check,
      wageOrder,
      hourOrder: hourOrder >= 0 ? hourOrder : null,
      workHours: summary.workHours,
      overtimeHours: summary.overtimeHours,
      leaveHours: summary.leaveHours,
      lateCount: summary.lateCount,
      paidHolidayWorkedDays: summary.paidHolidayWorkedDays,
      workedDays: summary.workedDays,
      overtimeJson: summary.overtime,
      leaveByTypeJson: summary.leaveByType,
      manualJson: manual[name] ?? {},
    };
    for (const key of WAGE_KEYS) row[key] = wage[key];
    return row;
  });
}

export function toRunDayRows(result: DepartmentResult): Partial<PayrollRunDay>[] {
  return result.days.map((day) => ({
    name: day.name,
    date: day.date,
    vacationType: day.vacationType,
    segmentsText: day.segmentsText,
    work: day.work,
    overtime: day.overtime,
    leaveType: day.leaveType,
    leaveHours: day.leaveHours,
    late: day.late,
    weekdayFlag: day.weekdayFlag,
  }));
}

import { calculateDayHours } from './day-hours';
import { REMOVED_LEAVE_TYPES } from './leave-types';
import { summarizeStaffMonth } from './month-summary';
import { pickDaySegment, pickLatestSegment, pickOldestSegment } from './segment';
import {
  DayResult,
  DepartmentResult,
  LeaveRow,
  ManhourRow,
  ManualWageFields,
  PayrollResult,
  PayrollSourceData,
  StaffMonthSummary,
  StaffRow,
  VacationType,
  WageItems,
} from './types';
import { calculateWageItems } from './wage-items';
import { addDays, dateToMs, eachDay, toMs } from './wall-clock';

/**
 * 整月薪資計算入口。對應 Java `Report.exportMonth` / `exportFake`：
 * 每個部門各算一份打卡記錄與薪資表。
 */

export interface PayrollOptions {
  /** 要輸出的部門；未提供時依 variant 使用舊報表的預設部門。 */
  departments?: string[];
  /** 每人手動欄位，以姓名為鍵。 */
  manual?: Record<string, Partial<ManualWageFields>>;
}

export const DEFAULT_DEPARTMENTS: Record<PayrollSourceData['variant'], string[]> = {
  official: ['銷管部', '生產部'],
  foreign: ['銷管部', '生產部'],
  fake: ['銷管部', '生產部', '打工'],
};

/** 在職判斷（2026-10-04 決議）：`stop_work` 為空或不早於期間起日。 */
export function isEmployedInPeriod(staff: StaffRow, periodStart: string): boolean {
  return !staff.stop_work || staff.stop_work >= periodStart;
}

/** 當日是否已到職且尚未離職（Java isWork 只看 begain_work，離職日依決議加入）。 */
function isWorkingOn(staff: StaffRow, date: string): boolean {
  if (staff.begain_work > date) return false;
  if (staff.stop_work && staff.stop_work < date) return false;
  return true;
}

function compareStaff(a: StaffRow, b: StaffRow, needCheckFirst: boolean): number {
  if (needCheckFirst && a.need_check !== b.need_check) return a.need_check ? -1 : 1;
  if (a.is_foreign !== b.is_foreign) return a.is_foreign ? 1 : -1;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** 舊 SQL 用 `BETWEEN 當日 AND 翌日`，兩端皆含。 */
function withinDay(value: string, date: string): boolean {
  const ms = toMs(value);
  return ms >= dateToMs(date) && ms <= dateToMs(addDays(date, 1));
}

function vacationTypeOf(data: PayrollSourceData, date: string): VacationType {
  const pay = data.vacations[date];
  if (pay === undefined) return 'normal';
  return pay ? 'paid' : 'unpaid';
}

function byStartTime<T extends { start_time: string }>(a: T, b: T): number {
  return a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : 0;
}

export function calculatePayroll(
  data: PayrollSourceData,
  options: PayrollOptions = {},
): PayrollResult {
  const warnings: string[] = [];
  const dates = eachDay(data.period.start, data.period.end);
  const departments = options.departments ?? DEFAULT_DEPARTMENTS[data.variant];

  const leaves: LeaveRow[] = data.leaves.map((leave) => {
    const replacement = REMOVED_LEAVE_TYPES[leave.type];
    if (!replacement) return leave;
    warnings.push(`${leave.name} ${leave.start_time} 假別「${leave.type}」已移除，改以「${replacement}」計算`);
    return { ...leave, type: replacement };
  });

  const manhoursByName = new Map<string, ManhourRow[]>();
  for (const row of [...data.manhours].sort(byStartTime)) {
    const list = manhoursByName.get(row.name) ?? [];
    list.push(row);
    manhoursByName.set(row.name, list);
  }
  const leavesByName = new Map<string, LeaveRow[]>();
  for (const row of [...leaves].sort(byStartTime)) {
    const list = leavesByName.get(row.name) ?? [];
    list.push(row);
    leavesByName.set(row.name, list);
  }

  const employed = data.staff.filter((staff) => isEmployedInPeriod(staff, data.period.start));

  const results: DepartmentResult[] = departments.map((department) => {
    const members = employed.filter((staff) => staff.department === department);
    const hourSheetStaff = members
      .filter((staff) => staff.need_check)
      .sort((a, b) => compareStaff(a, b, false));
    const wageSheetStaff = [...members].sort((a, b) => compareStaff(a, b, true));

    const days: DayResult[] = [];
    for (const date of dates) {
      const vacationType = vacationTypeOf(data, date);
      for (const staff of hourSheetStaff) {
        if (!isWorkingOn(staff, date)) continue;
        const segment = pickDaySegment(data.segments, staff.name, date);
        if (!segment) {
          warnings.push(`${staff.name} ${date} 找不到段別設定，當日未計算`);
          continue;
        }
        const output = calculateDayHours({
          name: staff.name,
          date,
          vacationType,
          segment,
          oldestSegmentDuty: pickOldestSegment(data.segments, staff.name)?.duty ?? false,
          isForeign: staff.is_foreign,
          manhours: (manhoursByName.get(staff.name) ?? []).filter((row) => withinDay(row.start_time, date)),
          leaves: (leavesByName.get(staff.name) ?? []).filter((row) => withinDay(row.start_time, date)),
        });
        warnings.push(...output.warnings);
        days.push(output.result);
      }
    }

    const summaries: StaffMonthSummary[] = wageSheetStaff.map((staff) =>
      summarizeStaffMonth(staff.name, days),
    );
    const wages: WageItems[] = wageSheetStaff.map((staff, index) =>
      calculateWageItems({
        staff,
        latestSegment: pickLatestSegment(data.segments, staff.name),
        summary: summaries[index],
        manual: options.manual?.[staff.name],
        variant: data.variant,
      }),
    );

    return {
      department,
      hourSheetNames: hourSheetStaff.map((staff) => staff.name),
      wageSheetNames: wageSheetStaff.map((staff) => staff.name),
      days,
      summaries,
      wages,
    };
  });

  return { period: data.period, variant: data.variant, departments: results, warnings };
}

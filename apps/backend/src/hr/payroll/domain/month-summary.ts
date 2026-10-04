import { LEAVE_TYPES } from './leave-types';
import { DayResult, OvertimeBuckets, StaffMonthSummary } from './types';

/**
 * 單人整月彙總。移植自 Java `ManHourReport` 的 writeHourSum、writeOverTimeSum、
 * writeLeaveSum 與 `WageCaculate` 的 COUNTIF / COUNTIFS 公式。
 */
export function summarizeStaffMonth(name: string, days: DayResult[]): StaffMonthSummary {
  const rows = days.filter((day) => day.name === name);

  const overtime: OvertimeBuckets = {
    paidHolidayWithin8: 0,
    paidHolidayOver8: 0,
    weekdayWithin2: 0,
    weekdayOver2: 0,
  };
  const leaveByType: Record<string, number> = {};
  for (const type of LEAVE_TYPES) leaveByType[type] = 0;

  let workHours = 0;
  let overtimeHours = 0;
  let leaveHours = 0;
  let lateCount = 0;
  let paidHolidayWorkedDays = 0;
  let workedDays = 0;

  for (const day of rows) {
    workHours += day.work;
    overtimeHours += day.overtime;
    leaveHours += day.leaveHours;
    lateCount += day.late;
    if (day.weekdayFlag === 0) {
      // 有薪假 ≤8 (x1)：SUMIFS(加班, 平日=0, 加班<=8) + COUNTIFS(平日=0, 加班>8) * 8
      const within = Math.min(day.overtime, 8);
      overtime.paidHolidayWithin8 += within;
      overtime.paidHolidayOver8 += day.overtime - within;
      if (day.work > 0) paidHolidayWorkedDays++;
    } else {
      const within = Math.min(day.overtime, 2);
      overtime.weekdayWithin2 += within;
      overtime.weekdayOver2 += day.overtime - within;
    }
    if (day.work > 0) workedDays++;
    if (day.leaveType) {
      if (!(day.leaveType in leaveByType)) leaveByType[day.leaveType] = 0;
      leaveByType[day.leaveType] += day.leaveHours;
    }
  }

  return {
    name,
    workHours,
    overtimeHours,
    leaveHours,
    lateCount,
    overtime,
    leaveByType,
    daysOvertimeAtLeast: (threshold) =>
      rows.filter((day) => day.overtime >= threshold).length,
    paidHolidayWorkedDays,
    workedDays,
  };
}

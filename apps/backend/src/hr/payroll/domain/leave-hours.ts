import { halfHourFloorHours } from './rounding';
import { SegmentRow } from './types';
import { addDays, addMinutes, dateToMs, toMs, withTime } from './wall-clock';

/**
 * 請假登錄用的時數與跨日拆單。移植自 Java `Dialog_Leave`：
 * 時數 = 30 分鐘捨去 − 休息扣除（規則同 HourPage.subtractRest），登錄時不封頂 8 小時；
 * 跨日請假拆成每天一筆，每筆沿用同一個時段。
 * 時間一律是台北牆上時間字串 `YYYY-MM-DD HH:mm:ss`。
 */

export interface LeaveSpan {
  start_time: string;
  end_time: string;
}

export interface LeaveHoursSegment {
  rest_time: number;
  rest_time2: number;
}

export function calculateLeaveHours(
  startTime: string,
  endTime: string,
  segment: LeaveHoursSegment,
): number {
  const startMs = toMs(startTime);
  const endMs = toMs(endTime);
  if (endMs <= startMs) return 0;
  const noon = withTime(startMs, 12, 0);
  const evening = withTime(startMs, 18, 0);
  let rest = 0;
  if (startMs <= noon && endMs >= addMinutes(noon, segment.rest_time)) rest += segment.rest_time / 60;
  if (startMs <= evening && endMs >= addMinutes(evening, segment.rest_time2)) rest += segment.rest_time2 / 60;
  return Math.max(halfHourFloorHours(startMs, endMs) - rest, 0);
}

/** 跨日請假拆成每天一筆；同一天則原樣回傳。 */
export function splitLeaveByDay(startTime: string, endTime: string): LeaveSpan[] {
  const startDate = startTime.slice(0, 10);
  const endDate = endTime.slice(0, 10);
  const startClock = startTime.slice(11);
  const endClock = endTime.slice(11);
  if (startDate === endDate) return [{ start_time: startTime, end_time: endTime }];
  const spans: LeaveSpan[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    spans.push({ start_time: `${date} ${startClock}`, end_time: `${date} ${endClock}` });
  }
  return spans;
}

/** 到職日週年區間（特休計算期間）：含 `date` 的那一年。 */
export function anniversaryPeriod(begainWork: string, date: string): { start: string; end: string } {
  const workYear = Number(begainWork.slice(0, 4));
  const monthDay = begainWork.slice(5);
  let year = Number(date.slice(0, 4));
  if (date.slice(5) < monthDay) year -= 1;
  if (year < workYear) year = workYear;
  const start = `${year}-${monthDay}`;
  const end = addDays(`${year + 1}-${monthDay}`, -1);
  return { start: clampDate(start), end: clampDate(end) };
}

/** 2/29 到職在平年落到 2/28。 */
function clampDate(date: string): string {
  const ms = dateToMs(date);
  return Number.isNaN(ms) ? `${date.slice(0, 4)}-02-28` : new Date(ms).toISOString().slice(0, 10);
}

export function segmentDefaultSpan(date: string, segment: Pick<SegmentRow, 'begain_time' | 'end_time' | 'cross_day'>): LeaveSpan {
  return {
    start_time: `${date} ${segment.begain_time}`,
    end_time: `${segment.cross_day ? addDays(date, 1) : date} ${segment.end_time}`,
  };
}

/**
 * 牆上時間工具。把 `YYYY-MM-DD HH:mm:ss` 當成 UTC 做算術，
 * 讓結果與執行環境時區無關，也和 Java Calendar 在台北時區的行為一致
 * （台灣無日光節約時間）。
 */

export const MINUTE_MS = 60_000;
export const HALF_HOUR_MS = 30 * MINUTE_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;

export function toMs(value: string): number {
  const match = DATE_TIME.exec(value);
  if (!match) throw new Error(`Invalid wall-clock value: ${value}`);
  const [, y, m, d, hh = '0', mm = '0', ss = '0'] = match;
  return Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss);
}

export function dateToMs(date: string, time = '00:00:00'): number {
  return toMs(`${date} ${time}`);
}

export function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

/** `HH:mm` */
export function formatMinute(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16);
}

export function addDays(date: string, days: number): string {
  return formatDate(dateToMs(date) + days * DAY_MS);
}

export function addMinutes(ms: number, minutes: number): number {
  return ms + minutes * MINUTE_MS;
}

/** 回傳 [start, end] 之間的所有日期（含兩端）。 */
export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function minuteOfDay(ms: number): number {
  return new Date(ms).getUTCMinutes();
}

export function hourOfDay(ms: number): number {
  return new Date(ms).getUTCHours();
}

/** 以當天 00:00 為基準，設定時與分（秒歸零），對應 Calendar.set(HOUR_OF_DAY/MINUTE)。 */
export function withTime(ms: number, hour: number, minute: number): number {
  const dayStart = dateToMs(formatDate(ms));
  return dayStart + hour * HOUR_MS + minute * MINUTE_MS;
}

/**
 * 對應 Java `CalendarHelper.compareTime(a, b, unit)`：(b − a) / unit 取整數，
 * 負數時朝零截斷（Java long 除法）。
 */
export function compareTime(fromMs: number, toMs_: number, unitMs: number): number {
  return Math.trunc((toMs_ - fromMs) / unitMs);
}

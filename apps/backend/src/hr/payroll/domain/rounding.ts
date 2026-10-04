import {
  HALF_HOUR_MS,
  HOUR_MS,
  compareTime,
  minuteOfDay,
  withTime,
  hourOfDay,
} from './wall-clock';

/**
 * 上班打卡修整（Java HourPage.fixStart）：
 * 分鐘 1–14 → :00；15–44 → :30；≥45 → 下一小時整點；0 分不動。秒數歸零。
 */
export function fixStart(ms: number): number {
  const minute = minuteOfDay(ms);
  const hour = hourOfDay(ms);
  if (minute > 0 && minute < 15) return withTime(ms, hour, 0);
  if (minute >= 15 && minute < 45) return withTime(ms, hour, 30);
  if (minute >= 45) return withTime(ms, hour, 0) + HOUR_MS;
  return withTime(ms, hour, 0);
}

/**
 * 下班打卡修整（Java HourPage.fixEnd）：
 * 分鐘 <20 → :00；<50 → :30；否則下一小時整點。秒數歸零。
 */
export function fixEnd(ms: number): number {
  const minute = minuteOfDay(ms);
  const hour = hourOfDay(ms);
  if (minute < 20) return withTime(ms, hour, 0);
  if (minute < 50) return withTime(ms, hour, 30);
  return withTime(ms, hour, 0) + HOUR_MS;
}

/** 以 30 分鐘為單位無條件捨去後換算成小時（Java compareTime(…, HALH_HOUR) / 2f）。 */
export function halfHourFloorHours(fromMs: number, toMs: number): number {
  return compareTime(fromMs, toMs, HALF_HOUR_MS) / 2;
}

/** Excel ROUND(x, 0)：四捨五入，半數遠離零。 */
export function excelRound(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(value) + Number.EPSILON);
}

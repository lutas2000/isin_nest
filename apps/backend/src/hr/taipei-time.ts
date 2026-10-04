/**
 * HR 資料一律以台北牆上時間輸入與顯示，資料庫欄位是 timestamptz。
 * 轉換時明確帶 +08:00，不依賴伺服器時區。
 */
const TAIPEI_OFFSET = '+08:00';

/** `YYYY-MM-DD HH:mm[:ss]` → Date */
export function taipeiWallClockToDate(value: string): Date {
  const normalized = value.length === 16 ? `${value}:00` : value;
  return new Date(`${normalized.replace(' ', 'T')}${TAIPEI_OFFSET}`);
}

/** Date → `YYYY-MM-DD HH:mm:ss`（台北） */
export function dateToTaipeiWallClock(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date);
  return parts.replace('T', ' ');
}

/** `YYYY-MM-DD`（台北）；Postgres date 欄位讀回時可能是 Date 或字串。 */
export function toTaipeiDateString(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return dateToTaipeiWallClock(value).slice(0, 10);
}

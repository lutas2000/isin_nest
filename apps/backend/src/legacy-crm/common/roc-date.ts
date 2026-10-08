/**
 * 舊版銷管的日期是民國字串 `yyy.mm.dd`（年不補零，月日兩位；MDB 內以 10 碼靠右補空白）。
 * 資料庫以 `date` 欄為正式值；畫面與報表顯示時再轉回民國字串。
 *
 * 原字串無法由 `date` 還原時（解析失敗，或解析成功但寫法不是標準格式），
 * 原字串另存在對應的 `*_raw` 欄，顯示時以原字串為準。
 */
export const ROC_YEAR_OFFSET = 1911;

// 民國 8088 年即西元 9999 年；再大的值當成無法解析。
const MAX_ROC_YEAR = 9999 - ROC_YEAR_OFFSET;
const ROC_DATE = /^(\d{1,4})\.(\d{2})\.(\d{2})$/;

export interface RocDateColumns {
  /** ISO `YYYY-MM-DD`；空白或無法解析時為 null */
  date: string | null;
  /** 無法由 `date` 還原時保留的原字串（已去頭尾空白），否則為 null */
  raw: string | null;
}

/** 解析民國字串，回傳 ISO `YYYY-MM-DD`；空白或格式、日期不合法時回傳 null。 */
export function parseRocDate(text: string | null | undefined): string | null {
  const match = ROC_DATE.exec(String(text ?? '').trim());
  if (!match) return null;
  const rocYear = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (rocYear < 1 || rocYear > MAX_ROC_YEAR) return null;
  const year = rocYear + ROC_YEAR_OFFSET;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return null;
  return `${String(year).padStart(4, '0')}-${match[2]}-${match[3]}`;
}

/** ISO `YYYY-MM-DD`（或 Date）轉成民國 `yyy.mm.dd`；null 或空白回傳空字串。 */
export function formatRocDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  let year: number;
  let month: number;
  let day: number;
  if (value instanceof Date) {
    year = value.getFullYear();
    month = value.getMonth() + 1;
    day = value.getDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) throw new Error(`日期格式無效：${value}`);
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const rocYear = year - ROC_YEAR_OFFSET;
  if (rocYear < 1)
    throw new Error(`民國以前的日期無法以民國年表示：${String(value)}`);
  return `${rocYear}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}

/** 舊資料字串拆成 `date` 與 `*_raw` 兩欄的值。 */
export function splitRocDate(text: string | null | undefined): RocDateColumns {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { date: null, raw: null };
  const date = parseRocDate(trimmed);
  if (date && formatRocDate(date) === trimmed) return { date, raw: null };
  return { date, raw: trimmed };
}

/** 畫面顯示用：有原字串就用原字串，否則由 `date` 轉成民國字串。 */
export function displayRocDate(
  date: string | null | undefined,
  raw?: string | null,
): string {
  return raw || formatRocDate(date ?? null);
}

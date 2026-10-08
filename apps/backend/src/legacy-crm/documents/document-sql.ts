import { LegacyDb } from '../common/legacy-db';
import { Row } from '../common/legacy-records';
import { LegacyValidationError } from '../common/legacy-validation.error';

/**
 * 日期欄的民國顯示字串（SQL）：有原字串用原字串，否則由 date 轉成 `yyy.mm.dd`。
 * 舊版的關鍵字搜尋會比對日期文字，用這個運算式讓搜尋結果與畫面顯示一致。
 */
export const rocText = (column: string) =>
  `coalesce(${column}_raw, (extract(year from ${column})::int - 1911)::text || to_char(${column}, '.MM.DD'), '')`;

/** 依欄位清單寫入一張單據的明細（列數最多 999，用一般多列 INSERT）。 */
export async function insertLines(
  db: LegacyDb,
  table: string,
  rows: Row[],
  names: string[],
) {
  if (!rows.length) return;
  const params: unknown[] = [];
  const values = rows.map((row) => {
    const placeholders = names.map((name) => {
      params.push(row[name]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  await db.run(
    `INSERT INTO legacy_crm.${table} (${names.join(', ')}) VALUES ${values.join(', ')}`,
    params,
  );
}

/** INSERT 一列表頭。 */
export async function insertRow(
  db: LegacyDb,
  table: string,
  row: Row,
  names: string[],
) {
  await db.run(
    `INSERT INTO legacy_crm.${table} (${names.join(', ')}) VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
    names.map((name) => row[name]),
  );
}

/** UPDATE 一列表頭；回傳影響列數。 */
export async function updateRow(
  db: LegacyDb,
  table: string,
  row: Row,
  names: string[],
  key: string,
) {
  return db.run(
    `UPDATE legacy_crm.${table} SET ${names.map((name, i) => `${name} = $${i + 1}`).join(', ')}, updated_at = now()
     WHERE ${key} = $${names.length + 1}`,
    [...names.map((name) => row[name]), row[key]],
  );
}

/** 單號參數：去頭尾空白、必填、長度上限（isin_vb6 boundedText）。 */
export function documentKey(label: string, value: unknown, limit = 10) {
  const key = value == null ? '' : String(value).trim();
  if (!key) throw new LegacyValidationError(`${label}不可空白`);
  if (Array.from(key).length > limit) {
    throw new LegacyValidationError(`${label}最多 ${limit} 個字元`);
  }
  return key;
}

/** 表頭欄位清單（含日期的 *_raw）。 */
export const withRaw = (names: string[], dates: string[]) =>
  names.flatMap((name) =>
    dates.includes(name) ? [name, `${name}_raw`] : [name],
  );

import { Client } from 'pg';
import { Row } from '../common/legacy-records';

const BATCH_ROWS = 5000;
const typeCache = new Map<string, Map<string, string>>();

/** legacy_crm 表的欄位基本型別（varchar 不帶長度，超長時由資料表報錯而不是被 cast 截斷）。 */
async function columnTypes(client: Client, table: string) {
  const cached = typeCache.get(table);
  if (cached) return cached;
  const result: { rows: { name: string; type: string }[] } = await client.query(
    `SELECT a.attname AS name, format_type(a.atttypid, NULL) AS type
       FROM pg_attribute a
      WHERE a.attrelid = to_regclass($1) AND a.attnum > 0 AND NOT a.attisdropped`,
    [`legacy_crm.${table}`],
  );
  if (result.rows.length === 0)
    throw new Error(`找不到資料表 legacy_crm.${table}；請先執行 migration`);
  const types = new Map(result.rows.map((row) => [row.name, row.type]));
  typeCache.set(table, types);
  return types;
}

const toParam = (value: unknown) =>
  value != null && typeof value === 'object' && !(value instanceof Date)
    ? JSON.stringify(value)
    : value;

/** 以 unnest 陣列批次寫入；所有列必須有相同的欄位。 */
export async function insertRows(
  client: Client,
  table: string,
  rows: Row[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const types = await columnTypes(client, table);
  const columns = Object.keys(rows[0]);
  for (const column of columns) {
    if (!types.has(column))
      throw new Error(`legacy_crm.${table} 沒有欄位 ${column}`);
  }
  const casts = columns.map(
    (column, index) => `$${index + 1}::${types.get(column)}[]`,
  );
  const sql = `INSERT INTO legacy_crm."${table}" (${columns.map((c) => `"${c}"`).join(', ')})
    SELECT * FROM unnest(${casts.join(', ')})`;
  for (let start = 0; start < rows.length; start += BATCH_ROWS) {
    const slice = rows.slice(start, start + BATCH_ROWS);
    await client.query(
      sql,
      columns.map((column) => slice.map((row) => toParam(row[column]))),
    );
  }
  return rows.length;
}

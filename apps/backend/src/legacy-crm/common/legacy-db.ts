import { EntityManager } from 'typeorm';
import { LEGACY_DATE_COLUMNS, Row } from './legacy-records';
import { displayRocDate } from './roc-date';

/**
 * 舊版銷管的 SQL 存取。查詢沿用 isin_vb6 的 SQL 結構（改寫為 PostgreSQL），回傳列再交給 present 轉成
 * isin_vb6 API 的形狀：日期欄轉回民國字串（有原字串就用原字串）、去掉 *_raw、bigint units 轉回 number。
 */
export class LegacyDb {
  constructor(readonly manager: EntityManager) {}

  async all<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.manager.query(sql, params)) as T[];
  }

  async get<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params);
    return rows[0] ?? null;
  }

  /** INSERT／UPDATE／DELETE；回傳影響列數。必須在 transaction 內呼叫。 */
  async run(sql: string, params: unknown[] = []): Promise<number> {
    const runner = this.manager.queryRunner;
    if (!runner) throw new Error('LegacyDb.run 必須在 transaction 內呼叫');
    const result = await runner.query(sql, params, true);
    return Number(result.affected ?? 0);
  }
}

/**
 * `SELECT` 欄位清單：日期欄轉成 text（避免 node-postgres 轉成 Date 而受時區影響）。
 * 不給欄名時為 `alias.*` 再加上同名的 text 日期欄；同名欄以後者為準。
 */
export function columns(table: string, alias = '', names?: string[]): string {
  const prefix = alias ? `${alias}.` : '';
  const dates = new Set(LEGACY_DATE_COLUMNS[table] ?? []);
  const list = names ?? null;
  if (!list) {
    const extra = [...dates].map(
      (column) => `${prefix}"${column}"::text AS "${column}"`,
    );
    return [`${prefix}*`, ...extra].join(', ');
  }
  return list
    .map((column) =>
      dates.has(column)
        ? `${prefix}"${column}"::text AS "${column}"`
        : `${prefix}"${column}"`,
    )
    .join(', ');
}

/** 日期欄（含 *_raw）轉成顯示用民國字串、units 轉 number；就地修改並回傳。 */
export function present<T extends Row>(table: string, row: T): T {
  const record = row as Row;
  for (const column of LEGACY_DATE_COLUMNS[table] ?? []) {
    if (column in record) {
      record[column] = displayRocDate(
        record[column] as string | null,
        record[`${column}_raw`] as string | null,
      );
      delete record[`${column}_raw`];
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (key.endsWith('_units') && value != null) record[key] = Number(value);
  }
  return row;
}

/** units（×10,000 的整數）轉回顯示用數字，與 isin_vb6 的 `x_units / 10000` 相同。 */
export const units = (value: unknown) => Number(value ?? 0) / 10000;

/** 包含查詢的 LIKE 樣式；isin_vb6 以 ! 跳脫，搭配 `ILIKE $n ESCAPE '!'`（SQLite LIKE 對英文不分大小寫）。 */
export const containsPattern = (term: string) =>
  `%${term.replace(/[!%_]/g, '!$&')}%`;
export const prefixPattern = (term: string) =>
  `${term.replace(/[!%_]/g, '!$&')}%`;

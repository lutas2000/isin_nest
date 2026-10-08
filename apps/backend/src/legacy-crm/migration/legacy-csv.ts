import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 讀取 export-legacy-mdb-set.sh（Jackcess）匯出的 CSV：UTF-8（含 BOM）、CRLF、RFC 4180 引號規則。
 * 一個 MDB 表是一個目錄 `<mdb>.<table>/`，內含依序編號的分檔，每檔第一列是欄名。
 */
export interface LegacyCsvTable {
  name: string;
  headers: string[];
  rows: string[][];
  column: Map<string, number>;
}

export function parseCsv(text: string, source = 'CSV'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;
  let pending = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (
      quoteClosed &&
      character !== ',' &&
      character !== '\r' &&
      character !== '\n'
    ) {
      throw new Error(
        `${source}：引號結束後出現非分隔字元（第 ${rows.length + 1} 列）`,
      );
    }
    if (character === '"') {
      if (field !== '')
        throw new Error(
          `${source}：欄位中間出現引號（第 ${rows.length + 1} 列）`,
        );
      quoted = true;
      pending = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
      quoteClosed = false;
      pending = true;
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      quoteClosed = false;
      pending = false;
    } else {
      field += character;
      pending = true;
    }
  }
  if (quoted) throw new Error(`${source}：引號沒有結束`);
  if (pending) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function readLegacyTable(csvDir: string, name: string): LegacyCsvTable {
  const folder = join(csvDir, name);
  const parts = readdirSync(folder)
    .filter((file) => file.toLowerCase().endsWith('.csv'))
    .sort();
  let headers: string[] | null = null;
  const rows: string[][] = [];
  for (const part of parts) {
    const matrix = parseCsv(
      readFileSync(join(folder, part), 'utf8').replace(/^\uFEFF/, ''),
      `${name}/${part}`,
    );
    if (matrix.length === 0)
      throw new Error(`${name}/${part}：找不到欄位標題列`);
    const [fileHeaders, ...dataRows] = matrix;
    if (!headers) headers = fileHeaders;
    else if (headers.join('\u0000') !== fileHeaders.join('\u0000')) {
      throw new Error(`${name}/${part}：欄位和前一個檔案不同`);
    }
    for (const [index, cells] of dataRows.entries()) {
      if (cells.length > headers.length)
        throw new Error(`${name}/${part}：第 ${index + 2} 列多於標題欄位數`);
      while (cells.length < headers.length) cells.push('');
      rows.push(cells);
    }
  }
  if (!headers) throw new Error(`${name}：找不到 CSV`);
  return {
    name,
    headers,
    rows,
    column: new Map(headers.map((header, index) => [header, index])),
  };
}

/** 來源欄名不分大小寫比對，與 Access 相同。 */
export function sourceHeader(table: LegacyCsvTable, wanted: string): string {
  const header = table.headers.find(
    (candidate) => candidate.toLowerCase() === wanted.toLowerCase(),
  );
  if (header == null) throw new Error(`${table.name} 沒有「${wanted}」欄位`);
  return header;
}

export function resolveMapping(
  table: LegacyCsvTable,
  map: Record<string, string>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(map).map(([field, wanted]) => [
      field,
      table.column.get(sourceHeader(table, wanted)) as number,
    ]),
  );
}

export function mapRow(
  mapping: Record<string, number>,
  row: string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [field, index] of Object.entries(mapping))
    values[field] = row[index] ?? '';
  return values;
}

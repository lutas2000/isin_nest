/**
 * 把舊 Java Personnel 產出的薪資 Excel 轉成 parity 用的 expected.json。
 *
 * 用法：
 *   npm run payroll:expected-from-xlsx -- --xlsx "/path/2026年6月薪資表.xlsx" --start 2026-06-01 --out path/expected.json
 *
 * Excel 必須先用 Excel 或 LibreOffice 開啟並另存，讓公式結果固化；否則讀不到數值。
 * 讀取邏輯在後端 `excel/payroll-workbook.reader.ts`，與 Nest 產出的 Excel round-trip 測試共用。
 */
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { readPayrollWorkbook } from '../apps/backend/src/hr/payroll/excel/payroll-workbook.reader';

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

const xlsx = arg('xlsx');
const start = arg('start');
const out = arg('out');

async function main(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsx);
  const { departments, formulaCells, cachedFormulaCells } = readPayrollWorkbook(workbook, Number(start.slice(0, 4)));
  if (formulaCells > 0 && cachedFormulaCells === 0) {
    throw new Error(`${xlsx} has no cached formula results; re-save it with LibreOffice or Excel first`);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ departments }, null, 2));
  console.log(`Wrote ${out}: ${departments.map((d) => `${d.department}(${d.days.length} days, ${d.wages.length} staff)`).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

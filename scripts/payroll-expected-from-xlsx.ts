/**
 * 把舊 Java Personnel 產出的薪資 Excel 轉成 parity 用的 expected.json。
 *
 * 用法：
 *   npm run payroll:expected-from-xlsx -- --xlsx "/path/2026年9月薪資表.xlsx" --start 2026-09-01 --out path/expected.json
 *
 * Excel 必須先用 Excel 或 LibreOffice 開啟並另存，讓公式結果固化；否則讀不到數值。
 */
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

const xlsx = arg('xlsx');
const start = arg('start');
const out = arg('out');
const year = Number(start.slice(0, 4));

/** 打卡記錄表每人 8 欄（ManHourReport.hourColumns） */
const HOUR_COLUMNS = 8;

/** 薪資表標題 → WageItems 欄位。重複出現的「勤務津貼」第二次視為特休減。 */
const WAGE_TITLES: Record<string, string> = {
  本薪: 'baseSalary',
  勤務津貼: 'allowance',
  加班費: 'overtimePay',
  全勤獎: 'fullAttendance',
  獎金: 'bonus',
  特休: 'annualLeaveAdd',
  幹部加給: 'organizer',
  夜班津貼: 'nightAllowance',
  伙食津貼: 'mealAllowance',
  加項合計: 'additionTotal',
  病假: 'sickLeave',
  事假: 'personalLeave',
  曠職: 'absenteeism',
  公休: 'officialHoliday',
  公假: 'unpaidLeave',
  健保費: 'healthInsurance',
  勞保費: 'laborInsurance',
  福利基金: 'welfareFund',
  借支: 'advance',
  稅金代扣: 'taxWithheld',
  其他代扣: 'otherDeduction',
  減項合計: 'deductionTotal',
  退休提撥: 'pension',
  總合: 'netPay',
};

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value && typeof value === 'object' && 'formula' in value) {
    const formula = value as ExcelJS.CellFormulaValue;
    if (formula.result === undefined || formula.result === null) {
      throw new Error(
        `${cell.worksheet.name}!${cell.address} has no cached formula result; open and re-save the workbook first`,
      );
    }
    return formula.result;
  }
  if (value && typeof value === 'object' && 'richText' in value) {
    return (value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join('');
  }
  return value;
}

const num = (value: unknown): number => (value === null || value === undefined || value === '' ? 0 : Number(value));
const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

function readHourSheet(sheet: ExcelJS.Worksheet) {
  const days: Array<Record<string, unknown>> = [];
  const names: string[] = [];
  for (let column = 1; column <= sheet.columnCount; column += HOUR_COLUMNS) {
    const name = text(cellValue(sheet.getCell(1, column)));
    if (!name) break;
    names.push(name);
  }
  for (let row = 3; row <= sheet.rowCount; row++) {
    const firstCell = text(cellValue(sheet.getCell(row, 1)));
    if (!/^\d{1,2}\/\d{1,2}$/.test(firstCell)) break; // 總合列之後不是逐日資料
    names.forEach((name, index) => {
      const base = index * HOUR_COLUMNS + 1;
      const dateText = text(cellValue(sheet.getCell(row, base)));
      const work = cellValue(sheet.getCell(row, base + 2));
      if (!dateText || work === null || work === undefined) return; // 未到職的空白列
      const [month, day] = dateText.split('/').map(Number);
      days.push({
        name,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        work: num(work),
        overtime: num(cellValue(sheet.getCell(row, base + 3))),
        leaveType: text(cellValue(sheet.getCell(row, base + 4))),
        leaveHours: num(cellValue(sheet.getCell(row, base + 5))),
        late: num(cellValue(sheet.getCell(row, base + 6))),
      });
    });
  }
  return days;
}

function readWageSheet(sheet: ExcelJS.Worksheet) {
  const wages: Array<Record<string, unknown>> = [];
  for (let column = 1; column <= sheet.columnCount; column += 2) {
    if (text(cellValue(sheet.getCell(1, column))) !== '姓名') break;
    const wage: Record<string, unknown> = { name: text(cellValue(sheet.getCell(1, column + 1))) };
    let seenAllowance = false;
    for (let row = 2; row <= sheet.rowCount; row++) {
      const title = text(cellValue(sheet.getCell(row, column)));
      if (!title) continue;
      let key = WAGE_TITLES[title];
      if (title === '勤務津貼') {
        if (seenAllowance) key = 'annualLeaveDeduct';
        seenAllowance = true;
      }
      if (title === '防疫假') continue; // 2026-10-04 決議移除
      if (!key) continue;
      wage[key] = num(cellValue(sheet.getCell(row, column + 1)));
    }
    wages.push(wage);
  }
  return wages;
}

async function main(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsx);
  const departments: Array<Record<string, unknown>> = [];
  for (const sheet of workbook.worksheets) {
    if (!sheet.name.startsWith('薪資-')) continue;
    const department = sheet.name.slice('薪資-'.length);
    const hourSheet = workbook.getWorksheet(`打卡記錄-${department}`);
    departments.push({
      department,
      days: hourSheet ? readHourSheet(hourSheet) : [],
      wages: readWageSheet(sheet),
    });
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ departments }, null, 2));
  console.log(`Wrote ${out}: ${departments.map((d) => `${d.department}(${(d.days as unknown[]).length} days, ${(d.wages as unknown[]).length} staff)`).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

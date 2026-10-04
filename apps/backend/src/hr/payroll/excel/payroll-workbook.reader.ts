import * as ExcelJS from 'exceljs';

/**
 * 讀取薪資 Excel（舊 Java 產出或 Nest 產出皆同版面）成可比對的 JSON。
 * 給 `scripts/payroll-expected-from-xlsx.ts` 與 builder 的 round-trip 測試共用。
 */

/** 打卡記錄表每人 8 欄（ManHourReport.hourColumns） */
export const HOUR_COLUMNS = 8;

/** 薪資表標題 → WageItems 欄位。重複出現的「勤務津貼」第二次視為特休減。 */
export const WAGE_TITLES: Record<string, string> = {
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
  公假: 'unpaidLeave', // 舊報表標題
  無薪假: 'unpaidLeave', // Nest 報表標題
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

export interface ReadDay {
  name: string;
  date: string;
  work: number;
  overtime: number;
  leaveType: string;
  leaveHours: number;
  late: number;
}

export type ReadWage = { name: string } & Record<string, number | string>;

export interface ReadDepartment {
  department: string;
  days: ReadDay[];
  wages: ReadWage[];
}

export interface ReadWorkbook {
  departments: ReadDepartment[];
  /** 公式儲存格數與其中帶快取值的數，用來判斷公式是否已固化。 */
  formulaCells: number;
  cachedFormulaCells: number;
}

const num = (value: unknown): number => (value === null || value === undefined || value === '' ? 0 : Number(value));
const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

class Reader {
  formulaCells = 0;
  cachedFormulaCells = 0;

  constructor(private readonly year: number) {}

  // exceljs 讀到快取值為 0 的公式時會省略 result，所以缺 result 視為 0。
  cellValue(cell: ExcelJS.Cell): unknown {
    const value = cell.value;
    if (value && typeof value === 'object' && 'formula' in value) {
      const formula = value as ExcelJS.CellFormulaValue;
      this.formulaCells++;
      if (formula.result === undefined || formula.result === null) return 0;
      this.cachedFormulaCells++;
      return formula.result;
    }
    if (value && typeof value === 'object' && 'richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join('');
    }
    return value;
  }

  readHourSheet(sheet: ExcelJS.Worksheet): ReadDay[] {
    const days: ReadDay[] = [];
    const names: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column += HOUR_COLUMNS) {
      const name = text(this.cellValue(sheet.getCell(1, column)));
      if (!name) break;
      names.push(name);
    }
    for (let row = 3; row <= sheet.rowCount; row++) {
      const firstCell = text(this.cellValue(sheet.getCell(row, 1)));
      if (!/^\d{1,2}\/\d{1,2}$/.test(firstCell)) break; // 總合列之後不是逐日資料
      names.forEach((name, index) => {
        const base = index * HOUR_COLUMNS + 1;
        const dateText = text(this.cellValue(sheet.getCell(row, base)));
        const work = this.cellValue(sheet.getCell(row, base + 2));
        if (!dateText || work === null || work === undefined) return; // 未到職的空白列
        const [month, day] = dateText.split('/').map(Number);
        days.push({
          name,
          date: `${this.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          work: num(work),
          overtime: num(this.cellValue(sheet.getCell(row, base + 3))),
          leaveType: text(this.cellValue(sheet.getCell(row, base + 4))),
          leaveHours: num(this.cellValue(sheet.getCell(row, base + 5))),
          late: num(this.cellValue(sheet.getCell(row, base + 6))),
        });
      });
    }
    return days;
  }

  readWageSheet(sheet: ExcelJS.Worksheet): ReadWage[] {
    const wages: ReadWage[] = [];
    for (let column = 1; column <= sheet.columnCount; column += 2) {
      if (text(this.cellValue(sheet.getCell(1, column))) !== '姓名') break;
      const wage: ReadWage = { name: text(this.cellValue(sheet.getCell(1, column + 1))) };
      let seenAllowance = false;
      for (let row = 2; row <= sheet.rowCount; row++) {
        const title = text(this.cellValue(sheet.getCell(row, column)));
        if (!title) continue;
        let key = WAGE_TITLES[title];
        if (title === '勤務津貼') {
          if (seenAllowance) key = 'annualLeaveDeduct';
          seenAllowance = true;
        }
        if (title === '防疫假') continue; // 2026-10-04 決議移除
        if (!key) continue;
        wage[key] = num(this.cellValue(sheet.getCell(row, column + 1)));
      }
      wages.push(wage);
    }
    return wages;
  }
}

/** @param year 打卡記錄表只有 M/d，年份由期間起日提供。 */
export function readPayrollWorkbook(workbook: ExcelJS.Workbook, year: number): ReadWorkbook {
  const reader = new Reader(year);
  const departments: ReadDepartment[] = [];
  for (const sheet of workbook.worksheets) {
    if (!sheet.name.startsWith('薪資-')) continue;
    const department = sheet.name.slice('薪資-'.length);
    const hourSheet = workbook.getWorksheet(`打卡記錄-${department}`);
    departments.push({
      department,
      days: hourSheet ? reader.readHourSheet(hourSheet) : [],
      wages: reader.readWageSheet(sheet),
    });
  }
  return { departments, formulaCells: reader.formulaCells, cachedFormulaCells: reader.cachedFormulaCells };
}

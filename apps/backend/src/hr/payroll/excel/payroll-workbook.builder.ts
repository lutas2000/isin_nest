import * as ExcelJS from 'exceljs';
import { LEAVE_TYPES } from '../domain/leave-types';
import { OvertimeBuckets, PayrollPeriod, PayrollVariant, VacationType } from '../domain/types';

/**
 * 薪資 Excel 產出。版面沿用舊 Java `ManHourReport` / `WageReport`：
 * 每部門「打卡記錄-部門」與「薪資-部門」兩個工作表，合併儲存格、頁首與橫向列印都相同。
 *
 * - 打卡記錄表只寫值，拿掉舊版的隱藏欄（遲到、平日旗標）與隱藏欄裡的四桶加班。
 * - 薪資表的各項金額由後端算好寫值，只有加項合計、減項合計、總合與右側總合欄是
 *   同表內的加減公式（附快取值），HR 在 Excel 改手動欄位時合計會跟著變；不再參照打卡記錄表。
 */

export interface WorkbookDayRow {
  name: string;
  date: string;
  vacationType: VacationType;
  segmentsText: string;
  work: number;
  overtime: number;
  leaveType: string;
  leaveHours: number;
  late: number;
  weekdayFlag: number;
}

/** 打卡記錄表每人的欄位（舊版 8 欄，去掉隱藏的遲到、平日）。 */
export const HOUR_SHEET_TITLES = ['日期', '打卡時段', '上班', '加班', '請假', '時數'] as const;

export interface WorkbookStaffRow {
  name: string;
  wageOrder: number;
  hourOrder: number | null;
  workHours: number;
  overtimeHours: number;
  leaveHours: number;
  overtimeJson: OvertimeBuckets;
  leaveByTypeJson: Record<string, number>;
  baseSalary: number;
  allowance: number;
  overtimePay: number;
  fullAttendance: number;
  bonus: number;
  annualLeaveAdd: number;
  organizer: number;
  nightAllowance: number;
  mealAllowance: number;
  additionTotal: number;
  sickLeave: number;
  personalLeave: number;
  absenteeism: number;
  officialHoliday: number;
  annualLeaveDeduct: number;
  unpaidLeave: number;
  healthInsurance: number;
  laborInsurance: number;
  welfareFund: number;
  advance: number;
  taxWithheld: number;
  otherDeduction: number;
  deductionTotal: number;
  pension: number;
  netPay: number;
}

export interface PayrollWorkbookInput {
  period: PayrollPeriod;
  variant: PayrollVariant;
  department: string;
  staff: WorkbookStaffRow[];
  days: WorkbookDayRow[];
}

const HOUR_COLUMNS = HOUR_SHEET_TITLES.length;
const FONT_NAME = '新細明體';
/** POI 欄寬單位是 1/256 字元，exceljs 用字元數。 */
const poiWidth = (units: number) => units / 256;

type WageRowKey = keyof Omit<WorkbookStaffRow, 'name' | 'wageOrder' | 'hourOrder' | 'overtimeJson' | 'leaveByTypeJson' | 'workHours' | 'overtimeHours' | 'leaveHours'>;
interface WageRowSpec {
  title: string;
  key: WageRowKey | 'name' | 'sign';
}

/**
 * 舊 WageReport 的三組列順序。特休減沿用舊標題「勤務津貼」；舊「公假」列（防疫假＋無薪假扣款）
 * 依 2026-10-04 決議只剩無薪假扣款，標題改為「無薪假」，位置不變。
 */
function wageRows(variant: PayrollVariant): WageRowSpec[] {
  const head: WageRowSpec[] = [
    { title: '姓名', key: 'name' },
    { title: '本薪', key: 'baseSalary' },
    { title: '勤務津貼', key: 'allowance' },
    { title: '加班費', key: 'overtimePay' },
    { title: '全勤獎', key: 'fullAttendance' },
    { title: '獎金', key: 'bonus' },
    { title: '特休', key: 'annualLeaveAdd' },
    { title: '幹部加給', key: 'organizer' },
    { title: '夜班津貼', key: 'nightAllowance' },
    { title: '伙食津貼', key: 'mealAllowance' },
    { title: '加項合計', key: 'additionTotal' },
    { title: '病假', key: 'sickLeave' },
    { title: '事假', key: 'personalLeave' },
    { title: '曠職', key: 'absenteeism' },
    { title: '公休', key: 'officialHoliday' },
  ];
  const deduct: WageRowSpec[] = variant === 'fake' ? [] : [{ title: '勤務津貼', key: 'annualLeaveDeduct' }];
  const tail: WageRowSpec[] = [
    { title: '無薪假', key: 'unpaidLeave' },
    { title: '健保費', key: 'healthInsurance' },
    { title: '勞保費', key: 'laborInsurance' },
    { title: '福利基金', key: 'welfareFund' },
    { title: '借支', key: 'advance' },
    ...(variant === 'official' ? [] : [{ title: '稅金代扣', key: 'taxWithheld' } as WageRowSpec]),
    { title: '其他代扣', key: 'otherDeduction' },
    { title: '減項合計', key: 'deductionTotal' },
    { title: '退休提撥', key: 'pension' },
    { title: '總合', key: 'netPay' },
    { title: '簽章', key: 'sign' },
  ];
  return [...head, ...deduct, ...tail];
}

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
};

function rocHeader(period: PayrollPeriod, department: string, suffix: string): string {
  const year = Number(period.start.slice(0, 4)) - 1911;
  const month = Number(period.start.slice(5, 7));
  return `${year}年${month}月 ${department} ${suffix}`;
}

function eachDate(period: PayrollPeriod): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${period.start}T00:00:00Z`);
  const end = new Date(`${period.end}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function buildHourSheet(workbook: ExcelJS.Workbook, input: PayrollWorkbookInput): void {
  const sheet = workbook.addWorksheet(`打卡記錄-${input.department}`, {
    pageSetup: {
      orientation: 'landscape',
      margins: { left: 0.3, right: 0.3, top: 0.6, bottom: 0.2, header: 0.3, footer: 0.3 },
    },
    headerFooter: { oddHeader: `&L${rocHeader(input.period, input.department, '打卡記錄')}` },
  });
  const font: Partial<ExcelJS.Font> = { name: FONT_NAME, size: 11 };
  const style = (cell: ExcelJS.Cell, color?: string) => {
    cell.font = color ? { ...font, color: { argb: color } } : font;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN;
  };
  const write = (row: number, column: number, value: ExcelJS.CellValue, color?: string) => {
    const cell = sheet.getCell(row, column);
    cell.value = value;
    style(cell, color);
  };

  const names = input.staff
    .filter((row) => row.hourOrder !== null)
    .sort((a, b) => (a.hourOrder as number) - (b.hourOrder as number));
  const dates = eachDate(input.period);
  const dayIndex = new Map(dates.map((date, index) => [date, index]));
  const sumRow = dates.length + 3;

  names.forEach((staff, index) => {
    const base = index * HOUR_COLUMNS + 1;
    sheet.mergeCells(1, base, 1, base + HOUR_COLUMNS - 1);
    write(1, base, staff.name);
    HOUR_SHEET_TITLES.forEach((title, offset) => write(2, base + offset, title));

    for (const day of input.days.filter((row) => row.name === staff.name)) {
      const index = dayIndex.get(day.date);
      if (index === undefined) continue;
      const row = index + 3;
      const [, month, dayOfMonth] = day.date.split('-').map(Number);
      // 有薪假紅字、無薪假綠字（ManHourReport.writeDay）
      const color = day.vacationType === 'paid' ? 'FFFF0000' : day.vacationType === 'unpaid' ? 'FF008000' : undefined;
      write(row, base, `${month}/${dayOfMonth}`, color);
      write(row, base + 1, day.segmentsText);
      write(row, base + 2, day.work);
      write(row, base + 3, day.overtime);
      if (day.leaveType) {
        write(row, base + 4, day.leaveType);
        write(row, base + 5, day.leaveHours);
      } else {
        write(row, base + 4, null);
        write(row, base + 5, null);
      }
    }

    // 總合列：舊版對請假欄也 SUM，文字欄結果為 0
    write(sumRow, base, '總合');
    write(sumRow, base + 1, null);
    write(sumRow, base + 2, staff.workHours);
    write(sumRow, base + 3, staff.overtimeHours);
    write(sumRow, base + 4, 0);
    write(sumRow, base + 5, staff.leaveHours);

    // 各假別時數，緊接在總合列下（舊版中間隔著四列隱藏的加班分桶）
    LEAVE_TYPES.forEach((type, offset) => {
      write(sumRow + 1 + offset, base + 4, type);
      write(sumRow + 1 + offset, base + 5, staff.leaveByTypeJson[type] ?? 0);
    });
  });

  for (let column = 0; column < names.length * HOUR_COLUMNS; column++) {
    sheet.getColumn(column + 1).width = poiWidth(column % HOUR_COLUMNS === 1 ? 3500 : 1700);
  }
}

function buildWageSheet(workbook: ExcelJS.Workbook, input: PayrollWorkbookInput): void {
  const sheet = workbook.addWorksheet(`薪資-${input.department}`, {
    pageSetup: {
      orientation: 'landscape',
      margins: { left: 0.2, right: 0.2, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: { oddHeader: `&L${rocHeader(input.period, input.department, '薪資表')}` },
  });
  const font: Partial<ExcelJS.Font> = { name: FONT_NAME, size: 10.5 };
  // 外帳與外勞版全表 #,##0（WageReport.startFake / startForien）
  const numFmt = input.variant === 'official' ? undefined : '#,##0';
  const write = (row: number, column: number, value: ExcelJS.CellValue) => {
    const cell = sheet.getCell(row, column);
    cell.value = value;
    cell.font = font;
    cell.alignment = { vertical: 'middle' };
    cell.border = THIN;
    if (numFmt) cell.numFmt = numFmt;
  };

  const rows = wageRows(input.variant);
  const rowOf = (key: WageRowSpec['key']) => rows.findIndex((spec) => spec.key === key) + 1;
  const additionRow = rowOf('additionTotal');
  const deductionRow = rowOf('deductionTotal');
  const staff = [...input.staff].sort((a, b) => a.wageOrder - b.wageOrder);

  // 合計列的公式：加項 = 本薪到伙食津貼、減項 = 病假到其他代扣、總合 = 加項 − 減項（退休提撥不扣）
  const totalFormula = (key: WageRowKey, column: string): string | null => {
    if (key === 'additionTotal') return `SUM(${column}2:${column}${additionRow - 1})`;
    if (key === 'deductionTotal') return `SUM(${column}${additionRow + 1}:${column}${deductionRow - 1})`;
    if (key === 'netPay') return `${column}${additionRow}-${column}${deductionRow}`;
    return null;
  };

  staff.forEach((person, index) => {
    const titleColumn = index * 2 + 1;
    const valueColumn = sheet.getColumn(titleColumn + 1).letter;
    rows.forEach((spec, offset) => {
      const row = offset + 1;
      write(row, titleColumn, spec.title);
      if (spec.key === 'name') write(row, titleColumn + 1, person.name);
      else if (spec.key === 'sign') write(row, titleColumn + 1, null);
      else {
        const formula = totalFormula(spec.key, valueColumn);
        write(row, titleColumn + 1, formula ? { formula, result: person[spec.key] } : person[spec.key]);
      }
    });
  });

  // 總合欄：每列跨所有人加總（WageReport.writeTotal），標題欄是文字，SUM 會略過
  const totalColumn = staff.length * 2 + 1;
  const lastValueColumn = staff.length ? sheet.getColumn(totalColumn - 1).letter : null;
  write(1, totalColumn, '總合');
  rows.forEach((spec, offset) => {
    if (offset === 0) return;
    const row = offset + 1;
    if (spec.key === 'sign') {
      write(row, totalColumn, null);
      sheet.getRow(row).height = 25;
      return;
    }
    const result = staff.reduce((sum, person) => sum + (person[spec.key as WageRowKey] ?? 0), 0);
    write(row, totalColumn, lastValueColumn ? { formula: `SUM(B${row}:${lastValueColumn}${row})`, result } : result);
  });

  for (let column = 0; column < staff.length * 2; column++) {
    sheet.getColumn(column + 1).width = poiWidth(column % 2 === 1 ? 1800 : 2250);
  }
}

/** 單一部門（一個 payroll_run）的工作簿。 */
export function buildPayrollWorkbook(input: PayrollWorkbookInput): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'isin_nest';
  buildHourSheet(workbook, input);
  buildWageSheet(workbook, input);
  return workbook;
}

export async function buildPayrollWorkbookBuffer(input: PayrollWorkbookInput): Promise<Buffer> {
  const output = await buildPayrollWorkbook(input).xlsx.writeBuffer();
  return Buffer.from(output as ArrayBuffer);
}

/** 檔名沿用舊報表「{民國年}年{月}月薪資表」，加上 variant 與 run 編號。 */
export function payrollFileName(period: PayrollPeriod, variant: PayrollVariant, runId: number): string {
  const year = Number(period.start.slice(0, 4)) - 1911;
  const month = Number(period.start.slice(5, 7));
  return `${year}年${month}月薪資表-${variant}-run${runId}.xlsx`;
}

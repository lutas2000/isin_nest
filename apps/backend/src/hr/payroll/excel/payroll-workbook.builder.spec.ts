import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { calculatePayroll } from '../domain/payroll';
import { DepartmentResult, PayrollSourceData, SegmentRow, StaffRow } from '../domain/types';
import { toRunDayRows, toRunStaffRows } from '../payroll-run.mapper';
import { buildPayrollWorkbook, buildPayrollWorkbookBuffer, payrollFileName, WorkbookDayRow, WorkbookStaffRow } from './payroll-workbook.builder';
import { readPayrollWorkbook } from './payroll-workbook.reader';

const staff = (overrides: Partial<StaffRow>): StaffRow => ({
  id: 'A01', name: '張三', department: '生產部', wage: 30000, allowance: 3000, organizer: 0,
  labor_insurance: 500, health_insurance: 400, pension: 1800, is_foreign: false, benifit: true,
  need_check: true, have_fake: false, begain_work: '2020-01-01', stop_work: null, ...overrides,
});
const segment = (overrides: Partial<SegmentRow>): SegmentRow => ({
  id: 1, name: '張三', begain_time: '08:00:00', end_time: '17:00:00', cross_day: false, duty: false,
  night_work: false, rest_time: 60, rest_time2: 60, create_date: '2020-01-01', ...overrides,
});

function sourceData(variant: PayrollSourceData['variant'] = 'official'): PayrollSourceData {
  return {
    period: { start: '2026-06-01', end: '2026-06-03' },
    variant,
    staff: [staff({}), staff({ id: 'A02', name: '李四', need_check: false }), staff({ id: 'A03', name: '王五', department: '銷管部' })],
    segments: [segment({}), segment({ id: 2, name: '李四' }), segment({ id: 3, name: '王五' })],
    manhours: [
      { name: '張三', start_time: '2026-06-01 07:58:00', end_time: '2026-06-01 19:05:00' },
      { name: '張三', start_time: '2026-06-02 08:00:00', end_time: '2026-06-02 17:00:00' },
      { name: '王五', start_time: '2026-06-02 08:00:00', end_time: '2026-06-02 17:00:00' },
    ],
    leaves: [{ name: '張三', type: '事假', start_time: '2026-06-03 08:00:00', end_time: '2026-06-03 12:00:00' }],
    vacations: { '2026-06-02': 1 },
  };
}

function workbookInput(input: PayrollSourceData, department: DepartmentResult) {
  return {
    period: input.period,
    variant: input.variant,
    department: department.department,
    staff: toRunStaffRows(input, department, {}) as WorkbookStaffRow[],
    days: toRunDayRows(department) as WorkbookDayRow[],
  };
}

const dayFields = (d: { name: string; date: string; work: number; overtime: number; leaveType: string; leaveHours: number }) => ({
  name: d.name, date: d.date, work: d.work, overtime: d.overtime, leaveType: d.leaveType, leaveHours: d.leaveHours,
});

const numeric = (sheet: ExcelJS.Worksheet, address: string): number => {
  const value = sheet.getCell(address).value;
  if (value && typeof value === 'object' && 'formula' in value) return Number((value as ExcelJS.CellFormulaValue).result ?? 0);
  return typeof value === 'number' ? value : 0; // 文字與空白在 SUM 中略過
};

/** 只支援 builder 會寫的兩種公式：`SUM(A1:B2)` 與 `A1-A2`。回傳 [公式數, 與快取值不符的清單]。 */
function checkFormulas(sheet: ExcelJS.Worksheet): [number, string[]] {
  let count = 0;
  const wrong: string[] = [];
  sheet.eachRow((row) =>
    row.eachCell((cell) => {
      if (!cell.formula) return;
      count++;
      const formula = cell.formula;
      let value: number;
      const sum = /^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/.exec(formula);
      const minus = /^([A-Z]+\d+)-([A-Z]+\d+)$/.exec(formula);
      if (sum) {
        value = 0;
        const [fromCol, toCol] = [sheet.getColumn(sum[1]).number, sheet.getColumn(sum[3]).number];
        for (let r = Number(sum[2]); r <= Number(sum[4]); r++) {
          for (let c = fromCol; c <= toCol; c++) value += numeric(sheet, sheet.getCell(r, c).address);
        }
      } else if (minus) {
        value = numeric(sheet, minus[1]) - numeric(sheet, minus[2]);
      } else {
        wrong.push(`${cell.address} unsupported ${formula}`);
        return;
      }
      if (value !== numeric(sheet, cell.address)) wrong.push(`${cell.address} ${formula}=${value} cached=${numeric(sheet, cell.address)}`);
    }),
  );
  return [count, wrong];
}

async function roundTrip(workbook: ExcelJS.Workbook, year: number) {
  const buffer = await workbook.xlsx.writeBuffer();
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(buffer as never);
  return { reloaded, read: readPayrollWorkbook(reloaded, year) };
}

describe('buildPayrollWorkbook', () => {
  it('reproduces the legacy layout without hidden columns; wage totals are in-sheet +/- formulas', async () => {
    const input = sourceData();
    const result = calculatePayroll(input);
    const production = result.departments.find((d) => d.department === '生產部')!;
    const workbook = buildPayrollWorkbook(workbookInput(input, production));
    const { reloaded, read } = await roundTrip(workbook, 2026);

    expect(reloaded.worksheets.map((s) => s.name)).toEqual(['打卡記錄-生產部', '薪資-生產部']);
    const hour = reloaded.getWorksheet('打卡記錄-生產部')!;
    expect(hour.getCell('A1').value).toBe('張三');
    expect(hour.getCell('A1').isMerged).toBe(true);
    expect(hour.getCell('F1').isMerged).toBe(true);
    expect(hour.getCell('G1').isMerged).toBe(false);
    expect([1, 2, 3, 4, 5, 6].map((c) => hour.getCell(2, c).value)).toEqual(['日期', '打卡時段', '上班', '加班', '請假', '時數']);
    expect(hour.getCell('G2').value).toBeNull(); // 遲到、平日欄已拿掉
    expect(hour.columns.filter((column) => column.hidden)).toHaveLength(0);
    expect(hour.getCell('A3').value).toBe('6/1');
    expect(hour.getCell('A4').font?.color?.argb).toBe('FFFF0000'); // 6/2 有薪假紅字
    expect(hour.getCell('A6').value).toBe('總合');
    expect(hour.getCell('C6').value).toBe(production.summaries[0].workHours);
    // 假別列緊接總合列，順序同 LEAVE_TYPES；6/3 只請半天又沒打卡，依舊規則記為曠職 4 小時
    expect(hour.getCell('E7').value).toBe('事假');
    expect(hour.getCell('F7').value).toBe(0);
    expect(hour.getCell('E16').value).toBe('曠職');
    expect(hour.getCell('F16').value).toBe(4);
    expect(hour.getCell('E5').value).toBe('曠職');
    expect(hour.pageSetup.orientation).toBe('landscape');
    expect(hour.headerFooter.oddHeader).toBe('&L115年6月 生產部 打卡記錄');
    expect(checkFormulas(hour)).toEqual([0, []]);

    const wage = reloaded.getWorksheet('薪資-生產部')!;
    expect(wage.getCell('A1').value).toBe('姓名');
    expect(wage.getCell('B1').value).toBe('張三');
    expect(wage.getCell('C1').value).toBe('姓名');
    expect(wage.getCell('D1').value).toBe('李四');
    expect(wage.getCell('E1').value).toBe('總合');
    expect(wage.getCell('A26').value).toBe('簽章');
    expect(wage.getRow(26).height).toBe(25);
    expect(wage.getCell('A16').value).toBe('勤務津貼'); // 特休減沿用舊標題
    expect(wage.getCell('A17').value).toBe('無薪假'); // 舊標題「公假」
    expect(wage.getCell('A22').value).toBe('其他代扣'); // 正式版沒有稅金代扣列
    // 一般項目寫值；合計三列與總合欄是同表加減公式，不參照打卡記錄表
    expect(wage.getCell('B4').value).toBe(production.wages[0].overtimePay);
    expect(wage.getCell('B11').formula).toBe('SUM(B2:B10)');
    expect(wage.getCell('B23').formula).toBe('SUM(B12:B22)');
    expect(wage.getCell('B25').formula).toBe('B11-B23');
    expect(wage.getCell('B24').value).toBe(production.wages[0].pension); // 退休提撥不扣
    expect(wage.getCell('E25').formula).toBe('SUM(B25:D25)');
    expect(numeric(wage, 'E25')).toBe(production.wages[0].netPay + production.wages[1].netPay);
    const [wageFormulas, wrong] = checkFormulas(wage);
    expect(wrong).toEqual([]);
    expect(wageFormulas).toBe(2 * 3 + 24); // 每人 3 個合計 + 總合欄第 2–25 列
    reloaded.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => expect(cell.formula ?? '').not.toContain('!'))));

    expect(read.departments).toHaveLength(1);
    expect(read.departments[0].days).toEqual(production.days.map(dayFields));
    for (const wageRow of production.wages) {
      const got = read.departments[0].wages.find((w) => w.name === wageRow.name)!;
      for (const key of Object.keys(got)) {
        if (key === 'name') continue;
        expect([wageRow.name, key, got[key]]).toEqual([wageRow.name, key, (wageRow as never)[key]]);
      }
    }
  });

  it('fake variant drops the annual-leave deduction row, adds tax withheld and uses #,##0', async () => {
    const input = sourceData('fake');
    const result = calculatePayroll(input);
    const production = result.departments.find((d) => d.department === '生產部')!;
    const { reloaded } = await roundTrip(buildPayrollWorkbook(workbookInput(input, production)), 2026);
    const wage = reloaded.getWorksheet('薪資-生產部')!;
    const titles: string[] = [];
    for (let row = 1; row <= wage.rowCount; row++) titles.push(String(wage.getCell(row, 1).value ?? ''));
    expect(titles.filter((t) => t === '勤務津貼')).toHaveLength(1);
    expect(titles).toContain('稅金代扣');
    expect(wage.getCell('B2').numFmt).toBe('#,##0');
  });

  it('names the file like the legacy report with ROC year', () => {
    expect(payrollFileName({ start: '2026-06-01', end: '2026-06-30' }, 'official', 7)).toBe('115年6月薪資表-official-run7.xlsx');
    expect(buildPayrollWorkbookBuffer(workbookInput(sourceData(), calculatePayroll(sourceData()).departments[1]))).resolves.toBeInstanceOf(Buffer);
  });
});

/** 有 fixture 時：整月資料 round-trip，讀回結果必須等於計算結果。 */
describe('buildPayrollWorkbook round-trip on fixtures', () => {
  const fixturesDir = path.join(__dirname, '..', '__fixtures__');
  const cases = fs.existsSync(fixturesDir)
    ? fs.readdirSync(fixturesDir).filter((name) => fs.existsSync(path.join(fixturesDir, name, 'input.json')))
    : [];
  it('has fixtures or is skipped', () => expect(true).toBe(true));
  if (!cases.length) return;

  it.each(cases)('%s', async (name) => {
    const input: PayrollSourceData = JSON.parse(fs.readFileSync(path.join(fixturesDir, name, 'input.json'), 'utf8'));
    const result = calculatePayroll(input);
    for (const department of result.departments) {
      const { reloaded, read } = await roundTrip(buildPayrollWorkbook(workbookInput(input, department)), Number(input.period.start.slice(0, 4)));
      const got = read.departments[0];
      expect(got.days).toEqual(department.days.map(dayFields));
      expect(checkFormulas(reloaded.getWorksheet(`薪資-${department.department}`)!)[1]).toEqual([]);
      expect(got.wages.map((w) => w.name)).toEqual(department.wageSheetNames);
      for (const [index, wageRow] of department.wages.entries()) {
        for (const [key, value] of Object.entries(got.wages[index])) {
          if (key === 'name') continue;
          expect(value).toBe((wageRow as never)[key]);
        }
      }
    }
  });
});

/**
 * 雙軌比對（遷移計畫第六階段）：舊 Java Personnel 產出的薪資 Excel 與 Nest API 下載的 Excel 逐格比對。
 *
 * 用法：
 *   npm run payroll:dual-track -- --start 2026-06-01 \
 *     --java "/path/official/2026年6月薪資表.xlsx" \
 *     --nest "/path/official-2026-06-銷管部.xlsx" --nest "/path/official-2026-06-生產部.xlsx"
 *
 * Java 的 Excel 必須先固化公式值（isin-java `scripts/export-payroll.sh` 會用 LibreOffice 做這件事）。
 * Nest 每個部門一個檔案，可給多個 `--nest`。兩邊都用後端 `excel/payroll-workbook.reader.ts` 讀。
 *
 * 允許差異只有 2026-10-04 決議的三項：
 *   1. 舊報表「防疫假」列：reader 直接略過。
 *   2. 舊程式硬編排除「林慶豐」：比對時略過此人。
 *   3. 舊 Excel 伙食津貼 COUNTIF 少算期間最後一天：允許 Nest 的伙食津貼多 0 或 50，
 *      且加項合計與總合多出相同金額。
 * 其餘任何差異都會列出並以非零退出碼結束。
 */
import * as ExcelJS from 'exceljs';
import { readPayrollWorkbook, ReadDay, ReadDepartment, ReadWage } from '../apps/backend/src/hr/payroll/excel/payroll-workbook.reader';

const IGNORED_NAMES = new Set(['林慶豐']);
const MEAL_ALLOWANCE = 50;
const DAY_KEYS = ['work', 'overtime', 'leaveType', 'leaveHours', 'late'] as const;

function args(name: string): string[] {
  const values: string[] = [];
  process.argv.forEach((value, index) => {
    if (value === `--${name}` && process.argv[index + 1]) values.push(process.argv[index + 1]);
  });
  return values;
}

async function read(file: string, year: number): Promise<ReadDepartment[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const result = readPayrollWorkbook(workbook, year);
  if (result.formulaCells > 0 && result.cachedFormulaCells === 0) {
    throw new Error(`${file} has formulas without cached results; fixate it with LibreOffice or Excel first`);
  }
  return result.departments;
}

interface Report {
  department: string;
  javaDays: number;
  nestDays: number;
  javaStaff: number;
  mealAllowanceLastDay: string[];
  mismatches: string[];
}

function compareDays(java: ReadDay[], nest: ReadDay[], report: Report): void {
  const nestByKey = new Map(nest.map((day) => [`${day.name}|${day.date}`, day]));
  const javaKeys = new Set<string>();
  for (const day of java) {
    if (IGNORED_NAMES.has(day.name)) continue;
    const key = `${day.name}|${day.date}`;
    javaKeys.add(key);
    const got = nestByKey.get(key);
    if (!got) {
      report.mismatches.push(`day ${key}: missing in Nest`);
      continue;
    }
    const diff = DAY_KEYS.filter((field) => got[field] !== day[field]).map(
      (field) => `${field} java=${JSON.stringify(day[field])} nest=${JSON.stringify(got[field])}`,
    );
    if (diff.length) report.mismatches.push(`day ${key}: ${diff.join(', ')}`);
  }
  for (const day of nest) {
    if (IGNORED_NAMES.has(day.name)) continue;
    const key = `${day.name}|${day.date}`;
    if (!javaKeys.has(key)) report.mismatches.push(`day ${key}: extra in Nest`);
  }
}

function compareWages(java: ReadWage[], nest: ReadWage[], report: Report): void {
  const javaNames = java.map((wage) => wage.name).filter((name) => !IGNORED_NAMES.has(name));
  const nestNames = nest.map((wage) => wage.name).filter((name) => !IGNORED_NAMES.has(name));
  if (javaNames.join('|') !== nestNames.join('|')) {
    report.mismatches.push(`staff order: java=[${javaNames.join(',')}] nest=[${nestNames.join(',')}]`);
  }
  const nestByName = new Map(nest.map((wage) => [wage.name, wage]));
  for (const wage of java) {
    if (IGNORED_NAMES.has(wage.name)) continue;
    const got = nestByName.get(wage.name);
    if (!got) continue; // 已在 staff order 報告
    const deltas: Record<string, number> = {};
    for (const [key, value] of Object.entries(wage)) {
      if (key === 'name') continue;
      const actual = got[key];
      if (actual === undefined) {
        report.mismatches.push(`wage ${wage.name} ${key}: missing in Nest`);
      } else if (actual !== value) {
        deltas[key] = Number(actual) - Number(value);
      }
    }
    for (const key of Object.keys(got)) {
      if (key !== 'name' && !(key in wage)) report.mismatches.push(`wage ${wage.name} ${key}: only in Nest (${got[key]})`);
    }
    const keys = Object.keys(deltas).sort().join(',');
    const meal = deltas.mealAllowance;
    const isMealLastDay =
      keys === 'additionTotal,mealAllowance,netPay' &&
      (meal === 0 || meal === MEAL_ALLOWANCE) &&
      deltas.additionTotal === meal &&
      deltas.netPay === meal;
    if (!keys) continue;
    if (isMealLastDay) {
      report.mealAllowanceLastDay.push(`${wage.name} +${meal}`);
    } else {
      report.mismatches.push(
        `wage ${wage.name}: ${Object.entries(deltas)
          .map(([key, delta]) => `${key} java=${wage[key]} nest=${got[key]} (${delta > 0 ? '+' : ''}${delta})`)
          .join(', ')}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const [start] = args('start');
  const [javaFile] = args('java');
  const nestFiles = args('nest');
  if (!start || !javaFile || !nestFiles.length) throw new Error('Usage: --start YYYY-MM-DD --java file.xlsx --nest file.xlsx [--nest ...]');
  const year = Number(start.slice(0, 4));

  const java = await read(javaFile, year);
  const nest = (await Promise.all(nestFiles.map((file) => read(file, year)))).flat();

  const reports: Report[] = [];
  const javaDepartments = java.map((d) => d.department);
  const nestDepartments = nest.map((d) => d.department);
  const departmentMismatch = javaDepartments.filter((d) => !nestDepartments.includes(d)).map((d) => `department ${d}: missing in Nest`)
    .concat(nestDepartments.filter((d) => !javaDepartments.includes(d)).map((d) => `department ${d}: extra in Nest`));

  for (const javaDepartment of java) {
    const nestDepartment = nest.find((d) => d.department === javaDepartment.department);
    const report: Report = {
      department: javaDepartment.department,
      javaDays: javaDepartment.days.filter((day) => !IGNORED_NAMES.has(day.name)).length,
      nestDays: nestDepartment?.days.filter((day) => !IGNORED_NAMES.has(day.name)).length ?? 0,
      javaStaff: javaDepartment.wages.filter((wage) => !IGNORED_NAMES.has(wage.name)).length,
      mealAllowanceLastDay: [],
      mismatches: [],
    };
    if (nestDepartment) {
      compareDays(javaDepartment.days, nestDepartment.days, report);
      compareWages(javaDepartment.wages, nestDepartment.wages, report);
    }
    reports.push(report);
  }

  console.log(`== ${start.slice(0, 7)} java=${javaFile}`);
  for (const line of departmentMismatch) console.log(`  !! ${line}`);
  let failed = departmentMismatch.length > 0;
  for (const report of reports) {
    const wageFields = java.find((d) => d.department === report.department)!.wages
      .filter((wage) => !IGNORED_NAMES.has(wage.name))
      .reduce((sum, wage) => sum + Object.keys(wage).length - 1, 0);
    console.log(
      `  ${report.department}: staff ${report.javaStaff}, days java ${report.javaDays} / nest ${report.nestDays}, wage fields ${wageFields}, ` +
        `allowed meal-last-day ${report.mealAllowanceLastDay.length} [${report.mealAllowanceLastDay.join(' ')}], mismatches ${report.mismatches.length}`,
    );
    for (const line of report.mismatches) console.log(`    !! ${line}`);
    if (report.mismatches.length) failed = true;
  }
  console.log(failed ? '  RESULT: DIFFERENCES FOUND' : '  RESULT: identical except allowed differences');
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import * as fs from 'fs';
import * as path from 'path';
import { calculatePayroll } from './domain/payroll';
import { PayrollSourceData, WageItems } from './domain/types';

/**
 * 與舊 Java Personnel 薪資 Excel 的逐格比對。
 * fixture 的產生方式見 __fixtures__/README.md；沒有 fixture 時整個 spec 跳過。
 */

export interface ExpectedDay {
  name: string;
  date: string;
  work: number;
  overtime: number;
  leaveType: string;
  leaveHours: number;
  late: number;
}

export type ExpectedWage = Partial<WageItems> & { name: string };

export interface ExpectedDepartment {
  department: string;
  days: ExpectedDay[];
  wages: ExpectedWage[];
}

export interface ExpectedPayroll {
  departments: ExpectedDepartment[];
}

/** 2026-10-04 決議：舊報表的「林慶豐」排除改以 stop_work 判斷，比對時略過此人。 */
const IGNORED_NAMES = new Set(['林慶豐']);

const fixturesDir = path.join(__dirname, '__fixtures__');
const cases = fs.existsSync(fixturesDir)
  ? fs
      .readdirSync(fixturesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(
        (name) =>
          fs.existsSync(path.join(fixturesDir, name, 'input.json')) &&
          fs.existsSync(path.join(fixturesDir, name, 'expected.json')),
      )
  : [];

describe('legacy payroll parity', () => {
  it('has fixtures to compare (skipped when __fixtures__ is empty)', () => {
    if (!cases.length) console.warn('No payroll parity fixtures found; see __fixtures__/README.md');
  });

  if (!cases.length) return;

  describe.each(cases)('%s', (fixture) => {
    const input: PayrollSourceData = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, fixture, 'input.json'), 'utf8'),
    );
    const expected: ExpectedPayroll = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, fixture, 'expected.json'), 'utf8'),
    );
    const result = calculatePayroll(input, {
      departments: expected.departments.map((department) => department.department),
    });

    describe.each(expected.departments.map((d) => [d.department, d] as const))(
      '%s',
      (department, expectedDepartment) => {
        const actual = result.departments.find((d) => d.department === department);

        it('exists in the result', () => {
          expect(actual).toBeDefined();
        });

        it('matches every daily row of the hour sheet', () => {
          const actualDays = new Map(
            actual!.days.map((day) => [`${day.name}|${day.date}`, day]),
          );
          const mismatches: string[] = [];
          for (const day of expectedDepartment.days) {
            if (IGNORED_NAMES.has(day.name)) continue;
            const got = actualDays.get(`${day.name}|${day.date}`);
            if (!got) {
              mismatches.push(`${day.name} ${day.date}: missing`);
              continue;
            }
            const diff = (['work', 'overtime', 'leaveType', 'leaveHours', 'late'] as const)
              .filter((key) => got[key] !== day[key])
              .map((key) => `${key} expected ${JSON.stringify(day[key])} got ${JSON.stringify(got[key])}`);
            if (diff.length) mismatches.push(`${day.name} ${day.date}: ${diff.join(', ')}`);
          }
          expect(mismatches).toEqual([]);
        });

        it('matches every wage item of the wage sheet', () => {
          const actualWages = new Map(actual!.wages.map((wage) => [wage.name, wage]));
          const mismatches: string[] = [];
          for (const wage of expectedDepartment.wages) {
            if (IGNORED_NAMES.has(wage.name)) continue;
            const got = actualWages.get(wage.name);
            if (!got) {
              mismatches.push(`${wage.name}: missing`);
              continue;
            }
            for (const [key, value] of Object.entries(wage)) {
              if (key === 'name') continue;
              const actualValue = got[key as keyof WageItems];
              if (actualValue !== value) {
                mismatches.push(`${wage.name} ${key}: expected ${value} got ${actualValue}`);
              }
            }
          }
          expect(mismatches).toEqual([]);
        });

        it('lists the same staff in the same order', () => {
          const expectedNames = expectedDepartment.wages
            .map((wage) => wage.name)
            .filter((name) => !IGNORED_NAMES.has(name));
          expect(actual!.wageSheetNames).toEqual(expectedNames);
        });
      },
    );
  });
});

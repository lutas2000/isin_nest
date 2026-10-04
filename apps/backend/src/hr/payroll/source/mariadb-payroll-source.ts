import {
  LeaveRow,
  ManhourRow,
  PayrollPeriod,
  PayrollSourceData,
  PayrollVariant,
  SegmentRow,
  StaffRow,
} from '../domain/types';

/**
 * 從舊 MariaDB 讀出 PayrollSourceData 的 SQL 與轉換。
 * 不依賴 NestJS，給 `MariadbPayrollSourceLoader` 與 `scripts/payroll-dump-source.ts` 共用，
 * 確保 fixture 與正式流程讀到同樣的資料。只讀取，不寫入。
 */
export interface MariadbQuery {
  query(sql: string, values?: unknown[]): Promise<any>;
}

const bool = (value: unknown): boolean => value === 1 || value === true || value === '1';

export async function loadPayrollSourceFromMariadb(
  db: MariadbQuery,
  period: PayrollPeriod,
  variant: PayrollVariant,
): Promise<PayrollSourceData> {
  const staff: StaffRow[] = (
    await db.query(
      `SELECT id, name, department, wage, allowance, organizer, labor_insurance, health_insurance, pension,
              is_foreign, benifit, need_check, have_fake,
              DATE_FORMAT(begain_work, '%Y-%m-%d') AS begain_work,
              DATE_FORMAT(stop_work, '%Y-%m-%d') AS stop_work
       FROM staff ORDER BY id`,
    )
  ).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    department: row.department ?? null,
    wage: Number(row.wage ?? 0),
    allowance: Number(row.allowance ?? 0),
    organizer: Number(row.organizer ?? 0),
    labor_insurance: Number(row.labor_insurance ?? 0),
    health_insurance: Number(row.health_insurance ?? 0),
    pension: Number(row.pension ?? 0),
    is_foreign: bool(row.is_foreign),
    benifit: bool(row.benifit),
    need_check: bool(row.need_check),
    have_fake: bool(row.have_fake),
    begain_work: String(row.begain_work),
    stop_work: row.stop_work ? String(row.stop_work) : null,
  }));

  const segments: SegmentRow[] = (
    await db.query(
      `SELECT id, name, TIME_FORMAT(begain_time, '%H:%i:%s') AS begain_time,
              TIME_FORMAT(end_time, '%H:%i:%s') AS end_time, cross_day, duty, night_work,
              rest_time, rest_time2, DATE_FORMAT(create_date, '%Y-%m-%d') AS create_date
       FROM staff_segment ORDER BY name, create_date, id`,
    )
  ).map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    begain_time: String(row.begain_time),
    end_time: String(row.end_time),
    cross_day: bool(row.cross_day),
    duty: bool(row.duty),
    night_work: bool(row.night_work),
    rest_time: Number(row.rest_time ?? 0),
    rest_time2: Number(row.rest_time2 ?? 0),
    create_date: String(row.create_date),
  }));

  // 外帳：have_fake 員工改讀 staff_manhour2，其餘仍讀 staff_manhour（Java Report.exportFake）。
  const fakeNames = new Set(
    variant === 'fake' ? staff.filter((row) => row.have_fake).map((row) => row.name) : [],
  );
  const range = [`${period.start} 00:00:00`, `${period.end} 23:59:59`];
  const manhourSql = (table: string) =>
    `SELECT name, DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
            DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
     FROM ${table} WHERE start_time BETWEEN ? AND ? ORDER BY name, start_time`;
  const manhourRows: any[] = await db.query(manhourSql('staff_manhour'), range);
  const manhour2Rows: any[] = fakeNames.size ? await db.query(manhourSql('staff_manhour2'), range) : [];
  const manhours: ManhourRow[] = [
    ...manhourRows.filter((row) => !fakeNames.has(String(row.name))),
    ...manhour2Rows.filter((row) => fakeNames.has(String(row.name))),
  ].map((row) => ({
    name: String(row.name),
    start_time: String(row.start_time),
    end_time: row.end_time ? String(row.end_time) : null,
  }));

  const leaves: LeaveRow[] = (
    await db.query(
      `SELECT name, type, DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
              DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
       FROM staff_leave WHERE start_time BETWEEN ? AND ? ORDER BY name, start_time`,
      range,
    )
  ).map((row: any) => ({
    name: String(row.name),
    type: String(row.type),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
  }));

  const vacations: Record<string, 0 | 1> = {};
  for (const row of await db.query(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, pay FROM staff_vacation WHERE date BETWEEN ? AND ?`,
    [period.start, period.end],
  )) {
    vacations[String(row.date)] = bool(row.pay) ? 1 : 0;
  }

  return { period: { ...period }, variant, staff, segments, manhours, leaves, vacations };
}

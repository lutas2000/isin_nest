/**
 * 從舊 MariaDB 匯出一個期間的薪資計算輸入（PayrollSourceData），供 parity fixture 使用。
 *
 * 用法：
 *   npm run payroll:dump-source -- --start 2026-09-01 --end 2026-09-30 --variant official --out path/input.json
 *
 * 連線使用 .env 的 SOURCE_DB_*。只讀取，不寫入。
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import mysql = require('mysql');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

type Variant = 'official' | 'foreign' | 'fake';

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

const start = arg('start');
const end = arg('end');
const variant = arg('variant', 'official') as Variant;
const out = arg('out');

const pool = mysql.createPool({
  host: process.env.SOURCE_DB_HOST || 'localhost',
  port: Number(process.env.SOURCE_DB_PORT || 3306),
  user: process.env.SOURCE_DB_USER || process.env.SOURCE_DB_USERNAME || 'root',
  password: process.env.SOURCE_DB_PASS || process.env.SOURCE_DB_PASSWORD || '',
  database: process.env.SOURCE_DB_NAME || process.env.SOURCE_DB_DATABASE || 'isin2',
  connectionLimit: 2,
  charset: 'utf8mb4',
  dateStrings: true,
  timezone: 'Z',
});

function query(sql: string, values: unknown[] = []): Promise<any[]> {
  return new Promise((resolve, reject) =>
    pool.query(sql, values, (error, rows) => (error ? reject(error) : resolve(rows))),
  );
}

const bool = (value: unknown) => value === 1 || value === true || value === '1';

async function main(): Promise<void> {
  const staff = (
    await query(
      `SELECT id, name, department, wage, allowance, organizer, labor_insurance, health_insurance, pension,
              is_foreign, benifit, need_check, have_fake,
              DATE_FORMAT(begain_work, '%Y-%m-%d') AS begain_work,
              DATE_FORMAT(stop_work, '%Y-%m-%d') AS stop_work
       FROM staff ORDER BY id`,
    )
  ).map((row) => ({
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

  const segments = (
    await query(
      `SELECT id, name, TIME_FORMAT(begain_time, '%H:%i:%s') AS begain_time,
              TIME_FORMAT(end_time, '%H:%i:%s') AS end_time, cross_day, duty, night_work,
              rest_time, rest_time2, DATE_FORMAT(create_date, '%Y-%m-%d') AS create_date
       FROM staff_segment ORDER BY name, create_date, id`,
    )
  ).map((row) => ({
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

  const fakeNames = new Set(
    variant === 'fake' ? staff.filter((row) => row.have_fake).map((row) => row.name) : [],
  );
  const range = [`${start} 00:00:00`, `${end} 23:59:59`];
  const manhourRows = await query(
    `SELECT name, DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
            DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
     FROM staff_manhour WHERE start_time BETWEEN ? AND ? ORDER BY name, start_time`,
    range,
  );
  const manhour2Rows = fakeNames.size
    ? await query(
        `SELECT name, DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
                DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
         FROM staff_manhour2 WHERE start_time BETWEEN ? AND ? ORDER BY name, start_time`,
        range,
      )
    : [];
  const manhours = [
    ...manhourRows.filter((row) => !fakeNames.has(String(row.name))),
    ...manhour2Rows.filter((row) => fakeNames.has(String(row.name))),
  ].map((row) => ({
    name: String(row.name),
    start_time: String(row.start_time),
    end_time: row.end_time ? String(row.end_time) : null,
  }));

  const leaves = (
    await query(
      `SELECT name, type, DATE_FORMAT(start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
              DATE_FORMAT(end_time, '%Y-%m-%d %H:%i:%s') AS end_time
       FROM staff_leave WHERE start_time BETWEEN ? AND ? ORDER BY name, start_time`,
      range,
    )
  ).map((row) => ({
    name: String(row.name),
    type: String(row.type),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
  }));

  const vacations: Record<string, 0 | 1> = {};
  for (const row of await query(
    `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, pay FROM staff_vacation WHERE date BETWEEN ? AND ?`,
    [start, end],
  )) {
    vacations[String(row.date)] = bool(row.pay) ? 1 : 0;
  }

  const data = { period: { start, end }, variant, staff, segments, manhours, leaves, vacations };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${out}: staff=${staff.length}, segments=${segments.length}, manhours=${manhours.length}, leaves=${leaves.length}, vacations=${Object.keys(vacations).length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

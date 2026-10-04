/**
 * 從舊 MariaDB 匯出一個期間的薪資計算輸入（PayrollSourceData），供 parity fixture 使用。
 *
 * 用法：
 *   npm run payroll:dump-source -- --start 2026-06-01 --end 2026-06-30 --variant official --out path/input.json
 *
 * 連線使用 .env 的 SOURCE_DB_*。只讀取，不寫入。
 * SQL 與後端 `MariadbPayrollSourceLoader` 共用，fixture 和正式流程讀到的資料一致。
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import mysql = require('mysql');
import { loadPayrollSourceFromMariadb } from '../apps/backend/src/hr/payroll/source/mariadb-payroll-source';
import { PayrollVariant } from '../apps/backend/src/hr/payroll/domain/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

const start = arg('start');
const end = arg('end');
const variant = arg('variant', 'official') as PayrollVariant;
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

const db = {
  query: (sql: string, values: unknown[] = []): Promise<any[]> =>
    new Promise((resolve, reject) =>
      pool.query(sql, values, (error, rows) => (error ? reject(error) : resolve(rows))),
    ),
};

async function main(): Promise<void> {
  const data = await loadPayrollSourceFromMariadb(db, { start, end }, variant);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${out}: staff=${data.staff.length}, segments=${data.segments.length}, manhours=${data.manhours.length}, leaves=${data.leaves.length}, vacations=${Object.keys(data.vacations).length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

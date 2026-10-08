/**
 * 把人工確認過的員工編號建議表（import-legacy-csv.ts 產生，confirm 欄填 Y 的列）寫入 staff.legacy_crm_code。
 * 全部在同一個 transaction；任何一列對不上就整批不寫。
 *
 *   npm run legacy-crm:apply-staff-codes -- <staff-code-proposals.csv> [--dry-run]
 */
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { parseCsv } from './legacy-csv';
import { PROPOSAL_COLUMNS } from './staff-codes';

dotenv.config({ path: resolve(__dirname, '../../../../../.env') });

async function main() {
  const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  if (!file) {
    console.error(
      'Usage: npm run legacy-crm:apply-staff-codes -- <staff-code-proposals.csv> [--dry-run]',
    );
    process.exit(2);
  }
  const [headers, ...rows] = parseCsv(
    readFileSync(resolve(file), 'utf8').replace(/^\uFEFF/, ''),
    file,
  );
  const missing = PROPOSAL_COLUMNS.filter(
    (column) => !headers.includes(column),
  );
  if (missing.length) throw new Error(`建議表缺少欄位：${missing.join(', ')}`);
  const column = (name: string) => headers.indexOf(name);
  const confirmed = rows
    .filter((row) => row[column('confirm')]?.trim().toUpperCase() === 'Y')
    .map((row) => ({
      code: row[column('legacy_code')].trim(),
      staffId: row[column('staff_id')].trim(),
    }));

  const problems: string[] = [];
  const codes = new Set<string>();
  const staffIds = new Set<string>();
  for (const { code, staffId } of confirmed) {
    if (!code || !staffId)
      problems.push(`舊編號「${code}」沒有對應的 staff_id`);
    if (codes.has(code)) problems.push(`舊編號「${code}」重複`);
    if (staffIds.has(staffId))
      problems.push(`staff「${staffId}」被指定兩個舊編號`);
    if (code.length > 10) problems.push(`舊編號「${code}」超過 10 個字元`);
    codes.add(code);
    staffIds.add(staffId);
  }
  if (problems.length) throw new Error(problems.join('\n'));

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();
  console.log(
    `目標：${client.host}:${client.port}/${client.database}；確認 ${confirmed.length} 位`,
  );
  try {
    await client.query('BEGIN');
    let updated = 0;
    for (const { code, staffId } of confirmed) {
      const taken = await client.query(
        'SELECT id FROM public.staff WHERE legacy_crm_code = $1 AND id <> $2',
        [code, staffId],
      );
      if (taken.rows.length)
        throw new Error(`舊編號「${code}」已屬於 staff「${taken.rows[0].id}」`);
      const result = await client.query(
        'UPDATE public.staff SET legacy_crm_code = $1 WHERE id = $2',
        [code, staffId],
      );
      if (result.rowCount !== 1) throw new Error(`找不到 staff「${staffId}」`);
      updated += 1;
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    console.log(
      dryRun
        ? `檢查通過，可寫入 ${updated} 位（--dry-run 未寫入）`
        : `已寫入 ${updated} 位`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

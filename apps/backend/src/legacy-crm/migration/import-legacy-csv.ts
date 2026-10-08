/**
 * 舊版銷管正式移轉：把 export-legacy-mdb-set.sh 匯出的 CSV 匯入 PostgreSQL 的 legacy_crm。
 * 對應、排除規則與 isin_vb6 `scripts/stage-legacy-import.mjs` 相同：空白編號、來源重複編號、
 * 找不到表頭的孤兒明細不匯入並依原因計數；客戶不在主檔只提醒，照樣匯入。
 * 移轉的單據保留來源金額，不觸發回寫，也不逐筆寫 write_log，只記一筆 action = 'import' 的批次摘要。
 *
 *   npm run legacy-crm:import -- <csv-dir> [--only=customer,sale,...] [--final] [--truncate]
 *       [--summary=<path>] [--staff-proposals=<path>]
 *
 * --final     正式移轉：全部步驟在同一個 transaction，任何一步失敗就整批還原。
 *             未加時每一步各自一個 transaction，失敗的步驟還原後繼續下一步（演練用）。
 * --truncate  先清空所選步驟的資料表。legacy_crm 已有使用者寫入紀錄（write_log）時拒絕執行。
 *
 * 連線設定同 data-source.ts（專案根目錄 .env 的 DB_*）。摘要與員工編號建議表含真實資料統計，
 * 預設寫在 CSV 目錄旁，不要放進 Git。
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { basename, resolve } from 'path';
import { Client } from 'pg';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { LEGACY_DATE_COLUMNS, Row } from '../common/legacy-records';
import { ROC_YEAR_OFFSET } from '../common/roc-date';
import {
  ALL_TARGETS,
  DOCUMENT_STEPS,
  DocumentStep,
  EMPLOYEE_SOURCE,
  MASTER_STEPS,
  MasterStep,
} from './import-steps';
import {
  LegacyCsvTable,
  mapRow,
  readLegacyTable,
  resolveMapping,
  sourceHeader,
} from './legacy-csv';
import { insertRows } from './pg-batch';
import {
  buildStaffCodeProposals,
  proposalsToCsv,
  StaffRecord,
  summarizeProposals,
} from './staff-codes';

dotenv.config({ path: resolve(__dirname, '../../../../../.env') });

interface Exclusion {
  count: number;
  rows: number;
  samples: string[];
}

interface DateStats {
  parsed: number;
  empty: number;
  /** 解析成功但原寫法不是標準格式，原字串存在 *_raw */
  nonCanonical: number;
  /** 無法解析，date 為 null，原字串存在 *_raw */
  unparsed: number;
  /** 民國年小於 60 或大於今年 + 5，多半是舊資料打錯，照樣保存 */
  outOfRange: number;
}

interface StepResult {
  target: string;
  source: string;
  sourceRows: number;
  imported: number;
  importedRows: number;
  relatedSourceRows?: Record<string, number>;
  relatedImported?: Record<string, number>;
  excluded: Record<string, Exclusion>;
  missingCustomerDocuments?: number;
  missingCustomerCodes?: number;
  dates: Record<string, DateStats>;
  seconds: number;
  failure: string | null;
}

const newResult = (target: string, source: string): StepResult => ({
  target,
  source,
  sourceRows: 0,
  imported: 0,
  importedRows: 0,
  excluded: {},
  dates: {},
  seconds: 0,
  failure: null,
});

// 「」內的值換成「…」，讓原因可以歸類且不帶資料內容。
function exclude(result: StepResult, message: string, key: string, rows = 1) {
  const reason = String(message).replace(/「[^」]*」/g, '「…」');
  const entry = (result.excluded[reason] ??= {
    count: 0,
    rows: 0,
    samples: [],
  });
  entry.count += 1;
  entry.rows += rows;
  if (key && entry.samples.length < 3) entry.samples.push(key);
}

const currentRocYear = new Date().getFullYear() - ROC_YEAR_OFFSET;

function collectDateStats(result: StepResult, table: string, rows: Row[]) {
  for (const column of LEGACY_DATE_COLUMNS[table] ?? []) {
    const stats = (result.dates[`${table}.${column}`] ??= {
      parsed: 0,
      empty: 0,
      nonCanonical: 0,
      unparsed: 0,
      outOfRange: 0,
    });
    for (const row of rows) {
      const date = row[column] as string | null;
      const raw = row[`${column}_raw`] as string | null;
      if (date) {
        stats.parsed += 1;
        if (raw) stats.nonCanonical += 1;
        const rocYear = Number(date.slice(0, 4)) - ROC_YEAR_OFFSET;
        if (rocYear < 60 || rocYear > currentRocYear + 5) stats.outOfRange += 1;
      } else if (raw) {
        stats.unparsed += 1;
      } else {
        stats.empty += 1;
      }
    }
  }
}

// ---- 主檔 ----

async function importMaster(
  client: Client,
  csvDir: string,
  step: MasterStep,
  result: StepResult,
) {
  const table = readLegacyTable(csvDir, step.source);
  const mapping = resolveMapping(table, step.map);
  const firstField = Object.keys(mapping)[0];
  result.sourceRows = table.rows.length;
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const sourceRow of table.rows) {
    try {
      const { key, row } = step.normalize(mapRow(mapping, sourceRow));
      if (key && seen.has(key))
        throw new LegacyValidationError(
          `編號「${key}」在來源重複，只匯入第一筆`,
        );
      if (key) seen.add(key);
      rows.push(row);
    } catch (error) {
      if (!(error instanceof LegacyValidationError)) throw error;
      exclude(result, error.message, sourceRow[mapping[firstField]]);
    }
  }
  collectDateStats(result, step.table, rows);
  result.imported = await insertRows(client, step.table, rows);
  result.importedRows = result.imported;
}

// ---- 單據 ----

async function customerCodes(client: Client) {
  const { rows }: { rows: { code: string }[] } = await client.query(
    `SELECT code FROM legacy_crm.partners WHERE kind = 'customer'`,
  );
  return new Set(rows.map((row) => row.code));
}

async function importDocument(
  client: Client,
  csvDir: string,
  step: DocumentStep,
  result: StepResult,
) {
  const header = readLegacyTable(csvDir, step.source);
  const headerMapping = resolveMapping(header, step.map);
  const keyIndex = header.column.get(sourceHeader(header, step.key)) as number;
  result.sourceRows = header.rows.length;

  const relations = step.relations.map((relation) => {
    const table: LegacyCsvTable = readLegacyTable(csvDir, relation.source);
    return {
      ...relation,
      csv: table,
      parentIndex: table.column.get(
        sourceHeader(table, relation.parent),
      ) as number,
      mapping: resolveMapping(table, relation.map),
    };
  });
  result.relatedSourceRows = Object.fromEntries(
    relations.map((relation) => [relation.key, relation.csv.rows.length]),
  );

  const documents = new Map<
    string,
    { row: string[]; related: Record<string, string[][]> }
  >();
  for (const row of header.rows) {
    const key = String(row[keyIndex] ?? '').trim();
    if (!key) exclude(result, '主檔編號空白', '');
    else if (documents.has(key))
      exclude(result, `主檔編號「${key}」在來源重複，只匯入第一筆`, key);
    else
      documents.set(key, {
        row,
        related: Object.fromEntries(
          relations.map((relation) => [relation.key, []]),
        ),
      });
  }
  for (const relation of relations) {
    for (const row of relation.csv.rows) {
      const key = String(row[relation.parentIndex] ?? '').trim();
      const document = documents.get(key);
      if (document) document.related[relation.key].push(row);
      else
        exclude(
          result,
          `${relation.source} 的列找不到主檔「${key}」（孤兒列）`,
          key,
          0,
        );
    }
  }

  const known = await customerCodes(client);
  const missingCodes = new Set<string>();
  let missingDocuments = 0;
  const headers: Row[] = [];
  const lines: Record<string, Row[]> = Object.fromEntries(
    relations.map((relation) => [relation.key, []]),
  );
  for (const [key, document] of documents) {
    const input: Record<string, unknown> = mapRow(headerMapping, document.row);
    for (const relation of relations) {
      input[relation.key] = document.related[relation.key].map((row) =>
        mapRow(relation.mapping, row),
      );
    }
    const size =
      1 +
      relations.reduce(
        (sum, relation) => sum + document.related[relation.key].length,
        0,
      );
    try {
      const normalized = step.normalize(input);
      headers.push(normalized.header);
      for (const relation of relations)
        lines[relation.key].push(...normalized.lines[relation.key]);
      const code = String(normalized.header.customer_code ?? '');
      if (code && !known.has(code)) {
        missingDocuments += 1;
        missingCodes.add(code);
      }
    } catch (error) {
      if (!(error instanceof LegacyValidationError)) throw error;
      exclude(result, error.message, key, size);
    }
  }

  collectDateStats(result, step.table, headers);
  result.imported = await insertRows(client, step.table, headers);
  result.importedRows = result.imported;
  result.relatedImported = {};
  for (const relation of relations) {
    collectDateStats(result, relation.table, lines[relation.key]);
    const count = await insertRows(client, relation.table, lines[relation.key]);
    result.relatedImported[relation.key] = count;
    result.importedRows += count;
  }
  result.missingCustomerDocuments = missingDocuments;
  result.missingCustomerCodes = missingCodes.size;
}

// ---- 清空與保護 ----

const stepTables = (step: MasterStep | DocumentStep) =>
  'relations' in step
    ? [step.table, ...step.relations.map((relation) => relation.table)]
    : [step.table];

async function stepHasRows(client: Client, step: MasterStep | DocumentStep) {
  if (step.table === 'partners') {
    const { rowCount } = await client.query(
      `SELECT 1 FROM legacy_crm.partners WHERE kind = $1 LIMIT 1`,
      [step.target],
    );
    return (rowCount ?? 0) > 0;
  }
  for (const table of stepTables(step)) {
    const { rowCount } = await client.query(
      `SELECT 1 FROM legacy_crm."${table}" LIMIT 1`,
    );
    if ((rowCount ?? 0) > 0) return true;
  }
  return false;
}

async function clearStep(client: Client, step: MasterStep | DocumentStep) {
  if (step.table === 'partners') {
    await client.query(`DELETE FROM legacy_crm.partners WHERE kind = $1`, [
      step.target,
    ]);
  } else {
    const tables = stepTables(step).map((table) => `legacy_crm."${table}"`);
    await client.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY`);
  }
}

// ---- 員工編號建議表 ----

async function writeStaffProposals(
  client: Client,
  csvDir: string,
  path: string,
) {
  if (!existsSync(resolve(csvDir, EMPLOYEE_SOURCE.source))) return null;
  const table = readLegacyTable(csvDir, EMPLOYEE_SOURCE.source);
  const mapping = resolveMapping(table, EMPLOYEE_SOURCE.map);
  const employees = table.rows.map((row) =>
    mapRow(mapping, row),
  ) as unknown as Parameters<typeof buildStaffCodeProposals>[0];
  const { rows: staff }: { rows: StaffRecord[] } = await client.query(
    `SELECT id, name, to_char(stop_work, 'YYYY-MM-DD') AS stop_work, legacy_crm_code FROM public.staff`,
  );
  const proposals = buildStaffCodeProposals(employees, staff);
  writeFileSync(path, proposalsToCsv(proposals));
  return { path, ...summarizeProposals(proposals) };
}

// ---- 主程式 ----

function describe(result: StepResult) {
  const lines = [
    `${result.target}（${result.source}）：來源 ${result.sourceRows} 筆，匯入 ${result.imported} 筆` +
      `（${result.importedRows} 列，${result.seconds.toFixed(1)} 秒）`,
  ];
  if (result.relatedSourceRows) {
    const pairs = Object.keys(result.relatedSourceRows).map(
      (key) =>
        `${key} ${result.relatedSourceRows?.[key]} → ${result.relatedImported?.[key] ?? 0}`,
    );
    lines.push(`  明細（來源 → 匯入）：${pairs.join('；')}`);
  }
  if (result.missingCustomerDocuments) {
    lines.push(
      `  客戶不在主檔：${result.missingCustomerDocuments} 張單據、${result.missingCustomerCodes} 個客戶編號`,
    );
  }
  for (const [reason, entry] of Object.entries(result.excluded)) {
    lines.push(
      `  排除 ${entry.count} 筆${entry.rows !== entry.count ? `（${entry.rows} 列）` : ''}：${reason}`,
    );
  }
  for (const [column, stats] of Object.entries(result.dates)) {
    if (stats.unparsed || stats.nonCanonical || stats.outOfRange) {
      lines.push(
        `  日期 ${column}：無法解析 ${stats.unparsed}、非標準寫法 ${stats.nonCanonical}、年份可疑 ${stats.outOfRange}`,
      );
    }
  }
  if (result.failure) lines.push(`  ✗ 失敗：${result.failure}`);
  return lines.join('\n');
}

function parseArgs(argv: string[]) {
  const option = (name: string) =>
    argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const [csvDir] = argv.filter((arg) => !arg.startsWith('--'));
  const only = option('only')
    ?.split(',')
    .map((target) => target.trim());
  const unknown = only?.filter((target) => !ALL_TARGETS.includes(target)) ?? [];
  if (!csvDir || unknown.length) {
    console.error(
      'Usage: npm run legacy-crm:import -- <csv-dir> [--only=customer,sale,...] [--final] [--truncate]' +
        ' [--summary=<path>] [--staff-proposals=<path>]',
    );
    if (unknown.length)
      console.error(
        `不認得的步驟：${unknown.join(', ')}（可用：${ALL_TARGETS.join(', ')}）`,
      );
    process.exit(2);
  }
  const dir = resolve(csvDir).replace(/\/+$/, '');
  return {
    csvDir: dir,
    only,
    final: argv.includes('--final'),
    truncate: argv.includes('--truncate'),
    summaryPath: resolve(
      option('summary') ?? `${dir}.legacy-crm-import.summary.json`,
    ),
    proposalsPath: resolve(
      option('staff-proposals') ?? `${dir}.staff-code-proposals.csv`,
    ),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.csvDir))
    throw new Error(`找不到 CSV 目錄：${args.csvDir}`);
  const steps = [
    ...MASTER_STEPS.map((step) => ({
      step,
      run: (client: Client, result: StepResult) =>
        importMaster(client, args.csvDir, step, result),
    })),
    ...DOCUMENT_STEPS.map((step) => ({
      step,
      run: (client: Client, result: StepResult) =>
        importDocument(client, args.csvDir, step, result),
    })),
  ].filter(({ step }) => !args.only || args.only.includes(step.target));

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();
  const target = `${client.host}:${client.port}/${client.database}`;
  console.log(
    `匯入目標：${target}；來源：${args.csvDir}${args.final ? '（正式移轉）' : ''}`,
  );

  const started = Date.now();
  const results: StepResult[] = [];
  let failed = false;
  try {
    const nonEmpty: string[] = [];
    for (const { step } of steps)
      if (await stepHasRows(client, step)) nonEmpty.push(step.target);
    if (nonEmpty.length && !args.truncate) {
      throw new Error(
        `這些步驟的資料表已有資料：${nonEmpty.join(', ')}；確定要重匯請加 --truncate`,
      );
    }
    if (nonEmpty.length) {
      const used = await client.query(
        `SELECT 1 FROM legacy_crm.write_log WHERE action <> 'import' LIMIT 1`,
      );
      if ((used.rowCount ?? 0) > 0)
        throw new Error(
          'legacy_crm 已有使用者寫入紀錄，不能用 --truncate 清空重匯',
        );
    }

    if (args.final) await client.query('BEGIN');
    for (const { step, run } of steps) {
      process.stderr.write(`${step.target}（${step.source}）…\n`);
      const result = newResult(step.target, step.source);
      const stepStarted = Date.now();
      if (!args.final) await client.query('BEGIN');
      try {
        if (nonEmpty.includes(step.target)) await clearStep(client, step);
        await run(client, result);
        if (!args.final) await client.query('COMMIT');
      } catch (error) {
        result.failure = error instanceof Error ? error.message : String(error);
        failed = true;
        if (!args.final) await client.query('ROLLBACK');
      }
      result.seconds = (Date.now() - stepStarted) / 1000;
      results.push(result);
      console.log(describe(result));
      if (failed && args.final) break;
    }

    const summaryLog = {
      source: basename(args.csvDir),
      final: args.final,
      failed,
      steps: results.map(
        ({
          target,
          sourceRows,
          imported,
          importedRows,
          relatedImported,
          failure,
        }) => ({
          target,
          sourceRows,
          imported,
          importedRows,
          relatedImported,
          failed: failure != null,
        }),
      ),
    };
    if (args.final && failed) {
      await client.query('ROLLBACK');
      console.log('\n正式移轉失敗，已全部還原。');
    } else {
      if (!args.final) await client.query('BEGIN');
      await client.query(
        `INSERT INTO legacy_crm.write_log (entity_type, entity_key, action, after) VALUES ('legacy_import', $1, 'import', $2)`,
        [basename(args.csvDir).slice(0, 60), JSON.stringify(summaryLog)],
      );
      await client.query('COMMIT');
      const tables = [
        ...new Set(steps.flatMap(({ step }) => stepTables(step))),
      ];
      for (const table of tables)
        await client.query(`ANALYZE legacy_crm."${table}"`);
    }

    const staffCodes = await writeStaffProposals(
      client,
      args.csvDir,
      args.proposalsPath,
    );
    const sourceFile = resolve(args.csvDir, 'SOURCE.txt');
    const summary = {
      csvDir: args.csvDir,
      source: existsSync(sourceFile)
        ? readFileSync(sourceFile, 'utf8').trim().split('\n')
        : null,
      target,
      final: args.final,
      failed,
      finishedAt: new Date().toISOString(),
      seconds: (Date.now() - started) / 1000,
      results,
      staffCodes,
    };
    writeFileSync(args.summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    if (staffCodes) {
      console.log(
        `\n員工編號建議表：${staffCodes.total} 位舊員工，預填 ${staffCodes.preconfirmed} 位；` +
          `${JSON.stringify(staffCodes.byStatus)}\n  ${staffCodes.path}`,
      );
    }
    console.log(
      `\n共 ${summary.seconds.toFixed(1)} 秒；摘要：${args.summaryPath}`,
    );
  } finally {
    await client.end();
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

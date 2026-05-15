/**
 * Access（.mdb / .accdb）結構與樣本列分析；可選與 MySQL 欄位對照。
 *
 * 設計給 agent skill 使用：精確選表、樣本列範圍、可選 JSON 輸出、列數不載入全表。
 *
 * 用法（專案根）：
 *   npm run analyze-access -- <path.mdb> [mysql-table]   # 相容舊版：第二參數 = MySQL 表名
 *   npm run analyze-access -- <path.mdb> --access-tables=Quote --mysql-table=quote --json
 *
 * 環境變數見檔案底部 parseConfig 與 .env.example。
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve, extname } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import MDBReader from 'mdb-reader';
import type { Column } from 'mdb-reader';
import iconv from 'iconv-lite';

const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
};

const TARGET_DB = process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';
const ACCESS_DB_PASSWORD = process.env.ACCESS_DB_PASSWORD || '';

function envBool(v: string | undefined, defaultVal: boolean): boolean {
  if (v === undefined || v === '') return defaultVal;
  const x = v.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(x)) return true;
  if (['0', 'false', 'no', 'off'].includes(x)) return false;
  return defaultVal;
}

function envInt(v: string | undefined, defaultVal: number): number {
  if (v === undefined || v === '') return defaultVal;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : defaultVal;
}

function parseCommaList(v: string | undefined): string[] | null {
  if (v === undefined || v.trim() === '') return null;
  const parts = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

interface ParsedFlag {
  key: string;
  value: string | true;
}

function parseArgv(argv: string[]): {
  positionals: string[];
  flags: ParsedFlag[];
} {
  const positionals: string[] = [];
  const flags: ParsedFlag[] = [];
  for (const raw of argv) {
    if (!raw.startsWith('--')) {
      positionals.push(raw);
      continue;
    }
    const eq = raw.indexOf('=');
    if (eq === -1) {
      flags.push({ key: raw.slice(2), value: true });
    } else {
      flags.push({
        key: raw.slice(2, eq),
        value: raw.slice(eq + 1),
      });
    }
  }
  return { positionals, flags };
}

function flagString(flags: ParsedFlag[], name: string): string | undefined {
  const f = flags.find((x) => x.key === name);
  if (!f) return undefined;
  return f.value === true ? undefined : String(f.value);
}

function flagBool(flags: ParsedFlag[], name: string): boolean {
  return flags.some((x) => x.key === name && x.value === true);
}

interface AnalyzeConfig {
  accessFilePath: string;
  mysqlTableName: string;
  /** 精確表名（mdb-reader 表名大小寫需與檔內一致）；未設且設了 mysql 時可走舊版子字串篩選 */
  accessTableNames: string[] | null;
  sampleLimit: number;
  sampleOffset: number;
  sampleColumns: string[] | null;
  skipSamples: boolean;
  json: boolean;
}

function parseConfig(): AnalyzeConfig {
  const argv = process.argv.slice(2);
  const { positionals, flags } = parseArgv(argv);

  const accessFromEnv = process.env.ACCESS_FILE_PATH || '';
  const accessFilePath = positionals[0] || accessFromEnv;

  const mysqlFromFlag = flagString(flags, 'mysql-table');
  const legacySecond =
    positionals[1] && !positionals[1].startsWith('--') ? positionals[1] : '';
  const mysqlTableName =
    mysqlFromFlag ||
    process.env.MYSQL_TABLE_NAME ||
    legacySecond ||
    '';

  const accessTablesFlag = flagString(flags, 'access-tables');
  const accessTableNames =
    parseCommaList(accessTablesFlag) ??
    parseCommaList(process.env.ACCESS_TABLE_NAMES);

  const sampleLimit = Math.max(
    0,
    flagString(flags, 'sample-limit') !== undefined
      ? envInt(flagString(flags, 'sample-limit'), 5)
      : envInt(process.env.ACCESS_SAMPLE_ROW_LIMIT, 5),
  );
  const sampleOffset = Math.max(
    0,
    flagString(flags, 'sample-offset') !== undefined
      ? envInt(flagString(flags, 'sample-offset'), 0)
      : envInt(process.env.ACCESS_SAMPLE_ROW_OFFSET, 0),
  );

  const colsFlag = flagString(flags, 'sample-columns');
  const sampleColumns =
    parseCommaList(colsFlag) ?? parseCommaList(process.env.ACCESS_SAMPLE_COLUMNS);

  const skipSamples =
    flagBool(flags, 'no-samples') ||
    envBool(process.env.ACCESS_SKIP_SAMPLES, false);

  const json =
    flagBool(flags, 'json') || envBool(process.env.ACCESS_ANALYZE_JSON, false);

  return {
    accessFilePath,
    mysqlTableName,
    accessTableNames,
    sampleLimit,
    sampleOffset,
    sampleColumns,
    skipSamples,
    json,
  };
}

function convertBig5ToUtf8(value: unknown): unknown {
  if (typeof value === 'string' && value.length > 0) {
    try {
      const buffer = Buffer.from(value, 'latin1');
      return iconv.decode(buffer, 'big5');
    } catch {
      return value;
    }
  }
  return value;
}

function convertObjectBig5ToUtf8(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return convertBig5ToUtf8(obj);
  if (Array.isArray(obj)) return obj.map((item) => convertObjectBig5ToUtf8(item));
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
      converted[key] = convertObjectBig5ToUtf8(
        (obj as Record<string, unknown>)[key],
      );
    }
    return converted;
  }
  return obj;
}

function serializeColumn(col: Column) {
  return {
    name: convertBig5ToUtf8(col.name) as string,
    nameInFile: col.name,
    type: col.type,
    size: col.size,
    nullable: col.nullable,
    fixedLength: col.fixedLength,
    autoLong: col.autoLong,
    precision: col.precision,
    scale: col.scale,
  };
}

function logHuman(config: AnalyzeConfig, msg: string) {
  if (!config.json) console.log(msg);
}

function logErr(msg: string) {
  console.error(msg);
}

function resolveTablesToAnalyze(
  allNames: string[],
  config: AnalyzeConfig,
): { tables: string[]; warnings: string[] } {
  const warnings: string[] = [];

  if (config.accessTableNames?.length) {
    const set = new Set(allNames);
    const missing = config.accessTableNames.filter((n) => !set.has(n));
    for (const m of missing) {
      warnings.push(`Access 中找不到資料表（需與檔內名稱完全一致）: "${m}"`);
    }
    const found = config.accessTableNames.filter((n) => set.has(n));
    return { tables: found, warnings };
  }

  if (config.mysqlTableName) {
    const needle = config.mysqlTableName.toLowerCase();
    const filtered = allNames.filter((name) => name.toLowerCase().includes(needle));
    if (filtered.length === 0) {
      warnings.push(
        `已設定 MYSQL_TABLE_NAME="${config.mysqlTableName}" 但未以子字串匹配到任何 Access 表；改為分析全部表。若要精確指定，請設 ACCESS_TABLE_NAMES 或 --access-tables=。`,
      );
      return { tables: [...allNames], warnings };
    }
    warnings.push(
      `已依 MySQL 表名子字串篩選 Access 表（舊版相容）。精確控制請用 --access-tables=表1,表2。`,
    );
    return { tables: filtered, warnings };
  }

  return { tables: [...allNames], warnings };
}

function analyzeAccessTable(
  reader: MDBReader,
  tableName: string,
  config: AnalyzeConfig,
): {
  columns: Column[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
} | null {
  logHuman(
    config,
    `\n${'='.repeat(80)}\n📋 分析 Access 資料表: ${tableName}\n${'='.repeat(80)}`,
  );

  try {
    const table = reader.getTable(tableName);
    const columns = table.getColumns();
    const totalRows = table.rowCount;

    logHuman(config, `\n📊 欄位資訊 (共 ${columns.length} 個欄位):\n${'-'.repeat(80)}`);

    columns.forEach((col, index) => {
      const colName = convertBig5ToUtf8(col.name) as string;
      logHuman(
        config,
        `\n${index + 1}. ${colName}\n   類型: ${col.type}` +
          (col.size ? `\n   大小: ${col.size}` : '') +
          `\n   可為空: ${col.nullable ? '是' : '否'}` +
          (col.fixedLength ? `\n   固定長度: 是` : '') +
          (col.autoLong ? `\n   自動遞增: 是` : '') +
          (col.precision !== undefined ? `\n   精度: ${col.precision}` : '') +
          (col.scale !== undefined ? `\n   小數位數: ${col.scale}` : ''),
      );
    });

    let sampleRows: Record<string, unknown>[] = [];
    if (!config.skipSamples && config.sampleLimit > 0) {
      const colNames = new Set(columns.map((c) => c.name));
      let colsArg: readonly string[] | undefined;
      if (config.sampleColumns?.length) {
        const ok = config.sampleColumns.filter((c) => colNames.has(c));
        const bad = config.sampleColumns.filter((c) => !colNames.has(c));
        for (const b of bad) {
          logErr(`   ⚠️  略過不存在的欄位（sample-columns）: "${b}"`);
        }
        if (ok.length) colsArg = ok;
      }

      sampleRows = table.getData({
        rowOffset: config.sampleOffset,
        rowLimit: config.sampleLimit,
        ...(colsArg ? { columns: colsArg } : {}),
      }) as Record<string, unknown>[];

      logHuman(
        config,
        `\n📝 樣本資料 (rowOffset=${config.sampleOffset}, rowLimit=${config.sampleLimit}):`,
      );
      logHuman(config, '-'.repeat(80));

      if (sampleRows.length === 0) {
        logHuman(config, '   (無資料)');
      } else {
        sampleRows.forEach((row, index) => {
          logHuman(config, `\n   記錄 ${index + 1}:`);
          const convertedRow = convertObjectBig5ToUtf8(row) as Record<
            string,
            unknown
          >;
          Object.entries(convertedRow).forEach(([key, value]) => {
            const valueStr =
              value === null || value === undefined
                ? 'NULL'
                : typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value);
            const truncatedValue =
              valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr;
            logHuman(config, `     ${key}: ${truncatedValue}`);
          });
        });
      }
    } else if (config.skipSamples || config.sampleLimit === 0) {
      logHuman(config, '\n📝 樣本資料: （已略過，見 ACCESS_SKIP_SAMPLES / --no-samples 或 sample-limit=0）');
    }

    logHuman(config, `\n📊 總筆數 (rowCount): ${totalRows}`);

    const utf8Samples = sampleRows.map(
      (r) => convertObjectBig5ToUtf8(r) as Record<string, unknown>,
    );
    return { columns, sampleRows: utf8Samples, totalRows };
  } catch (error) {
    logErr(`   ❌ 分析失敗 (${tableName}): ${error}`);
    return null;
  }
}

async function getMySQLTableStructure(
  dataSource: DataSource,
  tableName: string,
  config: AnalyzeConfig,
) {
  logHuman(
    config,
    `\n${'='.repeat(80)}\n📋 分析 MySQL 資料表: ${tableName}\n${'='.repeat(80)}`,
  );

  try {
    const columns = await dataSource.query(
      `SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
      ORDER BY ORDINAL_POSITION`,
      [TARGET_DB, tableName],
    );

    if (columns.length === 0) {
      logHuman(config, `   ⚠️  資料表 ${tableName} 不存在`);
      return null;
    }

    logHuman(config, `\n📊 欄位資訊 (共 ${columns.length} 個欄位):\n${'-'.repeat(80)}`);

    columns.forEach((col: Record<string, unknown>, index: number) => {
      logHuman(
        config,
        `\n${index + 1}. ${col.COLUMN_NAME}\n   類型: ${col.DATA_TYPE}` +
          (col.CHARACTER_MAXIMUM_LENGTH
            ? `\n   長度: ${col.CHARACTER_MAXIMUM_LENGTH}`
            : '') +
          `\n   可為空: ${col.IS_NULLABLE === 'YES' ? '是' : '否'}` +
          (col.COLUMN_DEFAULT !== null && col.COLUMN_DEFAULT !== undefined
            ? `\n   預設值: ${col.COLUMN_DEFAULT}`
            : '') +
          (col.COLUMN_KEY ? `\n   索引: ${col.COLUMN_KEY}` : '') +
          (col.EXTRA ? `\n   額外: ${col.EXTRA}` : ''),
      );
    });

    return columns as Record<string, unknown>[];
  } catch (error) {
    logErr(`   ❌ MySQL 結構讀取失敗: ${error}`);
    return null;
  }
}

function compareTableStructures(
  accessColumns: Column[],
  mysqlColumns: Record<string, unknown>[],
  accessTableName: string,
  mysqlTableName: string,
  config: AnalyzeConfig,
) {
  logHuman(
    config,
    `\n${'='.repeat(80)}\n🔍 對比分析: ${accessTableName} <-> ${mysqlTableName}\n${'='.repeat(80)}`,
  );

  const accessColumnNames = accessColumns.map((col) => col.name);
  const mysqlColumnNames = mysqlColumns.map((col) => col.COLUMN_NAME as string);

  const commonColumns = accessColumnNames.filter((name) =>
    mysqlColumnNames.includes(name),
  );
  const onlyInAccess = accessColumnNames.filter(
    (name) => !mysqlColumnNames.includes(name),
  );
  const onlyInMySQL = mysqlColumnNames.filter(
    (name) => !accessColumnNames.includes(name),
  );

  logHuman(config, `\n✅ 共同欄位 (${commonColumns.length} 個):`);
  if (commonColumns.length > 0) {
    commonColumns.forEach((col) => {
      const accessCol = accessColumns.find((c) => c.name === col);
      const mysqlCol = mysqlColumns.find((c) => c.COLUMN_NAME === col);
      const colNameUtf8 = convertBig5ToUtf8(col) as string;
      logHuman(
        config,
        `   - ${colNameUtf8}\n     Access: ${accessCol?.type || 'N/A'}\n     MySQL: ${mysqlCol?.DATA_TYPE || 'N/A'}`,
      );
    });
  } else {
    logHuman(config, '   (無)');
  }

  if (onlyInAccess.length > 0) {
    logHuman(config, `\n⚠️  只在 Access 中的欄位 (${onlyInAccess.length} 個):`);
    onlyInAccess.forEach((col) => {
      const accessCol = accessColumns.find((c) => c.name === col);
      const colNameUtf8 = convertBig5ToUtf8(col) as string;
      logHuman(config, `   - ${colNameUtf8} (${accessCol?.type || 'N/A'})`);
    });
  }

  if (onlyInMySQL.length > 0) {
    logHuman(config, `\n⚠️  只在 MySQL 中的欄位 (${onlyInMySQL.length} 個):`);
    onlyInMySQL.forEach((col) => {
      const mysqlCol = mysqlColumns.find((c) => c.COLUMN_NAME === col);
      logHuman(config, `   - ${col} (${mysqlCol?.DATA_TYPE || 'N/A'})`);
    });
  }

  return { commonColumns, onlyInAccess, onlyInMySQL };
}

async function analyzeAccess() {
  const config = parseConfig();
  let targetDataSource: DataSource | null = null;

  const jsonTables: Record<string, unknown>[] = [];

  try {
    if (!config.accessFilePath) {
      logErr('❌ 錯誤：請提供 Access 檔案路徑');
      if (!config.json) {
        console.log(`使用方法：
  npm run analyze-access -- <access-file-path> [--flags...]
  npm run analyze-access -- <path.mdb> <mysql-table-name>   # 舊版：第二參數 = MySQL 表名

常用 flags：
  --access-tables=表1,表2     只分析這些表（名稱須與 .mdb 內完全一致）
  --sample-offset=N           樣本起始列（0-based，mdb-reader 語意）
  --sample-limit=N            樣本筆數上限（預設 5；0 表示不讀樣本列）
  --sample-columns=a,b        只讀這些欄（可減少 I/O）
  --no-samples                不讀任何資料列（只看 schema + rowCount）
  --mysql-table=name          與 MySQL 做欄位對照（需 DB_*）
  --json                      僅 stdout 輸出一個 JSON（適合 agent 解析）

環境變數：ACCESS_FILE_PATH, ACCESS_TABLE_NAMES, ACCESS_SAMPLE_ROW_OFFSET,
  ACCESS_SAMPLE_ROW_LIMIT, ACCESS_SAMPLE_COLUMNS, ACCESS_SKIP_SAMPLES,
  MYSQL_TABLE_NAME, ACCESS_ANALYZE_JSON, ACCESS_DB_PASSWORD`);
      }
      process.exit(1);
    }

    const ext = extname(config.accessFilePath).toLowerCase();
    if (!['.mdb', '.accdb'].includes(ext)) {
      logErr(
        `❌ 路徑必須為 .mdb 或 .accdb 檔案，目前副檔名: "${ext || '(無)'}"（若誤用目錄請改 ACCESS_FILE_PATH）`,
      );
      process.exit(1);
    }
    if (!existsSync(config.accessFilePath) || !statSync(config.accessFilePath).isFile()) {
      logErr(`❌ 找不到檔案或不是一般檔案: ${config.accessFilePath}`);
      process.exit(1);
    }

    logHuman(config, '🔍 開始分析 Access 資料庫...');
    logHuman(config, `📁 Access 檔案: ${config.accessFilePath}`);
    if (config.mysqlTableName) {
      logHuman(config, `📊 目標 MySQL 資料表: ${config.mysqlTableName}`);
      logHuman(config, `📊 目標資料庫: ${TARGET_DB}`);
      logHuman(config, `🔌 資料庫主機: ${dbConfig.host}:${dbConfig.port}`);
    }

    logHuman(config, '\n📖 正在讀取 Access 檔案...');
    let reader: MDBReader;
    try {
      const buffer = readFileSync(config.accessFilePath);
      const options = ACCESS_DB_PASSWORD ? { password: ACCESS_DB_PASSWORD } : undefined;
      reader = new MDBReader(buffer, options);
      logHuman(config, '✅ Access 檔案讀取成功');
      if (ACCESS_DB_PASSWORD) logHuman(config, '   (已使用密碼)');
    } catch (error) {
      logErr('❌ 讀取 Access 檔案失敗（路徑、權限、密碼）');
      throw error;
    }

    const accessTableNames = reader.getTableNames({ normalTables: true });
    logHuman(config, `\n📋 找到 ${accessTableNames.length} 個資料表:`);
    accessTableNames.forEach((name, index) => {
      logHuman(config, `   ${index + 1}. ${name}`);
    });

    const { tables: finalTablesToAnalyze, warnings } = resolveTablesToAnalyze(
      accessTableNames,
      config,
    );
    for (const w of warnings) logErr(`   ⚠️  ${w}`);

    if (finalTablesToAnalyze.length === 0) {
      logErr('❌ 沒有任何資料表可分析（請檢查 --access-tables / ACCESS_TABLE_NAMES）');
      process.exit(1);
    }

    if (config.mysqlTableName) {
      logHuman(config, '\n🔌 正在連接 MySQL 資料庫...');
      targetDataSource = new DataSource({
        type: 'mysql',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.user,
        password: dbConfig.password,
        database: TARGET_DB,
        synchronize: false,
        charset: 'utf8mb4',
        extra: {
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
          connectionLimit: 10,
          acquireTimeout: 60000,
          timeout: 60000,
          reconnect: true,
          reconnectTries: 3,
          reconnectInterval: 1000,
        },
      });
      await targetDataSource.initialize();
      logHuman(config, '✅ MySQL 資料庫連接成功');
    }

    let mysqlColumnsCache: Record<string, unknown>[] | null = null;
    if (config.mysqlTableName && targetDataSource) {
      mysqlColumnsCache = await getMySQLTableStructure(
        targetDataSource,
        config.mysqlTableName,
        config,
      );
    }

    for (const tableName of finalTablesToAnalyze) {
      const accessAnalysis = analyzeAccessTable(reader, tableName, config);
      let compare: ReturnType<typeof compareTableStructures> | undefined;

      if (config.mysqlTableName && targetDataSource && accessAnalysis && mysqlColumnsCache) {
        compare = compareTableStructures(
          accessAnalysis.columns,
          mysqlColumnsCache,
          tableName,
          config.mysqlTableName,
          config,
        );
      }

      if (config.json && accessAnalysis) {
        jsonTables.push({
          name: tableName,
          rowCount: accessAnalysis.totalRows,
          columns: accessAnalysis.columns.map(serializeColumn),
          sampleRows: accessAnalysis.sampleRows,
          sampleOffset: config.sampleOffset,
          sampleLimit: config.sampleLimit,
          ...(compare
            ? {
                compareToMysql: config.mysqlTableName,
                compare: {
                  commonColumns: compare.commonColumns,
                  onlyInAccess: compare.onlyInAccess,
                  onlyInMySQL: compare.onlyInMySQL,
                },
              }
            : {}),
        });
      }
    }

    logHuman(config, '\n' + '='.repeat(80) + '\n✅ 分析完成！\n' + '='.repeat(80));

    if (config.json) {
      const payload = {
        ok: true,
        accessFilePath: config.accessFilePath,
        options: {
          accessTableNames: config.accessTableNames,
          sampleOffset: config.sampleOffset,
          sampleLimit: config.sampleLimit,
          sampleColumns: config.sampleColumns,
          skipSamples: config.skipSamples,
          mysqlTableName: config.mysqlTableName || null,
        },
        tableNamesInFile: accessTableNames,
        tablesAnalyzed: finalTablesToAnalyze,
        tables: jsonTables,
      };
      console.log(JSON.stringify(payload, replacerJson, 2));
    }
  } catch (error) {
    logErr('\n❌ 發生錯誤：');
    if (error instanceof Error) {
      logErr(`   錯誤訊息: ${error.message}`);
      if (error.stack && !config.json) {
        logErr('\n   堆疊追蹤:');
        error.stack
          .split('\n')
          .slice(0, 10)
          .forEach((line) => logErr('   ' + line));
      }
    } else {
      logErr(`   錯誤: ${error}`);
    }
    if (config.json) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            accessFilePath: config.accessFilePath,
          },
          replacerJson,
          2,
        ),
      );
    }
    process.exit(1);
  } finally {
    if (targetDataSource?.isInitialized) {
      await targetDataSource.destroy();
      logHuman(config, '\n🔌 MySQL 資料庫連接已關閉');
    }
  }
}

function replacerJson(_key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString();
  return value;
}

analyzeAccess().catch((error) => {
  logErr(`❌ 未預期的錯誤：${error}`);
  process.exit(1);
});

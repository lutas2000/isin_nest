/**
 * 從 migration-reports/isin/json/*.samples.json 產出符合
 * access-migration-report/SKILL.md 的單檔遷移盤點 Markdown。
 * 權威檔案路徑依 LEGACY_ACCESS_MDB_INVENTORY.md「同名檔主檔判定」解析。
 *
 * 用法（專案根）：
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/generate-isin-migration-reports.ts
 *   npx ts-node ... scripts/generate-isin-migration-reports.ts --refresh-json   # 先對每檔重跑 analyze-access 再組版
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, basename, posix } from 'path';
import { execSync } from 'child_process';

import { parseMasterRelFromInventoryMarkdown } from './access-mdb-duplicates';

const ROOT = resolve(__dirname, '..');
const INVENTORY_MD = join(
  ROOT,
  '.agent/skills/analyze-access-database/LEGACY_ACCESS_MDB_INVENTORY.md',
);
const NAS_ROOT = (process.env.ACCESS_MDB_ROOT || '/nas/isin').replace(/\\/g, '/');
const JSON_DIR = join(
  ROOT,
  '.agent/skills/analyze-access-database/migration-reports/isin/json',
);
const OUT_DIR = join(
  ROOT,
  '.agent/skills/analyze-access-database/migration-reports/isin',
);

const INVENTORY_FILES = [
  'Should.mdb',
  'acmaster.mdb',
  'acstation.mdb',
  'audit.mdb',
  'bank.mdb',
  'bought.mdb',
  'cust.mdb',
  'dcst.mdb',
  'dcsttmp.mdb',
  'dwgroup.mdb',
  'focus.mdb',
  'inventory.mdb',
  'manager.mdb',
  'master.mdb',
  'order.mdb',
  'personel.mdb',
  'phrase.mdb',
  'pin.mdb',
  'plan.mdb',
  'quote.mdb',
  'quotehis.mdb',
  'show.mdb',
  'sold.mdb',
  'station.mdb',
  'super.mdb',
  'super2.mdb',
  'supp.mdb',
  'uselog.mdb',
  'withdraw.mdb',
  'workout.mdb',
  'workplan.mdb',
  'zip.mdb',
] as const;

interface Col {
  name: string;
  type: string;
  size?: number;
  nullable?: boolean;
}

interface TableJson {
  name: string;
  rowCount: number;
  columns: Col[];
  sampleRows: Record<string, unknown>[];
}

interface Payload {
  ok: boolean;
  accessFilePath: string;
  options: {
    sampleLimit: number;
    sampleOffset: number;
    skipSamples: boolean;
  };
  tableNamesInFile: string[];
  tables: TableJson[];
}

function stemToReportName(file: string): string {
  const s = basename(file, '.mdb');
  return `${s.toUpperCase()}_MDB_MIGRATION_REPORT.md`;
}

function jsonStem(file: string): string {
  return basename(file, '.mdb');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return truncate(JSON.stringify(v), 80);
  return truncate(String(v), 120);
}

const SEM_HINTS: [RegExp, string][] = [
  [/cust.?no|custno|^cno$/i, '客戶／公司代碼'],
  [/^cno$/i, '客戶代碼'],
  [/^qno$/i, '報價／訂單單號類鍵'],
  [/^ono$/i, '訂單號'],
  [/factor/i, '廠商／供應商代碼或名稱'],
  [/actor/i, '業務／經辦人員'],
  [/^kno$/i, '大類／種類代碼'],
  [/^kname$/i, '大類名稱'],
  [/zip/i, '郵遞區號'],
  [/addr/i, '地址'],
  [/tel|phone|fax/i, '電話／傳真'],
  [/name$/i, '名稱'],
  [/date/i, '日期（可能為民國年文字）'],
  [/userid|user_?id/i, '使用者帳號'],
  [/pass|pwd|pin/i, '密碼／PIN（遷移時勿記 log）'],
  [/price|amt|money|total|cost/i, '金額／單價'],
  [/qty|quantity|qnt/i, '數量'],
  [/memo|note|remark/i, '備註'],
  [/f\d+$/i, '未具名欄位（需對照程式）'],
];

function inferSemantic(col: Col, samples: unknown[]): string {
  const n = col.name;
  for (const [re, hint] of SEM_HINTS) {
    if (re.test(n)) return hint;
  }
  const nonEmpty = samples.filter((x) => x !== null && x !== undefined && String(x).trim() !== '');
  if (nonEmpty.length === 0) return '無樣本列，需對照程式';
  const first = String(nonEmpty[0]);
  if (/^\d{3,8}$/.test(first)) return '數字代碼（可能為外鍵或序號）';
  if (/^\s*\d{2,3}\.\d{2}\.\d{2}/.test(first)) return '民國年日期文字';
  return '不明（建議對照舊程式與業務）';
}

function pgHint(col: Col): string {
  const t = col.type;
  const sz = col.size;
  if (t === 'text' || t === 'memo') {
    if (typeof sz === 'number' && sz > 0 && sz < 8000) return `varchar(${sz})`;
    return 'text';
  }
  if (t === 'integer' || t === 'long') return col.size === 2 ? 'smallint' : 'integer';
  if (t === 'double' || t === 'float') return 'double precision';
  if (t === 'boolean' || t === 'byte') return 'smallint';
  if (t === 'datetime' || t === 'date') return 'timestamp 或 date（視解析）';
  if (t === 'currency') return 'numeric(18,4)';
  if (t === 'ole' || t === 'binary') return 'bytea 或 legacy_opaque';
  return `text（${t}）`;
}

function tablePurposeGuess(t: TableJson): string {
  const n = t.name.toLowerCase();
  const cols = t.columns.map((c) => c.name.toLowerCase()).join(' ');
  if (/log|use|audit/.test(n)) return '稽核／使用紀錄';
  if (/cust|client|dcst/.test(n) || /cust/.test(cols)) return '客戶主檔或衍生';
  if (/quote|qno|item|line/.test(n + cols)) return '報價／明細';
  if (/order|sold|gtable|itable|jtable/.test(n + cols)) return '訂單／出貨／交易明細';
  if (/supp|vendor|factor/.test(n + cols)) return '供應商／廠商';
  if (/bank/.test(n)) return '銀行／帳戶字典';
  if (/zip/.test(n)) return '郵遞區號對照';
  if (/phrase|pin|plan|show|focus/.test(n)) return '選項／片語／畫面設定';
  if (/master|acmaster|kind|sys/.test(n + cols)) return '主檔／系統參考';
  if (/person|station|manager|super/.test(n)) return '人員／站所／權限';
  if (t.rowCount === 0) return '結構預留或已清空';
  if (t.rowCount === 1) return '單列設定';
  return '業務資料（需對照程式）';
}

function overallRole(file: string, _tables: TableJson[]): string {
  const f = file.toLowerCase();
  if (/order|sold|workplan|quote|quotehis|bought|withdraw/.test(f))
    return '交易／報價／工單類業務資料庫';
  if (/cust|dcst|dwgroup|supp/.test(f)) return '客戶／群組／供應商主檔或彙總';
  if (/acmaster|master|zip|bank|phrase|pin|plan|show|focus/.test(f))
    return '參考主檔、字典或系統選項';
  if (/audit|uselog|acstation|station|manager|personel|super/.test(f))
    return '稽核、登入、人員或站所設定';
  return 'Legacy 支援資料庫';
}

function mergeConsecutiveFcolumns(columns: Col[]): { spec: string; cols: Col[] }[] {
  const out: { spec: string; cols: Col[] }[] = [];
  let i = 0;
  while (i < columns.length) {
    const c = columns[i];
    const m = /^f(\d+)$/i.exec(c.name);
    if (m) {
      let j = i + 1;
      while (j < columns.length) {
        const mj = /^f(\d+)$/i.exec(columns[j].name);
        if (
          !mj ||
          columns[j].type !== c.type ||
          columns[j].size !== c.size ||
          columns[j].nullable !== c.nullable
        )
          break;
        j++;
      }
      if (j - i >= 3) {
        out.push({
          spec: `\`${columns[i].name}\` … \`${columns[j - 1].name}\``,
          cols: columns.slice(i, j),
        });
        i = j;
        continue;
      }
    }
    out.push({ spec: `\`${c.name}\``, cols: [c] });
    i++;
  }
  return out;
}

function renderColumnSection(t: TableJson): string {
  const groups = mergeConsecutiveFcolumns(t.columns);
  const allHaveSize = t.columns.every((c) => typeof c.size === 'number' && c.size > 0);
  const useSizeTable = allHaveSize;

  let md = '';
  for (const g of groups) {
    const rep = g.cols[0];
    const samplesByCol: Record<string, unknown[]> = {};
    for (const c of g.cols) {
      samplesByCol[c.name] = t.sampleRows.map((r) => r[c.name]);
    }
    const sem =
      g.cols.length > 1
        ? '多個同型未命名欄；可能為授權、緩衝或批次欄位（需對照程式）'
        : inferSemantic(rep, samplesByCol[rep.name] || []);

    if (useSizeTable && typeof rep.size === 'number') {
      md += `| ${g.spec} | ${rep.type} | ${rep.size} | ${rep.nullable ? 'Y' : 'N'} | ${pgHint(rep)} | ${sem} |\n`;
    } else {
      md += `| ${g.spec} | ${rep.type} | ${rep.nullable ? 'Y' : 'N'} | ${pgHint(rep)} | ${sem} |\n`;
    }
  }

  const header = useSizeTable
    ? '| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |\n| --- | --- | ---: | --- | --- | --- |\n'
    : '| 欄位 | Access 型別 | NULL | 遷移建議 | 可能意義 |\n| --- | --- | --- | --- | --- |\n';

  return header + md;
}

function buildMarkdown(file: string, payload: Payload, masterRel: string): string {
  const titleName = file;
  const authority = posix.join(NAS_ROOT, masterRel.replace(/\\/g, '/'));
  const utc = new Date().toISOString().slice(0, 10);
  const nTables = payload.tableNamesInFile.length;
  const opts = payload.options;
  const analysisLine = `\`npm run analyze-access -- "${authority}" --json --no-samples\`；含樣本：\`--json --sample-offset=${opts.sampleOffset} --sample-limit=${opts.sampleLimit}\`；字串經腳本 Big5→UTF-8 轉換。`;
  const role = overallRole(file, payload.tables);

  let s = '';
  s += `# ${titleName} — Legacy Access 遷移盤點報告\n\n`;
  s += '| 項目 | 內容 |\n| --- | --- |\n';
  s += `| **權威檔案路徑** | \`${authority}\`（庫存「同名檔主檔判定」主檔相對路徑：\`${masterRel}\`；歷史盤點檔名對應 \`isin/${file}\`） |\n`;
  s += `| **盤點時間 (UTC)** | ${utc} |\n`;
  s += `| **分析方式** | ${analysisLine} |\n`;
  s += `| **資料表數** | ${nTables}（normalTables，與腳本一致） |\n`;
  s += `| **整體角色** | ${role} |\n\n`;
  s += '---\n\n';
  s += '## 1. 遷移摘要\n\n';
  s +=
    '- **無關聯式 FK 資訊**：本報告依 `mdb-reader` 結構與樣本推斷；Access 內隱藏關聯需另查。\n';
  s +=
    '- **字元編碼**：中文欄位可能為 Big5；目標庫建議 **UTF-8（PostgreSQL `text` / `varchar`）**。\n';
  s +=
    '- **跨檔關聯**：實際關聯多未建 FK，請併同 [`ISIN_LEGACY_ACCESS_MASTER_MIGRATION_REPORT.md`](ISIN_LEGACY_ACCESS_MASTER_MIGRATION_REPORT.md) 之邊清單。\n';
  s +=
    '- **隱私**：報告離庫時請遮罩公司名、統編、電話等；敏感欄位建議 `legacy_opaque` 原樣保存。\n\n';
  s += '---\n\n';
  s += '## 2. 資料表總覽\n\n';
  s += '| 表名 | 列數 | 用途（推斷） |\n| --- | ---: | --- |\n';
  for (const t of payload.tables) {
    s += `| \`${t.name}\` | ${t.rowCount} | ${tablePurposeGuess(t)} |\n`;
  }
  s += '\n---\n\n';
  s += '## 3. 逐表：欄位、型別、遷移型別建議、語意推斷\n\n';

  let idx = 1;
  for (const t of payload.tables) {
    s += `### 3.${idx} \`${t.name}\`（${t.rowCount} 列）\n\n`;
    if (t.rowCount === 1 && t.columns.length > 5) {
      s += '整表近似 **單列設定** 或寬表，遷移可改為 JSON 或 key-value。\n\n';
    }
    s += renderColumnSection(t);
    s += '\n';
    idx++;
  }

  s += '---\n\n';
  s += '## 4. 樣本資料（供遷移驗證）\n\n';
  s +=
    '- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。\n';
  for (const t of payload.tables) {
    s += `- **\`${t.name}\`**：\n`;
    const rows = t.sampleRows.slice(0, 5);
    if (rows.length === 0) {
      s += '  - （無樣本列或表為空）\n';
    } else {
      for (let i = 0; i < rows.length; i++) {
        const bits = Object.entries(rows[i])
          .slice(0, 8)
          .map(([k, v]) => `${k}=${formatVal(v)}`);
        s += `  - 列 ${i}: ${bits.join('; ')}\n`;
      }
    }
  }
  s += '\n---\n\n';
  s += '## 5. 建議之目標綱要（僅供參考，非強制）\n\n';
  s +=
    '1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。\n2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。\n3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。\n\n';
  s += '---\n\n';
  s += '## 6. 重跑分析指令\n\n';
  s += '```bash\n';
  s += `npm run analyze-access -- "${authority}" --json --no-samples\n`;
  s += `npm run analyze-access -- "${authority}" --json --sample-limit=20\n`;
  s += '```\n\n';
  s += '---\n\n';
  s += '*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*\n';
  return s;
}

function refreshJsonArtifacts(masterMap: Map<string, string>): void {
  mkdirSync(JSON_DIR, { recursive: true });
  for (const file of INVENTORY_FILES) {
    const key = file.toLowerCase();
    const masterRel = masterMap.get(key) ?? `isin/${file}`;
    const abs = posix.join(NAS_ROOT, masterRel);
    const jstem = jsonStem(file);
    const noSamples = join(JSON_DIR, `${jstem}.no-samples.json`);
    const samples = join(JSON_DIR, `${jstem}.samples.json`);
    const errLog = join(JSON_DIR, `${jstem}.stderr.log`);
    console.log('analyze (no samples):', abs);
    execSync(
      `npm run -s analyze-access -- "${abs}" --json --no-samples > "${noSamples}" 2> "${errLog}"`,
      { cwd: ROOT, shell: '/bin/bash', stdio: 'ignore' },
    );
    console.log('analyze (samples):', abs);
    execSync(
      `npm run -s analyze-access -- "${abs}" --json --sample-limit=15 > "${samples}" 2>> "${errLog}"`,
      { cwd: ROOT, shell: '/bin/bash', stdio: 'ignore' },
    );
  }
}

function main() {
  const refreshJson = process.argv.includes('--refresh-json');
  if (!existsSync(INVENTORY_MD)) {
    console.error('Missing inventory:', INVENTORY_MD);
    process.exit(1);
  }
  const masterMap = parseMasterRelFromInventoryMarkdown(readFileSync(INVENTORY_MD, 'utf8'));

  if (refreshJson) {
    refreshJsonArtifacts(masterMap);
  }

  if (!existsSync(JSON_DIR)) {
    console.error('Missing JSON dir:', JSON_DIR);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const file of INVENTORY_FILES) {
    const key = file.toLowerCase();
    const masterRel = masterMap.get(key) ?? `isin/${file}`;
    const jstem = jsonStem(file);
    const jpath = join(JSON_DIR, `${jstem}.samples.json`);
    if (!existsSync(jpath)) {
      console.error('Missing:', jpath, '(run with --refresh-json)');
      process.exit(1);
    }
    const payload = JSON.parse(readFileSync(jpath, 'utf8')) as Payload;
    if (!payload.ok || !payload.tables) {
      console.error('Bad payload:', jpath);
      process.exit(1);
    }
    const md = buildMarkdown(file, payload, masterRel);
    const outFile = join(OUT_DIR, stemToReportName(file));
    writeFileSync(outFile, md, 'utf8');
    console.log('Wrote', outFile);
  }
}

main();

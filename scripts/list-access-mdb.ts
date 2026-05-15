/**
 * 遞迴列出指定根目錄下所有 .mdb / .accdb（唯讀），可選寫入庫存 Markdown。
 *
 * 用法（專案根目錄）：
 *   npm run list-access-mdb [根目錄]
 *   npm run list-access-mdb -- /nas/isin --write
 *   ACCESS_MDB_ROOT=/nas/isin npm run list-access-mdb
 *
 * 選項：
 *   --write   將結果寫入預設庫存檔（見 DEFAULT_INVENTORY_REL）
 *   --json    僅輸出 JSON 陣列至 stdout（不寫檔）
 */

import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, relative, resolve } from 'path';

import {
  computeDuplicateMasters,
  formatDuplicateMarkdownSection,
} from './access-mdb-duplicates';

const DEFAULT_ROOT = process.env.ACCESS_MDB_ROOT || '/nas/isin';
/** 相對於專案根目錄的庫存輸出路徑 */
const DEFAULT_INVENTORY_REL =
  '.agent/skills/analyze-access-database/LEGACY_ACCESS_MDB_INVENTORY.md';

const exts = new Set(['.mdb', '.accdb']);

function walk(dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`無法讀取目錄: ${dir}\n${msg}`);
    process.exitCode = 1;
    return;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p, out);
      continue;
    }
    if (exts.has(extname(ent.name).toLowerCase())) out.push(p);
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function main() {
  const raw = process.argv.slice(2);
  const flags = new Set(raw.filter((a) => a.startsWith('--')));
  const positionals = raw.filter((a) => !a.startsWith('--'));
  const wantWrite = flags.has('--write');
  const wantJson = flags.has('--json');
  const root = resolve(positionals[0] || DEFAULT_ROOT);

  const paths: string[] = [];
  walk(root, paths);
  paths.sort();

  const rows = paths.map((abs) => {
    const st = statSync(abs);
    return {
      path: abs,
      rel: relative(root, abs) || '.',
      size: st.size,
      mtimeMs: st.mtimeMs,
    };
  });

  if (wantJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const iso = new Date().toISOString();
  console.log(`根目錄: ${root}`);
  console.log(`掃描時間 (UTC): ${iso}`);
  console.log(`檔案數: ${rows.length}`);
  console.log('');
  for (const r of rows) {
    console.log(`${r.path}\t${formatBytes(r.size)}\t${new Date(r.mtimeMs).toISOString()}`);
  }

  if (wantWrite) {
    const projectRoot = resolve(__dirname, '..');
    const outPath = resolve(projectRoot, DEFAULT_INVENTORY_REL);
    const mdbRowsForDup = rows.map((r) => ({
      rel: r.rel.replace(/\\/g, '/'),
      size: r.size,
      mtimeMs: r.mtimeMs,
    }));
    const dupMap = computeDuplicateMasters(mdbRowsForDup);
    const dupSection = formatDuplicateMarkdownSection(root, mdbRowsForDup, dupMap);

    const md = [
      '# Legacy Access 檔案庫存（.mdb / .accdb）',
      '',
      '此檔由 `npm run list-access-mdb -- --write` 產生，請勿手動維護**主檔案表**內容；要更新請重跑指令。（**「同名檔主檔判定」** 一節亦由同一指令自動寫入。）',
      '',
      `| 根目錄 | \`${root}\` |`,
      `| 掃描時間 (UTC) | ${iso} |`,
      `| 檔案數 | ${rows.length} |`,
      '',
      '| 相對路徑 | 大小 | 修改時間 (UTC) |',
      '| --- | --- | --- |',
      ...rows.map(
        (r) =>
          `| \`${r.rel.replace(/\\/g, '/')}\` | ${formatBytes(r.size)} | ${new Date(r.mtimeMs).toISOString()} |`,
      ),
      '',
      dupSection.trimEnd(),
      '',
      '## 說明',
      '',
      '- 若 NAS 掛載於其他路徑，請設 `ACCESS_MDB_ROOT` 或傳入第一個參數。',
      '- **同名主檔**：見上一節「同名檔主檔判定」；遷移與 `analyze-access` 應以該節 **主檔相對路徑** 為準。若與實際業務不符請人工覆核後再掃描寫回。',
      '',
    ].join('\n');
    writeFileSync(outPath, md, 'utf-8');
    console.log('');
    console.log(`已寫入: ${outPath}`);
  }
}

main();

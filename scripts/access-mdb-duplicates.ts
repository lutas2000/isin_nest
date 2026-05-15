/**
 * 偵測「根目錄」與「isin/」下同檔名 .mdb/.accdb，並依修改時間（優先）、
 * 同分時依檔案大小決定主檔。供 list-access-mdb 與 generate-isin-migration-reports 共用。
 */

export interface MdbRow {
  rel: string;
  size: number;
  mtimeMs: number;
}

export interface DupMaster {
  /** 相對於掃描根目錄的路徑，例如 `order.mdb` 或 `isin/order.mdb` */
  masterRel: string;
  rootRel: string;
  isinRel: string;
  reason: string;
}

function basenameKey(rel: string): string {
  const seg = rel.split(/[/\\]/).pop() || rel;
  return seg.toLowerCase();
}

function isUnderIsin(rel: string): boolean {
  const n = rel.replace(/\\/g, '/');
  return n === 'isin' || n.startsWith('isin/');
}

/** 僅處理「一筆在根、一筆在 isin/」且檔名相同（不分大小寫）之成對列。 */
export function computeDuplicateMasters(rows: MdbRow[]): Map<string, DupMaster> {
  const byKey = new Map<string, MdbRow[]>();
  for (const r of rows) {
    const k = basenameKey(r.rel);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }

  const out = new Map<string, DupMaster>();

  for (const [key, group] of byKey) {
    if (group.length !== 2) continue;
    const a = group[0];
    const b = group[1];
    const ai = isUnderIsin(a.rel);
    const bi = isUnderIsin(b.rel);
    if (ai === bi) continue;
    const rootRow = ai ? b : a;
    const isinRow = ai ? a : b;

    let masterRel: string;
    let reason: string;

    if (rootRow.mtimeMs !== isinRow.mtimeMs) {
      const newer = rootRow.mtimeMs > isinRow.mtimeMs ? rootRow : isinRow;
      masterRel = newer.rel;
      reason =
        newer === rootRow
          ? '根下檔案修改時間較新（UTC）'
          : '`isin/` 下檔案修改時間較新（UTC）';
    } else if (rootRow.size !== isinRow.size) {
      const larger = rootRow.size > isinRow.size ? rootRow : isinRow;
      masterRel = larger.rel;
      reason =
        larger === rootRow
          ? '修改時間相同；根下檔案較大（視為較完整）'
          : '修改時間相同；`isin/` 下檔案較大（視為較完整）';
    } else {
      masterRel = rootRow.rel;
      reason = '時間與大小皆相同；預設根下為主檔（建議人工覆核）';
    }

    out.set(key, {
      masterRel,
      rootRel: rootRow.rel,
      isinRel: isinRow.rel,
      reason,
    });
  }

  return out;
}

export function formatDuplicateMarkdownSection(
  rootAbs: string,
  rows: MdbRow[],
  dups: Map<string, DupMaster>,
): string {
  const lines: string[] = [
    '## 同名檔主檔判定（根目錄與 `isin/` 子資料夾）',
    '',
    '掃描根目錄下，**檔名相同**（不分大小寫）且分別位於 **根**（直接子檔）與 **`isin/` 子資料夾** 之成對檔案，主檔依：**(1) 較新修改時間** → **(2) 同分時較大檔案** → **(3) 仍同分則預設根下**（並建議人工覆核）。',
    '',
    '| 檔名 | 主檔相對路徑 | 判定依據 |',
    '| --- | --- | --- |',
  ];

  const keys = [...dups.keys()].sort();
  for (const k of keys) {
    const d = dups.get(k)!;
    const displayName = d.masterRel.split(/[/\\]/).pop() || k;
    lines.push(
      `| \`${displayName}\` | \`${d.masterRel}\` | ${d.reason.replace(/\|/g, '\\|')} |`,
    );
  }

  if (keys.length === 0) {
    lines.push('| （無成對同名檔） | — | — |');
  }

  lines.push('');
  lines.push(`- **主檔絕對路徑**：\`${rootAbs}\` + 主檔相對路徑（POSIX \`/\`）。`);
  lines.push(
    '- 遷移盤點報告請以 **主檔相對路徑** 為權威來源；報告檔集中於 `migration-reports/isin/` 時，仍應以本節主檔為實際 `analyze-access` 路徑。',
  );
  lines.push('');

  return lines.join('\n');
}

/** 從已寫入之庫存 Markdown 解析「主檔相對路徑」；key 為檔名小寫（含副檔名）。 */
export function parseMasterRelFromInventoryMarkdown(md: string): Map<string, string> {
  const marker = '## 同名檔主檔判定';
  const i = md.indexOf(marker);
  const map = new Map<string, string>();
  if (i < 0) return map;
  const after = md.slice(i + marker.length);
  const next = after.search(/\n## /m);
  const chunk = next >= 0 ? after.slice(0, next) : after;
  for (const line of chunk.split('\n')) {
    const m = /^\| `([^`]+)` \| `([^`]+)` \|/.exec(line.trim());
    if (!m || m[1] === '檔名') continue;
    const key = m[1].replace(/\\/g, '/').split('/').pop()!.toLowerCase();
    map.set(key, m[2].replace(/\\/g, '/'));
  }
  return map;
}

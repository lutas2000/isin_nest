# `isin/` 路徑 Access 遷移盤點報告（歷史套件對照）

- **掃描根目錄**：預設 **`/nas/isin`**（與 [`LEGACY_ACCESS_MDB_INVENTORY.md`](../../LEGACY_ACCESS_MDB_INVENTORY.md) 一致）。
- **主檔路徑**：**不要**假設實體檔一律在 `/nas/isin/isin/`。請以庫存 **「同名檔主檔判定」** 之 **主檔相對路徑** 為準（多數在根下 `*.mdb`，少數在 `isin/*.mdb`）；各子報告 **權威檔案路徑** 已對齊該判定。
- **目錄命名**：`migration-reports/isin/` 僅為舊盤點「`isin/` 子資料夾套件」之**歷史對照**；報告檔名仍用 `{STEM}_MIGRATION_REPORT.md`（`STEM` = 檔名去副檔名轉大寫）。
- **機器產物**：`json/` 下 `*.samples.json`／`*.no-samples.json`（JSON 內 `accessFilePath` 指向實際主檔）。
- **再生**：於 repo 根目錄  
  - 僅組版：`npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/generate-isin-migration-reports.ts`  
  - **依庫存主檔重掃 NAS 並組版**：同上指令加上 **`--refresh-json`**（會呼叫 `npm run analyze-access` 多次）。

## 總報告

- [`ISIN_LEGACY_ACCESS_MASTER_MIGRATION_REPORT.md`](ISIN_LEGACY_ACCESS_MASTER_MIGRATION_REPORT.md) — 必要性矩陣、跨檔推斷關聯、子報告索引。

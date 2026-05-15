---
name: analyze-access-database
description: NAS .mdb/.accdb inventory (list-access-mdb), then analyze-access with precise table selection, row window, optional JSON, optional MySQL column diff; Big5-aware. Use for Access, MDB, ACCDB, /nas/isin, migration recon, or agent-parseable schema dumps.
---

# Analyze Access Database

## Purpose

Standardize how the agent inspects Access in this repo:

1. **庫存**：`scripts/list-access-mdb.ts` 掃描根目錄（預設 `/nas/isin`），`--write` 更新 `LEGACY_ACCESS_MDB_INVENTORY.md`（含自動產生之 **同名檔主檔判定** 一節）。
2. **單檔分析**：`scripts/analyze-access.ts` — **精確選表**、**樣本列視窗**（offset/limit）、可選 **僅 stdout JSON**、**rowCount 不載入全表**；可選 MySQL 欄位對照。
3. 遵守憑證衛生（不讀、不貼 root `.env` 內容）。

## Trigger Conditions

- 盤點 NAS 上 legacy `.mdb` / `.accdb`。
- 要看某個 `.mdb` 的表清單、欄位、**指定列範圍**的樣本、總筆數。
- 遷移／對照：Access 與 **MySQL** 同表欄位差異（此腳本的 SQL 端為 MySQL，與主應用 PostgreSQL 無關）。

## Configuration Hygiene (Mandatory)

- **Never** open, read, or paste repository root `.env` in chat or logs.
- 變數名稱只對照 **`.env.example`**（Access 與 `analyze-access` 區塊）；實際值在使用者本機 `.env`。
- 不向使用者索取密碼明文。

## NAS paths and mounts (reference)

- 慣用 legacy 根目錄：**`/nas/isin`**；其下 **`isin/`** 子目錄常有同名檔，**大小／時間可能不同**，分析前須約定權威路徑。
- 掛載說明見 `scripts/mount-nas-mac.sh`、`NasService`（常見 **`/Volumes/NAS`**）。

## Scripts (reference)

| 腳本 | 用途 |
|------|------|
| `list-access-mdb.ts` | 遞迴列出 `.mdb`/`.accdb`；`--write` → `LEGACY_ACCESS_MDB_INVENTORY.md`（含同名主檔判定）；`--json`。 |
| `analyze-access.ts` | 讀單一檔；`--access-tables` 精確選表；`--sample-offset` / `--sample-limit`；`--sample-columns`；`--no-samples`；`--mysql-table` + `DB_*`；`--json`（**stdout 僅一個 JSON**）。 |

詳細 flag／環境變數以 **`scripts/README.md` §3** 為準。

## Agent / skill 建議流程

1. **確認路徑**：`ACCESS_FILE_PATH` 或 CLI 第一參數必須是 **`.mdb` / `.accdb` 檔案**，不可設成目錄（腳本會拒絕並提示）。
2. **不知表名時**：先跑 `--json` 且不帶 `--access-tables`，從輸出讀 `tableNamesInFile`（必要時加 `--no-samples` 減量）。
3. **已知表名**：`--access-tables=ExactName`（與檔內大小寫一致）；樣本：`--sample-offset` + `--sample-limit`；只要結構：`--no-samples`。
4. **機器解析**：加 `--json`，只解析 **stdout** 的 JSON；警告多在 stderr。
5. **MySQL 對照**：`--mysql-table=...` 且本機 `DB_*` 指向可連的 MySQL；若未指定 `--access-tables`，仍相容舊行為：以 MySQL 表名 **子字串** 篩 Access 表（可能多表）；要一對一請同時給 `--access-tables=OneAccessTable`。
6. 失敗時依 stderr／JSON `ok: false` 排查路徑、副檔名、密碼、MySQL、表名拼字。

## Recorded inventory

- `LEGACY_ACCESS_MDB_INVENTORY.md`（`npm run list-access-mdb -- /nas/isin --write` 產生；內含 **根目錄 vs `isin/` 同名主檔** 判定表）。

## 子技能：遷移盤點報告結構

撰寫或審閱單檔 **Access 遷移盤點** markdown（例：`*_MIGRATION_REPORT.md`）時，請讀 **`access-migration-report/SKILL.md`**：定義章節順序、中繼資料表、§3 欄位表格式與選用子小節。

## Post-Task Documentation Check

- 腳本或 `scripts/README.md` 行為變更時，同步更新本 skill。
- 大範圍盤點後重跑 `list-access-mdb -- --write` 更新庫存。

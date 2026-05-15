---
name: analyze-access-database
description: Discovers legacy Microsoft Access files on NAS, maintains the generated inventory markdown, and analyzes .mdb/.accdb schema and sample rows via scripts/analyze-access.ts; optional MySQL column diff. Use for Access, MDB, ACCDB, /nas/isin, quote.mdb, bulk legacy DB inventory, or Access vs MySQL parity.
---

# Analyze Access Database

## Purpose

Standardize how the agent inspects Access database structure and content in this repo:

1. **庫存**：用 `scripts/list-access-mdb.ts` 掃描 NAS（或任意根目錄）下所有 `.mdb` / `.accdb`，必要時寫入 `LEGACY_ACCESS_MDB_INVENTORY.md`。
2. **單檔分析**：驅動 `scripts/analyze-access.ts`，遵守憑證衛生，解讀 stdout（含 Big5 欄位名）。
3. **可選**：與 MySQL 表做欄位名對照（腳本內建路徑）。

## Trigger Conditions

- 需要**表列或盤點** NAS 上所有 legacy Access 檔（或某根目錄下全部 `.mdb` / `.accdb`）。
- 問 Access 檔版面、表名、欄位、樣本列。
- 遷移或與 MySQL 表做欄位級對照。
- 除錯開啟 Access 檔時的路徑、權限、密碼、編碼。

## Configuration Hygiene (Mandatory)

- **Never** open, read, or paste contents of the repository root `.env` file in chat or logs.
- For **variable names and grouping only**, consult `.env.example`（「Access 相關」與 `analyze-access.ts` 註解）. Users maintain real values in root `.env`; scripts load that file at runtime via `dotenv` from the project root.
- Do not ask the user to paste secrets; prefer confirming that required keys exist in their local `.env` without displaying values.

## NAS paths and mounts (reference)

- 慣用 legacy 根目錄：**`/nas/isin`**（其下另有一層 **`isin/`** 子目錄，內有**同名**檔案；大小與修改時間常不一致，**不得假設為同一檔**）。分析前依業務約定選「根目錄那一層」或「`isin/` 子目錄」為準。
- 本機若未掛載，後端 `NasService` 預設以 **`/Volumes/NAS`** 為掛載基準；macOS 手動掛載可參考 `scripts/mount-nas-mac.sh`（內文說明 `/nas` 與 autofs 衝突時改用 `/Volumes/NAS`）。
- 副檔名可能為**大小寫混合**（例如 `.MDB`）；`list-access-mdb` 會一併掃到。

## How the scripts work (reference)

| 腳本 | 角色 |
| --- | --- |
| `scripts/list-access-mdb.ts` | 遞迴掃描 `ACCESS_MDB_ROOT`（預設 `/nas/isin`）或 CLI 第一參數；`--write` 更新 `LEGACY_ACCESS_MDB_INVENTORY.md`；`--json` 輸出機器可讀 JSON。 |
| `scripts/analyze-access.ts` | 以 `mdb-reader` 開檔；表清單、欄位 meta、每表前 5 筆、列數；Big5 經 `iconv-lite` 轉 UTF-8；可選 `MYSQL_TABLE_NAME` + `DB_*` 連 MySQL 比對 `INFORMATION_SCHEMA`（與主應用 PostgreSQL 無關，僅此比對路徑為 MySQL）。 |

## Recorded inventory (human-readable)

- 路徑：**本資料夾內** `LEGACY_ACCESS_MDB_INVENTORY.md`（由 `npm run list-access-mdb -- <根目錄> --write` 產生，表內為相對根目錄之路徑、大小、mtime）。
- 每次大範圍分析前應**重跑掃描**以免庫存過期。

## Inputs

**庫存**

- 根目錄：CLI 第一參數或環境變數 `ACCESS_MDB_ROOT`（預設 `/nas/isin`）。
- `--write`：寫入預設庫存檔；`--json`：僅 stdout。

**單檔分析（analyze-access）**

- Access 檔路徑（絕對或相對專案）；或 `ACCESS_FILE_PATH`（見 `.env.example`）。
- 可選：`MYSQL_TABLE_NAME`、對應 MySQL 的 `DB_*`。
- 可選：`ACCESS_DB_PASSWORD`。

## Steps

1. 確認任務為**唯讀**（除非使用者明確要求，否則不修改 Access 檔）。
2. **若須盤點或更新庫存**：在專案根目錄執行  
   `npm run list-access-mdb -- /nas/isin --write`  
   （或自訂根目錄；僅列印不寫檔則省略 `--write`。）完成後依需求摘錄給使用者，並以 `LEGACY_ACCESS_MDB_INVENTORY.md` 為準。
3. 若 env 鍵名不確定，**只讀** `.env.example`，不讀 `.env`。
4. **單檔結構／樣本**：依 `scripts/README.md`「Access 資料庫分析腳本」：  
   `npm run analyze-access <access-file-path> [mysql-table-name]`  
   或依 `.env` 的 `ACCESS_FILE_PATH` / `MYSQL_TABLE_NAME` 執行。
5. 解讀 stdout：表清單、欄位、樣本列、列數、可選 Access vs MySQL 差異。
6. 失敗時依腳本訊息排查（路徑、權限、密碼、MySQL、表名過濾），不暴露憑證。

## Outputs

- 庫存任務：檔案數、依子目錄分組的檔名、大小與 mtime 重點；提醒 **`/` 與 `/isin/`** 兩套同名檔需擇一為權威來源。
- 分析任務：相關表與欄位摘要、樣本資料型態；若 compare mode：僅 Access / 僅 MySQL 欄位與型別備註。
- 受阻：下一步（掛載 NAS、修正路徑、密碼、MySQL env、表名）—不讀取 `.env` 內容。

## Post-Task Documentation Check

- 若 `list-access-mdb.ts`、`analyze-access.ts` 或 `scripts/README.md` 行為／參數變更，同步更新**本 skill** 與上述文件。
- 完成一次實際掃描後，應以 `--write` 更新 `LEGACY_ACCESS_MDB_INVENTORY.md`，使庫存與現場一致。

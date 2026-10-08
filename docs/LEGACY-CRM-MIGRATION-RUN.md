# 舊版銷管資料移轉：流程與演練紀錄

> 對應規劃：`LEGACY-CRM-REBUILD-PLAN.md` 第 2、3 節。isin_vb6 時期的 SQLite 版流程與兩次演練見 `../isin_vb6/docs/legacy-migration-run.md`。
> 本文件只記錄筆數與耗時，不記錄資料內容。CSV、摘要、員工編號建議表都含真實資料，放在 Git 以外，用完刪除。

## 工具

| 指令 | 說明 |
|---|---|
| `npm run migration:run` | 建立 `legacy_crm` schema 與全部表、`staff.legacy_crm_code`（migration `1791438513900-CreateLegacyCrmSchema`） |
| `npm run legacy-crm:import -- <CSV 目錄> [--final] [--truncate] [--only=…]` | CSV 匯入 `legacy_crm`；摘要寫到 `<CSV 目錄>.legacy-crm-import.summary.json`，員工編號建議表寫到 `<CSV 目錄>.staff-code-proposals.csv` |
| `npm run legacy-crm:apply-staff-codes -- <建議表> [--dry-run]` | 把 `confirm=Y` 的列寫入 `staff.legacy_crm_code` |

連線設定同 `data-source.ts`（專案根目錄 `.env` 的 `DB_*`）。演練時用環境變數指向測試資料庫，**不要對正式 DB 演練**；環境變數會蓋過 `.env`。匯入程式啟動時會先印出目標 `host:port/db`。

- `--final`：全部步驟同一個 transaction，任一步失敗整批還原。
- 未加 `--final`：每一步各自 commit，失敗的步驟還原後繼續（演練用）。
- `--truncate`：所選步驟的表已有資料時必須加才會清空重匯；`legacy_crm.write_log` 一旦有使用者寫入紀錄（`action <> 'import'`）就拒絕。
- `--only=`：`customer, supplier, bank, phrase, material, part, order, sale, quote, receipt, work, group`。
- 記憶體：工件與明細表一次載入，建議 `NODE_OPTIONS=--max-old-space-size=8192`。

## 流程

1. **確認沒人使用舊系統**，並確認 `\\ISIN\isin` 沒有作業用的 `.ldb`。判斷方式同 isin_vb6 文件，2006–2007 年殘留的 `T*.ldb` 不算。
2. **複製 MDB**。13 個檔：`cust`、`supp`、`personel`、`bank`、`phrase`、`master`、`dcst`、`order`、`sold`、`quote`、`gotten`、`workplan`、`dwgroup`。
   - 目前做法：Win7 `copy /b /v` 到 `\\SERVER\tmp\<名稱>_isin_YYYYMMDD.mdb`。
   - 第 7 階段改為容器內 cifs 唯讀掛載，或改用 `smbclient get`（規劃第 3 節第 6 項）。
3. **匯出 CSV**。
   - 指令：`ISIN_MDB_PASSWORD= sh ../isin_vb6/scripts/export-legacy-mdb-set.sh /Volumes/tmp _isin_YYYYMMDD <新目錄>`。
   - 用的是 Jackcess 2.1.2，jar 在 `../isin-java/Isin/lib`。
   - 第 7 階段要把腳本搬進本專案，並升到 5.0.3。
4. **建立 schema**：在目標 DB 執行 `npm run migration:run`。
5. **匯入**。
   - 指令：`NODE_OPTIONS=--max-old-space-size=8192 npm run legacy-crm:import -- <CSV 目錄> --final`。
   - 失敗時整批還原，修正後重跑。
6. **核對摘要**。
   - 筆數、排除原因：應與下方演練相同，只差新增的資料。
   - 「客戶不在主檔」：只提醒，照樣匯入。
   - 日期統計：
     - `unparsed`：無法解析。
     - `nonCanonical`：寫法不標準，原字串存在 `*_raw`。
     - `outOfRange`：年份可疑，照樣存。
7. **員工編號**。
   - 打開建議表，人工確認 `confirm` 欄。只有雙方都在職且姓名唯一對上的列會預填 `Y`。
   - 確認後執行 `npm run legacy-crm:apply-staff-codes -- <建議表> --dry-run`，沒問題再拿掉 `--dry-run` 正式寫入。
8. **清理**：刪除 CSV 目錄、摘要與建議表。

## 2026-10-08 第 1 階段驗收（10/02 副本，測試資料庫）

- **環境：**
  - Mac mini（Apple Silicon）。
  - 獨立的 `postgres:16-alpine` 測試容器，事先載入正式 DB 的結構（`pg_dump --schema-only`，不含資料）。
  - 在測試容器上執行 migration（run → revert → run）。
  - `migration:generate --dryrun` 比對結果：`legacy_crm` 與 entity 沒有差異。
- **資料來源：**
  - MDB：`\\SERVER\tmp\*_isin_20261002.mdb`。
  - 匯出 CSV：335 MB。
- **匯入：** 57 秒（isin_vb6 SQLite 版為 162 秒）。
- **資料量：** `legacy_crm` 含索引約 700 MB。

| 步驟 | 來源筆數 | 匯入 | 從屬表（來源 → 匯入） | 秒 | 排除 |
|---|---:|---:|---|---:|---|
| 客戶 | 2,107 | 2,106 | | 0.1 | 1 筆編號空白 |
| 廠商 | 257 | 257 | | 0.0 | |
| 銀行 | 1 | 1 | | 0.0 | |
| 詞彙 | 92 | 92 | | 0.0 | |
| 材質 | 348 | 348 | | 0.0 | |
| 工件 | 407,328 | 407,327 | | 5.1 | 1 筆圖號空白 |
| 訂單 | 174,950 | 174,950 | 明細 566,474 → 566,471 | 16.3 | 3 列孤兒明細 |
| 出貨 | 181,558 | 181,558 | 明細 569,356 → 569,356 | 15.5 | |
| 報價 | 13,323 | 13,323 | 明細 37,730 → 37,730；備註 66,278 → 66,274 | 1.5 | 4 列空白備註不存 |
| 收款 | 34,670 | 34,670 | 付款 23 → 23；沖帳 182,532 → 182,507 | 3.4 | 25 列孤兒沖帳 |
| 工作 | 195,461 | 195,461 | 明細 594,779 → 594,764 | 12.4 | 15 列孤兒明細 |
| 圖組 | 33,374 | 33,374 | 明細 106,652 → 106,633 | 1.8 | 19 列孤兒明細 |

### 與 isin_vb6 的比對

- **筆數與排除原因**：和 isin_vb6 的 10/02 演練完全相同。舊員工 85 位不匯入，改產生員工編號建議表。
- **逐列比對**：用 isin_vb6 的 `stage-legacy-import.mjs` 對同一份 CSV 另建一個 SQLite，再把 19 張表逐列、逐欄和 PostgreSQL 比對，結果**全部一致**。
  - 依主鍵排序比對，PostgreSQL 端用 `COLLATE "C"`，與 SQLite 的 BINARY 排序一致。
  - 日期欄比的是 isin_vb6 存的原字串，對照 PostgreSQL 的 `*_raw ?? formatRocDate(date)`。
  - 支票位置以排序過鍵的 JSON 比對。
  - 材質依 rowid／id 順序比對。

### 日期欄

- **格式**：舊 MDB 的日期都是 10 碼、靠右補空白的 `年.月.日`。年份 1～4 位數，民國 99 年以前是兩位數。
- **無法解析**：0 個。
- **寫法不標準**：7 個，都在客戶開始／最近交易日與出貨日。原字串存在 `*_raw`，畫面照原樣顯示。
- **年份可疑**：156 個，標準是民國年小於 60 或大於今年 + 5。
  - 例如訂單交貨日寫成民國 7109、1032、1 年，客戶開始交易日寫成民國 3、8 年。
  - 這些都是合法日期，照樣存 `date`，顯示與舊版相同；只是依日期排序時會落在最前或最後。
  - 分布：訂單交貨日 12、訂單明細交貨日 65、出貨 16、出貨明細 29、收款 8＋8、客戶 15、報價 3。

### 員工編號建議表

這次的測試資料庫沒有 `staff` 資料，85 位都是「找不到」。正式移轉時會在正式 DB 產生建議表。

另外在測試資料庫用兩筆假員工驗證了寫入流程：

- `--dry-run` 只檢查、不寫入。
- 正式寫入只寫 `confirm=Y` 的列。
- 舊編號已屬於別的員工時，整批拒絕。

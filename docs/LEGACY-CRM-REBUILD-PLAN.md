# isin_vb6 Rebuild 計劃：舊版銷管系統遷入 isin_nest

> 撰寫日期：2026-10-08
> 來源專案：`../isin_vb6`（Vue 3 + Node `node:sqlite` 的舊版重建研究專案，即將收尾）
> 目標：isin_nest `apps/backend/src/legacy-crm`、`apps/frontend/src/legacy-crm`
> 狀態：規劃已定案（2026-10-08 決議見第 11 節）。**第 0 階段（isin_vb6 收尾，tag `v0-final`）、第 1 階段（資料層）、第 2 階段（後端 API）、第 3 階段（前端殼與主檔）已完成（2026-10-08）**，移轉操作與演練紀錄見 `LEGACY-CRM-MIGRATION-RUN.md`，API 與 isin_vb6 的差異見 `LEGACY-CRM-API.md`，前端的移植約定與差異見 `LEGACY-CRM-FRONTEND.md`。第 0 節為原則，第 2～9 節為各工作包，第 10 節為階段排程，第 11 節為決議與研究。
> 相關文件：`../isin_vb6/docs/handoff-legacy-rebuild.md`（接手文件）、`legacy-ui-spec.md`（版面與操作規格）、`legacy-mdb-field-mapping.md`（MDB → 新表欄位對應與移轉範圍）、`legacy-migration-run.md`（正式移轉流程與耗時）
> 研究報告（2026-10-08，獨立於 isin_vb6）：`research/ACCESS-MDB-LIBRARIES.md`（Access 97 讀寫套件）、`research/SMB-MOUNT-FROM-CONTAINER.md`（容器掛載 SMB）與 `research/smb-mount.compose.example.yml`

## 0. 起因與原則

### 起因

多數老員工無法重新學習新系統，且舊 VB6 + Access 97 銷管系統必須盡可能無痛地搬到新系統。因此先用 Vue 重建與舊版**操作、版面、列印完全相同**的銷管系統（`isin_vb6`），讓員工直接換過去用；之後再在這個基礎上逐步修改與加入新功能。

`isin_vb6` 的研究已經完成絕大部分：主檔、六張交易表單、報表與單據列印、F 鍵操作、舊 MDB 欄位對應、正式移轉腳本（兩次演練約 3 分 20 秒）。下一步是把它併入 `isin_nest`，共用新系統的登入、權限、員工、部署基礎設施，而不是另外維護一套獨立的 SQLite 服務。

### 原則

1. **舊版畫面與行為原封不動搬過來。** `isin_vb6` 已逐欄比對 Win7 的結果就是規格；遷移時不「順便」改善 UI，所有差異列入 `legacy-ui-spec.md` 的既知差異表。新功能（回報、log）只加在舊版畫面之外的固定位置。
2. **資料表專屬、權限共用。** 舊銷管資料放在 PostgreSQL 的 `legacy_crm` schema，表結構承接 `isin_vb6/server/schema.sql`，初始資料一律來自 Access MDB。使用者、員工、權限、系統設定一律用 isin_nest 現有的 `users`、`features`、`user_features`、`staff`、`crm_config` 等表與邏輯；全系統只有唯一的 `staff` 與 `users` 表，`isin_vb6` 的 `employees`、`app_settings`、`audit_log` 不搬。
3. **權限沿用既有 `crm` feature。** 有 `crm` read 的使用者可以查詢、瀏覽、列印；有 `crm` write 的才能新增、修改、刪除。不另外發明一套權限表。
4. **新舊版 CRM 互不可見。** legacy CRM 有自己的 route 前綴、layout、design tokens；新版 CRM 路由與選單標記為「暫不使用」並隱藏。兩邊都不提供到另一邊的連結、按鈕或導向。
5. **每次寫入都留痕。** 所有 legacy CRM 的新增／修改／刪除記錄到 `legacy_crm.write_log`，含使用者、前後值，用來 debug 與防護；列印與報表查詢另記 `legacy_crm.print_log`。
6. **舊系統仍是只讀證據來源。** 遷移期間不碰 `\\ISIN\isin` 的正式 MDB；正式移轉照 `legacy-migration-run.md` 的流程，確認沒有 `.ldb` 鎖定檔才複製。真實資料不進 Git。

## 1. 現況盤點

### 1.1 isin_vb6 可直接承接的資產

| 類別 | 位置 | 遷移方式 |
|---|---|---|
| SQLite schema（24 表） | `server/schema.sql` | 轉成 TypeORM entity + migration，放進 `legacy_crm` schema（第 2 節） |
| 資料邏輯：回寫出貨數、客戶最近交易、收款自動沖銷、CNC 檢查 | `server/db.mjs`（3,164 行）、`src/utils/receiptAllocation.js` | 拆成 Nest service；純函式（沖銷分配、日期、稅額）直接搬到共用 utils 並保留測試 |
| 瀏覽 / 查詢 / F1 輔助輸入 | `server/legacyBrowse.mjs`、`legacyAssist.mjs` | 轉成 Nest controller，查詢改寫為 PostgreSQL |
| 報表資料 | `server/reports.mjs` | 轉成 Nest service，SQL 逐張改寫並以同一組 fixture 比對結果 |
| DXF 工件簡圖 | `server/drawingShapes.mjs` | 直接搬，路徑改讀 isin_nest 環境變數 |
| Vue 元件（MDI、表單、列印、報表紙面） | `src/components/Legacy*.vue`、`MdiChild.vue`、各 View | 搬到 `apps/frontend/src/legacy-crm/`，JS 改 TS 可分期；API 層改用 isin_nest 的 `services/api.ts`（帶 JWT） |
| 版面規格、紙面座標 | `src/utils/legacyPaper*.js`、`legacyDocumentPaper.js`、`companyProfile.js` | 原樣搬 |
| 字型 | `public/fonts/tw-sung-legacy.woff2` | 搬到 frontend public |
| 移轉腳本 | `scripts/export-legacy-mdb-set.sh`、`stage-legacy-import.mjs`、Java/Jackcess 工具 | 匯出流程不變；匯入目標由 SQLite 改為 PostgreSQL（第 3 節） |
| 列印模擬器 | `scripts/legacy-print-emulator/` | 搬到 isin_nest `scripts/legacy-print-emulator/`，供日後新報表核對 |
| 測試 | `tests/`（`node --test`，79 個） | 改寫為 Jest；優先搬純函式與 API 行為測試 |

### 1.2 isin_vb6 不搬的部分

- `server/systemBackup.mjs`、`systemMaintenance.mjs`、`legacyImport.mjs`（CSV 封存匯入畫面）、`SystemDataView.vue`、`LegacyImportView.vue`、`AuditLogView.vue`：系統維護選單已決定不實作；備份改由伺服器對 PostgreSQL 排程 `pg_dump`。
- `employees` 表與員工建檔表單的「正式來源」角色：員工資料改讀 isin_nest `staff`（見 2.3）。
- 登入對話框：改用 isin_nest 登入。
- `legacy_import_*` 三表：正式移轉改走腳本直灌 PostgreSQL，不需要封存區。

### 1.3 isin_nest 現有可共用的基礎

- 認證：`auth/` JWT + `FeatureGuard` + `@RequireFeature('crm', PermissionType.READ|WRITE)`。
- 使用者與員工：`users`、`staff`，使用者可綁員工（`README_CREATE_USER_WITH_STAFF.md`）。
- 設定：`crm_config` 表（分類 + 代碼 + 標籤），啟動時 upsert 預設值。
- Migration：`typeorm` CLI 走 `apps/backend/src/data-source.ts`，migration 列在 `app.module.ts`。
- 檔案 log：`common/logger/file-logger.service.ts`。
- 前端：Vue Router（`router/index.ts` + `router/hr.ts`）、Pinia（`stores/auth.ts`）、Tailwind 4 `@theme` tokens、`services/api.ts`。
- 新版 CRM：`crm/` 模組 11 個子模組、`views/CRM/*` 19 個 view、`/crm/*` 19 條路由、`App.vue` 側欄連結。

## 2. 資料庫：`legacy_crm` schema

### 2.1 命名與位置

- PostgreSQL schema 名稱固定為 `legacy_crm`；表名沿用 `isin_vb6/server/schema.sql`（`partners`、`parts`、`order_documents`、`order_items`…），避免和 `public` 的新版 `customers`、`orders` 撞名。
- TypeORM entity 用 `@Entity({ schema: 'legacy_crm', name: 'order_documents' })`，放在 `apps/backend/src/legacy-crm/**/entities/`。
- 第一支 migration 建 schema 與全部表；之後依「typeorm-entity-migration」規則逐支產生。

### 2.2 型別轉換規則

| SQLite（isin_vb6） | PostgreSQL | 說明 |
|---|---|---|
| `TEXT` 日期（民國 `yyy.mm.dd` 字串） | `date` 為正式欄位，另有 `*_raw varchar(20)` | **決議：遷移時就改以 `date` 欄為主**，排序、區間查詢、單號序號都用 `date`。民國字串只供顯示，由 `legacy-crm/common/roc-date.ts`（`parseRocDate`／`formatRocDate`／`splitRocDate`／`displayRocDate`）在 API 輸出與表單輸入時轉換。舊 MDB 存的是 10 碼靠右補空白的 `年.月.日`，年份 1～4 位數都能解析（民國 1–99 年本來就是兩位數，屬正常值）。原字串只在無法由 `date` 還原時存進 `*_raw`：解析失敗（`date` 為 null）或寫法不標準（例如年份有前導零）；顯示時有 `*_raw` 就用原字串，`date` 為 null 的列不參與排序。表單輸入一律嚴格解析，不合法就拒絕。瀏覽「頭筆～尾筆」依單號文字順序不受影響。10/02 副本實測見 `LEGACY-CRM-MIGRATION-RUN.md` |
| `INTEGER` `*_units`（金額與數量 × 10,000） | `bigint` | 保留整數精度策略；不改 `numeric` 以免重算差異。entity 以 transformer 轉回 number（最大值仍在安全整數內） |
| `INTEGER` 項次 `line_no` | `smallint` + CHECK（1–99；沖帳 1–999） | |
| `TEXT CHECK(length(...) <= n)` | `varchar(n)` + CHECK | 長度上限照 schema 15、16 放寬後的值 |
| 使用者造字（Unicode 私用區） | `text`，UTF-8 | PostgreSQL UTF-8 可存 PUA；只存字碼不補字形（`legacy-eudc.md`） |
| `WITHOUT ROWID` 複合主鍵 | 複合 primary key | |
| `audit_log` | 不搬 | 改用 2.4 的 `write_log` |
| `app_settings` | 不搬 | 系統設定改用 `crm_config` 或環境變數 |
| `employees` | 不搬（見 2.3） | |
| `materials`（rowid 為鍵，另有從未有值的 `code`、`density`、`notes`） | `id serial`；`name` 改名 `product_name` | 未使用的欄不搬 |
| `drawing_group_items` 主鍵 `(group_no, customer_code, line_no TEXT)` | 主鍵 `(group_no, line_no smallint)` | `customer_code` 一律取自表頭、項次在同一圖組內不重複 |
| `banks.check_layout_json` | `check_layout jsonb` | |
| `postal_codes` | 保留 | 舊 MDB 沒有可移轉的資料，表留給建檔畫面 |

### 2.3 員工資料的處理

舊版單據的「業務」「員工」欄存員工編號與姓名快照（例如 `order_documents.ACTOR_NO/ACTOR`）。新版做法：

**決議：全系統只有唯一的 `staff`、`users` 表，`legacy_crm` 不建任何員工表或對照表。**

- 單據上的員工編號與姓名欄**保留原字串快照**，不改成 `staff.id` 外鍵；舊資料 85 位員工多數已離職，強制對應會失敗。
- `public.staff` 加一欄 `legacy_crm_code varchar(10) unique nullable`（舊版員工編號）。正式移轉時，匯入 CLI 用 `personel.mdb` 的姓名比對 `staff`，產生 `<CSV 目錄>.staff-code-proposals.csv`；只有雙方都在職、姓名唯一對上的才預填 `confirm=Y`。人工確認後執行 `npm run legacy-crm:apply-staff-codes -- <建議表>` 寫入（同一 transaction，編號重複或已被占用就整批不寫）。離職員工不補。
- 舊版「員工建檔」表單從 legacy 檔案選單移除；需要查員工時 F1 直接列出 `staff` 在職且有 `legacy_crm_code` 的員工，沒有 code 的不能選。員工資料的維護一律在新系統 HR。
- 新單據存檔時，員工編號／姓名快照取自所選 `staff` 的 `legacy_crm_code` 與姓名。

### 2.4 寫入紀錄 `legacy_crm.write_log`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | bigserial | |
| `occurred_at` | timestamptz | |
| `user_id` | int nullable | `users.id`；匯入等系統作業為 null。**不設外鍵**，紀錄要比帳號活得久 |
| `staff_id` | varchar(10) nullable | 使用者綁定的 `staff.id`（`staff` 的主鍵是 varchar(10)） |
| `entity_type` | varchar | `order_document`、`sales_document`、`partner`… |
| `entity_key` | varchar(60) | 單號／編號；客戶與廠商為 `kind:code` |
| `action` | varchar(10) + CHECK | `create`、`update`、`delete`、`rename`（改編號）、`import`（正式移轉的批次摘要） |
| `before` | jsonb nullable | 修改／刪除前整筆（含明細） |
| `after` | jsonb nullable | 新增／修改後整筆 |
| `side_effects` | jsonb nullable | 連帶回寫：訂單出貨數差額、客戶最近交易日、銷貨已收金額 |
| `request_id` | uuid | 對應 Nest request log |
| `client` | jsonb | IP、user agent、前端版本 |

- 由 service 層在同一個 transaction 內寫入，不用 TypeORM subscriber（subscriber 拿不到使用者與 side effects）。
- 一般唯讀查詢（頭筆～尾筆、查詢視窗、F1）不記錄。
- 保留期：至少 2 年；超過後由排程搬到冷表或 `pg_dump` 歸檔。
- 查詢畫面：僅 admin 可用，放在 legacy CRM 的「系統」選單之下（第 6 節）。

### 2.5 列印與報表查詢紀錄 `legacy_crm.print_log`

**決議：列印與報表查詢也要記錄。**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id`、`occurred_at`、`user_id`、`staff_id`、`request_id`、`client` | 同 `write_log` | |
| `kind` | varchar(20) + CHECK | `document_preview`、`document_print`（訂貨單、出貨單、工作單、估價單、標籤、信封）、`report_query`（報表預覽）、`report_print`、`statement_print`（請款單） |
| `target` | varchar | 單據種類或報表名稱 |
| `entity_key` | varchar nullable | 單號 |
| `criteria` | jsonb nullable | 報表條件：日期起迄、客戶起迄、品號起迄 |
| `row_count` | int nullable | 報表結果筆數 |
| `page_count` | int nullable | 預覽頁數 |

- 單據列印由前端在開啟列印預覽（`document_preview`）與按「印出 O」（`document_print`）時各打一次 `POST /api/legacy-crm/print-log`；報表查詢由後端在報表 service 回傳結果時寫入。
- 含客戶資料的只有 `criteria` 的客戶編號範圍，不存報表內容。
- 查詢畫面與 `write_log` 同一頁，分頁籤。

## 3. 正式資料移轉

流程沿用 `legacy-migration-run.md`，只改匯入目標：

1. 匯出：`export-legacy-mdb-set.sh`（Jackcess、`x-windows-950`）流程不變，產出 CSV。第 1 階段仍用 isin_vb6 的腳本與 Jackcess 2.1.2；正式移轉前（第 7 階段）把腳本搬進 isin_nest，並把 Jackcess 由 2.1.2 升到 **5.0.3**（Java 11 以上；會自動讀檔頭字碼頁、修正 Jet 3 索引與日期精度），仍明確指定 `x-windows-950` 並把檔頭偵測結果記到 log；執行用的 JRE 必須含 `jdk.charsets` 模組，否則 950 會無聲變亂碼（`research/ACCESS-MDB-LIBRARIES.md` 2.1）。
2. 匯入：`npm run legacy-crm:import -- <CSV 目錄> --final`（`apps/backend/src/legacy-crm/migration/import-legacy-csv.ts`）。欄位對應與排除規則（空白編號、來源重複、孤兒明細）照搬 `stage-legacy-import.mjs`，驗證規則移植自 `db.mjs`（`legacy-crm/common/legacy-records.ts`）；以 `unnest` 陣列批次寫入，不需另裝 COPY 套件。`--final` 全部步驟同一個 transaction，任一步失敗就整批還原。已有資料時必須加 `--truncate` 才會清空重匯，且 `write_log` 一旦有使用者寫入紀錄就拒絕清空。
3. 民國字串日期在匯入時拆成 `date` 與 `*_raw`（見 2.2）、產生員工編號建議表（見 2.3）、`ANALYZE`。索引由 migration 先建好。
4. 核對：`summary.json` 的筆數對照 `legacy-migration-run.md` 2026-10-07 表格（客戶 2,106、工件 407,327、訂單 174,950、出貨 181,558、工作 195,461…）。
5. 演練兩次：一次用 10/02 副本比對筆數，一次在正式切換前用當天資料。預期 PostgreSQL 匯入時間與 SQLite 同量級（2～5 分鐘）。
6. 切換日：舊系統停用、確認無 `.ldb`、複製、匯出、匯入、驗收、開放。舊系統保留唯讀備查。複製 MDB 用後端既有的容器內 cifs 掛載以唯讀（`ro,cache=none,actimeo=0`）掛 `\\ISIN\isin`，或一次性 `smbclient get`；Windows 端 `robocopy` 到 Mac 為備案。複製後比對大小與雜湊（`research/SMB-MOUNT-FROM-CONTAINER.md` 1 節）。
7. **`legacy_crm` 的初始資料只來自 Access MDB**（決議）：新版 CRM 已輸入的 `customers`、`quotes`、`orders` 等資料不併入，原表保留不動。切換後若有需要，再另案評估人工補登。
8. 切換前確認會計系統是否有連線 VB6 銷管（目前判斷沒有的可能性較高）：在 ISIN 主機檢查 `\\ISIN\isin` 的 SMB 連線來源與 `.ldb` 內的機器名稱、詢問會計；若有，會計端的讀取需求列入第 11.1 節的共存研究並優先處理。

> 注意：移轉匯入的單據 `preserveSourceAmounts`，不觸發回寫（出貨數、已收金額、最近交易日）；匯入也不逐筆寫 `write_log`，只記一筆 `action = 'import'` 的批次摘要（只有筆數）。

## 4. 後端模組 `legacy-crm`

```
apps/backend/src/legacy-crm/
  legacy-crm.module.ts
  common/            # 民國日期、金額 units、單號產生、write-log service
  partners/          # 客戶、廠商（含 renameCustomer）
  parts/             # 工件（DXF 簡圖、CNC 檢查）
  masters/           # 材質、銀行、詞彙、郵遞區號、圖組
  orders/ sales/ quotes/ works/ receipts/
  browse/            # 頭筆～尾筆、查詢視窗（legacyBrowse）
  assist/            # F1 輔助輸入（legacyAssist）
  reports/           # 報表資料
  printing/          # 單據列印資料（工件簡圖、紙面）
  write-log/         # write_log 與 print_log
  migration/         # CSV 匯入 CLI
```

- 所有 controller 掛 `@UseGuards(JwtAuthGuard, FeatureGuard)`，GET 用 `@RequireFeature('crm', READ)`，寫入用 `WRITE`（`common/legacy-access.ts` 的 `LegacyController`、`LegacyRead`、`LegacyWrite`）。後端路徑 `/legacy-crm/*`，前端經代理為 `/api/legacy-crm/*`。路由、回應形狀與和 isin_vb6 的差異見 `LEGACY-CRM-API.md`。
- 請求 body 沿用 isin_vb6 的欄位，驗證與錯誤訊息集中在 `common/legacy-records.ts`（與舊版逐條相同），不另定 class-validator DTO，避免兩套規則不一致。
- 查詢以 raw SQL 移植 isin_vb6 的 SQL（`common/legacy-db.ts`），文字欄一律 `COLLATE "C"`，排序與區間比較與 SQLite 相同。
- `db.mjs` 的業務規則逐條搬，並以 `legacy-ui-spec.md`、handoff 文件列出的實測行為寫成 Jest 測試：出貨回寫訂單出貨數（差額、多列分攤、不低於 0）、客戶最近交易日只往後推、收款自動沖銷順序與預收、單號 = 日期 + 當日序號、工作單 CNC_OK 檢查、同訂單不可重複圖號。
- 回寫與主寫入在同一 transaction（TypeORM `DataSource.transaction`），`write_log` 一併寫入。
- 民國日期只在 API 邊界轉換：DTO 收 `yyy.mm.dd` 字串，`parseRocDate` 轉 `date`；回傳時 `formatRocDate`。service 與 SQL 內一律用 `date`。
- 員工相關查詢直接 join `public.staff`（`hr/staff` 模組），legacy-crm 模組不自建員工 entity。
- 環境變數：`LEGACY_DXF_PATH`（`\\Server\C\` → `/nas/c`）、`LEGACY_CNC_PATH`（`\\SERVER\n\` → `/nas/n`）、`LEGACY_MDB_PATH`（`\\ISIN\isin` → `/nas/isin`，唯讀）、`LEGACY_DXF_LEGACY_ROOT`；掛載沿用既有 `NasService`（第 9 節）。
- 所有 SMB 存取經過一個 `LegacyFileService`：同時最多 4 個請求、逾時 3 秒；DXF 逾時回 503「圖檔伺服器無回應」，CNC 檢查逾時回「未知」並拒絕存檔，**不可當作檔案不存在**（否則工作單 CNC_OK 規則會被繞過）。DXF 路徑一律由圖號推算，不列目錄、不建檔案索引。

## 5. 前端：獨立 route、layout 與 design tokens

### 5.1 路由

- 前綴 `/legacy-crm`，`router/legacy-crm.ts` 獨立檔，所有 route `meta: { requiresAuth: true, feature: 'crm', layout: 'legacy' }`。
- `App.vue` 依 `route.meta.layout` 切換：`legacy` 不渲染新版側欄與頂欄，整頁交給 `LegacyShell.vue`（選單列 + MDI 子視窗 + 狀態列，即 `isin_vb6/src/App.vue`）。
- 單一入口：`/legacy-crm`；MDI 子視窗狀態在 Pinia store，不用子 route，與舊版行為一致。
- 導航守衛：沒有 `crm` 權限者導回首頁；只有 read 的人進入後，所有新增／修改／刪除按鈕停用並在狀態列顯示「唯讀」。
- 新系統首頁與側欄：在 Home 加「舊版銷管系統」卡片，點了開新分頁到 `/legacy-crm`；這是新系統到 legacy 的唯一入口，legacy 內部沒有回新系統的連結（登出除外）。
- 2026-10-08 實作：未登入時導向登入頁，登入後回到 `/legacy-crm`；登出在狀態列右側。實作細節見 `LEGACY-CRM-FRONTEND.md`。

### 5.2 Design tokens

- 新建 `apps/frontend/src/legacy-crm/styles/tokens.css`，以 `.legacy-root` 為作用域定義變數（`--lg-font`、`--lg-ink`、`--lg-canvas`、`--lg-line`、`--lg-accent`…），來源為 `isin_vb6/src/style.css` 的 `:root` 變數與 `Legacy Ming` 字型。
- Tailwind `@theme` 不新增 legacy 色票，避免污染新版 token；legacy 元件只用自己的 CSS 變數與 class，`.legacy-root` 內 reset 新版的全域樣式（body 字型、min-width 1024px）。
- 列印樣式（`@page` 230 × 139.7 mm、230 × 279.4 mm、90 × 38.1 mm 標籤）照 `legacyPapers.js` 原樣搬。
- 文件：在 `.agent/rules/frontend/design-system.md` 加一節說明 legacy tokens 的作用域與「不可混用」規則。
- 2026-10-08 實作：
  - token 名稱為 `--lg-*`，值與 isin_vb6 相同。
  - `.legacy-root` 內用 `all: revert-layer` 略過 Tailwind preflight，用 `revert` 還原 `style.css` 的全域 `h1`～`h6`、`p`、`a`。
  - 字型放 `src/legacy-crm/assets/fonts/`：`public` 被 `.gitignore` 忽略。
  - 列印的 `@page`、`@media print` 留到第 4 階段，且要限定在舊版列印頁。

### 5.3 元件搬移

- `isin_vb6/src/components/*` → `apps/frontend/src/legacy-crm/components/`；`src/utils/*` → `legacy-crm/utils/`。
- API 呼叫改走 `services/api.ts`（自動帶 JWT、401 導登入）；`fetch('/api/...')` 全部替換。
- JS → TS 分兩步：先改副檔名 + `// @ts-nocheck` 讓專案通過 lint；再逐檔補型別。純函式 utils 優先補型別與測試。
- 新功能掛點：MDI 選單列最右側新增「回報(B)」、狀態列顯示登入者姓名與唯讀狀態。
- 2026-10-08 實作（第 3 階段）：
  - `.vue` 直接用 `<script setup lang="ts">`，型別先補在 props 與函式參數。專案沒有 `vue-tsc`，`.vue` 不做型別檢查。
  - `utils` 改成 `.ts`。
  - API 經 `legacy-crm/services/legacyApi.ts`。

## 6. 新版 CRM 標記暫不使用

- `router/index.ts` 的 `/crm/*` 19 條路由移到 `router/crm-v2.ts`，以 `CRM_V2_ENABLED`（`import.meta.env.VITE_CRM_V2_ENABLED`，預設 `false`）決定是否註冊；未註冊時直接進 `/crm` 導回首頁。
- `App.vue` 側欄的新版 CRM 連結同樣以旗標隱藏。
- 後端 `CrmModule` 保留並繼續跑 migration（資料表不刪），controller 加 `@RequireFeature('crm_v2', ...)`，同時啟動時不再 seed `crm_v2` 權限給任何人，等於停用；或以 `CRM_V2_ENABLED` 環境變數決定是否 import `CrmModule`。擇一，建議前者（不改 module 組成，測試不受影響）。
- 兩邊不互連：legacy 不引用 `views/CRM`、`services/crm`；新版 CRM 不引用 `legacy-crm`。在 `eslint.config.mjs` 加 `import/no-restricted-paths` 強制。
- 文件：`README.md` CRM 段落加註「新版 CRM 暫不使用，現行為 legacy CRM」。

## 7. 回報系統（bug / 需求）

### 7.1 資料表 `public.feedback_reports`

| 欄位 | 說明 |
|---|---|
| `id`、`created_at`、`updated_at` | |
| `user_id` | 回報者 |
| `kind` | `bug`、`feature`、`question` |
| `title`、`body` | 標題、描述 |
| `context` | jsonb：route、MDI 目前視窗名稱、單號、前端版本、瀏覽器、螢幕尺寸 |
| `screenshot_path` | nullable，伺服器檔案路徑（不存 DB） |
| `status` | `open`、`triaged`、`in_progress`、`done`、`wont_fix` |
| `assignee_user_id`、`resolution` | 處理者與結果 |

### 7.2 流程

- 前端：選單列「回報(B)」開對話框（legacy 樣式）。欄位：類型、標題、描述、「附上目前畫面截圖」勾選。勾選時用 `html-to-image`（或 `html2canvas`）擷取 `.legacy-root`，先顯示預覽讓使用者確認再送出；截圖含客戶資料，故預設不勾。
- 後端：`POST /api/feedback`（multipart，截圖 PNG 上限 5 MB）；需登入，不需 `crm` 權限（HR 使用者也能回報）。截圖存 `FEEDBACK_UPLOAD_DIR`，檔名用 uuid，不放在靜態目錄。
- **截圖決議：無保留期限，只有 admin 能看。** `GET /api/feedback/:id/screenshot` 掛 `AdminGuard`；回報者本人也看不到自己送出的截圖（送出前的預覽即為確認）。Slack 通知不附截圖。
- 通知：寫入後透過既有 `slack/` 模組推一則訊息到指定頻道（可關閉）。
- 管理畫面：新系統（非 legacy）`/settings/feedback` 列表、篩選、改狀態；admin 或 `feedback` feature write 可用，截圖欄位只對 admin 顯示。
- 回報系統是新系統的共用模組，之後 HR 也可以用；只有「觸發按鈕」在 legacy 選單列。

## 8. 權限矩陣

| 動作 | 需要 |
|---|---|
| 進入 `/legacy-crm`、查詢、瀏覽、報表預覽、列印 | `crm` read |
| 新增、修改、刪除、改編號、訂單轉工作單 | `crm` write |
| 查看 `write_log`、`print_log` | admin |
| 回報 bug / 需求 | 任何登入使用者 |
| 處理回報 | admin 或 `feedback` write |
| 查看回報截圖 | admin |
| 維護員工資料與 `staff.legacy_crm_code` | 新系統 HR 既有權限 |
| 執行正式移轉 CLI | 伺服器 shell，不開 API |

- 2026-10-08 實作確認：`crm` 功能原本不存在（正式庫 `features`、`user_features` 都是空的，目前只有 admin 通過 `FeatureGuard`），由 migration `1791460000000-PrepareLegacyCrmApi` 建立；一般使用者要在設定頁授權 `crm` read／write 才能使用。新版 CRM 的 controller 目前沒有掛權限守衛，與本計畫無關，未處理。

## 9. 部署與維運

- **SMB 掛載沿用後端既有的 `NasService`**（`/etc/auto_nas` → 容器內 `mount -t cifs` 到 `/nas/<key>`），不另外加 compose volume，也**不要**用 macOS 主機先掛 smbfs 再 bind mount 進容器（本機 OrbStack 實測會讓 bind mount 機制整個卡死，見 `research/SMB-MOUNT-FROM-CONTAINER.md` 3.4）。
- `NasService` 需改成每個 share 各自的掛載選項（研究報告 4 節）：DXF `ro,vers=2.1,actimeo=60`、CNC `ro,vers=2.1,actimeo=10`、MDB `ro,vers=2.1,cache=none,actimeo=0`，都加 `iocharset=utf8,echo_interval=10,soft`；帳密改用 docker secret 的 credentials 檔（現況是命令列明碼）；`privileged: true` 縮成 `cap_add: [SYS_ADMIN, DAC_READ_SEARCH]`；`isin` share 改唯讀。只有在 SERVER／ISIN 確認只支援 SMB1 時才用 `vers=1.0`，且只限唯讀。範例見 `research/smb-mount.compose.example.yml`。
- 前置確認：ISIN、SERVER 的 Windows 版本與最高 SMB 版本（Win7 → SMB 2.1）；兩台主機做 DHCP 保留。
- Node 端：設 `UV_THREADPOOL_SIZE`（建議 16），SMB I/O 一律有逾時與併發上限（第 4 節 `LegacyFileService`）；SMB 伺服器無回應時 cifs 呼叫會卡住 libuv 執行緒，沒有上限會拖垮整個後端。`/system/nas/status` 健康檢查對每個掛載點做一次帶逾時的 `stat`，並提供 remount API（密碼變更、長時間斷線後用）。
- PostgreSQL 備份：每日 `pg_dump --schema=legacy_crm` 加整庫週備份；正式資料約 500 MB（SQLite 量級），PostgreSQL 預估 1～1.5 GB，確認 volume 容量。
- 效能：`parts` 40 萬、`order_items`／`sales_items`／`work_items` 各約 57 萬列。頭筆～尾筆瀏覽與查詢視窗依單號、客戶編號、圖號、日期建索引；報表限制 1～2 個月區間（沿用現行預設）。DXF／CNC 經 SMB 按路徑讀取，`stat` 約 1 個 RTT、`readFile` 約 3～4 個 RTT（區網約 0.5～5 ms），40 萬檔不成問題，前提是不掃描目錄。
- 字型：`tw-sung-legacy.woff2` 由 frontend 提供；現場 Windows 電腦優先用 `MingLiU`。
- 瀏覽器：現場電腦以 Chrome／Edge 為準，列印用瀏覽器列印對話框；第一次上線前依 handoff「未完成事項」實際印一張量測 HP 邊界。

## 10. 階段排程

| 階段 | 內容 | 完成條件 |
|---|---|---|
| 0. 收尾 isin_vb6 | 處理 handoff 未完成事項中「操作」類（報價 F8、工作 F8、收款 F3／F4）；最終 commit 與 tag `v0-final` | `npm test`、`npm run build` 通過；handoff 更新 |
| 1. 資料層 ✅ 2026-10-08 | `legacy_crm` schema、entities、第一支 migration、CSV 匯入 CLI（含民國日期解析）、`write_log`、`print_log`、`staff.legacy_crm_code` | 用 10/02 副本匯入 PostgreSQL，筆數對上 `legacy-migration-run.md`，日期解析失敗筆數可接受並已列表。**結果**：筆數與排除原因完全相同；19 張表約 290 萬列與 isin_vb6 匯入結果逐列逐欄一致；日期無法解析 0 筆；匯入 57 秒（`LEGACY-CRM-MIGRATION-RUN.md`） |
| 2. 後端 API ✅ 2026-10-08 | 主檔、六張單據、瀏覽、F1、報表、列印資料；業務規則 Jest 測試 | 與 `isin_vb6` API 同一組請求輸出相同（錄製比對）。**結果**：1,105 個讀取請求、72 個寫入步驟、31 張報表逐值比對，差異全部是刻意修正（日期排序、拒收不合法日期、員工改由 staff）並列在 `LEGACY-CRM-API.md`；業務規則整合測試 15 項通過 |
| 3. 前端殼與主檔 ✅ 2026-10-08 | `/legacy-crm` route、`LegacyShell`、tokens、主檔表單、唯讀模式 | 有 `crm` read 的帳號可登入並瀏覽主檔。**結果**：客戶、廠商、工件、材質、銀行、詞彙、郵遞區號搬入。員工建檔依 2.3 移除；圖組建檔有列印，改到第 4 階段。與 isin_vb6 的 16 個畫面逐像素相同，只差狀態列的登入者與登出、檔案選單少了員工建檔。端對端測試 8 項通過，含唯讀與權限（`LEGACY-CRM-FRONTEND.md`） |
| 4. 前端單據與報表 | 六張單據、圖組建檔、F 鍵、列印（含 `@page`／`@media print`）、報表、請款單 | 與 `isin_vb6` 畫面逐窗比對（`scripts/legacy-crm/compare-screens.mjs` 加場景）；列印 PDF 與 XPS 座標比對。**2026-10-08 移植**：五張交易表單、圖組建檔、報表、單據列印與列印紀錄搬入；新增的 32 個場景與 isin_vb6 逐像素相同（只差狀態列的登入者與登出）；列印紙張以 Chrome PDF 確認；端對端測試 10 項通過（`LEGACY-CRM-FRONTEND.md`）。待 Win7 驗收與列印座標比對 |
| 5. 新功能 ✅ 2026-10-08 | 回報系統（含截圖、admin 限定）、write_log／print_log 查詢畫面、Slack 通知 | 回報可送出、可在設定頁處理。**結果**：`public.feedback_reports` 與 `feedback` 功能（migration `1791468000000-CreateFeedbackReports`）；舊版選單列「回報(B)」可附截圖（預設不勾、先預覽），`/settings/feedback` 由 admin 或 `feedback` write 處理，截圖只有 admin 能看；admin 的「紀錄查詢」視窗分寫入／列印兩頁籤；Slack 只在設定 `FEEDBACK_SLACK_WEBHOOK_URL` 時通知、不附截圖。後端整合測試 18 項、端對端 3 項通過（`FEEDBACK-AND-LOGS.md`） |
| 6. 隔離新版 CRM ✅ 2026-10-08 | 旗標隱藏路由與選單、lint 規則、文件 | 預設環境進不到 `/crm/*`。**結果**：`/crm/*` 19 條與讀新版銷貨單的 `/accounting/*` 2 條移到 `router/crm-v2.ts`，`VITE_CRM_V2_ENABLED` 預設關閉時導回首頁，bundle 不含新版 CRM 頁面（主 chunk 2.4 MB → 0.93 MB）；側欄、首頁訂單／報價、設定頁「銷管設定」同旗標隱藏。後端 17 個 CRM controller 掛 `CrmV2Controller()`（登入 + `crm_v2`，GET read、其餘 write），`crm_v2` 無人授權，只有 admin 可用（整個 AppModule 實測 401／403／200）。`no-restricted-imports` 禁止新舊版互相引用（含 `.vue`、動態 import、後端），以暫時違規驗證會報錯 |
| 7. 正式移轉與上線 | 匯出腳本搬進 isin_nest 並升 Jackcess 5.0.3、確認會計系統是否連線舊銷管、確認 ISIN／SERVER 的 SMB 版本、`NasService` 每 share 選項與 secrets、第二次演練、切換日、現場列印量測、備份排程 | 老員工在現場完成一天作業無阻斷 |
| 8.（選配）共存研究 | 套件層與檔案層研究已完成（11.1）；剩餘為區網實測 | 決定做或不做；預設不做 |

每階段完成後更新本文件狀態列與 `Agent.md` 文件索引。

## 11. 決議與研究

### 11.0 2026-10-08 決議

| 事項 | 決議 | 落在 |
|---|---|---|
| 民國日期 | 遷移時就改成 `date` 欄為主，字串只供顯示，不存字串欄 | 2.2、3、4 |
| 列印與報表查詢 | 也要記錄，另建 `print_log` | 2.5 |
| 新版 CRM 已輸入的資料 | 不併入；`legacy_crm` 初始資料一律來自 Access MDB | 3 |
| 回報截圖 | 無保留期限，只有 admin 能看 | 7.2、8 |
| 員工與使用者 | 全系統只有唯一的 `staff`、`users` 表；舊版員工編號放在 `staff.legacy_crm_code` | 0、2.3、4 |
| 現場風險 | 不確定會計系統是否連線 VB6 銷管，目前判斷沒有的可能性較高；切換前確認 | 3、10、11.1 |

### 11.1 （選配）新舊版同時共存的可能性

目的：切換期若有人仍用 Win7 舊程式（或會計系統若確認有連線舊銷管），新系統能否即時讀寫同一份 `\\ISIN\isin\*.mdb`。

**2026-10-08 研究結論（兩份獨立研究，均只用合成資料與本機 Samba，未連區網）**

> 詳見 `research/ACCESS-MDB-LIBRARIES.md`（套件層）與 `research/SMB-MOUNT-FROM-CONTAINER.md`（檔案層）。

1. **macOS／Linux 上沒有任何套件能寫入 Access 97 檔。** Jackcess（2.1.2、4.0.8、5.0.3）與 UCanAccess 5.1.8 對 Jet 3 都只能讀，官方 FAQ 亦明載；用反射硬開寫入，寫出的列連 Jackcess 自己都讀不回、中文索引鍵算錯，形同毀損。原規劃「Jackcess 可讀寫、是唯一跨平台可寫方案」的敘述**不成立**。
2. **唯讀即時讀取可行，風險中低：** Jackcess 5.0.3 做 Java side-car 或 CLI。它依檔頭字碼頁自動用 950 解碼，造字（PUA）對應與 Windows 一致，Currency 四位小數精確，`SortOrder 1028` 辨識為繁中排序（Jet 3 非英文文字索引唯讀，對整表讀取無影響）。JRE 必須含 `jdk.charsets`。讀取方式應為「複製 MDB 成本機快照 → 讀副本」，複製前後比對 mtime 與大小、不同就重試；不要直接在 SMB 上逐頁解析正在被寫入的檔，也避免 Linux client 拿到 oplock 拖慢 Win7 DAO 開檔。
3. **所有跨平台工具都不實作 Jet 的 `.ldb` 與頁鎖協定。** 與 VB6 同時讀不會弄壞檔案，但可能讀到寫到一半的頁；同時寫一定有損毀風險。
4. **檔案層的鎖：** Linux cifs 只在 `vers>=2.1` 且 `cache=none,nolease` 時會把 byte-range lock 立即送到 server；`vers=1.0` 在本機實測中第二個 client 拿得到第一個 client 已鎖住的範圍，衝突沒被擋下。這代表任何 Linux 端寫 MDB 的想法都要求 ISIN 支援 SMB 2.1，而且就算鎖傳得對，Jet 協定仍然不對。
5. **寫入唯一可行路線是 Windows 端 32 位元 Jet bridge**（.NET x86 + `Microsoft.Jet.OLEDB.4.0` 或 DAO 3.6，與 VB6 用同一個引擎、會參與 `.ldb` 鎖定）。限制：只能 x86；ACE 2013 以後不能開 Access 97，不能替代；要控管 Windows Update（2019-01 曾有 Jet 3 回歸）；SMB 伺服器端建議停用 oplock。代價是多一台 Windows 與一套服務。
6. **macOS 主機掛 smbfs 再 bind mount 進 OrbStack 容器的路線排除**：實測卡死 bind mount 機制。
7. 其他候選：mdbtools 在 macOS 依檔頭用 BIG-5 解碼造字正確，但手動指定 CP950 反而變 `?`、日期兩位數年、空字串與 NULL 不分、`mdb-sql` 對 Currency 條件無效，Linux 容器內造字處理未驗；Node `mdb-reader` 對 Jet 3 寫死 windows-1252，造字遺失，需改原始碼；Python `pandas_access` 已停更且 NumPy 2 崩潰，`access_parser` 不建議，`meza` 只是 mdbtools 包裝。

**決定**

- **預設維持「不共存，整批切換」**（結論形態 3）。移轉只需數分鐘，選下班後切換；兩份研究都支持此結論。
- 若會計系統確認有連線舊銷管而需要過渡期，採**結論形態 1（單向唯讀）**：舊系統仍是 system of record，新系統以 Jackcess 5.0.3 定時從 `LEGACY_MDB_PATH`（`ro,cache=none,actimeo=0` 掛載）複製快照並讀取增量到 `legacy_crm`，新系統不寫。
- **結論形態 2（Windows bridge 雙向）不做**，除非使用者另行決定；Linux 端寫入**禁止**。

**尚待區網實測（需人員在現場，對 `_isin_YYYYMMDD` 副本操作，不碰正式檔）**

- ISIN、SERVER 的 Windows 版本與最高 SMB 版本。
- Win7 DAO 開著副本 MDB 時，Linux 端對 `.ldb` 範圍 `lockf` 是否得到 `EACCES`（驗證 SMB 2.1 對 Windows srv2 的行為，本研究只測了 Samba）。
- 用 `mdb-ver` 或檔頭工具確認副本 code page 為 950、sort 為 1028；統計文字欄 `FA40–FEFE`、`8140–A0FE`、`C6A1–C8FE` 位元組出現次數確認造字範圍；比對 Jackcess 5.0.3 與 mdbtools 匯出 CSV 是否逐欄一致。
- mdbtools 在 Linux 容器內的造字處理（本機 Docker 當時無回應，未測）。

### 11.2 其他待決

- 現場是否有仍需用 Win7 + 舊程式的機台或流程（例如 CNC 檔產生），影響共存研究的優先度。
- 會計系統連線舊銷管的實際確認結果（見 3 第 8 項）；若有，需要哪些表、唯讀還是寫入（寫入只能走 Windows Jet bridge，見 11.1）。
- HR 使用者是否也要能看 legacy CRM 的員工相關資料（目前不給）。
- ~~日期解析失敗的舊資料是否在移轉前修正~~：10/02 副本無法解析 0 筆，不需處理。另有約 150 個日期值的年份明顯打錯但仍是合法日期（例如民國 7109 年、1 年），照樣存 `date`、顯示與舊版相同，只是日期排序會落在最前或最後；是否在舊系統修正由使用者決定，不影響移轉。

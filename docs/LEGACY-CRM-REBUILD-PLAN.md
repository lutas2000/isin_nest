# isin_vb6 Rebuild 計劃：舊版銷管系統遷入 isin_nest

> 撰寫日期：2026-10-08
> 來源專案：`../isin_vb6`（Vue 3 + Node `node:sqlite` 的舊版重建研究專案，即將收尾）
> 目標：isin_nest `apps/backend/src/legacy-crm`、`apps/frontend/src/legacy-crm`
> 狀態：規劃已定案（2026-10-08 決議見第 11 節）。第 0 節為原則，第 2～9 節為各工作包，第 10 節為階段排程，第 11 節為決議與研究。
> 相關文件：`../isin_vb6/docs/handoff-legacy-rebuild.md`（接手文件）、`legacy-ui-spec.md`（版面與操作規格）、`legacy-mdb-field-mapping.md`（MDB → 新表欄位對應與移轉範圍）、`legacy-migration-run.md`（正式移轉流程與耗時）

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
| `TEXT` 日期（民國 `yyy.mm.dd` 字串） | `date` 為正式欄位 | **決議：遷移時就改以 `date` 欄為主**，排序、區間查詢、單號序號都用 `date`。民國字串只供顯示，由共用 util（`formatRocDate`／`parseRocDate`）在 API 輸出與表單輸入時轉換，資料庫不存字串欄。移轉時解析失敗的值（空白、兩位數年份、不存在的日期）存成 `null`，原字串保留在對應的 `*_raw varchar(16)` 欄並計入 `summary.json` 的異常筆數，畫面上以原字串顯示但不可參與排序。瀏覽「頭筆～尾筆」依單號文字順序不受影響 |
| `INTEGER` `*_units`（金額 × 10,000） | `bigint` | 保留整數精度策略；不改 `numeric` 以免重算差異 |
| `INTEGER` 數量 | `integer` | |
| `TEXT CHECK(length(...) <= n)` | `varchar(n)` + CHECK | 長度上限照 schema 15、16 放寬後的值 |
| 使用者造字（Unicode 私用區） | `text`，UTF-8 | PostgreSQL UTF-8 可存 PUA；只存字碼不補字形（`legacy-eudc.md`） |
| `WITHOUT ROWID` 複合主鍵 | 複合 primary key | |
| `audit_log` | 不搬 | 改用 2.4 的 `write_log` |
| `app_settings` | 不搬 | 系統設定改用 `crm_config` 或環境變數 |
| `employees` | 不搬（見 2.3） | |

### 2.3 員工資料的處理

舊版單據的「業務」「員工」欄存員工編號與姓名快照（例如 `order_documents.ACTOR_NO/ACTOR`）。新版做法：

**決議：全系統只有唯一的 `staff`、`users` 表，`legacy_crm` 不建任何員工表或對照表。**

- 單據上的員工編號與姓名欄**保留原字串快照**，不改成 `staff.id` 外鍵；舊資料 85 位員工多數已離職，強制對應會失敗。
- `public.staff` 加一欄 `legacy_crm_code varchar(10) unique nullable`（舊版員工編號），正式移轉時用 `personel.mdb` 的姓名比對預填、人工確認；離職員工不補。
- 舊版「員工建檔」表單從 legacy 檔案選單移除；需要查員工時 F1 直接列出 `staff` 在職且有 `legacy_crm_code` 的員工，沒有 code 的不能選。員工資料的維護一律在新系統 HR。
- 新單據存檔時，員工編號／姓名快照取自所選 `staff` 的 `legacy_crm_code` 與姓名。

### 2.4 寫入紀錄 `legacy_crm.write_log`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | bigserial | |
| `occurred_at` | timestamptz | |
| `user_id` | int → `users.id` | 誰寫的 |
| `staff_id` | int nullable | 使用者綁定的員工 |
| `entity_type` | varchar | `order_document`、`sales_document`、`partner`… |
| `entity_key` | varchar | 單號／編號 |
| `action` | varchar | `create`、`update`、`delete`、`rename`（改編號） |
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
| `kind` | varchar | `document_print`（訂貨單、出貨單、工作單、估價單、標籤、信封）、`report_query`（報表預覽）、`report_print`、`statement_print`（請款單） |
| `target` | varchar | 單據種類或報表名稱 |
| `entity_key` | varchar nullable | 單號 |
| `criteria` | jsonb nullable | 報表條件：日期起迄、客戶起迄、品號起迄 |
| `row_count` | int nullable | 報表結果筆數 |
| `page_count` | int nullable | 預覽頁數 |

- 單據列印由前端在開啟列印預覽與按「印出 O」時各打一次 `POST /api/legacy-crm/print-log`；報表查詢由後端在報表 service 回傳結果時寫入。
- 含客戶資料的只有 `criteria` 的客戶編號範圍，不存報表內容。
- 查詢畫面與 `write_log` 同一頁，分頁籤。

## 3. 正式資料移轉

流程沿用 `legacy-migration-run.md`，只改匯入目標：

1. 匯出：`export-legacy-mdb-set.sh`（Jackcess、`x-windows-950`）不變，產出 CSV。
2. 匯入：新寫 `apps/backend/src/legacy-crm/migration/import-legacy-csv.ts`（或移植 `stage-legacy-import.mjs`），用 `pg` `COPY` 分表批次寫入 `legacy_crm`，交易邊界與排除規則（空白編號、孤兒明細）與現版相同；`--final` 同樣遇錯即停。
3. 民國字串日期在匯入時解析成 `date`（失敗者留 `*_raw`，見 2.2）、預填 `staff.legacy_crm_code`、建索引、`ANALYZE`。
4. 核對：`summary.json` 的筆數對照 `legacy-migration-run.md` 2026-10-07 表格（客戶 2,106、工件 407,327、訂單 174,950、出貨 181,558、工作 195,461…）。
5. 演練兩次：一次用 10/02 副本比對筆數，一次在正式切換前用當天資料。預期 PostgreSQL 匯入時間與 SQLite 同量級（2～5 分鐘）。
6. 切換日：舊系統停用、確認無 `.ldb`、複製、匯出、匯入、驗收、開放。舊系統保留唯讀備查。
7. **`legacy_crm` 的初始資料只來自 Access MDB**（決議）：新版 CRM 已輸入的 `customers`、`quotes`、`orders` 等資料不併入，原表保留不動。切換後若有需要，再另案評估人工補登。
8. 切換前確認會計系統是否有連線 VB6 銷管（目前判斷沒有的可能性較高）：在 ISIN 主機檢查 `\\ISIN\isin` 的 SMB 連線來源與 `.ldb` 內的機器名稱、詢問會計；若有，會計端的讀取需求列入第 11.1 節的共存研究並優先處理。

> 注意：移轉匯入的單據 `preserveSourceAmounts`，不觸發回寫（出貨數、已收金額、最近交易日）；匯入也不寫 `write_log`，但記一筆 `action = 'import'` 的批次摘要。

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

- 所有 controller 掛 `@UseGuards(JwtAuthGuard, FeatureGuard)`，GET 用 `@RequireFeature('crm', READ)`，寫入用 `WRITE`。路徑前綴 `/api/legacy-crm/*`。
- `db.mjs` 的業務規則逐條搬，並以 `legacy-ui-spec.md`、handoff 文件列出的實測行為寫成 Jest 測試：出貨回寫訂單出貨數（差額、多列分攤、不低於 0）、客戶最近交易日只往後推、收款自動沖銷順序與預收、單號 = 日期 + 當日序號、工作單 CNC_OK 檢查、同訂單不可重複圖號。
- 回寫與主寫入在同一 transaction（TypeORM `DataSource.transaction`），`write_log` 一併寫入。
- 民國日期只在 API 邊界轉換：DTO 收 `yyy.mm.dd` 字串，`parseRocDate` 轉 `date`；回傳時 `formatRocDate`。service 與 SQL 內一律用 `date`。
- 員工相關查詢直接 join `public.staff`（`hr/staff` 模組），legacy-crm 模組不自建員工 entity。
- 環境變數：`LEGACY_DXF_PATH`（`\\Server\C\`）、`LEGACY_CNC_PATH`（`\\SERVER\n\`）、`LEGACY_DXF_LEGACY_ROOT`；由 docker compose 掛載 SMB 目錄。

## 5. 前端：獨立 route、layout 與 design tokens

### 5.1 路由

- 前綴 `/legacy-crm`，`router/legacy-crm.ts` 獨立檔，所有 route `meta: { requiresAuth: true, feature: 'crm', layout: 'legacy' }`。
- `App.vue` 依 `route.meta.layout` 切換：`legacy` 不渲染新版側欄與頂欄，整頁交給 `LegacyShell.vue`（選單列 + MDI 子視窗 + 狀態列，即 `isin_vb6/src/App.vue`）。
- 單一入口：`/legacy-crm`；MDI 子視窗狀態在 Pinia store，不用子 route，與舊版行為一致。
- 導航守衛：沒有 `crm` 權限者導回首頁；只有 read 的人進入後，所有新增／修改／刪除按鈕停用並在狀態列顯示「唯讀」。
- 新系統首頁與側欄：在 Home 加「舊版銷管系統」卡片，點了開新分頁到 `/legacy-crm`；這是新系統到 legacy 的唯一入口，legacy 內部沒有回新系統的連結（登出除外）。

### 5.2 Design tokens

- 新建 `apps/frontend/src/legacy-crm/styles/tokens.css`，以 `.legacy-root` 為作用域定義變數（`--lg-font`、`--lg-ink`、`--lg-canvas`、`--lg-line`、`--lg-accent`…），來源為 `isin_vb6/src/style.css` 的 `:root` 變數與 `Legacy Ming` 字型。
- Tailwind `@theme` 不新增 legacy 色票，避免污染新版 token；legacy 元件只用自己的 CSS 變數與 class，`.legacy-root` 內 reset 新版的全域樣式（body 字型、min-width 1024px）。
- 列印樣式（`@page` 230 × 139.7 mm、230 × 279.4 mm、90 × 38.1 mm 標籤）照 `legacyPapers.js` 原樣搬。
- 文件：在 `.agent/rules/frontend/design-system.md` 加一節說明 legacy tokens 的作用域與「不可混用」規則。

### 5.3 元件搬移

- `isin_vb6/src/components/*` → `apps/frontend/src/legacy-crm/components/`；`src/utils/*` → `legacy-crm/utils/`。
- API 呼叫改走 `services/api.ts`（自動帶 JWT、401 導登入）；`fetch('/api/...')` 全部替換。
- JS → TS 分兩步：先改副檔名 + `// @ts-nocheck` 讓專案通過 lint；再逐檔補型別。純函式 utils 優先補型別與測試。
- 新功能掛點：MDI 選單列最右側新增「回報(B)」、狀態列顯示登入者姓名與唯讀狀態。

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

## 9. 部署與維運

- docker compose 新增 SMB 掛載（DXF、CNC 唯讀），環境變數對應 4 節。
- PostgreSQL 備份：每日 `pg_dump --schema=legacy_crm` 加整庫週備份；正式資料約 500 MB（SQLite 量級），PostgreSQL 預估 1～1.5 GB，確認 volume 容量。
- 效能：`parts` 40 萬、`order_items`／`sales_items`／`work_items` 各約 57 萬列。頭筆～尾筆瀏覽與查詢視窗依單號、客戶編號、圖號、日期建索引；報表限制 1～2 個月區間（沿用現行預設）。
- 字型：`tw-sung-legacy.woff2` 由 frontend 提供；現場 Windows 電腦優先用 `MingLiU`。
- 瀏覽器：現場電腦以 Chrome／Edge 為準，列印用瀏覽器列印對話框；第一次上線前依 handoff「未完成事項」實際印一張量測 HP 邊界。

## 10. 階段排程

| 階段 | 內容 | 完成條件 |
|---|---|---|
| 0. 收尾 isin_vb6 | 處理 handoff 未完成事項中「操作」類（報價 F8、工作 F8、收款 F3／F4）；最終 commit 與 tag `v0-final` | `npm test`、`npm run build` 通過；handoff 更新 |
| 1. 資料層 | `legacy_crm` schema、entities、第一支 migration、CSV 匯入 CLI（含民國日期解析）、`write_log`、`print_log`、`staff.legacy_crm_code` | 用 10/02 副本匯入 PostgreSQL，筆數對上 `legacy-migration-run.md`，日期解析失敗筆數可接受並已列表 |
| 2. 後端 API | 主檔、六張單據、瀏覽、F1、報表、列印資料；業務規則 Jest 測試 | 與 `isin_vb6` API 同一組請求輸出相同（錄製比對） |
| 3. 前端殼與主檔 | `/legacy-crm` route、`LegacyShell`、tokens、主檔表單、唯讀模式 | 有 `crm` read 的帳號可登入並瀏覽主檔 |
| 4. 前端單據與報表 | 六張單據、F 鍵、列印、報表、請款單 | 與 `isin_vb6` 畫面逐窗比對；列印 PDF 與 XPS 座標比對 |
| 5. 新功能 | 回報系統（含截圖、admin 限定）、write_log／print_log 查詢畫面、Slack 通知 | 回報可送出、可在設定頁處理 |
| 6. 隔離新版 CRM | 旗標隱藏路由與選單、lint 規則、文件 | 預設環境進不到 `/crm/*` |
| 7. 正式移轉與上線 | 確認會計系統是否連線舊銷管、第二次演練、切換日、現場列印量測、備份排程 | 老員工在現場完成一天作業無阻斷 |
| 8.（選配）共存研究 | 見 11.1 | 研究報告，決定做或不做 |

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

**已知條件**

- 作業 MDB 在主機 ISIN 的 SMB 共用資料夾，白天有多台電腦寫入；Access 以 `.ldb` 檔做頁鎖。
- Jackcess（Java）可開啟 Access 97 檔並讀寫；但 Jackcess 不實作 Jet 的 `.ldb` 多使用者鎖定協定，與執行中的 VB6/DAO 同時寫入會有損壞風險；部分索引回報 `SortOrder[1028(0)]` 不支援並標成唯讀。
- 目前伺服器為 Mac mini（Docker）；沒有 Windows 版 Jet/ACE 驅動可用。

**要研究的套件與方法**

| 方向 | 候選 | 驗證重點 |
|---|---|---|
| 唯讀即時讀取 | Jackcess（已在用）、`mdbtools`（C，`mdb-export`）、Python `pandas_access`／`mdbtools` 綁定、Node `node-mdb`／`mdb-reader`（純 JS，唯讀） | 開啟中（有 `.ldb`）能否安全讀；Access 97 (Jet 3.x) 支援度；中文 950 字碼頁；讀取延遲 |
| 寫入 | Jackcess（唯一跨平台可寫方案）；Windows 端用 ODBC/DAO 的小型 bridge 服務（.NET + `Microsoft.Jet.OLEDB.4.0`，需 32 位元） | 與 VB6 同時開啟時的鎖定行為；索引相容；寫入後 VB6 畫面是否立即看到 |
| 檔案層 | SMB 從容器掛載 `\\ISIN\isin`（`cifs-utils`，SMB1 相容性，Win7 預設 SMB1/2） | oplock／byte-range lock 是否透傳；Docker on Mac 掛載 SMB 的穩定度 |
| 變更偵測 | 輪詢 MDB mtime + 增量讀取；或 Windows 端 bridge 用 `FileSystemWatcher` | 同步延遲、負載 |

**可能的結論形態**

1. **只做單向唯讀共存**：新系統定時從 MDB 讀取增量到 `legacy_crm`（舊系統是 system of record），新系統只查詢不寫。風險低，但員工仍得在舊系統寫，意義不大。
2. **Windows bridge 雙向**：在一台 Windows 機跑 32 位元 Jet 服務，新系統透過它讀寫 MDB。可行但多一台機器與一套服務要維護。
3. **不共存，整批切換**：以目前移轉只需幾分鐘的事實，選一個下班後切換。**預設建議**，共存研究只作為備案。

研究輸出：`docs/LEGACY-CRM-COEXISTENCE-RESEARCH.md`，含每個套件實測結果（只對 `_isin_YYYYMMDD` 副本測，不碰正式檔）。

### 11.2 其他待決

- 現場是否有仍需用 Win7 + 舊程式的機台或流程（例如 CNC 檔產生），影響共存研究的優先度。
- 會計系統連線舊銷管的實際確認結果（見 3 第 8 項）；若有，需要哪些表、唯讀還是寫入。
- HR 使用者是否也要能看 legacy CRM 的員工相關資料（目前不給）。
- 日期解析失敗的舊資料（兩位數年份等）是否在移轉前於舊系統修正，還是接受 `*_raw` 顯示。

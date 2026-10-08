# 舊版銷管 API（legacy-crm）

> 對應規劃：`LEGACY-CRM-REBUILD-PLAN.md` 第 4、8 節，第 2 階段。
> 程式：`apps/backend/src/legacy-crm/`。移植自 isin_vb6 `server/`，基準為 tag `v0-final`（`7b9e36a`，isin_vb6 已收尾，不再修改）。
> 第 2 階段以 `c7ec2a8` 移植。第 3 階段補上之後的兩個修改：主檔編號重複的訊息改為「資料重覆。」；更改客戶編號時，圖組的客戶編號不換。
> 本文件給第 3、4 階段的前端移植使用：說明路由、回應形狀、權限，以及和 isin_vb6 不同的地方。

## 共通約定

- **路徑**：
  - 後端為 `/legacy-crm/*`，前端經代理呼叫 `/api/legacy-crm/*`。
  - isin_vb6 的 `/api/<資源>` 對應到 `/api/legacy-crm/<資源>`，其餘路徑與查詢參數相同。
- **登入與權限**：
  - 一律要求 JWT（`Authorization: Bearer`），權限依 `crm` 功能判斷，admin 不需授權。
  - 唯讀（read）：可查詢、瀏覽、F1、報表，以及記錄列印。
  - 寫入（write）：另外可以新增、修改、刪除。
  - 沒有權限回 403，未登入回 401。
  - `crm` 功能由 migration `1791460000000-PrepareLegacyCrmApi` 建立，授權方式與其他功能相同，寫在 `user_features`。
- **回應形狀**：與 isin_vb6 相同。
  - 列表：`{ items, limit: 500 }`。
  - 單筆：`{ item }`；新增回 201。
  - 刪除：`{ deleted: true }`。
  - 欄位名稱都是 snake_case，與 isin_vb6 一樣。
- **錯誤**：採 isin_nest 的全域格式 `{ statusCode, message, … }`。
  - isin_vb6 是 `{ error }`，前端改用 `services/api.ts` 時要讀 `message`。
  - 驗證錯誤回 400，找不到回 404；訊息文字與 isin_vb6 相同。
- **日期**：
  - 輸入、輸出都是民國字串 `yyy.mm.dd`，資料庫內存 `date`。
  - 舊資料原字串若無法由日期還原，輸出會照原字串（規劃 2.2）。
  - 輸入的日期不合法時回 400「<欄位>不是有效日期」；isin_vb6 不檢查，會照存。
- **金額與數量**：輸出為數字，等於資料庫 `*_units / 10000`，與 isin_vb6 相同。
- **時間戳**：`created_at`、`updated_at` 輸出 ISO 字串，isin_vb6 是 SQLite 文字。
- **寫入紀錄**：
  - 每次新增、修改、刪除都寫一筆 `legacy_crm.write_log`，與資料在同一個 transaction。
  - 每筆記下使用者、綁定的員工、request id、client，以及前後整筆資料。
  - 有連帶回寫時，內容記在 `side_effects`：訂單出貨數、結案、客戶最近交易日、工件單價、工件最近交易（CNC3）、出貨已收金額、折讓、客戶應收餘額、更改編號時搬動的列數。
  - 前端可帶 `X-Request-Id`（UUID）與 `X-Client-Version`。

## 路由

| 路由                                                          | 方法             | 權限        | 說明                                                 |
| ------------------------------------------------------------- | ---------------- | ----------- | ---------------------------------------------------- |
| `partners?kind=customer\|supplier&search=`                    | GET              | read        | 客戶／廠商列表                                       |
| `partners`                                                    | POST             | write       | 新增（body 含 `kind`）                               |
| `partners/:kind/:code`                                        | GET／PUT／DELETE | read／write |                                                      |
| `partners/customer/:code/rename`                              | POST `{code}`    | write       | 更改編號，單據、工件上的客戶編號一起換，圖組不換；回 200 |
| `materials`、`materials/:id`                                  | 標準             |             | 材質；`id` 取代 isin_vb6 的 rowid（移轉後編號相同）  |
| `parts`、`parts/:drawingNo`                                   | 標準             |             | 工件；單筆含 `latest_sale_date`                      |
| `parts/:drawingNo/sales?customer=&order=`                     | GET              | read        | 出貨記錄                                             |
| `banks`、`phrases`、`postal-codes`、`groups`                  | 標準             |             | 銀行（含支票位置）、詞彙、郵遞區號、圖組             |
| `orders`、`sales`、`quotes`、`work-orders`、`receipts`        | 標準             |             | 單據，單筆含明細                                     |
| `receipt-candidates?customer_code=&closing_date=&receipt_no=` | GET              | read        | 沖帳明細候選與前期預收                               |
| `documents/:type/navigate?direction=&from=`                   | GET              | read        | 頭筆／上筆／下筆／尾筆                               |
| `documents/:type/next-number?date=`                           | GET              | read        | 新單號                                               |
| `documents/:type/query?number=&party=`                        | GET              | read        | 查詢視窗                                             |
| `assist/:kind?prefix=&customer=&order=&from=&to=`             | GET              | read        | F1 輔助輸入                                          |
| `print-log`                                                   | POST             | read        | 記錄列印，見下                                       |
| `reports/catalog`、`reports/:key/preview`                     | GET              | read        | 報表（見「報表與圖檔」）                             |
| `drawings/shapes`、`drawings/cnc`                             | GET              | read        | 工件簡圖、CNC 檔狀態（見「報表與圖檔」）             |

「標準」指 `GET /`（`?search=`）、`POST /`、`GET /:key`、`PUT /:key`、`DELETE /:key`；讀取需要 read，其餘需要 write。

**不搬的路由**（規劃 1.2）：

- `employees`：員工改由 HR 維護。F1 的 `assist/employee` 改從 `staff` 取。
- `system/*`、`import/*`、`migration/*`、`backup`、`restore`、`health`。

### 列印紀錄

`POST /api/legacy-crm/print-log`，成功回 204。body 欄位：

- `kind`：`document_preview`、`document_print`、`report_print` 或 `statement_print`。
- `target`：單據種類或報表名稱，最多 40 字。
- 選填：
  - `entity_key`：單號。
  - `criteria`：條件物件。
  - `row_count`：筆數。
  - `page_count`：頁數。

單據開啟列印預覽、按「印出」時各打一次。報表預覽由後端自己記錄 `report_query`，前端不用打。

### 報表與圖檔

- **報表**：
  - `reports/catalog?group=` 回報表目錄，共 31 張，分 4 種 group。
  - `reports/:key/preview?<條件>` 的回傳與 isin_vb6 `runReport` 相同。
  - 每次預覽都寫一筆 `print_log`，kind 為 `report_query`，含條件與筆數。寫入失敗時預覽也失敗，以稽核為優先。
  - 日期條件不合法時回 400。
  - 程式：`reports/report-definitions.ts`，存放各報表的 PostgreSQL SQL。
- **工件簡圖**：
  - `drawings/shapes?numbers=a,b&customer=` 回 `{ configured, shapes }`。
  - 未設定 `LEGACY_DXF_PATH` 時 `configured: false`。
  - 檔案伺服器逾時回 503「圖檔伺服器無回應」。
- **CNC 檔狀態**：
  - `drawings/cnc?numbers=` 回 `{ items }`。
  - 未設定 `LEGACY_CNC_PATH` 時 `items: null`。
  - 逾時的圖號不放進 `items`，另外列在 `unknown`。
- **工作登錄存檔前的 CNC 檢查**：
  - 檢查對象：有圖號、且雷射工件不是 N 的列。
  - 沒有 CNC 檔時拒存，訊息為「{圖號}尚未完成CNC檔」。
  - 檔案伺服器逾時也拒存，訊息為「{圖號}無法確認CNC檔（CNC檔伺服器無回應），請稍後再存檔」。
  - 未設定 `LEGACY_CNC_PATH` 時不檢查。
- **環境變數**（預設值同 isin_vb6）：
  - `LEGACY_DXF_PATH`、`LEGACY_DXF_LEGACY_ROOT`（預設 `\\Server\C\`）。
  - `LEGACY_CNC_PATH`、`LEGACY_CNC_LEGACY_ROOT`（預設 `\\SERVER\n\`）。
  - Docker（`docker-compose.yml`）預設 `LEGACY_DXF_PATH=/nas/c`、`LEGACY_CNC_PATH=/nas/n`，即 `NasService` 依 `/etc/auto_nas` 掛載的 `\\SERVER\C`、`\\SERVER\n`。
- **檔案存取**：
  - 所有 SMB 存取都經過 `LegacyFileService`：同時最多 4 個操作，每個 3 秒逾時。
  - 檔案路徑只由圖號推得，不列目錄、不建索引。

## 和 isin_vb6 不同的地方

1. **單據列表的日期排序**（`orders`、`sales`、`quotes`、`work-orders`、`receipts` 的 `GET /`）。
   - isin_vb6 依去掉空白的日期文字倒序排，民國 99 年以前的單據（例如 `99.12.31`）會排在 115 年前面。
   - 新版依日期排序，最新的在前。
   - 用 isin_vb6 的 SQL 修正排序後比對，30 組列表（含搜尋）的單號與明細數完全相同。
2. **日期輸入**：不合法的日期（例如 `115.13.01`）拒絕；isin_vb6 照存。
3. **F1 員工**（`assist/employee`）：列出 `staff` 中在職、且有 `legacy_crm_code` 的員工，回傳 `{ code, name }`；isin_vb6 列出舊員工檔（規劃 2.3）。
4. **報價記錄**（`assist/quote-history`）：同日期、同客戶型號的並列，在 isin_vb6 中先後不固定；新版依單號、項次倒序。
5. **錯誤與 404**：未知路由的訊息是 Nest 預設的 `Cannot GET …`，isin_vb6 是「找不到 API」。狀態碼相同。
6. **報表**：
   - 依日期排序的報表改用日期欄：order-unshipped、sales-journal、sales-date-detail、sales-account-fields、receivable-detail、receipt-register、receipt-payment-register。isin_vb6 直接以文字排序，99 年會排在 100 年之後。
   - 日期條件不合法時回 400。
   - 4 位數民國年份（4 張訂單）依真實日期處理；isin_vb6 會把年份截掉一位。
   - employee-list 改由 `staff` 提供：
     - 職稱取 `post`，任職日期取 `begain_work`。
     - 身分證號、出生日期、電話、地址 `staff` 沒有，留空。
7. **搜尋**：isin_vb6 的 SQLite `LIKE` 只對英文不分大小寫，新版用 `ILIKE`；中文沒有影響。

其餘欄位與數值都與 isin_vb6 相同，依據見下節。

## 驗證（2026-10-08，10/02 副本）

- **環境**：
  - isin_vb6 API：跑在由同一份 CSV 匯入的 SQLite 副本上。
  - 新版：跑在測試資料庫上，用 `legacy-crm/dev/serve-legacy-crm.ts` 起的精簡後端（只有登入、權限與舊版銷管模組，不讀 `.env`）。
  - 兩邊送出同一組請求，忽略 `created_at`、`updated_at` 後逐值比對。
- **讀取**：1,105 個 GET。
  - 主檔、單據單筆、出貨記錄、沖帳候選、頭筆～尾筆、查詢視窗、新單號、F1 都完全相同。
  - 1,080 個完全相同，其餘都是上一節第 1、3、4 點，以及 3 個圖號空白的 404（只有訊息不同）。
- **寫入**：72 個步驟，兩邊執行同一串操作，71 個相同。
  - 涵蓋主檔 CRUD、訂單 → 出貨（新增、修改、刪除）→ 收款（新增、修改、刪除）、工作單、報價、圖組、更改客戶編號，以及重複、空白、不存在等錯誤。
  - 回應與連帶回寫都一致：訂單各列出貨數、結案、客戶最近交易日與應收餘額、工件單價與 CNC3、出貨已收、折讓與應收。
  - 唯一的差異是上一節第 2 點。
- **單元與整合測試**：legacy-crm 共 10 個 suite、71 項，全部通過。其中 `legacy-crm.integration.spec.ts` 有 15 項，對可拋棄的 PostgreSQL 執行。
  - 移植自 isin_vb6 的業務規則測試：出貨攤到訂單各列、結案、最近交易日、工件單價與欄寬、內含稅、收款折讓與沖帳、工作單 CNC3、CNC 檢查拒存、更改編號、新單號與文字順序、F1 員工、寫入紀錄、失敗時整批還原。
  - 執行方式寫在檔案開頭。
- **報表**：每張報表 25～29 組條件，與 isin_vb6 `runReport` 比對。
  - 比對時另做一份修正排序的 isin_vb6，除第 6 點與不合法日期外都相同。
  - DXF 解析與 DXF／CNC 路徑推算另以 5,000 個隨機 DXF、660 組路徑比對，0 差異。
  - 移植與比對由背景 agent 完成，腳本留在 scratchpad。
- **CNC 端對端**：
  - `LEGACY_CNC_PATH` 指向暫存目錄。
  - 沒有檔案時工作單存檔回 400「…尚未完成CNC檔」；放入檔案後存檔成功。
  - 雷射工件 N 的列不檢查。
- **效能**（約 290 萬列）：
  - 主檔列表、搜尋：約 0.02 秒。
  - 單據列表：0.1～0.3 秒。
  - 工作單全文搜尋：0.6 秒。
  - 瀏覽與 F1：0.1 秒以內。
  - 與 isin_vb6 同一量級。

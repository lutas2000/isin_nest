# 舊版銷管前端（/legacy-crm）

> 對應規劃：`LEGACY-CRM-REBUILD-PLAN.md` 第 5 節，第 3、4 階段。
> 程式：`apps/frontend/src/legacy-crm/`。移植自 isin_vb6 `src/`，基準為 tag `v0-final`（`7b9e36a`）。
> API 見 `LEGACY-CRM-API.md`。

## 入口與權限

- **路由**：`/legacy-crm`，只有這一條（`router/legacy-crm.ts`）。
  - `meta.layout = 'legacy'`：`App.vue` 只渲染 `<router-view>`，不顯示新版側欄與頂欄。
  - 新系統的錯誤視窗（`ErrorModal`）照常顯示。
  - 子視窗留在畫面內，不用子 route。
- **登入**：未登入時導向 `/login?redirect=/legacy-crm`，登入後回到原頁。
  - `Login.vue` 只接受站內路徑。
- **權限**：`meta.feature = 'crm'`。
  - 路由守衛用 `stores/auth.ts` 的 `userHasFeature` 判斷，沒有 `crm` read 時導回首頁。
- **唯讀**：只有 `crm` read 時：
  - 新增、更新、刪除、更改編號都停用，F5／F6／F7 不作用。
  - 除了編號欄，其他欄位都不能改；編號欄仍可輸入後按 Enter 查詢。
  - 狀態列顯示「唯讀」。後端也會擋寫入（403）。
- **入口**：首頁的「舊版銷管系統」卡片，有 `crm` 權限才顯示，開新分頁。
  - 舊版畫面內沒有回新系統的連結，只有狀態列的「登出」。
- **登入失效**：token 過期或無效時，跳出新系統的登出提示。
  - 後端只回 Nest 預設的「Unauthorized」，`services/api.ts` 現在也把它當成登入失效。這個修正同時套用在新版頁面。

## 結構

| 檔案                                                                                                                                                                                                           | 來源（isin_vb6）                           | 說明                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| `LegacyShell.vue`                                                                                                                                                                                              | `src/App.vue`                              | 選單列、MDI 子視窗、狀態列；狀態列右側加登入者、唯讀、登出                   |
| `components/LegacyMasterForm.vue`、`LegacyRecordToolbar.vue`、`LegacyQueryWindow.vue`、`LegacyAssistHost.vue`、`LegacyExpandWindow.vue`、`LegacyPartSalesWindow.vue`、`LegacyDrawingPanel.vue`、`MdiChild.vue` | 同名                                       | 主檔表單與共用視窗                                                           |
| `components/PartnersView.vue`、`PartsView.vue`、`MasterDataView.vue`                                                                                                                                           | 同名                                       | 客戶、廠商、工件、材質、銀行、詞彙、郵遞區號；`MasterDataView` 不含員工      |
| `components/OrdersView.vue`、`SalesView.vue`、`ReceiptsView.vue`、`QuotesView.vue`、`WorkView.vue`、`GroupsView.vue`                                                                                           | 同名                                       | 交易登錄與圖組建檔（第 4 階段）                                              |
| `components/ReportsView.vue`、`LegacyPreviewWindow.vue`、`LegacyReportSheet.vue`、`LegacyDocumentPrint.vue`、`LegacySelectionWindow.vue`、`LegacyDrawingWindow.vue`、`LegacyOrderToWorkWindow.vue`             | 同名                                       | 報表對話框、資料列印預覽、單據列印、選項／報價記錄、F11 秀圖、訂單轉成工作單 |
| `services/legacyPrintLog.ts`                                                                                                                                                                                   | 新增                                       | 列印紀錄（`POST /legacy-crm/print-log`）                                     |
| `styles/legacy-print.css`                                                                                                                                                                                      | `src/style.css` 的 `@page`、`@media print` | 見「列印」                                                                   |
| `utils/*.ts`                                                                                                                                                                                                   | `src/utils/*.js`                           | 改 TypeScript                                                                |
| `utils/legacyAccess.ts`、`partDraft.ts`                                                                                                                                                                        | 新增                                       | 唯讀判斷；訂單 F2 開工件建檔用的 provide／inject key                         |
| `services/legacyApi.ts`                                                                                                                                                                                        | 各元件的 `fetch`                           | 經 `services/api.ts` 帶 JWT                                                  |
| `styles/tokens.css`、`styles/legacy.css`、`assets/fonts/`                                                                                                                                                      | `src/style.css`、`public/fonts/`           | 見「樣式」                                                                   |

## 移植約定（第 4 階段照做）

1. **檔名與位置**：檔名同 isin_vb6，元件放 `components/`，工具放 `utils/`。
2. **TypeScript**：
   - 元件用 `<script setup lang="ts">`，型別先補在 props、ref 與函式參數。專案沒有 `vue-tsc`，`.vue` 不會被型別檢查。
   - `utils` 改成 `.ts`，必須通過 `tsc --noEmit` 與 ESLint。
   - 新檔用 prettier 排版。
3. **API**：
   - `fetch('/api/x')` 改成 `legacyGet('/x')`，寫入用 `legacySend('/x', method, body)`。
   - 錯誤訊息直接用 `error.message`：後端回 `{ message }`，isin_vb6 是 `{ error }`。
   - 錯誤由舊版表單自己顯示，不跳新系統的錯誤視窗；登入失效除外。
4. **唯讀**：
   - 有按鈕列的表單用 `LegacyRecordToolbar`，會自動停用新增、更新、刪除。
   - 欄位能不能改，用 `useLegacyReadOnly()` 判斷。
   - 其他會寫入的按鈕要自己加唯讀判斷，例如訂單轉工作單、收款沖帳。
   - 單據表單用 `useLegacyFieldLock()`（`utils/legacyAccess.ts`），見「唯讀的單據」。
5. **樣式**：
   - 只用 `styles/legacy.css` 的 `.legacy-*` class 與 `--lg-*` token，不用 Tailwind class。
   - `legacy.css` 已含 isin_vb6 單據、報表、預覽視窗的規則。
6. **列印**：`@page` 與 `@media print` 在 `styles/legacy-print.css`，只對舊版的列印頁作用，見「列印」。
7. **選單**：在 `LegacyShell.vue` 的 `v-if` 鏈加上新的 view。所有選單項都已搬入。
8. **員工**：沒有員工主檔。F1 員工、業務欄位從 `staff` 取（`assist/employee`）。

## 樣式

- **作用域**：全部規則都在 `.legacy-root` 內，新版頁面不受影響。
  - `.legacy-root` 是 `LegacyShell` 的根元素。
  - 樣式跟著路由分包，只在進入 `/legacy-crm` 時載入。
- **還原瀏覽器預設**：isin_vb6 是在瀏覽器預設樣式上寫的。`.legacy-root` 內：
  - Tailwind preflight 用 `@layer base { all: revert-layer }` 略過。
    - 不用 `revert`：它會連 HTML 屬性帶來的預設（表格儲存格的 1px padding）一起略過，銀行建檔的支票位置表會變矮。
  - `style.css` 的全域 `h1`～`h6`、`p`、`a` 用 `revert` 還原。
- **tokens**（`tokens.css`）：
  - `--lg-font`、`--lg-ink`、`--lg-face`、`--lg-line`、`--lg-label` 等是 Win7 舊版畫面的配色與字型。
  - 值與 isin_vb6 完全相同，畫面逐欄比對過，不可修改。
  - 只出現一兩次的顏色仍寫在規則內。
- **字型**：細明體優先用本機 `MingLiU`；沒有時用全字庫正宋體子集 `assets/fonts/tw-sung-legacy.woff2`（3.2 MB，授權見同目錄 `README.md`）。
  - 放 `src/` 而不是 `public/`：專案的 `.gitignore` 會忽略 `public`。

## 唯讀的單據

- 只有 `crm` read 的使用者看單據時，欄位改用 `readonly`，不是 `disabled`。
  - 欄位仍可聚焦，所以明細的 F11 秀圖、F12 交易歷史可用。
  - F1 可以開查詢清單，但選了不會改欄位；編號與客戶欄照常用來查詢。
  - F2 建立工件圖檔、F3／F4、F8、F10、收款「保留」、工作登錄的新增（訂單轉成工作單）都不作用。
  - `readonly` 與 `disabled` 的欄位外觀相同。
- 列印 P、列印標籤 L、報表與印出 O 都可以用。

## 列印

- **列印紀錄**（規劃 2.5）：
  - 單據：開啟列印預覽時記 `document_preview`，按「印出 O」時記 `document_print`。
    - `target` 為訂貨單、出貨單、估價單、工作單、圖組組合表；列印標籤為「標籤」，`criteria.document` 記單據種類。
  - 報表：預覽由後端記 `report_query`。按「印出 O」時前端記 `report_print`；請款單記 `statement_print`。
    - `target` 為報表名稱，`criteria` 含報表代碼與條件，`row_count` 為筆數（請款單為出貨筆數，和 `report_query` 相同）。
  - 紀錄失敗不擋列印。
- **紙張**（`styles/legacy-print.css`）：
  - 只用具名的 `@page`：`legacy-full`（230 × 279.4 mm）、`legacy-half`（230 × 139.7 mm）、`legacy-label`（90 × 38.1 mm），不改預設紙張。
  - `@media print` 的規則都以作用中視窗的 `.legacy-print-pages` 為條件（`:has`）。沒有列印頁時，或離開舊版畫面後，列印照瀏覽器預設。
  - 列印時只留列印頁，其他元素 `display: none`，列印頁在一般排版流中從紙張左上角開始。

## 和 isin_vb6 不同的地方

1. **員工建檔**：從檔案選單移除，員工改在新系統 HR 維護（規劃 2.3）。
2. **狀態列**：右側多了登入者（綁定員工的姓名，沒有就顯示帳號）、「唯讀」與「登出」。
3. **登入與權限**：見「入口與權限」。isin_vb6 沒有登入。
4. **唯讀**：見「唯讀的單據」。isin_vb6 沒有唯讀。
5. **「關於本軟體」**：資料庫改寫成 PostgreSQL。
6. **列印紙張**：isin_vb6 把列印頁絕對定位、其餘內容 `visibility: hidden`。Chrome 不會把具名 `@page` 套到絕對定位的內容，所以 isin_vb6 的半張與標籤其實都印在預設的全張上（2026-10-08 以 Chrome PDF 確認）。
   - 新版讓列印頁在一般排版流中，半張、標籤、全張各用自己的紙張。
   - 紙上的內容與位置和 isin_vb6 相同。
7. **列印紀錄**：見「列印」。
8. **員工報表的選項**：員工資料表改由 `staff` 提供（`LEGACY-CRM-API.md`），選項視窗列出的員工也來自 `staff`。

其餘版面、按鍵與訊息都和 isin_vb6 相同。

## 驗證（2026-10-08，10/02 副本）

- **畫面比對**：`scripts/legacy-crm/compare-screens.mjs`。
  - 兩邊接同一份資料：isin_vb6 接 SQLite 副本，isin_nest 接測試資料庫。
  - 用 Mac 的 Chrome 截 1280×800 的圖，逐像素比較。
  - 16 個場景：開啟畫面、檔案選單、客戶（頭筆、下筆、尾筆、查詢 R）、廠商（含 F12 展開顯示）、工件（含出貨記錄、F1 客戶查詢）、材質、銀行、詞彙、郵遞區號、梯式排列。
  - 結果：除了狀態列右下角的登入者與登出（891 個像素），以及檔案選單少了員工建檔，其餘**逐像素相同**。
- **端對端測試**：`tests/legacy-crm/legacy-crm.spec.ts`，8 項全部通過。
  - 涵蓋：登入導向、沒有權限導回、首頁入口、唯讀、選單、客戶新增／重複／修改／更改編號／刪除、token 失效、登出。
  - 寫入後在 `legacy_crm.write_log` 確認有對應紀錄，`user_id` 為操作的帳號。
- **建置與檢查**：
  - `vite build` 成功，舊版畫面另成一包：JS 52 KB、CSS 20 KB、字型 3.2 MB。
  - `tsc --noEmit` 沒有新的錯誤：既有的 17 個錯誤都在新版 CRM。
  - 新檔通過 ESLint。

## 驗證（第 4 階段，2026-10-08）

- **畫面比對**：`compare-screens.mjs` 加了 32 個場景，連同第 3 階段的 16 個共 48 個。
  - 涵蓋：交易登錄選單；訂單、出貨、收款、報價、工作、圖組各在頭筆或尾筆；查詢視窗；明細 F1（工件、銀行、材質）、F8 報價記錄、F11 秀圖、F12 出貨記錄；工作登錄新增時的「訂單轉成工作單」；訂貨單、標籤、出貨單、估價單、工作單、圖組組合表的列印預覽；報表選單、對話框、F1、選項視窗；銷貨日期別明細表、未交貨工件明細表、請款單（簡要式）的預覽。
  - 結果：除了狀態列右下角的登入者與登出（891 個像素），**逐像素相同**；列印預覽蓋住狀態列的 9 個場景完全相同。第 3 階段的 16 個場景結果不變。
  - 比對時 isin_nest 用第 3 階段 commit 的樣式加上第 4 階段的檔案。同一天另有 Win7 樣式調整在進行，不在比對範圍內。
- **列印**：以 Chrome 產生 PDF 確認紙張。
  - 訂貨單 230 × 139.7 mm、標籤每張 90 × 38.1 mm、估價單 230 × 279.4 mm、請款單每頁 230 × 139.7 mm。
  - 不是作用中視窗的列印頁不印；離開舊版畫面後，同一分頁的新版頁面仍是預設紙張。
  - 列印紀錄：預覽、印出、報表與請款單各打一次，唯讀帳號也回 204。
- **端對端測試**：共 10 項。新增 2 項，改寫 1 項：
  - 唯讀：單據可瀏覽、明細不可改、F3／F4 不動作、F11／F12 可用、列印預覽並記錄 `document_preview`；其他單據不能新增；工作登錄 F5 不開訂單轉成工作單；報表可預覽。
  - 寫入：建立 `ZZE2E3` 測試客戶，新增訂單 `ZZE2E01`（存檔後自動開列印預覽）、修改數量、刪除，最後刪除客戶。
  - 選單：交易登錄與報表已搬入。
- **建置與檢查**：`vite build` 成功，舊版畫面仍另成一包；`tsc --noEmit` 仍是既有的 17 個錯誤；ESLint 沒有問題。

## 本機執行（只接測試資料庫）

```sh
# 後端：只有登入、權限與舊版銷管模組，不讀 .env
DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=… DB_PASS=… DB_NAME=… JWT_SECRET=dev-only PORT=3100 \
  npx ts-node -r tsconfig-paths/register apps/backend/src/legacy-crm/dev/serve-legacy-crm.ts

# 前端：環境變數蓋過 .env 的 PORT，讓 /api 代理到上面的後端
cd apps/frontend && PORT=3100 BACKEND_API_HOST=127.0.0.1 FRONTEND_DEV_PORT=3101 npx vite --host 127.0.0.1

# 端對端測試：測試資料庫要有四個帳號（admin、crm read、crm write、沒有 crm）
LEGACY_CRM_E2E_BASE_URL=http://127.0.0.1:3101 LEGACY_CRM_E2E_PASSWORD=… LEGACY_CRM_E2E_CHANNEL=chrome \
  npx playwright test tests/legacy-crm --project=chromium --reporter=line
```

isin_vb6 的對照環境：

```sh
ISIN_DATABASE_PATH=<SQLite 副本> ISIN_PORT=4176 node server/index.mjs
ISIN_WEB_PORT=5174 ISIN_API_TARGET=http://127.0.0.1:4176 npx vite --host 127.0.0.1
```

這兩行在 `../isin_vb6` 執行。副本會被它升級 schema，所以不要用原檔。

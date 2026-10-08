# 舊版銷管前端（/legacy-crm）

> 對應規劃：`LEGACY-CRM-REBUILD-PLAN.md` 第 5 節，第 3 階段（第 4 階段沿用本文件的約定）。
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

| 檔案                                                                                                                                                                                                           | 來源（isin_vb6）                 | 說明                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `LegacyShell.vue`                                                                                                                                                                                              | `src/App.vue`                    | 選單列、MDI 子視窗、狀態列；狀態列右側加登入者、唯讀、登出                  |
| `components/LegacyMasterForm.vue`、`LegacyRecordToolbar.vue`、`LegacyQueryWindow.vue`、`LegacyAssistHost.vue`、`LegacyExpandWindow.vue`、`LegacyPartSalesWindow.vue`、`LegacyDrawingPanel.vue`、`MdiChild.vue` | 同名                             | 主檔表單與共用視窗                                                          |
| `components/PartnersView.vue`、`PartsView.vue`、`MasterDataView.vue`                                                                                                                                           | 同名                             | 客戶、廠商、工件、材質、銀行、詞彙、郵遞區號；`MasterDataView` 不含員工     |
| `utils/*.ts`                                                                                                                                                                                                   | `src/utils/*.js`                 | 改 TypeScript；`legacyDocumentPaper.ts` 目前只有 `shapeSize`，第 4 階段補齊 |
| `utils/legacyAccess.ts`、`partDraft.ts`                                                                                                                                                                        | 新增                             | 唯讀判斷；訂單 F2 開工件建檔用的 provide／inject key                        |
| `services/legacyApi.ts`                                                                                                                                                                                        | 各元件的 `fetch`                 | 經 `services/api.ts` 帶 JWT                                                 |
| `styles/tokens.css`、`styles/legacy.css`、`assets/fonts/`                                                                                                                                                      | `src/style.css`、`public/fonts/` | 見「樣式」                                                                  |

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
5. **樣式**：
   - 只用 `styles/legacy.css` 的 `.legacy-*` class 與 `--lg-*` token，不用 Tailwind class。
   - `legacy.css` 已含 isin_vb6 單據、報表、預覽視窗的規則。
6. **列印**：
   - 第 4 階段要搬 `@page` 與 `@media print`。
   - 要限定在舊版的列印頁（例如 `body:has(.legacy-print-pages)`），不可影響新版頁面的列印。
7. **選單**：在 `LegacyShell.vue` 的 `v-if` 鏈加上新的 view。「尚未搬入」說明只留給還沒搬的選單項。
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

## 和 isin_vb6 不同的地方

1. **員工建檔**：從檔案選單移除，員工改在新系統 HR 維護（規劃 2.3）。
2. **狀態列**：右側多了登入者（綁定員工的姓名，沒有就顯示帳號）、「唯讀」與「登出」。
3. **登入與權限**：見「入口與權限」。isin_vb6 沒有登入。
4. **還沒搬的畫面**：圖組建檔、交易登錄、報表列印顯示「尚未搬入新系統，請暫時使用舊系統」，第 4 階段搬入。
   - 圖組建檔有列印，所以和單據一起搬。
5. **「關於本軟體」**：資料庫改寫成 PostgreSQL。

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

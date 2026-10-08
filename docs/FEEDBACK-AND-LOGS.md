# 回報系統與舊版銷管紀錄查詢

> 對應規劃：`LEGACY-CRM-REBUILD-PLAN.md` 第 2.4、2.5、7、8 節，第 5 階段（2026-10-08）。
> 程式：後端 `apps/backend/src/feedback/`、`apps/backend/src/legacy-crm/log-query/`（目錄不叫 `logs`：`.gitignore` 會忽略所有 `logs` 目錄）；前端 `apps/frontend/src/views/FeedbackReports.vue`、`services/feedback.ts`、`legacy-crm/components/LegacyExtraMenus.vue`、`LegacyFeedbackDialog.vue`、`LegacyLogWindow.vue`。
> 舊版銷管其他 API 見 `LEGACY-CRM-API.md`，前端約定見 `LEGACY-CRM-FRONTEND.md`。

## 權限

| 動作 | 需要 | 路由 |
| --- | --- | --- |
| 送出回報 | 任何登入者（不需要 `crm`） | `POST /api/feedback` |
| 回報列表、可指派的處理者、改狀態／處理者／處理結果 | admin 或 `feedback` write | `GET /api/feedback`、`GET /api/feedback/assignees`、`PATCH /api/feedback/:id` |
| 看回報截圖 | 只有 admin（回報者本人也不行） | `GET /api/feedback/:id/screenshot` |
| 查寫入紀錄、列印紀錄 | 只有 admin | `GET /api/legacy-crm/logs/*` |
| 記錄列印 | `crm` read（第 2 階段已有） | `POST /api/legacy-crm/print-log` |

- 未登入回 401，權限不足回 403。
- `feedback` 功能由 migration `1791468000000-CreateFeedbackReports` 建立（與 `crm` 相同做法），在設定頁授權給使用者。`feedback` read 沒有用途：列表也要 write。
- 前端 `/settings/feedback` 的路由守衛同樣要求 `feedback` write，側欄「系統管理」與系統設定頁的頁籤列有連結（有權限才顯示）。

## 回報 API（`/api/feedback`）

### 資料表 `public.feedback_reports`

欄位照規劃 7.1：`id`、`created_at`、`updated_at`、`user_id`、`kind`（`bug`、`feature`、`question`）、`title`（100 字）、`body`（5000 字）、`context`（jsonb）、`screenshot_path`、`status`（`open`、`triaged`、`in_progress`、`done`、`wont_fix`，預設 `open`）、`assignee_user_id`、`resolution`。

- `user_id`、`assignee_user_id` 不設外鍵，與 `write_log` 相同：回報要比帳號活得久。
- `screenshot_path` 只存檔名（`<uuid>.png`），檔案在 `FEEDBACK_UPLOAD_DIR`。

### 送出 `POST /api/feedback`

- `multipart/form-data`：
  - `kind`、`title`、`body`：必填，前後空白會去掉。
  - `context`：選填，JSON 物件字串，最多 4000 字。舊版畫面送 `route`、`window`（MDI 目前視窗標題）、`screen`、`viewport`、`device_pixel_ratio`、`user_agent`、`client_version`（目前沒有版本來源，為 null）、`reported_at`。
  - `screenshot`：選填，PNG，上限 5 MB（剛好 5 MB 可以）。
- 截圖檢查 PNG 檔頭，不信任瀏覽器送的類型；不是 PNG 回 400，超過 5 MB 回 413。
- 截圖檔名用 uuid，存在 `FEEDBACK_UPLOAD_DIR`（預設 `files/feedback`），不在靜態目錄。沒有保留期限。
- 成功回 201 `{ item }`。

### 列表 `GET /api/feedback`

- 條件（都可省略）：`status`、`kind`、`assignee`（users.id，或 `none` 表示未指派）、`q`（標題或描述）、`from`、`to`（`YYYY-MM-DD`，台北日期，含起迄）、`page`、`page_size`（預設 50，上限 200）。
- 回 `{ items, total, page, page_size }`，新的在前。
- 每筆含 `reporter`、`assignee`：綁定員工的姓名，沒有就用帳號。
- `has_screenshot` 只在 admin 的回應中出現；檔名一律不回。

### 處理 `PATCH /api/feedback/:id`

- JSON：`status`、`assignee_user_id`、`resolution`，只送要改的欄位。後兩個送 `null` 表示清除。
- 處理者必須是 admin 或有 `feedback` write 的使用者（`GET /api/feedback/assignees` 的名單），否則 400。
- 回 `{ item }`；找不到回 404。

### 截圖 `GET /api/feedback/:id/screenshot`

- 只有 admin（`AdminGuard`）。
- 回 PNG，`Cache-Control: private, no-store`。
- 沒有截圖、檔案不見、或資料庫裡的檔名不是 `uuid.png`，都回 404。

### Slack 通知

- 新回報寫入後，透過既有的 `slack/` 模組推一則訊息。
  - 頻道由 `FEEDBACK_SLACK_WEBHOOK_URL` 決定。
  - 沒有設定就不通知，也不會改用通用的 `SLACK_WEBHOOK_URL`。
- 訊息只有編號、類型、標題、回報者、畫面，以及「附有截圖」字樣。
  - 不附描述與截圖：可能含客戶資料。
  - 使用者輸入的 `<`、`>`、`&` 會轉義，不能用 `<!channel>` 之類的語法。
- 通知不等待、失敗只寫 log，回報照常成功。
- `SlackWebhookService.send(text, setting)` 新增第二個參數：讀哪個環境變數當 webhook，預設仍是 `SLACK_WEBHOOK_URL`。

## 紀錄查詢 API（`/api/legacy-crm/logs`，admin）

| 路由 | 說明 |
| --- | --- |
| `GET write` | 寫入紀錄列表，不含 `before`、`after`、`side_effects` |
| `GET write/:id` | 一筆寫入紀錄的全部欄位 |
| `GET print` | 列印與報表查詢紀錄列表 |
| `GET facets` | 下拉選項：`{ entity_types, print_targets }`，取自已出現過的值 |

- 共同條件：
  - `from`、`to`：`YYYY-MM-DD`，台北日期，含起迄。
  - `user`：數字為 users.id；文字比對帳號或員工姓名（部分相符），或員工編號（完全相符）。
  - `entity_key`：單號／編號，開頭相符。例如 `customer:` 找所有客戶。
  - `page`、`page_size`：預設 50，上限 200。
- 寫入紀錄另有 `entity_type`、`action`；列印紀錄另有 `kind`、`target`。
- 回 `{ items, total, page, page_size }`，依時間新的在前。每筆多一個 `user_name`：帳號已刪除時為 null。
- 查詢本身不記錄。

## 前端

### 舊版選單列（`LegacyExtraMenus.vue`）

- 放在選單列右側（`legacy-menubar-spacer` 之後），`LegacyShell.vue` 只加了一個掛點。
- **回報(B)**：任何人都看得到，Alt+B 開啟。
  - 對話框欄位：類型、標題、描述、「附上目前畫面截圖」（預設不勾）。
  - 勾選時用 `html-to-image` 擷取 `.legacy-root`，排除對話框本身，先顯示預覽，看過再按「送出(S)」（Alt+S）。
  - `html-to-image` 只在勾選時才載入（另成一包，約 13 KB）。
  - 字型不內嵌（`skipFonts`），避免每次內嵌 3 MB 的正宋體。現場 Windows 用本機細明體，截圖與畫面相同；沒有細明體的電腦（例如 Mac）截圖會換成其他字型，字寬略有不同。
  - 錯誤顯示在對話框內，不跳新系統的錯誤視窗。
  - 對話框內的按鍵不會傳給後面的表單：F5～F7、查詢 R 等都不作用，F 鍵也不會讓瀏覽器重新整理。
- **紀錄查詢**：只有 admin 看得到。
  - 規劃原本放在「系統」選單下，但系統維護選單沒有重建，所以獨立成一個選單列按鈕。
  - 沒有快捷鍵：Alt+L 是單據的列印標籤。
  - 兩個頁籤：寫入紀錄、列印紀錄。
  - 寫入紀錄點一列，下方顯示修改前、修改後與連帶回寫。
- 兩個視窗都 Teleport 到 `.legacy-root`，套用舊版樣式。
  - 樣式在 `styles/legacy.css` 最後的「第 5 階段」段落，沿用 `.legacy-prompt`／`.legacy-selection` 的外框。
  - 沒有新增 `--lg-*` token。

### 新系統 `/settings/feedback`（`FeedbackReports.vue`）

- 列表可依狀態、類型、處理者、日期、關鍵字篩選，每頁 50 筆。
- 點一列開明細：
  - 顯示描述與 context。
  - 可改狀態、處理者、處理結果。
  - 只有 admin 看得到「截圖」欄與「顯示截圖」按鈕。

## 部署

- `FEEDBACK_UPLOAD_DIR`：
  - `docker-compose.yml` 設為 `/app/files/feedback`，掛 named volume `feedback_uploads`。
  - 截圖沒有保留期限，備份時一併處理。
- `FEEDBACK_SLACK_WEBHOOK_URL`：只放在未追蹤的 `.env` 或部署環境。
- `docker/nginx.conf`：
  - 只有 `location = /api/feedback` 放寬到 `client_max_body_size 6m`。
  - nginx 預設 1 MB，不改的話大於 1 MB 的截圖會被擋。
- 前端新增依賴 `html-to-image`（MIT，無其他依賴），在 `apps/frontend/package.json`。

## 驗證（2026-10-08）

- **整合測試**：`apps/backend/src/feedback/feedback.integration.spec.ts`，18 項。
  - 用 Nest 起完整 HTTP（AuthModule、LegacyCrmModule、FeedbackModule），對可拋棄的 PostgreSQL 執行。執行方式寫在檔案開頭，資料庫名稱必須以 `_spec` 結尾。
  - 權限：未登入、一般使用者、`feedback` read、`feedback` write、`crm` write、admin。
  - 上傳：PNG 檔頭檢查、剛好 5 MB 可以、多 1 byte 回 413、欄位驗證。
  - 截圖：只有 admin、檔案不見回 404、竄改的路徑回 404。
  - 篩選、分頁、指派。
  - write_log／print_log 查詢：權限、各條件、台北日期邊界、明細。
  - Slack 以 spy 攔截，`fetch` 也被擋掉。
- **單元測試**：通知（未設定時不送、訊息不含描述、失敗只記 log）、截圖檔名檢查、`SlackWebhookService` 的 setting 參數。
- **Migration**：在測試資料庫 run → revert → run。之後 `migration:generate --dryrun` 已沒有 `feedback_reports` 的差異。
- **端對端**：`tests/legacy-crm/feedback.spec.ts`，3 項。
  - 回報(B)：預設不勾、預覽後送出、Alt+B／Esc。
  - feedback write：處理回報，看不到截圖。
  - admin：看到截圖；紀錄查詢的兩個頁籤。
  - 環境同 `legacy-crm.spec.ts`，另需一個有 `feedback` write 的帳號（預設 `lc_feedback`）。

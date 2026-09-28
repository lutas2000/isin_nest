# Legacy Staff 相容流程

此模組的 `/staff/*` 是獨立的 Nest 路由。打卡資料只讀 Realand M70，業務資料只讀寫舊 MariaDB 的 `staff`、`attend_record`、`staff_manhour`、`staff_m70_user`。舊 Nest HR 的 PostgreSQL 出勤流程不參與此模組。

## 設定

使用 `SOURCE_DB_HOST`、`SOURCE_DB_PORT`、`SOURCE_DB_USER`、`SOURCE_DB_PASS`、`SOURCE_DB_NAME` 連舊 MariaDB。這些設定與既有 PostgreSQL 的 `DB_*` 分開。M70 使用 `TIME_CLOCK_*` 設定。MariaDB 連線只在呼叫相容流程時建立；未設定時 API 回 503。模組不執行 schema sync。首次部署需對 `SOURCE_DB_*` 指向的資料庫執行 [staff-m70-user.sql](./staff-m70-user.sql)。

`LEGACY_STAFF_CRON_ENABLED` 預設為 `false`。驗證完成、Django jobs 停止後，設定為 `true` 並重啟後端，才會每 30 分鐘執行新流程。同時設定 `HR_ATTENDANCE_CRON_ENABLED=false`，停用原先寫 PostgreSQL 的 Nest HR 排程。回復時先將新排程設回 `false`，再依需要恢復舊排程。

## API

以下路由需要管理員 JWT，成功回應為舊版純文字；會寫入資料，故全部使用 POST。

- `/staff/import`：M70 全量唯讀匯入，依 `staff_m70_user.machine_id` 對應員工，以 Django 主鍵去重。未連結的 machine ID 會跳過。
- `/staff/appoint`：分類尚未決定的打卡。
- `/staff/work_hour/:start_time`：從 YYYY-MM-DD 重算至台北今日。
- `/staff/work_hour/today`：匯入、分類、重算昨日與今日。

M70 v3.6.8 出勤讀取已用實機驗證：559 筆，讀取前後未讀數同為 19。封包是一個 8-byte 計數框，後接每筆 12 bytes 的分段資料。M70 數字 ID 與 `staff.id` 不能直接對應；匯入使用已儲存的數字 machine ID 對照，不再以設備姓名猜測。紀錄主鍵使用對照表保存的 `record_name`，設備改名也不會改寫舊紀錄。匯入日誌分列讀取、實際新增、既有重複與跳過筆數。

匯入會讀取連結員工的 `stop_work`：離職當日的歷史打卡仍可補入，次日起的打卡跳過並記錄 `departed` 數量。`input_type` 依實際舊庫比對轉換：M70 80 為「人臉」、16/17/120 為「指紋」、81 為空字串；未核實的其他代碼保留數字字串。

2026-09-28 使用目前對照表唯讀比對 M70 559 筆與舊庫：558 筆已連結、黃俊傑 1 筆未連結、離職日期過濾 0 筆。已連結者中 535 筆的舊版紀錄 ID、姓名、時間、`input_type` 相同；457 筆連 `staff_id` 也相同。另 78 筆只差歷史 `staff_id`：黃雅惠舊 7／現 A12（22 筆）、陳道彥舊 A58／現 A57（28 筆）、施億和舊 A99／現 A53（28 筆）。其餘 23 筆舊庫缺少（8 月 1 日 4 筆、9 月 24–25 日 19 筆）。沒有其他欄位不符。舊庫最後一筆打卡時間為 2026-09-24 12:44:34；對照與比對未寫入打卡或工時。

`/staff/m70-users` 提供管理員 JSON API：GET 清單、POST 新增 MariaDB 對照、PATCH `/:machineId` 修改員工連結、DELETE `/:machineId` 刪除對照、GET `/staff-options` 查詢舊庫員工、POST `/sync` 從 M70 單向同步。同步會保留已指定的 `staff_id` 和 `record_name`；不存在於設備的列標為 `present_on_device=0`。刪除對照不刪設備使用者，下一次同步會將設備中的使用者重建。前端入口為 `/staff/m70-users`。POST `/:machineId/rename-device` 是獨立設備改名操作，會比對改名前後原始打卡與未讀數；設備若拒絕寫入會回錯誤。

2026-09-28 首次實機同步讀得 22 位：21 位連結舊庫，黃俊傑（machine ID 46）未連結。鄭得利（ID 56）依人工確認連到 `A82 鄭德利`，`record_name` 固定為「鄭德利」。M70 設備目前仍顯示「鄭得利」：實機 `SetUserName` 封包回傳 `status=0, value=0`，寫入未生效；讀回姓名未變。原始打卡 559 筆、ID 56 的 29 筆與未讀數 19 也未變。黃俊傑在設備上有 1 筆打卡，舊 `attend_record` 亦有同名歷史紀錄，故未刪除。設備改名需釐清韌體寫入格式後再驗收。

## 切換驗收

已用 `SOURCE_DB_*` 連上 MariaDB，表結構與日期欄位已確認。M70 的 22 個數字 ID 中，只有 3 個直接等於 `staff.id`，且其中 2 個姓名不一致。新對照表以 machine ID 作為唯一來源；ID 56 已明確連到 A82，ID 46 保持未連結。559 筆設備紀錄的時間與舊庫抽樣無 8 小時位移。

2026-09-28 在只綁定本機的臨時 MariaDB，執行 `legacy-staff.integration.spec.ts` 的 HTTP 到資料庫驗證：重複匯入去重、跨午夜奇數筆分類、工時配對、強制寫入失敗後回滾及重跑、對照 CRUD 與同步保留人工連結均通過。先前以姓名對照的全量匯入數字不適用於新的 machine ID 對照，正式庫打卡與工時尚未寫入。

以舊庫 2026-09-14 至 2026-09-24 的 11 個工作日唯讀比對，共推算 166 筆工時；其中 8 日的既存 `staff_manhour` 與目前 `attend_record` 時間不一致，例如施億和 2026-09-23 打卡 07:29:10，而既存工時開始 07:52:10。需確認這是人工修正還是舊 jobs 的生成規則，再決定是否能接受重算覆寫；驗收完成前保持 `LEGACY_STAFF_CRON_ENABLED=false`。

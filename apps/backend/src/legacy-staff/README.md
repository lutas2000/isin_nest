# Legacy Staff 相容流程

此模組的 `/staff/*` 是獨立的 Nest 路由。打卡資料只讀 Realand M70，業務資料只讀寫舊 MariaDB 的 `staff`、`attend_record`、`staff_manhour`、`staff_m70_user`。舊 Nest HR 的 PostgreSQL 出勤流程不參與此模組。

## 設定

使用 `SOURCE_DB_HOST`、`SOURCE_DB_PORT`、`SOURCE_DB_USER`、`SOURCE_DB_PASS`、`SOURCE_DB_NAME` 連舊 MariaDB。這些設定與既有 PostgreSQL 的 `DB_*` 分開。M70 使用 `TIME_CLOCK_*` 設定。MariaDB 連線只在呼叫相容流程時建立；未設定時 API 回 503。模組不執行 schema sync。首次部署需對 `SOURCE_DB_*` 指向的資料庫執行 [staff-m70-user.sql](./staff-m70-user.sql) 與 [staff-m70-log.sql](./staff-m70-log.sql)。後者保存 12-byte 原始打卡紀錄及處理狀態，供已讀標記失敗重試與尚未連結員工補匯使用。

`LEGACY_STAFF_CRON_ENABLED` 預設為 `false`。驗證完成、Django jobs 停止後，設定為 `true` 並重啟後端，才會每 30 分鐘執行新流程。原先寫 PostgreSQL 的 Nest HR 出勤排程已移除，`POST /working-hours/today` 仍可手動執行 PostgreSQL 流程。

設定通用的 `SLACK_WEBHOOK_URL` 可讓新排程每次實際執行後發送成功或失敗通知。成功訊息包含 M70 讀取／新增／重複／未對照／離職過濾筆數、重算日期與人日數及耗時。Slack 傳送失敗只寫入應用程式日誌，不會重跑資料庫流程；停用的排程不發送通知。網址屬於密鑰，僅放在未追蹤的 `.env` 或部署環境，勿寫進程式或日誌。

## API

以下路由需要管理員 JWT，成功回應為舊版純文字；會寫入資料，故全部使用 POST。

- `/staff/import`：M70 未讀批次匯入，依 `staff_m70_user.machine_id` 對應員工，以 Django 主鍵去重。未連結的 machine ID 會跳過。
- `/staff/appoint`：分類尚未決定的打卡。
- `/staff/work_hour/:start_time`：從 YYYY-MM-DD 重算至台北今日。
- `/staff/work_hour/today`：匯入、分類、重算昨日與今日。

M70 v3.6.8 的增量讀取和已讀標記已通過實機驗證：`0x0106` 取得總數與 0-based 未讀游標，`0x0107` 以 5AA5 frame 傳入 1-based 起始位置。收到紀錄後，必須再以 5AA5 frame 傳入本批筆數並等待最後結果；2026-10-02 實測 129 筆，游標從 576 前進到 705、未讀數降為 0，總紀錄仍是 705。先前未前進是缺少此完成框；A55A 完成框在此韌體會逾時。

`/staff/import` 和排程共用 `consumeUnreadAttendanceLogs`：只抓設備未讀批次，先在同一 MariaDB 交易中保存整批 `staff_m70_log` 及可對照的 `attend_record`，提交成功後才送完成框，並重讀游標確認。交易失敗不標記；完成框逾時或游標驗證失敗時保留已提交資料，下次依 raw hash 與舊紀錄 ID 去重。讀取中新增的打卡留給下一輪。沒有新資料時不傳紀錄區、不送完成框，但仍會重試原始表內的 `pending` 紀錄。未對照員工留在 `pending`，新增對照後可補匯；離職後紀錄保留原始資料並記為 `departed`，不寫入舊打卡表。因此 `skipped` 是目前保存表內尚未對照的待處理數，可能包含先前批次。

切換前以 `backfillHistory()` 做一次全量保存，讓已讀的歷史紀錄與未對照紀錄也進入原始表。此方法供初始切換或設備紀錄重置後的人工復原；正常 API 與排程只讀未讀資料。M70 數字 ID 與 `staff.id` 不能直接對應；匯入使用已儲存的 machine ID 對照，紀錄主鍵使用對照表保存的 `record_name`，設備改名也不會改寫舊紀錄。

匯入會讀取連結員工的 `stop_work`：離職當日的歷史打卡仍可補入，次日起的打卡跳過並記錄 `departed` 數量。`input_type` 依實際舊庫比對轉換：M70 80 為「人臉」、16/17/120 為「指紋」、81 為空字串；未核實的其他代碼保留數字字串。

2026-09-28 使用目前對照表唯讀比對 M70 559 筆與舊庫：558 筆已連結、黃俊傑 1 筆未連結、離職日期過濾 0 筆。已連結者中 535 筆的舊版紀錄 ID、姓名、時間、`input_type` 相同；457 筆連 `staff_id` 也相同。另 78 筆只差歷史 `staff_id`：黃雅惠舊 7／現 A12（22 筆）、陳道彥舊 A58／現 A57（28 筆）、施億和舊 A99／現 A53（28 筆）。其餘 23 筆舊庫缺少（8 月 1 日 4 筆、9 月 24–25 日 19 筆）。沒有其他欄位不符。舊庫最後一筆打卡時間為 2026-09-24 12:44:34；對照與比對未寫入打卡或工時。

`/staff/m70-users` 提供管理員 JSON API：GET 清單、POST 新增 MariaDB 對照、PATCH `/:machineId` 修改員工連結、DELETE `/:machineId` 刪除對照、GET `/staff-options` 查詢舊庫員工、POST `/sync` 從 M70 單向同步。同步會保留已指定的 `staff_id` 和 `record_name`；不存在於設備的列標為 `present_on_device=0`。刪除對照不刪設備使用者，下一次同步會將設備中的使用者重建。前端入口為 `/staff/m70-users`。POST `/:machineId/rename-device` 是獨立設備改名操作，會讀回姓名並確認原有打卡紀錄仍保留；允許期間有新打卡或排程推進未讀游標。設備若拒絕寫入會回錯誤。

2026-09-28 首次實機同步讀得 22 位：21 位連結舊庫，黃俊傑（machine ID 46）未連結。鄭得利（ID 56）依人工確認連到 `A82 鄭德利`，`record_name` 固定為「鄭德利」。M70 設備目前仍顯示「鄭得利」：實機 `SetUserName` 封包回傳 `status=0, value=0`，寫入未生效；讀回姓名未變。原始打卡 559 筆、ID 56 的 29 筆與未讀數 19 也未變。黃俊傑在設備上有 1 筆打卡，舊 `attend_record` 亦有同名歷史紀錄，故未刪除。設備改名需釐清韌體寫入格式後再驗收。

## M70 設備員工 API

全部需要現有 JWT 與管理員權限。設備 CRUD 使用獨立的 `/device` 路徑；成功回應為 JSON。

| 方法 | 路徑 | 用途 |
|---|---|---|
| GET | `/staff/m70-users/device` | 直接讀取設備員工 `machine_id`、`name` |
| POST | `/staff/m70-users/device` | 新增密碼員工、讀回姓名、建立未連結 mapping |
| PATCH | `/staff/m70-users/device/:machineId` | 修改姓名或密碼、讀回驗證、更新 mapping 的設備姓名 |
| DELETE | `/staff/m70-users/device/:machineId` | 刪除指定設備員工與憑證，讀回確認不存在；mapping 標為設備未見 |

新增 body 範例（密碼請換成實際要設定的數值）：

```json
{ "machine_id": 9999, "name": "測試員工", "password": "654321" }
```

修改 body 範例：

```json
{ "name": "修改姓名" }
```

PATCH 至少提供 `name` 或 `password`。姓名不可空白、含 NUL，UTF-16LE 最多 48 bytes。密碼接受 JSON 整數或十進位字串，範圍 1–4294967295；不回傳或寫入日誌。姓名以設備列表讀回驗證；密碼以完整寫入完成回應確認，不執行實際打卡。不接受未驗證的指紋、人臉、卡片、權限或 enabled 欄位。

新增回 201，修改回 200，內容為更新後的 `staff_m70_user` mapping；建立新員工後可使用既有 PATCH `/staff/m70-users/:machineId` 連結舊庫 `staff_id`。刪除回 200：`{ "machine_id": 9999, "deleted": true }`。設備改名與刪除保留原有 `staff_id`、`record_name`、舊庫員工與打卡資料。新增 ID 不得存在於設備、既有 mapping、保存的原始打卡或設備打卡歷史，避免將舊紀錄對到新員工。

錯誤：400 輸入錯誤、401 未登入、403 非管理員、404 設備員工不存在、409 ID 衝突或本程序已有設備人員操作執行中、503 設備／資料庫／讀回驗證失敗。同步與設備 CRUD 共用本程序的執行鎖。多程序部署需額外的跨程序鎖；目前 Docker 使用單一 backend。

設備寫入與 MariaDB 更新不是同一筆交易。503 可能代表設備已修改但 mapping 尚未更新；先 GET `/device` 確認設備，再 POST `/staff/m70-users/sync` 修復對照，避免直接重送寫入。API 不自動回復設備寫入。

2026-10-04 已以實機 ID 9999 通過新增、改名、刪除測試，原有 22 位員工與 711 筆打卡完整保留。正式 client 修正 `SetEnrollData` 的準備及完成雙回應，以及 48-byte 姓名欄位。這次 API 的 HTTP 測試使用 mock 設備與資料庫，驗證路由、管理員權限、驗證失敗、衝突與保留歷史關聯。

## 切換驗收

已用 `SOURCE_DB_*` 連上 MariaDB，表結構與日期欄位已確認。M70 的 22 個數字 ID 中，只有 3 個直接等於 `staff.id`，且其中 2 個姓名不一致。新對照表以 machine ID 作為唯一來源；ID 56 已明確連到 A82，ID 46 保持未連結。559 筆設備紀錄的時間與舊庫抽樣無 8 小時位移。

2026-09-28 在只綁定本機的臨時 MariaDB，執行 `legacy-staff.integration.spec.ts` 的 HTTP 到資料庫驗證：重複匯入去重、跨午夜奇數筆分類、工時配對、強制寫入失敗後回滾及重跑、對照 CRUD 與同步保留人工連結均通過。先前以姓名對照的全量匯入數字不適用於新的 machine ID 對照，正式流程之後已依使用者指示執行並部署。

以舊庫 2026-09-14 至 2026-09-24 的 11 個工作日唯讀比對，共推算 166 筆工時；其中 8 日的既存 `staff_manhour` 與目前 `attend_record` 時間不一致，例如施億和 2026-09-23 打卡 07:29:10，而既存工時開始 07:52:10。此處保留歷史差異；正常排程依尚未分類打卡的最早工作日起重算。

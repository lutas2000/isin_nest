# HR 薪資計算與請假登錄移植規劃

> 撰寫日期：2026-10-04
> 來源：isin-java `Personnel/src/wage/*`、`Personnel/src/gui/Dialog_Leave.java`、`Isin/src/isin/staff/*`
> 目標：isin_nest `apps/backend/src/hr`、`apps/frontend/src/views/HR`
> 狀態：規劃已定案（決議見第 6 節）。第 1 階段（純函式與 parity 測試）、第 2 階段（snapshot 資料表、MariaDB loader、薪資 API）、第 3 階段（exceljs 報表與下載）與第 4 階段（請假登錄、外帳工時維護）已實作，見 `apps/backend/src/hr/payroll/`、`staff-leave/`、`staff-manhour/`；fixture 產出步驟見 `apps/backend/src/hr/payroll/__fixtures__/README.md`。

## 0. 結論與原則

1. **薪資改為「後端算完、寫值進 Excel、保存當次 snapshot」。** Excel 不再含任何公式，也不再跨工作表參照。每次產出的輸入資料與計算結果都存進 PostgreSQL，Excel 只是 snapshot 的一種輸出格式。
2. **計算邏輯寫成純函式。** 輸入是一個月的員工、段別、工時、請假、假日資料，輸出是逐日明細與薪資項目。純函式不碰資料庫，才能用舊 Java 產出的 Excel 做 parity 測試。
3. **資料來源先接 MariaDB，再切 PostgreSQL。** 依 [先前的遷移風險評估](../apps/backend/src/legacy-staff/README.md)，MariaDB 目前仍是 system of record。薪資模組透過一個 `PayrollSourceLoader` 介面取資料，第一版實作讀 MariaDB（沿用 `LegacyStaffDbService`），第二版換成 TypeORM repository。純函式與 snapshot 表完全不受影響。
4. **請假登錄先補齊規則再開放。** Nest 現有 `staff-leaves` API 的時數算法與 Java 不同、沒有權限守衛、沒有跨日拆單。要先修正，否則薪資計算的輸入就錯了。

## 1. 舊系統規則盤點（移植依據）

以下是從 Java 程式讀出的實際規則，移植時逐條對照。每條都標示來源，之後寫測試案例時以此為準。

### 1.1 基礎資料

| 資料 | 舊表 | 欄位 | 用途 |
|---|---|---|---|
| 員工 | `staff` | `wage`、`allowance`、`organizer`、`labor_insurance`、`health_insurance`、`pension`、`is_foreign`、`benifit`、`need_check`、`begain_work`、`have_fake`、`department` | 薪資固定項與規則開關 |
| 段別 | `staff_segment` | `begain_time`、`end_time`、`cross_day`、`duty`、`night_work`、`rest_time`、`rest_time2`、`create_date` | 預設上下班、休息、責任制、夜班 |
| 工時 | `staff_manhour` / `staff_manhour2` | `name`、`start_time`、`end_time` | 每段上班區間；`have_fake` 員工在外帳報表改讀 `staff_manhour2` |
| 請假 | `staff_leave` | `name`、`type`、`start_time`、`end_time`、`time`、`verify` | 請假時數 |
| 假日 | `staff_vacation` | `date`、`pay` | `pay=1` 有薪假（紅）、`pay=0` 無薪假（綠）、無資料為平日 |

段別選取規則（`Segment.setDefaltSegment`）：取 `name` 相同且 `create_date <= 當日` 的最新一筆。`cross_day=1` 時結束時間加一天。Nest 的 `SchedulePicker.initialize` 已是相同查法。

薪資表的夜班與責任制判斷（`WageReport.getSegment`）用的是**該員工最新一筆段別**，不是逐日段別。逐日工時計算（`HourPage.caculate` 的 `isDuty`）則用 `ORDER BY create_date LIMIT 1`，也就是**最舊一筆**。**決議：照舊移植**，三處各自保留原本的選取方式，純函式以三個明確參數接收（`daySegment`、`latestSegment`、`oldestSegmentDuty`），不做統一。

### 1.2 每日工時計算（`HourPage`）

輸入：當日所有 `staff_manhour` 區間、當日請假、假日型別、段別、`is_foreign`。

1. **時間修整**
   - 上班打卡分鐘：1–14 → :00；15–44 → :30；≥45 → 進位到下一小時整點。
   - 下班打卡分鐘：<20 → :00；<50 → :30；否則進位到下一小時整點。
   - 日班（段別開始 < 12:00）上班時間早於段別開始時，以段別開始為準。夜班才計提前加班。
2. **區間時數** = 修整後 (結束 − 開始) 以 30 分鐘為單位無條件捨去，除以 2。
3. **休息扣除**：區間涵蓋 `12:00 ~ 12:00+rest_time` 扣 `rest_time/60`；涵蓋 `18:00 ~ 18:00+rest_time2` 扣 `rest_time2/60`。有薪假當天固定扣 1 小時（外勞 0），不看段別。
4. **請假時數**：同樣 30 分鐘捨去並扣休息，單日上限 8 小時。若請假開始時間等於段別開始時間，當日段別開始改為請假結束時間（影響遲到判斷）。
5. **遲到**：僅平日計算。上班打卡晚於段別開始 3 到 14 分鐘記遲到 1 次。15 分鐘以上不記遲到，由時數修整反映。
6. **分類**
   - 平日：工時 > 8 → 加班 = 工時 − 8，工時 = 8（責任制不計加班）。工時 < 8 → 曠職 = 8 − 工時。
   - 無薪假：同平日但不計曠職。
   - 有薪假：全部工時計加班，工時 = 0。責任制：工時 > 1 則加班固定 8，否則 0。
   - 曠職 = 曠職 − 請假時數，低於 0 歸 0。
7. **無薪假補登**：無薪假當天工時 < 8 且無請假紀錄時，報表自動寫「無薪假」(8 − 工時) 小時；有請假紀錄則只更新時數。

### 1.3 月報表欄位（`ManHourReport`）

每人每日：日期、打卡時段字串、上班、加班、請假假別、請假時數、遲到、平日旗標。月底彙總：

- 加班分四桶：有薪假 ≤8、有薪假 >8、平日 ≤2、平日 >2。每日分別封頂後加總。
- 請假依 12 種假別加總：事假、特休、病假、公假、產假、產檢假、婚假、喪假、公休、曠職、陪產假、無薪假。**決議：移除防疫假**，舊資料若有防疫假紀錄，載入時歸入警告並以無薪假計算。
- 遲到次數加總。
- 員工範圍：`department` 相同、`need_check=1`、尚在職（`begain_work <= 當日`）。
- 工時來源：正式報表讀 `staff_manhour`；外帳報表且 `have_fake=1` 讀 `staff_manhour2`。
- 缺下班打卡的區間會跳過並彈窗警告。移植後改為 snapshot 內的 warning 清單。

### 1.4 薪資項目（`WageCaculate`）

基數 `base = (本薪 + 勤務津貼) / 240`。`need_check=0` 的員工，所有出勤相關項目一律 0。所有金額四捨五入到整數。

**加項**

| 項目 | 規則 |
|---|---|
| 本薪、勤務津貼、幹部加給 | 直接取 `staff` |
| 加班費 | `base × (有薪假≤8 + (有薪假>8 + 平日≤2) × 1.33 + 平日>2 × 1.66)`；夜班再 × 1.1 |
| 全勤獎 | 基準 = 本薪 × 4%。外勞 0。依序判斷：曠職 > 0 → 0；遲到 ≥ 3 → 0；產假 ≥ 16 → 0；病假 ≥ 16 → 0；事假 ≥ 8 → 0；病假 ≥ 8 → 0.2；事假 ≥ 4 → 0.4；病假 ≥ 4 → 0.4；病假 > 0 → 0.7；事假 > 0 → 0.7；否則全額 |
| 夜班津貼 | 夜班段別才算：`本薪 × 10% × (1 − 全部請假時數 / 720)` |
| 伙食津貼 | 日班：50 × (加班 ≥ 3 小時的天數 + 有薪假有上班的天數)；外勞門檻 6 小時。夜班：50 × 有上班天數。舊 Excel 的 COUNTIF 範圍少一列，永遠不計期間最後一天；**決議：修正為整月計算** |
| 獎金、特休加 | 手動輸入，預設 0 |
| 特休減 | 現行寫 0，標題誤植為「勤務津貼」。移植後保留為手動欄位 |

**減項**

| 項目 | 規則 |
|---|---|
| 病假 | `時數 × (本薪 × 0.5 + 勤務 × 0.5) / 240`。外帳版本參數相同 |
| 事假 | `時數 × (本薪 + 勤務) / 240` |
| 曠職 | `時數 × (本薪 + 勤務) / 240` |
| 公休 | `時數 × 本薪 / 240` |
| 無薪假 | `時數 × (本薪 + 勤務) / 240`。舊報表此列標題為「公假」且公式混入未乘基數的防疫假時數；防疫假已移除，此列只剩無薪假扣款，標題改為「無薪假」 |
| 健保費、勞保費 | 取 `staff` |
| 福利基金 | `benifit=1` 免繳，否則 100 |
| 借支、其他代扣、稅金代扣 | 手動輸入，預設 0 |
| 退休提撥 | 取 `staff`，**不計入減項合計**，只顯示 |

**合計**：加項合計 = 本薪到伙食津貼；減項合計 = 病假到其他代扣；實領 = 加項合計 − 減項合計。

**報表變體**

- 正式：部門 銷管部、生產部。
- 外勞：多一欄稅金代扣。
- 外帳（`exportFake`）：部門多「打工」，病假改外帳欄，`have_fake` 員工讀 `staff_manhour2`。**決議：外帳報表保留**，`staff_manhour2` 的維護介面見 3.7。
- 員工排序：`need_check DESC, is_foreign ASC, name ASC`。程式硬編排除「林慶豐」。**決議：移除硬編**，改為 `stop_work IS NULL OR stop_work >= period_start` 判斷在職；離職員工只出現在離職當月及之前的報表。

### 1.5 請假登錄（`Dialog_Leave`）

1. 選員工後，預設帶入最新段別的上下班時間。
2. 跨日請假會拆成每天一筆，每筆沿用同一個時段。
3. 時數 = 30 分鐘捨去 − 休息扣除（規則同 1.2 第 3 點），登錄時不封頂 8 小時。
4. `verify` 寫入登錄者的真實姓名。
5. 刪除功能在 Java 已被註解掉，實際上請假只能新增。
6. 員工頁顯示：特休依到職日週年計算區間加總；病假依曆年加總。

## 2. Nest 現況與差距

| 項目 | 現況 | 差距 |
|---|---|---|
| `staff-leaves` API | CRUD 齊全 | 無 `JwtAuthGuard`／`FeatureGuard`；時數用原始小時數不做 30 分鐘捨去；無跨日拆單；`verify` 由前端傳入而非登入者；無假別白名單 |
| `SchedulePicker` | 休息扣除與 Java 相同 | 可直接複用 |
| `ManHourManager` | 只做打卡配對寫 `staff_manhour` | 沒有 HourPage 的修整、分類、遲到邏輯 |
| `staff_workhour` 表 | 有 entity，無任何寫入 | 可作為逐日明細 snapshot 的一部分，見 3.2 |
| 前端 `/hr/leave` | 轉址到假期日曆 | 需要新頁面 |
| Excel 產出 | 後端無 exceljs 等套件 | 需新增 |
| 權限 | `FeatureGuard` 機制已存在 | 需新增 `hr-payroll`、`hr-leave` feature |

## 3. 目標設計

### 3.1 後端模組

新增 `apps/backend/src/hr/payroll/`：

```
payroll/
  payroll.module.ts
  payroll.controller.ts          # 觸發計算、查詢 snapshot、下載 Excel
  payroll.service.ts             # 流程：載入 → 計算 → 存 snapshot → 產 Excel
  domain/
    day-hours.ts                 # HourPage 移植（純函式）
    month-summary.ts             # ManHourReport 彙總（純函式）
    wage-items.ts                # WageCaculate 移植（純函式）
    leave-types.ts               # 13 種假別常數
    rounding.ts                  # 分鐘修整、30 分鐘捨去
  source/
    payroll-source.loader.ts     # interface PayrollSourceLoader
    mariadb-payroll-source.loader.ts
    postgres-payroll-source.loader.ts
  excel/
    payroll-workbook.builder.ts  # 只寫值，不寫公式
  entities/
    payroll-run.entity.ts
    payroll-run-staff.entity.ts
    payroll-run-day.entity.ts
```

`domain/` 內不 import NestJS、TypeORM 或任何 IO。輸入型別：

```ts
interface PayrollSourceData {
  period: { start: string; end: string };        // YYYY-MM-DD
  variant: 'official' | 'foreign' | 'fake';
  staff: StaffRow[];                              // 含 wage 等欄位與 department
  segments: SegmentRow[];                         // 全期間可能生效的段別
  manhours: ManhourRow[];                         // 依 variant 已選好 manhour 或 manhour2
  leaves: LeaveRow[];
  vacations: Record<string, 0 | 1>;               // date → pay
}
```

輸出型別：

```ts
interface PayrollResult {
  days: DayResult[];        // 每人每日：work, overtime, leaveType, leaveHours, late, absenteeism, vacationType, segmentsText
  staff: StaffResult[];     // 每人：四桶加班、13 種假別時數、遲到次數、各薪資項目、加減合計、實領
  warnings: string[];       // 缺下班打卡、找不到段別等
}
```

### 3.2 Snapshot 資料表（PostgreSQL，新增 migration）

**`payroll_run`**：一次產出一筆。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | serial PK | |
| period_start / period_end | date | |
| variant | varchar(10) | official / foreign / fake |
| department | varchar(4) | 一個部門一筆，與舊報表一個工作表對應 |
| source | varchar(10) | mariadb / postgres |
| status | varchar(10) | draft / final |
| input_json | jsonb | 完整 `PayrollSourceData`，重算與稽核用 |
| warnings_json | jsonb | |
| file_path | varchar | 產出的 xlsx 路徑 |
| file_sha256 | varchar(64) | |
| created_by | int | `users.id` |
| finalized_by / finalized_at | int / timestamptz | 定稿者與時間 |
| created_at / updated_at | timestamptz | |

`input_json` 在 API 回應預設不帶（entity `select: false`），重算時以 query builder 讀回。

**`payroll_run_staff`**：每人一筆，欄位即 1.4 的每個薪資項目（整數金額）加上月彙總（工時、加班、請假、遲到次數、有薪假出勤天數、出勤天數）、`overtime_json`（四桶加班）、`leave_by_type_json`（12 種假別時數）、`wage_order` 與 `hour_order`（薪資表與打卡記錄表的順序，未列入打卡記錄表者為 null）。手動欄位（獎金、特休加、特休減、借支、其他代扣、稅金代扣）另存 `manual_json`，由前端在 draft 狀態下填入後重算合計。(run_id, name) 唯一。

**`payroll_run_day`**：每人每日一筆，欄位即 1.3 的每日欄位，(run_id, name, date) 唯一。這張表可取代目前沒人寫的 `staff_workhour`；建議保留 `staff_workhour` 不動，等遷移完成再決定是否刪除。

同一 period + variant + department 可有多個 run。`status=final` 的 run 不可覆寫，只能新建 run。這樣每月定稿後，日後修改請假或工時不會改變已發出的薪資表。

### 3.3 API

全部掛 `JwtAuthGuard` + `FeatureGuard`，feature 名稱 `hr-payroll`。

| 方法 | 路徑 | 權限 | 說明 |
|---|---|---|---|
| POST | `/hr/payroll/runs` | write | body: `start`、`end`、`variant`、`departments[]`（可省略）、`manual`。載入資料、計算、每部門存一筆 draft run、產 Excel。回傳 run 清單與 warnings |
| GET | `/hr/payroll/runs` | read | query: `start`（精確比對期間起日）、`variant`、`department`、`status`、`limit` |
| GET | `/hr/payroll/runs/:id` | read | run + staff + day 明細 |
| PATCH | `/hr/payroll/runs/:id/manual` | write | body `manual`，以姓名為鍵只覆寫給定欄位；用 snapshot 內的 `input_json` 重算薪資項目並重產 Excel。final 回 409，不在 run 內的員工或未知欄位回 400 |
| POST | `/hr/payroll/runs/:id/finalize` | write | 改 final，記錄 `finalized_by/at`；已 final 回 409 |
| GET | `/hr/payroll/runs/:id/file` | read | 下載 xlsx；檔案遺失或 sha256 不符時從 snapshot 重建 |
| POST | `/hr/payroll/preview` | read | 只計算不存，前端預覽用；回傳含 `source` |

未登入 401，無 `hr-payroll` 權限 403，`SOURCE_DB_*` 未設定 503。`hr-payroll` 已加入 `features.config.ts`，管理員需在功能權限頁指派給 HR 使用者。

### 3.4 Excel 產出

- 套件：`exceljs`（純 JS、支援欄寬、合併、字型、列印設定）。不用 LibreOffice，避免與 `nesting.service.ts` 的轉檔流程耦合。
- 版面沿用舊報表：每部門兩個工作表「打卡記錄-部門」「薪資-部門」，欄位順序、合併儲存格、隱藏欄、頁首「民國年月 部門 打卡記錄／薪資表」、橫向列印都保留，HR 看到的樣子不變。
- 所有儲存格寫數值或文字，**不寫 formula**。總合欄也是後端算好的值。
- 檔名 `{民國年}年{月}月薪資表-{variant}-run{id}.xlsx`，存到 `PAYROLL_FILES_PATH`（預設 `files/payroll`）下的 `{yyyy}/`，路徑與 sha256 記在 `payroll_run`。容器環境需把 `PAYROLL_FILES_PATH` 指到掛載的持久化路徑；即使檔案遺失，下載時會從 snapshot 的 staff/day 列重建並重新存檔，所以 snapshot 才是真正的保存對象。
- Excel 一律由 snapshot 列產生（`excel/payroll-workbook.builder.ts`），建立 run 與修改手動欄位後都會重產。`excel/payroll-workbook.reader.ts` 是舊 Excel 與新 Excel 共用的讀取器，`payroll:expected-from-xlsx` 與 builder 的 round-trip 測試都用它。
- 舊 Excel 的外帳與外勞版本靠 `setRounding` 設定數字格式 `#,##0`，新版後端已經四捨五入，格式只做顯示。

### 3.5 請假登錄

後端修改 `staff-leave`（已實作，2026-10-04）：

1. `StaffLeaveController` 加 `JwtAuthGuard` + `FeatureGuard`，feature 沿用 `features.config.ts` 既有的 `hr-staff-leave`（原規劃的 `hr-leave` 不另建）。
2. 新增 `CreateStaffLeaveDto`：`name`、`type`（限 12 種假別，不含防疫假）、`start_time`、`end_time`。`verify` 一律從 JWT 取登入者對應的 `staff.name`，不接受 body 傳入。
3. 時數改用 `domain/rounding.ts`：30 分鐘捨去後扣 `SchedulePicker.getBreakHour`。與 Java 一致不封頂。
4. 跨日請假在 service 拆成每天一筆，同一交易寫入，回傳全部建立的紀錄。
5. 新增 `GET /staff-leaves/balance?name=&date=`：回傳特休（到職日週年區間）與病假（曆年）已用時數，供前端顯示。另有 `GET /range?start=&end=&name=`、`GET /defaults?name=&date=`（最新段別的上下班時間）、`GET /types`。
6. 刪除與修改保留，但 `final` 薪資 run 涵蓋期間內的請假不允許修改，回 409。修改不可跨日。
7. 時間輸入與輸出一律台北牆上時間 `YYYY-MM-DD HH:mm`，寫入 timestamptz 時明確帶 +08:00（`hr/taipei-time.ts`），不依賴伺服器時區。時數與拆單的純函式在 `payroll/domain/leave-hours.ts`。
8. 開發庫發現 `staff_leave`、`staff_manhour`、`staff_manhour2`、`staff_segment` 的 `name`（與 `verify`）仍留有改名前的外鍵 `REFERENCES staff(id)`，任何以姓名寫入都會失敗；migration `1777300000000-DropStaleHrNameForeignKeys` 移除它們。

**資料來源注意**：目前 MariaDB 仍是 system of record，薪資計算（第 2 階段）讀 MariaDB。2026-10-05 起請假模組改經 `StaffLeaveStore` 介面存取，第 7 階段前綁定 `MariadbStaffLeaveStore`：請假、員工到職日、段別全部讀寫舊 MariaDB 的 `staff_leave`、`staff`、`staff_segment`（只動資料，不改 schema），Nest 登錄的請假會直接進入 Java 與薪資計算共用的舊庫，HR 可以在 Nest 登錄。`verify` 仍查 PostgreSQL 的登入者；定稿 409 檢查仍查 PostgreSQL 的 `payroll_run`。第 7 階段翻轉時把模組裡的 `STAFF_LEAVE_STORE` 換回 TypeORM 實作即可。外帳工時（`staff_manhour2`）尚未改，仍寫 PostgreSQL，第 7 階段前不要開放。

前端新增 `views/HR/StaffLeave.vue`，路由 `/hr/leave` 取代現在的轉址：

- 表單：員工下拉（帶入最新段別預設時段）、假別下拉、開始／結束日期時間、送出。
- 列表：當月請假，可依員工篩選，顯示時數與簽核人。
- 右側顯示該員工特休與病假已用時數。
- 遵循 `.agent/rules/frontend/*` 的元件與 API 狀態規範。

### 3.6 薪資前端

新增 `views/HR/Payroll.vue`，路由 `/hr/payroll`（已實作，2026-10-04）：

1. 選年月、variant、部門，按「計算」呼叫 preview，顯示 warnings 與每人薪資項目表格（`components/PayrollWageTable.vue`，欄位順序沿用舊薪資表，另加工時／加班／請假／遲到四欄）。
2. **決議：手動欄位由前端輸入。** 獎金、特休加、特休減、借支、其他代扣、稅金代扣六欄在表格中為可編輯儲存格，輸入後即時重算加減合計與實領（`services/payroll.ts` 的 `applyManual`，公式與 `domain/wage-items.ts` 相同）。按「建立 run」時隨 `manual_json` 存入 draft 並產 Excel；draft 狀態可再透過 PATCH `/manual` 修改並重產。Excel 不再供 HR 手改。
3. run 列表：可依月份、版本、狀態篩選，檢視歷次 snapshot、下載檔案、定稿；定稿後表格唯讀。下載走 `services/api.ts` 的 `apiDownload`，後端 CORS 已 expose `Content-Disposition` 讓跨網域也能取得檔名。
4. 每日明細（`components/PayrollDayTable.vue`）以員工下拉切換，對應舊的打卡記錄工作表；有薪假日期紅字、無薪假綠字。
5. 權限：側欄「薪資計算」與頁面以 `authStore.hasFeature('hr-payroll')` 判斷；寫入動作（建立 run、修改手動欄位、定稿）需 write。`hr-payroll` 已在 `features.config.ts`，管理員在「設定 → 權限設定」建立職稱並勾選「薪資計算」指派給 HR 使用者即可，`feature` 資料表的列由後端在指派時自動建立，不需另外 seed。

### 3.7 外帳工時維護（`staff_manhour2`）

外帳報表保留，因此 `have_fake` 員工的 `staff_manhour2` 需要可維護：

- 後端 `staff-manhour2` 補齊 `PUT /:id`、`DELETE /:id`、`GET ?name=&from=&to=`，掛 `FeatureGuard` feature `hr-payroll` write（已實作）。
- 新增 `POST /staff-manhour2/copy-from-manhour`：body 為 `name`、`from`、`to`，把 `staff_manhour` 同期間區間複製到 `staff_manhour2`，作為外帳編輯的起點。複製只新增不覆寫既有列。
- 前端在現有 `views/HR/Manhour.vue` 加「外帳工時」頁籤（`components/FakeManhourPanel.vue`）：只列 `have_fake=1` 員工，表格可直接編輯起訖時間、新增與刪除列，並提供「從正式工時複製」按鈕（已實作）。
- `final` 薪資 run 涵蓋期間內的 `staff_manhour2` 不允許修改，回 409，與請假相同。

## 4. Parity 驗證

1. **取得基準**：用 isin-java 的 `scripts/export-payroll.sh` 對 2026 年 6 月與 7 月各產一份正式與外帳 Excel（8 月資料有問題，不作基準），腳本會用 LibreOffice 固化公式值；再用 `payroll:expected-from-xlsx` 讀成 JSON 放到 `apps/backend/src/hr/payroll/__fixtures__/`。
2. **輸入固化**：用 MariaDB loader 把同期間的 `PayrollSourceData` 存成 JSON fixture。
3. **測試**：`domain/*.spec.ts` 對每人每日與每人每月項目逐格比對。允許差異只有三項：舊報表的防疫假列（已移除）、「林慶豐」排除（改以 `stop_work` 判斷）、伙食津貼少算最後一天（parity 測試以舊算法換算後比對）。其餘必須完全相等，段別選取照舊所以不會有差異。2026-10-04 以 6、7 月正式與外帳共四組 fixture 驗證：1,318 個每日列與全部薪資項目相符，唯一差異即伙食津貼最後一天。
4. **邊界案例**：跨日段別、夜班、責任制、外勞有薪假、請假起點等於段別起點、缺下班打卡、無薪假自動補登。每項至少一個單元測試。
5. 現有 `legacy-attendance-parity.spec.ts` 的作法可直接沿用。
6. **雙軌比對（階段 6）**：`npm run payroll:dual-track -- --start 2026-06-01 --java <Java Excel> --nest <Nest 部門 Excel> [--nest ...]`。與第 3 點的差別是走完整 API 流程（真實 MariaDB loader、snapshot、exceljs 輸出），比對的是兩邊最後的 Excel 而非 domain 函式結果；部門清單、員工順序、每日列、薪資欄位任一不同就以非零退出碼結束，允許差異僅伙食津貼最後一天 +0 或 +50（加項合計與總合須同步）。

## 5. 實作順序

| 階段 | 內容 | 產出 | 依賴 |
|---|---|---|---|
| 1 | `domain/` 純函式 + fixture + parity 測試 | 計算核心通過比對 | 無 |（已實作：純函式與 32 個單元測試、parity spec、`payroll:dump-source` 與 `payroll:expected-from-xlsx` 腳本；待補 fixture）
| 2 | snapshot entity + migration、`PayrollSourceLoader` MariaDB 版、`payroll.service` | 可用 API 產 run | 階段 1 |（已實作：migration `1777200000000-AddPayrollRunSnapshot`、`source/mariadb-payroll-source.ts` 與 `payroll:dump-source` 共用同一組 SQL、`PayrollService` 五個 API；2026-10-04 以本機後端對 6 月正式資料實測 preview 與 fixture 528 個薪資欄位全部相符，建立／修改手動欄位／定稿流程正常）
| 3 | exceljs builder、下載 API | 與舊報表同版面的 xlsx | 階段 2 |（已實作：builder 以 round-trip 測試驗證，6、7 月四組 fixture 整月資料寫入後讀回與計算結果完全一致；本機後端實測下載）
| 4 | 請假後端修正 + `StaffLeave.vue`、`staff_manhour2` 維護 API 與外帳編輯 UI | HR 可在 Nest 登錄請假與維護外帳工時 | 無，可與 1–3 並行 |（已實作：`/hr/leave` 頁面、外帳工時頁籤；本機後端加 Vite 開發伺服器實測跨日拆單、預設時段、已用時數、外帳列新增；請假 2026-10-05 起改寫 MariaDB，以臨時 MariaDB 容器實測跨日拆單、區間查詢、已用時數、修改、刪除與 datetime 牆上時間正確；外帳工時仍寫 PostgreSQL，見 3.5 的資料來源注意）
| 5 | `Payroll.vue`、feature 權限設定 | HR 可在 Nest 產薪資 | 階段 3 |（已實作：`/hr/payroll` 計算／建立 run／run 列表／手動欄位修改／定稿／下載；2026-10-04 以本機後端加 Vite 實測 6 月正式版兩個部門，手動欄位即時重算與 PATCH 後數字一致，定稿後唯讀）
| 6 | 雙軌一個月：Java 與 Nest 各產一次，比對 | 差異為零或皆在允許清單 | 階段 5 |（已實作：`scripts/payroll-dual-track-compare.ts`（`npm run payroll:dual-track`）用同一個 reader 讀 Java 與 Nest 的 Excel 逐格比對；2026-10-04 以 isin-java `scripts/export-payroll.sh` 2026 年 6、7 月正式與外帳四份 Excel，對本機後端走完整流程（MariaDB loader → `POST /hr/payroll/runs` → `GET runs/:id/file`）產出的 10 個部門檔案比對：1,318 個每日列、1,128 個薪資欄位全部相同，唯一差異是伙食津貼最後一天共 6 處各 +50，皆在允許清單；測試 run 與檔案已刪除）
| 7 | PostgreSQL loader，切換資料來源 | 不再依賴 MariaDB | 整體 HR 遷移翻轉寫入端後 |

階段 1 到 3 不改動任何現有表與現有排程，風險最低，可先合併。

## 6. 決議紀錄（2026-10-04）

| 項目 | 決議 | 反映位置 |
|---|---|---|
| 「林慶豐」排除 | 移除硬編，以 `stop_work` 判斷離職 | 1.4 報表變體、4 |
| 防疫假 | 移除此假別；舊資料載入時以無薪假計算並記 warning | 1.3、1.4、3.5 |
| 段別選取不一致 | 照舊，不統一 | 1.1 |
| 手動欄位 | 前端表格可編輯，存入 run 的 `manual_json` | 3.6 |
| 外帳報表 | 保留，補 `staff_manhour2` 維護介面 | 1.4、3.7、5 |
| snapshot 保存期限 | 永久保留，不做清理 | 3.2 |
| 伙食津貼少算最後一天 | 舊 Excel bug，修正為整月計算 | 1.4、4 |

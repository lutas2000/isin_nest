# HR 薪資計算與請假登錄移植規劃

> 撰寫日期：2026-10-04
> 來源：isin-java `Personnel/src/wage/*`、`Personnel/src/gui/Dialog_Leave.java`、`Isin/src/isin/staff/*`
> 目標：isin_nest `apps/backend/src/hr`、`apps/frontend/src/views/HR`
> 狀態：規劃，尚未實作

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

薪資表的夜班與責任制判斷（`WageReport.getSegment`）用的是**該員工最新一筆段別**，不是逐日段別。逐日工時計算（`HourPage.caculate` 的 `isDuty`）則用 `ORDER BY create_date LIMIT 1`，也就是**最舊一筆**。這是舊程式的不一致，移植時統一為「當日生效段別」，並在 parity 測試中記錄差異。

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
- 請假依 13 種假別加總：事假、特休、病假、公假、產假、產檢假、婚假、喪假、公休、曠職、陪產假、無薪假、防疫假。
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
| 伙食津貼 | 日班：50 × (加班 ≥ 3 小時的天數 + 有薪假有上班的天數)；外勞門檻 6 小時。夜班：50 × 有上班天數 |
| 獎金、特休加 | 手動輸入，預設 0 |
| 特休減 | 現行寫 0，標題誤植為「勤務津貼」。移植後保留為手動欄位 |

**減項**

| 項目 | 規則 |
|---|---|
| 病假 | `時數 × (本薪 × 0.5 + 勤務 × 0.5) / 240`。外帳版本參數相同 |
| 事假 | `時數 × (本薪 + 勤務) / 240` |
| 曠職 | `時數 × (本薪 + 勤務) / 240` |
| 公休 | `時數 × 本薪 / 240` |
| 公假（標題）／防疫假 | 舊公式 `防疫假時數 + 無薪假時數 × base`，防疫假沒有乘基數，應為 bug。移植時改為兩者都乘基數，並在 parity 測試中列為已知差異 |
| 健保費、勞保費 | 取 `staff` |
| 福利基金 | `benifit=1` 免繳，否則 100 |
| 借支、其他代扣、稅金代扣 | 手動輸入，預設 0 |
| 退休提撥 | 取 `staff`，**不計入減項合計**，只顯示 |

**合計**：加項合計 = 本薪到伙食津貼；減項合計 = 病假到其他代扣；實領 = 加項合計 − 減項合計。

**報表變體**

- 正式：部門 銷管部、生產部。
- 外勞：多一欄稅金代扣。
- 外帳（`exportFake`）：部門多「打工」，病假改外帳欄，`have_fake` 員工讀 `staff_manhour2`。
- 員工排序：`need_check DESC, is_foreign ASC, name ASC`。程式硬編排除「林慶豐」，移植後改為員工設定欄位或直接移除。

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
| created_by | varchar(10) | user id |
| created_at | timestamptz | |

**`payroll_run_staff`**：每人一筆，欄位即 1.4 的每個薪資項目加上四桶加班、13 種假別時數、遲到次數。手動欄位（獎金、特休加、特休減、借支、其他代扣、稅金代扣）另存 `manual_json`，由前端在 draft 狀態下填入後重算合計。

**`payroll_run_day`**：每人每日一筆，欄位即 1.3 的每日欄位。這張表可取代目前沒人寫的 `staff_workhour`；建議保留 `staff_workhour` 不動，等遷移完成再決定是否刪除。

同一 period + variant + department 可有多個 run。`status=final` 的 run 不可覆寫，只能新建 run。這樣每月定稿後，日後修改請假或工時不會改變已發出的薪資表。

### 3.3 API

全部掛 `JwtAuthGuard` + `FeatureGuard`，feature 名稱 `hr-payroll`。

| 方法 | 路徑 | 權限 | 說明 |
|---|---|---|---|
| POST | `/hr/payroll/runs` | write | body: period、variant、departments[]。載入資料、計算、存 draft run、產 Excel。回傳 run 清單與 warnings |
| GET | `/hr/payroll/runs` | read | 依 period 查詢 |
| GET | `/hr/payroll/runs/:id` | read | run + staff + day 明細 |
| PATCH | `/hr/payroll/runs/:id/manual` | write | 更新手動欄位，重算合計，重產 Excel。僅 draft |
| POST | `/hr/payroll/runs/:id/finalize` | write | 改 final |
| GET | `/hr/payroll/runs/:id/file` | read | 下載 xlsx |
| POST | `/hr/payroll/preview` | read | 只計算不存，前端預覽用 |

### 3.4 Excel 產出

- 套件：`exceljs`（純 JS、支援欄寬、合併、字型、列印設定）。不用 LibreOffice，避免與 `nesting.service.ts` 的轉檔流程耦合。
- 版面沿用舊報表：每部門兩個工作表「打卡記錄-部門」「薪資-部門」，欄位順序、合併儲存格、隱藏欄、頁首「民國年月 部門 打卡記錄／薪資表」、橫向列印都保留，HR 看到的樣子不變。
- 所有儲存格寫數值或文字，**不寫 formula**。總合欄也是後端算好的值。
- 檔名 `{民國年}年{月}月薪資表-{variant}-run{id}.xlsx`，存到 `files/payroll/{yyyy}/`，路徑與 sha256 記在 `payroll_run`。
- 舊 Excel 的外帳與外勞版本靠 `setRounding` 設定數字格式 `#,##0`，新版後端已經四捨五入，格式只做顯示。

### 3.5 請假登錄

後端修改 `staff-leave`：

1. `StaffLeaveController` 加 `JwtAuthGuard` + `FeatureGuard`，feature `hr-leave`。
2. 新增 `CreateStaffLeaveDto`：`name`、`type`（限 13 種假別）、`start_time`、`end_time`。`verify` 一律從 JWT 取登入者對應的 `staff.name`，不接受 body 傳入。
3. 時數改用 `domain/rounding.ts`：30 分鐘捨去後扣 `SchedulePicker.getBreakHour`。與 Java 一致不封頂。
4. 跨日請假在 service 拆成每天一筆，同一交易寫入，回傳全部建立的紀錄。
5. 新增 `GET /staff-leaves/balance?name=&date=`：回傳特休（到職日週年區間）與病假（曆年）已用時數，供前端顯示。
6. 刪除與修改保留，但 `final` 薪資 run 涵蓋期間內的請假不允許修改，回 409。

前端新增 `views/HR/StaffLeave.vue`，路由 `/hr/leave` 取代現在的轉址：

- 表單：員工下拉（帶入最新段別預設時段）、假別下拉、開始／結束日期時間、送出。
- 列表：當月請假，可依員工篩選，顯示時數與簽核人。
- 右側顯示該員工特休與病假已用時數。
- 遵循 `.agent/rules/frontend/*` 的元件與 API 狀態規範。

### 3.6 薪資前端

新增 `views/HR/Payroll.vue`，路由 `/hr/payroll`：

1. 選年月、variant、部門，按「計算」呼叫 preview，顯示 warnings 與每人薪資項目表格。
2. 可直接在表格填手動欄位，再按「建立 run」存 draft 並下載 Excel。
3. run 列表：可檢視歷次 snapshot、下載檔案、定稿。
4. 每日明細用展開列顯示，對應舊的打卡記錄工作表。

## 4. Parity 驗證

1. **取得基準**：用 Java Personnel 對 2026 年 8 月與 9 月各產一份正式與外帳 Excel，放到 `apps/backend/src/hr/payroll/__fixtures__/`。用 Excel 開啟後另存，讓公式結果固化成值，再用腳本讀成 JSON。
2. **輸入固化**：用 MariaDB loader 把同期間的 `PayrollSourceData` 存成 JSON fixture。
3. **測試**：`domain/*.spec.ts` 對每人每日與每人每月項目逐格比對。允許差異清單只放已知 bug（1.4 的防疫假、1.1 的段別選取），其餘必須完全相等。
4. **邊界案例**：跨日段別、夜班、責任制、外勞有薪假、請假起點等於段別起點、缺下班打卡、無薪假自動補登。每項至少一個單元測試。
5. 現有 `legacy-attendance-parity.spec.ts` 的作法可直接沿用。

## 5. 實作順序

| 階段 | 內容 | 產出 | 依賴 |
|---|---|---|---|
| 1 | `domain/` 純函式 + fixture + parity 測試 | 計算核心通過比對 | 無 |
| 2 | snapshot entity + migration、`PayrollSourceLoader` MariaDB 版、`payroll.service` | 可用 API 產 run | 階段 1 |
| 3 | exceljs builder、下載 API | 與舊報表同版面的 xlsx | 階段 2 |
| 4 | 請假後端修正 + `StaffLeave.vue` | HR 可在 Nest 登錄請假 | 無，可與 1–3 並行 |
| 5 | `Payroll.vue`、feature 權限設定 | HR 可在 Nest 產薪資 | 階段 3 |
| 6 | 雙軌一個月：Java 與 Nest 各產一次，比對 | 差異為零或皆在允許清單 | 階段 5 |
| 7 | PostgreSQL loader，切換資料來源 | 不再依賴 MariaDB | 整體 HR 遷移翻轉寫入端後 |

階段 1 到 3 不改動任何現有表與現有排程，風險最低，可先合併。

## 6. 待決事項

1. **「林慶豐」排除**：改為 `staff` 新欄位 `exclude_payroll`，或直接以 `stop_work` 判斷離職。建議後者。
2. **防疫假公式**：確認是否照舊（不乘基數）還是修正。本規劃預設修正。
3. **段別選取不一致**：確認夜班與責任制以「當日段別」為準。
4. **手動欄位來源**：獎金、借支等目前由 HR 在 Excel 手填。改為前端填入 draft run 後，Excel 就是最終版。確認 HR 接受不再手改 Excel。
5. **外帳報表**是否仍需要。若需要，`staff_manhour2` 的維護介面也要一併規劃，目前 Nest 只有 GET/POST。
6. **snapshot 保存期限**：`input_json` 每月每部門約數百 KB，預設永久保留。

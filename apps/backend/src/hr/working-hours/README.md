# 工時計算管理 (Working Hours)

本模組提供完整的工時計算功能，將原始 Python Django 版本的工時計算邏輯轉換為 NestJS TypeScript 版本。

## 功能概述

### 核心類別

1. **SchedulePicker** - 排程選擇器

   - 根據員工姓名和日期取得段別設定
   - 計算休息時間（中午和晚上）
   - 支援自訂休息時間設定

2. **WorkingHours** - 工作時間計算器

   - 決定打卡記錄類型（上班/下班）
   - 處理重複打卡記錄
   - 搜尋員工打卡記錄
   - 支援跨日工作時間計算

3. **ManHourManager** - 工時管理器

   - 計算員工工時
   - 管理工時記錄
   - 支援批次處理
   - 提供統計摘要

4. **WorkingHoursService** - 整合服務
   - 統一的工時計算介面
   - 完整的工時計算流程
   - 員工休息時間計算
   - 系統狀態監控

## API 端點

### 工時計算

#### 計算指定日期工時

```
POST /working-hours/calculate
```

**請求體：**

```json
{
  "date": "2024-01-01"
}
```

#### 計算今日工時

```
POST /working-hours/today
```

#### 計算昨日工時

```
POST /working-hours/yesterday
```

#### 重新計算日期範圍工時

```
POST /working-hours/calculate-range
```

**請求體：**

```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

### 員工相關

#### 計算員工休息時間

```
POST /working-hours/calculate-break-time
```

**請求體：**

```json
{
  "staffName": "張三",
  "date": "2024-01-01",
  "workStartTime": "2024-01-01T09:00:00Z",
  "workEndTime": "2024-01-01T18:00:00Z"
}
```

#### 取得員工段別設定資訊

```
GET /working-hours/staff-segment-info?staffName=張三&date=2024-01-01
```

#### 處理員工打卡記錄

```
POST /working-hours/process-staff-attendance
```

**請求體：**

```json
{
  "staffName": "張三",
  "date": "2024-01-01",
  "workStartTime": "2024-01-01T09:00:00Z",
  "workEndTime": "2024-01-01T18:00:00Z"
}
```

### 統計與監控

#### 取得工時統計摘要

```
GET /working-hours/summary?startDate=2024-01-01&endDate=2024-01-31
```

#### 檢查未完成工時記錄

```
GET /working-hours/incomplete-records
```

#### 取得系統狀態

```
GET /working-hours/system-status
```

## 使用範例

### 基本工時計算

```typescript
// 在服務中使用
@Injectable()
export class SomeService {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  async calculateDailyHours() {
    const today = new Date();
    await this.workingHoursService.calculateCompleteWorkingHours(today);
  }
}
```

### 計算員工休息時間

```typescript
const breakMinutes = await this.workingHoursService.calculateStaffBreakTime(
  '張三',
  new Date('2024-01-01'),
  new Date('2024-01-01T09:00:00Z'),
  new Date('2024-01-01T18:00:00Z'),
);

console.log(`休息時間: ${breakMinutes} 分鐘`);
```

### 批次處理

```typescript
// 重新計算整個月的工時
await this.workingHoursService.recalculateWorkingHoursRange(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
);
```

## 業務邏輯

### 打卡記錄類型決定

1. **自動分類**：系統會自動將打卡記錄分類為上班或下班
2. **重複處理**：處理重複打卡記錄，標記為未知類型
3. **時間範圍**：以凌晨5點為界，5點前的打卡算作前一天

### 休息時間計算

1. **中午休息**：12:00 開始的休息時間
2. **晚上休息**：18:00 開始的加班休息時間
3. **段別設定**：根據員工的段別設定計算休息時間

### 工時計算

1. **配對記錄**：上班記錄與下班記錄配對
2. **時間計算**：計算實際工作時間（扣除休息時間）
3. **異常處理**：處理沒有對應下班記錄的上班記錄

## 與原始 Python 版本的對應

| Python 類別      | TypeScript 類別  | 說明                         |
| ---------------- | ---------------- | ---------------------------- |
| `SchedulePicker` | `SchedulePicker` | 排程選擇器，計算休息時間     |
| `WorkingHours`   | `WorkingHours`   | 工作時間計算器，決定打卡類型 |
| `ManHourManager` | `ManHourManager` | 工時管理器，計算和管理工時   |

## 注意事項

1. **段別設定**：員工必須有有效的段別設定才能計算休息時間
2. **時間格式**：API 使用 ISO 8601 格式處理時間
3. **錯誤處理**：所有操作都有完整的錯誤處理和記錄
4. **效能考量**：大量資料處理時建議使用批次處理
5. **資料一致性**：工時計算會先刪除舊記錄再重新計算

## 配置

### 預設設定

- **公司上班時間**：凌晨 5:00
- **預設休息時間**：60 分鐘（當沒有段別設定時）
- **時間範圍**：以凌晨 5:00 為工作日的分界點

### 自訂設定

可以透過 `StaffSegment` 實體自訂：

- 休息時間長度
- 加班休息時間
- 工作時段設定

## 監控與維護

### 系統健康檢查

- 檢查未完成的工時記錄
- 監控系統處理狀態
- 提供統計摘要資訊

### 日誌記錄

- 詳細的操作日誌
- 錯誤和警告記錄
- 效能監控資訊

### 資料備份

- 工時計算前會備份現有資料
- 支援重新計算功能
- 資料一致性檢查

# 工時計算定時任務

本文件說明在 NestJS scheduler 中重現的 Python 工時計算任務。

## 任務概述

### 原始 Python 任務

```python
@register_job(scheduler, "interval", minutes=30)
def calculate_man_hour_morning():
    # 處理出勤記錄 CSV 檔案
    AttendRecordCsvReader().search_attend_logs()

    # 決定打卡記錄類型
    last_time = WorkingHours().appoint_attend_records_type()

    # 計算工時
    manager = ManHourManager()
    date = datetime.datetime.now()
    end_time = date.replace(hour=6, minute=0, second=0, microsecond=0, tzinfo=pytz.UTC)

    if last_time:
        start_time = end_time.replace(year=last_time.year, month=last_time.month, day=last_time.day)
    else:
        return

    while start_time <= end_time:
        manager.calculate_man_hour(start_time)
        start_time += datetime.timedelta(days=1)
```

### TypeScript NestJS 版本

```typescript
@Cron('0 */30 * * * *', {
  name: 'calculate-man-hour',
  timeZone: 'Asia/Taipei',
})
async handleCalculateManHour(): Promise<void> {
  // 步驟1: 處理出勤記錄 CSV 檔案
  await this.attendRecordCsvReader.searchAttendLogs();

  // 步驟2: 決定打卡記錄類型
  const lastTime = await this.workingHoursService['workingHours']['appointAttendRecordsType']();

  if (!lastTime) return;

  // 步驟3: 計算工時
  const now = new Date();
  const endTime = new Date(now);
  endTime.setHours(6, 0, 0, 0); // 設定為當天早上6點

  let startTime = new Date(lastTime);
  startTime.setHours(6, 0, 0, 0);

  if (startTime > endTime) {
    startTime.setDate(startTime.getDate() - 1);
  }

  while (startTime <= endTime) {
    await this.workingHoursService.calculateCompleteWorkingHours(startTime);
    startTime.setDate(startTime.getDate() + 1);
  }
}
```

## 執行頻率

- **Cron 表達式**: `0 */30 * * * *`
- **執行頻率**: 每30分鐘執行一次
- **時區**: 亞洲/台北 (Asia/Taipei)

## 任務流程

### 1. 處理出勤記錄 CSV 檔案

- 調用 `AttendRecordCsvReader.searchAttendLogs()`
- 搜尋並處理所有出勤記錄檔案
- 將資料轉換為 `AttendRecord` 實體

### 2. 決定打卡記錄類型

- 調用 `WorkingHours.appointAttendRecordsType()`
- 自動分類打卡記錄為上班或下班
- 處理重複打卡記錄
- 返回最後處理的打卡記錄時間

### 3. 計算工時

- 設定時間範圍：從最後處理時間到當天早上6點
- 逐日計算工時
- 調用 `WorkingHoursService.calculateCompleteWorkingHours()`
- 包含完整的工時計算流程

## 時間邏輯

### 時間範圍設定

- **結束時間**: 當天早上6:00
- **開始時間**: 最後處理打卡記錄的日期早上6:00
- **調整邏輯**: 如果開始時間超過結束時間，調整為前一天

### 逐日計算

- 從開始時間開始，逐日計算工時
- 每天調用一次完整的工時計算
- 直到達到結束時間

## 錯誤處理

### 任務級別錯誤處理

- 整個任務的錯誤會被捕獲並記錄
- 任務失敗不會影響下次執行

### 日期級別錯誤處理

- 單一日期計算失敗不會影響其他日期
- 每個日期的錯誤都會被記錄
- 繼續處理下一個日期

## API 端點

### 手動觸發

```
POST /api/scheduler/calculate-man-hour
```

**用途**: 手動觸發工時計算任務
**權限**: 需要管理員權限
**回應**:

```json
{
  "message": "工時計算任務已開始執行"
}
```

## 日誌記錄

### 任務開始

```
[calculate-man-hour] 開始執行工時計算任務...
```

### 步驟完成

```
[calculate-man-hour] 步驟1: 處理出勤記錄 CSV 檔案
[calculate-man-hour] 出勤記錄處理完成
[calculate-man-hour] 步驟2: 決定打卡記錄類型
[calculate-man-hour] 打卡記錄類型決定完成
[calculate-man-hour] 步驟3: 開始計算工時
```

### 日期處理

```
[calculate-man-hour] 工時計算完成: 2024-01-01
[calculate-man-hour] 工時計算完成: 2024-01-02
```

### 任務完成

```
[calculate-man-hour] 工時計算任務完成
```

### 錯誤記錄

```
[calculate-man-hour] 計算工時失敗: 2024-01-01
[calculate-man-hour] 工時計算任務執行失敗
```

## 配置

### 時區設定

- 預設時區: `Asia/Taipei`
- 可透過 `timeZone` 參數調整

### 執行頻率調整

如需調整執行頻率，可修改 Cron 表達式：

```typescript
// 每小時執行
@Cron('0 0 * * * *')

// 每天凌晨4點執行
@Cron('0 0 4 * * *')

// 每15分鐘執行
@Cron('0 */15 * * * *')
```

## 監控

### 任務狀態

- 可透過 `SchedulerRegistry` 監控任務狀態
- 支援啟用/停用/手動執行

### 執行歷史

- 每次執行都會記錄詳細日誌
- 包含開始時間、完成時間、錯誤資訊

### 健康檢查

- 任務執行狀態會反映在系統健康檢查中
- 可透過 `/api/scheduler/health` 端點監控

## 注意事項

1. **資料庫連接**: 任務會自動處理資料庫連接
2. **錯誤恢復**: 任務失敗後會自動重試（下次排程時間）
3. **效能考量**: 大量資料處理時可能需要較長時間
4. **資源使用**: 任務執行期間會使用較多 CPU 和記憶體
5. **時區處理**: 所有時間計算都基於設定的時區

## 故障排除

### 常見問題

1. **任務未執行**

   - 檢查 Cron 表達式是否正確
   - 確認時區設定
   - 檢查日誌中的錯誤訊息

2. **工時計算失敗**

   - 檢查出勤記錄資料是否完整
   - 確認員工段別設定
   - 檢查資料庫連接狀態

3. **效能問題**
   - 考慮調整執行頻率
   - 檢查資料庫查詢效能
   - 監控系統資源使用情況

### 調試建議

1. 啟用詳細日誌記錄
2. 使用手動觸發端點測試
3. 監控任務執行時間
4. 檢查資料庫查詢效能

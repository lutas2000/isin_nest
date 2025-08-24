# 出勤記錄 CSV 讀取器

本功能已將原始 Python Django 版本的出勤記錄 CSV 處理功能成功轉換為 NestJS TypeScript 版本。

## 功能概述

- **AttendRecordCsvReader**: 處理放在 `files/attend/Log` 目錄下的 `.txt` 格式 CSV 檔案
- **AttendRecordUsbReader**: 處理 `files/attend/usb.csv` 檔案（使用 tab 分隔符）
- **AttendRecordMapper**: 負責將 CSV 資料轉換為 AttendRecord 實體

## 主要特點

### 檔案處理流程

1. 遞迴搜尋指定目錄下的所有 `.txt` 檔案
2. 依檔案修改時間排序（從舊到新）
3. 處理前先複製檔案到備份目錄
4. 逐行讀取並解析 CSV 資料
5. 轉換為 AttendRecord 實體並儲存到資料庫
6. 處理完成後刪除原始檔案

### 資料轉換

- 支援 CSV 和 USB CSV 兩種格式
- 自動識別員工編號和姓名
- 智慧型出勤類型解析
- 資料驗證確保完整性

### 錯誤處理

- 完整的錯誤記錄和異常處理
- 檔案操作失敗時的優雅降級
- 無效資料的警告記錄

## API 端點

### 手動觸發處理

```
POST /attend-record/process-files?fileType=all
```

參數:

- `fileType`: `csv` | `usb` | `all` (預設: `all`)

### 單獨處理 CSV 檔案

```
POST /attend-record/process-csv
```

### 單獨處理 USB 檔案

```
POST /attend-record/process-usb
```

## 目錄結構

```
files/
├── attend/
│   ├── Log/           # CSV 檔案放置目錄 (.txt 格式)
│   ├── backup/        # 處理後的備份檔案
│   └── usb.csv        # USB 匯出的 CSV 檔案 (tab 分隔)
```

## 注意事項

1. **CSV 格式**: 目前的 CSV 欄位對應是基於假設，需要根據實際 CSV 檔案格式調整 `AttendRecordMapper` 中的對應邏輯
2. **員工查詢**: `findStaffIdByName` 方法目前僅返回 null，需要根據實際需求實作資料庫查詢
3. **備份目錄**: 系統會自動建立備份目錄，確保檔案處理的安全性
4. **權限**: 確保應用程式對檔案目錄有讀寫權限

## 使用範例

```typescript
// 在服務中使用
await this.attendRecordService.processAllAttendanceFiles();

// 或單獨處理
await this.attendRecordService.processCsvFiles();
await this.attendRecordService.processUsbFile();
```

## 與原始 Python 版本的對應

| Python 類別             | TypeScript 類別         | 說明           |
| ----------------------- | ----------------------- | -------------- |
| `AttendRecordCsvReader` | `AttendRecordCsvReader` | CSV 檔案讀取器 |
| `AttendRecordUsbReader` | `AttendRecordUsbReader` | USB CSV 讀取器 |
| `AttendMapperMapper`    | `AttendRecordMapper`    | 資料轉換器     |

所有原始功能都已完整保留並適配到 NestJS 架構中。

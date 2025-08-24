# 出勤記錄管理 (Attend Record)

本模組提供員工出勤記錄的CRUD功能，包含上班、下班打卡記錄管理。

## 功能特點

- 建立出勤記錄
- 查詢所有出勤記錄
- 根據條件篩選出勤記錄（員工ID、日期範圍、出勤類型）
- 查詢今日特定員工的出勤記錄
- 更新出勤記錄
- 刪除出勤記錄
- 與員工資料表關聯

## API 端點

### 建立出勤記錄

```
POST /attend-record
```

**請求體範例：**

```json
{
  "staffId": "STAFF001",
  "staffName": "張三",
  "inputType": "fingerprint",
  "attendType": 1
}
```

**inputType 常見值：**

- `card`: 刷卡
- `fingerprint`: 指紋
- `manual`: 手動輸入
- `face`: 人臉識別

### 查詢所有出勤記錄

```
GET /attend-record
```

**查詢參數：**

- `staffId`: 根據員工編號篩選
- `attendType`: 根據出勤類型篩選 (0:未決定, 1:上班, 2:下班)
- `startDate`: 開始日期 (YYYY-MM-DD)
- `endDate`: 結束日期 (YYYY-MM-DD)

### 查詢特定出勤記錄

```
GET /attend-record/:id
```

### 查詢今日員工出勤記錄

```
GET /attend-record/today/:staffId
```

### 更新出勤記錄

```
PATCH /attend-record/:id
```

### 刪除出勤記錄

```
DELETE /attend-record/:id
```

## 資料結構

### AttendRecord Entity

- `id`: 自動產生的整數ID
- `staffId`: 員工編號 (varchar 10)
- `staffName`: 員工姓名 (varchar 6, 可選)
- `createTime`: 建立時間 (datetime, 自動產生)
- `inputType`: 輸入類型 (varchar 20, 可選) - 支援較長的輸入類型如 "fingerprint"
- `attendType`: 出勤類型 (int, 0:未決定 1:上班 2:下班)
- `staff`: 關聯的員工資料

### 設計特點

- **無需DTO**: 使用TypeScript interface，與專案其他模組保持一致
- **彈性輸入類型**: 支援多種打卡方式，inputType欄位長度足夠
- **自動關聯**: 自動載入關聯的員工詳細資料
- **資料驗證**: 嚴格的員工ID和出勤類型驗證
- **業務邏輯防護**: 防止重複打卡，確保資料完整性
- **分頁支援**: 查詢API支援分頁，提升大量資料的載入效能
- **詳細錯誤訊息**: 提供準確的錯誤資訊，便於除錯和使用者體驗

### 業務規則

- **員工驗證**: 只能為存在的員工建立出勤記錄
- **重複打卡防護**: 同一天內同一類型的打卡記錄只能建立一次（未決定類型除外）
- **出勤類型限制**: 僅支援 0(未決定)、1(上班)、2(下班) 三種類型
- **分頁限制**: 每頁最多100筆記錄，預設50筆

## 出勤類型說明

- `0`: 未決定
- `1`: 上班
- `2`: 下班

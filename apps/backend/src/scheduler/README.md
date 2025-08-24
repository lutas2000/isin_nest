# 定期任務系統 (Scheduler System)

這個模組提供了一個完整的定期任務管理系統，可以讓您定期執行特定的 API 呼叫。

## 功能特色

- ✅ **靈活的 Cron 排程**：支援標準 Cron 表達式
- ✅ **HTTP API 呼叫**：支援 GET、POST、PUT、DELETE、PATCH 方法
- ✅ **任務管理**：啟用/停用、新增/刪除、手動執行
- ✅ **即時監控**：查看任務狀態、執行歷史
- ✅ **錯誤處理**：自動錯誤記錄和重試機制
- ✅ **RESTful API**：完整的管理介面

## API 端點

### 任務管理

```
GET    /api/scheduler/tasks           # 取得所有任務
GET    /api/scheduler/tasks/:id       # 取得特定任務
POST   /api/scheduler/tasks           # 建立新任務
PUT    /api/scheduler/tasks/:id       # 更新任務
DELETE /api/scheduler/tasks/:id       # 刪除任務
```

### 任務控制

```
POST   /api/scheduler/tasks/:id/enable    # 啟用任務
POST   /api/scheduler/tasks/:id/disable   # 停用任務
POST   /api/scheduler/tasks/:id/run       # 手動執行任務
```

### 系統資訊

```
GET    /api/scheduler/health           # 系統健康檢查
GET    /api/scheduler/cron-examples    # Cron 表達式範例
```

## 使用範例

### 1. 建立定期任務

```bash
curl -X POST http://localhost:3000/api/scheduler/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "id": "backup-task",
    "name": "每日備份任務",
    "cronExpression": "0 0 2 * * *",
    "url": "http://localhost:3000/api/backup",
    "method": "POST",
    "enabled": true,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "type": "daily",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    "description": "每天凌晨 2 點執行資料備份"
  }'
```

### 2. 啟用/停用任務

```bash
# 啟用任務
curl -X POST http://localhost:3000/api/scheduler/tasks/backup-task/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 停用任務
curl -X POST http://localhost:3000/api/scheduler/tasks/backup-task/disable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 手動執行任務

```bash
curl -X POST http://localhost:3000/api/scheduler/tasks/backup-task/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. 查看所有任務

```bash
curl -X GET http://localhost:3000/api/scheduler/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Cron 表達式格式

使用標準的 6 位 Cron 表達式格式：

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └── 星期幾 (0-7, 0和7都代表星期日)
│ │ │ │ └──── 月份 (1-12)
│ │ │ └────── 日期 (1-31)
│ │ └──────── 小時 (0-23)
│ └────────── 分鐘 (0-59)
└──────────── 秒 (0-59)
```

### 常用範例

| 描述              | Cron 表達式     |
| ----------------- | --------------- |
| 每分鐘            | `0 * * * * *`   |
| 每5分鐘           | `0 */5 * * * *` |
| 每小時            | `0 0 * * * *`   |
| 每天午夜          | `0 0 0 * * *`   |
| 每天早上8點       | `0 0 8 * * *`   |
| 每周一早上9點     | `0 0 9 * * 1`   |
| 每月1號午夜       | `0 0 0 1 * *`   |
| 工作日每天早上9點 | `0 0 9 * * 1-5` |

## 預設任務

系統會自動建立以下預設任務：

1. **系統健康檢查** (`health-check`)

   - 時間：每天午夜
   - 端點：`GET /health`
   - 狀態：啟用

2. **資料同步任務** (`data-sync`)

   - 時間：每小時
   - 端點：`POST /api/sync`
   - 狀態：停用（需手動啟用）

3. **心跳檢查** (`heartbeat`)

   - 時間：每5分鐘
   - 類型：內建任務（僅記錄日誌）

4. **每日清理** (`daily-cleanup`)
   - 時間：每天凌晨2點
   - 類型：內建任務（可自定義邏輯）

## 權限要求

所有 API 端點都需要：

- JWT 驗證 (`JwtAuthGuard`)
- 管理員權限 (`AdminGuard`)

## 錯誤處理

- 任務執行失敗會自動記錄錯誤日誌
- 系統會繼續執行其他任務
- 可通過日誌查看詳細錯誤資訊

## 監控和日誌

所有任務執行都會產生詳細日誌：

- 任務開始/結束時間
- 執行結果和狀態碼
- 錯誤資訊和堆疊追踪
- 下次執行時間

## 注意事項

1. **時區設定**：所有 Cron 任務默認使用 `Asia/Taipei` 時區
2. **權限管理**：只有管理員可以管理定期任務
3. **資源使用**：避免設定過於頻繁的任務以免影響系統效能
4. **網路延遲**：考慮 API 呼叫的網路延遲和超時設定
5. **錯誤重試**：目前不支援自動重試，失敗的任務需要手動重新執行

## 擴展功能

您可以輕鬆擴展此系統：

1. **資料庫持久化**：將任務配置儲存到資料庫
2. **重試機制**：加入失敗重試邏輯
3. **任務依賴**：支援任務間的依賴關係
4. **結果通知**：任務完成後發送通知
5. **效能監控**：加入任務執行時間統計

## 故障排除

### 常見問題

1. **任務不執行**

   - 檢查任務是否已啟用
   - 驗證 Cron 表達式格式
   - 查看系統日誌

2. **API 呼叫失敗**

   - 確認目標 URL 可訪問
   - 檢查請求標頭和內容
   - 驗證權限設定

3. **權限錯誤**
   - 確認已正確登入並獲得 JWT token
   - 驗證使用者具有管理員權限

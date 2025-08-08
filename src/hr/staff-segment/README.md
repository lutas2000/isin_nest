# Staff Segment API

員工段別管理模組，提供完整的 CRUD API 操作。

## 功能特色

- 員工段別設定的新增、查詢、更新、刪除
- 支援與員工資料的關聯查詢
- 支援依據員工編號查詢段別設定
- 支援依據日期範圍查詢段別設定
- 完整的 API 文檔（Swagger）

## API 端點

### 基本 CRUD 操作

- `POST /hr/staff-segment` - 新增員工段別設定
- `GET /hr/staff-segment` - 取得所有員工段別設定
- `GET /hr/staff-segment/:id` - 取得指定 ID 的員工段別設定
- `PATCH /hr/staff-segment/:id` - 更新員工段別設定
- `DELETE /hr/staff-segment/:id` - 刪除員工段別設定

### 特殊查詢

- `GET /hr/staff-segment/staff/:staffId` - 根據員工編號查詢段別設定
- `GET /hr/staff-segment/date-range?startDate=2024-01-01&endDate=2024-12-31` - 根據日期範圍查詢

## 資料結構

```typescript
{
  id: number; // 段別編號（自動生成）
  staffId: string; // 員工編號（關聯到 staff 表）
  begain_time: string; // 開始時間（格式：HH:mm:ss）
  end_time: string; // 結束時間（格式：HH:mm:ss）
  cross_day: boolean; // 是否跨日
  duty: boolean; // 責任制
  night_work: boolean; // 夜班
  rest_time: number; // 休息時間（分鐘）
  rest_time2: number; // 加班休息時間（分鐘）
  create_date: Date; // 建立日期
  staff: Staff; // 關聯的員工資料
}
```

## 使用範例

### 新增員工段別設定

```bash
curl -X POST http://localhost:3000/hr/staff-segment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "staffId": "STAFF001",
    "begain_time": "08:00:00",
    "end_time": "17:00:00",
    "cross_day": false,
    "duty": false,
    "night_work": false,
    "rest_time": 60,
    "rest_time2": 60
  }'
```

### 查詢員工的所有段別設定

```bash
curl -X GET http://localhost:3000/hr/staff-segment/staff/STAFF001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 注意事項

- 所有 API 都需要 JWT 驗證
- 時間格式統一使用 HH:mm:ss（24小時制）
- staffId 必須存在於 staff 表中
- 所有 boolean 欄位預設為 false
- rest_time2 預設為 60 分鐘

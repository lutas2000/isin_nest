# 同時創建用戶和員工 API

## 概述

這個 API 允許管理員同時創建用戶（User）和員工（Staff）記錄，並根據員工的 `work_group` 自動分配預設的功能權限。

## API Endpoint

```
POST /auth/create-user-with-staff
```

**權限要求**：需要管理員權限（JWT Auth + Admin Guard）

## 功能特點

1. **自動關聯**：創建的 staff.id 會自動設置為 user.id（轉換為字符串格式）
2. **自動權限分配**：根據 `work_group` 從 `feature_configs` 表中查找預設權限並自動分配
3. **事務安全**：如果創建過程中出現錯誤，會自動回滾

## 請求格式

```json
{
  "userName": "staff001",
  "password": "password123",
  "isAdmin": false,
  "name": "張三",
  "post": "工程師",
  "work_group": "A組",
  "department": "技術部",
  "wage": 50000,
  "allowance": 5000,
  "organizer": 0,
  "labor_insurance": 2000,
  "health_insurance": 1500,
  "pension": 3000,
  "is_foreign": false,
  "benifit": true,
  "need_check": true,
  "begain_work": "2023-01-01",
  "stop_work": null,
  "have_fake": false
}
```

## 回應格式

```json
{
  "message": "用戶和員工創建成功",
  "user": {
    "id": 1,
    "userName": "staff001",
    "isAdmin": false,
    "features": [
      { "feature": "crm", "permission": "read" },
      { "feature": "hr", "permission": "write" }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "staff": {
    "id": "0000000001",
    "userId": 1,
    "name": "張三",
    "post": "工程師",
    "work_group": "A組",
    "department": "技術部",
    ...
  }
}
```

## 設定 work_group 預設權限

### 1. 創建 FeatureConfig

首先需要在 `feature_configs` 表中創建 work_group 的配置：

```sql
INSERT INTO feature_configs (workGroup, description) 
VALUES ('A組', 'A組的預設權限配置');
```

### 2. 創建 FeaturePermission

然後在 `feature_permissions` 表中為該 work_group 設定功能權限：

```sql
-- 假設 feature 表中已有 'crm' 和 'hr' 功能
INSERT INTO feature_permissions (featureConfigId, featureId, permission)
VALUES 
  (1, (SELECT id FROM features WHERE name = 'crm'), 'read'),
  (1, (SELECT id FROM features WHERE name = 'hr'), 'write');
```

### 3. 使用範例

當創建用戶和員工時，如果指定了 `work_group: 'A組'`，系統會自動：
1. 查找 `feature_configs` 表中 `workGroup = 'A組'` 的配置
2. 獲取該配置下的所有 `feature_permissions`
3. 為新創建的用戶自動分配這些權限

## 注意事項

1. **staff.id 格式**：staff.id 會自動設置為 user.id（轉換為字符串，長度限制為 10 個字符）
2. **work_group 可選**：如果沒有提供 `work_group` 或找不到對應的配置，則不會分配任何預設權限
3. **權限覆蓋**：如果用戶已經有某個功能的權限，會更新為配置中的權限
4. **唯一性檢查**：系統會檢查用戶名和員工編號是否已存在，如果存在會返回錯誤

## 錯誤處理

- `使用者已存在`：用戶名已被使用
- `員工編號已存在`：對應的員工編號已被使用（理論上不應該發生，因為使用 user.id）
- `創建用戶和員工失敗`：其他創建過程中的錯誤


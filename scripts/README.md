# 腳本說明

這個目錄包含各種管理腳本。

## 1. 管理員用戶建立腳本 (create-admin.ts)

## 使用方法

### 方法 1: 使用命令列參數

```bash
npm run create-admin <username> <password>
```

範例：
```bash
npm run create-admin admin mypassword123
```

### 方法 2: 使用環境變數

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=mypassword123 npm run create-admin
```

### 更新現有用戶為管理員

如果用戶已存在，可以使用 `--force` 參數來更新：

```bash
npm run create-admin admin newpassword --force
```

或使用環境變數：

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=newpassword FORCE_UPDATE=true npm run create-admin
```

## 環境變數配置

腳本會從 `.env` 檔案讀取資料庫配置：

- `DB_HOST` - 資料庫主機（預設: localhost）
- `DB_PORT` - 資料庫端口（預設: 3306）
- `DB_USER` 或 `DB_USERNAME` - 資料庫用戶名（預設: root）
- `DB_PASS` 或 `DB_PASSWORD` - 資料庫密碼
- `DB_NAME` 或 `DB_DATABASE` - 資料庫名稱（預設: isin_db）

## 注意事項

1. 確保資料庫服務正在運行
2. 確保 `.env` 檔案中的資料庫配置正確
3. 如果用戶已存在且未使用 `--force`，腳本只會提示而不會更新
4. 密碼會使用 bcrypt 進行雜湊處理（saltRounds: 10）

## 2. 資料庫複製腳本 (copy-database.ts)

這個腳本用於從舊的資料庫複製資料到新的資料庫，會自動處理資料表結構差異。

### 使用方法

```bash
npm run copy-database
```

### 功能說明

- **自動偵測資料表結構差異**：只複製兩個資料庫都存在的欄位
- **智能排序**：根據外鍵關係自動決定資料表複製順序
- **批次處理**：使用批次插入提高效率（每批 1000 筆）
- **錯誤處理**：單一資料表複製失敗不會影響其他資料表

### 配置

腳本會從 `apps/backend/.env` 檔案讀取資料庫配置：

- `DB_HOST` - 資料庫主機（預設: localhost）
- `DB_PORT` - 資料庫端口（預設: 3306）
- `DB_USER` 或 `DB_USERNAME` - 資料庫用戶名（預設: root）
- `DB_PASS` 或 `DB_PASSWORD` - 資料庫密碼

**資料庫名稱**：
- 來源資料庫：`isin2`
- 目標資料庫：`test_isin2`

### 注意事項

1. **資料會被清空**：腳本會先清空目標資料表的所有資料，然後再複製來源資料
2. **結構差異處理**：
   - 如果來源資料表有但目標資料表沒有的欄位，這些欄位會被忽略
   - 如果目標資料表有但來源資料表沒有的欄位，這些欄位會保持預設值或 NULL
3. **外鍵關係**：腳本會自動分析外鍵關係，確保先複製被參考的資料表
4. **資料類型處理**：
   - 日期時間會自動轉換格式
   - JSON 欄位會自動序列化
   - 布林值會轉換為 0/1
5. **執行時間**：根據資料量大小，可能需要幾分鐘到幾小時不等

### 執行範例輸出

```
🚀 開始複製資料庫...
📊 來源資料庫: isin2
📊 目標資料庫: test_isin2
🔌 資料庫主機: localhost:3306

🔌 正在連接來源資料庫...
✅ 來源資料庫連接成功

🔌 正在連接目標資料庫...
✅ 目標資料庫連接成功

📋 正在取得資料表清單...
✅ 找到 15 個共同資料表

🔗 正在分析外鍵關係...
✅ 找到 8 個外鍵關係

📊 資料表複製順序:
  1. users
  2. staff
  3. customer
  ...

🔄 開始複製資料...

  📋 複製資料表: users
    🗑️  已清空目標資料表
    ✅ 已複製 10 筆資料
  ...
```


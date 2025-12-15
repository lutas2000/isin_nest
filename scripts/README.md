# 管理員用戶建立腳本

這個腳本用於建立或更新管理員用戶。

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


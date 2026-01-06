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

## 3. Access 資料庫分析腳本 (analyze-access.ts)

這個腳本用於分析 Microsoft Access 資料庫（.mdb 或 .accdb 格式）的結構，並可選地與 MySQL 資料表進行對比。

### 使用方法

```bash
npm run analyze-access <access-file-path> [mysql-table-name]
```

範例：
```bash
# 分析所有資料表
npm run analyze-access /path/to/quote.mdb

# 分析特定資料表並與 MySQL 對比
npm run analyze-access /path/to/quote.mdb quote
```

或使用環境變數：

```bash
ACCESS_FILE_PATH=/path/to/quote.mdb MYSQL_TABLE_NAME=quote npm run analyze-access
```

### 功能說明

- **分析 Access 資料表結構**：顯示欄位名稱、類型、長度、可為空等資訊
- **樣本資料預覽**：顯示前 5 筆資料作為參考
- **MySQL 對比分析**：如果提供 MySQL 資料表名稱，會進行結構對比
- **欄位對應分析**：找出共同欄位、只在 Access 中的欄位、只在 MySQL 中的欄位

### 配置

腳本會從 `apps/backend/.env` 檔案讀取配置：

- `ACCESS_FILE_PATH` - Access 檔案路徑（可通過命令列參數提供）
- `ACCESS_DB_PASSWORD` - Access 資料庫密碼（如果資料庫有密碼）
- `MYSQL_TABLE_NAME` - 要對比的 MySQL 資料表名稱（可選）
- `DB_HOST` - MySQL 資料庫主機（預設: localhost，僅在對比時需要）
- `DB_PORT` - MySQL 資料庫端口（預設: 3306，僅在對比時需要）
- `DB_USER` 或 `DB_USERNAME` - MySQL 資料庫用戶名（預設: root，僅在對比時需要）
- `DB_PASS` 或 `DB_PASSWORD` - MySQL 資料庫密碼（僅在對比時需要）
- `DB_NAME` 或 `DB_DATABASE` - MySQL 資料庫名稱（預設: isin_db，僅在對比時需要）

### 執行範例輸出

```
🔍 開始分析 Access 資料庫...
📁 Access 檔案: /path/to/quote.mdb
📊 目標 MySQL 資料表: quote
📊 目標資料庫: isin_db

📖 正在讀取 Access 檔案...
✅ Access 檔案讀取成功
   (已使用密碼)

📋 找到 3 個資料表:
   1. quote
   2. quote_item
   3. customer

🔌 正在連接 MySQL 資料庫...
✅ MySQL 資料庫連接成功

================================================================================
📋 分析 Access 資料表: quote
================================================================================

📊 欄位資訊 (共 8 個欄位):
--------------------------------------------------------------------------------

1. id
   類型: Long Integer
   可為空: 否

2. staff_id
   類型: Text
   長度: 10
   可為空: 否

...

📝 樣本資料 (前 5 筆):
--------------------------------------------------------------------------------

   記錄 1:
     id: 1
     staff_id: STAFF001
     customer_id: CUST001
     ...

📊 總筆數: 150

================================================================================
📋 分析 MySQL 資料表: quote
================================================================================

📊 欄位資訊 (共 8 個欄位):
--------------------------------------------------------------------------------

1. id
   類型: int
   可為空: 否
   索引: PRI
   額外: auto_increment

...

================================================================================
🔍 對比分析: quote <-> quote
================================================================================

✅ 共同欄位 (7 個):
   - id
     Access: Long Integer
     MySQL: int
   - staff_id
     Access: Text
     MySQL: varchar
   ...
```

## 4. Access 客戶資料遷移腳本 (migrate-customer-from-access.ts)

這個腳本用於從 Microsoft Access 資料庫的 `cust` 資料表遷移客戶資料到 MySQL 資料庫的 `customer` 和 `contact` 資料表。

### 使用方法

```bash
npm run migrate-customer-from-access <access-file-path>
```

範例：
```bash
npm run migrate-customer-from-access /path/to/cust.mdb
```

或使用環境變數：

```bash
ACCESS_FILE_PATH=/path/to/cust.mdb npm run migrate-customer-from-access
```

### 功能說明

- **自動讀取 Access cust 表**：支援 .mdb 和 .accdb 格式
- **Big5 編碼轉換**：自動將 Big5 編碼的中文字串轉換為 UTF-8
- **資料轉換**：
  - 民國年日期轉換為西元年（如 "90.04.24" → 2001-04-24）
  - 電話號碼合併為 JSON 陣列（tel1, tel2）
  - 統一編號合併為 JSON 陣列（coco, coco2）
  - 代理人解析為 Contact 實體（agent1, agent2, agent3）
- **自動建立關聯**：將代理人資料轉換為 Contact 實體並關聯到 Customer
- **錯誤處理**：重複主鍵自動跳過，單筆資料失敗不影響其他資料

### 欄位對應

| Access 欄位 | Customer Entity 欄位 | 說明 |
|------------|---------------------|------|
| `code` | `id` | 客戶代碼（主鍵） |
| `name` | `companyName` | 公司名稱 |
| `cutname` | `companyShortName` | 公司簡稱 |
| `subname` | `invoiceTitle` | 發票抬頭 |
| `tel1`, `tel2` | `phones` | 合併為 JSON 陣列 |
| `coco`, `coco2` | `taxIds` | 合併為 JSON 陣列 |
| `zipno` | `postalCode` | 郵遞區號 |
| `addr` | `address` | 通訊地址 |
| `inaddr` | `deliveryAddress` | 送貨地址 |
| `bank` | `bank` | 往來銀行 |
| `account` | `accountNumber` | 帳戶號碼 |
| `credit` | `creditLimit` | 信用額度 |
| `debt` | `accountReceivable` | 帳款 |
| `fax` | `fax` | 傳真 |
| `email` | `email` | Email |
| `prod` | `mainProducts` | 主要產品 |
| `remark` | `notes` | 備註 |
| `master` | `ownerName` | 負責人姓名 |
| `dxfpath` | `dxfPath` | DXF 檔案路徑 |
| `deal_f` | `firstTransactionDate` | 開始交易日期（民國年轉換） |
| `deal_l` | `lastTransactionDate` | 最近交易日期（民國年轉換） |
| `agent1`, `agent2`, `agent3` | `Contact` 實體 | 轉換為聯絡人記錄 |

### 配置

腳本會從 `apps/backend/.env` 檔案讀取資料庫配置：

- `DB_HOST` - MySQL 資料庫主機（預設: localhost）
- `DB_PORT` - MySQL 資料庫端口（預設: 3306）
- `DB_USER` 或 `DB_USERNAME` - MySQL 資料庫用戶名（預設: root）
- `DB_PASS` 或 `DB_PASSWORD` - MySQL 資料庫密碼
- `DB_NAME` 或 `DB_DATABASE` - 目標資料庫名稱（預設: isin_db）
- `ACCESS_DB_PASSWORD` - Access 資料庫密碼（如果資料庫有密碼）

**Access 檔案路徑**：
- 可以通過命令列參數提供：`npm run migrate-customer-from-access <path>`
- 或通過環境變數：`ACCESS_FILE_PATH=<path>`

### 資料轉換說明

#### 日期格式轉換
- Access 使用民國年格式（如 "90.04.24" 表示民國 90 年 4 月 24 日）
- 轉換公式：西元年 = 民國年 + 1911
- 範例："90.04.24" → 2001-04-24

#### 電話號碼合併
- 將 `tel1` 和 `tel2` 合併為 JSON 陣列
- 自動過濾空值
- 範例：`tel1: "04-23112015"`, `tel2: ""` → `phones: ["04-23112015"]`

#### 統一編號合併
- 將 `coco` 和 `coco2` 合併為 JSON 陣列
- 自動過濾空值和重複值
- 範例：`coco: "84562519"`, `coco2: ""` → `taxIds: ["84562519"]`

#### 代理人轉換
- 從 `agent1`, `agent2`, `agent3` 解析姓名和電話
- 自動識別電話號碼模式（如 "095-7505671", "0933-555835"）
- 建立對應的 Contact 實體並關聯到 Customer
- 範例：`agent1: "林東地 0933-555835 060-407730"` → Contact { name: "林東地", phones: ["0933-555835", "060-407730"] }

### 注意事項

1. **資料不會被覆蓋**：如果客戶代碼已存在，腳本會自動跳過該筆資料
2. **必要欄位**：`code` 和 `name` 為必要欄位，缺少任一欄位的資料會被跳過
3. **Big5 編碼**：所有文字欄位會自動從 Big5 轉換為 UTF-8
4. **日期驗證**：無效的日期格式會被設為 NULL
5. **批次處理**：每 100 筆資料為一批進行處理，提高效率
6. **錯誤處理**：單筆資料處理失敗不會影響其他資料的遷移

### 執行範例輸出

```
🚀 開始從 Access 資料庫遷移客戶資料...
📁 Access 檔案: /path/to/cust.mdb
📊 目標資料庫: isin_db
🔌 資料庫主機: localhost:3306

📖 正在讀取 Access 檔案...
✅ Access 檔案讀取成功
   (已使用密碼)

📋 正在讀取 cust 資料表...
✅ 讀取到 2206 筆客戶資料

🔌 正在連接目標資料庫...
✅ 目標資料庫連接成功

🔄 開始遷移資料...
================================================================================
   📊 進度: 50/2206 (成功: 48, 跳過: 2, 錯誤: 0)
   📊 進度: 100/2206 (成功: 95, 跳過: 5, 錯誤: 0)
   ...

================================================================================
✅ 遷移完成！
================================================================================
📊 總共處理: 2206 筆
✅ 成功: 2150 筆
⏭️  跳過: 50 筆
❌ 錯誤: 6 筆
👥 建立聯絡人: 3200 筆
================================================================================
```

## 5. Access 報價單資料遷移腳本 (migrate-quote-from-access.ts)

這個腳本用於從 Microsoft Access 資料庫的 `gtable`、`itable`、`jtable` 資料表遷移報價單資料到 MySQL 資料庫的 `quote` 和 `quote_item` 資料表。

### 使用方法

```bash
npm run migrate-quote-from-access [access-file-path] [--skip=n]
```

範例：
```bash
# 使用預設路徑 (legacy/quote.mdb)
npm run migrate-quote-from-access

# 指定 Access 檔案路徑
npm run migrate-quote-from-access /path/to/quote.mdb

# 跳過前 100 筆資料
npm run migrate-quote-from-access /path/to/quote.mdb --skip=100
```

或使用環境變數：

```bash
ACCESS_FILE_PATH=/path/to/quote.mdb SKIP_COUNT=100 npm run migrate-quote-from-access
```

### 功能說明

- **自動讀取 Access 資料表**：支援 .mdb 和 .accdb 格式，讀取 `gtable`、`itable`、`jtable` 三個資料表
- **Big5 編碼轉換**：自動將 Big5 編碼的中文字串轉換為 UTF-8
- **資料轉換**：
  - 民國年日期轉換為西元年（如 "100.01.03" → 2011-01-03）
  - 合併 itable 和 jtable 資料（透過 QNO + SN 一對一關聯）
  - 組合主鍵：QuoteItem 的 id 格式為 `{QNO}_{SN}`
- **Skip 功能**：支援跳過前 n 筆資料，方便從中斷處繼續執行
- **錯誤處理**：發生錯誤時立即中斷，顯示錯誤訊息、堆疊追蹤和處理到第幾筆資料
- **進度顯示**：即時顯示處理進度和統計資訊

### 欄位對應

#### gtable → Quote

| Access 欄位 | Quote Entity 欄位 | 類型 | 說明 |
|------------|------------------|------|------|
| `QNO` | `id` | string | 報價單編號（主鍵） |
| `ACTOR_NO` | `staffId` | string | 經手人員工編號 |
| `FACTOR_NO` | `customerId` | string | 客戶編號 |
| `AMOUNT` | `totalAmount` | decimal | 總金額 |
| `ATTEN` | `notes` | text | 備註 |
| `DATE_R` | `createdAt` | datetime | 建立日期（民國年轉換） |

**排除欄位**：`ACTOR`、`FACTOR`、`XX`

#### itable + jtable → QuoteItem

| Access 欄位 | 來源表 | QuoteItem Entity 欄位 | 類型 | 說明 |
|------------|--------|---------------------|------|------|
| `{QNO}_{SN}` | - | `id` | string | 主鍵（組合格式） |
| `QNO` | itable | `quoteId` | string | 報價單ID |
| `FACTOR_NO` | itable | `customerId` | string | 客戶編號 |
| `DWG_REF` | itable | `customerFile` | string | 客戶圖檔 |
| `DWG_REF` | jtable | `notes` | string | 備註 |
| `METAL` | itable | `material` | string | 材質 |
| `THICK` | itable | `thickness` | string | 厚度 |
| `WORK` | itable | `processing` | string | 加工 |
| `QTY` | itable | `quantity` | int | 數量 |
| `PRICE` | itable | `unitPrice` | decimal | 單價 |

**排除欄位**：`DATE_R`、`FACTOR_NO`、`FACTOR`、`ACTOR`、`TOTAL`

### 配置

腳本會從 `apps/backend/.env` 檔案讀取資料庫配置：

- `DB_HOST` - MySQL 資料庫主機（預設: localhost）
- `DB_PORT` - MySQL 資料庫端口（預設: 3306）
- `DB_USER` 或 `DB_USERNAME` - MySQL 資料庫用戶名（預設: root）
- `DB_PASS` 或 `DB_PASSWORD` - MySQL 資料庫密碼
- `DB_NAME` 或 `DB_DATABASE` - 目標資料庫名稱（預設: isin_db）
- `ACCESS_DB_PASSWORD` - Access 資料庫密碼（如果資料庫有密碼）

**Access 檔案路徑**：
- 預設路徑：`legacy/quote.mdb`
- 可以通過命令列參數提供：`npm run migrate-quote-from-access <path>`
- 或通過環境變數：`ACCESS_FILE_PATH=<path>`

**Skip 功能**：
- 可以通過命令列參數提供：`--skip=n`
- 或通過環境變數：`SKIP_COUNT=n`

### 資料轉換說明

#### 日期格式轉換
- Access 使用民國年格式（如 "100.01.03" 表示民國 100 年 1 月 3 日）
- 轉換公式：西元年 = 民國年 + 1911
- 範例："100.01.03" → 2011-01-03

#### QuoteItem ID 組合
- QuoteItem 的 id 由 QNO 和 SN 組合而成
- 格式：`{QNO}_{SN}`
- 範例：QNO="00010301", SN="1" → id="00010301_1"

#### itable 和 jtable 關聯
- itable 和 jtable 透過 `QNO` + `SN` 進行一對一關聯
- itable 的 `DWG_REF` 作為客戶圖檔（customerFile）
- jtable 的 `DWG_REF` 作為備註（notes）
- 如果 jtable 中沒有對應的記錄，notes 欄位為 null

#### 資料類型轉換
- currency 類型轉換：
  - `QTY` → `quantity`（轉為 int）
  - `PRICE` → `unitPrice`（轉為 decimal）
  - `AMOUNT` → `totalAmount`（轉為 decimal）
- 字串清理：所有文字欄位會自動清理無效字符和控制字符

### 注意事項

1. **資料不會被覆蓋**：如果報價單 ID 或報價單工件 ID 已存在，腳本會自動跳過該筆資料
2. **必要欄位**：
   - Quote：`QNO`（id）和 `ACTOR_NO`（staffId）為必要欄位
   - QuoteItem：`QNO` 和 `SN` 為必要欄位（用於組合 id）
3. **Big5 編碼**：所有文字欄位會自動從 Big5 轉換為 UTF-8
4. **日期驗證**：無效的日期格式會被設為 NULL
5. **錯誤處理**：發生錯誤時會立即中斷，顯示錯誤訊息、堆疊追蹤和處理到第幾筆資料
6. **Skip 功能**：使用 `--skip=n` 可以跳過前 n 筆資料，方便從中斷處繼續執行
7. **進度顯示**：每處理 50 筆 Quote 或 100 筆 QuoteItem 會顯示進度


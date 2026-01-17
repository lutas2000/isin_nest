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

## 2. Staff 資料複製腳本 (copy-staff.ts)

這個腳本用於從 MySQL 資料庫複製 `staff` 資料表到 PostgreSQL 資料庫，並自動為每個 staff 建立對應的 user 帳號。

### 使用方法

```bash
npm run copy-staff
```

### 功能說明

- **跨資料庫複製**：從 MySQL 複製 staff 資料到 PostgreSQL
- **自動建立 User 帳號**：為每個 staff.id 自動建立對應的 user 帳號（預設密碼：`isinisin`）
- **自動偵測資料表結構差異**：只複製兩個資料庫都存在的欄位
- **批次處理**：使用批次插入提高效率（每批 1000 筆）
- **資料類型轉換**：自動處理 MySQL 到 PostgreSQL 的資料類型差異

### 配置

腳本會從 `scripts/.env` 檔案讀取資料庫配置：

**來源資料庫（MySQL）配置**：
- `SOURCE_DB_HOST` 或 `DB_HOST` - 資料庫主機（預設: localhost）
- `SOURCE_DB_PORT` - 資料庫端口（預設: 3306）
- `SOURCE_DB_USER` 或 `SOURCE_DB_USERNAME` 或 `DB_USER` 或 `DB_USERNAME` - 資料庫用戶名（預設: root）
- `SOURCE_DB_PASS` 或 `SOURCE_DB_PASSWORD` 或 `DB_PASS` 或 `DB_PASSWORD` - 資料庫密碼
- `SOURCE_DB_NAME` 或 `SOURCE_DB_DATABASE` - 來源資料庫名稱（預設: isin2）

**目標資料庫（PostgreSQL）配置**：
- `DB_HOST` - 資料庫主機（預設: localhost）
- `DB_PORT` - 資料庫端口（預設: 5432）
- `DB_USER` 或 `DB_USERNAME` - 資料庫用戶名（預設: postgres）
- `DB_PASS` 或 `DB_PASSWORD` - 資料庫密碼
- `DB_NAME` 或 `DB_DATABASE` - 目標資料庫名稱（預設: isin_db）

### 注意事項

1. **User 帳號建立**：
   - 腳本會為每個 staff.id 建立對應的 user 帳號
   - 如果 user 已存在（根據 userName = staff.id），會使用現有的 user id
   - 新建立的 user 預設密碼為 `isinisin`（建議首次登入後修改）
   - user 的 `isAdmin` 欄位預設為 0（非管理員）
2. **結構差異處理**：
   - 如果來源資料表有但目標資料表沒有的欄位，這些欄位會被忽略
   - 如果目標資料表有但來源資料表沒有的欄位，這些欄位會保持預設值或 NULL
3. **資料類型處理**：
   - 日期時間會自動轉換為 ISO 格式
   - JSON 欄位會自動序列化
   - 布林值會從 MySQL 的 0/1 轉換為 PostgreSQL 的 TRUE/FALSE
   - Buffer 類型（BLOB）會轉換為十六進位字串
4. **userId 欄位對應**：staff 的 `userId` 欄位會自動對應到建立的 user id
5. **錯誤處理**：如果建立 user 失敗，該 staff 的 userId 會設為 NULL

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

## 5. Access 報價單資料遷移腳本 (migrate-quote-from-access.ts)

這個腳本用於從 Microsoft Access 資料庫的 `gtable`、`itable`、`jtable` 資料表遷移報價單資料到 MySQL 資料庫的 `quote` 和 `quote_item` 資料表。

### 使用方法

```bash
npm run migrate-quote-from-access [access-file-path] [--only=quote|quote-item] [--skip=n]
```

範例：
```bash
# 使用預設路徑 (legacy/quote.mdb)，執行全部轉換
npm run migrate-quote-from-access

# 指定 Access 檔案路徑
npm run migrate-quote-from-access /path/to/quote.mdb

# 只執行報價單轉換 (convertGtableToQuote)
npm run migrate-quote-from-access /path/to/quote.mdb --only=quote

# 只執行報價單工件轉換 (convertItableJtableToQuoteItem)
npm run migrate-quote-from-access /path/to/quote.mdb --only=quote-item

# 跳過前 100 筆資料（僅適用於報價單）
npm run migrate-quote-from-access /path/to/quote.mdb --skip=100

# 結合參數使用：只執行報價單轉換並跳過前 100 筆
npm run migrate-quote-from-access /path/to/quote.mdb --only=quote --skip=100
```

或使用環境變數：

```bash
ACCESS_FILE_PATH=/path/to/quote.mdb SKIP_COUNT=100 npm run migrate-quote-from-access

# 只執行報價單轉換
ONLY_MODE=quote ACCESS_FILE_PATH=/path/to/quote.mdb npm run migrate-quote-from-access

# 只執行報價單工件轉換
ONLY_MODE=quote-item ACCESS_FILE_PATH=/path/to/quote.mdb npm run migrate-quote-from-access
```

### 功能說明

- **自動讀取 Access 資料表**：支援 .mdb 和 .accdb 格式，讀取 `gtable`、`itable`、`jtable` 三個資料表
- **Big5 編碼轉換**：自動將 Big5 編碼的中文字串轉換為 UTF-8
- **資料轉換**：
  - 民國年日期轉換為西元年（如 "100.01.03" → 2011-01-03）
  - 合併 itable 和 jtable 資料（透過 QNO + SN 一對一關聯）
  - 組合主鍵：QuoteItem 的 id 格式為 `{QNO}_{SN}`
- **選擇性執行**：使用 `--only` 參數可以選擇只執行特定轉換：
  - `--only=quote`：只執行報價單轉換（convertGtableToQuote）
  - `--only=quote-item`：只執行報價單工件轉換（convertItableJtableToQuoteItem）
  - 未指定：執行全部轉換
- **Skip 功能**：支援跳過前 n 筆資料，方便從中斷處繼續執行（僅適用於報價單轉換）
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

**執行模式**：
- 可以通過命令列參數提供：`--only=quote` 或 `--only=quote-item`
- 或通過環境變數：`ONLY_MODE=quote` 或 `ONLY_MODE=quote-item`
- 未指定時會執行全部轉換

**Skip 功能**：
- 可以通過命令列參數提供：`--skip=n`
- 或通過環境變數：`SKIP_COUNT=n`
- 僅適用於報價單轉換（`--only=quote` 或未指定 `--only` 時）

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
6. **選擇性執行**：
   - 使用 `--only=quote` 時，只會處理報價單（gtable），不會處理報價單工件
   - 使用 `--only=quote-item` 時，只會處理報價單工件（itable + jtable），不會處理報價單
   - 未指定 `--only` 時，會依序執行報價單和報價單工件的轉換
7. **Skip 功能**：使用 `--skip=n` 可以跳過前 n 筆資料，方便從中斷處繼續執行（僅適用於報價單轉換）
8. **進度顯示**：每處理 50 筆 Quote 或 100 筆 QuoteItem 會顯示進度
9. **資料表檢查**：腳本會根據執行模式自動檢查必要的資料表：
   - `--only=quote`：只需要 `gtable`
   - `--only=quote-item`：只需要 `itable` 和 `jtable`
   - 未指定：需要 `gtable`、`itable`、`jtable` 三個資料表


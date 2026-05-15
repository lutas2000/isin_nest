# acmaster.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/acmaster.mdb`（庫存另有 `isin/acmaster.mdb`，時間略早；遷移前請依業務約定採用哪一份） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- <path> --json`（結構）＋含樣本列以推斷語意；字串經腳本 Big5→UTF-8 轉換 |
| **資料表數** | 6（皆為一般表） |
| **整體角色** | 小型「主檔／系統設定」參考庫：公司資訊、產品大類、客戶分級、報表／畫面選項、以及疑似授權或編碼用的不透明欄位 |

---

## 1. 遷移摘要

- **無關聯式 FK 資訊**：本報告僅依檔內表與欄位＋樣本推斷；Access 內若有隱藏關聯，需以 Access 或額外文件確認。
- **字元編碼**：專案腳本假設中文欄位可能為 Big5；目標庫建議 **UTF-8（PostgreSQL `text` / `varchar`）**。
- **敏感／不可解資料**：`ma90` 與 `sysinfo` 部分列內容呈現為雜湊狀字串，遷移時建議 **原樣保存** 或標記為 `legacy_opaque`，勿強行拆解除非有原始程式規格。
- **單例設定表**：`Optiona` 僅 1 列，適合遷成 **key-value JSON 一列** 或 **扁平化單一 `app_settings` 列**。
- **序號型設定**：`sysinfo` 以 `f2` 數字序區分「第幾筆設定列」，遷移可改為 **具名欄位** 或 **(`setting_key`, `value`)** 取代 magic number。

---

## 2. 資料表總覽

| 表名 | 列數 | 用途（推斷） |
| --- | ---: | --- |
| `CKind` | 2 | 客戶／帳款 ABC 分級（大額／小額常客） |
| `kind` | 3 | 產品或料號大類（kno + 中文名稱） |
| `ma90` | 4 | 不明編碼或授權相關區塊（8 個等寬文字欄） |
| `Optiona` | 1 | 報表／畫面／小數位數／字型／稅籍等 **系統選項** |
| `sysctrl` | 0 | 可能為 **使用者鎖定／連線控制**（僅 `userid`），目前無資料 |
| `sysinfo` | 11 | **公司／聯絡／統編** 等主檔資訊＋序號；末段含編碼字串與站所代碼 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `CKind`（2 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `abcno` | text | 4 | Y | `char(1)` 或 `varchar(4)` | ABC 分級代碼（樣本：`A`、`B`） |
| `abcname` | text | 20 | Y | `varchar(20)` | 分級中文名稱（樣本：大額常客、小額常客） |
| `date_r` | text | 10 | Y | `varchar(10)` 或解析為 `date` | 建檔或生效日；樣本為 **民國年** 格式空白＋`89.08.28` 類型 |

---

### 3.2 `kind`（3 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `kno` | text | 2 | Y | `char(1)` 或 `varchar(2)` | 大類代碼（樣本：`A`、`B`、`C`） |
| `kname` | text | 20 | Y | `varchar(20)` | 大類名稱（樣本：電腦系統、電腦周邊設備、組件） |

**遷移備註**：可對應 ERP 的 `product_category` 或 `item_kind` 類主檔；實際與訂單／料號關聯需對照其他 .mdb（如 `cust`、`quote`）。

---

### 3.3 `ma90`（4 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `f1` … `f8` | text | 各 12 | Y | `varchar(12)` ×8 或 **單一 JSON 陣列** | 樣本為可列印 ASCII 之 **亂碼狀固定格式字串**（含 `\"!@0(\"` 等尾段），可能為 **序號、加密欄位、舊版 DLL 寫入之 binary 偽裝字串**；無明文語意前請 **整段保存** |

---

### 3.4 `Optiona`（1 列）— 系統／報表選項

整表為 **單列設定**，欄位多為整數旗標（Access `integer` size 2，實務上多為 0/1/-1 布林或三態）。

| 欄位 | Access 型別 | NULL | 遷移建議 | 可能意義 |
| --- | --- | --- | --- | --- |
| `MaxItem` | integer | Y | `smallint` | 單頁或單表最大筆數／項目數（樣本：10） |
| `PageItem` | integer | Y | `smallint` | 每頁筆數（樣本：10） |
| `GainBase` | integer | Y | `smallint` | 毛利計算基準相關旗標 |
| `ShowGain` | integer | Y | `smallint` | 是否顯示毛利 |
| `MyPageSize` | integer | Y | `smallint` | 紙張／列印分頁大小代碼（樣本：2） |
| `DrawLine` | integer | Y | `smallint` | 是否畫格線 |
| `ShowPDec` | integer | Y | `smallint` | 單價（P）小數位數 |
| `ShowQDec` | integer | Y | `smallint` | 數量（Q）小數位數 |
| `ShowMDec` | integer | Y | `smallint` | 金額（M）小數位數 |
| `ShowADec` | integer | Y | `smallint` | 可能為平均或其他 A 欄位小數位數 |
| `DiscUnder4` | integer | Y | `smallint` | 折扣顯示規則（與「4」相關之舊規則） |
| `ShowPFont` | text(20) | Y | `varchar(20)` | 單價欄字型（樣本：細明體） |
| `ShowEnvFont1` | text(20) | Y | `varchar(20)` | 表頭／環境字型 1（樣本：標楷體） |
| `ShowEnvFont2` | text(20) | Y | `varchar(20)` | 表頭／環境字型 2 |
| `Motion` | text(255) | Y | `varchar(255)` | 動畫或 UI 動效旗標字串（樣本：`"-1"`） |
| `MidTitle` | text(255) | Y | `varchar(255)` | 中間標題列設定 |
| `AskTaxID` | integer | Y | `smallint` | 是否提示輸入統一編號 |
| `QtyCheck` | integer | Y | `smallint` | 數量檢核開關 |
| `UptoNext` | integer | Y | `smallint` | 欄位跳格／帶入下一筆相關 |
| `SimpleOne` | integer | Y | `smallint` | 簡化輸入模式一 |
| `Taiwan` | integer | Y | `smallint` | 台灣稅制／本國客戶相關旗標 |
| `FiscYear` | text(4) | Y | `varchar(4)` | 會計或報表 **會計年度**（樣本：`  97`） |
| `UptoNextAC` | text(255) | Y | `varchar(255)` | 與 `UptoNext` 搭配之字串參數 |
| `Daniel` | text(255) | Y | `varchar(255)` | 不明命名之預留或客製參數（樣本：`"0"`） |
| `AskDateType` | integer | Y | `smallint` | 日期輸入型態（民國／西元等） |
| `SimpleTwo` | integer | Y | `smallint` | 簡化輸入模式二 |
| `Separator` | text(1) | Y | `char(1)` | 數字分節或小數點符號（樣本：`.`） |
| `SimpleAC` | text(255) | Y | `varchar(255)` | 簡化帳務相關字串參數 |
| `EnvTitle` | text(255) | Y | `varchar(255)` | 環境／表頭標題文字 |
| `cashout` | text(10) | Y | `varchar(10)` | 現金支出或結帳相關開關／代碼（樣本：`"1"`） |

---

### 3.5 `sysctrl`（0 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `userid` | text | 10 | Y | `varchar(10)` | 登入使用者 ID；表為空時可能未啟用或已改用他處 |

---

### 3.6 `sysinfo`（11 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `f1` | text | 60 | Y | `varchar(60)` 或 `text` | **設定值本體**（見下表 `f2` 序號對照） |
| `f2` | text | 2 | Y | 遷移時改為 **enum / key**，勿依賴空白＋數字字串 | **列序號**（樣本：` 1`～`11`） |

**依樣本推斷之 `f2` → 語意（請與現場使用者確認）**

| f2（序號） | f1 樣本（摘要） | 推斷 |
| ---: | --- | --- |
| 1 | 奕新雷射精機股份有限公司 | 公司全名 |
| 2 | 04-22130117 | 電話一 |
| 3 | （空） | 預留或已停用欄位 |
| 4 | 04-22130113 | 傳真或電話二 |
| 5 | 台中市東區東光園路310號 | 地址 |
| 6 | 林慶豐 | 負責人或聯絡人 |
| 7 | 23698606 | 統一編號 |
| 8 | 5 | 不明短碼（版本、分店數、稅率代碼等，需對照程式） |
| 9 | `P<=6:551QA?"` 類 | **不透明／編碼字串**（與 `ma90` 同風格） |
| 10 | `@(I:=476RD>"` 類 | 同上 |
| 11 | A01 | 站所、分公司或系統代碼 |

---

## 4. 樣本資料（供遷移驗證）

下列為分析當下自檔案讀出之代表列（UTF-8 後）；正式遷移請以 **checksum 或 row hash** 對照來源。

- **CKind**：`A`／大額常客；`B`／小額常客。
- **kind**：`A` 電腦系統、`B` 電腦周邊設備、`C` 組件。
- **Optiona**：單列；`FiscYear` 為 `  97`；多數整數為 0、1 或 -1；字型為細明體／標楷體。
- **sysinfo**：共 11 列，如上 `f2` 對照。

---

## 5. 建議之目標綱要（僅供參考，非強制）

若遷移至 PostgreSQL，可採：

1. **`legacy_acmaster_ckind`**、`legacy_acmaster_kind`**：維持欄位名或改名並加 `source_mdb`。
2. **`legacy_acmaster_ma90`**：八欄保留，或 `payload jsonb`。
3. **`app_options_acmaster`**：由 `Optiona` 單列 flatten 或單一 `jsonb`。
4. **`company_profile`**：由 `sysinfo`  pivot 成具名欄位；編碼欄位獨立 `legacy_blob_9`、`legacy_blob_10`。
5. **`session_lock` 或省略**：`sysctrl` 若仍無資料可延後遷移。

---

## 6. 重跑分析指令

```bash
# 僅結構＋列數
npm run analyze-access -- /nas/isin/acmaster.mdb --json --no-samples

# 含樣本（預設 5 列，可調）
npm run analyze-access -- /nas/isin/acmaster.mdb --json --sample-limit=20
```

---

*本報告由 repository skill `analyze-access-database` 流程產出。*

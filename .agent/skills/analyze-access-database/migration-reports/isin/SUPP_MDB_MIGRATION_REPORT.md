# supp.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/supp.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`supp.mdb`；歷史盤點檔名對應 `isin/supp.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/supp.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 1（normalTables，與腳本一致） |
| **整體角色** | 客戶／群組／供應商主檔或彙總 |

---

## 1. 遷移摘要

- **無關聯式 FK 資訊**：本報告依 `mdb-reader` 結構與樣本推斷；Access 內隱藏關聯需另查。
- **字元編碼**：中文欄位可能為 Big5；目標庫建議 **UTF-8（PostgreSQL `text` / `varchar`）**。
- **跨檔關聯**：實際關聯多未建 FK，請併同 [`ISIN_LEGACY_ACCESS_MASTER_MIGRATION_REPORT.md`](ISIN_LEGACY_ACCESS_MASTER_MIGRATION_REPORT.md) 之邊清單。
- **隱私**：報告離庫時請遮罩公司名、統編、電話等；敏感欄位建議 `legacy_opaque` 原樣保存。

---

## 2. 資料表總覽

| 表名 | 列數 | 用途（推斷） |
| --- | ---: | --- |
| `cust` | 248 | 客戶主檔或衍生 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `cust`（248 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `code` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `cutname` | text | 10 | Y | varchar(10) | 名稱 |
| `name` | text | 40 | Y | varchar(40) | 名稱 |
| `master` | text | 8 | Y | varchar(8) | 不明（建議對照舊程式與業務） |
| `tel1` | text | 20 | Y | varchar(20) | 電話／傳真 |
| `tel2` | text | 20 | Y | varchar(20) | 電話／傳真 |
| `fax` | text | 20 | Y | varchar(20) | 電話／傳真 |
| `zipno` | text | 5 | Y | varchar(5) | 郵遞區號 |
| `addr` | text | 60 | Y | varchar(60) | 地址 |
| `inaddr` | text | 60 | Y | varchar(60) | 地址 |
| `coco` | text | 8 | Y | varchar(8) | 數字代碼（可能為外鍵或序號） |
| `subname` | text | 40 | Y | varchar(40) | 名稱 |
| `coco2` | text | 8 | Y | varchar(8) | 無樣本列，需對照程式 |
| `agent1` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `agent2` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `agent3` | text | 50 | Y | varchar(50) | 無樣本列，需對照程式 |
| `bank` | text | 20 | Y | varchar(20) | 無樣本列，需對照程式 |
| `account` | text | 20 | Y | varchar(20) | 無樣本列，需對照程式 |
| `credit` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `debt` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `deal_f` | text | 12 | Y | varchar(12) | 無樣本列，需對照程式 |
| `deal_l` | text | 12 | Y | varchar(12) | 無樣本列，需對照程式 |
| `dxfpath` | text | 50 | Y | varchar(50) | 無樣本列，需對照程式 |
| `email` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `prod` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `remark` | text | 50 | Y | varchar(50) | 備註 |
| `xx` | text | 2 | Y | varchar(2) | 無樣本列，需對照程式 |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`cust`**：
  - 列 0: code=12B; cutname=貝頓企業; name=貝頓企業; master= ; tel1=04-22779232; tel2= ; fax= ; zipno= 
  - 列 1: code=12J; cutname=寶得旺; name=寶得旺資訊有限公司; master=軟體設計; tel1=04-8926428; tel2= ; fax=04-8929687; zipno=523
  - 列 2: code=1CA; cutname=花藍; name=寶華坊; master=林士平; tel1=04-22134336; tel2= ; fax=04-22124083; zipno= 
  - 列 3: code=1MA; cutname=伯元; name=伯元精密工業股份有限公司; master= ; tel1=04-22789142; tel2=04-22764332; fax=04-22789145; zipno=411
  - 列 4: code=1TA; cutname=百成來寶; name=台灣百成萊寶股份有限公司; master=鼓風機; tel1=03-5829477; tel2= ; fax= ; zipno=310

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/supp.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/supp.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

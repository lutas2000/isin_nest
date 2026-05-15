# dcst.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/dcst.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`dcst.mdb`；歷史盤點檔名對應 `isin/dcst.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/dcst.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
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
| `dcst` | 314294 | 客戶主檔或衍生 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `dcst`（314294 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `DWG_NO` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `DWG_NAME` | text | 30 | Y | varchar(30) | 名稱 |
| `DWG_REF` | text | 40 | Y | varchar(40) | 不明（建議對照舊程式與業務） |
| `CUST_NO` | text | 10 | Y | varchar(10) | 客戶／公司代碼 |
| `CUST` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `METAL` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `THICK` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `UNIT` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `PR_REF` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `PR_REF1` | currency | 8 | Y | numeric(18,4) | 未具名欄位（需對照程式） |
| `PR_REF2` | currency | 8 | Y | numeric(18,4) | 未具名欄位（需對照程式） |
| `PR_REF3` | currency | 8 | Y | numeric(18,4) | 未具名欄位（需對照程式） |
| `PR_REF4` | currency | 8 | Y | numeric(18,4) | 未具名欄位（需對照程式） |
| `PR_REF5` | currency | 8 | Y | numeric(18,4) | 未具名欄位（需對照程式） |
| `ACTOR_NO` | text | 6 | Y | varchar(6) | 業務／經辦人員 |
| `ACTOR` | text | 8 | Y | varchar(8) | 業務／經辦人員 |
| `DWG_DATE` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |
| `DISK` | text | 50 | Y | varchar(50) | 無樣本列，需對照程式 |
| `CNC1` | text | 30 | Y | varchar(30) | 無樣本列，需對照程式 |
| `CNC2` | text | 30 | Y | varchar(30) | 無樣本列，需對照程式 |
| `CNC3` | text | 12 | Y | varchar(12) | 民國年日期文字 |
| `CNC4` | text | 12 | Y | varchar(12) | 無樣本列，需對照程式 |
| `CNC5` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `REMARK` | text | 50 | Y | varchar(50) | 備註 |
| `XX` | text | 1 | Y | varchar(1) | 無樣本列，需對照程式 |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`dcst`**：
  - 列 0: DWG_NO=.; DWG_NAME= ; DWG_REF= ; CUST_NO=VBU; CUST=新益; METAL= ; THICK= ; UNIT=片
  - 列 1: DWG_NO=00011201; DWG_NAME= ; DWG_REF=COL100S-020-01-1(2); CUST_NO=RCE; CUST=進益太平; METAL=SUS304 BA; THICK=1; UNIT=只
  - 列 2: DWG_NO=00012001; DWG_NAME= ; DWG_REF=圓管焊接; CUST_NO=UXD; CUST=佑龍; METAL=SS41圓管; THICK=4; UNIT=只
  - 列 3: DWG_NO=00012601; DWG_NAME= ; DWG_REF=2260*440; CUST_NO=REB; CUST=金三功; METAL=SS41; THICK=2; UNIT=片
  - 列 4: DWG_NO=00012801; DWG_NAME= ; DWG_REF=門鈕焊接; CUST_NO=UXD; CUST=佑龍; METAL=SS41; THICK=3; UNIT=只

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/dcst.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/dcst.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

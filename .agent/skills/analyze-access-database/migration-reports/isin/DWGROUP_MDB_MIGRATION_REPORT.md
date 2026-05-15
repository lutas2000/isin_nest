# dwgroup.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/dwgroup.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`dwgroup.mdb`；歷史盤點檔名對應 `isin/dwgroup.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/dwgroup.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 2（normalTables，與腳本一致） |
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
| `gtable` | 23837 | 訂單／出貨／交易明細 |
| `itable` | 74998 | 訂單／出貨／交易明細 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `gtable`（23837 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `DSETS` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `DATE_R` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |
| `FACTOR_NO` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `FACTOR` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `DWG_REF` | text | 40 | Y | varchar(40) | 無樣本列，需對照程式 |
| `NOTES` | text | 20 | Y | varchar(20) | 備註 |
| `XX` | text | 1 | Y | varchar(1) | 無樣本列，需對照程式 |

### 3.2 `itable`（74998 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `FACTOR_NO` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `DSETS` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `SN` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `DWG_NO` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `DWG_REF` | text | 40 | Y | varchar(40) | 不明（建議對照舊程式與業務） |
| `METAL` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `THICK` | text | 6 | Y | varchar(6) | 不明（建議對照舊程式與業務） |
| `QTY` | currency | 8 | Y | numeric(18,4) | 數量 |
| `FLAG` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`gtable`**：
  - 列 0: DSETS=01AJ302B; DATE_R=  92.03.15; FACTOR_NO=01A; FACTOR=安邦; DWG_REF= ; NOTES= ; XX= 
  - 列 1: DSETS=0900Z001; DATE_R=  87.03.09; FACTOR_NO=JUA; FACTOR=委豔; DWG_REF= ; NOTES= ; XX= 
  - 列 2: DSETS=0SAW3001B; DATE_R= ; FACTOR_NO=0SA; FACTOR=安南; DWG_REF= ; NOTES= ; XX=
  - 列 3: DSETS=0SAW3002B; DATE_R= ; FACTOR_NO=0SA; FACTOR=安南; DWG_REF= ; NOTES= ; XX=
  - 列 4: DSETS=0ZAN301B; DATE_R= ; FACTOR_NO=0ZA; FACTOR=台灣安防; DWG_REF= ; NOTES= ; XX=
- **`itable`**：
  - 列 0: FACTOR_NO=01A; DSETS=01AJ302B; SN= 1; DWG_NO=01AJ3021; DWG_REF= ; METAL=SUS304; THICK=1.2; QTY=1.0000
  - 列 1: FACTOR_NO=01A; DSETS=01AJ302B; SN= 2; DWG_NO=01AJ3022; DWG_REF= ; METAL=SUS304; THICK=1.2; QTY=8.0000
  - 列 2: FACTOR_NO=JUA; DSETS=0900Z001; SN= 1; DWG_NO=JUAD303; DWG_REF= ; METAL=SS41; THICK=9; QTY=1.0000
  - 列 3: FACTOR_NO=JUA; DSETS=0900Z001; SN= 2; DWG_NO=JUAD304; DWG_REF= ; METAL=SS41; THICK=4; QTY=2.0000
  - 列 4: FACTOR_NO=JUA; DSETS=0900Z001; SN= 3; DWG_NO=JUAD305; DWG_REF= ; METAL=SS41; THICK=4; QTY=2.0000

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/dwgroup.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/dwgroup.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

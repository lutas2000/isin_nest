# sold.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/sold.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`sold.mdb`；歷史盤點檔名對應 `isin/sold.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/sold.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 3（normalTables，與腳本一致） |
| **整體角色** | 交易／報價／工單類業務資料庫 |

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
| `gtable` | 129063 | 報價／明細 |
| `itable` | 398453 | 報價／明細 |
| `jtable` | 0 | 報價／明細 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `gtable`（129063 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `QNO` | text | 10 | Y | varchar(10) | 報價／訂單單號類鍵 |
| `DATE_R` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |
| `DATE_E` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |
| `FACTOR_NO` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `FACTOR` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `ACTOR_NO` | text | 10 | Y | varchar(10) | 業務／經辦人員 |
| `ACTOR` | text | 10 | Y | varchar(10) | 業務／經辦人員 |
| `RESERV` | text | 10 | Y | varchar(10) | 數字代碼（可能為外鍵或序號） |
| `PCON` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `QCON` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `NOTES` | text | 50 | Y | varchar(50) | 備註 |
| `SENDTO` | text | 60 | Y | varchar(60) | 不明（建議對照舊程式與業務） |
| `AMMOUNT` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `TAX` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `DISC` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `TWOT` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `REMAINDER` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `PAID` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `AIR` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `TAXID` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `XX` | text | 2 | Y | varchar(2) | 無樣本列，需對照程式 |
| `invoice` | text | 10 | Y | varchar(10) | 無樣本列，需對照程式 |

### 3.2 `itable`（398453 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `DATE_R` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |
| `FACTOR_NO` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `FACTOR` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `QNO` | text | 10 | Y | varchar(10) | 報價／訂單單號類鍵 |
| `SN` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `DWG_NO` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `DWG_REF` | text | 40 | Y | varchar(40) | 不明（建議對照舊程式與業務） |
| `METAL` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `THICK` | text | 6 | Y | varchar(6) | 不明（建議對照舊程式與業務） |
| `BUY` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `QTY` | currency | 8 | Y | numeric(18,4) | 數量 |
| `UNIT` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `PRICE` | currency | 8 | Y | numeric(18,4) | 金額／單價 |
| `TOTAL` | currency | 8 | Y | numeric(18,4) | 金額／單價 |
| `RESERV` | text | 10 | Y | varchar(10) | 數字代碼（可能為外鍵或序號） |
| `XX` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |

### 3.3 `jtable`（0 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `DATE_R` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |
| `FACTOR_NO` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `FACTOR` | text | 10 | Y | varchar(10) | 廠商／供應商代碼或名稱 |
| `QNO` | text | 10 | Y | varchar(10) | 報價／訂單單號類鍵 |
| `SN` | text | 2 | Y | varchar(2) | 無樣本列，需對照程式 |
| `DWG_NO` | text | 10 | Y | varchar(10) | 無樣本列，需對照程式 |
| `DWG_REF` | text | 40 | Y | varchar(40) | 無樣本列，需對照程式 |
| `METAL` | text | 10 | Y | varchar(10) | 無樣本列，需對照程式 |
| `THICK` | text | 6 | Y | varchar(6) | 無樣本列，需對照程式 |
| `BUY` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `QTY` | currency | 8 | Y | numeric(18,4) | 數量 |
| `UNIT` | text | 2 | Y | varchar(2) | 無樣本列，需對照程式 |
| `PRICE` | currency | 8 | Y | numeric(18,4) | 金額／單價 |
| `TOTAL` | currency | 8 | Y | numeric(18,4) | 金額／單價 |
| `RESERV` | text | 10 | Y | varchar(10) | 無樣本列，需對照程式 |
| `XX` | text | 2 | Y | varchar(2) | 無樣本列，需對照程式 |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`gtable`**：
  - 列 0: QNO=00010301; DATE_R= 100.01.03; DATE_E=; FACTOR_NO=REB; FACTOR=金三功; ACTOR_NO=A02; ACTOR=楊明家; RESERV=99122732
  - 列 1: QNO=00010302; DATE_R= 100.01.03; DATE_E=; FACTOR_NO=JAC; FACTOR=穩茂; ACTOR_NO=A02; ACTOR=楊明家; RESERV=99122710
  - 列 2: QNO=00010303; DATE_R= 100.01.03; DATE_E=; FACTOR_NO=DQ1; FACTOR=康蒲環保; ACTOR_NO=A02; ACTOR=楊明家; RESERV=99122430
  - 列 3: QNO=00010304; DATE_R= 100.01.03; DATE_E=; FACTOR_NO=MBG; FACTOR=源大一; ACTOR_NO=A15; ACTOR=蔡雅婷; RESERV=99122428
  - 列 4: QNO=00010305; DATE_R= 100.01.03; DATE_E=; FACTOR_NO=2XA; FACTOR=鼎立; ACTOR_NO=A15; ACTOR=蔡雅婷; RESERV=99122911
- **`itable`**：
  - 列 0: DATE_R= 100.01.03; FACTOR_NO=REB; FACTOR=金三功; QNO=00010301; SN= 1; DWG_NO=REBQCD4; DWG_REF=Θ304輪葉底板(8葉); METAL=SS41
  - 列 1: DATE_R= 100.01.03; FACTOR_NO=REB; FACTOR=金三功; QNO=00010301; SN= 2; DWG_NO=REBQCD5; DWG_REF=葉片; METAL=SS41
  - 列 2: DATE_R= 100.01.03; FACTOR_NO=REB; FACTOR=金三功; QNO=00010301; SN= 3; DWG_NO=REBQCD6; DWG_REF=Θ304輪葉底板(10葉); METAL=SS41
  - 列 3: DATE_R= 100.01.03; FACTOR_NO=REB; FACTOR=金三功; QNO=00010301; SN= 4; DWG_NO=REBQCD7; DWG_REF=葉片; METAL=SS41
  - 列 4: DATE_R= 100.01.03; FACTOR_NO=REB; FACTOR=金三功; QNO=00010301; SN= 5; DWG_NO=REBQCD8; DWG_REF=Θ304輪葉出口(10葉); METAL=SS41
- **`jtable`**：
  - （無樣本列或表為空）

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/sold.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/sold.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

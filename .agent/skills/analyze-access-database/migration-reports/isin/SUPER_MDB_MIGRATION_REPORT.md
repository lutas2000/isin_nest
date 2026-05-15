# super.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/super.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`super.mdb`；歷史盤點檔名對應 `isin/super.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/super.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 3（normalTables，與腳本一致） |
| **整體角色** | 稽核、登入、人員或站所設定 |

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
| `itable` | 7 | 訂單／出貨／交易明細 |
| `jtable` | 60 | 報價／明細 |
| `Âà´«¿ù»~` | 1 | 單列設定 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `itable`（7 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `graph` | text | 20 | Y | varchar(20) | 不明（建議對照舊程式與業務） |
| `sn` | long | 4 | Y | integer | 不明（建議對照舊程式與業務） |

### 3.2 `jtable`（60 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `graph` | text | 20 | Y | varchar(20) | 不明（建議對照舊程式與業務） |
| `sn` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `item` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `kind` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `data` | text | 20 | Y | varchar(20) | 不明（建議對照舊程式與業務） |

### 3.3 `Âà´«¿ù»~`（1 列）

| 欄位 | Access 型別 | NULL | 遷移建議 | 可能意義 |
| --- | --- | --- | --- | --- |
| `物件類型` | text | Y | varchar(255) | 無樣本列，需對照程式 |
| `物件名稱` | text | Y | varchar(255) | 無樣本列，需對照程式 |
| `錯誤描述` | memo | Y | text | 無樣本列，需對照程式 |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`itable`**：
  - 列 0: graph=SECTION; sn=1
  - 列 1: graph=POINT; sn=1
  - 列 2: graph=POLYLINE; sn=1
  - 列 3: graph=SEQEND; sn=1
  - 列 4: graph=CIRCLE; sn=2
- **`jtable`**：
  - 列 0: graph=POLYLINE; sn=   1; item=   1; kind= 66; data=1
  - 列 1: graph=POLYLINE; sn=   1; item=   2; kind= 10; data=0.0
  - 列 2: graph=POLYLINE; sn=   1; item=   3; kind= 20; data=0.0
  - 列 3: graph=POLYLINE; sn=   1; item=   4; kind= 30; data=0.0
  - 列 4: graph=POLYLINE; sn=   1; item=   5; kind= 70; data=1
- **`Âà´«¿ù»~`**：
  - 列 0: ª«¥óÃþ«¬=資料庫; ª«¥ó¦WºÙ=; ¿ù»~´y­z=與檔案 'dao2535.tlb' 的 VBE 參照遺失或損壞。

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/super.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/super.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

# Should.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/isin/Should.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`isin/Should.mdb`；歷史盤點檔名對應 `isin/Should.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/isin/Should.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 1（normalTables，與腳本一致） |
| **整體角色** | Legacy 支援資料庫 |

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
| `itable` | 147 | 訂單／出貨／交易明細 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `itable`（147 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `fno` | text | 6 | Y | varchar(6) | 不明（建議對照舊程式與業務） |
| `fname` | text | 10 | Y | varchar(10) | 名稱 |
| `pre` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `this` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`itable`**：
  - 列 0: fno=A003; fname=大大圖書; pre= ; this= 34753
  - 列 1: fno=A004; fname=一泰電腦; pre=   569; this= 
  - 列 2: fno=A006; fname=新緯文化; pre=  8118; this= 
  - 列 3: fno=A007; fname=宥雷有限; pre=  1935; this=  -466
  - 列 4: fno=A010; fname=上課族書; pre= 20482; this=  8945

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/isin/Should.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/isin/Should.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

# bank.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/bank.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`bank.mdb`；歷史盤點檔名對應 `isin/bank.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/bank.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 1（normalTables，與腳本一致） |
| **整體角色** | 參考主檔、字典或系統選項 |

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
| `BANK` | 1 | 銀行／帳戶字典 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `BANK`（1 列）

整表近似 **單列設定** 或寬表，遷移可改為 JSON 或 key-value。

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `BKNO` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `BKNK` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `BKNAME` | text | 30 | Y | varchar(30) | 名稱 |
| `CONTACT` | text | 20 | Y | varchar(20) | 無樣本列，需對照程式 |
| `TEL1` | text | 20 | Y | varchar(20) | 電話／傳真 |
| `TEL2` | text | 20 | Y | varchar(20) | 電話／傳真 |
| `ADDRESS` | text | 60 | Y | varchar(60) | 地址 |
| `BONO` | text | 30 | Y | varchar(30) | 無樣本列，需對照程式 |
| `BONAME` | text | 20 | Y | varchar(20) | 名稱 |
| `ACNO` | text | 8 | Y | varchar(8) | 無樣本列，需對照程式 |
| `ACNAME` | text | 30 | Y | varchar(30) | 名稱 |
| `Debt` | currency | 8 | Y | numeric(18,4) | 不明（建議對照舊程式與業務） |
| `REMARK` | text | 40 | Y | varchar(40) | 備註 |
| `xposy` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xposm` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xposd` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xpost` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xposc` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xposn` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xposp` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yposy` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yposm` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yposd` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `ypost` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yposc` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yposn` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yposp` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xissue1` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `xac1` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xex1` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xamt1` | text | 4 | Y | varchar(4) | 金額／單價 |
| `yissue1` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `yac1` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yex1` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `yamt1` | text | 4 | Y | varchar(4) | 金額／單價 |
| `xissue2` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `xac2` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `xex2` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `xamt2` | text | 4 | Y | varchar(4) | 金額／單價 |
| `yissue2` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `yac2` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `yex2` | text | 4 | Y | varchar(4) | 無樣本列，需對照程式 |
| `yamt2` | text | 4 | Y | varchar(4) | 金額／單價 |
| `offx` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `offy` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `xbkno` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `ybkno` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `datexx` | text | 10 | Y | varchar(10) | 日期（可能為民國年文字） |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`BANK`**：
  - 列 0: BKNO=S; BKNK=上海商銀; BKNAME=上海商業銀行 員林分行; CONTACT= ; TEL1= ; TEL2= ; ADDRESS=彰化縣員林鎮中山路二段360號; BONO= 

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/bank.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/bank.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

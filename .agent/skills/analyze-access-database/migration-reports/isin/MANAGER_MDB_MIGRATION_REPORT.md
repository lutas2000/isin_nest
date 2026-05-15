# manager.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/manager.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`manager.mdb`；歷史盤點檔名對應 `isin/manager.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/manager.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 2（normalTables，與腳本一致） |
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
| `descript` | 9 | 業務資料（需對照程式） |
| `serial` | 1 | 單列設定 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `descript`（9 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `used` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `abbr` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `name` | text | 10 | Y | varchar(10) | 名稱 |
| `no1` | text | 1 | Y | varchar(1) | 無樣本列，需對照程式 |
| `auto` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pk1` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pk2` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pk3` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pm1` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pm2` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pm3` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pm4` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pm5` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pm6` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pd1` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pd2` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pd3` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `pd4` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `pd5` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |
| `xx` | text | 2 | Y | varchar(2) | 無樣本列，需對照程式 |

### 3.2 `serial`（1 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `sn` | long | 4 | Y | integer | 不明（建議對照舊程式與業務） |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`descript`**：
  - 列 0: used=0; abbr=AB; name=入庫單; no1= ; auto=1; pk1=1; pk2=1; pk3=1
  - 列 1: used=1; abbr=AC; name=領出單; no1= ; auto=1; pk1=1; pk2=1; pk3=2
  - 列 2: used=3; abbr=MI; name=進貨單; no1= ; auto=1; pk1=0; pk2=2; pk3=2
  - 列 3: used=4; abbr=MJ; name=進貨退出單; no1= ; auto=1; pk1=0; pk2=2; pk3=2
  - 列 4: used=5; abbr=PK; name=付款憑單; no1= ; auto=1; pk1= ; pk2= ; pk3=2
- **`serial`**：
  - 列 0: sn=0

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/manager.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/manager.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

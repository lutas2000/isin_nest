# personel.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/isin/personel.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`isin/personel.mdb`；歷史盤點檔名對應 `isin/personel.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/isin/personel.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 1（normalTables，與腳本一致） |
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
| `staff` | 54 | 業務資料（需對照程式） |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `staff`（54 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `plno` | text | 10 | Y | varchar(10) | 數字代碼（可能為外鍵或序號） |
| `name` | text | 10 | Y | varchar(10) | 名稱 |
| `id` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `birth` | text | 10 | Y | varchar(10) | 民國年日期文字 |
| `tel` | text | 20 | Y | varchar(20) | 電話／傳真 |
| `addr` | text | 60 | Y | varchar(60) | 地址 |
| `title` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `come` | text | 12 | Y | varchar(12) | 民國年日期文字 |
| `quit` | text | 10 | Y | varchar(10) | 民國年日期文字 |
| `remark` | text | 50 | Y | varchar(50) | 備註 |
| `xx` | text | 2 | Y | varchar(2) | 不明（建議對照舊程式與業務） |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`staff`**：
  - 列 0: plno=001; name=林慶豐; id=L102707182; birth=  42.06.01; tel=22131402; addr=台中市樂業路386號; title=總經理; come=  79.03.01
  - 列 1: plno=002; name=總; id= ; birth= ; tel= ; addr= ; title= ; come= 
  - 列 2: plno=A01; name=周春長; id=M120251451; birth=  56.05.15; tel= ; addr=育仁路95號6F  鞋:25.5號; title=廠長; come=  80.11.04
  - 列 3: plno=A02; name=楊明家; id=Q122180752; birth=  58.06.03; tel=04-22799525; addr=台中縣太平市太平路46巷62弄1號  24號; title=業務經理; come=  82.02.17
  - 列 4: plno=A05; name=王義貴; id=L121899418; birth=  56.11.11; tel=0987903934; addr=台中縣太平市路號; title=司機; come= 

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/isin/personel.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/isin/personel.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

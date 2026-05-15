# master.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | `/nas/isin/master.mdb`（庫存「同名檔主檔判定」主檔相對路徑：`master.mdb`；歷史盤點檔名對應 `isin/master.mdb`） |
| **盤點時間 (UTC)** | 2026-05-15 |
| **分析方式** | `npm run analyze-access -- "/nas/isin/master.mdb" --json --no-samples`；含樣本：`--json --sample-offset=0 --sample-limit=15`；字串經腳本 Big5→UTF-8 轉換。 |
| **資料表數** | 6（normalTables，與腳本一致） |
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
| `CKind` | 6 | 主檔／系統參考 |
| `kind` | 348 | 主檔／系統參考 |
| `ma90` | 19 | 業務資料（需對照程式） |
| `Optiona` | 1 | 報價／明細 |
| `sysctrl` | 5 | 主檔／系統參考 |
| `sysinfo` | 11 | 主檔／系統參考 |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `CKind`（6 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `abcno` | text | 4 | Y | varchar(4) | 不明（建議對照舊程式與業務） |
| `abcname` | text | 20 | Y | varchar(20) | 名稱 |

### 3.2 `kind`（348 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `kno` | text | 20 | Y | varchar(20) | 大類／種類代碼 |
| `metal` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `thick` | text | 6 | Y | varchar(6) | 不明（建議對照舊程式與業務） |
| `remark` | text | 20 | Y | varchar(20) | 備註 |
| `soul` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |

### 3.3 `ma90`（19 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `f1` … `f8` | text | 12 | Y | varchar(12) | 多個同型未命名欄；可能為授權、緩衝或批次欄位（需對照程式） |

### 3.4 `Optiona`（1 列）

整表近似 **單列設定** 或寬表，遷移可改為 JSON 或 key-value。

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `MaxItem` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `PageItem` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `GainBase` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `ShowGain` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `MyPageSize` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `DrawLine` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `ShowPDec` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `ShowQDec` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `ShowMDec` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `ShowADec` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `DiscUnder4` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `ShowPFont` | text | 30 | Y | varchar(30) | 不明（建議對照舊程式與業務） |
| `ShowEnvFont1` | text | 30 | Y | varchar(30) | 不明（建議對照舊程式與業務） |
| `ShowEnvFont2` | text | 30 | Y | varchar(30) | 不明（建議對照舊程式與業務） |
| `Cncpath` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `Midtitle` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |
| `AskTaxID` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `QtyCheck` | integer | 2 | Y | smallint | 數量 |
| `UptoNext` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `SimpleOne` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `Taiwan` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `FiscYear` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `UptoNextAC` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `Daniel` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `AskDateType` | integer | 2 | Y | smallint | 日期（可能為民國年文字） |
| `SimpleTwo` | integer | 2 | Y | smallint | 不明（建議對照舊程式與業務） |
| `Separator` | text | 1 | Y | varchar(1) | 不明（建議對照舊程式與業務） |
| `Dxfpath` | text | 50 | Y | varchar(50) | 不明（建議對照舊程式與業務） |
| `EnvTitle` | text | 10 | Y | varchar(10) | 不明（建議對照舊程式與業務） |

### 3.5 `sysctrl`（5 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `userid` | text | 10 | Y | varchar(10) | 使用者帳號 |

### 3.6 `sysinfo`（11 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |
| `f1` | text | 60 | Y | varchar(60) | 未具名欄位（需對照程式） |
| `f2` | text | 2 | Y | varchar(2) | 未具名欄位（需對照程式） |

---

## 4. 樣本資料（供遷移驗證）

- 下列為腳本讀取之樣本列（`sample-offset` / `sample-limit` 如中繼資料）；完整驗證請對照重跑指令並比對 row hash／checksum。
- **`CKind`**：
  - 列 0: abcno=代; abcname= 
  - 列 1: abcno=代折; abcname= 
  - 列 2: abcno=材料; abcname= 
  - 列 3: abcno=餘料; abcname= 
  - 列 4: abcno=備; abcname= 
- **`kind`**：
  - 列 0: kno=扁鐵        09; metal=扁鐵; thick=9; remark= ; soul=SS41
  - 列 1: kno=方管        02; metal=方管; thick=2; remark= ; soul=SS41
  - 列 2: kno=方管        03; metal=方管; thick=3; remark= ; soul=SS41
  - 列 3: kno=方管 SS41   03; metal=方管 SS41; thick=3; remark= ; soul=SS41
  - 列 4: kno=合板        02; metal=合板; thick=2; remark= ; soul=SS41
- **`ma90`**：
  - 列 0: f1=a8I$($"!@0("; f2=@(0$($"!@0("; f3=@9F$($"!@0("; f4=@9B$($"!@0("; f5=@80$($"!@0("; f6= ; f7= ; f8= 
  - 列 1: f1=mIcXMV"!@0("; f2=R]eM]NIJ@0("; f3=@>E4:6"!@0("; f4=@9E=86"!@0("; f5=@9E796"!@0("; f6=@9@=<=3!@0("; f7=@:D7=;3!@0("; f8=@=@6?49!@0("
  - 列 2: f1=P<=<A685RH("; f2=P<=<A685RH("; f3=SA@6;751WGA5; f4=S@EFKG56YG:3; f5=w:[WQ7I!@0("; f6=@(I9652/Q@; f7=M:A9@5"!@0("; f8=M9H9?7"!@0("
  - 列 3: f1=a8A$($"!@0("; f2=P=B5($"!@0("; f3=@=A:?<"!@0("; f4=@9E=86"!@0("; f5=@9E796"!@0("; f6=; f7=; f8=
  - 列 4: f1=a8B$($"!@0("; f2=P>@79$"!@0("; f3=@;E6A8"!@0("; f4=@9E7A4"!@0("; f5=@9E796"!@0("; f6=; f7=; f8=
- **`Optiona`**：
  - 列 0: MaxItem=0; PageItem=0; GainBase=2; ShowGain=0; MyPageSize=2; DrawLine=0; ShowPDec=0; ShowQDec=0
- **`sysctrl`**：
  - 列 0: userid=SUPER
  - 列 1: userid=D02
  - 列 2: userid=D01
  - 列 3: userid=ISIN
  - 列 4: userid=My-admin
- **`sysinfo`**：
  - 列 0: f1=奕新雷射精機股份有限公司; f2= 1
  - 列 1: f1=04-22130117; f2= 2
  - 列 2: f1=isin.lin@msa.hinet.net; f2= 3
  - 列 3: f1=04-22130113; f2= 4
  - 列 4: f1=台中市東區東光園路310號; f2= 5

---

## 5. 建議之目標綱要（僅供參考，非強制）

1. 以業務邊界拆成 PostgreSQL schema 或前綴表名；字典類可單表多列。
2. 寬表／單列設定可收斂為 `jsonb` 或應用層設定表。
3. 大表請分批匯入並建索引於業務鍵（與 FK 解耦）。

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- "/nas/isin/master.mdb" --json --no-samples
npm run analyze-access -- "/nas/isin/master.mdb" --json --sample-limit=20
```

---

*本報告由 `analyze-access-database` 母技能、`access-migration-report` 子技能骨架，以及 `scripts/analyze-access.ts` + `scripts/generate-isin-migration-reports.ts` 產出。*

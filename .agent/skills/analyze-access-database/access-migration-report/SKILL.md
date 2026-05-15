---
name: access-migration-report
description: >-
  Defines the markdown structure for single-file legacy Access (.mdb/.accdb)
  migration recon reports after analyze-access. Use when authoring or
  reviewing ACCESS_*_MIGRATION_REPORT.md, schema handoffs for PostgreSQL, or
  when the user asks for Access migration report layout, section order, or
  per-table column tables.
disable-model-invocation: true
---

# Access 遷移盤點報告（子技能）

## 與母技能的關係

- **資料來源**：先依 `analyze-access-database`（`scripts/analyze-access.ts`）取得 JSON／樣本列，再依**本文件定義的骨架**撰寫人讀報告。
- **參考範例**（已依本結構實作）：同目錄上層的 [`ACMASTER_MDB_MIGRATION_REPORT.md`](../ACMASTER_MDB_MIGRATION_REPORT.md)。

## 觸發時機

- 產出或改版 `*MIGRATION_REPORT.md`、`*_MDB_*` 盤點文件。
- 將 `analyze-access` 的 JSON 轉成給工程／遷移用的說明文件。

## 報告檔名建議

`{STEM}_MIGRATION_REPORT.md`（例：`acmaster` → `ACMASTER_MDB_MIGRATION_REPORT.md`）；`STEM` 為檔名不含副檔名，全大寫慣用於辨識 legacy 產物。

---

## 必填章節與順序

報告須依下列**編號與順序**組成；可視檔案特性**省略**不適用的小節（於該節標註「不適用」一行即可），但**不可打亂既有編號**（以利 diff 與 review）。

### 標題與中繼資料（無編號，置頂）

- 一級標題：`# {檔名}.mdb — Legacy Access 遷移盤點報告`（`.accdb` 則替換副檔名）。
- 緊接一個 **二欄表**（欄位：`項目`｜`內容`），至少包含：

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** | 實際分析的絕對或約定路徑；若庫存有多份同名檔，註明差異與取捨 |
| **盤點時間 (UTC)** | ISO-8601 日期（或日期時間） |
| **分析方式** | 使用的指令與 flag（例：`--json`、`--no-samples`、樣本 `sample-limit`）；若經 Big5 轉 UTF-8 須註明 |
| **資料表數** | 整數；註明是否僅 `normalTables`（與腳本一致） |
| **整體角色** | 一句話：此檔在業務／技術上的定位 |

---

### §1 遷移摘要

- 使用**項目符號列表**（非表格）。
- 涵蓋面向（依實際取捨，至少觸及有證據的項）：關聯／FK 是否僅能推斷、字元編碼與目標庫、敏感或不可解欄位、單例表／鍵值列等特殊形狀、與其他 .mdb 的依賴提示。

---

### §2 資料表總覽

- 一個 **Markdown 表格**，欄位固定為：`表名`｜`列數`（右對齊數字）｜`用途（推斷）`。
- `表名` 使用反引號；列數取自 `rowCount`。
- 表名排序：建議與 `tableNamesInFile` 或字母序一致，全文統一即可。

---

### §3 逐表：欄位、型別、遷移型別建議、語意推斷

對**每一個**待遷移的資料表：

1. **三級標題**：`### 3.{n} \`TableName\`（{rowCount} 列）` — `{n}` 為表序號，自 1 遞增。
2. **選擇性段落**：若該表為單列設定、寬表、或 EAV／序號列，先以一段說明形狀再進欄位表。
3. **欄位表**（核心）：欄位集合依下節「欄位表格式」。
4. **選擇性子小節**：若存在「序號 → 語意」或「鍵 → 值」對照，使用四級標題 `#### ...`，內含對照表。

---

#### 欄位表格式（§3 內強制）

依欄位是否含 **Access Text 長度**，擇一格式（同一份報告內同形表應一致）：

**A. 一般表（含 `size`）**

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |

**B. 混合型別或省略 size**

| 欄位 | Access 型別 | NULL | 遷移建議 | 可能意義 |
| --- | --- | --- | --- | --- |

- `Access 型別`：來自 `analyze-access` JSON 的 `type`（如 `text`、`integer`）；可括註 `text(20)` 這類讀者友善寫法。
- `NULL`：`Y` / `N` 對應 `nullable`。
- `遷移建議**：目標型別或策略（例：`varchar(n)`、`jsonb`、**原樣保存**／`legacy_opaque`）。
- `可能意義**：簡述；有樣本證據時可括註「樣本：…」。
- 連續同質欄位（如 `f1`…`f8`）可合併列：`f1` … `f8` | … | 一列描述。

每表末尾可選 **「遷移備註」** 一段（與他表／ERP 的對照）。

---

### §4 樣本資料（供遷移驗證）

- 精簡列點或短表：每表至多幾行代表值；避免貼整份 JSON。
- 須提醒驗證方式（例：checksum、row hash）；註明字元編碼狀態（與中繼資料一致）。

---

### §5 建議之目標綱要（僅供參考，非強制）

- 編號列表：建議的目標表或 `jsonb` 承載方式；標明 **非強制** 以免與唯一真理混淆。

---

### §6 重跑分析指令

- 一個 `bash`  fenced 程式碼區塊，列出還原本次結論所需的 `npm run analyze-access -- ...`（至少含「僅結構」與「含樣本」兩類或等價說明）。

---

### 結尾（無編號）

- 一行斜體或註腳：標明產出流程（例：母 skill 名稱或腳本）。

---

## 撰寫守則

- **不臆造**：無樣本或無他檔交叉證據時，語意欄寫「不明」或「需對照程式」。
- **隱私**：報告若離庫，公司名、統編、電話等可遮罩或改為欄位說明而不填真值。
- **與 JSON 對齊**：表名、欄位名、`rowCount`、型別需與 `analyze-access` 輸出一致（含大小寫）。

---

## 快速骨架（複製用）

外層使用四個反引號，以便內嵌 `bash` 程式碼區塊；複製時請去掉最外層一對 fence。

````markdown
# {STEM}.mdb — Legacy Access 遷移盤點報告

| 項目 | 內容 |
| --- | --- |
| **權威檔案路徑** |  |
| **盤點時間 (UTC)** |  |
| **分析方式** |  |
| **資料表數** |  |
| **整體角色** |  |

---

## 1. 遷移摘要

-

---

## 2. 資料表總覽

| 表名 | 列數 | 用途（推斷） |
| --- | ---: | --- |

---

## 3. 逐表：欄位、型別、遷移型別建議、語意推斷

### 3.1 `TableName`（0 列）

| 欄位 | Access 型別 | 大小 | NULL | 遷移建議 | 可能意義 |
| --- | --- | ---: | --- | --- | --- |

---

## 4. 樣本資料（供遷移驗證）

-

---

## 5. 建議之目標綱要（僅供參考，非強制）

1.

---

## 6. 重跑分析指令

```bash
npm run analyze-access -- <path.mdb> --json --no-samples
npm run analyze-access -- <path.mdb> --json --sample-limit=20
```

---

*本報告由 … 流程產出。*
````

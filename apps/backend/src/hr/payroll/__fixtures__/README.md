# 薪資 parity fixture

每個子目錄是一組基準，例如 `2026-07-official/`，內含：

- `input.json`：`PayrollSourceData`，由舊 MariaDB 匯出。
- `expected.json`：舊 Java Personnel 產出的 Excel 轉成的預期值。

`legacy-payroll-parity.spec.ts` 會自動掃描此目錄，兩個檔案都存在的子目錄才會比對；目錄為空時整個 spec 跳過。

## 產生 input.json

在專案根目錄設定 `SOURCE_DB_*` 指向舊 MariaDB 後執行：

```bash
npm run payroll:dump-source -- --start 2026-07-01 --end 2026-07-31 --variant official --out apps/backend/src/hr/payroll/__fixtures__/2026-07-official/input.json
```

`--variant fake` 會對 `have_fake=1` 的員工改讀 `staff_manhour2`。

## 產生 expected.json

1. 用 Java Personnel 對同一期間輸出薪資 Excel（正式用 `exportMonth`，外帳用 `exportFake`）。
2. 用 Excel 或 LibreOffice 開啟後另存一次，讓公式結果固化成快取值。exceljs 讀不到未固化的公式結果。
3. 執行：

```bash
npm run payroll:expected-from-xlsx -- --xlsx "/path/2026年7月薪資表.xlsx" --start 2026-07-01 --out apps/backend/src/hr/payroll/__fixtures__/2026-07-official/expected.json
```

`expected.json` 的 `days` 只收打卡記錄表有值的列；`wages` 以薪資表的標題列為鍵對應到 `WageItems` 欄位。

## 已知允許差異

依 2026-10-04 決議，比對時忽略：

- 舊薪資表的「防疫假」列。
- 舊程式硬編排除「林慶豐」；新版以 `stop_work` 判斷。
- 舊 Excel 伙食津貼的 COUNTIF 範圍少算期間最後一天；新版整月計算，spec 會以舊算法換算後再比對。

fixture 內含員工薪資資料，請勿提交到版本控制；`.gitignore` 已排除本目錄的 `*.json`。

## 雙軌比對（不經 fixture）

要直接比對 Java Excel 與 Nest API 下載的 Excel，用：

```bash
npm run payroll:dual-track -- --start 2026-06-01 --java "/path/official/2026年6月薪資表.xlsx" --nest "/path/official-2026-06-銷管部.xlsx" --nest "/path/official-2026-06-生產部.xlsx"
```

Nest 每個部門一個檔案，全部用 `--nest` 傳入。允許差異與上面相同。

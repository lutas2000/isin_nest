# 後端規則：TypeORM Entity 與 Migration

## 適用情境

- Entity 欄位新增、修改、刪除
- 關聯關係調整（one-to-many、many-to-one 等）
- 資料型別或索引變更

## 必做步驟

1. 先修改 Entity 定義，保持命名與型別語意清楚。
2. 使用 migration 指令產生 migration 檔。
3. 審查 migration SQL，確認沒有誤刪或非預期 destructive 操作。
4. 在本地執行 migration，驗證 schema 可成功套用。
5. 若牽涉既有資料，補上相容性處理或資料修補策略。
6. 提交時必須同時包含 Entity 變更與 migration 檔。

## 禁止事項

- 不可只改 Entity 不產 migration。
- 不可在正式流程依賴 `schema:sync` 當作版本控管手段。
- 不可忽略 migration 審查，直接提交自動生成 SQL。

## 驗證方式

- migration 可正常 `run` 並在需要時可 `revert`。
- 目標模組在新 schema 下可正常查詢與寫入。
- 無新增 lint 或測試回歸問題。

## 正式 DB 與 entity 已有落差時

正式 DB 有部分表與 entity 不一致（例如 payroll、sales_voucher），直接 `migration:generate` 會把這些落差一起產生進來。做法：

1. 開一個獨立的 `postgres:16-alpine` 測試容器，載入正式 DB 的 `pg_dump --schema-only --no-owner --no-privileges` 與 `typeorm_migrations` 的資料（`--data-only -t typeorm_migrations`）。只讀正式 DB，不寫。
2. 以 `DB_HOST`／`DB_PORT`／`DB_USER`／`DB_PASS`／`DB_NAME` 環境變數指向測試容器後執行 `migration:generate`（環境變數會蓋過 `.env`）。
3. 只保留本次相關的語句，其餘落差不要順手帶進來。
4. 在測試容器 run → revert → run，再用 `migration:generate --dryrun` 確認本次相關的部分已無差異。
5. 新 migration 類別要加進 `app.module.ts` 的 `migrations` 陣列（webpack bundle 不能用 glob）。

TypeORM 不會自動建立 PostgreSQL schema：新 schema（例如 `legacy_crm`）要在 migration 開頭手動加 `CREATE SCHEMA IF NOT EXISTS`，down 最後 `DROP SCHEMA`（不加 CASCADE）。

## 常見失誤

- migration 命名過於模糊，難以追蹤需求背景。
- Entity 預設值與 DB 實際預設值不一致。
- 關聯欄位 nullable 設定未評估舊資料，導致部署失敗。

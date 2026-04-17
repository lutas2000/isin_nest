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

## 常見失誤

- migration 命名過於模糊，難以追蹤需求背景。
- Entity 預設值與 DB 實際預設值不一致。
- 關聯欄位 nullable 設定未評估舊資料，導致部署失敗。

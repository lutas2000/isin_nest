# Skill：Entity 變更與 Migration

## 目的

確保資料模型調整可追蹤、可部署、可回滾。

## 觸發條件

- 任務包含 Entity 欄位、型別、關聯、索引異動

## 依賴規則

- `../rules/backend/typeorm-entity-migration.md`

## 輸入

- 變更前後的資料模型
- 舊資料相容性要求
- 是否需要資料修補腳本

## 執行步驟

1. 修改 Entity 與關聯定義。
2. 產生 migration 並審查 SQL。
3. 本地執行 migration（必要時執行 revert 驗證）。
4. 驗證主要讀寫流程在新 schema 下正常。
5. 整理提交內容，確保 Entity 與 migration 同步。

## 輸出

- Entity 程式碼變更
- 對應 migration 檔
- schema 驗證結果

## 完成後文件更新檢查

- 若出現新型態 schema 風險：更新 `typeorm-entity-migration.md`
- 若流程中新增固定檢查點：更新本 skill

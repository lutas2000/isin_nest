# 後端規則：NestJS 模組開發

## 適用情境

- 新增或調整 NestJS 功能模組
- 新增 API endpoint、Service 邏輯或資料流
- 調整 Controller/Service/Entity 的責任邊界

## 必做步驟

1. 先確認功能歸屬模組，避免跨模組塞業務邏輯。
2. 依標準結構實作：`{feature}.module.ts`、`controller`、`service`、`entities/`。
3. 新增 Entity 時，於該功能模組的 `TypeOrmModule.forFeature([...])` 註冊。
4. 新增 endpoint 時，同步補齊 DTO 與驗證規則。
5. 完成後執行最小驗證（lint、測試或目標功能手動驗證）。

## 禁止事項

- 不可將新 Entity 只註冊在全域 TypeORM 設定，必須放在 feature module。
- 不可跳過 DTO 或直接在 controller 接收未驗證的任意 payload。
- 不可在 controller 寫過多商業邏輯，應下沉至 service。

## 驗證方式

- 模組可正常啟動，路由註冊正確。
- 目標 endpoint 的輸入驗證、錯誤處理與成功回應皆符合預期。
- 無新增 lint 錯誤。

## 常見失誤

- 漏註冊 `TypeOrmModule.forFeature([...])` 導致 repository 注入失敗。
- DTO 與 service 實際邏輯欄位不一致，造成隱性 bug。
- 在 controller 中混入資料轉換與流程判斷，降低可維護性。

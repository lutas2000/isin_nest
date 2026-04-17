# Skill：新增後端 API Endpoint

## 目的

以一致流程完成新 API，降低漏掉 DTO、Swagger、權限控管的機率。

## 觸發條件

- 任務包含新增 endpoint 或調整 endpoint 行為

## 依賴規則

- `../rules/backend/nestjs-module.md`
- `../rules/backend/api-contract-swagger.md`
- 若有授權需求再加讀：`../rules/backend/security-authz.md`

## 輸入

- API 功能需求與業務目的
- request/response 期望欄位
- 權限需求（是否登入、角色限制）

## 執行步驟

1. 定義 endpoint 契約與 DTO。
2. 實作 service 邏輯，controller 僅處理協調與轉接。
3. 補齊 Swagger 註解與錯誤碼描述。
4. 若需授權，掛載 Guard 與權限檢查。
5. 執行最小驗證並記錄結果。

## 輸出

- 可用 endpoint
- 契約一致的 Swagger 文件
- 最小驗證結果（成功、失敗、權限不足）

## 完成後文件更新檢查

- 若新增 API 模式未被現有規則覆蓋：更新 `.agent/rules/backend/*`
- 若本 skill 流程有新增高頻步驟：更新本檔

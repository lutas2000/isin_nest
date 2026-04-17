# 後端規則：API 契約與 Swagger 一致性

## 適用情境

- 新增或調整 REST API
- 調整 DTO、回應格式、查詢參數
- API 行為或錯誤碼變更

## 必做步驟

1. 先定義契約（request/response、成功與失敗情境）。
2. 以 DTO 承接輸入與輸出，搭配 class-validator 規則。
3. 在 Controller 加上對應 Swagger 註解（如 `@ApiOperation`、`@ApiResponse`、`@ApiQuery`、`@ApiParam`）。
4. 確認 Service 實作與 Swagger 文件描述一致。
5. 若有破壞性變更，註記遷移策略或版本影響。

## 禁止事項

- 不可只改程式不更新 Swagger 註解。
- 不可讓回應結構與文件長期不一致。
- 不可在沒有明確理由下任意調整既有錯誤碼語意。

## 驗證方式

- Swagger UI 可正確反映新契約。
- 常見成功/失敗案例都能得到文件描述的結果。
- 既有呼叫端（前端或外部整合）不因非預期改動失效。

## 常見失誤

- DTO 驗證規則過寬，與文件描述不一致。
- `@ApiResponse` 僅註記 200，漏掉 400/401/403/404。
- query/path 參數有實作但未寫入 Swagger 註解。

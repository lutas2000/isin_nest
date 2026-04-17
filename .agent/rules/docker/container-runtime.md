# Docker 規則：容器執行基線

## 適用情境

- 調整 Dockerfile 或 container runtime 參數
- 變更映像建置流程

## 必做步驟

1. 明確區分 build-time 與 runtime 需求。
2. 優先保持映像最小化與可重現。
3. 檢查環境變數、port、volume 映射是否與應用程式一致。
4. 變更後驗證容器可成功啟動與關鍵路由可用。

## 禁止事項

- 不可把開發期暫存設定直接帶入部署映像。
- 不可在 Dockerfile 內留下未使用步驟與冗餘套件。

## 驗證方式

- `docker compose up` 可啟動必要服務。
- 應用程式在容器內可正常連接相依服務（如 DB）。

# 規則路由：任務到文件映射

本文件定義「任務類型 -> 必讀規則」的映射，是按需加載的唯一路由來源。

## 使用方式

1. 先辨識當前任務屬於哪一類。
2. 只讀取該類任務列出的「必讀文件」。
3. 若任務跨多領域，可合併多個類別的必讀文件。
4. 任務結束後，依 `quality-gates.md` 與 `doc-update-decision-tree.md` 判斷是否更新文件。

## 任務映射

### 後端

- 新增後端 API
  - 必讀：`backend/nestjs-module.md`、`backend/api-contract-swagger.md`
- 調整資料模型（Entity/欄位/關聯）
  - 必讀：`backend/typeorm-entity-migration.md`
- 調整授權、角色、敏感操作
  - 必讀：`backend/security-authz.md`、`backend/api-contract-swagger.md`

### 前端

- 新增或重構頁面元件
  - 必讀：`frontend/components.md`、`frontend/view-composition.md`
- 調整 UI 視覺一致性
  - 必讀：`frontend/design-system.md`
- Tailwind class 重構或樣式調整
  - 必讀：`frontend/tailwind-css.md`
- 新增或調整 API 呼叫與狀態流
  - 必讀：`frontend/api-state.md`

### Docker

- 調整 Dockerfile / compose
  - 必讀：`docker/container-runtime.md`
- 調整本地容器開發流程
  - 必讀：`docker/local-dev-compose.md`
- 調整部署容器流程
  - 必讀：`docker/deployment-baseline.md`

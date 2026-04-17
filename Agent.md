# Agent.md

本檔案是 AI Agent 的「入口索引」，僅保留專案總覽與文件導覽。  
除 `Agent.md` 之外，所有指導文件皆採 **按需加載**，請在任務需要時再讀取對應文件。

## 專案說明

ISIN 管理系統是 Nx monorepo，主要包含：

- `NestJS` 後端（`apps/backend`）
- `Vue 3` 前端（`apps/frontend`）
- CRM 與 HR 業務模組
- Docker 與部署相關設定

本專案的指導文件主要讀者與維護者是 AI Agent，內容以可組合、可擴充、按需讀取為優先。

## 專案目錄

- `apps/backend`：後端程式碼（NestJS）
- `apps/frontend`：前端程式碼（Vue 3）
- `docker`：容器化相關設定
- `docs`：專案文件
- `.agent/rules`：按需加載的細分指導文件
- `.agent/skills`：可重用的技能與流程文件

## 文件目錄

### 核心入口

- `Agent.md`：唯一預設讀取的入口文件

### 按需加載規則（任務導向讀取）

- `.agent/rules/rules-router.md`（先讀此檔，依任務映射加載其他規則）
- `.agent/rules/quality-gates.md`
- `.agent/rules/doc-update-decision-tree.md`
- `.agent/rules/frontend/README.md`
- `.agent/rules/frontend/design-system.md`
- `.agent/rules/frontend/tailwind-css.md`
- `.agent/rules/frontend/components.md`
- `.agent/rules/frontend/view-composition.md`
- `.agent/rules/frontend/api-state.md`
- `.agent/rules/backend/README.md`
- `.agent/rules/backend/nestjs-module.md`
- `.agent/rules/backend/typeorm-entity-migration.md`
- `.agent/rules/backend/api-contract-swagger.md`
- `.agent/rules/backend/security-authz.md`
- `.agent/rules/docker/README.md`
- `.agent/rules/docker/container-runtime.md`
- `.agent/rules/docker/local-dev-compose.md`
- `.agent/rules/docker/deployment-baseline.md`

### 任務路由入口

- 任務開始時，先讀 `.agent/rules/rules-router.md`，只加載對應規則。
- 若任務跨多領域，合併讀取多個分類規則，但仍避免全量讀取。

### 技能文件（集中於單一路徑）

- `.agent/skills/README.md`
- `.agent/skills/skills-index.md`
- `.agent/skills/SKILL_TEMPLATE.md`

### 維護規範

- 每次完成 agent 指令後，必須思考是否需要更新：
  - `Agent.md`（入口索引是否仍正確）
  - `.agent/rules/*`（細分規則是否過時）
  - `.agent/skills/*`（技能流程是否需調整）

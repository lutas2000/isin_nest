---
name: deploy-and-run
description: Build and start production services from the current working tree without any git operations. Use when code is already at the desired state and only Docker image builds, migration, and compose startup are needed.
---

# Deploy and Run（不含 git 操作）

## Purpose

從當前工作目錄直接 build image、執行 migration、啟動服務，不做任何 git 操作。
適用於：本地已確認代碼狀態、只需重新 build 並部署的情境。

## Trigger Conditions

- 任務要求 build 並啟動服務，但不需要 git pull / checkout。
- 代碼已就位，只需重建 image 並重啟容器。
- 明確排除 git 操作的部署流程（例如：剛完成本地修改後的快速部署）。

## Required Rules

- `../rules/docker/deployment-baseline.md`
- `../rules/backend/typeorm-entity-migration.md`

## Inputs

- 確認當前工作目錄的代碼狀態已符合預期（不由此 skill 驗證）。
- Runtime 環境變數與 secrets（`.env` 或 compose 環境設定）。
- 確認使用的 compose 檔案與服務目標。

## Steps

1. 確認 `.env` 存在且必要變數已設定（`DB_HOST`、`JWT_SECRET` 等）。
2. 執行資料庫 migration 並確認成功：
   - 使用專案的 migration 指令（參考 `typeorm-entity-migration.md`）。
3. Build backend Docker image：
   - `docker compose build backend`
4. Build frontend Docker image：
   - `docker compose build frontend`
5. 啟動或更新服務：
   - `docker compose up -d`
6. 驗證容器健康狀態與關鍵服務日誌，回報部署結果。

## Outputs

- Migration 執行結果。
- Backend image build 結果。
- Frontend image build 結果。
- Docker Compose 啟動狀態與服務健康確認。

## 與 prod-deploy-update-run 的差異

| 項目 | prod-deploy-update-run | deploy-and-run |
|------|------------------------|----------------|
| git fetch / pull | ✅ 含 | ❌ 不含 |
| 衝突停止保護 | ✅ 含 | — 不適用 |
| Migration | ✅ 含 | ✅ 含 |
| Docker build | ✅ 含 | ✅ 含 |
| Compose startup | ✅ 含 | ✅ 含 |

## Post-Task Documentation Check

- 若 build 指令或 compose 設定有異動：更新此 skill。
- 若新增必要的環境安全檢查：同步更新 Docker 規則。

# Docker 規則索引

本目錄存放容器、映像、啟動流程與部署相關的按需規則。

## 建議加載時機

- 調整 `docker-compose.yml`、Dockerfile、啟動參數時
- 本地開發環境與容器環境一致性問題排查時
- CI/CD 或部署容器策略調整時

## 規則清單

- `container-runtime.md`
- `local-dev-compose.md`
- `deployment-baseline.md`

## 維護提醒

- Docker 任務完成後，確認本規則是否仍符合目前部署流程

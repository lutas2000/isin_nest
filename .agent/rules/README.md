# .agent/rules 指南

本目錄存放所有「非入口」的細分指導文件，預設不主動讀取，必須按任務需求加載。

## 使用原則

- 任務路由以 `rules-router.md` 為唯一映射來源
- 只讀「當前任務需要」的規則，避免一次讀取全部
- 任務完成後，檢查本目錄文件是否需要更新

## 目錄分類

- `frontend/`：前端開發規則（可再細分）
- `backend/`：後端開發規則
- `docker/`：容器與部署規則
- `rules-router.md`：任務到規則的路由映射
- `quality-gates.md`：任務前中後檢核
- `doc-update-decision-tree.md`：文件更新判斷樹

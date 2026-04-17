# .agent/skills 指南

本目錄是本專案所有 skills 的唯一儲存位置。

## 原則

- 所有新技能文件都放在 `.agent/skills/`
- 技能內容應聚焦單一能力，便於按需加載
- 任務需要時才讀取對應 skill，不預設全載入
- 建議先讀 `skills-index.md` 再選擇要載入的 skill

## 維護規範

- 每次 agent 指令完成後，檢查是否需要更新或新增 skill
- 若某類任務重複發生，應將流程沉澱為 skill 文件

## 目錄

- `SKILL_TEMPLATE.md`
- `skills-index.md`
- `new-backend-endpoint.skill.md`
- `entity-change-with-migration.skill.md`
- `permission-change.skill.md`

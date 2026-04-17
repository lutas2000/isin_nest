# Skills 索引

本檔案提供 skill 的分類與觸發條件，供 agent 按需加載。

## 後端

- `new-backend-endpoint.skill.md`
  - 觸發：新增或調整 API endpoint
  - 搭配規則：`../rules/backend/nestjs-module.md`、`../rules/backend/api-contract-swagger.md`
- `entity-change-with-migration.skill.md`
  - 觸發：Entity、欄位、關聯調整
  - 搭配規則：`../rules/backend/typeorm-entity-migration.md`
- `permission-change.skill.md`
  - 觸發：角色權限、Guard、敏感操作調整
  - 搭配規則：`../rules/backend/security-authz.md`

## 文件治理

- 任務完成後需搭配：
  - `../rules/quality-gates.md`
  - `../rules/doc-update-decision-tree.md`

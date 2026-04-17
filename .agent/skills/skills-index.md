# Skills Index

This file maps task intent to skill folders for on-demand loading.

## Backend Skills

- `new-backend-endpoint/SKILL.md`
  - Trigger: add or modify backend API endpoints.
  - Use with: `../rules/backend/nestjs-module.md`, `../rules/backend/api-contract-swagger.md`.
- `entity-change-with-migration/SKILL.md`
  - Trigger: update entity fields, relations, indexes, or schema-related model definitions.
  - Use with: `../rules/backend/typeorm-entity-migration.md`.
- `permission-change/SKILL.md`
  - Trigger: role permission changes, guard updates, or sensitive operation access control.
  - Use with: `../rules/backend/security-authz.md`, `../rules/backend/api-contract-swagger.md`.

## Deployment Skills

- `prod-deploy-update-run/SKILL.md`
  - Trigger: update and run production services using git pull, DB migration, Docker builds, and Docker Compose.
  - Use with: `../rules/docker/deployment-baseline.md`, `../rules/backend/typeorm-entity-migration.md`.

## Documentation Governance

After task completion, also review:

- `../rules/quality-gates.md`
- `../rules/doc-update-decision-tree.md`

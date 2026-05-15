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

## Legacy / Data Analysis

- `analyze-access-database/SKILL.md`
  - Trigger: inventory all `.mdb`/`.accdb` under a NAS root (e.g. `/nas/isin`), inspect Access schema/sample data, or compare an Access table to MySQL via `scripts/analyze-access.ts` / `scripts/list-access-mdb.ts`.
  - Use with: `scripts/README.md` (Access sections); generated `LEGACY_ACCESS_MDB_INVENTORY.md`; env key names from `.env.example` only—never read root `.env`.

## Deployment Skills

- `prod-deploy-update-run/SKILL.md`
  - Trigger: update and run production services using git pull, DB migration, Docker builds, and Docker Compose.
  - Use with: `../rules/docker/deployment-baseline.md`, `../rules/backend/typeorm-entity-migration.md`.
- `deploy-and-run/SKILL.md`
  - Trigger: build and start services from the current working tree without git operations (code already in place).
  - Use with: `../rules/docker/deployment-baseline.md`, `../rules/backend/typeorm-entity-migration.md`.

## Documentation Governance

After task completion, also review:

- `../rules/quality-gates.md`
- `../rules/doc-update-decision-tree.md`

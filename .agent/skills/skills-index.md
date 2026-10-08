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
  - Trigger: NAS Access inventory, per-file schema/sample with optional row window and JSON output, or MySQL column diff via `scripts/analyze-access.ts` / `list-access-mdb.ts`.
  - Use with: `scripts/README.md` §3; `LEGACY_ACCESS_MDB_INVENTORY.md`; `.env.example` for variable names only—never read root `.env`.

- `legacy-crm-data-migration/SKILL.md`
  - Trigger: import the legacy VB6/Access sales data (isin_vb6 rebuild) into PostgreSQL `legacy_crm`, rehearse the migration, or fill `staff.legacy_crm_code`.
  - Use with: `../../docs/LEGACY-CRM-MIGRATION-RUN.md`, `../../docs/LEGACY-CRM-REBUILD-PLAN.md` §2–3, `../rules/backend/typeorm-entity-migration.md`.

- `legacy-crm-screen-port/SKILL.md`
  - Trigger: move a legacy sales screen from isin_vb6 into `/legacy-crm` (stage 3–4), or change one that is already there.
  - Use with: `../../docs/LEGACY-CRM-FRONTEND.md`, `../../docs/LEGACY-CRM-API.md`, `../rules/frontend/design-system.md` 「舊版銷管」.

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

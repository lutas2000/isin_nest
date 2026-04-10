# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ISIN 管理系統 — an Nx monorepo containing a NestJS 11 backend and a Vue 3 frontend, built around a CRM (quote → order → work-order) workflow plus an HR module. PostgreSQL via TypeORM, JWT auth, Swagger docs at `/api`.

## Common commands

Run all from the repo root unless noted.

```bash
# Dev (both apps)
npm run dev:full              # spawns nest start --watch + nx serve frontend (dev-scripts.js)
npm run start:dev             # backend only (nx serve backend)
npm run frontend:dev          # frontend only (nx serve frontend)

# Build
npm run build                 # all projects (nx run-many)
npm run build:backend
npm run build:frontend

# Lint / format
npm run lint                  # nx run-many lint
npm run lint:backend
npm run lint:frontend
npm run lint:quick            # eslint with the fast config (eslint.config.fast.mjs)
npm run format                # prettier --write

# Tests
npm run test                  # all unit tests via nx
npm run test:backend          # nx test backend (Jest)
npm run test:frontend         # nx test frontend (Vitest)
npm run test:cov              # backend coverage
npx nx test backend --testFile=path/to/file.spec.ts   # single file
npx playwright test                                    # E2E (needs dev:full running)
npx playwright test tests/crm/login.spec.ts            # single E2E
npx playwright test --ui                               # interactive

# DB / migrations (TypeORM CLI wired to apps/backend/src/data-source.ts)
npm run migration:generate --name=DescriptiveName
npm run migration:create --name=DescriptiveName
npm run migration:run
npm run migration:revert
npm run migration:show
npm run schema:sync           # dev only — overwrites schema
npm run schema:drop           # destructive

# One-off scripts (ts-node)
npm run create-admin
npm run db:backup
npm run db:restore
npm run migrate-customer-from-access
npm run migrate-quote-from-access
```

E2E test credentials: `admin` / `a123456`. Backend listens on `PORT` (default 3000); CORS is allow-listed for localhost ports 3000/3001/5173/8080.

## Architecture

### Monorepo layout
- `apps/backend` — NestJS app, Webpack build target Node.js
- `apps/frontend` — Vue 3 app, Vite dev server / Webpack build, Pinia state, vue-router
- `tests/` — Playwright E2E (CRM flows: login, customers, contacts, quotes, orders, navigation)
- `scripts/` — ts-node utilities for migrations from legacy MS Access, admin seeding, DB backup/restore
- `apps/backend/src/migrations/` — TypeORM migration files; commit alongside entity changes

Nx caches builds/lints. `npx nx reset` to clear. `nx.json` defines the workspace.

### Backend module structure
`apps/backend/src/app.module.ts` wires four feature modules: `AuthModule`, `HrModule`, `SchedulerModule`, `CrmModule`. Each leaf feature follows the standard Nest pattern: `{feature}.module.ts` + `controller` + `service` + `entities/`. TypeORM uses `autoLoadEntities: true` (each `forFeature` registers its own entities) — this works around Nx webpack bundling breaking glob-based entity loading. The standalone `data-source.ts` (used only by the TypeORM CLI for migrations) does still use the glob pattern.

The `.env` file lives at the **repo root** and is loaded explicitly via `path.resolve(__dirname, '../../../.env')` from both `app.module.ts` and `data-source.ts`. Do not move it into `apps/backend`.

DB sync vs. migrations is gated by env vars: `DB_SYNC` (synchronize) and `DB_MIGRATIONS_RUN` (run pending migrations on boot). Both default to `false`. Production must use migrations.

### CRM domain (the bulk of the codebase)
`crm.module.ts` composes 15 sub-modules forming the quote → order → work-order pipeline:

```
Quote ─┐
       ├─► QuoteItem ──(convert)──► Order ─► OrderItem ─┐
       │                                                ├─► DesignWorkOrder
       │                                                ├─► CuttingWorkOrder
       │                                                ├─► ProcessingWorkOrder
       │                                                ├─► (Outsourcing via OutsourcingCost)
       │                                                └─► DeliveryWorkOrder
       │
       └── Supporting: Customer, Contact, Vendor, Processing, Nesting/NestingItem
```

Quote → Order conversion auto-copies items and generates the appropriate work orders. The `nesting` module handles 排版 (sheet layout) management. `OutsourcingCost` tracks 委外加工 costs against work orders. See `.cursor/plans/crm_workflow_refactor_f3395ffd.plan.md` for the historical refactor that established this shape.

`CrmConfigModule` (`/crm/configs`) is the **CRM settings center**: a `crm_config` table replaces what used to be DB enums (shipping_method, payment_method, source_type, etc.). Defaults are upserted on boot. **All previously-enum columns are now `varchar`** — when adding a new categorical field, prefer `varchar` + a `crm_config` category over a TypeORM enum.

### Auth module
JWT + Passport with admin guard, feature-permission gating (`feature.controller.ts`, `feature-config.controller.ts`). See `apps/backend/src/auth/README_FEATURE_PERMISSIONS.md` and `README_CREATE_USER_WITH_STAFF.md` for the feature-permission and user/staff coupling.

### HR module
Sub-modules: `staff`, `staff-segment` (departments), `attend-record`, `staff-leave`, `staff-manhour`, `staff-vacation`, `working-hours`.

### Common infrastructure
- `common/filters/global-exception.filter.ts` — registered globally in `main.ts`
- `common/logger/file-logger.service.ts` — also captures `uncaughtException` and `unhandledRejection` at bootstrap
- `common/dto`, `common/transformers` — shared DTO bases and class-transformer helpers
- `scheduler/` — `@nestjs/schedule` cron jobs

### Frontend structure
- `views/CRM/*` and `views/HR/*` — page components, one per route
- `router/index.ts` — single flat route table; every business route has `meta.requiresAuth: true` and a route guard enforces it
- `stores/auth.ts`, `stores/error.ts` — Pinia stores; auth token persists in `localStorage` under `auth_token`
- `services/api.ts` — `apiRequest<T>()` is the single fetch wrapper. It pulls the bearer token from localStorage, surfaces 401s through the error store as a logout modal, and is the entry point every `services/crm/*.service.ts` calls into
- `config/api.ts` — `buildApiUrl()` resolves the backend base URL

Frontend dependencies are installed at the root **and** inside `apps/frontend` (`cd apps/frontend && npm install`) per the README setup.

## Conventions worth knowing

- New CRM categorical fields → add to `crm_config` table, store as `varchar`. Don't reach for TypeORM enums.
- New entities → register them via the feature module's `TypeOrmModule.forFeature([...])`, not the root TypeORM config (autoLoadEntities relies on this).
- New backend routes → add Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiQuery`/`@ApiParam`) — existing controllers are fully annotated and the Swagger UI at `/api` is the documented contract.
- Schema changes → modify the entity, run `npm run migration:generate --name=...`, inspect the generated SQL in `apps/backend/src/migrations/`, then `npm run migration:run`. Commit entity + migration together.
- Frontend API calls → always go through `services/api.ts` `apiRequest`, not raw `fetch`, so the auth header and 401 handling stay consistent.
- Don't bypass the route guard — set `meta.requiresAuth: true` on any new business page.

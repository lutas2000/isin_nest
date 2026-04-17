---
name: prod-deploy-update-run
description: Update and run production services with a guarded deployment sequence including git sync, database migration, image builds, and compose startup. Use when deploying latest changes to production-like environments via Docker Compose.
---

# Production Deploy Update and Run

## Purpose

Standardize a safe production update flow that pulls latest code, applies migrations, rebuilds backend/frontend images, and starts services with Docker Compose.

## Trigger Conditions

- The task asks to update and run production environment.
- The workflow includes git pull, migration, Docker image build, and compose startup.
- The operator needs an explicit stop condition on merge conflicts.

## Required Rules

- `../rules/docker/deployment-baseline.md`
- `../rules/backend/typeorm-entity-migration.md`

## Inputs

- Target branch name (default: `main`).
- Runtime environment variables and secrets required by migration/build/compose.
- Confirmed compose file and service targets for production.

## Steps

1. Ensure working tree is clean enough for pulling updates. If there are local changes that block pull, stop and report.
2. Run git sync sequence:
   - `git fetch origin`
   - `git checkout main`
   - `git pull origin main`
3. If pull reports conflicts, stop immediately. Do not auto-resolve conflicts in this workflow.
4. Run database migration command for production configuration and verify success.
5. Build backend Docker image with production target/tag.
6. Build frontend Docker image with production target/tag.
7. Start or refresh services with Docker Compose:
   - `docker compose up -d` (or project-specific equivalent file/profile).
8. Verify container health/logs for key services and report deployment status.

## Outputs

- Confirmed git update status (or explicit conflict stop).
- Migration execution result.
- Backend and frontend image build results.
- Docker Compose startup status for production services.

## Post-Task Documentation Check

- If deployment order or commands change: update this skill.
- If new environment safety checks become mandatory: update related Docker rules.

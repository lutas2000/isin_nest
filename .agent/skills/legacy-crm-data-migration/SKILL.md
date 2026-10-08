---
name: legacy-crm-data-migration
description: Import the legacy VB6 + Access 97 sales data (MDB → CSV → PostgreSQL legacy_crm), rehearse it on a throwaway database, verify counts and dates, and fill staff.legacy_crm_code. Use for 舊版銷管、legacy CRM、MDB 移轉、正式移轉演練、legacy_crm 匯入.
---

# Legacy CRM Data Migration

## Purpose

Move the legacy sales data into `legacy_crm` with the same mapping and exclusion rules as isin_vb6, without touching production by accident and without leaking real data into Git.

## Required Reading

- `docs/LEGACY-CRM-MIGRATION-RUN.md` (commands, flow, last rehearsal numbers)
- `docs/LEGACY-CRM-REBUILD-PLAN.md` §2 (schema, date rules) and §3 (cut-over)

## Safety Rules

- `\\ISIN\isin` and the MDB files are read-only evidence. Copy first; never open the live files.
- CSV exports, summaries and the staff-code proposal file contain real data: keep them in a scratch directory outside the repo and delete them afterwards.
- Never read or paste the root `.env`. Point the tools at a test database with `DB_*` environment variables.
- Rehearse on a throwaway `postgres:16-alpine` container loaded with the production schema only (`pg_dump --schema-only`). Run against production only for the real cut-over, with the user's go-ahead.

## Steps

1. Export CSV with `../isin_vb6/scripts/export-legacy-mdb-set.sh <copy-dir> _isin_YYYYMMDD <new-dir>`.
2. `npm run migration:run` on the target DB.
3. `NODE_OPTIONS=--max-old-space-size=8192 npm run legacy-crm:import -- <csv-dir> --final`.
4. Compare the printed counts and exclusions with the last rehearsal in `LEGACY-CRM-MIGRATION-RUN.md`. Only newly added rows should differ.
5. Check the date statistics. `unparsed` should be 0. Raw strings live in `*_raw`.
6. Have a person confirm the staff-code proposals, then run `npm run legacy-crm:apply-staff-codes -- <file> --dry-run`, then run it again without `--dry-run`.
7. Record the counts and timings (no data) in `LEGACY-CRM-MIGRATION-RUN.md`.

## Post-Task Documentation Check

- New exclusion reason or date anomaly: document it in `LEGACY-CRM-MIGRATION-RUN.md`.
- Mapping change: update `apps/backend/src/legacy-crm/migration/import-steps.ts` and plan §2.

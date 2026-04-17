---
name: entity-change-with-migration
description: Apply TypeORM entity changes with safe, reviewable database migrations and schema validation. Use when modifying entity fields, relations, types, indexes, constraints, or any change that impacts database schema compatibility.
---

# Entity Change with Migration

## Purpose

Ensure data model changes are traceable, deployable, and reversible by pairing entity updates with verified migrations.

## Trigger Conditions

- The task changes entity fields, data types, or defaults.
- The task changes relations, indexes, or constraints.
- The task introduces schema compatibility concerns with existing data.

## Required Rules

- `../rules/backend/typeorm-entity-migration.md`

## Inputs

- Current and target data model definitions.
- Backward compatibility requirements for existing data.
- Whether data backfill or patch scripts are required.

## Steps

1. Update entity definitions and relation mappings.
2. Generate migration and review SQL changes carefully.
3. Run migration locally; run revert verification when needed.
4. Validate key read/write flows against the new schema.
5. Ensure commit content keeps entity code and migration in sync.

## Outputs

- Updated entity code.
- Corresponding migration file.
- Schema validation results for core flows.

## Post-Task Documentation Check

- If a new schema risk pattern appears: update `typeorm-entity-migration.md`.
- If a new repeated validation checkpoint emerges: update this skill.

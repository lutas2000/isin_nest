---
name: permission-change
description: Implement permission and authorization changes with guard protection and verifiable access outcomes. Use when adjusting role permissions, changing access policies, updating guards, or protecting sensitive backend operations.
---

# Permission Change and Authorization Guarding

## Purpose

Reduce privilege escalation risk during permission changes and ensure access behavior is explicit and testable.

## Trigger Conditions

- The task modifies role permissions.
- The task updates guards or authorization policies.
- The task protects or changes access to sensitive operations.

## Required Rules

- `../rules/backend/security-authz.md`
- `../rules/backend/api-contract-swagger.md`

## Inputs

- Permission target definition (who can do what).
- Affected endpoint list.
- Current role-to-capability matrix.

## Steps

1. Define least-privilege scope and impact boundary.
2. Apply guard and authorization checks at endpoint level.
3. Update 401/403 behavior documentation and response semantics.
4. Verify unauthenticated, unauthorized, and authorized scenarios.
5. Confirm existing roles do not gain accidental privilege expansion.

## Outputs

- Updated authorization logic.
- Permission verification results.
- API contract/documentation synchronization result.

## Post-Task Documentation Check

- If the permission model introduces new concepts: update `security-authz.md`.
- If a new repeated authorization validation pattern appears: update this skill.

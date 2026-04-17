---
name: new-backend-endpoint
description: Build or modify a NestJS backend API endpoint with consistent contract, DTOs, Swagger docs, and authorization. Use when the task mentions adding endpoint routes, changing endpoint behavior, request/response schema updates, or endpoint-level access control.
---

# New Backend API Endpoint

## Purpose

Deliver a backend API endpoint through a consistent implementation flow, reducing the chance of missing DTO design, Swagger alignment, and permission checks.

## Trigger Conditions

- The task adds a new API endpoint.
- The task changes existing endpoint behavior or endpoint contract.
- The task requires endpoint-level authorization setup.

## Required Rules

- `../rules/backend/nestjs-module.md`
- `../rules/backend/api-contract-swagger.md`
- If authorization is required: `../rules/backend/security-authz.md`

## Inputs

- Business intent and expected endpoint behavior.
- Expected request and response fields.
- Access control requirements (authentication and roles).

## Steps

1. Define endpoint contract and DTOs first.
2. Implement service logic; keep controller focused on orchestration and transport.
3. Add Swagger annotations and error response definitions.
4. Add guards and authorization checks when access control is required.
5. Run minimal verification and record outcomes.

## Outputs

- Working endpoint implementation.
- Swagger documentation aligned with the endpoint contract.
- Minimal verification result set (success, validation failure, unauthorized/forbidden).

## Post-Task Documentation Check

- If a new API pattern is introduced and not covered: update `.agent/rules/backend/*`.
- If a new repeated implementation checkpoint emerges: update this skill.

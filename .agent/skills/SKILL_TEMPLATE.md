# Skill Template

Use this template in `.agent/skills/<skill-name>/SKILL.md`.

```markdown
---
name: <skill-name>
description: <WHAT this skill does>. Use when <WHEN this skill should be loaded>.
---

# <Skill Title>

## Purpose

Describe the single workflow this skill standardizes and why it matters.

## Trigger Conditions

- Task condition 1
- Task condition 2

## Required Rules

- `../rules/...`

## Inputs

- Required context
- Preconditions to verify

## Steps

1. Step one
2. Step two
3. Step three

## Outputs

- Deliverable 1
- Minimal verification evidence

## Post-Task Documentation Check

- When to update related rules.
- When to update this skill.
```

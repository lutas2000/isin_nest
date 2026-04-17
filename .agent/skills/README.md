# .agent/skills Guide

This directory is the single source of truth for project-level skills.

## Standard Skill Format

Each skill must use this structure:

```text
.agent/skills/<skill-name>/SKILL.md
```

Rules:

- `<skill-name>` uses lowercase letters, numbers, and hyphens only.
- Each skill folder contains exactly one required file: `SKILL.md`.
- `SKILL.md` must start with YAML frontmatter:
  - `name`: unique skill id (same as folder name).
  - `description`: explicit WHAT + WHEN statement for skill discovery.

## Authoring Rules

- Write all skill content in English for consistent trigger matching.
- Keep one skill focused on one repeatable workflow.
- Define clear sections: Purpose, Trigger Conditions, Inputs, Steps, Outputs.
- Link only necessary rule files; avoid loading unrelated guidance.
- Update the skill when a repeated task pattern or validation checkpoint appears.

## Skill Discovery Workflow

1. Read `skills-index.md`.
2. Match task intent to trigger conditions.
3. Load only the selected skill folders.
4. Execute the workflow and record minimal verification evidence.

## Maintenance Rules

- After each task, decide whether a skill should be added or updated.
- If a task pattern repeats, codify it as a new skill.
- Keep descriptions specific enough to be machine-discoverable.

## Current Skills

- `new-backend-endpoint/SKILL.md`
- `entity-change-with-migration/SKILL.md`
- `permission-change/SKILL.md`
- `SKILL_TEMPLATE.md`
- `skills-index.md`

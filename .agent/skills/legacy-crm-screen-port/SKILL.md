---
name: legacy-crm-screen-port
description: Port a legacy sales screen (form, window, report dialog) from isin_vb6 into isin_nest /legacy-crm, keep it identical to isin_vb6, honour crm read-only, and prove it with the screen comparison and the e2e test. Use for 舊版銷管畫面、legacy CRM 前端、isin_vb6 元件搬移、第 4 階段單據與報表.
---

# Legacy CRM Screen Port

## Purpose

Move an isin_vb6 screen into `apps/frontend/src/legacy-crm/` without changing what the user sees or how the keys behave, while using the new system's login, permissions and API.

## Required Reading

- `docs/LEGACY-CRM-FRONTEND.md` (structure, porting rules, styles, known differences)
- `docs/LEGACY-CRM-API.md` (routes and response shapes; errors are `{ message }`)
- `.agent/rules/frontend/design-system.md` section「舊版銷管」

## Steps

1. Copy the component from `../isin_vb6/src/components/` (tag `v0-final`) under the same name. Bring in any `src/utils/*.js` it needs as `.ts`.
2. Switch the script to `<script setup lang="ts">`. Type the props, refs and function parameters.
3. Replace each `fetch('/api/x')` with `legacyGet('/x')` or `legacySend('/x', method, body)` from `services/legacyApi.ts`. Read `error.message`.
4. Handle read-only access:
   - `LegacyRecordToolbar` disables 新增, 更新 and 刪除 by itself.
   - Gate field editing with `useLegacyReadOnly()`.
   - Gate every other writing button with it as well.
5. Add the view to the `v-if` chain in `LegacyShell.vue`. Remove its 「尚未搬入」 case.
6. Use only `.legacy-*` classes, which are already in `styles/legacy.css`. Add a rule only if isin_vb6 has it.
   - For print CSS, scope `@page` and `@media print` to the legacy print pages.
7. Run `npx prettier --write` on the new files. Then run:
   - `npx eslint apps/frontend/src/legacy-crm`
   - `cd apps/frontend && npx tsc --noEmit` (the 17 existing errors are in the new CRM)
   - `npx vite build`
8. Verify against isin_vb6 (commands are in `LEGACY-CRM-FRONTEND.md`「本機執行」):
   - Add scenes for the screen to `scripts/legacy-crm/compare-screens.mjs`.
   - Run it. Only the status-bar corner may differ, unless the difference is one of the documented changes.
   - Extend `tests/legacy-crm/legacy-crm.spec.ts` for the screen's writes and its read-only state.

## Safety Rules

- Run the backend only against the throwaway test database (`legacy-crm/dev/serve-legacy-crm.ts`), never against production.
- Screenshots and the SQLite copy contain real data. Keep them outside the repo and delete them afterwards.
- Do not modify `../isin_vb6`. It is finished and is the reference.

## Post-Task Documentation Check

- Record any intended difference from isin_vb6 in `LEGACY-CRM-FRONTEND.md`「和 isin_vb6 不同的地方」.
- Update plan §10 status and the verification section with the comparison and test results.

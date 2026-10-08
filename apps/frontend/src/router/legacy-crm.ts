import type { RouteRecordRaw } from 'vue-router';

/**
 * 舊版銷管（LEGACY-CRM-REBUILD-PLAN.md 5.1）：單一入口 `/legacy-crm`，整頁是舊版的選單列、
 * MDI 子視窗與狀態列（`layout: 'legacy'`，不顯示新版側欄與頂欄），子視窗狀態留在畫面內，
 * 不用子 route。需要 `crm` read；只有 read 的人進入後是唯讀。
 */
export const legacyCrmRoutes: RouteRecordRaw[] = [
  {
    path: '/legacy-crm',
    name: 'LegacyCrm',
    component: () => import('../legacy-crm/LegacyShell.vue'),
    meta: {
      title: '舊版銷管系統',
      requiresAuth: true,
      feature: 'crm',
      layout: 'legacy',
    },
  },
];

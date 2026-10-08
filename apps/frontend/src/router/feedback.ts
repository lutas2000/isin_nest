import type { RouteRecordRaw } from 'vue-router';

/**
 * 回報處理（LEGACY-CRM-REBUILD-PLAN.md 7.2）：新系統的設定頁，任何登入者都能用，不設功能權限。
 */
export const feedbackRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/feedback',
    name: 'FeedbackReports',
    component: () => import('../views/FeedbackReports.vue'),
    meta: { title: '回報處理', icon: '📮', requiresAuth: true },
  },
];

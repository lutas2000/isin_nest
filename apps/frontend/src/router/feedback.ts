import type { RouteRecordRaw } from 'vue-router';
import { userHasFeature } from '../stores/auth';

/**
 * 回報處理（LEGACY-CRM-REBUILD-PLAN.md 7.2）：新系統的設定頁，admin 或 `feedback` write 可用。
 * 全域守衛只檢查 read，所以這裡另外要求 write；後端也會擋（403）。
 */
export const feedbackRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/feedback',
    name: 'FeedbackReports',
    component: () => import('../views/FeedbackReports.vue'),
    meta: { title: '回報處理', icon: '📮', requiresAuth: true },
    beforeEnter: () => {
      try {
        const user = JSON.parse(
          localStorage.getItem('auth_user') ?? 'null',
        ) as Parameters<typeof userHasFeature>[0];
        return userHasFeature(user, 'feedback', 'write') ? true : '/';
      } catch {
        return '/';
      }
    },
  },
];

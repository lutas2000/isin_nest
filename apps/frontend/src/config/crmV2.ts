/**
 * 新版 CRM（`/crm/*`、會計銷貨統計）暫不使用，現行為舊版銷管 `/legacy-crm`
 * （LEGACY-CRM-REBUILD-PLAN.md 第 6 節）。
 *
 * build 時以 `VITE_CRM_V2_ENABLED=true` 開啟，預設關閉：關閉時不註冊新版 CRM 路由、
 * 不顯示側欄與首頁的新版 CRM 區塊，bundle 也不含新版 CRM 頁面。
 * 開啟後仍需 `crm_v2` 功能權限（admin 不需授權），與後端 controller 的守衛一致。
 */
export const CRM_V2_ENABLED = import.meta.env.VITE_CRM_V2_ENABLED === 'true';

/** 新版 CRM 的功能權限名稱（後端 `crm/common/crm-v2-access.ts`）。 */
export const CRM_V2_FEATURE = 'crm_v2';

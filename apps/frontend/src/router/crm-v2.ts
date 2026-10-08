import type { RouteRecordRaw } from 'vue-router';
import { CRM_V2_ENABLED, CRM_V2_FEATURE } from '../config/crmV2';

/**
 * 新版 CRM 路由（LEGACY-CRM-REBUILD-PLAN.md 第 6 節：暫不使用，現行為 `/legacy-crm`）。
 *
 * 只有 build 時 `VITE_CRM_V2_ENABLED=true` 才註冊，且需要 `crm_v2` 功能權限；
 * 預設關閉時只留下導回首頁的路由，頁面元件不會進 bundle。
 * 會計的銷貨統計讀的是新版 CRM 的銷貨單，一併歸在這裡。
 * 不可引用 `legacy-crm`（eslint.config.mjs 的 no-restricted-imports）。
 */
const meta = (title: string, icon: string) => ({
  title,
  icon,
  requiresAuth: true,
  feature: CRM_V2_FEATURE,
});

const enabledRoutes: RouteRecordRaw[] = [
  {
    path: '/crm',
    name: 'CRMCustomers',
    component: () => import('../views/CRM/Customers.vue'),
    meta: meta('客戶', '🤝'),
  },
  {
    path: '/crm/contacts',
    name: 'CRMContacts',
    component: () => import('../views/CRM/Contacts.vue'),
    meta: meta('聯絡人管理', '👤'),
  },
  {
    path: '/crm/contacts/:customerId',
    name: 'CRMContactsByCustomer',
    component: () => import('../views/CRM/Contacts.vue'),
    meta: meta('聯絡人管理', '👤'),
  },
  {
    path: '/crm/orders',
    name: 'CRMOrders',
    component: () => import('../views/CRM/Orders.vue'),
    meta: meta('訂單管理', '📋'),
  },
  {
    path: '/crm/orders/:id/items',
    name: 'CRMOrderItems',
    component: () => import('../views/CRM/OrderItems.vue'),
    meta: meta('訂單詳情', '📋'),
  },
  {
    path: '/crm/sales-vouchers',
    name: 'CRMSalesVouchers',
    component: () => import('../views/CRM/SalesVouchers.vue'),
    meta: meta('銷貨單', '🧾'),
  },
  {
    path: '/crm/sales-vouchers/:id/items',
    name: 'CRMSalesVoucherItems',
    component: () => import('../views/CRM/SalesVoucherItems.vue'),
    meta: meta('銷貨單明細', '🧾'),
  },
  {
    path: '/crm/design-work-orders',
    name: 'CRMDesignWorkOrders',
    component: () => import('../views/CRM/DesignWorkOrders.vue'),
    meta: meta('設計工作單', '✏️'),
  },
  {
    path: '/crm/design-work-orders/:id',
    name: 'CRMDesignWorkOrderDetail',
    component: () => import('../views/CRM/DesignWorkOrder.vue'),
    meta: meta('設計工作單詳情', '✏️'),
  },
  {
    path: '/crm/design-work-orders/:id/cnc-preview',
    name: 'CRMDesignWorkOrderCncPreview',
    component: () => import('../views/CRM/DesignWorkOrderCncPreview.vue'),
    meta: meta('CNC 預覽', '✏️'),
  },
  {
    path: '/crm/cutting-work-orders',
    name: 'CRMCuttingWorkOrders',
    component: () => import('../views/CRM/CuttingWorkOrders.vue'),
    meta: meta('切割工作單', '✂️'),
  },
  {
    path: '/crm/processing-work-orders',
    name: 'CRMProcessingWorkOrders',
    component: () => import('../views/CRM/ProcessingWorkOrders.vue'),
    meta: meta('加工工作單', '🔧'),
  },
  {
    path: '/crm/processings',
    name: 'CRMProcessingList',
    component: () => import('../views/CRM/ProcessingList.vue'),
    meta: meta('加工項目管理', '⚙️'),
  },
  {
    path: '/crm/delivery-work-orders',
    name: 'CRMDeliveryWorkOrders',
    component: () => import('../views/CRM/DeliveryWorkOrders.vue'),
    meta: meta('送貨工作單', '🚚'),
  },
  {
    path: '/crm/nestings',
    name: 'CRMNestingManagement',
    component: () => import('../views/CRM/nesting/NestingManagement.vue'),
    meta: meta('排版管理', '📐'),
  },
  {
    path: '/crm/nestings/:id/items',
    name: 'CRMNestingItems',
    component: () => import('../views/CRM/nesting/NestingItems.vue'),
    meta: meta('排版工件', '📐'),
  },
  {
    path: '/crm/vendors',
    name: 'CRMVendors',
    component: () => import('../views/CRM/Vendors.vue'),
    meta: meta('廠商管理', '🏭'),
  },
  {
    path: '/crm/quotes',
    name: 'CRMQuotes',
    component: () => import('../views/CRM/Quotes.vue'),
    meta: meta('報價管理', '💰'),
  },
  {
    path: '/crm/quotes/:id/items',
    name: 'CRMQuoteItems',
    component: () => import('../views/CRM/QuoteItems.vue'),
    meta: meta('報價單詳情', '💰'),
  },
  {
    path: '/accounting/sales-statistics',
    name: 'AccountingSalesStatistics',
    component: () => import('../views/Accounting/SalesStatistics.vue'),
    meta: meta('銷貨單', '📈'),
  },
  {
    path: '/accounting/sales-statistics/items',
    name: 'AccountingSalesStatisticsItems',
    component: () => import('../views/Accounting/SalesStatisticsItems.vue'),
    meta: meta('銷貨明細', '📋'),
  },
];

/** 關閉時：`/crm`、`/crm/*`、`/accounting/*` 一律導回首頁（含舊書籤）。 */
const disabledRoutes: RouteRecordRaw[] = [
  { path: '/crm/:pathMatch(.*)*', redirect: '/' },
  { path: '/accounting/:pathMatch(.*)*', redirect: '/' },
];

export const crmV2Routes: RouteRecordRaw[] = CRM_V2_ENABLED
  ? enabledRoutes
  : disabledRoutes;

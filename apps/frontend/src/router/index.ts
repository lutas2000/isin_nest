import { createRouter, createWebHistory, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import Home from '../views/Home.vue'
import Production from '../views/Production.vue'
import HRStaff from '../views/HR/Staff.vue'
import HRAttendance from '../views/HR/Attendance.vue'
import HRManhour from '../views/HR/Manhour.vue'
import HRLeave from '../views/HR/Leave.vue'
import HRStaffSegment from '../views/HR/StaffSegment.vue'
import HRStaffVacation from '../views/HR/StaffVacation.vue'
import CRMCustomers from '../views/CRM/Customers.vue'
import CRMContacts from '../views/CRM/Contacts.vue'
import CRMOrders from '../views/CRM/Orders.vue'
import CRMOrderItems from '../views/CRM/OrderItems.vue'
import CRMDesignWorkOrders from '../views/CRM/DesignWorkOrders.vue'
import CRMDesignWorkOrderCncPreview from '../views/CRM/DesignWorkOrderCncPreview.vue'
import CRMCuttingWorkOrders from '../views/CRM/CuttingWorkOrders.vue'
import CRMProcessingWorkOrders from '../views/CRM/ProcessingWorkOrders.vue'
import CRMProcessingList from '../views/CRM/ProcessingList.vue'
import CRMDeliveryWorkOrders from '../views/CRM/DeliveryWorkOrders.vue'
import CRMNestingManagement from '../views/CRM/nesting/NestingManagement.vue'
import CRMNestingItems from '../views/CRM/nesting/NestingItems.vue'
import CRMQuotes from '../views/CRM/Quotes.vue'
import CRMQuoteItems from '../views/CRM/QuoteItems.vue'
import CRMVendors from '../views/CRM/Vendors.vue'
import Settings from '../views/Settings.vue'
import Login from '../views/Login.vue'
import ResetPassword from '../views/ResetPassword.vue'
import Profile from '../views/Profile.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登入', requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { title: '重設密碼', requiresAuth: true }
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '儀表板', icon: '🏠', requiresAuth: true }
  },
  {
    path: '/production',
    name: 'Production',
    component: Production,
    meta: { title: '生產管理', icon: '⚙️', requiresAuth: true }
  },
  {
    path: '/hr/staff',
    name: 'HRStaff',
    component: HRStaff,
    meta: { title: '員工管理', icon: '👨‍💼', requiresAuth: true }
  },
  {
    path: '/hr/attendance',
    name: 'HRAttendance',
    component: HRAttendance,
    meta: { title: '出勤管理', icon: '📅', requiresAuth: true }
  },
  {
    path: '/hr/manhour',
    name: 'HRManhour',
    component: HRManhour,
    meta: { title: '工時管理', icon: '⏰', requiresAuth: true }
  },
  {
    path: '/hr/leave',
    name: 'HRLeave',
    component: HRLeave,
    meta: { title: '請假管理', icon: '🏖️', requiresAuth: true }
  },
  {
    path: '/hr/staff-segment',
    name: 'HRStaffSegment',
    component: HRStaffSegment,
    meta: { title: '員工段別管理', icon: '⏰', requiresAuth: true }
  },
  {
    path: '/hr/staff-vacation',
    name: 'HRStaffVacation',
    component: HRStaffVacation,
    meta: { title: '員工假期管理', icon: '📅', requiresAuth: true }
  },
  {
    path: '/crm',
    name: 'CRMCustomers',
    component: CRMCustomers,
    meta: { title: '客戶', icon: '🤝', requiresAuth: true }
  },
  {
    path: '/crm/contacts',
    name: 'CRMContacts',
    component: CRMContacts,
    meta: { title: '聯絡人管理', icon: '👤', requiresAuth: true }
  },
  {
    path: '/crm/contacts/:customerId',
    name: 'CRMContactsByCustomer',
    component: CRMContacts,
    meta: { title: '聯絡人管理', icon: '👤', requiresAuth: true }
  },
  {
    path: '/crm/orders',
    name: 'CRMOrders',
    component: CRMOrders,
    meta: { title: '訂單管理', icon: '📋', requiresAuth: true }
  },
  {
    path: '/crm/orders/:id/items',
    name: 'CRMOrderItems',
    component: CRMOrderItems,
    meta: { title: '訂單詳情', icon: '📋', requiresAuth: true }
  },
  {
    path: '/crm/design-work-orders',
    name: 'CRMDesignWorkOrders',
    component: CRMDesignWorkOrders,
    meta: { title: '設計工作單', icon: '✏️', requiresAuth: true }
  },
  {
    path: '/crm/design-work-orders/:id/cnc-preview',
    name: 'CRMDesignWorkOrderCncPreview',
    component: CRMDesignWorkOrderCncPreview,
    meta: { title: 'CNC 預覽', icon: '✏️', requiresAuth: true }
  },
  {
    path: '/crm/cutting-work-orders',
    name: 'CRMCuttingWorkOrders',
    component: CRMCuttingWorkOrders,
    meta: { title: '切割工作單', icon: '✂️', requiresAuth: true }
  },
  {
    path: '/crm/processing-work-orders',
    name: 'CRMProcessingWorkOrders',
    component: CRMProcessingWorkOrders,
    meta: { title: '加工工作單', icon: '🔧', requiresAuth: true }
  },
  {
    path: '/crm/processings',
    name: 'CRMProcessingList',
    component: CRMProcessingList,
    meta: { title: '加工項目管理', icon: '⚙️', requiresAuth: true }
  },
  {
    path: '/crm/delivery-work-orders',
    name: 'CRMDeliveryWorkOrders',
    component: CRMDeliveryWorkOrders,
    meta: { title: '送貨工作單', icon: '🚚', requiresAuth: true }
  },
  {
    path: '/crm/nestings',
    name: 'CRMNestingManagement',
    component: CRMNestingManagement,
    meta: { title: '排版管理', icon: '📐', requiresAuth: true }
  },
  {
    path: '/crm/nestings/:id/items',
    name: 'CRMNestingItems',
    component: CRMNestingItems,
    meta: { title: '排版工件', icon: '📐', requiresAuth: true }
  },
  {
    path: '/crm/vendors',
    name: 'CRMVendors',
    component: CRMVendors,
    meta: { title: '廠商管理', icon: '🏭', requiresAuth: true }
  },
  {
    path: '/crm/quotes',
    name: 'CRMQuotes',
    component: CRMQuotes,
    meta: { title: '報價管理', icon: '💰', requiresAuth: true }
  },
  {
    path: '/crm/quotes/:id/items',
    name: 'CRMQuoteItems',
    component: CRMQuoteItems,
    meta: { title: '報價單詳情', icon: '💰', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '系統設定', icon: '⚙️', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { title: '個人資料', icon: '👤', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to: RouteLocationNormalized, _: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 設置頁面標題
  document.title = to.meta.title ? `${to.meta.title} - ISIN CNC 管理系統` : 'ISIN CNC 管理系統'
  
  // 檢查是否需要認證
  if (to.meta.requiresAuth) {
    // 從 localStorage 檢查是否有 token
    const token = localStorage.getItem('auth_token')
    const user = localStorage.getItem('auth_user')
    
    if (!token || !user) {
      // 未登入，跳轉到登入頁面
      next('/login')
      return
    }
    
          // 有 token，檢查是否有效
      try {
        const userData = JSON.parse(user)
        if (!userData.userName) {
          throw new Error('Invalid user data')
        }
        next()
      } catch (error) {
      // 用戶數據無效，清除並跳轉到登入頁面
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      next('/login')
      return
    }
  } else {
    // 不需要認證的頁面（如登入頁面）
    if (to.path === '/login') {
      // 如果已經登入，跳轉到首頁
      const token = localStorage.getItem('auth_token')
      const user = localStorage.getItem('auth_user')
      if (token && user) {
        next('/')
        return
      }
    }
    next()
  }
})

export default router

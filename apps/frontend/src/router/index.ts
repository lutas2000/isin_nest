import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Sales from '../views/Sales.vue'
import Production from '../views/Production.vue'
import Inventory from '../views/Inventory.vue'
import HR from '../views/HR.vue'
import HRStaff from '../views/HR/Staff.vue'
import HRAttendance from '../views/HR/Attendance.vue'
import HRManhour from '../views/HR/Manhour.vue'
import HRLeave from '../views/HR/Leave.vue'
import CRM from '../views/CRM.vue'
import CRMOrders from '../views/CRM/Orders.vue'
import CRMQuotes from '../views/CRM/Quotes.vue'
import Auth from '../views/Auth.vue'
import Settings from '../views/Settings.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '儀表板', icon: '🏠' }
  },
  {
    path: '/sales',
    name: 'Sales',
    component: Sales,
    meta: { title: '銷售管理', icon: '📊' }
  },
  {
    path: '/production',
    name: 'Production',
    component: Production,
    meta: { title: '生產管理', icon: '⚙️' }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: Inventory,
    meta: { title: '庫存管理', icon: '📦' }
  },
  {
    path: '/hr',
    name: 'HR',
    component: HR,
    meta: { title: '人力資源管理', icon: '👥' }
  },
  {
    path: '/hr/staff',
    name: 'HRStaff',
    component: HRStaff,
    meta: { title: '員工管理', icon: '👨‍💼' }
  },
  {
    path: '/hr/attendance',
    name: 'HRAttendance',
    component: HRAttendance,
    meta: { title: '出勤管理', icon: '📅' }
  },
  {
    path: '/hr/manhour',
    name: 'HRManhour',
    component: HRManhour,
    meta: { title: '工時管理', icon: '⏰' }
  },
  {
    path: '/hr/leave',
    name: 'HRLeave',
    component: HRLeave,
    meta: { title: '請假管理', icon: '🏖️' }
  },
  {
    path: '/crm',
    name: 'CRM',
    component: CRM,
    meta: { title: '客戶關係管理', icon: '🤝' }
  },
  {
    path: '/crm/orders',
    name: 'CRMOrders',
    component: CRMOrders,
    meta: { title: '訂單管理', icon: '📋' }
  },
  {
    path: '/crm/quotes',
    name: 'CRMQuotes',
    component: CRMQuotes,
    meta: { title: '報價管理', icon: '💰' }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: Auth,
    meta: { title: '認證管理', icon: '🔐' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '系統設定', icon: '⚙️' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - ISIN CNC 管理系統` : 'ISIN CNC 管理系統'
  next()
})

export default router

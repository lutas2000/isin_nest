import { createRouter, createWebHistory, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import Home from '../views/Home.vue'
import { hrRoutes } from './hr'
import { legacyCrmRoutes } from './legacy-crm'
import { crmV2Routes } from './crm-v2'
import { userHasFeature } from '../stores/auth'
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
  ...hrRoutes,
  ...legacyCrmRoutes,
  ...crmV2Routes,
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
      // 未登入，跳轉到登入頁面；登入後回到原本要去的頁面
      next(to.path === '/' ? '/login' : { path: '/login', query: { redirect: to.fullPath } })
      return
    }
    
          // 有 token，檢查是否有效
      try {
        const userData = JSON.parse(user)
        if (!userData.userName) {
          throw new Error('Invalid user data')
        }
        if (to.meta.requiresAdmin && !userData.isAdmin) {
          next('/')
          return
        }
        // 需要功能權限的頁面（例如舊版銷管的 `crm`），沒有權限導回首頁
        if (typeof to.meta.feature === 'string' && !userHasFeature(userData, to.meta.feature)) {
          next('/')
          return
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

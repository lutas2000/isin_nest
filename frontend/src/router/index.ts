import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import HR from '../views/HR.vue'
import Auth from '../views/Auth.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首頁' }
  },
  {
    path: '/hr',
    name: 'HR',
    component: HR,
    meta: { title: '人力資源管理' }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: Auth,
    meta: { title: '認證管理' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - ISIN 管理系統` : 'ISIN 管理系統'
  next()
})

export default router

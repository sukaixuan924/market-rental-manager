import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/AuthView.vue')
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/record/:stallId?',
      name: 'record',
      component: () => import('@/views/RecordView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UserManagementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 路由守卫 - 延迟获取store避免初始化问题
router.beforeEach(async (to, from, next) => {
  try {
    // 动态导入store避免初始化顺序问题
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    // 需要登录的页面
    if (to.meta.requiresAuth && !authStore.token) {
      next({ name: 'login' })
      return
    }
    
    // 需要管理员权限的页面
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next({ name: 'home' })
      return
    }
    
    // 已登录用户访问登录页
    if (to.name === 'login' && authStore.token) {
      next({ name: 'home' })
      return
    }
    
    next()
  } catch (e) {
    // 如果store未初始化，重定向到登录页
    if (to.meta.requiresAuth) {
      next({ name: 'login' })
    } else {
      next()
    }
  }
})

export default router
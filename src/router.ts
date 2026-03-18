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
      path: '/share/:id?',
      name: 'share',
      component: () => import('@/views/ShareView.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 路由守卫 - 直接检查localStorage，避免Pinia初始化问题
router.beforeEach((to, from, next) => {
  // 直接从localStorage检查登录状态
  const authData = localStorage.getItem('market_auth')
  const isLoggedIn = authData ? JSON.parse(authData).token : null
  
  // 需要登录的页面
  if (to.meta.requiresAuth) {
    if (!isLoggedIn) {
      next({ name: 'login' })
      return
    }
  }
  
  // 需要管理员权限的页面 - 暂时跳过检查，让页面加载后再检查
  if (to.meta.requiresAdmin) {
    // 管理员检查在页面组件中进行
  }
  
  // 已登录用户访问登录页
  if (to.name === 'login' && isLoggedIn) {
    next({ name: 'home' })
    return
  }
  
  next()
})

export default router
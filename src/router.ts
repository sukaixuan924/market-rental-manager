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
      meta: { requiresAuth: true, requiresWrite: true }
    },
    {
      path: '/record/:stallId?',
      name: 'record',
      component: () => import('@/views/RecordView.vue'),
      meta: { requiresAuth: true, requiresWrite: true }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true, requiresWrite: true }
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
  const isReadonly = localStorage.getItem('market_readonly') === 'true'
  
  // 分享模式检查 - 如果进入需要写权限的页面且是只读模式，重定向回分享页
  if (to.meta.requiresWrite && isReadonly) {
    // 允许停留在分享页
    if (to.name === 'share') {
      next()
      return
    }
    // 其他需要写权限的页面，阻止访问
    next({ name: 'share' })
    return
  }
  
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
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/auth'
import { userAPI } from '@/services/api'

const AUTH_KEY = 'market_auth'

// 简单哈希
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  // 初始化
  const init = () => {
    const authData = localStorage.getItem(AUTH_KEY)
    if (authData) {
      try {
        const auth = JSON.parse(authData)
        if (auth.token && auth.user) {
          currentUser.value = auth.user
          token.value = auth.token
        }
      } catch (e) {
        console.error('解析登录状态失败', e)
      }
    }
  }

  // 保存登录状态
  const saveAuth = (user: User, authToken: string) => {
    currentUser.value = user
    token.value = authToken
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token: authToken }))
  }

  // 登录
  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    loading.value = true
    try {
      const result = await userAPI.login(username, password)
      saveAuth(result.user, result.token)
      return { success: true, message: '登录成功' }
    } catch (e: any) {
      return { success: false, message: e.message }
    } finally {
      loading.value = false
    }
  }

  // 注册
  const register = async (username: string, password: string, nickname?: string): Promise<{ success: boolean; message: string }> => {
    loading.value = true
    try {
      const result = await userAPI.register(username, password, nickname)
      saveAuth(result.user, result.token)
      return { success: true, message: '注册成功' }
    } catch (e: any) {
      return { success: false, message: e.message }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = () => {
    currentUser.value = null
    token.value = null
    localStorage.removeItem(AUTH_KEY)
  }

  // 是否管理员
  const isAdmin = computed(() => currentUser.value?.role === 'admin')

  // 初始化
  init()

  return {
    currentUser,
    token,
    loading,
    isAdmin,
    login,
    register,
    logout,
    init
  }
})
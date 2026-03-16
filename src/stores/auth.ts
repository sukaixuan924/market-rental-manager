import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/auth'

const USERS_KEY = 'market_users'
const AUTH_KEY = 'market_auth'

// 简单哈希（生产环境应使用bcrypt）
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

  // 加载用户列表
  const getUsers = (): User[] => {
    const data = localStorage.getItem(USERS_KEY)
    return data ? JSON.parse(data) : []
  }

  // 保存用户列表
  const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  }

  // 初始化 - 检查是否已登录 + 初始化管理员账号
  const init = () => {
    // 确保管理员账号存在
    const users = getUsers()
    if (!users.find(u => u.username === 'admin')) {
      users.push({
        id: 'admin001',
        username: 'admin',
        passwordHash: simpleHash('admin123'),
        nickname: '管理员',
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: ''
      })
      saveUsers(users)
    }
    
    const authData = localStorage.getItem(AUTH_KEY)
    if (authData) {
      const auth = JSON.parse(authData)
      if (auth.token && auth.user) {
        currentUser.value = auth.user
        token.value = auth.token
      }
    }
  }

  // 注册
  const register = (username: string, password: string, nickname?: string): { success: boolean; message: string } => {
    const users = getUsers()
    
    if (users.find(u => u.username === username)) {
      return { success: false, message: '账号已存在' }
    }

    const newUser: User = {
      id: generateId(),
      username,
      passwordHash: simpleHash(password),
      nickname: nickname || username,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: ''
    }

    users.push(newUser)
    saveUsers(users)

    // 自动登录
    const authToken = generateId()
    currentUser.value = newUser
    token.value = authToken
    saveAuth(newUser, authToken)

    return { success: true, message: '注册成功' }
  }

  // 登录
  const login = (username: string, password: string): { success: boolean; message: string } => {
    const users = getUsers()
    const user = users.find(u => u.username === username)

    if (!user) {
      return { success: false, message: '账号不存在' }
    }

    if (user.status === 'disabled') {
      return { success: false, message: '账号已被禁用' }
    }

    if (user.passwordHash !== simpleHash(password)) {
      return { success: false, message: '密码错误' }
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date().toISOString()
    saveUsers(users)

    // 生成token
    const authToken = generateId()
    currentUser.value = user
    token.value = authToken
    saveAuth(user, authToken)

    return { success: true, message: '登录成功' }
  }

  // 登出
  const logout = () => {
    currentUser.value = null
    token.value = null
    localStorage.removeItem(AUTH_KEY)
  }

  // 保存登录状态
  const saveAuth = (user: User, authToken: string) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      user,
      token: authToken
    }))
  }

  // 获取所有用户（管理员）
  const getAllUsers = (): User[] => {
    return getUsers().map(u => ({ ...u, passwordHash: '***' }))
  }

  // 禁用/启用用户
  const toggleUserStatus = (userId: string) => {
    const users = getUsers()
    const user = users.find(u => u.id === userId)
    if (user) {
      user.status = user.status === 'active' ? 'disabled' : 'active'
      saveUsers(users)
    }
  }

  // 重置用户密码
  const resetPassword = (userId: string, newPassword: string) => {
    const users = getUsers()
    const user = users.find(u => u.id === userId)
    if (user) {
      user.passwordHash = simpleHash(newPassword)
      saveUsers(users)
    }
  }

  // 判断是否管理员
  const isAdmin = computed(() => currentUser.value?.role === 'admin')

  // 初始化
  init()

  return {
    currentUser,
    token,
    isAdmin,
    register,
    login,
    logout,
    getAllUsers,
    toggleUserStatus,
    resetPassword,
    init
  }
})

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
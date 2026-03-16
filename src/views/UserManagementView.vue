<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { User } from '@/types/auth'

const authStore = useAuthStore()

const searchKeyword = ref('')
const statusFilter = ref('all')
const showCreateDialog = ref(false)
const showResetDialog = ref(false)
const selectedUser = ref<User | null>(null)

// 新用户表单
const newUser = ref({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})

// 重置密码表单
const resetPassword = ref({
  newPassword: '',
  confirmPassword: '',
  forceChange: true
})

// 筛选用户
const filteredUsers = computed(() => {
  let users = authStore.getAllUsers()
  
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    users = users.filter(u => 
      u.username.toLowerCase().includes(kw) || 
      u.nickname.toLowerCase().includes(kw)
    )
  }
  
  if (statusFilter.value !== 'all') {
    users = users.filter(u => u.status === statusFilter.value)
  }
  
  return users
})

// 创建用户
const handleCreateUser = async () => {
  if (!newUser.value.username || !newUser.value.password) {
    ElMessage.warning('请填写账号和密码')
    return
  }
  
  if (newUser.value.password !== newUser.value.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }

  // 手动创建用户
  const users = JSON.parse(localStorage.getItem('market_users') || '[]')
  
  if (users.find((u: User) => u.username === newUser.value.username)) {
    ElMessage.error('账号已存在')
    return
  }

  const user: User = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    username: newUser.value.username,
    passwordHash: simpleHash(newUser.value.password),
    nickname: newUser.value.nickname || newUser.value.username,
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: ''
  }

  users.push(user)
  localStorage.setItem('market_users', JSON.stringify(users))
  
  ElMessage.success('用户创建成功')
  showCreateDialog.value = false
  newUser.value = { username: '', password: '', confirmPassword: '', nickname: '' }
}

// 打开重置密码弹窗
const openResetDialog = (user: User) => {
  selectedUser.value = user
  resetPassword.value = { newPassword: '', confirmPassword: '', forceChange: true }
  showResetDialog.value = true
}

// 重置密码
const handleResetPassword = async () => {
  if (!resetPassword.value.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  
  if (resetPassword.value.newPassword !== resetPassword.value.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }

  authStore.resetPassword(selectedUser.value!.id, resetPassword.value.newPassword)
  ElMessage.success('密码重置成功')
  showResetDialog.value = false
}

// 切换用户状态
const handleToggleStatus = async (user: User) => {
  await ElMessageBox.confirm(
    `确定要${user.status === 'active' ? '禁用' : '启用'}用户 "${user.nickname}" 吗？`,
    '提示'
  )
  authStore.toggleUserStatus(user.id)
  ElMessage.success(user.status === 'active' ? '已禁用' : '已启用')
}

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

// 初始化管理员账号
onMounted(() => {
  const users = JSON.parse(localStorage.getItem('market_users') || '[]')
  if (!users.find((u: User) => u.username === 'admin')) {
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
    localStorage.setItem('market_users', JSON.stringify(users))
  }
})
</script>

<template>
  <div class="user-management">
    <div class="page-header">
      <h2>👤 用户管理</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        + 创建用户
      </el-button>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索账号/昵称"
        style="width: 200px"
        clearable
      />
      <el-select v-model="statusFilter" placeholder="状态" style="width: 120px">
        <el-option label="全部" value="all" />
        <el-option label="正常" value="active" />
        <el-option label="已禁用" value="disabled" />
      </el-select>
    </div>

    <!-- 用户列表 -->
    <el-table :data="filteredUsers" stripe>
      <el-table-column prop="username" label="账号" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column label="角色">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '正常' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间">
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleDateString() }}
        </template>
      </el-table-column>
      <el-table-column label="最后登录">
        <template #default="{ row }">
          {{ row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : '从未' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="openResetDialog(row)">重置密码</el-button>
          <el-button 
            size="small" 
            :type="row.status === 'active' ? 'danger' : 'success'"
            @click="handleToggleStatus(row)"
          >
            {{ row.status === 'active' ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建用户弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建新用户" width="400px">
      <el-form label-width="80px">
        <el-form-item label="账号" required>
          <el-input v-model="newUser.username" placeholder="唯一账号" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="newUser.password" type="password" placeholder="登录密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="newUser.confirmPassword" type="password" placeholder="再次输入密码" show-password />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="newUser.nickname" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateUser">创建</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="showResetDialog" title="重置用户密码" width="400px">
      <div v-if="selectedUser" style="margin-bottom: 20px;">
        用户：{{ selectedUser.nickname }} ({{ selectedUser.username }})
      </div>
      <el-form label-width="80px">
        <el-form-item label="新密码" required>
          <el-input v-model="resetPassword.newPassword" type="password" placeholder="输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="resetPassword.confirmPassword" type="password" placeholder="再次输入" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-management {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
</style>
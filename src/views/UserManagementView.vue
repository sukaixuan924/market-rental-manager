<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userAPI } from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const users = ref<any[]>([])
const loading = ref(false)

// 创建用户对话框
const showCreateDialog = ref(false)
const createForm = ref({
  username: '',
  password: '',
  nickname: '',
  role: 'user'
})
const createLoading = ref(false)

// 重置密码对话框
const showResetDialog = ref(false)
const resetUserId = ref('')
const resetUserName = ref('')
const resetPassword = ref('123456')
const resetLoading = ref(false)

const loadUsers = async () => {
  loading.value = true
  try {
    users.value = await userAPI.getAll()
  } catch (e: any) {
    ElMessage.error('加载用户失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

const handleCreateUser = async () => {
  if (!createForm.value.username || !createForm.value.password) {
    ElMessage.warning('请填写账号和密码')
    return
  }
  
  createLoading.value = true
  try {
    await userAPI.createUser(createForm.value)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    createForm.value = { username: '', password: '', nickname: '', role: 'user' }
    loadUsers()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    createLoading.value = false
  }
}

const handleDisableUser = async (user: any) => {
  try {
    await ElMessageBox.confirm(`确定要禁用用户"${user.nickname}"吗？`, '提示', {
      type: 'warning'
    })
    await userAPI.disableUser(user.id)
    ElMessage.success('已禁用')
    loadUsers()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleEnableUser = async (user: any) => {
  try {
    await userAPI.enableUser(user.id)
    ElMessage.success('已启用')
    loadUsers()
  } catch (e: any) {
    ElMessage.error('操作失败')
  }
}

const openResetPassword = (user: any) => {
  resetUserId.value = user.id
  resetUserName.value = user.nickname
  resetPassword.value = '123456'
  showResetDialog.value = true
}

const handleResetPassword = async () => {
  if (!resetPassword.value) {
    ElMessage.warning('请输入新密码')
    return
  }
  
  resetLoading.value = true
  try {
    const result = await userAPI.resetPassword(resetUserId.value, resetPassword.value)
    ElMessage.success(`密码已重置为: ${result.password}`)
    showResetDialog.value = false
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    resetLoading.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="user-management">
    <div class="page-header">
      <h2>👤 用户管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          + 创建用户
        </el-button>
        <el-button @click="loadUsers">
          刷新
        </el-button>
      </div>
    </div>

    <el-table :data="users" stripe v-loading="loading">
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
      <el-table-column prop="created_at" label="注册时间">
        <template #default="{ row }">
          {{ row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="last_login_at" label="最后登录">
        <template #default="{ row }">
          {{ row.last_login_at ? new Date(row.last_login_at).toLocaleDateString() : '从未' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button 
              v-if="row.status === 'active'" 
              size="small" 
              type="danger"
              @click="handleDisableUser(row)"
            >
              禁用
            </el-button>
            <el-button 
              v-else 
              size="small" 
              type="success"
              @click="handleEnableUser(row)"
            >
              启用
            </el-button>
            <el-button 
              size="small" 
              type="warning"
              @click="openResetPassword(row)"
            >
              重置密码
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建用户对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建用户" width="400px">
      <el-form :model="createForm" label-width="60px">
        <el-form-item label="账号" required>
          <el-input v-model="createForm.username" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="createForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateUser">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showResetDialog" title="重置密码" width="400px">
      <p>用户: <strong>{{ resetUserName }}</strong></p>
      <el-form label-width="60px" style="margin-top: 20px">
        <el-form-item label="新密码">
          <el-input v-model="resetPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="handleResetPassword">
          确认重置
        </el-button>
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

.header-actions {
  display: flex;
  gap: 10px;
}

.el-dialog p {
  margin: 0;
  padding: 10px 0;
}
</style>
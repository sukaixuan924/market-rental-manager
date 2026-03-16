<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userAPI } from '@/services/api'

const users = ref<any[]>([])
const loading = ref(false)

const loadUsers = async () => {
  loading.value = true
  try {
    users.value = await userAPI.getAll()
  } catch (e) {
    console.error('加载用户失败', e)
  } finally {
    loading.value = false
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
      <el-button type="primary" @click="loadUsers">
        刷新
      </el-button>
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
    </el-table>
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
</style>
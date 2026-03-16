<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const nickname = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('请填写完整信息')
    return
  }

  if (!isLogin.value && password.value !== confirmPassword.value) {
    ElMessage.warning('两次密码不一致')
    return
  }

  loading.value = true

  try {
    if (isLogin.value) {
      const result = await authStore.login(username.value, password.value)
      if (result.success) {
        ElMessage.success(result.message)
        router.push('/')
      } else {
        ElMessage.error(result.message)
      }
    } else {
      const result = await authStore.register(username.value, password.value, nickname.value)
      if (result.success) {
        ElMessage.success(result.message)
        router.push('/')
      } else {
        ElMessage.error(result.message)
      }
    }
  } finally {
    loading.value = false
  }
}

const switchMode = () => {
  isLogin.value = !isLogin.value
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  nickname.value = ''
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>🏪 市场日租管理系统</h1>
        <p>{{ isLogin ? '登录您的账号' : '创建新账号' }}</p>
      </div>

      <el-form @submit.prevent="handleSubmit" class="auth-form">
        <el-form-item>
          <el-input 
            v-model="username" 
            placeholder="账号" 
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item v-if="!isLogin">
          <el-input 
            v-model="nickname" 
            placeholder="昵称（可选）" 
            prefix-icon="UserFilled"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <el-input 
            v-model="password" 
            type="password" 
            placeholder="密码" 
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item v-if="!isLogin">
          <el-input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="确认密码" 
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-button 
          type="primary" 
          size="large" 
          :loading="loading"
          @click="handleSubmit"
          class="submit-btn"
        >
          {{ isLogin ? '登录' : '注册' }}
        </el-button>
      </el-form>

      <div class="auth-footer">
        <span>{{ isLogin ? '还没有账号？' : '已有账号？' }}</span>
        <a href="#" @click.prevent="switchMode">{{ isLogin ? '立即注册' : '立即登录' }}</a>
      </div>

      <div class="demo-tip" v-if="isLogin">
        <el-alert title="演示账号: admin / admin123" type="info" :closable="false" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
}

.auth-header h1 {
  font-size: 24px;
  margin: 0 0 10px;
  color: #333;
}

.auth-header p {
  color: #666;
  margin: 0;
}

.auth-form {
  margin-bottom: 20px;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.auth-footer {
  text-align: center;
  color: #666;
}

.auth-footer a {
  color: #667eea;
  text-decoration: none;
  margin-left: 5px;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.demo-tip {
  margin-top: 20px;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 30px 20px;
  }
}
</style>
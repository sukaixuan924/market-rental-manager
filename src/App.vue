<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { 
  HomeFilled, Calendar, DataAnalysis, Setting, User, SwitchButton
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 检测是否为移动端
const isMobile = ref(window.innerWidth < 768)

// 监听窗口大小变化
onMounted(() => {
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
})

const activeTab = computed({
  get: () => route.name as string,
  set: (val: string) => router.push({ name: val })
})

// 移动端底部导航
const mobileTabs = [
  { name: 'home', label: '首页', icon: HomeFilled },
  { name: 'record', label: '记录', icon: Calendar },
  { name: 'stats', label: '统计', icon: DataAnalysis },
  { name: 'settings', label: '设置', icon: Setting }
]

// 登出
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

// 跳转到用户管理
const goToUserManagement = () => {
  router.push('/users')
}
</script>

<template>
  <div class="app-container" :class="{ 'is-mobile': isMobile }">
    <!-- PC端顶部导航 -->
    <header v-if="!isMobile" class="pc-header">
      <div class="logo">🏪 市场日租管理系统</div>
      <nav class="pc-nav">
        <router-link to="/" class="nav-link" :class="{ active: route.name === 'home' }">
          <el-icon><HomeFilled /></el-icon> 首页
        </router-link>
        <router-link to="/record" class="nav-link" :class="{ active: route.name === 'record' }">
          <el-icon><Calendar /></el-icon> 记录
        </router-link>
        <router-link to="/stats" class="nav-link" :class="{ active: route.name === 'stats' }">
          <el-icon><DataAnalysis /></el-icon> 统计
        </router-link>
        <router-link to="/settings" class="nav-link" :class="{ active: route.name === 'settings' }">
          <el-icon><Setting /></el-icon> 设置
        </router-link>
      </nav>
      <div class="user-area">
        <el-dropdown v-if="authStore.currentUser">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ authStore.currentUser.nickname }}
            <el-tag v-if="authStore.isAdmin" size="small" type="danger">管理员</el-tag>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-if="authStore.isAdmin" @click="goToUserManagement">
                <el-icon><User /></el-icon> 用户管理
              </el-dropdown-item>
              <el-dropdown-item @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <RouterView />
    </main>

    <!-- 移动端底部导航 -->
    <footer v-if="isMobile" class="mobile-footer">
      <div 
        v-for="tab in mobileTabs" 
        :key="tab.name"
        class="mobile-tab"
        :class="{ active: activeTab === tab.name }"
        @click="activeTab = tab.name"
      >
        <el-icon :size="22"><component :is="tab.icon" /></el-icon>
        <span>{{ tab.label }}</span>
      </div>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* PC端样式 */
.app-container:not(.is-mobile) {
  .main-content {
    flex: 1;
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
}

.pc-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 30px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.logo {
  font-size: 20px;
  font-weight: bold;
}

.pc-nav {
  display: flex;
  gap: 10px;
}

.nav-link {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.nav-link:hover {
  background: rgba(255,255,255,0.15);
  color: white;
}

.nav-link.active {
  background: rgba(255,255,255,0.25);
  color: white;
}

.user-area {
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.3s;
}

.user-info:hover {
  background: rgba(255,255,255,0.15);
}

/* 移动端样式 */
.app-container.is-mobile {
  padding-bottom: 60px;
  
  .main-content {
    flex: 1;
    padding: 12px;
  }
}

.mobile-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
  z-index: 100;
}

.mobile-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.3s;
}

.mobile-tab.active {
  color: #667eea;
}

.mobile-tab span {
  margin-top: 2px;
}
</style>
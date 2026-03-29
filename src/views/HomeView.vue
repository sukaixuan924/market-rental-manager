<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStallStore } from '@/stores/stall'
import { useRentalStore } from '@/stores/rental'
import { Plus, Edit, Delete, Location, ArrowRight } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import StallForm from '@/components/StallForm.vue'

const router = useRouter()
const stallStore = useStallStore()
const rentalStore = useRentalStore()

const showStallForm = ref(false)
const editingStall = ref<any>(null)

// 只读模式检查
const isReadonly = computed(() => {
  const isShareMode = window.location.hash.includes('/share/')
  if (isShareMode) {
    localStorage.setItem('market_readonly', 'true')
    return true
  }
  return localStorage.getItem('market_readonly') === 'true'
})

onMounted(() => {
  if (isReadonly.value) {
    ElMessage.warning('只读模式，只能查看')
  }
})

// 获取今日记录
const todayRecords = computed(() => rentalStore.getTodayRecords())

// 获取位置状态
const getStallStatus = (stallId: string) => {
  const record = todayRecords.value.find(r => r.stallId === stallId)
  if (!record) return { text: '空闲', color: '#999' }
  if (record.rentalType === 'long-term') {
    return { text: `长租中 ${dayjs(record.startDate).format('MM/DD')}-${dayjs(record.endDate).format('MM/DD')}`, color: '#1890ff' }
  }
  if (record.paymentStatus === 'paid') {
    return { text: `已出租 ¥${record.rentAmount}`, color: '#52c41a' }
  }
  if (record.paymentStatus === 'deposit') {
    return { text: `已付定金 ¥${record.rentAmount}`, color: '#1890ff' }
  }
  return { text: `预订未付 ¥${record.rentAmount}`, color: '#faad14' }
}

// 点击位置跳转到第二级页面
const goToStall = (stallId: string) => {
  router.push({ name: 'record', params: { stallId } })
}

// 添加/编辑位置
const handleStallSave = (data: any) => {
  if (editingStall.value) {
    stallStore.updateStall(editingStall.value.id, data)
    ElMessage.success('位置已更新')
  } else {
    stallStore.addStall(data)
    ElMessage.success('位置已添加')
  }
  showStallForm.value = false
  editingStall.value = null
}

// 编辑位置
const editStall = (stall: any) => {
  editingStall.value = stall
  showStallForm.value = true
}

// 删除位置
const deleteStall = async (stall: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除位置"${stall.name}"吗？`, '提示')
    stallStore.deleteStall(stall.id)
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="home-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>位置管理</h2>
      <el-button v-if="!isReadonly" type="primary" @click="showStallForm = true">
        <el-icon><Plus /></el-icon> 添加位置
      </el-button>
    </div>

    <!-- 位置列表 -->
    <div class="stall-list" v-if="stallStore.stalls.length > 0">
      <div 
        v-for="stall in stallStore.stalls" 
        :key="stall.id"
        class="stall-item"
        @click="goToStall(stall.id)"
      >
        <div class="stall-icon">
          <el-icon><Location /></el-icon>
        </div>
        <div class="stall-info">
          <div class="stall-name">{{ stall.name }}</div>
          <div class="stall-meta">
            <span class="stall-area">{{ stall.area }}</span>
            <span class="stall-status" :style="{ color: getStallStatus(stall.id).color }">
              {{ getStallStatus(stall.id).text }}
            </span>
          </div>
        </div>
        <div class="stall-arrow" v-if="!isReadonly">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="stall-actions" v-else @click.stop>
          <el-button link type="primary" size="small" @click="editStall(stall)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button link type="danger" size="small" @click="deleteStall(stall)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <el-empty description="暂无位置">
        <el-button v-if="!isReadonly" type="primary" @click="showStallForm = true">
          <el-icon><Plus /></el-icon> 添加第一个位置
        </el-button>
      </el-empty>
    </div>

    <!-- 添加/编辑位置弹窗 -->
    <el-dialog 
      v-model="showStallForm" 
      :title="editingStall ? '编辑位置' : '添加位置'"
      width="500px"
    >
      <StallForm 
        :stall="editingStall" 
        @save="handleStallSave"
        @cancel="showStallForm = false"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.home-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.stall-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stall-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.3s;
}

.stall-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stall-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.stall-info {
  flex: 1;
}

.stall-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stall-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.stall-area {
  color: #999;
}

.stall-status {
  font-weight: 500;
}

.stall-arrow {
  color: #ccc;
  font-size: 20px;
}

.stall-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 20px;
}

@media (max-width: 768px) {
  .home-view {
    padding: 16px;
  }
  
  .stall-item {
    padding: 14px 16px;
  }
  
  .stall-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}
</style>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStallStore } from '@/stores/stall'
import { useRentalStore } from '@/stores/rental'
import { Plus, Edit, Delete, Location, Money, Calendar } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import StallForm from '@/components/StallForm.vue'
import CalendarView from '@/components/CalendarView.vue'

const router = useRouter()
const stallStore = useStallStore()
const rentalStore = useRentalStore()

const showStallForm = ref(false)
const editingStall = ref<any>(null)
const selectedStallId = ref<string | null>(null)
const currentDate = ref(dayjs())

// 只读模式检查
const isReadonly = computed(() => {
  // 优先从URL检查是否有shareId
  const isShareMode = window.location.hash.includes('/share/')
  if (isShareMode) {
    localStorage.setItem('market_readonly', 'true')
    return true
  }
  return localStorage.getItem('market_readonly') === 'true'
})

// 页面加载时检查只读模式
onMounted(() => {
  if (isReadonly.value) {
    ElMessage.warning('只读模式，只能查看')
  }
})

// 今日日期字符串
const todayStr = dayjs().format('YYYY-MM-DD')

// 获取今日记录
const todayRecords = computed(() => rentalStore.getTodayRecords())

// 获取选中位置的今日记录
const selectedTodayRecord = computed(() => {
  if (!selectedStallId.value) return null
  return todayRecords.value.find(r => r.stallId === selectedStallId.value)
})

// 获取选中位置
const selectedStall = computed(() => {
  if (!selectedStallId.value) return null
  return stallStore.getStallById(selectedStallId.value)
})

// 选择位置
const selectStall = (stallId: string) => {
  selectedStallId.value = stallId
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
    if (selectedStallId.value === stall.id) {
      selectedStallId.value = null
    }
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}

// 月份切换
const prevMonth = () => {
  currentDate.value = currentDate.value.subtract(1, 'month')
}

const nextMonth = () => {
  currentDate.value = currentDate.value.add(1, 'month')
}

// 获取某日期的状态
const getDayStatus = (date: string) => {
  if (!selectedStallId.value) return null
  const records = rentalStore.getRecordsByStallAndDate(selectedStallId.value, date)
  if (records.length === 0) return null
  const record = records[0]
  if (record.paymentStatus === 'paid') return 'paid'
  if (record.paymentStatus === 'deposit') return 'deposit'
  return 'unpaid'
}

// 获取位置状态文本
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

// 初始化选中第一个位置
onMounted(() => {
  if (stallStore.stalls.length > 0 && !selectedStallId.value) {
    selectedStallId.value = stallStore.stalls[0].id
  }
})

// 获取选中位置的所有记录
const selectedStallRecords = computed(() => {
  if (!selectedStallId.value) return []
  // 按日期倒序排列
  return rentalStore.records
    .filter(r => r.stallId === selectedStallId.value)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// 记录筛选月份
const recordFilterMonth = ref(dayjs().format('YYYY-MM'))

// 筛选后的记录
const filteredRecords = computed(() => {
  return selectedStallRecords.value.filter(r => {
    return r.date.startsWith(recordFilterMonth.value)
  })
})

// 跳转到记录详情
const goToRecord = (record: any) => {
  router.push({ name: 'record', params: { stallId: selectedStallId.value }, query: { date: record.date } })
}
</script>

<template>
  <div class="home-view">
    <!-- 位置列表（移动端） -->
    <div class="stall-list-mobile" v-if="stallStore.stalls.length > 0">
      <div class="section-title">
        <span>位置列表</span>
        <el-button v-if="!isReadonly" type="primary" size="small" @click="showStallForm = true">
          <el-icon><Plus /></el-icon> 添加
        </el-button>
      </div>
      
      <div class="stall-grid">
        <div 
          v-for="stall in stallStore.stalls" 
          :key="stall.id"
          class="stall-card"
          :class="{ selected: selectedStallId === stall.id }"
          @click="selectStall(stall.id)"
        >
          <div class="stall-name">
            <el-icon><Location /></el-icon>
            {{ stall.name }}
          </div>
          <div class="stall-info">
            <span class="stall-status" :style="{ color: getStallStatus(stall.id).color }">
              {{ getStallStatus(stall.id).text }}
            </span>
          </div>
          <div class="stall-actions" v-if="!isReadonly" @click.stop>
            <el-button link type="primary" size="small" @click="editStall(stall)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button link type="danger" size="small" @click="deleteStall(stall)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <el-empty description="暂无位置">
        <el-button v-if="!isReadonly" type="primary" @click="showStallForm = true">
          <el-icon><Plus /></el-icon> 添加第一个位置
        </el-button>
      </el-empty>
    </div>

    <!-- 内容区 -->
    <div class="content-area" v-if="selectedStall">
      <!-- PC端左侧位置列表 -->
      <aside class="pc-stall-list" v-if="stallStore.stalls.length > 0">
        <div class="pc-stall-header">
          <h3>位置列表</h3>
          <el-button v-if="!isReadonly" type="primary" size="small" @click="showStallForm = true">
            <el-icon><Plus /></el-icon> 添加位置
          </el-button>
        </div>
        <div 
          v-for="stall in stallStore.stalls" 
          :key="stall.id"
          class="pc-stall-item"
          :class="{ selected: selectedStallId === stall.id }"
          @click="selectStall(stall.id)"
        >
          <div class="stall-name">{{ stall.name }}</div>
          <div class="stall-meta">
            <span :style="{ color: getStallStatus(stall.id).color }">
              {{ getStallStatus(stall.id).text }}
            </span>
          </div>
          <div class="pc-stall-actions" v-if="!isReadonly" @click.stop>
            <el-button link type="primary" size="small" @click="editStall(stall)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deleteStall(stall)">删除</el-button>
          </div>
        </div>
      </aside>

      <!-- 日历区 -->
      <div class="calendar-area">
        <div class="calendar-header">
          <h3>{{ selectedStall.name }} - {{ currentDate.format('YYYY年MM月') }}</h3>
          <div class="month-nav">
            <el-button @click="prevMonth">◀</el-button>
            <el-button @click="currentDate = dayjs()">今天</el-button>
            <el-button @click="nextMonth">▶</el-button>
          </div>
        </div>

        <CalendarView 
          :stall-id="selectedStallId!"
          :current-date="currentDate"
          @day-click="$router.push({ name: 'record', params: { stallId: selectedStallId }, query: { date: $event } })"
        />

        <!-- 图例 -->
        <div class="legend">
          <span class="legend-item"><span class="dot paid"></span> 已付款</span>
          <span class="legend-item"><span class="dot unpaid"></span> 预订未付</span>
          <span class="legend-item"><span class="dot deposit"></span> 已付定金</span>
          <span class="legend-item"><span class="dot long-term"></span> 长租</span>
        </div>

        <!-- 出租记录列表 -->
        <div class="records-section">
          <div class="records-header">
            <h3>出租记录</h3>
            <el-date-picker
              v-model="recordFilterMonth"
              type="month"
              placeholder="选择月份"
              format="YYYY年MM月"
              value-format="YYYY-MM"
              size="small"
              style="width: 140px"
            />
          </div>
          
          <div v-if="filteredRecords.length > 0" class="records-list">
            <div 
              v-for="record in filteredRecords" 
              :key="record.id"
              class="record-item"
              @click="goToRecord(record)"
            >
              <div class="record-date">
                <el-icon><Calendar /></el-icon>
                {{ dayjs(record.date).format('MM/DD') }}
                <span class="weekday">{{ '一二三四五六日'[dayjs(record.date).day()] }}</span>
              </div>
              <div class="record-info">
                <div class="record-renter">{{ record.renterName || '未设置' }}</div>
                <div class="record-type">
                  <el-tag :type="record.rentalType === 'long-term' ? 'purple' : 'success'" size="small">
                    {{ record.rentalType === 'long-term' ? '长租' : '日租' }}
                  </el-tag>
                </div>
              </div>
              <div class="record-amount">
                <el-icon><Money /></el-icon>
                ¥{{ record.rentAmount }}
              </div>
              <div class="record-status">
                <el-tag 
                  :type="record.paymentStatus === 'paid' ? 'success' : record.paymentStatus === 'deposit' ? 'primary' : 'warning'" 
                  size="small"
                >
                  {{ record.paymentStatus === 'paid' ? '已付款' : record.paymentStatus === 'deposit' ? '已付定金' : '未付款' }}
                </el-tag>
              </div>
            </div>
          </div>
          
          <el-empty v-else description="该月暂无出租记录" :image-size="80" />
        </div>
      </div>
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
  height: 100%;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #333;
}

.stall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.stall-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.stall-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stall-card.selected {
  border-color: #667eea;
}

.stall-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.stall-info {
  font-size: 13px;
  margin-bottom: 8px;
}

.stall-status {
  font-weight: 500;
}

.stall-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

/* PC端布局 */
.content-area {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.pc-stall-list {
  width: 260px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  height: fit-content;
}

.pc-stall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.pc-stall-header h3 {
  margin: 0;
  font-size: 16px;
}

.pc-stall-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.3s;
}

.pc-stall-item:hover {
  background: #f5f7fa;
}

.pc-stall-item.selected {
  background: linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%);
}

.pc-stall-item .stall-name {
  margin-bottom: 4px;
}

.pc-stall-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.calendar-area {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-header h3 {
  margin: 0;
}

.month-nav {
  display: flex;
  gap: 8px;
}

.legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.paid { background: #52c41a; }
.dot.unpaid { background: #faad14; }
.dot.deposit { background: #1890ff; }
.dot.long-term { background: #722ed1; }

/* 出租记录列表样式 */
.records-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.records-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.record-item:hover {
  background: #f0f5ff;
  transform: translateX(4px);
}

.record-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #333;
  min-width: 70px;
}

.weekday {
  font-size: 12px;
  color: #999;
  font-weight: normal;
  margin-left: 2px;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-renter {
  font-size: 14px;
  color: #333;
}

.record-type {
  display: flex;
  gap: 6px;
}

.record-amount {
  font-weight: 600;
  color: #f5222d;
  font-size: 15px;
  min-width: 80px;
  text-align: right;
}

.record-status {
  min-width: 70px;
  text-align: right;
}

@media (max-width: 768px) {
  .content-area {
    flex-direction: column;
  }
  
  .pc-stall-list {
    display: none;
  }
  
  .calendar-area {
    padding: 12px;
  }
  
  .record-item {
    flex-wrap: wrap;
    padding: 10px;
  }
  
  .record-date {
    min-width: 60px;
    font-size: 14px;
  }
  
  .record-info {
    flex: 1 1 auto;
  }
  
  .record-amount {
    font-size: 14px;
  }
}
</style>
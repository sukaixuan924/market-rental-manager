<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStallStore } from '@/stores/stall'
import { useRentalStore } from '@/stores/rental'
import { RENTAL_TYPES, type RentalRecord } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import RentalForm from '@/components/RentalForm.vue'
import CalendarView from '@/components/CalendarView.vue'

const route = useRoute()
const router = useRouter()
const stallStore = useStallStore()
const rentalStore = useRentalStore()

// 只读模式检查 - 从URL或localStorage判断
const isReadonly = computed(() => {
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

// 查询参数
const searchDate = ref(route.query.date as string || dayjs().format('YYYY-MM-DD'))
const searchStallId = ref(route.params.stallId as string || '')

// 日历月份
const calendarDate = ref(dayjs())

// 月份切换
const prevMonth = () => {
  calendarDate.value = calendarDate.value.subtract(1, 'month')
}

const nextMonth = () => {
  calendarDate.value = calendarDate.value.add(1, 'month')
}

// 点击日历日期
const handleCalendarClick = (date: string) => {
  searchDate.value = date
}

// 表单状态
const showForm = ref(false)
const editingRecord = ref<RentalRecord | null>(null)

// 筛选后的记录
const filteredRecords = computed(() => {
  let records = rentalStore.records
  
  // 按位置筛选
  if (searchStallId.value) {
    records = records.filter(r => r.stallId === searchStallId.value)
  }
  
  // 按日期筛选
  if (searchDate.value) {
    records = records.filter(r => {
      if (r.rentalType === 'daily') {
        return r.date === searchDate.value
      } else {
        return searchDate.value >= r.startDate && searchDate.value <= r.endDate
      }
    })
  }
  
  // 按租客搜索
  if (searchKeyword.value) {
    records = records.filter(r => 
      r.renterName.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }
  
  // 按付款状态筛选
  if (paymentFilter.value && paymentFilter.value !== 'all') {
    records = records.filter(r => r.paymentStatus === paymentFilter.value)
  }
  
  // 按类型筛选
  if (typeFilter.value && typeFilter.value !== 'all') {
    records = records.filter(r => r.rentalType === typeFilter.value)
  }
  
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// 搜索关键词
const searchKeyword = ref('')

// 筛选器
const paymentFilter = ref<string>('all')
const typeFilter = ref<string>('all')

// 获取位置名称
const getStallName = (stallId: string) => {
  const stall = stallStore.getStallById(stallId)
  return stall?.name || '未知位置'
}

// 打开添加表单
const openAddForm = () => {
  editingRecord.value = null
  showForm.value = true
}

// 打开编辑表单
const openEditForm = (record: RentalRecord) => {
  editingRecord.value = record
  showForm.value = true
}

// 保存记录
const handleSave = (data: any) => {
  if (editingRecord.value) {
    rentalStore.updateRecord(editingRecord.value.id, data)
    ElMessage.success('记录已更新')
  } else {
    rentalStore.addRecord(data as any)
    ElMessage.success('记录已添加')
  }
  showForm.value = false
  editingRecord.value = null
}

// 删除记录
const deleteRecord = async (record: RentalRecord) => {
  try {
    await ElMessageBox.confirm(`确定要删除这条记录吗？`, '提示')
    rentalStore.deleteRecord(record.id)
    ElMessage.success('已删除')
  } catch {
    // 取消
  }
}

// 获取状态标签
const getStatusTag = (status: string) => {
  const map: Record<string, { text: string; type: string }> = {
    paid: { text: '已付款', type: 'success' },
    unpaid: { text: '未付款', type: 'warning' },
    deposit: { text: '已付定金', type: '' }
  }
  return map[status] || { text: status, type: 'info' }
}

const getTypeTag = (type: string) => {
  return type === 'daily' ? '日租' : '长租'
}

// 监听路由变化
watch(() => route.query.date, (newDate) => {
  if (newDate) searchDate.value = newDate as string
})
</script>

<template>
  <div class="record-view">
    <div class="page-header">
      <h2>出租记录</h2>
      <el-button v-if="!isReadonly" type="primary" @click="openAddForm">
        + 添加记录
      </el-button>
    </div>

    <!-- 日历视图 -->
    <div class="calendar-section" v-if="searchStallId">
      <div class="calendar-header">
        <h3>{{ stallStore.getStallById(searchStallId)?.name || '' }} - {{ calendarDate.format('YYYY年MM月') }}</h3>
        <div class="month-nav">
          <el-button size="small" @click="prevMonth">◀</el-button>
          <el-button size="small" @click="calendarDate = dayjs()">今天</el-button>
          <el-button size="small" @click="nextMonth">▶</el-button>
        </div>
      </div>
      <CalendarView 
        :stall-id="searchStallId"
        :current-date="calendarDate"
        @day-click="handleCalendarClick"
      />
      <!-- 图例 -->
      <div class="legend">
        <span class="legend-item"><span class="dot paid"></span> 已付款</span>
        <span class="legend-item"><span class="dot unpaid"></span> 预订未付</span>
        <span class="legend-item"><span class="dot deposit"></span> 已付定金</span>
        <span class="legend-item"><span class="dot long-term"></span> 长租</span>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <el-date-picker
        v-model="searchDate"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 160px"
      />
      
      <el-select v-model="searchStallId" placeholder="全部位置" clearable style="width: 140px">
        <el-option
          v-for="stall in stallStore.stalls"
          :key="stall.id"
          :label="stall.name"
          :value="stall.id"
        />
      </el-select>

      <el-input
        v-model="searchKeyword"
        placeholder="搜索租客"
        style="width: 140px"
        clearable
      />

      <el-select v-model="paymentFilter" placeholder="付款状态" clearable style="width: 120px">
        <el-option label="全部" value="all" />
        <el-option label="已付款" value="paid" />
        <el-option label="未付款" value="unpaid" />
        <el-option label="已付定金" value="deposit" />
      </el-select>

      <el-select v-model="typeFilter" placeholder="出租类型" clearable style="width: 100px">
        <el-option label="全部" value="all" />
        <el-option label="日租" value="daily" />
        <el-option label="长租" value="long-term" />
      </el-select>
    </div>

    <!-- 记录列表 -->
    <div class="records-list" v-if="filteredRecords.length > 0">
      <div 
        v-for="record in filteredRecords" 
        :key="record.id"
        class="record-card"
      >
        <div class="record-header">
          <span class="stall-name">{{ getStallName(record.stallId) }}</span>
          <el-tag :type="getTypeTag(record.rentalType) === '日租' ? '' : 'primary'" size="small">
            {{ getTypeTag(record.rentalType) }}
          </el-tag>
        </div>
        
        <div class="record-body">
          <div class="record-row">
            <span class="label">租客:</span>
            <span class="value">{{ record.renterName }}</span>
          </div>
          <div class="record-row">
            <span class="label">经营类型:</span>
            <span class="value">{{ record.rentalTypeName }}</span>
          </div>
          <div class="record-row">
            <span class="label">日期:</span>
            <span class="value">
              <template v-if="record.rentalType === 'daily'">
                {{ record.date }}
              </template>
              <template v-else>
                {{ record.startDate }} ~ {{ record.endDate }}
              </template>
            </span>
          </div>
          <div class="record-row">
            <span class="label">租金:</span>
            <span class="value price">¥{{ record.rentAmount }}</span>
          </div>
          <div class="record-row">
            <span class="label">付款状态:</span>
            <el-tag :type="getStatusTag(record.paymentStatus).type as any" size="small">
              {{ getStatusTag(record.paymentStatus).text }}
            </el-tag>
          </div>
          <div class="record-row" v-if="record.notes">
            <span class="label">备注:</span>
            <span class="value">{{ record.notes }}</span>
          </div>
        </div>
        
        <div class="record-actions" v-if="!isReadonly">
          <el-button size="small" @click="openEditForm(record)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteRecord(record)">删除</el-button>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无记录" />

    <!-- 添加/编辑表单弹窗 -->
    <el-dialog 
      v-model="showForm" 
      :title="editingRecord ? '编辑出租记录' : '添加出租记录'"
      width="600px"
      :close-on-click-modal="false"
    >
      <RentalForm 
        :record="editingRecord"
        :default-stall-id="searchStallId"
        :default-date="searchDate"
        @save="handleSave"
        @cancel="showForm = false"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.record-view {
  max-width: 1000px;
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
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.stall-name {
  font-weight: 600;
  font-size: 16px;
}

.record-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.record-row {
  display: flex;
  gap: 8px;
}

.record-row .label {
  color: #999;
  font-size: 13px;
  min-width: 60px;
}

.record-row .value {
  color: #333;
  font-size: 13px;
}

.record-row .price {
  font-weight: 600;
  color: #f5222d;
  font-size: 15px;
}

.record-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 日历区域样式 */
.calendar-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.calendar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
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

@media (max-width: 768px) {
  .filters {
    padding: 12px;
  }
  
  .record-body {
    grid-template-columns: 1fr;
  }
}
</style>
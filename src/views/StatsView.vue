<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStallStore } from '@/stores/stall'
import { useRentalStore } from '@/stores/rental'
import dayjs from 'dayjs'

const stallStore = useStallStore()
const rentalStore = useRentalStore()

const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)
const selectedStallId = ref<string>('')  // 选中的位置

// 本月统计
const monthStats = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  let records = rentalStore.records
  
  // 按位置筛选
  if (selectedStallId.value) {
    records = records.filter(r => r.stallId === selectedStallId.value)
  }
  
  const monthRecords = records.filter(r => {
    if (r.rentalType === 'daily') {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    } else {
      const start = new Date(r.startDate)
      const end = new Date(r.endDate)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      return start <= monthEnd && end >= monthStart
    }
  })
  
  let totalIncome = 0
  let paidCount = 0
  let unpaidCount = 0
  let longTermCount = 0
  
  monthRecords.forEach(r => {
    totalIncome += r.rentAmount
    if (r.paymentStatus === 'paid') paidCount++
    else unpaidCount++
    if (r.rentalType === 'long-term') longTermCount++
  })
  
  return { totalIncome, paidCount, unpaidCount, longTermCount }
})

// 年份选择
const years = computed(() => {
  const y = dayjs().year()
  return [y - 2, y - 1, y, y + 1]
})

// 月份选择
const months = Array.from({ length: 12 }, (_, i) => i + 1)

// 各位置统计
const stallStats = computed(() => {
  let stalls = stallStore.stalls
  
  // 按位置筛选
  if (selectedStallId.value) {
    stalls = stalls.filter(s => s.id === selectedStallId.value)
  }
  
  return stalls.map(stall => {
    let records = rentalStore.getRecordsByStallId(stall.id)
    
    // 按位置筛选
    if (selectedStallId.value) {
      records = records.filter(r => r.stallId === selectedStallId.value)
    }
    
    const thisMonthRecords = records.filter(r => {
      if (r.rentalType === 'daily') {
        const d = new Date(r.date)
        return d.getFullYear() === currentYear.value && d.getMonth() + 1 === currentMonth.value
      } else {
        const start = new Date(r.startDate)
        const end = new Date(r.endDate)
        const monthStart = new Date(currentYear.value, currentMonth.value - 1, 1)
        const monthEnd = new Date(currentYear.value, currentMonth.value, 0)
        return start <= monthEnd && end >= monthStart
      }
    })
    
    let monthIncome = 0
    thisMonthRecords.forEach(r => monthIncome += r.rentAmount)
    
    const today = dayjs().format('YYYY-MM-DD')
    const isRented = records.some(r => {
      if (r.rentalType === 'daily') return r.date === today
      return today >= r.startDate && today <= r.endDate
    })
    
    return {
      stall,
      totalRecords: records.length,
      monthIncome,
      isRented
    }
  })
})

// 近期记录
const recentRecords = computed(() => {
  let records = [...rentalStore.records]
  
  // 按位置筛选
  if (selectedStallId.value) {
    records = records.filter(r => r.stallId === selectedStallId.value)
  }
  
  return records
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
})

// 加载数据
onMounted(async () => {
  await Promise.all([
    stallStore.loadStalls(),
    rentalStore.loadRecords()
  ])
})
</script>

<template>
  <div class="stats-view">
    <div class="page-header">
      <h2>数据统计</h2>
    </div>

    <!-- 月份和位置选择 -->
    <div class="month-selector">
      <el-select v-model="currentYear" placeholder="选择年份">
        <el-option v-for="y in years" :key="y" :label="`${y}年`" :value="y" />
      </el-select>
      <el-select v-model="currentMonth" placeholder="选择月份">
        <el-option v-for="m in months" :key="m" :label="`${m}月`" :value="m" />
      </el-select>
      <el-select v-model="selectedStallId" placeholder="全部位置" clearable>
        <el-option v-for="stall in stallStore.stalls" :key="stall.id" :label="stall.name" :value="stall.id" />
      </el-select>
      <el-button v-if="selectedStallId" @click="selectedStallId = ''">清除筛选</el-button>
    </div>

    <!-- 本月统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card income">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">¥{{ monthStats.totalIncome.toLocaleString() }}</div>
          <div class="stat-label">本月收入</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ monthStats.paidCount }}</div>
          <div class="stat-label">已付款</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ monthStats.unpaidCount }}</div>
          <div class="stat-label">未付款</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">{{ monthStats.longTermCount }}</div>
          <div class="stat-label">长租</div>
        </div>
      </div>
    </div>

    <!-- 位置统计 -->
    <div class="section">
      <h3>位置统计</h3>
      <el-table :data="stallStats" stripe>
        <el-table-column prop="stall.name" label="位置" />
        <el-table-column prop="stall.area" label="区域" />
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-tag :type="row.isRented ? 'success' : 'info'" size="small">
              {{ row.isRented ? '已出租' : '空闲' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalRecords" label="总记录数" />
        <el-table-column label="本月收入">
          <template #default="{ row }">
            <span class="price">¥{{ row.monthIncome }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 近期记录 -->
    <div class="section">
      <h3>近期记录</h3>
      <el-table :data="recentRecords" stripe max-height="300">
        <el-table-column label="位置">
          <template #default="{ row }">
            {{ stallStore.getStallById(row.stallId)?.name || '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="renterName" label="租客" />
        <el-table-column label="类型">
          <template #default="{ row }">
            <el-tag :type="row.rentalType === 'daily' ? '' : 'primary'" size="small">
              {{ row.rentalType === 'daily' ? '日租' : '长租' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="日期">
          <template #default="{ row }">
            <template v-if="row.rentalType === 'daily'">
              {{ row.date }}
            </template>
            <template v-else>
              {{ row.startDate }} ~ {{ row.endDate }}
            </template>
          </template>
        </el-table-column>
        <el-table-column label="付款">
          <template #default="{ row }">
            <el-tag :type="row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'deposit' ? '' : 'warning'" size="small">
              {{ row.paymentStatus === 'paid' ? '已付' : row.paymentStatus === 'deposit' ? '定金' : '未付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额">
          <template #default="{ row }">
            <span class="price">¥{{ row.rentAmount }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.stats-view {
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

.month-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.stat-card.income {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
  margin-top: 4px;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.price {
  color: #f5222d;
  font-weight: 600;
}
</style>
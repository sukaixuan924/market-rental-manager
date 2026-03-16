<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStallStore } from '@/stores/stall'
import { useRentalStore } from '@/stores/rental'
import dayjs from 'dayjs'

const stallStore = useStallStore()
const rentalStore = useRentalStore()

const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)

// 获取本月统计
const monthStats = computed(() => {
  return rentalStore.getMonthStats(currentYear.value, currentMonth.value)
})

// 获取历史记录统计
const allTimeStats = computed(() => {
  let totalIncome = 0
  let totalRecords = 0
  let paidRecords = 0
  let longTermRecords = 0

  rentalStore.records.forEach((r: any) => {
    totalRecords++
    if (r.paymentStatus === 'paid') paidRecords++
    if (r.rentalType === 'long-term') longTermRecords++
    totalIncome += r.rentAmount
  })

  return { totalIncome, totalRecords, paidRecords, longTermRecords }
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
  return stallStore.stalls.map(stall => {
    const records = rentalStore.getRecordsByStallId(stall.id)
    const thisMonthRecords = rentalStore.getRecordsByStallAndMonth(stall.id, currentYear.value, currentMonth.value)
    
    let monthIncome = 0
    thisMonthRecords.forEach(r => {
      monthIncome += r.rentAmount
    })

    return {
      stall,
      totalRecords: records.length,
      monthIncome,
      isRented: records.some(r => {
        const today = dayjs().format('YYYY-MM-DD')
        if (r.rentalType === 'daily') return r.date === today
        return today >= r.startDate && today <= r.endDate
      })
    }
  })
})

// 近期记录
const recentRecords = computed(() => {
  return [...rentalStore.records]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
})

// 导出数据
const exportData = () => {
  const data = JSON.stringify(rentalStore.records, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `market-rental-${dayjs().format('YYYY-MM-DD')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 清除数据
const clearData = async () => {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    localStorage.removeItem('market_rentals')
    localStorage.removeItem('market_stalls')
    location.reload()
  }
}
</script>

<template>
  <div class="stats-view">
    <div class="page-header">
      <h2>数据统计</h2>
      <div class="header-actions">
        <el-button @click="exportData">导出数据</el-button>
        <el-button type="danger" plain @click="clearData">清除数据</el-button>
      </div>
    </div>

    <!-- 月份选择 -->
    <div class="month-selector">
      <el-select v-model="currentYear" placeholder="选择年份">
        <el-option v-for="y in years" :key="y" :label="`${y}年`" :value="y" />
      </el-select>
      <el-select v-model="currentMonth" placeholder="选择月份">
        <el-option v-for="m in months" :key="m" :label="`${m}月`" :value="m" />
      </el-select>
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

.header-actions {
  display: flex;
  gap: 10px;
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
<script setup lang="ts">
import { computed } from 'vue'
import { useRentalStore } from '@/stores/rental'
import dayjs from 'dayjs'

const props = defineProps<{
  stallId: string
  currentDate: dayjs.Dayjs
}>()

const emit = defineEmits<{
  'day-click': [date: string]
}>()

const rentalStore = useRentalStore()

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 获取日历数据
const calendarDays = computed(() => {
  const year = props.currentDate.year()
  const month = props.currentDate.month() + 1
  
  // 月第一天
  const firstDay = props.currentDate.startOf('month')
  // 月最后一天
  const lastDay = props.currentDate.endOf('month')
  
  // 获取第一天是周几（1=周一，7=周日）
  let startWeek = firstDay.day() || 7
  
  const days: Array<{
    date: string
    day: number
    isCurrentMonth: boolean
    isToday: boolean
    records: any[]
  }> = []
  
  // 补齐上月的天数
  const prevMonthDays = startWeek - 1
  for (let i = prevMonthDays; i > 0; i--) {
    const d = firstDay.subtract(i, 'day')
    days.push({
      date: d.format('YYYY-MM-DD'),
      day: d.date(),
      isCurrentMonth: false,
      isToday: false,
      records: []
    })
  }
  
  // 当月天数
  for (let i = 0; i < lastDay.date(); i++) {
    const d = firstDay.add(i, 'day')
    const dateStr = d.format('YYYY-MM-DD')
    const records = rentalStore.getRecordsByStallAndDate(props.stallId, dateStr)
    days.push({
      date: dateStr,
      day: d.date(),
      isCurrentMonth: true,
      isToday: d.isSame(dayjs(), 'day'),
      records
    })
  }
  
  // 补齐下月的天数
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = lastDay.add(i, 'day')
    days.push({
      date: d.format('YYYY-MM-DD'),
      day: d.date(),
      isCurrentMonth: false,
      isToday: false,
      records: []
    })
  }
  
  return days
})

// 获取日期状态样式
const getDayStatus = (day: typeof calendarDays.value[0]) => {
  if (day.records.length === 0) return ''
  
  const record = day.records[0]
  if (record.rentalType === 'long-term') return 'long-term'
  if (record.paymentStatus === 'paid') return 'paid'
  if (record.paymentStatus === 'deposit') return 'deposit'
  return 'unpaid'
}

// 点击日期
const handleDayClick = (day: typeof calendarDays.value[0]) => {
  emit('day-click', day.date)
}
</script>

<template>
  <div class="calendar">
    <div class="week-header">
      <div v-for="day in weekDays" :key="day" class="week-day">{{ day }}</div>
    </div>
    <div class="days-grid">
      <div 
        v-for="day in calendarDays" 
        :key="day.date"
        class="day-cell"
        :class="{
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'has-record': day.records.length > 0,
          'paid': getDayStatus(day) === 'paid',
          'unpaid': getDayStatus(day) === 'unpaid',
          'deposit': getDayStatus(day) === 'deposit',
          'long-term': getDayStatus(day) === 'long-term'
        }"
        @click="handleDayClick(day)"
      >
        <span class="day-number">{{ day.day }}</span>
        <span v-if="day.records.length > 0" class="day-indicator">
          <template v-if="day.records[0].rentalType === 'long-term'">长租</template>
          <template v-else>¥{{ day.records[0].rentAmount }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  user-select: none;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.week-day {
  font-weight: 600;
  color: #666;
  font-size: 13px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  position: relative;
  min-height: 50px;
}

.day-cell:hover {
  background: #f5f7fa;
}

.day-cell.other-month {
  opacity: 0.4;
}

.day-cell.today {
  border: 2px solid #667eea;
}

.day-cell.today .day-number {
  color: #667eea;
  font-weight: bold;
}

.day-number {
  font-size: 14px;
  color: #333;
}

.day-indicator {
  font-size: 11px;
  margin-top: 2px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #f0f0f0;
  color: #666;
}

/* 已付款 */
.day-cell.paid {
  background: rgba(82, 196, 26, 0.15);
}
.day-cell.paid .day-indicator {
  background: #52c41a;
  color: white;
}

/* 预订未付 */
.day-cell.unpaid {
  background: rgba(250, 173, 20, 0.15);
}
.day-cell.unpaid .day-indicator {
  background: #faad14;
  color: white;
}

/* 已付定金 */
.day-cell.deposit {
  background: rgba(24, 144, 255, 0.15);
}
.day-cell.deposit .day-indicator {
  background: #1890ff;
  color: white;
}

/* 长租 */
.day-cell.long-term {
  background: rgba(114, 46, 209, 0.15);
}
.day-cell.long-term .day-indicator {
  background: #722ed1;
  color: white;
}

@media (max-width: 768px) {
  .day-cell {
    min-height: 40px;
  }
  
  .day-number {
    font-size: 13px;
  }
  
  .day-indicator {
    font-size: 10px;
    padding: 1px 4px;
  }
}
</style>
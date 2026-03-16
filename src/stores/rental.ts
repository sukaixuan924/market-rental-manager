import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RentalRecord } from '@/types'

const STORAGE_KEY = 'market_rentals'

export const useRentalStore = defineStore('rental', () => {
  const records = ref<RentalRecord[]>([])

  // 从本地加载
  const loadRecords = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        records.value = JSON.parse(data)
      }
    } catch (e) {
      console.error('加载记录失败:', e)
    }
  }

  // 保存到本地
  const saveRecords = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
  }

  // 添加记录
  const addRecord = (record: Omit<RentalRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newRecord: RentalRecord = {
      ...record,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    }
    records.value.push(newRecord)
    saveRecords()
    return newRecord
  }

  // 更新记录
  const updateRecord = (id: string, data: Partial<RentalRecord>) => {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value[index] = {
        ...records.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      saveRecords()
    }
  }

  // 删除记录
  const deleteRecord = (id: string) => {
    records.value = records.value.filter(r => r.id !== id)
    saveRecords()
  }

  // 按位置ID获取记录
  const getRecordsByStallId = (stallId: string) => {
    return records.value.filter(r => r.stallId === stallId)
  }

  // 按日期获取记录
  const getRecordsByDate = (date: string) => {
    return records.value.filter(r => {
      if (r.rentalType === 'daily') {
        return r.date === date
      } else {
        // 长租：检查日期是否在范围内
        return date >= r.startDate && date <= r.endDate
      }
    })
  }

  // 按位置和日期获取记录
  const getRecordsByStallAndDate = (stallId: string, date: string) => {
    return records.value.filter(r => {
      if (r.stallId !== stallId) return false
      if (r.rentalType === 'daily') {
        return r.date === date
      } else {
        return date >= r.startDate && date <= r.endDate
      }
    })
  }

  // 获取某位置某月的记录
  const getRecordsByStallAndMonth = (stallId: string, year: number, month: number) => {
    return records.value.filter(r => {
      if (r.stallId !== stallId) return false
      if (r.rentalType === 'daily') {
        const d = new Date(r.date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      } else {
        // 长租：检查是否跨越该月
        const start = new Date(r.startDate)
        const end = new Date(r.endDate)
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0)
        return start <= monthEnd && end >= monthStart
      }
    })
  }

  // 统计收入
  const getMonthStats = (year: number, month: number) => {
    let totalIncome = 0
    let paidCount = 0
    let unpaidCount = 0
    let longTermCount = 0

    records.value.forEach(r => {
      let inMonth = false
      if (r.rentalType === 'daily') {
        const d = new Date(r.date)
        inMonth = d.getFullYear() === year && d.getMonth() + 1 === month
      } else {
        const start = new Date(r.startDate)
        const end = new Date(r.endDate)
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0)
        inMonth = start <= monthEnd && end >= monthStart
      }

      if (inMonth) {
        if (r.rentalType === 'long-term') {
          longTermCount++
          // 长租按天计算
          const days = Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
          totalIncome += (r.rentAmount / days) * getDaysInMonth(year, month)
        } else {
          totalIncome += r.rentAmount
        }
        if (r.paymentStatus === 'paid') paidCount++
        else unpaidCount++
      }
    })

    return { totalIncome, paidCount, unpaidCount, longTermCount }
  }

  // 获取今日记录
  const getTodayRecords = () => {
    const today = new Date().toISOString().split('T')[0]
    return records.value.filter(r => {
      if (r.rentalType === 'daily') {
        return r.date === today
      } else {
        return today >= r.startDate && today <= r.endDate
      }
    })
  }

  // 初始化
  loadRecords()

  return {
    records,
    loadRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByStallId,
    getRecordsByDate,
    getRecordsByStallAndDate,
    getRecordsByStallAndMonth,
    getMonthStats,
    getTodayRecords
  }
})

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
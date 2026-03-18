import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RentalRecord } from '@/types'
import { recordAPI } from '@/services/api'

export const useRentalStore = defineStore('rental', () => {
  const records = ref<RentalRecord[]>([])
  const loading = ref(false)

  // 加载记录
  const loadRecords = async () => {
    loading.value = true
    try {
      const data = await recordAPI.getAll()
      // 转换字段名
      records.value = data.map((r: any) => ({
        id: r.id,
        stallId: r.stall_id,
        renterName: r.renter_name,
        rentalType: r.rental_type,
        rentalTypeName: r.rental_type_name,
        date: r.date,
        startDate: r.start_date,
        endDate: r.end_date,
        rentAmount: parseFloat(r.rent_amount),
        paymentStatus: r.payment_status,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    } catch (e) {
      console.error('加载记录失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 添加记录
  const addRecord = async (record: Omit<RentalRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await recordAPI.create({
        stallId: record.stallId,
        renterName: record.renterName,
        rentalType: record.rentalType,
        rentalTypeName: record.rentalTypeName,
        date: record.date,
        startDate: record.startDate,
        endDate: record.endDate,
        rentAmount: record.rentAmount,
        paymentStatus: record.paymentStatus,
        notes: record.notes
      })
      // 重新加载
      await loadRecords()
    } catch (e) {
      console.error('添加记录失败:', e)
      throw e
    }
  }

  // 更新记录
  const updateRecord = async (id: string, data: Partial<RentalRecord>) => {
    try {
      await recordAPI.update(id, data)
      const index = records.value.findIndex(r => r.id === id)
      if (index !== -1) {
        records.value[index] = { ...records.value[index], ...data }
      }
    } catch (e) {
      console.error('更新记录失败:', e)
      throw e
    }
  }

  // 删除记录
  const deleteRecord = async (id: string) => {
    try {
      await recordAPI.delete(id)
      records.value = records.value.filter(r => r.id !== id)
    } catch (e) {
      console.error('删除记录失败:', e)
      throw e
    }
  }

  // 按位置ID获取记录
  const getRecordsByStallId = (stallId: string) => records.value.filter(r => r.stallId === stallId)

  // 按日期获取记录
  const getRecordsByDate = (date: string) => {
    return records.value.filter(r => {
      if (r.rentalType === 'daily') {
        return r.date === date
      } else {
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

  // 获取今日记录
  const getTodayRecords = () => {
    const today = new Date().toISOString().split('T')[0]
    return getRecordsByDate(today)
  }

  return {
    records,
    loading,
    loadRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByStallId,
    getRecordsByDate,
    getRecordsByStallAndDate,
    getTodayRecords
  }
})
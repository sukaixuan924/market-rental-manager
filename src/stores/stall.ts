import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stall } from '@/types'
import { stallAPI } from '@/services/api'

export const useStallStore = defineStore('stall', () => {
  const stalls = ref<Stall[]>([])
  const loading = ref(false)

  // 加载位置
  const loadStalls = async () => {
    loading.value = true
    try {
      const data = await stallAPI.getAll()
      // 转换字段名
      stalls.value = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        area: s.area,
        defaultPrice: parseFloat(s.default_price),
        longTermPrice: parseFloat(s.long_term_price),
        status: s.status,
        createdAt: s.created_at
      }))
    } catch (e) {
      console.error('加载位置失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 添加位置
  const addStall = async (stall: Omit<Stall, 'id' | 'createdAt'>) => {
    try {
      const result = await stallAPI.create({
        name: stall.name,
        area: stall.area,
        defaultPrice: stall.defaultPrice,
        longTermPrice: stall.longTermPrice,
        status: stall.status
      })
      // 更新本地
      await loadStalls()
      return result
    } catch (e) {
      console.error('添加位置失败:', e)
      throw e
    }
  }

  // 更新位置
  const updateStall = async (id: string, data: Partial<Stall>) => {
    const index = stalls.value.findIndex(s => s.id === id)
    if (index !== -1) {
      stalls.value[index] = { ...stalls.value[index], ...data }
    }
  }

  // 删除位置
  const deleteStall = async (id: string) => {
    try {
      await stallAPI.delete(id)
      stalls.value = stalls.value.filter(s => s.id !== id)
    } catch (e) {
      console.error('删除位置失败:', e)
      throw e
    }
  }

  // 按ID获取位置
  const getStallById = (id: string) => stalls.value.find(s => s.id === id)

  // 按区域分组
  const stallsByArea = computed(() => {
    const groups: Record<string, Stall[]> = {}
    stalls.value.forEach(stall => {
      const area = stall.area || '未分组'
      if (!groups[area]) groups[area] = []
      groups[area].push(stall)
    })
    return groups
  })

  return {
    stalls,
    loading,
    stallsByArea,
    loadStalls,
    addStall,
    updateStall,
    deleteStall,
    getStallById
  }
})
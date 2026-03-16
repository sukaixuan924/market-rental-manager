import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stall } from '@/types'

// 本地存储 key
const STORAGE_KEY = 'market_stalls'

export const useStallStore = defineStore('stall', () => {
  const stalls = ref<Stall[]>([])

  // 从本地加载
  const loadStalls = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        stalls.value = JSON.parse(data)
      }
    } catch (e) {
      console.error('加载位置失败:', e)
    }
  }

  // 保存到本地
  const saveStalls = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stalls.value))
  }

  // 添加位置
  const addStall = (stall: Omit<Stall, 'id' | 'createdAt'>) => {
    const newStall: Stall = {
      ...stall,
      id: generateId(),
      createdAt: new Date().toISOString()
    }
    stalls.value.push(newStall)
    saveStalls()
    return newStall
  }

  // 更新位置
  const updateStall = (id: string, data: Partial<Stall>) => {
    const index = stalls.value.findIndex(s => s.id === id)
    if (index !== -1) {
      stalls.value[index] = { ...stalls.value[index], ...data }
      saveStalls()
    }
  }

  // 删除位置
  const deleteStall = (id: string) => {
    stalls.value = stalls.value.filter(s => s.id !== id)
    saveStalls()
  }

  // 按ID获取位置
  const getStallById = (id: string) => {
    return stalls.value.find(s => s.id === id)
  }

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

  // 初始化
  loadStalls()

  return {
    stalls,
    stallsByArea,
    loadStalls,
    addStall,
    updateStall,
    deleteStall,
    getStallById
  }
})

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
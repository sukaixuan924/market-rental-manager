<script setup lang="ts">
import { ref, watch, computed as _computed } from 'vue'
import type { Stall } from '@/types'

const props = defineProps<{
  stall?: Stall | null
}>()

const emit = defineEmits<{
  save: [data: Partial<Stall>]
  cancel: []
}>()

const form = ref({
  name: '',
  area: '',
  defaultPrice: 50,
  longTermPrice: 800,
  status: 'active' as 'active' | 'inactive'
})

// 监听编辑数据
watch(() => props.stall, (newStall) => {
  if (newStall) {
    form.value = {
      name: newStall.name,
      area: newStall.area,
      defaultPrice: newStall.defaultPrice,
      longTermPrice: newStall.longTermPrice,
      status: newStall.status
    }
  }
}, { immediate: true })

const handleSubmit = () => {
  if (!form.value.name.trim()) {
    return
  }
  emit('save', { ...form.value })
}
</script>

<template>
  <el-form :model="form" label-width="80px" @submit.prevent="handleSubmit">
    <el-form-item label="位置名称" required>
      <el-input v-model="form.name" placeholder="如: A区1号、入口处" />
    </el-form-item>

    <el-form-item label="所属区域">
      <el-input v-model="form.area" placeholder="如: A区、B区、停车场" />
    </el-form-item>

    <el-form-item label="日租金">
      <el-input-number v-model="form.defaultPrice" :min="0" :step="10" />
      <span class="unit">元/天</span>
    </el-form-item>

    <el-form-item label="长租月租">
      <el-input-number v-model="form.longTermPrice" :min="0" :step="100" />
      <span class="unit">元/月</span>
    </el-form-item>

    <el-form-item label="状态">
      <el-radio-group v-model="form.status">
        <el-radio value="active">启用</el-radio>
        <el-radio value="inactive">停用</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
      <el-button @click="emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.unit {
  margin-left: 10px;
  color: #999;
}
</style>
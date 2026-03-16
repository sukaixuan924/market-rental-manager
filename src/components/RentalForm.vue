<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useStallStore } from '@/stores/stall'
import { RENTAL_TYPES, type RentalRecord } from '@/types'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import VoiceInput from '@/components/VoiceInput.vue'
import OCRInput from '@/components/OCRInput.vue'

const props = defineProps<{
  record?: RentalRecord | null
  defaultStallId?: string
  defaultDate?: string
}>()

const emit = defineEmits<{
  save: [data: Partial<RentalRecord>]
  cancel: []
}>()

const stallStore = useStallStore()
const authStore = useAuthStore()

const form = ref({
  stallId: '',
  renterName: '',
  rentalType: 'daily' as 'daily' | 'long-term',
  rentalTypeName: '烧烤',
  date: dayjs().format('YYYY-MM-DD'),
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
  rentAmount: 50,
  paymentStatus: 'paid' as 'paid' | 'unpaid' | 'deposit',
  notes: ''
})

// 计算默认租金
const defaultPrice = computed(() => {
  if (!form.value.stallId) return 50
  const stall = stallStore.getStallById(form.value.stallId)
  if (!stall) return 50
  return form.value.rentalType === 'daily' ? stall.defaultPrice : stall.longTermPrice
})

// 监听默认值
watch(() => props.defaultStallId, (val) => {
  if (val) form.value.stallId = val
}, { immediate: true })

watch(() => props.defaultDate, (val) => {
  if (val) {
    form.value.date = val
    form.value.startDate = val
  }
}, { immediate: true })

// 监听编辑数据
watch(() => props.record, (rec) => {
  if (rec) {
    form.value = {
      stallId: rec.stallId,
      renterName: rec.renterName,
      rentalType: rec.rentalType,
      rentalTypeName: rec.rentalTypeName,
      date: rec.date,
      startDate: rec.startDate,
      endDate: rec.endDate,
      rentAmount: rec.rentAmount,
      paymentStatus: rec.paymentStatus,
      notes: rec.notes
    }
  }
}, { immediate: true })

// 位置变更时更新默认租金
watch(() => form.value.stallId, () => {
  form.value.rentAmount = defaultPrice.value
})

watch(() => form.value.rentalType, () => {
  form.value.rentAmount = defaultPrice.value
})

// 语音输入更新
const handleVoiceInput = (text: string) => {
  form.value.renterName = text
}

// OCR输入更新
const handleOCRInput = (text: string) => {
  // OCR识别后尝试解析
  // 格式可能是 "张三 烧烤 50元"
  const parts = text.split(/[\s,，]+/)
  if (parts.length >= 1) {
    form.value.renterName = parts[0]
  }
  if (parts.length >= 2) {
    // 尝试匹配经营类型
    const type = RENTAL_TYPES.find(t => text.includes(t))
    if (type) {
      form.value.rentalTypeName = type
    }
  }
}

const handleSubmit = () => {
  if (!form.value.stallId) return
  if (!form.value.renterName.trim()) return
  
  const data: any = { ...form.value }
  
  // 添加用户ID
  if (authStore.currentUser) {
    data.userId = authStore.currentUser.id
  }
  
  // 如果是日租，删除长租字段
  if (data.rentalType === 'daily') {
    delete data.startDate
    delete data.endDate
  } else {
    delete data.date
  }
  
  emit('save', data)
}
</script>

<template>
  <el-form :model="form" label-width="80px" @submit.prevent="handleSubmit">
    <el-form-item label="位置" required>
      <el-select v-model="form.stallId" placeholder="选择位置" style="width: 100%">
        <el-option
          v-for="stall in stallStore.stalls"
          :key="stall.id"
          :label="`${stall.name} (日租¥${stall.defaultPrice}/长租¥${stall.longTermPrice})`"
          :value="stall.id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="出租类型">
      <el-radio-group v-model="form.rentalType">
        <el-radio value="daily">日租</el-radio>
        <el-radio value="long-term">长租</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- 日租日期 -->
    <el-form-item label="日期" v-if="form.rentalType === 'daily'">
      <el-date-picker
        v-model="form.date"
        type="date"
        placeholder="选择日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 100%"
      />
    </el-form-item>

    <!-- 长租日期范围 -->
    <template v-else>
      <el-form-item label="开始日期">
        <el-date-picker
          v-model="form.startDate"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-date-picker
          v-model="form.endDate"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
    </template>

    <el-form-item label="租客" required>
      <div class="renter-input">
        <el-input 
          v-model="form.renterName" 
          placeholder="请输入租客姓名或微信名" 
        />
        <div class="input-tools">
          <VoiceInput v-model="form.renterName" />
          <OCRInput v-model="form.renterName" />
        </div>
      </div>
    </el-form-item>

    <el-form-item label="经营类型">
      <el-select v-model="form.rentalTypeName" placeholder="选择类型" style="width: 100%">
        <el-option
          v-for="type in RENTAL_TYPES"
          :key="type"
          :label="type"
          :value="type"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="租金">
      <el-input-number v-model="form.rentAmount" :min="0" :step="10" />
      <span class="unit">元 {{ form.rentalType === 'daily' ? '/天' : '/月' }}</span>
    </el-form-item>

    <el-form-item label="付款状态">
      <el-radio-group v-model="form.paymentStatus">
        <el-radio value="paid">已付款</el-radio>
        <el-radio value="unpaid">未付款</el-radio>
        <el-radio value="deposit">已付定金</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="备注">
      <el-input
        v-model="form.notes"
        type="textarea"
        :rows="2"
        placeholder="可选填写备注信息"
      />
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

.renter-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.input-tools {
  display: flex;
  gap: 8px;
}
</style>
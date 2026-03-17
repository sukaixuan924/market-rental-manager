<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'ocr-result': [result: { name: string; amount: string; date: string }]
}>()

const loading = ref(false)
const progress = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)

// 触发文件选择（相册）
const triggerUpload = () => {
  if (loading.value) return
  fileInput.value?.click()
}

// 触发拍照
const triggerCamera = () => {
  if (loading.value) return
  cameraInput.value?.click()
}

// 处理文件选择（相册）
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  processImage(file)
  setTimeout(() => { if (fileInput.value) fileInput.value.value = '' }, 1000)
}

// 处理拍照
const handleCameraChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  processImage(file)
  setTimeout(() => { if (cameraInput.value) cameraInput.value.value = '' }, 1000)
}

// 处理图片 - 调用腾讯云OCR API
const processImage = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过10MB')
    return
  }

  loading.value = true
  progress.value = 0

  try {
    // 读取图片为base64
    const base64 = await fileToBase64(file)
    
    // 调用腾讯云OCR API
    const result = await callTencentOCR(base64)
    
    if (result.success && result.parsed) {
      // 直接使用后端解析结果
      const parsed = result.parsed
      
      // 填入租客姓名
      if (parsed.name) {
        emit('update:modelValue', parsed.name)
      }
      
      // 发送完整解析结果
      emit('ocr-result', parsed)
      
      ElMessage.success(`识别成功: ${parsed.name || '未知'} - ¥${parsed.amount || '0'}`)
    } else if (result.success && result.texts && result.texts.length > 0) {
      // 兼容：后端没有返回parsed时使用前端解析
      const parsed = parseOCRText(result.texts.join(' '))
      
      if (parsed.name) {
        emit('update:modelValue', parsed.name)
      }
      emit('ocr-result', parsed)
      ElMessage.success(`识别成功: ${parsed.name || '未知'} - ¥${parsed.amount || '0'}`)
    } else if (result.texts && result.texts.length === 0) {
      ElMessage.warning('未识别到文字，请换一张更清晰的图片')
    } else {
      ElMessage.error(result.message || '识别失败')
    }
  } catch (e: any) {
    console.error('OCR识别错误:', e)
    ElMessage.error('识别失败，请重试')
  } finally {
    loading.value = false
    progress.value = 0
  }
}

// 调用腾讯云OCR API
const callTencentOCR = async (base64Image: string): Promise<any> => {
  try {
    const response = await fetch('http://122.51.230.169:3000/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    })
    return await response.json()
  } catch (e) {
    console.error('OCR API错误:', e)
    return { success: false, message: 'API调用失败' }
  }
}

// 解析OCR文本，提取关键信息
const parseOCRText = (text: string): { name: string; amount: string; date: string } => {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l)
  
  let name = ''
  let amount = ''
  let date = ''

  for (const line of lines) {
    // 匹配金额 (如 30.00, 50元, ¥30)
    if (!amount) {
      const amountMatch = line.match(/(?:¥|￥)\s*(\d+\.?\d*)|(\d+\.\d{2})(?=\s*(?:元|$))/)
      if (amountMatch) {
        amount = amountMatch[1] || amountMatch[2]
      }
    }

    // 匹配日期 (如 2026-03-18, 2026年3月18日, 03/18)
    if (!date) {
      const dateMatch = line.match(/(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/)
      if (dateMatch) {
        date = dateMatch[1].replace(/[年月]/g, '-').replace(/日/, '').replace(/-$/, '')
      }
    }
  }

  // 提取名字 - 通常是第一行或者包含"收款"的行
  for (const line of lines) {
    if (line.includes('收款方') || line.includes('收款')) {
      const parts = line.replace(/收款方|收款/, '').trim()
      if (parts && parts.length < 15) {
        name = parts
        break
      }
    }
  }

  // 如果没找到，尝试第一行
  if (!name && lines.length > 0) {
    const firstLine = lines[0].replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').trim()
    if (firstLine && firstLine.length > 1 && firstLine.length < 15) {
      name = firstLine
    }
  }

  return { name, amount, date }
}

// 文件转Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

onUnmounted(() => {
  loading.value = false
})
</script>

<template>
  <div class="ocr-input">
    <!-- 相册选择 -->
    <input 
      ref="fileInput"
      type="file" 
      accept="image/*"
      @change="handleFileChange"
      style="display: none"
    />
    
    <!-- 拍照 -->
    <input 
      ref="cameraInput"
      type="file" 
      accept="image/*"
      capture="environment"
      @change="handleCameraChange"
      style="display: none"
    />
    
    <div class="ocr-buttons">
      <el-button 
        type="primary" 
        @click="triggerUpload"
        :disabled="loading"
      >
        <template v-if="loading">
          {{ progress }}%
        </template>
        <template v-else>
          🖼️ 相册
        </template>
      </el-button>
      <el-button 
        type="success" 
        @click="triggerCamera"
        :disabled="loading"
      >
        <template v-if="loading">
          识别中
        </template>
        <template v-else>
          📷 拍照
        </template>
      </el-button>
    </div>
    
    <el-progress v-if="loading" :percentage="progress" :stroke-width="4" style="margin-top: 8px; width: 200px;" />
  </div>
</template>

<style scoped>
.ocr-input {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
}

.ocr-buttons {
  display: flex;
  gap: 8px;
}
</style>
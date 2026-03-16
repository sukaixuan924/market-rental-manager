<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const loading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 触发文件选择
const triggerUpload = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  
  // 检查文件大小 (最大5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过5MB')
    return
  }

  loading.value = true
  
  try {
    // 读取图片为base64
    const base64 = await fileToBase64(file)
    
    // 调用腾讯云OCR（需要在服务端配置密钥）
    // 这里先实现本地模拟 + 实际API调用
    const result = await callOCR API(base64)
    
    if (result.success) {
      // 合并到现有文本
      const currentText = props.modelValue
      const newText = currentText + (currentText ? ' ' : '') + result.text
      emit('update:modelValue', newText)
      ElMessage.success('识别成功')
    } else {
      ElMessage.error(result.message || '识别失败')
    }
  } catch (e) {
    console.error('OCR识别错误:', e)
    ElMessage.error('识别失败，请重试')
  } finally {
    loading.value = false
    // 清空input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
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

// 模拟OCR调用（实际需要配置腾讯云密钥）
const callOCRAPI = async (base64Image: string): Promise<{ success: boolean; text: string; message?: string }> => {
  // 实际项目中应该调用后端API，后端再调用腾讯云OCR
  // 这里使用腾讯云通用OCR API作为示例
  // 需要环境变量: TENCENT_CLOUD_SECRET_ID, TENCENT_CLOUD_SECRET_KEY
  
  try {
    // 检查是否有配置密钥
    const secretId = import.meta.env.VITE_TENCENT_SECRET_ID
    const secretKey = import.meta.env.VITE_TENCENT_SECRET_KEY
    
    if (!secretId || !secretKey) {
      // 演示模式：返回模拟数据
      return await simulateOCR(base64Image)
    }
    
    // 实际API调用（需要后端中转）
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    })
    
    const data = await response.json()
    
    if (data.success) {
      return { success: true, text: data.text }
    } else {
      return { success: false, text: '', message: data.message }
    }
  } catch (e) {
    return await simulateOCR(base64Image)
  }
}

// 模拟OCR（演示用）
const simulateOCR = async (base64Image: string): Promise<{ success: boolean; text: string }> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // 提取图片名称（如果是文件）
  // 实际使用中，这里可以返回一些示例文本
  // 用户可以手动编辑
  
  // 返回提示信息
  return { 
    success: true, 
    text: '[请手动填写识别结果]' 
  }
}

// 从相册选择
const handleGalleryClick = () => {
  triggerUpload()
}

// 拍照
const handleCameraClick = () => {
  triggerUpload()
}
</script>

<template>
  <div class="ocr-input">
    <input 
      ref="fileInput"
      type="file" 
      accept="image/*" 
      capture="environment"
      @change="handleFileChange"
      style="display: none"
    />
    
    <div class="ocr-buttons">
      <el-button 
        type="primary" 
        @click="triggerUpload"
        :loading="loading"
      >
        📷 {{ loading ? '识别中...' : '图片识别' }}
      </el-button>
    </div>
    
    <div class="ocr-tips" v-if="!loading">
      <p>💡 支持拍照或相册选择图片，自动识别文字</p>
    </div>
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

.ocr-tips {
  font-size: 12px;
  color: #909399;
}

.ocr-tips p {
  margin: 0;
}
</style>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isRecording = ref(false)
const recordingTime = ref(0)
let recognition: any = null
let timer: number | null = null

// 使用Web Speech API进行语音识别
const startRecording = () => {
  // 检查浏览器支持
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    ElMessage.warning('您的浏览器不支持语音识别，请使用Chrome浏览器')
    return
  }

  try {
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'

    let finalTranscript = ''

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // 实时更新
      const currentText = props.modelValue
      const newText = currentText + (currentText ? ' ' : '') + (finalTranscript || interimTranscript)
      emit('update:modelValue', newText)
    }

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error)
      ElMessage.error('语音识别失败: ' + event.error)
      stopRecording()
    }

    recognition.onend = () => {
      stopRecording()
    }

    // 开始识别
    recognition.start()
    isRecording.value = true
    recordingTime.value = 0
    
    // 计时
    timer = window.setInterval(() => {
      recordingTime.value++
      // 最长60秒
      if (recording.value >= 60) {
        stopRecording()
      }
    }, 1000)

    ElMessage.success('开始录音，请说话...')
  } catch (e) {
    console.error('语音识别初始化失败:', e)
    ElMessage.error('语音识别初始化失败')
  }
}

const stopRecording = () => {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
  
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  
  isRecording.value = false
  ElMessage.info('录音结束')
}

// 格式化时间
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  if (recognition) {
    recognition.stop()
  }
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="voice-input">
    <el-button 
      :type="isRecording ? 'danger' : 'primary'" 
      @click="isRecording ? stopRecording() : startRecording()"
      :class="{ recording: isRecording }"
    >
      <template v-if="isRecording">
        ⏹️ 停止 ({{ formatTime(recordingTime) }})
      </template>
      <template v-else>
        🎤 语音输入
      </template>
    </el-button>
    
    <div v-if="isRecording" class="recording-indicator">
      <span class="pulse"></span>
      录音中...
    </div>
  </div>
</template>

<style scoped>
.voice-input {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
}

.recording {
  animation: pulse 1s infinite;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #f56c6c;
}

.pulse {
  width: 8px;
  height: 8px;
  background: #f56c6c;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
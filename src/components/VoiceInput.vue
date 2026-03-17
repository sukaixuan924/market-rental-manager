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
let finalTranscript = ''

// 检查浏览器支持
const checkSupport = (): boolean => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    ElMessage.error('您的浏览器不支持语音识别功能')
    return false
  }
  return true
}

// 开始语音识别
const startRecording = () => {
  if (!checkSupport()) return

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  
  try {
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'

    finalTranscript = ''

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

      // 实时更新输入框
      const currentText = props.modelValue
      const newText = currentText + (currentText ? ' ' : '') + (finalTranscript || interimTranscript)
      emit('update:modelValue', newText)
    }

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error, event)
      
      let msg = '语音识别失败'
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        msg = '请在浏览器地址栏左侧点击"允许麦克风"按钮'
      } else if (event.error === 'network') {
        msg = '网络错误，请检查网络连接'
      } else if (event.error === 'no-speech') {
        msg = '未检测到语音，请对着麦克风说话并等待几秒'
      } else if (event.error === 'aborted') {
        msg = '语音识别已取消'
      } else if (event.error === 'audio-capture') {
        msg = '无法访问麦克风，请检查设备连接'
      } else if (event.error === 'service-not-allowed') {
        msg = '语音服务不可用，可能需要HTTPS或localhost'
      } else {
        msg = `语音识别错误: ${event.error}`
      }
      
      ElMessage.warning(msg)
      stopRecording()
    }

    recognition.onend = () => {
      if (isRecording.value) {
        stopRecording()
      }
    }

    recognition.start()
    isRecording.value = true
    recordingTime.value = 0

    timer = window.setInterval(() => {
      recordingTime.value++
      if (recordingTime.value >= 60) {
        stopRecording()
      }
    }, 1000)

    ElMessage.success('开始录音，请说话...')
  } catch (e: any) {
    console.error('语音识别初始化失败:', e)
    ElMessage.error('语音识别启动失败: ' + e.message)
  }
}

const stopRecording = () => {
  if (recognition) {
    try {
      recognition.stop()
    } catch (e) {
      // ignore
    }
    recognition = null
  }

  if (timer) {
    clearInterval(timer)
    timer = null
  }

  isRecording.value = false
  
  if (finalTranscript) {
    ElMessage.success('语音识别完成')
  } else {
    ElMessage.info('录音结束')
  }
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  stopRecording()
})
</script>

<template>
  <div class="voice-input">
    <el-button 
      :type="isRecording ? 'danger' : 'default'" 
      @click="isRecording ? stopRecording() : startRecording()"
      :class="{ recording: isRecording }"
      :disabled="!checkSupport()"
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
      录音中，请说话...
    </div>
    
    <div v-if="!isRecording" class="voice-tips">
      <small style="color: #909399;">点击开始语音输入，再次点击停止</small>
    </div>
  </div>
</template>

<style scoped>
.voice-input {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
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

.voice-tips {
  font-size: 11px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
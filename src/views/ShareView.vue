<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stallAPI } from '@/services/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()

// 判断是分享者还是查看者
const isViewer = ref(false)
const shareId = route.params.id as string

const shareInfo = ref<any>(null)
const stalls = ref<any[]>([])
const records = ref<any[]>([])
const loading = ref(true)

// 分享表单
const showShareDialog = ref(false)
const shareForm = ref({
  stallIds: [] as string[],
  startDate: '',
  endDate: '',
  days: 30,
  creatorName: ''
})

const allStalls = ref<any[]>([])
const shareUrl = ref('')
const shareLoading = ref(false)
const showShareResult = ref(false)

// 加载所有位置
const loadStalls = async () => {
  try {
    allStalls.value = await stallAPI.getAll()
  } catch (e) {
    console.error('加载位置失败', e)
  }
}

// 加载分享数据（查看者）
const loadShareData = async () => {
  if (!shareId) return
  
  isViewer.value = true
  // 设置只读模式
  localStorage.setItem('market_readonly', 'true')
  loading.value = true
  
  try {
    // 使用相对路径，自动适配当前域名
    const apiBase = window.location.origin.replace(':8000', ':3000')
    const res = await fetch(`${apiBase}/api/share/${shareId}`)
    const data = await res.json()
    
    if (!data.success) {
      ElMessage.error(data.error || '加载失败')
      // 如果分享不存在或过期，清除只读模式
      localStorage.removeItem('market_readonly')
      return
    }
    
    shareInfo.value = data.share
    stalls.value = data.stalls || []
    records.value = data.records || []
  } catch (e) {
    console.error('加载分享数据失败', e)
    ElMessage.error('加载失败')
    localStorage.removeItem('market_readonly')
  } finally {
    loading.value = false
  }
}

// 创建分享
const createShare = async () => {
  if (shareForm.value.stallIds.length === 0) {
    ElMessage.warning('请选择至少一个位置')
    return
  }
  
  shareLoading.value = true
  
  try {
    const apiBase = window.location.origin.replace(':8000', ':3000')
    const res = await fetch(`${apiBase}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stallIds: shareForm.value.stallIds,
        startDate: shareForm.value.startDate,
        endDate: shareForm.value.endDate,
        days: shareForm.value.days,
        creatorName: shareForm.value.creatorName
      })
    })
    
    const data = await res.json()
    
    if (data.success) {
      shareUrl.value = `${window.location.origin}/#/share/${data.shareId}`
      showShareResult.value = true
      ElMessage.success('分享链接已生成')
    } else {
      ElMessage.error(data.error || '创建失败')
    }
  } catch (e) {
    console.error('创建分享失败', e)
    ElMessage.error('创建失败')
  } finally {
    shareLoading.value = false
  }
}

// 复制链接 - 兼容HTTP环境
const copyLink = () => {
  // 尝试使用 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(shareUrl.value).then(() => {
      ElMessage.success('链接已复制到剪贴板')
    }).catch(() => {
      fallbackCopy()
    })
  } else {
    fallbackCopy()
  }
}

// 备选复制方案
const fallbackCopy = () => {
  const textarea = document.createElement('textarea')
  textarea.value = shareUrl.value
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    ElMessage.success('链接已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制链接')
  }
  document.body.removeChild(textarea)
}

// 获取位置名称
const getStallName = (stallId: string) => {
  const stall = stalls.value.find(s => s.id === stallId)
  return stall?.name || '未知位置'
}

// 计算统计
const stats = computed(() => {
  const totalDays = records.value.length
  const totalAmount = records.value.reduce((sum, r) => sum + (parseFloat(r.rent_amount) || 0), 0)
  const paidAmount = records.value.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + (parseFloat(r.rent_amount) || 0), 0)
  return { totalDays, totalAmount, paidAmount }
})

onMounted(() => {
  if (shareId) {
    // 进入查看者模式，设置只读
    localStorage.setItem('market_readonly', 'true')
    loadShareData()
  } else {
    // 清除只读模式（分享者模式）
    localStorage.removeItem('market_readonly')
    loadStalls()
    shareForm.value.startDate = dayjs().startOf('month').format('YYYY-MM-DD')
    shareForm.value.endDate = dayjs().endOf('month').format('YYYY-MM-DD')
  }
})

// 页面卸载时清除只读标记
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (!shareId) {
    localStorage.removeItem('market_readonly')
  }
})
</script>

<template>
  <div class="share-page">
    <!-- 查看者视图 -->
    <template v-if="isViewer">
      <div v-if="loading" class="loading">加载中...</div>
      
      <template v-else-if="shareInfo">
        <div class="share-header">
          <h2>📍 出租情况分享</h2>
          <p class="share-meta">
            分享者：{{ shareInfo.creator_name }} | 
            有效期：{{ shareInfo.expires_at ? new Date(shareInfo.expires_at).toLocaleDateString() : '永久' }}
          </p>
        </div>

        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalDays }}</div>
            <div class="stat-label">出租天数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">¥{{ stats.totalAmount }}</div>
            <div class="stat-label">总收入</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">¥{{ stats.paidAmount }}</div>
            <div class="stat-label">已收款</div>
          </div>
        </div>

        <div class="records-section">
          <h3>📋 出租记录</h3>
          <div class="records-list">
            <div v-for="record in records" :key="record.id" class="record-item">
              <span class="record-date">{{ record.date }}</span>
              <span class="record-name">{{ record.renter_name }}</span>
              <span class="record-type">{{ record.rental_type_name }}</span>
              <span class="record-amount">¥{{ record.rent_amount }}</span>
              <el-tag :type="record.payment_status === 'paid' ? 'success' : 'warning'" size="small">
                {{ record.payment_status === 'paid' ? '已付款' : '未付款' }}
              </el-tag>
            </div>
            <div v-if="records.length === 0" class="no-records">暂无记录</div>
          </div>
        </div>

        <div class="readonly-tip">
          ⚠️ 只读模式，无法修改数据
        </div>
      </template>
    </template>

    <!-- 分享者视图 -->
    <template v-else>
      <div class="page-header">
        <h2>🔗 分享出租信息</h2>
        <el-button type="primary" @click="showShareDialog = true">
          生成分享链接
        </el-button>
      </div>

      <el-alert
        title="分享功能说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        您可以将出租信息生成分享链接，发送给客户查看（仅读权限）
      </el-alert>

      <!-- 分享对话框 -->
      <el-dialog v-model="showShareDialog" title="生成分享链接" width="500px">
        <el-form :model="shareForm" label-width="80px">
          <el-form-item label="选择位置" required>
            <el-checkbox-group v-model="shareForm.stallIds">
              <el-checkbox 
                v-for="stall in allStalls" 
                :key="stall.id" 
                :label="stall.id"
                style="display: block; margin-bottom: 8px"
              >
                {{ stall.name }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="shareForm.startDate"
              type="date"
              placeholder="选择开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="结束日期">
            <el-date-picker
              v-model="shareForm.endDate"
              type="date"
              placeholder="选择结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="有效期">
            <el-radio-group v-model="shareForm.days">
              <el-radio :value="7">7天</el-radio>
              <el-radio :value="30">30天</el-radio>
              <el-radio :value="90">90天</el-radio>
              <el-radio :value="0">永久</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="你的名字">
            <el-input v-model="shareForm.creatorName" placeholder="显示给对方" />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <el-button @click="showShareDialog = false">取消</el-button>
          <el-button type="primary" :loading="shareLoading" @click="createShare">
            生成链接
          </el-button>
        </template>
      </el-dialog>

      <!-- 分享结果 -->
      <el-dialog v-model="showShareResult" title="分享链接已生成" width="400px" :close-on-click-modal="false">
        <div class="share-result">
          <p>链接：</p>
          <el-input v-model="shareUrl" readonly />
          <el-button type="primary" style="margin-top: 10px" @click="copyLink">
            复制链接
          </el-button>
        </div>
        <template #footer>
          <el-button @click="showShareResult = false; showShareDialog = false">关闭</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<style scoped>
.share-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
}

.share-header {
  text-align: center;
  margin-bottom: 20px;
}

.share-header h2 {
  margin-bottom: 8px;
}

.share-meta {
  color: #666;
  font-size: 14px;
}

.stats-cards {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.records-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.records-section h3 {
  margin-bottom: 15px;
}

.records-list {
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.record-date {
  width: 80px;
  color: #666;
}

.record-name {
  flex: 1;
  font-weight: 500;
}

.record-type {
  color: #999;
}

.record-amount {
  font-weight: bold;
  color: #667eea;
}

.no-records {
  text-align: center;
  padding: 40px;
  color: #999;
}

.readonly-tip {
  margin-top: 20px;
  padding: 15px;
  background: #fdf6ec;
  color: #e6a23c;
  border-radius: 8px;
  text-align: center;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.share-result {
  text-align: center;
}

.share-result p {
  margin-bottom: 10px;
}
</style>
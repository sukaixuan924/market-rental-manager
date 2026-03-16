<script setup lang="ts">
import { ref } from 'vue'
import { useStallStore } from '@/stores/stall'
import { ElMessage, ElMessageBox } from 'element-plus'

const stallStore = useStallStore()

// 关于信息
const version = ref('1.0.0')
const buildDate = ref('2026-03-16')

// 导出位置数据
const exportStalls = () => {
  const data = JSON.stringify(stallStore.stalls, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `market-stalls-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 导入位置数据
const importStalls = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (Array.isArray(data)) {
        data.forEach((stall: any) => {
          if (stall.name && stall.defaultPrice) {
            stallStore.addStall({
              name: stall.name,
              area: stall.area || '',
              defaultPrice: stall.defaultPrice || 50,
              longTermPrice: stall.longTermPrice || 800,
              status: stall.status || 'active'
            })
          }
        })
        ElMessage.success(`成功导入 ${data.length} 个位置`)
      }
    } catch {
      ElMessage.success('导入失败，文件格式错误')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

// 清除所有数据
const clearAllData = async () => {
  try {
    await ElMessageBox.confirm('确定要清除所有数据吗？此操作不可恢复！', '警告')
    
    localStorage.removeItem('market_stalls')
    localStorage.removeItem('market_rentals')
    
    // 重新加载
    stallStore.loadStalls()
    
    ElMessage.success('数据已清除')
    setTimeout(() => location.reload(), 500)
  } catch {
    // 用户取消
  }
}

// 重置演示数据
const loadDemoData = async () => {
  try {
    await ElMessageBox.confirm('将添加演示数据，是否继续？', '提示')
    
    // 添加演示位置
    const stalls = [
      { name: 'A区1号', area: 'A区', defaultPrice: 50, longTermPrice: 800, status: 'active' as const },
      { name: 'A区2号', area: 'A区', defaultPrice: 50, longTermPrice: 800, status: 'active' as const },
      { name: 'A区3号', area: 'A区', defaultPrice: 60, longTermPrice: 900, status: 'active' as const },
      { name: 'B区1号', area: 'B区', defaultPrice: 40, longTermPrice: 600, status: 'active' as const },
      { name: 'B区2号', area: 'B区', defaultPrice: 40, longTermPrice: 600, status: 'active' as const },
      { name: '入口处', area: '主通道', defaultPrice: 80, longTermPrice: 1200, status: 'active' as const }
    ]
    
    stalls.forEach(s => stallStore.addStall(s))
    
    ElMessage.success('演示数据已添加')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <h2>设置</h2>
    </div>

    <!-- 数据管理 -->
    <div class="section">
      <h3>📁 数据管理</h3>
      
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title">导出位置数据</div>
          <div class="setting-desc">将所有位置信息导出为 JSON 文件</div>
        </div>
        <el-button @click="exportStalls">导出</el-button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title">导入位置数据</div>
          <div class="setting-desc">从 JSON 文件导入位置信息</div>
        </div>
        <el-button @click="($refs.fileInput as HTMLInputElement)?.click()">
          导入
        </el-button>
        <input 
          ref="fileInput" 
          type="file" 
          accept=".json" 
          style="display: none" 
          @change="importStalls"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title">加载演示数据</div>
          <div class="setting-desc">添加示例位置和记录</div>
        </div>
        <el-button @click="loadDemoData">添加</el-button>
      </div>

      <div class="setting-item danger">
        <div class="setting-info">
          <div class="setting-title">清除所有数据</div>
          <div class="setting-desc">删除所有位置和记录，不可恢复</div>
        </div>
        <el-button type="danger" @click="clearAllData">清除</el-button>
      </div>
    </div>

    <!-- 关于 -->
    <div class="section">
      <h3>ℹ️ 关于</h3>
      
      <div class="about-info">
        <div class="app-name">🏪 市场日租管理系统</div>
        <div class="app-version">版本 {{ version }}</div>
        <div class="app-build">构建日期 {{ buildDate }}</div>
        <div class="app-desc">
          为市场日租位置管理者提供便捷的信息化管理工具
        </div>
      </div>

      <div class="feature-list">
        <div class="feature-item">✅ 位置管理 - 轻松管理摊位位置</div>
        <div class="feature-item">📅 日历视图 - 直观的出租日历</div>
        <div class="feature-item">📝 记录管理 - 记录每日出租情况</div>
        <div class="feature-item">📊 数据统计 - 收入统计与分析</div>
        <div class="feature-item">📱 响应式设计 - 移动端与PC端兼容</div>
      </div>
    </div>

    <!-- 使用提示 -->
    <div class="section">
      <h3>💡 使用提示</h3>
      
      <div class="tips">
        <p>• 数据存储在浏览器本地，更换设备不会同步</p>
        <p>• 建议定期导出数据备份</p>
        <p>• 点击日历中的日期可快速添加记录</p>
        <p>• 已付款记录显示绿色，未付款显示黄色</p>
        <p>• 长租会在日历中显示为蓝色区间</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
}

.page-header h2 {
  margin: 0 0 20px 0;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.section h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #333;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.danger {
  background: rgba(245, 34, 45, 0.05);
  margin: 0 -20px;
  padding: 16px 20px;
  border-radius: 0;
}

.setting-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: #999;
}

.about-info {
  text-align: center;
  padding: 20px 0;
}

.app-name {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.app-version {
  color: #667eea;
  font-weight: 500;
  margin-bottom: 4px;
}

.app-build {
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}

.app-desc {
  color: #666;
}

.feature-list {
  margin-top: 20px;
}

.feature-item {
  padding: 8px 0;
  color: #333;
}

.tips {
  color: #666;
  line-height: 2;
}

.tips p {
  margin: 0;
}
</style>
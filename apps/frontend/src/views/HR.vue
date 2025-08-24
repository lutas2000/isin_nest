<template>
  <div class="hr-page">
    <h1>人力資源管理</h1>
    
    <div class="hr-modules">
      <div class="module-card" @click="navigateToModule('staff')">
        <div class="module-icon">👥</div>
        <h3>員工管理</h3>
        <p>管理員工基本資料、職位、部門資訊</p>
      </div>
      
      <div class="module-card" @click="navigateToModule('attendance')">
        <div class="module-icon">📅</div>
        <h3>出勤管理</h3>
        <p>記錄員工出勤狀況、加班時數</p>
      </div>
      
      <div class="module-card" @click="navigateToModule('manhour')">
        <div class="module-icon">⏰</div>
        <h3>工時管理</h3>
        <p>追蹤專案工時、工作時數統計</p>
      </div>
      
      <div class="module-card" @click="navigateToModule('leave')">
        <div class="module-icon">🏖️</div>
        <h3>請假管理</h3>
        <p>處理員工請假申請、假期餘額</p>
      </div>
      
      <div class="module-card" @click="navigateToModule('segment')">
        <div class="module-icon">🏢</div>
        <h3>部門管理</h3>
        <p>組織架構、部門設定、權限管理</p>
      </div>
      
      <div class="module-card" @click="navigateToModule('working-hours')">
        <div class="module-icon">📊</div>
        <h3>工時統計</h3>
        <p>工時報表、統計分析、資料匯出</p>
      </div>
    </div>
    
    <div class="quick-stats">
      <h2>快速統計</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">{{ stats.totalStaff }}</div>
          <div class="stat-label">總員工數</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.activeStaff }}</div>
          <div class="stat-label">在職員工</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.onLeave }}</div>
          <div class="stat-label">請假中</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ stats.totalHours }}</div>
          <div class="stat-label">本月工時</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 模擬統計資料
const stats = ref({
  totalStaff: 0,
  activeStaff: 0,
  onLeave: 0,
  totalHours: 0
})

const navigateToModule = (module: string) => {
  // 這裡可以導航到具體的模組頁面
  console.log(`導航到 ${module} 模組`)
}

onMounted(() => {
  // 模擬載入資料
  setTimeout(() => {
    stats.value = {
      totalStaff: 45,
      activeStaff: 42,
      onLeave: 3,
      totalHours: 1680
    }
  }, 500)
})
</script>

<style scoped>
.hr-page {
  max-width: 1200px;
  margin: 0 auto;
}

.hr-page h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
  font-size: 2.5rem;
}

.hr-modules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.module-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.module-card:hover {
  transform: translateY(-5px);
  border-color: #667eea;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.2);
}

.module-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.module-card h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.module-card p {
  color: #666;
  line-height: 1.6;
}

.quick-stats {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.quick-stats h2 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}
</style>

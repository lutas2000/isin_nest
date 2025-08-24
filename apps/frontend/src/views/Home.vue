<template>
  <div class="dashboard">
    <!-- 歡迎區塊 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>歡迎回來，管理員！</h1>
        <p>今天是 {{ currentDate }}，讓我們來看看工廠的運營狀況</p>
      </div>
      <div class="welcome-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">📊</span>
          生成報表
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">⚡</span>
          快速操作
        </button>
      </div>
    </div>

    <!-- KPI 指標卡片 -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-primary">
        <div class="kpi-icon">💰</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ kpiData.revenue }}</div>
          <div class="kpi-label">本月營收</div>
          <div class="kpi-change positive">+12.5%</div>
        </div>
      </div>

      <div class="kpi-card kpi-success">
        <div class="kpi-icon">📦</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ kpiData.orders }}</div>
          <div class="kpi-label">待處理訂單</div>
          <div class="kpi-change negative">+5</div>
        </div>
      </div>

      <div class="kpi-card kpi-warning">
        <div class="kpi-icon">⚙️</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ kpiData.production }}</div>
          <div class="kpi-label">生產效率</div>
          <div class="kpi-change positive">+8.3%</div>
        </div>
      </div>

      <div class="kpi-card kpi-info">
        <div class="kpi-icon">👥</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ kpiData.staff }}</div>
          <div class="kpi-label">在職員工</div>
          <div class="kpi-change neutral">0</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="dashboard-content">
      <div class="content-grid">
        <!-- 生產狀態 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3>生產狀態</h3>
            <button class="btn btn-sm btn-outline">查看詳情</button>
          </div>
          <div class="card-body">
            <div class="production-status">
              <div class="status-item">
                <div class="status-indicator running"></div>
                <div class="status-info">
                  <div class="status-name">CNC 車床 #1</div>
                  <div class="status-detail">正在加工 - 零件 A-123</div>
                  <div class="status-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: 75%"></div>
                    </div>
                    <span class="progress-text">75%</span>
                  </div>
                </div>
              </div>

              <div class="status-item">
                <div class="status-indicator idle"></div>
                <div class="status-info">
                  <div class="status-name">CNC 銑床 #2</div>
                  <div class="status-detail">待機中 - 等待下一個任務</div>
                </div>
              </div>

              <div class="status-item">
                <div class="status-indicator maintenance"></div>
                <div class="status-info">
                  <div class="status-name">CNC 鑽床 #3</div>
                  <div class="status-detail">維護中 - 預計 2 小時完成</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 訂單概覽 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3>訂單概覽</h3>
            <button class="btn btn-sm btn-outline">查看全部</button>
          </div>
          <div class="card-body">
            <div class="order-summary">
              <div class="order-stat">
                <div class="stat-number">{{ orderStats.total }}</div>
                <div class="stat-label">總訂單數</div>
              </div>
              <div class="order-stat">
                <div class="stat-number">{{ orderStats.pending }}</div>
                <div class="stat-label">待處理</div>
              </div>
              <div class="order-stat">
                <div class="stat-number">{{ orderStats.processing }}</div>
                <div class="stat-label">製作中</div>
              </div>
              <div class="order-stat">
                <div class="stat-number">{{ orderStats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>

            <div class="recent-orders">
              <h4>最近訂單</h4>
              <div class="order-list">
                <div
                  class="order-item"
                  v-for="order in recentOrders"
                  :key="order.id"
                >
                  <div class="order-info">
                    <div class="order-id">{{ order.id }}</div>
                    <div class="order-customer">{{ order.customer }}</div>
                  </div>
                  <div class="order-status">
                    <span class="badge" :class="`badge-${order.status}`">
                      {{ order.statusText }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 庫存警報 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3>庫存警報</h3>
            <button class="btn btn-sm btn-outline">管理庫存</button>
          </div>
          <div class="card-body">
            <div class="inventory-alerts">
              <div
                class="alert-item alert-warning"
                v-for="alert in inventoryAlerts"
                :key="alert.id"
              >
                <div class="alert-icon">⚠️</div>
                <div class="alert-content">
                  <div class="alert-title">{{ alert.title }}</div>
                  <div class="alert-detail">{{ alert.detail }}</div>
                </div>
                <div class="alert-action">
                  <button class="btn btn-sm btn-warning">補貨</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 員工出勤 -->
        <div class="dashboard-card">
          <div class="card-header">
            <h3>員工出勤</h3>
            <button class="btn btn-sm btn-outline">查看詳情</button>
          </div>
          <div class="card-body">
            <div class="attendance-summary">
              <div class="attendance-stat">
                <div class="stat-number">{{ attendanceStats.present }}</div>
                <div class="stat-label">在班</div>
              </div>
              <div class="attendance-stat">
                <div class="stat-number">{{ attendanceStats.absent }}</div>
                <div class="stat-label">缺勤</div>
              </div>
              <div class="attendance-stat">
                <div class="stat-number">{{ attendanceStats.late }}</div>
                <div class="stat-label">遲到</div>
              </div>
            </div>

            <div class="attendance-chart">
              <div
                class="chart-bar"
                v-for="(value, day) in attendanceChart"
                :key="day"
              >
                <div class="bar-label">{{ day }}</div>
                <div class="bar-container">
                  <div class="bar-fill" :style="{ height: `${value}%` }"></div>
                </div>
                <div class="bar-value">{{ value }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作區 -->
    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="action-grid">
        <button class="action-btn" @click="quickAction('newOrder')">
          <div class="action-icon">📋</div>
          <div class="action-text">新增訂單</div>
        </button>
        <button class="action-btn" @click="quickAction('newQuote')">
          <div class="action-icon">💰</div>
          <div class="action-text">建立報價</div>
        </button>
        <button class="action-btn" @click="quickAction('addStaff')">
          <div class="action-icon">👤</div>
          <div class="action-text">新增員工</div>
        </button>
        <button class="action-btn" @click="quickAction('inventory')">
          <div class="action-icon">📦</div>
          <div class="action-text">庫存盤點</div>
        </button>
        <button class="action-btn" @click="quickAction('reports')">
          <div class="action-icon">📊</div>
          <div class="action-text">生成報表</div>
        </button>
        <button class="action-btn" @click="quickAction('maintenance')">
          <div class="action-icon">🔧</div>
          <div class="action-text">設備維護</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 當前日期
const currentDate = ref('');
const updateDate = () => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

// KPI 資料
const kpiData = ref({
  revenue: 'NT$ 2,450,000',
  orders: 23,
  production: '87.5%',
  staff: 45,
});

// 訂單統計
const orderStats = ref({
  total: 156,
  pending: 23,
  processing: 34,
  completed: 99,
});

// 最近訂單
const recentOrders = ref([
  {
    id: 'ORD-2024-001',
    customer: '台灣精密工業',
    status: 'processing',
    statusText: '製作中',
  },
  {
    id: 'ORD-2024-002',
    customer: '高雄機械廠',
    status: 'pending',
    statusText: '待處理',
  },
  {
    id: 'ORD-2024-003',
    customer: '台中製造商',
    status: 'completed',
    statusText: '已完成',
  },
]);

// 庫存警報
const inventoryAlerts = ref([
  { id: 1, title: '鋁合金板材', detail: '庫存不足，剩餘 50 片' },
  { id: 2, title: '不鏽鋼棒材', detail: '庫存不足，剩餘 20 根' },
  { id: 3, title: '切削刀具', detail: '庫存不足，剩餘 5 組' },
]);

// 出勤統計
const attendanceStats = ref({
  present: 42,
  absent: 2,
  late: 1,
});

// 出勤圖表
const attendanceChart = ref({
  週一: 95,
  週二: 98,
  週三: 92,
  週四: 96,
  週五: 94,
});

// 快速操作
const quickAction = (action: string) => {
  console.log(`執行快速操作: ${action}`);
  // 這裡可以導航到對應頁面或打開模態框
};

onMounted(() => {
  updateDate();
  // 每秒更新一次時間（可選）
  setInterval(updateDate, 60000);
});
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* 歡迎區塊 */
.welcome-section {
  background: linear-gradient(
    135deg,
    var(--primary-600) 0%,
    var(--primary-800) 100%
  );
  color: white;
  padding: 2rem;
  border-radius: var(--border-radius-xl);
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-content h1 {
  color: white;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-3xl);
}

.welcome-content p {
  color: var(--primary-100);
  margin: 0;
  font-size: var(--font-size-lg);
}

.welcome-actions {
  display: flex;
  gap: 1rem;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* KPI 指標卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.kpi-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.kpi-content {
  flex: 1;
}

.kpi-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.kpi-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.5rem;
}

.kpi-change {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  display: inline-block;
}

.kpi-change.positive {
  background-color: var(--success-100);
  color: var(--success-700);
}

.kpi-change.negative {
  background-color: var(--danger-100);
  color: var(--danger-700);
}

.kpi-change.neutral {
  background-color: var(--secondary-100);
  color: var(--secondary-700);
}

/* 主要內容區域 */
.dashboard-content {
  margin-bottom: 2rem;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.dashboard-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--secondary-200);
  background-color: var(--secondary-50);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.card-body {
  padding: 1.5rem;
}

/* 生產狀態 */
.production-status {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--secondary-50);
  border-radius: var(--border-radius);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.running {
  background-color: var(--success-500);
  box-shadow: 0 0 0 4px var(--success-100);
}

.status-indicator.idle {
  background-color: var(--warning-500);
  box-shadow: 0 0 0 4px var(--warning-100);
}

.status-indicator.maintenance {
  background-color: var(--danger-500);
  box-shadow: 0 0 0 4px var(--danger-100);
}

.status-info {
  flex: 1;
}

.status-name {
  font-weight: 600;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.status-detail {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.5rem;
}

.status-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--secondary-200);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-500);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--secondary-600);
  min-width: 2rem;
}

/* 訂單概覽 */
.order-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.order-stat {
  text-align: center;
  padding: 1rem;
  background-color: var(--secondary-50);
  border-radius: var(--border-radius);
}

.stat-number {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--primary-600);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.recent-orders h4 {
  margin-bottom: 1rem;
  color: var(--secondary-800);
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--secondary-50);
  border-radius: var(--border-radius);
}

.order-info {
  flex: 1;
}

.order-id {
  font-weight: 600;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.order-customer {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

/* 庫存警報 */
.inventory-alerts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--warning-200);
  background-color: var(--warning-50);
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: var(--warning-800);
  margin-bottom: 0.25rem;
}

.alert-detail {
  font-size: var(--font-size-sm);
  color: var(--warning-700);
}

/* 員工出勤 */
.attendance-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.attendance-stat {
  text-align: center;
  padding: 1rem;
  background-color: var(--secondary-50);
  border-radius: var(--border-radius);
}

.attendance-chart {
  display: flex;
  align-items: end;
  gap: 1rem;
  height: 120px;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.bar-label {
  font-size: var(--font-size-xs);
  color: var(--secondary-600);
  text-align: center;
}

.bar-container {
  width: 100%;
  height: 80px;
  background-color: var(--secondary-100);
  border-radius: var(--border-radius);
  overflow: hidden;
  position: relative;
}

.bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to top, var(--primary-500), var(--primary-400));
  transition: height 0.3s ease;
}

.bar-value {
  font-size: var(--font-size-xs);
  color: var(--secondary-600);
  font-weight: 500;
}

/* 快速操作 */
.quick-actions {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
}

.quick-actions h3 {
  margin-bottom: 1.5rem;
  color: var(--secondary-900);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-btn {
  background: none;
  border: 2px solid var(--secondary-200);
  padding: 1.5rem 1rem;
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.action-btn:hover {
  border-color: var(--primary-500);
  background-color: var(--primary-50);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-icon {
  font-size: 2rem;
}

.action-text {
  font-weight: 500;
  color: var(--secondary-700);
  text-align: center;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .welcome-actions {
    flex-direction: column;
    width: 100%;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .order-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .attendance-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .order-summary,
  .attendance-summary {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>

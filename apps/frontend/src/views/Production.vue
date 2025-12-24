<template>
  <div class="production-page">
    <div class="page-header">
      <div class="header-content">
        <h1>生產管理</h1>
        <p>監控生產設備狀態、排程和品質控制</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">📋</span>
          新增工單
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">⚙️</span>
          設備維護
        </button>
      </div>
    </div>

    <!-- 生產概覽 -->
    <div class="production-overview">
      <div class="overview-card">
        <div class="overview-icon">⚙️</div>
        <div class="overview-content">
          <div class="overview-value">{{ productionStats.totalMachines }}</div>
          <div class="overview-label">總設備數</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">🟢</div>
        <div class="overview-content">
          <div class="overview-value">{{ productionStats.running }}</div>
          <div class="overview-label">運行中</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">🟡</div>
        <div class="overview-content">
          <div class="overview-value">{{ productionStats.idle }}</div>
          <div class="overview-label">待機中</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">🔴</div>
        <div class="overview-content">
          <div class="overview-value">{{ productionStats.maintenance }}</div>
          <div class="overview-label">維護中</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">📊</div>
        <div class="overview-content">
          <div class="overview-value">{{ productionStats.efficiency }}%</div>
          <div class="overview-label">整體效率</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">🎯</div>
        <div class="overview-content">
          <div class="overview-value">{{ productionStats.quality }}%</div>
          <div class="overview-label">品質合格率</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="production-content">
      <div class="content-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 設備狀態 -->
      <div v-if="activeTab === 'equipment'" class="tab-content">
        <SectionHeader title="設備狀態監控">
          <template #actions>
            <select class="form-control" v-model="equipmentFilter">
              <option value="">全部狀態</option>
              <option value="running">運行中</option>
              <option value="idle">待機中</option>
              <option value="maintenance">維護中</option>
              <option value="error">故障</option>
            </select>
          </template>
        </SectionHeader>

        <div class="equipment-grid">
          <div
            class="equipment-card"
            v-for="machine in filteredEquipment"
            :key="machine.id"
            :class="`status-${machine.status}`"
          >
            <div class="equipment-header">
              <div class="equipment-icon">{{ machine.icon }}</div>
              <div class="equipment-info">
                <h4>{{ machine.name }}</h4>
                <p>{{ machine.type }}</p>
              </div>
              <div class="equipment-status">
                <span class="status-badge" :class="`status-${machine.status}`">
                  {{ machine.statusText }}
                </span>
              </div>
            </div>

            <div class="equipment-details">
              <div class="detail-row">
                <span class="detail-label">當前任務：</span>
                <span class="detail-value">{{
                  machine.currentTask || '無'
                }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">運行時間：</span>
                <span class="detail-value">{{ machine.runtime }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">溫度：</span>
                <span class="detail-value">{{ machine.temperature }}°C</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">震動：</span>
                <span class="detail-value">{{ machine.vibration }}</span>
              </div>
            </div>

            <div class="equipment-progress" v-if="machine.status === 'running'">
              <div class="progress-info">
                <span>進度：{{ machine.progress }}%</span>
                <span>預計完成：{{ machine.eta }}</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${machine.progress}%` }"
                ></div>
              </div>
            </div>

            <div class="equipment-actions">
              <button class="btn btn-sm btn-outline">查看詳情</button>
              <button class="btn btn-sm btn-primary">控制面板</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 生產排程 -->
      <div v-if="activeTab === 'schedule'" class="tab-content">
        <SectionHeader title="生產排程">
          <template #actions>
            <button class="btn btn-primary">新增工單</button>
          </template>
        </SectionHeader>

        <div class="schedule-container">
          <div class="schedule-header">
            <div class="schedule-nav">
              <button class="btn btn-sm btn-outline" @click="previousWeek">
                ◀ 上週
              </button>
              <h4>{{ currentWeekText }}</h4>
              <button class="btn btn-sm btn-outline" @click="nextWeek">
                下週 ▶
              </button>
            </div>
          </div>

          <div class="schedule-grid">
            <div
              class="schedule-day"
              v-for="day in weekSchedule"
              :key="day.date"
            >
              <div class="day-header">
                <div class="day-name">{{ day.dayName }}</div>
                <div class="day-date">{{ day.date }}</div>
              </div>

              <div class="day-tasks">
                <div
                  class="task-item"
                  v-for="task in day.tasks"
                  :key="task.id"
                  :class="`priority-${task.priority}`"
                >
                  <div class="task-header">
                    <div class="task-id">{{ task.id }}</div>
                    <div class="task-priority">{{ task.priorityText }}</div>
                  </div>
                  <div class="task-content">
                    <div class="task-name">{{ task.name }}</div>
                    <div class="task-machine">{{ task.machine }}</div>
                    <div class="task-time">
                      {{ task.startTime }} - {{ task.endTime }}
                    </div>
                  </div>
                  <div class="task-status">
                    <span class="status-badge" :class="`status-${task.status}`">
                      {{ task.statusText }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 品質控制 -->
      <div v-if="activeTab === 'quality'" class="tab-content">
        <SectionHeader title="品質控制">
          <template #actions>
            <select class="form-control" v-model="qualityFilter">
              <option value="">全部狀態</option>
              <option value="passed">合格</option>
              <option value="failed">不合格</option>
              <option value="pending">待檢驗</option>
            </select>
          </template>
        </SectionHeader>

        <div class="quality-stats">
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ qualityStats.passed }}</div>
              <div class="stat-label">合格品</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">❌</div>
            <div class="stat-content">
              <div class="stat-value">{{ qualityStats.failed }}</div>
              <div class="stat-label">不合格品</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-value">{{ qualityStats.pending }}</div>
              <div class="stat-label">待檢驗</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ qualityStats.rate }}%</div>
              <div class="stat-label">合格率</div>
            </div>
          </div>
        </div>

        <div class="quality-table">
          <table class="table">
            <thead>
              <tr>
                <th>檢驗編號</th>
                <th>產品名稱</th>
                <th>批次號</th>
                <th>檢驗項目</th>
                <th>檢驗結果</th>
                <th>檢驗員</th>
                <th>檢驗時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="inspection in filteredInspections"
                :key="inspection.id"
              >
                <td>{{ inspection.id }}</td>
                <td>{{ inspection.product }}</td>
                <td>{{ inspection.batch }}</td>
                <td>{{ inspection.item }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="`status-${inspection.result}`"
                  >
                    {{ inspection.resultText }}
                  </span>
                </td>
                <td>{{ inspection.inspector }}</td>
                <td>{{ inspection.time }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-outline">查看詳情</button>
                    <button class="btn btn-sm btn-primary">重新檢驗</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { SectionHeader } from '@/components';

// 頁面標籤
const tabs = [
  { id: 'equipment', label: '設備狀態' },
  { id: 'schedule', label: '生產排程' },
  { id: 'quality', label: '品質控制' },
];

const activeTab = ref('equipment');

// 生產統計
const productionStats = ref({
  totalMachines: 12,
  running: 8,
  idle: 3,
  maintenance: 1,
  efficiency: 87.5,
  quality: 98.2,
});

// 設備篩選
const equipmentFilter = ref('');

// 設備資料
const equipment = ref([
  {
    id: 1,
    name: 'CNC 車床 #1',
    type: '精密車床',
    icon: '⚙️',
    status: 'running',
    statusText: '運行中',
    currentTask: '零件 A-123 加工',
    runtime: '6h 23m',
    temperature: '45',
    vibration: '正常',
    progress: 75,
    eta: '2h 15m',
  },
  {
    id: 2,
    name: 'CNC 銑床 #2',
    type: '立式銑床',
    icon: '🔧',
    status: 'idle',
    statusText: '待機中',
    currentTask: null,
    runtime: '0h 0m',
    temperature: '28',
    vibration: '正常',
    progress: 0,
    eta: '-',
  },
  {
    id: 3,
    name: 'CNC 鑽床 #3',
    type: '深孔鑽床',
    icon: '🔄',
    status: 'maintenance',
    statusText: '維護中',
    currentTask: null,
    runtime: '0h 0m',
    temperature: '25',
    vibration: '正常',
    progress: 0,
    eta: '-',
  },
]);

// 篩選後的設備
const filteredEquipment = computed(() => {
  if (!equipmentFilter.value) return equipment.value;
  return equipment.value.filter(
    (machine) => machine.status === equipmentFilter.value,
  );
});

// 週排程
const currentWeek = ref(0);
const weekSchedule = ref([
  {
    dayName: '週一',
    date: '01/15',
    tasks: [
      {
        id: 'WO-001',
        name: '鋁合金零件 A-123',
        machine: 'CNC 車床 #1',
        startTime: '08:00',
        endTime: '16:00',
        priority: 'high',
        priorityText: '高',
        status: 'running',
        statusText: '進行中',
      },
    ],
  },
  {
    dayName: '週二',
    date: '01/16',
    tasks: [
      {
        id: 'WO-002',
        name: '不鏽鋼軸承 B-456',
        machine: 'CNC 銑床 #2',
        startTime: '08:00',
        endTime: '12:00',
        priority: 'medium',
        priorityText: '中',
        status: 'pending',
        statusText: '待開始',
      },
    ],
  },
]);

const currentWeekText = computed(() => {
  return '2024年 第3週';
});

const previousWeek = () => {
  currentWeek.value--;
};

const nextWeek = () => {
  currentWeek.value++;
};

// 品質控制
const qualityFilter = ref('');
const qualityStats = ref({
  passed: 1245,
  failed: 23,
  pending: 45,
  rate: 98.2,
});

const inspections = ref([
  {
    id: 'QC-001',
    product: '鋁合金零件 A-123',
    batch: 'B2024-001',
    item: '尺寸檢驗',
    result: 'passed',
    resultText: '合格',
    inspector: '張檢驗員',
    time: '2024-01-15 14:30',
  },
  {
    id: 'QC-002',
    product: '不鏽鋼軸承 B-456',
    batch: 'B2024-002',
    item: '硬度檢驗',
    result: 'failed',
    resultText: '不合格',
    inspector: '李檢驗員',
    time: '2024-01-15 15:45',
  },
]);

const filteredInspections = computed(() => {
  if (!qualityFilter.value) return inspections.value;
  return inspections.value.filter(
    (inspection) => inspection.result === qualityFilter.value,
  );
});
</script>

<style scoped>
.production-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* 頁面標題 */
.page-header {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin-bottom: 0.5rem;
  color: var(--secondary-900);
}

.header-content p {
  color: var(--secondary-600);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 生產概覽 */
.production-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.overview-card {
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

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.overview-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.overview-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

/* 主要內容區域 */
.production-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.content-tabs {
  display: flex;
  border-bottom: 1px solid var(--secondary-200);
  background-color: var(--secondary-50);
}

.tab-btn {
  background: none;
  border: none;
  padding: 1rem 2rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--secondary-600);
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
}

.tab-btn:hover {
  color: var(--secondary-800);
  background-color: var(--secondary-100);
}

.tab-btn.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-600);
  background-color: white;
}

.tab-content {
  padding: 2rem;
}

/* content-header 樣式已移至 SectionHeader 組件 */

/* 設備網格 */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.equipment-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
  transition: all 0.2s ease;
}

.equipment-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.equipment-card.status-running {
  border-left: 4px solid var(--success-500);
}

.equipment-card.status-idle {
  border-left: 4px solid var(--warning-500);
}

.equipment-card.status-maintenance {
  border-left: 4px solid var(--danger-500);
}

.equipment-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.equipment-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.equipment-info h4 {
  margin: 0 0 0.25rem 0;
  color: var(--secondary-900);
}

.equipment-info p {
  margin: 0;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-running {
  background-color: var(--success-100);
  color: var(--success-700);
}

.status-badge.status-idle {
  background-color: var(--warning-100);
  color: var(--warning-700);
}

.status-badge.status-maintenance {
  background-color: var(--danger-100);
  color: var(--danger-700);
}

.equipment-details {
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-sm);
}

.detail-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.detail-value {
  color: var(--secondary-900);
}

.equipment-progress {
  margin-bottom: 1rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.progress-bar {
  height: 8px;
  background-color: var(--secondary-200);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, var(--primary-500), var(--primary-400));
  transition: width 0.3s ease;
}

.equipment-actions {
  display: flex;
  gap: 0.5rem;
}

/* 排程容器 */
.schedule-container {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
}

.schedule-header {
  margin-bottom: 1.5rem;
}

.schedule-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.schedule-nav h4 {
  margin: 0;
  color: var(--secondary-900);
  min-width: 150px;
  text-align: center;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1rem;
}

.schedule-day {
  background: white;
  border-radius: var(--border-radius);
  padding: 1rem;
  min-height: 200px;
}

.day-header {
  text-align: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--secondary-200);
}

.day-name {
  font-weight: 600;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.day-date {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.day-tasks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-item {
  background: var(--secondary-50);
  border-radius: var(--border-radius);
  padding: 0.75rem;
  border-left: 3px solid var(--secondary-300);
}

.task-item.priority-high {
  border-left-color: var(--danger-500);
}

.task-item.priority-medium {
  border-left-color: var(--warning-500);
}

.task-item.priority-low {
  border-left-color: var(--success-500);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-id {
  font-weight: 600;
  color: var(--secondary-900);
  font-size: var(--font-size-sm);
}

.task-priority {
  font-size: var(--font-size-xs);
  padding: 0.125rem 0.5rem;
  border-radius: var(--border-radius);
  background-color: var(--secondary-200);
  color: var(--secondary-700);
}

.task-content {
  margin-bottom: 0.5rem;
}

.task-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
  font-size: var(--font-size-sm);
}

.task-machine {
  font-size: var(--font-size-xs);
  color: var(--secondary-600);
  margin-bottom: 0.25rem;
}

.task-time {
  font-size: var(--font-size-xs);
  color: var(--secondary-500);
}

/* 品質統計 */
.quality-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--secondary-200);
}

.stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

/* 品質表格 */
.quality-table {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.table th {
  background-color: var(--secondary-50);
  font-weight: 600;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table tbody tr:hover {
  background-color: var(--secondary-50);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .schedule-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .production-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1;
    min-width: 120px;
    text-align: center;
  }

  .content-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .equipment-grid {
    grid-template-columns: 1fr;
  }

  .quality-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .production-overview {
    grid-template-columns: 1fr;
  }

  .quality-stats {
    grid-template-columns: 1fr;
  }

  .tab-content {
    padding: 1rem;
  }

  .schedule-container {
    padding: 1rem;
  }
}
</style>

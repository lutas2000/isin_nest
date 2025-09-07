<template>
  <div class="manhour-page">
    <div class="page-header">
      <div class="header-content">
        <h1>上班時段</h1>
        <p>管理員工工時記錄、加班統計和工時分析</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">⏱️</span>
          新增工時
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          工時報表
        </button>
      </div>
    </div>

    <!-- 工時概覽 -->
    <div class="manhour-overview">
      <div class="overview-card">
        <div class="overview-icon">⏰</div>
        <div class="overview-content">
          <div class="overview-value">{{ manhourStats.totalHours }}</div>
          <div class="overview-label">本月總工時</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">👥</div>
        <div class="overview-content">
          <div class="overview-value">{{ manhourStats.avgHours }}</div>
          <div class="overview-label">平均工時/人</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">🔥</div>
        <div class="overview-content">
          <div class="overview-value">{{ manhourStats.overtimeHours }}</div>
          <div class="overview-label">加班時數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">📈</div>
        <div class="overview-content">
          <div class="overview-value">{{ manhourStats.efficiency }}%</div>
          <div class="overview-label">工時效率</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="manhour-content">
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

      <!-- 工時記錄 -->
      <div v-if="activeTab === 'records'" class="tab-content">
        <div class="content-header">
          <h3>工時記錄</h3>
          <div class="header-controls">
            <div class="search-box">
              <input 
                type="text" 
                class="form-control" 
                placeholder="搜尋員工姓名或專案..."
                v-model="recordSearch"
              />
            </div>
            <input 
              type="date" 
              class="form-control" 
              v-model="recordDate"
            />
            <select class="form-control" v-model="recordProject">
              <option value="">全部專案</option>
              <option value="project-a">專案 A</option>
              <option value="project-b">專案 B</option>
              <option value="project-c">專案 C</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>員工姓名</th>
                <th>專案名稱</th>
                <th>工作內容</th>
                <th>開始時間</th>
                <th>結束時間</th>
                <th>工時</th>
                <th>加班時數</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredRecords" :key="record.id">
                <td>{{ record.date }}</td>
                <td>{{ record.employeeName }}</td>
                <td>{{ record.projectName }}</td>
                <td>{{ record.workDescription }}</td>
                <td>{{ record.startTime }}</td>
                <td>{{ record.endTime }}</td>
                <td>{{ record.hours }} 小時</td>
                <td>{{ record.overtimeHours || '-' }}</td>
                <td>
                  <span class="badge" :class="`badge-${record.status}`">
                    {{ record.statusText }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-outline">查看詳情</button>
                    <button class="btn btn-sm btn-primary">編輯</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 工時統計 -->
      <div v-if="activeTab === 'statistics'" class="tab-content">
        <div class="content-header">
          <h3>工時統計</h3>
          <div class="header-controls">
            <select class="form-control" v-model="statPeriod">
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="quarter">本季</option>
            </select>
            <button class="btn btn-primary">匯出統計</button>
          </div>
        </div>

        <div class="statistics-grid">
          <div class="stat-card">
            <h4>部門工時統計</h4>
            <div class="dept-stats">
              <div class="dept-item" v-for="dept in deptStats" :key="dept.name">
                <div class="dept-info">
                  <div class="dept-name">{{ dept.name }}</div>
                  <div class="dept-count">{{ dept.employeeCount }} 人</div>
                </div>
                <div class="dept-hours">
                  <div class="total-hours">{{ dept.totalHours }} 小時</div>
                  <div class="avg-hours">平均 {{ dept.avgHours }} 小時/人</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>專案工時分析</h4>
            <div class="project-stats">
              <div class="project-item" v-for="project in projectStats" :key="project.id">
                <div class="project-info">
                  <div class="project-name">{{ project.name }}</div>
                  <div class="project-status">{{ project.status }}</div>
                </div>
                <div class="project-hours">
                  <div class="planned-hours">計劃: {{ project.plannedHours }} 小時</div>
                  <div class="actual-hours">實際: {{ project.actualHours }} 小時</div>
                  <div class="variance" :class="getVarianceClass(project.variance)">
                    {{ project.variance > 0 ? '+' : '' }}{{ project.variance }} 小時
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>加班統計</h4>
            <div class="overtime-stats">
              <div class="overtime-item" v-for="ot in overtimeStats" :key="ot.employeeId">
                <div class="overtime-info">
                  <div class="overtime-name">{{ ot.employeeName }}</div>
                  <div class="overtime-dept">{{ ot.department }}</div>
                </div>
                <div class="overtime-data">
                  <div class="overtime-hours">{{ ot.totalOvertime }} 小時</div>
                  <div class="overtime-rate">{{ ot.overtimeRate }}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 工時報表 -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <div class="content-header">
          <h3>工時報表</h3>
          <div class="header-controls">
            <select class="form-control" v-model="reportType">
              <option value="employee">員工工時報表</option>
              <option value="project">專案工時報表</option>
              <option value="department">部門工時報表</option>
            </select>
            <input 
              type="date" 
              class="form-control" 
              v-model="reportStartDate"
            />
            <input 
              type="date" 
              class="form-control" 
              v-model="reportEndDate"
            />
            <button class="btn btn-primary">產生報表</button>
          </div>
        </div>

        <div class="reports-content">
          <div class="report-summary">
            <h4>報表摘要</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">報表期間</div>
                <div class="summary-value">{{ reportStartDate }} 至 {{ reportEndDate }}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">總工時</div>
                <div class="summary-value">{{ reportSummary.totalHours }} 小時</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">加班時數</div>
                <div class="summary-value">{{ reportSummary.overtimeHours }} 小時</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">參與員工</div>
                <div class="summary-value">{{ reportSummary.employeeCount }} 人</div>
              </div>
            </div>
          </div>
          
          <div class="report-chart">
            <h4>工時趨勢圖</h4>
            <div class="chart-placeholder">
              <div class="chart-text">📊 工時趨勢圖表</div>
              <p>顯示選定期間的工時變化趨勢</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 頁面標籤
const tabs = [
  { id: 'records', label: '工時記錄' },
  { id: 'statistics', label: '工時統計' },
  { id: 'reports', label: '工時報表' },
];

const activeTab = ref('records');

// 工時統計
const manhourStats = ref({
  totalHours: 1840,
  avgHours: 176,
  overtimeHours: 320,
  efficiency: 92.5,
});

// 搜尋和篩選
const recordSearch = ref('');
const recordDate = ref('');
const recordProject = ref('');
const statPeriod = ref('month');
const reportType = ref('employee');
const reportStartDate = ref('');
const reportEndDate = ref('');

// 工時記錄資料
const manhourRecords = ref([
  {
    id: 1,
    date: '2024-01-15',
    employeeName: '張小明',
    projectName: '專案 A',
    workDescription: 'CNC 零件加工',
    startTime: '08:00',
    endTime: '17:00',
    hours: 8,
    overtimeHours: 1,
    status: 'completed',
    statusText: '已完成',
  },
  {
    id: 2,
    date: '2024-01-15',
    employeeName: '李小華',
    projectName: '專案 B',
    workDescription: '機械設計',
    startTime: '09:00',
    endTime: '18:00',
    hours: 8,
    overtimeHours: 0,
    status: 'in-progress',
    statusText: '進行中',
  },
  {
    id: 3,
    date: '2024-01-15',
    employeeName: '王美玲',
    projectName: '專案 C',
    workDescription: '客戶溝通',
    startTime: '08:30',
    endTime: '17:30',
    hours: 8,
    overtimeHours: 0.5,
    status: 'completed',
    statusText: '已完成',
  },
]);

// 篩選後的記錄
const filteredRecords = computed(() => {
  let filtered = manhourRecords.value;

  if (recordSearch.value) {
    filtered = filtered.filter(
      (record) =>
        record.employeeName.toLowerCase().includes(recordSearch.value.toLowerCase()) ||
        record.projectName.toLowerCase().includes(recordSearch.value.toLowerCase()) ||
        record.workDescription.toLowerCase().includes(recordSearch.value.toLowerCase()),
    );
  }

  if (recordDate.value) {
    filtered = filtered.filter((record) => record.date === recordDate.value);
  }

  if (recordProject.value) {
    filtered = filtered.filter((record) => record.projectName === recordProject.value);
  }

  return filtered;
});

// 部門統計
const deptStats = ref([
  { name: '生產部', employeeCount: 15, totalHours: 720, avgHours: 48 },
  { name: '工程部', employeeCount: 8, totalHours: 384, avgHours: 48 },
  { name: '業務部', employeeCount: 5, totalHours: 200, avgHours: 40 },
  { name: '人資部', employeeCount: 3, totalHours: 120, avgHours: 40 },
]);

// 專案統計
const projectStats = ref([
  { id: 1, name: '專案 A', status: '進行中', plannedHours: 400, actualHours: 380, variance: -20 },
  { id: 2, name: '專案 B', status: '已完成', plannedHours: 300, actualHours: 320, variance: 20 },
  { id: 3, name: '專案 C', status: '規劃中', plannedHours: 200, actualHours: 150, variance: -50 },
]);

// 加班統計
const overtimeStats = ref([
  { employeeId: 'EMP-001', employeeName: '張小明', department: '生產部', totalOvertime: 25, overtimeRate: 15.6 },
  { employeeId: 'EMP-002', employeeName: '李小華', department: '工程部', totalOvertime: 18, overtimeRate: 12.5 },
  { employeeId: 'EMP-003', employeeName: '王美玲', department: '業務部', totalOvertime: 12, overtimeRate: 10.0 },
]);

// 報表摘要
const reportSummary = ref({
  totalHours: 1840,
  overtimeHours: 320,
  employeeCount: 31,
});

// 取得差異類別
const getVarianceClass = (variance: number) => {
  if (variance > 0) return 'text-danger';
  if (variance < 0) return 'text-success';
  return 'text-secondary';
};

// 初始化日期
reportStartDate.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
reportEndDate.value = new Date().toISOString().split('T')[0];
</script>

<style scoped>
.manhour-page {
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

/* 工時概覽 */
.manhour-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.overview-icon {
  font-size: 2.5rem;
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
.manhour-content {
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

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.content-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.header-controls {
  display: flex;
  gap: 1rem;
}

.search-box {
  min-width: 300px;
}

/* 表格容器 */
.table-container {
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

/* 統計網格 */
.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.stat-card h4 {
  margin: 0 0 1rem 0;
  color: var(--secondary-900);
}

/* 部門統計 */
.dept-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dept-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius);
}

.dept-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.dept-count {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.total-hours {
  font-weight: 600;
  color: var(--primary-600);
  margin-bottom: 0.25rem;
}

.avg-hours {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
}

/* 專案統計 */
.project-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius);
}

.project-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.project-status {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.planned-hours {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.25rem;
}

.actual-hours {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.variance {
  font-weight: 600;
  font-size: var(--font-size-sm);
}

/* 加班統計 */
.overtime-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.overtime-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: var(--border-radius);
}

.overtime-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.overtime-dept {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.overtime-hours {
  font-weight: 600;
  color: var(--warning-600);
  margin-bottom: 0.25rem;
}

.overtime-rate {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
}

/* 報表內容 */
.reports-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.report-summary {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.report-summary h4 {
  margin: 0 0 1rem 0;
  color: var(--secondary-900);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-item {
  background: white;
  padding: 1rem;
  border-radius: var(--border-radius);
  text-align: center;
}

.summary-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary-600);
}

.report-chart {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.report-chart h4 {
  margin: 0 0 1rem 0;
  color: var(--secondary-900);
}

.chart-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  background: white;
  border-radius: var(--border-radius);
  border: 2px dashed var(--secondary-300);
}

.chart-text {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.chart-placeholder p {
  color: var(--secondary-600);
  margin: 0;
}

/* 響應式設計 */
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
  
  .manhour-overview {
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
  
  .header-controls {
    width: 100%;
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .statistics-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .manhour-overview {
    grid-template-columns: 1fr;
  }
  
  .tab-content {
    padding: 1rem;
  }
  
  .table-container {
    font-size: var(--font-size-sm);
  }
  
  .table th,
  .table td {
    padding: 0.5rem;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

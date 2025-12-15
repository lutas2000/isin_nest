<template>
  <div class="attendance-page">
    <PageHeader
      title="出勤管理"
      description="管理員工出勤記錄、打卡時間和考勤統計"
    >
      <template #actions>
        <button class="btn btn-primary">
          <span class="btn-icon">📅</span>
          今日出勤
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          出勤報表
        </button>
      </template>
    </PageHeader>

    <!-- 出勤概覽 -->
    <div class="attendance-overview">
      <div class="overview-card">
        <div class="overview-icon">👥</div>
        <div class="overview-content">
          <div class="overview-value">{{ attendanceStats.totalStaff }}</div>
          <div class="overview-label">總員工數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">✅</div>
        <div class="overview-content">
          <div class="overview-value">{{ attendanceStats.present }}</div>
          <div class="overview-label">已到班</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">⏰</div>
        <div class="overview-content">
          <div class="overview-value">{{ attendanceStats.late }}</div>
          <div class="overview-label">遲到</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">❌</div>
        <div class="overview-content">
          <div class="overview-value">{{ attendanceStats.absent }}</div>
          <div class="overview-label">缺勤</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="attendance-content">
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

      <!-- 今日出勤 -->
      <div v-if="activeTab === 'today'" class="tab-content">
        <div class="content-header">
          <h3>今日出勤狀況 - {{ todayDate }}</h3>
          <div class="header-controls">
            <button class="btn btn-success" @click="refreshAttendance">
              刷新資料
            </button>
          </div>
        </div>

        <DataTable
          :columns="todayColumns"
          :data="todayAttendance"
          :show-actions="false"
        >
          <template #cell-employeeId="{ value }">
            {{ value }}
          </template>
          <template #cell-employeeName="{ value }">
            {{ value }}
          </template>
          <template #cell-department="{ value }">
            {{ value }}
          </template>
          <template #cell-checkInTime="{ row }">
            <span :class="{ 'text-danger': row.checkInTime > '09:00' }">
              {{ row.checkInTime }}
            </span>
          </template>
          <template #cell-checkOutTime="{ value }">
            {{ value || '-' }}
          </template>
          <template #cell-workHours="{ value }">
            {{ value || '-' }}
          </template>
          <template #cell-status="{ row }">
            <span class="badge" :class="`badge-${row.status}`">
              {{ row.statusText }}
            </span>
          </template>
          <template #cell-notes="{ value }">
            {{ value || '-' }}
          </template>
        </DataTable>
      </div>

      <!-- 出勤記錄 -->
      <div v-if="activeTab === 'records'" class="tab-content">
        <div class="content-header">
          <h3>出勤記錄查詢</h3>
          <div class="header-controls">
            <div class="search-box">
              <input 
                type="text" 
                class="form-control" 
                placeholder="搜尋員工姓名或編號..."
                v-model="recordSearch"
              />
            </div>
            <input 
              type="date" 
              class="form-control" 
              v-model="recordDate"
            />
            <select class="form-control" v-model="recordDepartment">
              <option value="">全部部門</option>
              <option value="production">生產部</option>
              <option value="engineering">工程部</option>
              <option value="sales">業務部</option>
              <option value="hr">人資部</option>
            </select>
          </div>
        </div>

        <DataTable
          :columns="recordColumns"
          :data="filteredRecords"
          :show-actions="false"
        >
          <template #cell-date="{ value }">
            {{ value }}
          </template>
          <template #cell-employeeId="{ value }">
            {{ value }}
          </template>
          <template #cell-employeeName="{ value }">
            {{ value }}
          </template>
          <template #cell-department="{ value }">
            {{ value }}
          </template>
          <template #cell-checkInTime="{ value }">
            {{ value }}
          </template>
          <template #cell-checkOutTime="{ value }">
            {{ value }}
          </template>
          <template #cell-workHours="{ value }">
            {{ value }}
          </template>
          <template #cell-overtimeHours="{ value }">
            {{ value || '-' }}
          </template>
          <template #cell-status="{ row }">
            <span class="badge" :class="`badge-${row.status}`">
              {{ row.statusText }}
            </span>
          </template>
        </DataTable>
      </div>

      <!-- 統計報表 -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <div class="content-header">
          <h3>出勤統計報表</h3>
          <div class="header-controls">
            <select class="form-control" v-model="reportPeriod">
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="quarter">本季</option>
            </select>
            <button class="btn btn-primary">匯出報表</button>
          </div>
        </div>

        <div class="reports-grid">
          <div class="report-card">
            <h4>部門出勤率</h4>
            <div class="department-stats">
              <div class="stat-item" v-for="dept in departmentStats" :key="dept.name">
                <div class="stat-label">{{ dept.name }}</div>
                <div class="stat-value">{{ dept.attendanceRate }}%</div>
                <div class="stat-bar">
                  <div class="stat-bar-fill" :style="{ width: dept.attendanceRate + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="report-card">
            <h4>遲到統計</h4>
            <div class="late-stats">
              <div class="late-item" v-for="late in lateStats" :key="late.employeeId">
                <div class="late-info">
                  <div class="late-name">{{ late.employeeName }}</div>
                  <div class="late-department">{{ late.department }}</div>
                </div>
                <div class="late-count">{{ late.lateCount }} 次</div>
              </div>
            </div>
          </div>
          
          <div class="report-card">
            <h4>加班統計</h4>
            <div class="overtime-stats">
              <div class="overtime-item" v-for="ot in overtimeStats" :key="ot.employeeId">
                <div class="overtime-info">
                  <div class="overtime-name">{{ ot.employeeName }}</div>
                  <div class="overtime-department">{{ ot.department }}</div>
                </div>
                <div class="overtime-hours">{{ ot.totalHours }} 小時</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, DataTable } from '@/components';

// 頁面標籤
const tabs = [
  { id: 'today', label: '今日出勤' },
  { id: 'records', label: '出勤記錄' },
  { id: 'reports', label: '統計報表' },
];

const activeTab = ref('today');

// 今日日期
const todayDate = ref('');

// 出勤統計
const attendanceStats = ref({
  totalStaff: 45,
  present: 42,
  late: 3,
  absent: 0,
});

// 搜尋和篩選
const recordSearch = ref('');
const recordDate = ref('');
const recordDepartment = ref('');
const reportPeriod = ref('week');

// 今日出勤資料
const todayAttendance = ref([
  {
    id: 1,
    employeeId: 'EMP-001',
    employeeName: '張小明',
    department: '生產部',
    checkInTime: '08:45',
    checkOutTime: '17:30',
    workHours: '8.75',
    status: 'present',
    statusText: '正常',
    notes: '',
  },
  {
    id: 2,
    employeeId: 'EMP-002',
    employeeName: '李小華',
    department: '工程部',
    checkInTime: '09:15',
    checkOutTime: '18:00',
    workHours: '8.75',
    status: 'late',
    statusText: '遲到',
    notes: '交通延誤',
  },
  {
    id: 3,
    employeeId: 'EMP-003',
    employeeName: '王美玲',
    department: '業務部',
    checkInTime: '08:30',
    checkOutTime: '17:45',
    workHours: '9.25',
    status: 'present',
    statusText: '正常',
    notes: '',
  },
  {
    id: 4,
    employeeId: 'EMP-004',
    employeeName: '陳志強',
    department: '生產部',
    checkInTime: '',
    checkOutTime: '',
    workHours: '',
    status: 'absent',
    statusText: '缺勤',
    notes: '請病假',
  },
]);

// 出勤記錄資料
const attendanceRecords = ref([
  {
    id: 1,
    date: '2024-01-15',
    employeeId: 'EMP-001',
    employeeName: '張小明',
    department: '生產部',
    checkInTime: '08:45',
    checkOutTime: '17:30',
    workHours: '8.75',
    overtimeHours: '0.75',
    status: 'present',
    statusText: '正常',
  },
  {
    id: 2,
    date: '2024-01-15',
    employeeId: 'EMP-002',
    employeeName: '李小華',
    department: '工程部',
    checkInTime: '09:15',
    checkOutTime: '18:00',
    workHours: '8.75',
    overtimeHours: '0',
    status: 'late',
    statusText: '遲到',
  },
  {
    id: 3,
    date: '2024-01-14',
    employeeId: 'EMP-001',
    employeeName: '張小明',
    department: '生產部',
    checkInTime: '08:30',
    checkOutTime: '19:00',
    workHours: '10.5',
    overtimeHours: '2.5',
    status: 'present',
    statusText: '正常',
  },
]);

// 篩選後的記錄
const filteredRecords = computed(() => {
  let filtered = attendanceRecords.value;

  if (recordSearch.value) {
    filtered = filtered.filter(
      (record) =>
        record.employeeId.toLowerCase().includes(recordSearch.value.toLowerCase()) ||
        record.employeeName.toLowerCase().includes(recordSearch.value.toLowerCase()),
    );
  }

  if (recordDate.value) {
    filtered = filtered.filter((record) => record.date === recordDate.value);
  }

  if (recordDepartment.value) {
    filtered = filtered.filter((record) => record.department === recordDepartment.value);
  }

  return filtered;
});

// 今日出勤表格欄位
const todayColumns = [
  { key: 'employeeId', label: '員工編號' },
  { key: 'employeeName', label: '姓名' },
  { key: 'department', label: '部門' },
  { key: 'checkInTime', label: '上班時間' },
  { key: 'checkOutTime', label: '下班時間' },
  { key: 'workHours', label: '工作時數' },
  { key: 'status', label: '狀態' },
  { key: 'notes', label: '備註' },
];

// 出勤記錄表格欄位
const recordColumns = [
  { key: 'date', label: '日期' },
  { key: 'employeeId', label: '員工編號' },
  { key: 'employeeName', label: '姓名' },
  { key: 'department', label: '部門' },
  { key: 'checkInTime', label: '上班時間' },
  { key: 'checkOutTime', label: '下班時間' },
  { key: 'workHours', label: '工作時數' },
  { key: 'overtimeHours', label: '加班時數' },
  { key: 'status', label: '狀態' },
];

// 部門統計
const departmentStats = ref([
  { name: '生產部', attendanceRate: 96.4 },
  { name: '工程部', attendanceRate: 98.2 },
  { name: '業務部', attendanceRate: 94.8 },
  { name: '人資部', attendanceRate: 100 },
]);

// 遲到統計
const lateStats = ref([
  { employeeId: 'EMP-002', employeeName: '李小華', department: '工程部', lateCount: 3 },
  { employeeId: 'EMP-005', employeeName: '林雅婷', department: '人資部', lateCount: 1 },
  { employeeId: 'EMP-008', employeeName: '劉建國', department: '生產部', lateCount: 2 },
]);

// 加班統計
const overtimeStats = ref([
  { employeeId: 'EMP-001', employeeName: '張小明', department: '生產部', totalHours: 12.5 },
  { employeeId: 'EMP-003', employeeName: '王美玲', department: '業務部', totalHours: 8.0 },
  { employeeId: 'EMP-006', employeeName: '黃志明', department: '工程部', totalHours: 15.0 },
]);

// 刷新出勤資料
const refreshAttendance = () => {
  // TODO: 調用 API 刷新資料
  console.log('刷新出勤資料');
};

// 初始化
onMounted(() => {
  const today = new Date();
  todayDate.value = today.toLocaleDateString('zh-TW');
});
</script>

<style scoped>
.attendance-page {
  max-width: 1400px;
  margin: 0 auto;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 出勤概覽 */
.attendance-overview {
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
.attendance-content {
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

/* 報表網格 */
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.report-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.report-card h4 {
  margin: 0 0 1rem 0;
  color: var(--secondary-900);
}

/* 部門統計 */
.department-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-item {
  background: white;
  padding: 1rem;
  border-radius: var(--border-radius);
}

.stat-label {
  font-weight: 500;
  color: var(--secondary-700);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary-600);
  margin-bottom: 0.5rem;
}

.stat-bar {
  width: 100%;
  height: 8px;
  background: var(--secondary-200);
  border-radius: 4px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: var(--primary-500);
  transition: width 0.3s ease;
}

/* 遲到統計 */
.late-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.late-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: var(--border-radius);
}

.late-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.late-department {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.late-count {
  font-weight: 600;
  color: var(--warning-600);
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

.overtime-department {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.overtime-hours {
  font-weight: 600;
  color: var(--info-600);
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
  
  .attendance-overview {
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
  
  .reports-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .attendance-overview {
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
}
</style>

<template>
  <div class="leave-page">
    <PageHeader
      title="請假管理"
      description="管理員工請假申請、審核流程和請假統計"
    >
      <template #actions>
        <button class="btn btn-primary">
          <span class="btn-icon">📝</span>
          新增請假
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          請假報表
        </button>
      </template>
    </PageHeader>

    <!-- 請假概覽 -->
    <div class="leave-overview">
      <div class="overview-card">
        <div class="overview-icon">📅</div>
        <div class="overview-content">
          <div class="overview-value">{{ leaveStats.pendingCount }}</div>
          <div class="overview-label">待審核</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">✅</div>
        <div class="overview-content">
          <div class="overview-value">{{ leaveStats.approvedCount }}</div>
          <div class="overview-label">已核准</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">❌</div>
        <div class="overview-content">
          <div class="overview-value">{{ leaveStats.rejectedCount }}</div>
          <div class="overview-label">已拒絕</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">⏰</div>
        <div class="overview-content">
          <div class="overview-value">{{ leaveStats.totalDays }}</div>
          <div class="overview-label">總請假天數</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="leave-content">
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

      <!-- 請假申請 -->
      <div v-if="activeTab === 'applications'" class="tab-content">
        <div class="content-header">
          <h3>請假申請</h3>
          <div class="header-controls">
            <div class="search-box">
              <input 
                type="text" 
                class="form-control" 
                placeholder="搜尋員工姓名..."
                v-model="applicationSearch"
              />
            </div>
            <select class="form-control" v-model="applicationStatus">
              <option value="">全部狀態</option>
              <option value="pending">待審核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
            </select>
            <select class="form-control" v-model="leaveType">
              <option value="">全部類型</option>
              <option value="annual">年假</option>
              <option value="sick">病假</option>
              <option value="personal">事假</option>
              <option value="maternity">產假</option>
            </select>
          </div>
        </div>

        <DataTable
          :columns="applicationColumns"
          :data="filteredApplications"
          :show-actions="true"
        >
          <template #cell-applyDate="{ value }">
            {{ value }}
          </template>
          <template #cell-employeeName="{ value }">
            {{ value }}
          </template>
          <template #cell-leaveTypeText="{ row }">
            <span class="badge" :class="`badge-${row.leaveType}`">
              {{ row.leaveTypeText }}
            </span>
          </template>
          <template #cell-startDate="{ value }">
            {{ value }}
          </template>
          <template #cell-endDate="{ value }">
            {{ value }}
          </template>
          <template #cell-days="{ value }">
            {{ value }} 天
          </template>
          <template #cell-reason="{ value }">
            {{ value }}
          </template>
          <template #cell-statusText="{ row }">
            <span class="badge" :class="`badge-${row.status}`">
              {{ row.statusText }}
            </span>
          </template>
          <template #actions="{ row }">
            <div class="action-buttons">
              <button class="btn btn-sm btn-outline">查看詳情</button>
              <button
                v-if="row.status === 'pending'"
                class="btn btn-sm btn-success"
              >
                核准
              </button>
              <button
                v-if="row.status === 'pending'"
                class="btn btn-sm btn-danger"
              >
                拒絕
              </button>
            </div>
          </template>
        </DataTable>
      </div>

      <!-- 請假統計 -->
      <div v-if="activeTab === 'statistics'" class="tab-content">
        <div class="content-header">
          <h3>請假統計</h3>
          <div class="header-controls">
            <select class="form-control" v-model="statPeriod">
              <option value="month">本月</option>
              <option value="quarter">本季</option>
              <option value="year">本年</option>
            </select>
            <button class="btn btn-primary">匯出統計</button>
          </div>
        </div>

        <div class="statistics-grid">
          <div class="stat-card">
            <h4>請假類型統計</h4>
            <div class="leave-type-stats">
              <div class="type-item" v-for="type in leaveTypeStats" :key="type.name">
                <div class="type-info">
                  <div class="type-name">{{ type.name }}</div>
                  <div class="type-count">{{ type.count }} 次</div>
                </div>
                <div class="type-days">
                  <div class="total-days">{{ type.totalDays }} 天</div>
                  <div class="avg-days">平均 {{ type.avgDays }} 天/次</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>部門請假統計</h4>
            <div class="dept-leave-stats">
              <div class="dept-item" v-for="dept in deptLeaveStats" :key="dept.name">
                <div class="dept-info">
                  <div class="dept-name">{{ dept.name }}</div>
                  <div class="dept-count">{{ dept.employeeCount }} 人</div>
                </div>
                <div class="dept-leave">
                  <div class="leave-count">{{ dept.leaveCount }} 次</div>
                  <div class="leave-days">{{ dept.totalDays }} 天</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>請假趨勢</h4>
            <div class="trend-chart">
              <div class="chart-placeholder">
                <div class="chart-text">📊 請假趨勢圖表</div>
                <p>顯示請假數量和天數的變化趨勢</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 請假政策 -->
      <div v-if="activeTab === 'policies'" class="tab-content">
        <div class="content-header">
          <h3>請假政策</h3>
          <button class="btn btn-primary">編輯政策</button>
        </div>

        <div class="policies-grid">
          <div class="policy-card" v-for="policy in leavePolicies" :key="policy.type">
            <div class="policy-header">
              <div class="policy-icon">{{ policy.icon }}</div>
              <div class="policy-info">
                <h4>{{ policy.name }}</h4>
                <p>{{ policy.description }}</p>
              </div>
            </div>
            
            <div class="policy-details">
              <div class="detail-row">
                <span class="detail-label">年度配額：</span>
                <span class="detail-value">{{ policy.annualQuota }} 天</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">最小申請單位：</span>
                <span class="detail-value">{{ policy.minUnit }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">提前申請天數：</span>
                <span class="detail-value">{{ policy.advanceNotice }} 天</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">需要證明：</span>
                <span class="detail-value">{{ policy.requiresProof ? '是' : '否' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { PageHeader, DataTable } from '@/components';

// 頁面標籤
const tabs = [
  { id: 'applications', label: '請假申請' },
  { id: 'statistics', label: '請假統計' },
  { id: 'policies', label: '請假政策' },
];

const activeTab = ref('applications');

// 請假統計
const leaveStats = ref({
  pendingCount: 5,
  approvedCount: 28,
  rejectedCount: 3,
  totalDays: 156,
});

// 搜尋和篩選
const applicationSearch = ref('');
const applicationStatus = ref('');
const leaveType = ref('');
const statPeriod = ref('month');

// 請假申請資料
const leaveApplications = ref([
  {
    id: 1,
    applyDate: '2024-01-15',
    employeeName: '張小明',
    leaveType: 'annual',
    leaveTypeText: '年假',
    startDate: '2024-01-20',
    endDate: '2024-01-22',
    days: 3,
    reason: '家庭旅遊',
    status: 'pending',
    statusText: '待審核',
  },
  {
    id: 2,
    applyDate: '2024-01-14',
    employeeName: '李小華',
    leaveType: 'sick',
    leaveTypeText: '病假',
    startDate: '2024-01-16',
    endDate: '2024-01-17',
    days: 2,
    reason: '感冒發燒',
    status: 'approved',
    statusText: '已核准',
  },
  {
    id: 3,
    applyDate: '2024-01-13',
    employeeName: '王美玲',
    leaveType: 'personal',
    leaveTypeText: '事假',
    startDate: '2024-01-18',
    endDate: '2024-01-18',
    days: 1,
    reason: '個人事務',
    status: 'rejected',
    statusText: '已拒絕',
  },
]);

// 篩選後的申請
const filteredApplications = computed(() => {
  let filtered = leaveApplications.value;

  if (applicationSearch.value) {
    filtered = filtered.filter(
      (application) =>
        application.employeeName.toLowerCase().includes(applicationSearch.value.toLowerCase()),
    );
  }

  if (applicationStatus.value) {
    filtered = filtered.filter((application) => application.status === applicationStatus.value);
  }

  if (leaveType.value) {
    filtered = filtered.filter((application) => application.leaveType === leaveType.value);
  }

  return filtered;
});

// 申請列表表格欄位
const applicationColumns = [
  { key: 'applyDate', label: '申請日期' },
  { key: 'employeeName', label: '員工姓名' },
  { key: 'leaveTypeText', label: '請假類型' },
  { key: 'startDate', label: '開始日期' },
  { key: 'endDate', label: '結束日期' },
  { key: 'days', label: '請假天數' },
  { key: 'reason', label: '請假原因' },
  { key: 'statusText', label: '狀態' },
];

// 請假類型統計
const leaveTypeStats = ref([
  { name: '年假', count: 15, totalDays: 45, avgDays: 3.0 },
  { name: '病假', count: 8, totalDays: 16, avgDays: 2.0 },
  { name: '事假', count: 5, totalDays: 5, avgDays: 1.0 },
  { name: '產假', count: 2, totalDays: 90, avgDays: 45.0 },
]);

// 部門請假統計
const deptLeaveStats = ref([
  { name: '生產部', employeeCount: 15, leaveCount: 12, totalDays: 38 },
  { name: '工程部', employeeCount: 8, leaveCount: 8, totalDays: 25 },
  { name: '業務部', employeeCount: 5, leaveCount: 6, totalDays: 18 },
  { name: '人資部', employeeCount: 3, leaveCount: 4, totalDays: 12 },
]);

// 請假政策
const leavePolicies = ref([
  {
    type: 'annual',
    icon: '🏖️',
    name: '年假',
    description: '員工年度休假，用於休息和充電',
    annualQuota: 14,
    minUnit: '0.5 天',
    advanceNotice: 3,
    requiresProof: false,
  },
  {
    type: 'sick',
    icon: '🏥',
    name: '病假',
    description: '員工因病無法工作時的請假',
    annualQuota: 30,
    minUnit: '1 天',
    advanceNotice: 0,
    requiresProof: true,
  },
  {
    type: 'personal',
    icon: '📋',
    name: '事假',
    description: '員工因個人事務需要請假',
    annualQuota: 7,
    minUnit: '0.5 天',
    advanceNotice: 1,
    requiresProof: false,
  },
  {
    type: 'maternity',
    icon: '👶',
    name: '產假',
    description: '女性員工生育期間的請假',
    annualQuota: 84,
    minUnit: '1 天',
    advanceNotice: 30,
    requiresProof: true,
  },
]);
</script>

<style scoped>
.leave-page {
  max-width: 1400px;
  margin: 0 auto;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 請假概覽 */
.leave-overview {
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
.leave-content {
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

/* 請假類型統計 */
.leave-type-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius);
}

.type-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.type-count {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.total-days {
  font-weight: 600;
  color: var(--primary-600);
  margin-bottom: 0.25rem;
}

.avg-days {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
}

/* 部門請假統計 */
.dept-leave-stats {
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

.leave-count {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.leave-days {
  font-weight: 600;
  color: var(--warning-600);
}

/* 趨勢圖表 */
.trend-chart {
  height: 300px;
}

.chart-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  background: white;
  border-radius: var(--border-radius);
  border: 2px dashed var(--secondary-300);
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chart-text {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.chart-placeholder p {
  color: var(--secondary-600);
  margin: 0;
}

/* 請假政策 */
.policies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.policy-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.policy-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.policy-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.policy-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--secondary-900);
}

.policy-info p {
  margin: 0;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.policy-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.detail-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.detail-value {
  color: var(--secondary-900);
  font-weight: 500;
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
  
  .leave-overview {
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
  
  .policies-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .leave-overview {
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

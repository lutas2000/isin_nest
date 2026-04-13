<template>
  <div class="manhour-page">
    <PageHeader
      title="上班時段"
      description="管理員工工時記錄、加班統計和工時分析"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="mr-2">⏱️</span>
          新增工時
        </button>
        <button class="btn btn-outline" @click="activeTab = 'reports'">
          <span class="mr-2">📊</span>
          工時報表
        </button>
      </template>
    </PageHeader>

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
        <div class="overview-icon">📅</div>
        <div class="overview-content">
          <div class="overview-value">{{ manhourStats.recordCount }}</div>
          <div class="overview-label">工時記錄數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">👤</div>
        <div class="overview-content">
          <div class="overview-value">{{ manhourStats.employeeCount }}</div>
          <div class="overview-label">參與員工數</div>
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
        <SectionHeader title="工時記錄">
          <template #actions>
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
              v-model="recordStartDate"
              placeholder="開始日期"
            />
            <input 
              type="date" 
              class="form-control" 
              v-model="recordEndDate"
              placeholder="結束日期"
            />
            <button class="btn btn-outline" @click="loadManhourData">重新載入</button>
          </template>
        </SectionHeader>

        <div class="table-container">
          <template v-if="loading">
            <div style="text-align: center; padding: 2rem;">
              載入中...
            </div>
          </template>
          <template v-else-if="filteredRecords.length === 0">
            <div style="text-align: center; padding: 2rem; color: var(--secondary-600);">
              沒有找到工時記錄
            </div>
          </template>
          <template v-else>
            <DataTable
              :columns="recordColumns"
              :data="filteredRecords"
              :show-actions="true"
            >
              <template #cell-day="{ value }">
                {{ formatDate(value) }}
              </template>
              <template #cell-staffId="{ value }">
                {{ value }}
              </template>
              <template #cell-staffName="{ row }">
                {{ row.staff?.name || '-' }}
              </template>
              <template #cell-department="{ row }">
                {{ row.staff?.department || '-' }}
              </template>
              <template #cell-start_time="{ value }">
                {{ formatDateTime(value) }}
              </template>
              <template #cell-end_time="{ value }">
                {{ formatDateTime(value) }}
              </template>
              <template #cell-work_time="{ value }">
                {{ value }}
              </template>
              <template #actions="{ row }">
                <div class="action-buttons">
                  <button
                    class="btn btn-sm btn-outline"
                    @click="editRecord(row)"
                  >
                    編輯
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    @click="deleteRecord(row.id)"
                  >
                    刪除
                  </button>
                </div>
              </template>
            </DataTable>
          </template>
        </div>
      </div>

      <!-- 工時統計 -->
      <div v-if="activeTab === 'statistics'" class="tab-content">
        <SectionHeader title="工時統計">
          <template #actions>
            <select class="form-control" v-model="statPeriod">
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="quarter">本季</option>
            </select>
            <button class="btn btn-primary" @click="loadStatistics">更新統計</button>
          </template>
        </SectionHeader>

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
            <h4>員工工時排行</h4>
            <div class="employee-stats">
              <div class="employee-item" v-for="emp in employeeStats" :key="emp.staffId">
                <div class="employee-info">
                  <div class="employee-name">{{ emp.employeeName }}</div>
                  <div class="employee-dept">{{ emp.department }}</div>
                </div>
                <div class="employee-hours">
                  <div class="total-hours">{{ emp.totalHours }} 小時</div>
                  <div class="record-count">{{ emp.recordCount }} 筆記錄</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 工時報表 -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <SectionHeader title="工時報表">
          <template #actions>
            <select class="form-control" v-model="reportType">
              <option value="employee">員工工時報表</option>
              <option value="date-range">日期範圍報表</option>
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
            <button class="btn btn-primary" @click="generateReport">產生報表</button>
          </template>
        </SectionHeader>

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
                <div class="summary-label">記錄數</div>
                <div class="summary-value">{{ reportSummary.recordCount }} 筆</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">參與員工</div>
                <div class="summary-value">{{ reportSummary.employeeCount }} 人</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/編輯工時記錄 Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ showCreateModal ? '新增工時記錄' : '編輯工時記錄' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>員工編號 *</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="formData.staffId"
              :disabled="showEditModal"
              required
            />
          </div>
          <div class="form-group">
            <label>日期 *</label>
            <input 
              type="date" 
              class="form-control" 
              v-model="formData.day"
              required
            />
          </div>
          <div class="form-group">
            <label>開始時間</label>
            <input 
              type="datetime-local" 
              class="form-control" 
              v-model="formData.start_time"
            />
          </div>
          <div class="form-group">
            <label>結束時間</label>
            <input 
              type="datetime-local" 
              class="form-control" 
              v-model="formData.end_time"
            />
          </div>
          <div class="form-group">
            <label>工時（小時） *</label>
            <input 
              type="number" 
              class="form-control" 
              v-model.number="formData.work_time"
              step="0.5"
              min="0"
              required
            />
          </div>
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveRecord">{{ showCreateModal ? '新增' : '儲存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, DataTable, SectionHeader } from '@/components';
import { buildApiUrl, API_CONFIG } from '../../config/api';
import { useAuthStore } from '../../stores/auth';

// 型別定義
interface Staff {
  id: string;
  name: string;
  department?: string;
  post?: string;
}

interface StaffManhour {
  id: number;
  staffId: string;
  start_time?: string | Date;
  end_time?: string | Date;
  work_time: number;
  day?: string | Date;
  staff?: Staff;
}

interface ManhourStats {
  totalHours: number;
  avgHours: number;
  recordCount: number;
  employeeCount: number;
}

interface DeptStat {
  name: string;
  employeeCount: number;
  totalHours: number;
  avgHours: number;
}

interface EmployeeStat {
  staffId: string;
  employeeName: string;
  department: string;
  totalHours: number;
  recordCount: number;
}

interface ReportSummary {
  totalHours: number;
  recordCount: number;
  employeeCount: number;
}

// 頁面標籤
const tabs = [
  { id: 'records', label: '工時記錄' },
  { id: 'statistics', label: '工時統計' },
  { id: 'reports', label: '工時報表' },
];

const activeTab = ref('records');
const loading = ref(false);

// 認證 store
const authStore = useAuthStore();

// 工時記錄資料
const manhourRecords = ref<StaffManhour[]>([]);

// 工時統計
const manhourStats = ref<ManhourStats>({
  totalHours: 0,
  avgHours: 0,
  recordCount: 0,
  employeeCount: 0,
});

// 搜尋和篩選
const recordSearch = ref('');
const recordStartDate = ref('');
const recordEndDate = ref('');
const statPeriod = ref('month');
const reportType = ref('employee');
const reportStartDate = ref('');
const reportEndDate = ref('');

// Modal 狀態
const showCreateModal = ref(false);
const showEditModal = ref(false);
const errorMessage = ref('');

// 表單資料
const formData = ref<Partial<StaffManhour>>({
  staffId: '',
  day: '',
  start_time: '',
  end_time: '',
  work_time: 0,
});

// 取得認證標頭
const getAuthHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`;
  }
  
  return headers;
};

// 載入工時資料
const loadManhourData = async () => {
  loading.value = true;
  try {
    let url = buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR);
    
    // 如果有日期範圍，使用日期範圍查詢
    if (recordStartDate.value && recordEndDate.value) {
      url = `${buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR)}/date-range/search?startDate=${recordStartDate.value}&endDate=${recordEndDate.value}`;
    }
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (response.ok) {
      const data = await response.json();
      manhourRecords.value = data;
      updateStats();
    } else {
      console.error('載入工時資料失敗:', response.statusText);
    }
  } catch (error) {
    console.error('載入工時資料失敗:', error);
  } finally {
    loading.value = false;
  }
};

// 更新統計資料
const updateStats = () => {
  const records = manhourRecords.value;
  const totalHours = records.reduce((sum, r) => sum + r.work_time, 0);
  const uniqueEmployees = new Set(records.map(r => r.staffId));
  
  manhourStats.value = {
    totalHours: Math.round(totalHours * 10) / 10,
    avgHours: records.length > 0 ? Math.round((totalHours / uniqueEmployees.size) * 10) / 10 : 0,
    recordCount: records.length,
    employeeCount: uniqueEmployees.size,
  };
};

// 篩選後的記錄
const filteredRecords = computed(() => {
  let filtered = manhourRecords.value;

  if (recordSearch.value) {
    const search = recordSearch.value.toLowerCase();
    filtered = filtered.filter(
      (record) =>
        record.staffId.toLowerCase().includes(search) ||
        record.staff?.name?.toLowerCase().includes(search) ||
        record.staff?.department?.toLowerCase().includes(search),
    );
  }

  return filtered;
});

// 工時記錄表格欄位
const recordColumns = [
  { key: 'day', label: '日期' },
  { key: 'staffId', label: '員工編號' },
  { key: 'staffName', label: '員工姓名' },
  { key: 'department', label: '部門' },
  { key: 'start_time', label: '開始時間' },
  { key: 'end_time', label: '結束時間' },
  { key: 'work_time', label: '工時（小時）' },
];

// 部門統計
const deptStats = ref<DeptStat[]>([]);

// 員工統計
const employeeStats = ref<EmployeeStat[]>([]);

// 載入統計資料
const loadStatistics = async () => {
  try {
    // 計算日期範圍
    const now = new Date();
    let startDate: Date;
    
    if (statPeriod.value === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (statPeriod.value === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // quarter
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
    }
    
    const endDate = now;
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const response = await fetch(
      `${buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR)}/date-range/search?startDate=${startStr}&endDate=${endStr}`,
      {
        headers: getAuthHeaders(),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      calculateDeptStats(data);
      calculateEmployeeStats(data);
    }
  } catch (error) {
    console.error('載入統計資料失敗:', error);
  }
};

// 計算部門統計
const calculateDeptStats = (records: StaffManhour[]) => {
  const deptMap = new Map<string, { employees: Set<string>, hours: number }>();
  
  records.forEach(record => {
    const dept = record.staff?.department || '未分部門';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { employees: new Set(), hours: 0 });
    }
    const stat = deptMap.get(dept)!;
    stat.employees.add(record.staffId);
    stat.hours += record.work_time;
  });
  
  deptStats.value = Array.from(deptMap.entries()).map(([name, stat]) => ({
    name,
    employeeCount: stat.employees.size,
    totalHours: Math.round(stat.hours * 10) / 10,
    avgHours: stat.employees.size > 0 ? Math.round((stat.hours / stat.employees.size) * 10) / 10 : 0,
  }));
};

// 計算員工統計
const calculateEmployeeStats = (records: StaffManhour[]) => {
  const empMap = new Map<string, { name: string, dept: string, hours: number, count: number }>();
  
  records.forEach(record => {
    const empId = record.staffId;
    if (!empMap.has(empId)) {
      empMap.set(empId, {
        name: record.staff?.name || empId,
        dept: record.staff?.department || '-',
        hours: 0,
        count: 0,
      });
    }
    const stat = empMap.get(empId)!;
    stat.hours += record.work_time;
    stat.count += 1;
  });
  
  employeeStats.value = Array.from(empMap.entries())
    .map(([staffId, stat]) => ({
      staffId,
      employeeName: stat.name,
      department: stat.dept,
      totalHours: Math.round(stat.hours * 10) / 10,
      recordCount: stat.count,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10); // 只顯示前10名
};

// 報表摘要
const reportSummary = ref<ReportSummary>({
  totalHours: 0,
  recordCount: 0,
  employeeCount: 0,
});

// 產生報表
const generateReport = async () => {
  if (!reportStartDate.value || !reportEndDate.value) {
    alert('請選擇報表日期範圍');
    return;
  }
  
  try {
    const response = await fetch(
      `${buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR)}/date-range/search?startDate=${reportStartDate.value}&endDate=${reportEndDate.value}`,
      {
        headers: getAuthHeaders(),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const totalHours = data.reduce((sum: number, r: StaffManhour) => sum + r.work_time, 0);
      const uniqueEmployees = new Set(data.map((r: StaffManhour) => r.staffId));
      
      reportSummary.value = {
        totalHours: Math.round(totalHours * 10) / 10,
        recordCount: data.length,
        employeeCount: uniqueEmployees.size,
      };
    }
  } catch (error) {
    console.error('產生報表失敗:', error);
  }
};

// 編輯記錄
const editRecord = (record: StaffManhour) => {
  formData.value = {
    id: record.id,
    staffId: record.staffId,
    day: formatDateForInput(record.day),
    start_time: formatDateTimeForInput(record.start_time),
    end_time: formatDateTimeForInput(record.end_time),
    work_time: record.work_time,
  };
  showEditModal.value = true;
};

// 刪除記錄
const deleteRecord = async (id: number) => {
  if (!confirm('確定要刪除這筆工時記錄嗎？')) {
    return;
  }
  
  try {
    const response = await fetch(
      `${buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR)}/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    
    if (response.ok) {
      await loadManhourData();
    } else {
      alert('刪除失敗');
    }
  } catch (error) {
    console.error('刪除失敗:', error);
    alert('刪除失敗');
  }
};

// 儲存記錄
const saveRecord = async () => {
  errorMessage.value = '';
  
  // 驗證必填欄位
  if (!formData.value.staffId || !formData.value.day || formData.value.work_time === undefined) {
    errorMessage.value = '請填寫所有必填欄位';
    return;
  }
  
  try {
    const payload: any = {
      staffId: formData.value.staffId,
      day: formData.value.day,
      work_time: formData.value.work_time,
    };
    
    if (formData.value.start_time) {
      payload.start_time = formData.value.start_time;
    }
    if (formData.value.end_time) {
      payload.end_time = formData.value.end_time;
    }
    
    const url = showCreateModal.value
      ? buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR)
      : `${buildApiUrl(API_CONFIG.HR.STAFF_MANHOUR)}/${formData.value.id}`;
    
    const method = showCreateModal.value ? 'POST' : 'PUT';
    
    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      closeModal();
      await loadManhourData();
    } else {
      const errorData = await response.json().catch(() => ({}));
      errorMessage.value = errorData.message || '儲存失敗，請稍後再試';
    }
  } catch (error) {
    console.error('儲存失敗:', error);
    errorMessage.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 關閉 Modal
const closeModal = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  errorMessage.value = '';
  formData.value = {
    staffId: '',
    day: '',
    start_time: '',
    end_time: '',
    work_time: 0,
  };
};

// 格式化日期
const formatDate = (date: string | Date | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-TW');
};

// 格式化日期時間
const formatDateTime = (datetime: string | Date | undefined): string => {
  if (!datetime) return '-';
  const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
  return d.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 格式化日期用於 input[type="date"]
const formatDateForInput = (date: string | Date | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// 格式化日期時間用於 input[type="datetime-local"]
const formatDateTimeForInput = (datetime: string | Date | undefined): string => {
  if (!datetime) return '';
  const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
  const iso = d.toISOString();
  return iso.slice(0, 16); // 移除秒和時區
};

// 初始化日期
onMounted(() => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  
  recordStartDate.value = firstDay.toISOString().split('T')[0];
  recordEndDate.value = now.toISOString().split('T')[0];
  reportStartDate.value = firstDay.toISOString().split('T')[0];
  reportEndDate.value = now.toISOString().split('T')[0];
  
  loadManhourData();
  loadStatistics();
});
</script>

<style scoped>
.manhour-page {
  width: 100%;
  margin: 0 auto;
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

/* content-header 樣式已移至 SectionHeader 組件 */

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

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: var(--font-size-sm);
}

.btn-danger {
  background-color: var(--danger-600, #dc2626);
  color: white;
  border: none;
}

.btn-danger:hover {
  background-color: var(--danger-700, #b91c1c);
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

/* 員工統計 */
.employee-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.employee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius);
}

.employee-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.employee-dept {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.record-count {
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

/* Modal 樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--secondary-200);
}

.modal-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--secondary-600);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.modal-close:hover {
  color: var(--secondary-900);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--secondary-700);
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-600);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  color: var(--danger-600, #dc2626);
  font-size: var(--font-size-sm);
  margin-top: 0.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--secondary-200);
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
  
  /* content-header 響應式設計已移至 SectionHeader 組件 */
  
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
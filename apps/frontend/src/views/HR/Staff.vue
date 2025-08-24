<template>
  <div class="staff-page">
    <div class="page-header">
      <div class="header-content">
        <h1>員工管理</h1>
        <p>管理公司員工資訊、職位和權限</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showAddModal = true">
          <span class="btn-icon">👤</span>
          新增員工
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          員工報表
        </button>
      </div>
    </div>

    <!-- 員工統計 -->
    <div class="staff-overview">
      <div class="overview-card">
        <div class="overview-icon">👥</div>
        <div class="overview-content">
          <div class="overview-value">{{ staffStats.totalStaff }}</div>
          <div class="overview-label">總員工數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">🏭</div>
        <div class="overview-content">
          <div class="overview-value">{{ staffStats.productionStaff }}</div>
          <div class="overview-label">生產人員</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">💼</div>
        <div class="overview-content">
          <div class="overview-value">{{ staffStats.officeStaff }}</div>
          <div class="overview-label">行政人員</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">📈</div>
        <div class="overview-content">
          <div class="overview-value">{{ staffStats.attendanceRate }}%</div>
          <div class="overview-label">出勤率</div>
        </div>
      </div>
    </div>

    <!-- 員工列表 -->
    <div class="staff-content">
      <div class="content-header">
        <h3>員工列表</h3>
        <div class="header-controls">
          <div class="search-box">
            <input 
              type="text" 
              class="form-control" 
              placeholder="搜尋員工姓名或編號..."
              v-model="staffSearch"
            />
          </div>
          <select class="form-control" v-model="departmentFilter">
            <option value="">全部部門</option>
            <option value="production">生產部</option>
            <option value="engineering">工程部</option>
            <option value="sales">業務部</option>
            <option value="hr">人資部</option>
            <option value="finance">財務部</option>
          </select>
          <select class="form-control" v-model="statusFilter">
            <option value="">全部狀態</option>
            <option value="active">在職</option>
            <option value="leave">請假</option>
            <option value="resigned">離職</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>員工編號</th>
              <th>姓名</th>
              <th>部門</th>
              <th>職位</th>
              <th>入職日期</th>
              <th>聯絡電話</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="staff in filteredStaff" :key="staff.id">
              <td>{{ staff.id }}</td>
              <td>
                <div class="staff-info">
                  <div class="staff-avatar">{{ staff.name.charAt(0) }}</div>
                  <div class="staff-details">
                    <div class="staff-name">{{ staff.name }}</div>
                    <div class="staff-email">{{ staff.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" :class="`badge-${staff.department}`">
                  {{ staff.departmentText }}
                </span>
              </td>
              <td>{{ staff.position }}</td>
              <td>{{ staff.hireDate }}</td>
              <td>{{ staff.phone }}</td>
              <td>
                <span class="badge" :class="`badge-${staff.status}`">
                  {{ staff.statusText }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-sm btn-outline" @click="viewStaff(staff)">
                    查看詳情
                  </button>
                  <button class="btn btn-sm btn-primary" @click="editStaff(staff)">
                    編輯
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增員工模態框 -->
    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>新增員工</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>
        
        <form class="modal-form" @submit.prevent="addStaff">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">員工編號</label>
              <input type="text" class="form-control" v-model="newStaff.id" required />
            </div>
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input type="text" class="form-control" v-model="newStaff.name" required />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">電子郵件</label>
              <input type="email" class="form-control" v-model="newStaff.email" required />
            </div>
            <div class="form-group">
              <label class="form-label">聯絡電話</label>
              <input type="tel" class="form-control" v-model="newStaff.phone" required />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部門</label>
              <select class="form-control" v-model="newStaff.department" required>
                <option value="">選擇部門</option>
                <option value="production">生產部</option>
                <option value="engineering">工程部</option>
                <option value="sales">業務部</option>
                <option value="hr">人資部</option>
                <option value="finance">財務部</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">職位</label>
              <input type="text" class="form-control" v-model="newStaff.position" required />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">入職日期</label>
              <input type="date" class="form-control" v-model="newStaff.hireDate" required />
            </div>
            <div class="form-group">
              <label class="form-label">薪資</label>
              <input type="number" class="form-control" v-model="newStaff.salary" required />
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="showAddModal = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              新增員工
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 員工統計
const staffStats = ref({
  totalStaff: 45,
  productionStaff: 28,
  officeStaff: 17,
  attendanceRate: 96.5,
});

// 搜尋和篩選
const staffSearch = ref('');
const departmentFilter = ref('');
const statusFilter = ref('');

// 模態框控制
const showAddModal = ref(false);

// 新增員工表單
const newStaff = ref({
  id: '',
  name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  hireDate: '',
  salary: '',
});

// 員工資料
const staffList = ref([
  {
    id: 'EMP-001',
    name: '張小明',
    email: 'zhang.xiaoming@isin.com',
    phone: '0912-345-678',
    department: 'production',
    departmentText: '生產部',
    position: 'CNC操作員',
    hireDate: '2023-01-15',
    status: 'active',
    statusText: '在職',
    salary: 35000,
  },
  {
    id: 'EMP-002',
    name: '李小華',
    email: 'li.xiaohua@isin.com',
    phone: '0923-456-789',
    department: 'engineering',
    departmentText: '工程部',
    position: '機械工程師',
    hireDate: '2022-08-20',
    status: 'active',
    statusText: '在職',
    salary: 45000,
  },
  {
    id: 'EMP-003',
    name: '王美玲',
    email: 'wang.meiling@isin.com',
    phone: '0934-567-890',
    department: 'sales',
    departmentText: '業務部',
    position: '業務專員',
    hireDate: '2023-03-10',
    status: 'active',
    statusText: '在職',
    salary: 38000,
  },
  {
    id: 'EMP-004',
    name: '陳志強',
    email: 'chen.zhiqiang@isin.com',
    phone: '0945-678-901',
    department: 'production',
    departmentText: '生產部',
    position: '品質檢驗員',
    hireDate: '2022-11-05',
    status: 'leave',
    statusText: '請假',
    salary: 32000,
  },
  {
    id: 'EMP-005',
    name: '林雅婷',
    email: 'lin.yating@isin.com',
    phone: '0956-789-012',
    department: 'hr',
    departmentText: '人資部',
    position: '人資專員',
    hireDate: '2023-02-18',
    status: 'active',
    statusText: '在職',
    salary: 40000,
  },
]);

// 篩選後的員工列表
const filteredStaff = computed(() => {
  let filtered = staffList.value;

  if (staffSearch.value) {
    filtered = filtered.filter(
      (staff) =>
        staff.id.toLowerCase().includes(staffSearch.value.toLowerCase()) ||
        staff.name.toLowerCase().includes(staffSearch.value.toLowerCase()) ||
        staff.email.toLowerCase().includes(staffSearch.value.toLowerCase()),
    );
  }

  if (departmentFilter.value) {
    filtered = filtered.filter((staff) => staff.department === departmentFilter.value);
  }

  if (statusFilter.value) {
    filtered = filtered.filter((staff) => staff.status === statusFilter.value);
  }

  return filtered;
});

// 查看員工詳情
const viewStaff = (staff: any) => {
  console.log('查看員工:', staff);
  // TODO: 實作員工詳情頁面
};

// 編輯員工
const editStaff = (staff: any) => {
  console.log('編輯員工:', staff);
  // TODO: 實作編輯員工功能
};

// 新增員工
const addStaff = () => {
  // 這裡應該調用 API 來新增員工
  console.log('新增員工:', newStaff.value);
  
  // 模擬新增成功
  const staff = {
    ...newStaff.value,
    departmentText: getDepartmentText(newStaff.value.department),
    status: 'active',
    statusText: '在職',
  };
  
  staffList.value.push(staff);
  
  // 重置表單
  newStaff.value = {
    id: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hireDate: '',
    salary: '',
  };
  
  showAddModal.value = false;
};

// 取得部門顯示文字
const getDepartmentText = (department: string) => {
  const departmentMap: { [key: string]: string } = {
    production: '生產部',
    engineering: '工程部',
    sales: '業務部',
    hr: '人資部',
    finance: '財務部',
  };
  return departmentMap[department] || department;
};
</script>

<style scoped>
.staff-page {
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

/* 員工統計 */
.staff-overview {
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

/* 員工列表 */
.staff-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.content-header {
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid var(--secondary-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
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

/* 員工資訊 */
.staff-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.staff-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-lg);
}

.staff-details {
  display: flex;
  flex-direction: column;
}

.staff-name {
  font-weight: 500;
  color: var(--secondary-900);
}

.staff-email {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
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

/* 模態框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--secondary-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--secondary-500);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background-color: var(--secondary-100);
}

.modal-form {
  padding: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-weight: 500;
  color: var(--secondary-700);
  margin-bottom: 0.5rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
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
  
  .staff-overview {
    grid-template-columns: repeat(2, 1fr);
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
  
  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .staff-overview {
    grid-template-columns: 1fr;
  }
  
  .table-container {
    font-size: var(--font-size-sm);
  }
  
  .table th,
  .table td {
    padding: 0.5rem;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-form {
    padding: 1rem;
  }
}
</style>

<template>
  <div class="staff-vacation-page">
    <div class="page-header">
      <div class="header-content">
        <h1>員工假期管理</h1>
        <p>管理國定假日、公司假期等假期設定</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showAddModal = true">
          <span class="btn-icon">📅</span>
          新增假期記錄
        </button>
      </div>
    </div>

    <!-- 搜尋和篩選 -->
    <div class="search-filters">
      <div class="search-box">
        <input
          type="text"
          class="form-control"
          placeholder="搜尋假別..."
          v-model="searchQuery"
        />
      </div>
      <div class="filter-controls">
        <select class="form-control" v-model="typeFilter">
          <option value="">全部假別</option>
          <option v-for="type in typeOptions" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
        <select class="form-control" v-model="payFilter">
          <option value="">全部支薪狀態</option>
          <option value="true">支薪</option>
          <option value="false">不支薪</option>
        </select>
        <div class="date-range">
          <input
            type="date"
            class="form-control"
            v-model="startDate"
            placeholder="開始日期"
          />
          <span class="date-separator">至</span>
          <input
            type="date"
            class="form-control"
            v-model="endDate"
            placeholder="結束日期"
          />
          <button class="btn btn-outline" @click="searchByDateRange">
            查詢
          </button>
        </div>
      </div>
    </div>

    <!-- 假期列表 -->
    <div class="vacation-content">
      <div class="content-header">
        <h3>假期記錄列表</h3>
        <div class="header-controls">
          <button class="btn btn-outline" @click="loadVacationData">
            <span class="btn-icon">🔄</span>
            重新載入
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>假別</th>
              <th>是否支薪</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vacation in filteredVacations" :key="vacation.date">
              <td class="clickable-cell" @click="viewVacation(vacation)">
                {{ formatDate(vacation.date) }}
              </td>
              <td>{{ vacation.type }}</td>
              <td>
                <span class="badge" :class="vacation.pay ? 'badge-success' : 'badge-secondary'">
                  {{ vacation.pay ? '支薪' : '不支薪' }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    class="btn btn-sm btn-primary"
                    @click="editVacation(vacation)"
                  >
                    編輯
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    @click="deleteVacation(vacation)"
                  >
                    刪除
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredVacations.length === 0">
              <td colspan="4" class="empty-state">尚無假期記錄</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增假期模態框 -->
    <div
      v-if="showAddModal"
      class="modal-overlay"
      @click="showAddModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>新增假期記錄</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <form class="modal-form" @submit.prevent="addVacation">
          <!-- 錯誤提示 -->
          <ErrorMessage :message="addError" type="error" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">日期 *</label>
              <input
                type="date"
                class="form-control"
                v-model="newVacation.date"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">假別 *</label>
              <input
                type="text"
                class="form-control"
                v-model="newVacation.type"
                placeholder="例如：國定假日、公司假期"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否支薪 *</label>
              <select class="form-control" v-model="newVacation.pay" required>
                <option :value="true">支薪</option>
                <option :value="false">不支薪</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button
              type="button"
              class="btn btn-outline"
              @click="showAddModal = false"
            >
              取消
            </button>
            <button type="submit" class="btn btn-primary">新增假期</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 編輯假期模態框 -->
    <div
      v-if="showEditModal"
      class="modal-overlay"
      @click="showEditModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>編輯假期記錄</h3>
          <button class="modal-close" @click="showEditModal = false">×</button>
        </div>

        <form class="modal-form" @submit.prevent="updateVacation">
          <!-- 錯誤提示 -->
          <ErrorMessage :message="editError" type="error" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">日期</label>
              <input
                type="date"
                class="form-control"
                :value="formatDateForInput(editingVacation.date)"
                readonly
              />
            </div>
            <div class="form-group">
              <label class="form-label">假別 *</label>
              <input
                type="text"
                class="form-control"
                v-model="editingVacation.type"
                placeholder="例如：國定假日、公司假期"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否支薪 *</label>
              <select class="form-control" v-model="editingVacation.pay" required>
                <option :value="true">支薪</option>
                <option :value="false">不支薪</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button
              type="button"
              class="btn btn-outline"
              @click="showEditModal = false"
            >
              取消
            </button>
            <button type="submit" class="btn btn-primary">更新假期</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 查看假期詳情模態框 -->
    <div
      v-if="showViewModal"
      class="modal-overlay"
      @click="showViewModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>假期詳情</h3>
          <button class="modal-close" @click="showViewModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="vacation-detail-grid">
            <div class="detail-section">
              <h4 class="section-title">基本資訊</h4>
              <div class="detail-row">
                <div class="detail-label">日期</div>
                <div class="detail-value">{{ formatDate(viewingVacation.date) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">假別</div>
                <div class="detail-value">{{ viewingVacation.type }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">是否支薪</div>
                <div class="detail-value">
                  <span class="badge" :class="viewingVacation.pay ? 'badge-success' : 'badge-secondary'">
                    {{ viewingVacation.pay ? '支薪' : '不支薪' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" @click="showViewModal = false">
            關閉
          </button>
          <button class="btn btn-primary" @click="editVacation(viewingVacation)">
            編輯假期
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ErrorMessage from '../../components/ErrorMessage.vue';

// 假期類型定義
interface StaffVacation {
  date: string | Date;
  pay: boolean;
  type: string;
}

// 搜尋和篩選
const searchQuery = ref('');
const typeFilter = ref('');
const payFilter = ref('');
const startDate = ref('');
const endDate = ref('');

// 模態框控制
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);

// 錯誤狀態
const addError = ref('');
const editError = ref('');

// 新增假期表單
const newVacation = ref<StaffVacation>({
  date: new Date().toISOString().split('T')[0],
  pay: true,
  type: '',
});

// 編輯假期表單
const editingVacation = ref<StaffVacation>({} as StaffVacation);

// 查看假期詳情
const viewingVacation = ref<StaffVacation>({} as StaffVacation);

// 假期資料
const vacationList = ref<StaffVacation[]>([]);

// 假別選項（從現有資料中提取）
const typeOptions = computed(() => {
  const types = new Set<string>();
  vacationList.value.forEach((vacation) => {
    if (vacation.type) {
      types.add(vacation.type);
    }
  });
  return Array.from(types).sort();
});

// 載入假期資料
const loadVacationData = async () => {
  try {
    const response = await fetch('/api/staff-vacation');
    if (response.ok) {
      const data = await response.json();
      vacationList.value = data;
    }
  } catch (error) {
    console.error('載入假期資料失敗:', error);
    // 使用模擬資料作為備用
    vacationList.value = getMockVacationData();
  }
};

// 模擬假期資料（當 API 不可用時使用）
const getMockVacationData = (): StaffVacation[] => [
  {
    date: '2024-01-01',
    pay: true,
    type: '國定假日',
  },
  {
    date: '2024-02-10',
    pay: true,
    type: '國定假日',
  },
  {
    date: '2024-04-04',
    pay: true,
    type: '國定假日',
  },
  {
    date: '2024-12-25',
    pay: true,
    type: '公司假期',
  },
];

// 篩選後的假期列表
const filteredVacations = computed(() => {
  let filtered = vacationList.value;

  if (searchQuery.value) {
    filtered = filtered.filter((vacation) =>
      vacation.type.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  if (typeFilter.value) {
    filtered = filtered.filter((vacation) => vacation.type === typeFilter.value);
  }

  if (payFilter.value !== '') {
    const payBoolean = payFilter.value === 'true';
    filtered = filtered.filter((vacation) => vacation.pay === payBoolean);
  }

  return filtered.sort((a, b) => {
    const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
    const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
    return dateB.getTime() - dateA.getTime(); // 降序排列（最新的在前）
  });
});

// 查看假期詳情
const viewVacation = (vacation: StaffVacation) => {
  viewingVacation.value = { ...vacation };
  showViewModal.value = true;
};

// 編輯假期
const editVacation = (vacation: StaffVacation) => {
  editingVacation.value = { ...vacation };
  editError.value = '';
  showEditModal.value = true;
};

// 新增假期
const addVacation = async () => {
  // 清除之前的錯誤
  addError.value = '';

  try {
    const response = await fetch('/api/staff-vacation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newVacation.value),
    });

    if (response.ok) {
      const newVacationData = await response.json();
      vacationList.value.push(newVacationData);

      // 重置表單
      newVacation.value = {
        date: new Date().toISOString().split('T')[0],
        pay: true,
        type: '',
      };

      showAddModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      addError.value = errorData.message || '新增假期失敗，請稍後再試';
    }
  } catch (error) {
    console.error('新增假期失敗:', error);
    addError.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 更新假期
const updateVacation = async () => {
  // 清除之前的錯誤
  editError.value = '';

  try {
    const dateString = typeof editingVacation.value.date === 'string' 
      ? editingVacation.value.date 
      : editingVacation.value.date.toISOString().split('T')[0];

    const response = await fetch(`/api/staff-vacation/${dateString}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pay: editingVacation.value.pay,
        type: editingVacation.value.type,
      }),
    });

    if (response.ok) {
      const updatedVacation = await response.json();
      const index = vacationList.value.findIndex(
        (vacation) => {
          const vacationDate = typeof vacation.date === 'string' 
            ? vacation.date 
            : vacation.date.toISOString().split('T')[0];
          return vacationDate === dateString;
        }
      );
      if (index !== -1) {
        vacationList.value[index] = updatedVacation;
      }
      showEditModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      editError.value = errorData.message || '更新假期失敗，請稍後再試';
    }
  } catch (error) {
    console.error('更新假期失敗:', error);
    editError.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 刪除假期
const deleteVacation = async (vacation: StaffVacation) => {
  const dateString = typeof vacation.date === 'string' 
    ? vacation.date 
    : vacation.date.toISOString().split('T')[0];
  
  if (!confirm(`確定要刪除 ${formatDate(vacation.date)} 的假期記錄嗎？`)) {
    return;
  }

  try {
    const response = await fetch(`/api/staff-vacation/${dateString}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      vacationList.value = vacationList.value.filter((v) => {
        const vDate = typeof v.date === 'string' 
          ? v.date 
          : v.date.toISOString().split('T')[0];
        return vDate !== dateString;
      });
    } else {
      alert('刪除假期失敗，請稍後再試');
    }
  } catch (error) {
    console.error('刪除假期失敗:', error);
    alert('網路連線錯誤，請檢查網路連線後再試');
  }
};

// 根據日期範圍查詢
const searchByDateRange = async () => {
  if (!startDate.value || !endDate.value) {
    alert('請選擇開始和結束日期');
    return;
  }

  try {
    const response = await fetch(
      `/api/staff-vacation/date-range?startDate=${startDate.value}&endDate=${endDate.value}`
    );
    if (response.ok) {
      const data = await response.json();
      vacationList.value = data;
    }
  } catch (error) {
    console.error('查詢失敗:', error);
    alert('查詢失敗，請稍後再試');
  }
};

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('zh-TW');
};

// 格式化日期為輸入框格式 (YYYY-MM-DD)
const formatDateForInput = (date: string | Date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
};

// 頁面載入時取得資料
onMounted(() => {
  loadVacationData();
});
</script>

<style scoped>
.staff-vacation-page {
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

/* 搜尋和篩選 */
.search-filters {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  min-width: 300px;
  flex: 1;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-separator {
  color: var(--secondary-600);
  font-weight: 500;
}

/* 假期列表 */
.vacation-content {
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

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--secondary-500);
}

/* 徽章樣式 */
.badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: var(--font-size-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background-color: var(--success-100);
  color: var(--success-700);
}

.badge-danger {
  background-color: var(--danger-100);
  color: var(--danger-700);
}

.badge-warning {
  background-color: var(--warning-100);
  color: var(--warning-700);
}

.badge-info {
  background-color: var(--info-100);
  color: var(--info-700);
}

.badge-secondary {
  background-color: var(--secondary-100);
  color: var(--secondary-700);
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

.modal-body {
  padding: 2rem;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--secondary-200);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.modal-form {
  padding: 2rem;
}

/* 假期詳情樣式 */
.vacation-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.detail-section {
  background: var(--secondary-50);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--secondary-200);
}

.section-title {
  margin: 0 0 1rem 0;
  color: var(--secondary-800);
  font-size: var(--font-size-lg);
  font-weight: 600;
  border-bottom: 2px solid var(--primary-500);
  padding-bottom: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--secondary-200);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: var(--secondary-700);
  min-width: 120px;
}

.detail-value {
  color: var(--secondary-900);
  font-weight: 500;
  text-align: right;
  flex: 1;
}

/* 表單樣式 */
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
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
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

/* 可點擊欄位樣式 */
.clickable-cell {
  cursor: pointer;
  transition: color 0.2s ease;
}

.clickable-cell:hover {
  color: var(--primary-600);
  text-decoration: underline;
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

  .search-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
  }

  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .date-range {
    flex-direction: column;
    align-items: stretch;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
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


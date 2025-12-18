<template>
  <div class="staff-segment-page">
    <PageHeader
      title="員工段別管理"
      description="管理員工工作時段設定、休息時間和特殊班別"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showAddModal = true">
          <span class="btn-icon">⏰</span>
          新增段別設定
        </button>
      </template>
    </PageHeader>

    <!-- 搜尋和篩選 -->
    <div class="search-filters">
      <div class="search-box">
        <input
          type="text"
          class="form-control"
          placeholder="搜尋員工編號或姓名..."
          v-model="searchQuery"
        />
      </div>
      <div class="filter-controls">
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

    <!-- 段別列表 -->
    <div class="segment-content">
      <div class="content-header">
        <h3>段別設定列表</h3>
        <div class="header-controls">
          <button class="btn btn-outline" @click="loadSegmentData">
            <span class="btn-icon">🔄</span>
            重新載入
          </button>
        </div>
      </div>

      <DataTable
        :columns="segmentColumns"
        :data="filteredSegments"
        :show-actions="true"
      >
        <template #cell-staffId="{ row }">
          <span class="clickable-cell" @click="viewSegment(row)">
            {{ row.staffId }}
          </span>
        </template>
        <template #cell-staffName="{ row }">
          {{ getStaffName(row.staffId) }}
        </template>
        <template #cell-begain_time="{ value }">
          {{ value }}
        </template>
        <template #cell-end_time="{ value }">
          {{ value }}
        </template>
        <template #cell-cross_day="{ row }">
          <span
            class="badge"
            :class="row.cross_day ? 'badge-warning' : 'badge-secondary'"
          >
            {{ row.cross_day ? '是' : '否' }}
          </span>
        </template>
        <template #cell-duty="{ row }">
          <span
            class="badge"
            :class="row.duty ? 'badge-info' : 'badge-secondary'"
          >
            {{ row.duty ? '是' : '否' }}
          </span>
        </template>
        <template #cell-night_work="{ row }">
          <span
            class="badge"
            :class="row.night_work ? 'badge-danger' : 'badge-secondary'"
          >
            {{ row.night_work ? '是' : '否' }}
          </span>
        </template>
        <template #cell-rest_time="{ value }">
          {{ value }} 分鐘
        </template>
        <template #cell-rest_time2="{ value }">
          {{ value }} 分鐘
        </template>
        <template #cell-create_date="{ value }">
          {{ formatDate(value) }}
        </template>
        <template #actions="{ row }">
          <div class="action-buttons">
            <button
              class="btn btn-sm btn-primary"
              @click="editSegment(row)"
            >
              編輯
            </button>
            <button
              class="btn btn-sm btn-danger"
              @click="deleteSegment(row)"
            >
              刪除
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- 新增段別模態框 -->
    <div
      v-if="showAddModal"
      class="modal-overlay"
      @click="showAddModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>新增段別設定</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <form class="modal-form" @submit.prevent="addSegment">
          <!-- 錯誤提示 -->
          <ErrorMessage :message="addError" type="error" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">員工 *</label>
              <select class="form-control" v-model="newSegment.staffId" required>
                <option value="">選擇員工</option>
                <option v-for="staff in staffList" :key="staff.id" :value="staff.id">
                  {{ staff.id }} - {{ staff.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">建立日期 *</label>
              <input
                type="date"
                class="form-control"
                v-model="newSegment.create_date"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">開始時間 *</label>
              <input
                type="time"
                class="form-control"
                v-model="newSegment.begain_time"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">結束時間 *</label>
              <input
                type="time"
                class="form-control"
                v-model="newSegment.end_time"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">休息時間(分鐘)</label>
              <input
                type="number"
                class="form-control"
                v-model="newSegment.rest_time"
                min="0"
                max="480"
              />
            </div>
            <div class="form-group">
              <label class="form-label">加班休息時間(分鐘)</label>
              <input
                type="number"
                class="form-control"
                v-model="newSegment.rest_time2"
                min="0"
                max="480"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否跨日</label>
              <select class="form-control" v-model="newSegment.cross_day">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">責任制</label>
              <select class="form-control" v-model="newSegment.duty">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">夜班</label>
              <select class="form-control" v-model="newSegment.night_work">
                <option :value="false">否</option>
                <option :value="true">是</option>
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
            <button type="submit" class="btn btn-primary">新增段別</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 編輯段別模態框 -->
    <div
      v-if="showEditModal"
      class="modal-overlay"
      @click="showEditModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>編輯段別設定</h3>
          <button class="modal-close" @click="showEditModal = false">×</button>
        </div>

        <form class="modal-form" @submit.prevent="updateSegment">
          <!-- 錯誤提示 -->
          <ErrorMessage :message="editError" type="error" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">員工</label>
              <input
                type="text"
                class="form-control"
                :value="getStaffName(editingSegment.staffId)"
                readonly
              />
            </div>
            <div class="form-group">
              <label class="form-label">建立日期 *</label>
              <input
                type="date"
                class="form-control"
                v-model="editingSegment.create_date"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">開始時間 *</label>
              <input
                type="time"
                class="form-control"
                v-model="editingSegment.begain_time"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">結束時間 *</label>
              <input
                type="time"
                class="form-control"
                v-model="editingSegment.end_time"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">休息時間(分鐘)</label>
              <input
                type="number"
                class="form-control"
                v-model="editingSegment.rest_time"
                min="0"
                max="480"
              />
            </div>
            <div class="form-group">
              <label class="form-label">加班休息時間(分鐘)</label>
              <input
                type="number"
                class="form-control"
                v-model="editingSegment.rest_time2"
                min="0"
                max="480"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否跨日</label>
              <select class="form-control" v-model="editingSegment.cross_day">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">責任制</label>
              <select class="form-control" v-model="editingSegment.duty">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">夜班</label>
              <select class="form-control" v-model="editingSegment.night_work">
                <option :value="false">否</option>
                <option :value="true">是</option>
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
            <button type="submit" class="btn btn-primary">更新段別</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 查看段別詳情模態框 -->
    <div
      v-if="showViewModal"
      class="modal-overlay"
      @click="showViewModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>段別詳情</h3>
          <button class="modal-close" @click="showViewModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="segment-detail-grid">
            <!-- 基本資訊 -->
            <div class="detail-section">
              <h4 class="section-title">基本資訊</h4>
              <div class="detail-row">
                <div class="detail-label">員工編號</div>
                <div class="detail-value">{{ viewingSegment.staffId }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">員工姓名</div>
                <div class="detail-value">{{ getStaffName(viewingSegment.staffId) }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">建立日期</div>
                <div class="detail-value">{{ formatDate(viewingSegment.create_date) }}</div>
              </div>
            </div>

            <!-- 時間設定 -->
            <div class="detail-section">
              <h4 class="section-title">時間設定</h4>
              <div class="detail-row">
                <div class="detail-label">開始時間</div>
                <div class="detail-value">{{ viewingSegment.begain_time }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">結束時間</div>
                <div class="detail-value">{{ viewingSegment.end_time }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">休息時間</div>
                <div class="detail-value">{{ viewingSegment.rest_time }} 分鐘</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">加班休息時間</div>
                <div class="detail-value">{{ viewingSegment.rest_time2 }} 分鐘</div>
              </div>
            </div>

            <!-- 班別設定 -->
            <div class="detail-section">
              <h4 class="section-title">班別設定</h4>
              <div class="detail-row">
                <div class="detail-label">是否跨日</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="viewingSegment.cross_day ? 'badge-warning' : 'badge-secondary'"
                  >
                    {{ viewingSegment.cross_day ? '是' : '否' }}
                  </span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">責任制</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="viewingSegment.duty ? 'badge-info' : 'badge-secondary'"
                  >
                    {{ viewingSegment.duty ? '是' : '否' }}
                  </span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">夜班</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="viewingSegment.night_work ? 'badge-danger' : 'badge-secondary'"
                  >
                    {{ viewingSegment.night_work ? '是' : '否' }}
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
          <button class="btn btn-primary" @click="editSegment(viewingSegment)">
            編輯段別
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, DataTable } from '@/components';
import ErrorMessage from '../../components/ErrorMessage.vue';

// 段別類型定義
interface StaffSegment {
  id: number;
  staffId: string;
  begain_time: string;
  end_time: string;
  cross_day: boolean;
  duty: boolean;
  night_work: boolean;
  rest_time: number;
  rest_time2: number;
  create_date: string;
}

// 員工類型定義
interface Staff {
  id: string;
  name: string;
}

// 段別統計
const segmentStats = ref({
  totalSegments: 0,
  nightShifts: 0,
  dutyShifts: 0,
});

// 搜尋和篩選
const searchQuery = ref('');
const staffFilter = ref('');
const shiftTypeFilter = ref('');
const startDate = ref('');
const endDate = ref('');

// 模態框控制
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);

// 錯誤狀態
const addError = ref('');
const editError = ref('');

// 新增段別表單
const newSegment = ref<StaffSegment>({
  id: 0,
  staffId: '',
  begain_time: '08:00',
  end_time: '17:00',
  cross_day: false,
  duty: false,
  night_work: false,
  rest_time: 60,
  rest_time2: 60,
  create_date: new Date().toISOString().split('T')[0],
});

// 編輯段別表單
const editingSegment = ref<StaffSegment>({} as StaffSegment);

// 查看段別詳情
const viewingSegment = ref<StaffSegment>({} as StaffSegment);

// 段別資料
const segmentList = ref<StaffSegment[]>([]);
const staffList = ref<Staff[]>([]);

// 載入段別資料
const loadSegmentData = async () => {
  try {
    const response = await fetch('/api/staff-segment');
    if (response.ok) {
      const data = await response.json();
      segmentList.value = data;
      updateSegmentStats();
    }
  } catch (error) {
    console.error('載入段別資料失敗:', error);
    // 使用模擬資料作為備用
    segmentList.value = getMockSegmentData();
    updateSegmentStats();
  }
};

// 載入員工資料
const loadStaffData = async () => {
  try {
    const response = await fetch('/api/staffs');
    if (response.ok) {
      const data = await response.json();
      staffList.value = data;
    }
  } catch (error) {
    console.error('載入員工資料失敗:', error);
    // 使用模擬資料作為備用
    staffList.value = getMockStaffData();
  }
};

// 更新段別統計
const updateSegmentStats = () => {
  const total = segmentList.value.length;
  const night = segmentList.value.filter((segment) => segment.night_work).length;
  const duty = segmentList.value.filter((segment) => segment.duty).length;

  segmentStats.value = {
    totalSegments: total,
    nightShifts: night,
    dutyShifts: duty,
  };
};

// 模擬段別資料（當 API 不可用時使用）
const getMockSegmentData = () => [
  {
    id: 1,
    staffId: 'STAFF001',
    begain_time: '08:00:00',
    end_time: '17:00:00',
    cross_day: false,
    duty: false,
    night_work: false,
    rest_time: 60,
    rest_time2: 60,
    create_date: '2024-01-01',
  },
  {
    id: 2,
    staffId: 'STAFF002',
    begain_time: '22:00:00',
    end_time: '06:00:00',
    cross_day: true,
    duty: false,
    night_work: true,
    rest_time: 30,
    rest_time2: 30,
    create_date: '2024-01-01',
  },
  {
    id: 3,
    staffId: 'STAFF003',
    begain_time: '09:00:00',
    end_time: '18:00:00',
    cross_day: false,
    duty: true,
    night_work: false,
    rest_time: 60,
    rest_time2: 60,
    create_date: '2024-01-01',
  },
];

// 模擬員工資料（當 API 不可用時使用）
const getMockStaffData = () => [
  { id: 'STAFF001', name: '張小明' },
  { id: 'STAFF002', name: '李小華' },
  { id: 'STAFF003', name: '王美玲' },
  { id: 'STAFF004', name: '陳志強' },
  { id: 'STAFF005', name: '林雅婷' },
];

// 篩選後的段別列表
const filteredSegments = computed(() => {
  let filtered = segmentList.value;

  if (searchQuery.value) {
    filtered = filtered.filter(
      (segment) =>
        segment.staffId.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        getStaffName(segment.staffId).toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  if (staffFilter.value) {
    filtered = filtered.filter((segment) => segment.staffId === staffFilter.value);
  }

  if (shiftTypeFilter.value) {
    if (shiftTypeFilter.value === 'night') {
      filtered = filtered.filter((segment) => segment.night_work);
    } else if (shiftTypeFilter.value === 'duty') {
      filtered = filtered.filter((segment) => segment.duty);
    } else if (shiftTypeFilter.value === 'normal') {
      filtered = filtered.filter((segment) => !segment.night_work && !segment.duty);
    }
  }

  return filtered;
});

// 段別列表表格欄位
const segmentColumns = [
  { key: 'staffId', label: '員工編號' },
  { key: 'staffName', label: '員工姓名' },
  { key: 'begain_time', label: '開始時間' },
  { key: 'end_time', label: '結束時間' },
  { key: 'cross_day', label: '跨日' },
  { key: 'duty', label: '責任制' },
  { key: 'night_work', label: '夜班' },
  { key: 'rest_time', label: '休息時間' },
  { key: 'rest_time2', label: '加班休息' },
  { key: 'create_date', label: '建立日期' },
];

// 取得員工姓名
const getStaffName = (staffId: string) => {
  const staff = staffList.value.find((s) => s.id === staffId);
  return staff ? staff.name : staffId;
};

// 查看段別詳情
const viewSegment = (segment: StaffSegment) => {
  viewingSegment.value = { ...segment };
  showViewModal.value = true;
};

// 編輯段別
const editSegment = (segment: StaffSegment) => {
  editingSegment.value = { ...segment };
  editError.value = '';
  showEditModal.value = true;
};

// 新增段別
const addSegment = async () => {
  // 清除之前的錯誤
  addError.value = '';

  try {
    const response = await fetch('/api/staff-segment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newSegment.value),
    });

    if (response.ok) {
      const newSegmentData = await response.json();
      segmentList.value.push(newSegmentData);
      updateSegmentStats();

      // 重置表單
      newSegment.value = {
        id: 0,
        staffId: '',
        begain_time: '08:00',
        end_time: '17:00',
        cross_day: false,
        duty: false,
        night_work: false,
        rest_time: 60,
        rest_time2: 60,
        create_date: new Date().toISOString().split('T')[0],
      };

      showAddModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      addError.value = errorData.message || '新增段別失敗，請稍後再試';
    }
  } catch (error) {
    console.error('新增段別失敗:', error);
    addError.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 更新段別
const updateSegment = async () => {
  // 清除之前的錯誤
  editError.value = '';

  try {
    const response = await fetch(`/api/staff-segment/${editingSegment.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editingSegment.value),
    });

    if (response.ok) {
      const updatedSegment = await response.json();
      const index = segmentList.value.findIndex(
        (segment) => segment.id === updatedSegment.id
      );
      if (index !== -1) {
        segmentList.value[index] = updatedSegment;
        updateSegmentStats();
      }
      showEditModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      editError.value = errorData.message || '更新段別失敗，請稍後再試';
    }
  } catch (error) {
    console.error('更新段別失敗:', error);
    editError.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 刪除段別
const deleteSegment = async (segment: StaffSegment) => {
  if (!confirm(`確定要刪除員工 ${getStaffName(segment.staffId)} 的段別設定嗎？`)) {
    return;
  }

  try {
    const response = await fetch(`/api/staff-segment/${segment.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      segmentList.value = segmentList.value.filter((s) => s.id !== segment.id);
      updateSegmentStats();
    } else {
      alert('刪除段別失敗，請稍後再試');
    }
  } catch (error) {
    console.error('刪除段別失敗:', error);
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
      `/api/staff-segment/date-range?startDate=${startDate.value}&endDate=${endDate.value}`
    );
    if (response.ok) {
      const data = await response.json();
      segmentList.value = data;
      updateSegmentStats();
    }
  } catch (error) {
    console.error('查詢失敗:', error);
    alert('查詢失敗，請稍後再試');
  }
};

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('zh-TW');
};

// 頁面載入時取得資料
onMounted(() => {
  loadSegmentData();
  loadStaffData();
});
</script>

<style scoped>
.staff-segment-page {
  max-width: 1400px;
  margin: 0 auto;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 段別統計 */
.segment-overview {
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
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

/* 段別列表 */
.segment-content {
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

/* 段別詳情樣式 */
.segment-detail-grid {
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

  .segment-overview {
    grid-template-columns: repeat(2, 1fr);
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
  .segment-overview {
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

<template>
  <div class="staff-page">
    <PageHeader
      title="員工管理"
      description="管理公司員工資訊、職位和權限"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showAddModal = true">
          <span class="btn-icon">👤</span>
          新增員工
        </button>
      </template>
    </PageHeader>

    <!-- 員工統計 -->
    <div class="staff-overview">
      <div class="overview-card">
        <div class="overview-icon">🏭</div>
        <div class="overview-content">
          <div class="overview-value">{{ staffStats.activeStaff }}</div>
          <div class="overview-label">在職員工</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">💼</div>
        <div class="overview-content">
          <div class="overview-value">{{ staffStats.foreignStaff }}</div>
          <div class="overview-label">外勞人數</div>
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
            <option value="技術部">技術部</option>
            <option value="生產部">生產部</option>
            <option value="業務部">業務部</option>
            <option value="人資部">人資部</option>
            <option value="財務部">財務部</option>
          </select>
          <select class="form-control" v-model="statusFilter">
            <option value="">全部狀態</option>
            <option value="active">在職</option>
            <option value="resigned">離職</option>
          </select>
        </div>
      </div>

      <DataTable
        :columns="tableColumns"
        :data="filteredStaff"
        :show-actions="true"
      >
        <template #cell-id="{ row }">
          <span class="clickable-cell" @click="viewStaff(row)">
            {{ row.id }}
          </span>
        </template>

        <template #cell-name="{ row }">
          <div class="staff-info">
            <div class="staff-avatar">{{ row.name.charAt(0) }}</div>
            <div class="staff-details">
              <div
                class="staff-name clickable-cell"
                @click="viewStaff(row)"
              >
                {{ row.name }}
              </div>
              <div class="staff-status">
                <span v-if="row.is_foreign" class="badge badge-warning">
                  外勞
                </span>
              </div>
            </div>
          </div>
        </template>

        <template #cell-post="{ value }">
          {{ value || '-' }}
        </template>

        <template #cell-department="{ value }">
          {{ value || '-' }}
        </template>

        <template #cell-work_group="{ value }">
          {{ value || '-' }}
        </template>

        <template #cell-wage="{ value }">
          {{ value?.toLocaleString() || '-' }}
        </template>

        <template #cell-begain_work="{ value }">
          {{ formatDate(value) }}
        </template>

        <template #cell-status="{ row }">
          <span class="badge" :class="getStatusBadgeClass(row)">
            {{ getStatusText(row) }}
          </span>
        </template>

        <template #actions="{ row }">
          <div class="action-buttons">
            <button
              class="btn btn-sm btn-primary"
              @click="editStaff(row)"
            >
              編輯
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- 新增員工模態框 -->
    <div
      v-if="showAddModal"
      class="modal-overlay"
      @click="showAddModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>新增員工</h3>
          <button class="modal-close" @click="showAddModal = false">×</button>
        </div>

        <form class="modal-form" @submit.prevent="addStaff">
          <!-- 錯誤提示 -->
          <ErrorMessage :message="addError" type="error" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">員工編號 *</label>
              <input
                type="text"
                class="form-control"
                v-model="newStaff.id"
                required
                maxlength="10"
              />
            </div>
            <div class="form-group">
              <label class="form-label">姓名 *</label>
              <input
                type="text"
                class="form-control"
                v-model="newStaff.name"
                required
                maxlength="50"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">職稱</label>
              <input
                type="text"
                class="form-control"
                v-model="newStaff.post"
                maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">工作組別</label>
              <input
                type="text"
                class="form-control"
                v-model="newStaff.work_group"
                maxlength="20"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部門</label>
              <select class="form-control" v-model="newStaff.department">
                <option value="">選擇部門</option>
                <option value="技術部">技術部</option>
                <option value="生產部">生產部</option>
                <option value="業務部">業務部</option>
                <option value="人資部">人資部</option>
                <option value="財務部">財務部</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">到職日期</label>
              <input
                type="date"
                class="form-control"
                v-model="newStaff.begain_work"
                @change="handleDateChange('begain_work')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">本薪 *</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.wage"
                required
                min="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">勤務津貼</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.allowance"
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">幹部加給</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.organizer"
                min="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">勞保</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.labor_insurance"
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">健保</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.health_insurance"
                min="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">退休提撥</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.pension"
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否為外勞</label>
              <select class="form-control" v-model="newStaff.is_foreign">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">是否參加福委會</label>
              <select class="form-control" v-model="newStaff.benifit">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否需要打卡</label>
              <select class="form-control" v-model="newStaff.need_check">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">是否需要外帳</label>
              <select class="form-control" v-model="newStaff.have_fake">
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
            <button type="submit" class="btn btn-primary">新增員工</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 編輯員工模態框 -->
    <div
      v-if="showEditModal"
      class="modal-overlay"
      @click="showEditModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>編輯員工</h3>
          <button class="modal-close" @click="showEditModal = false">×</button>
        </div>

        <form class="modal-form" @submit.prevent="updateStaff">
          <!-- 錯誤提示 -->
          <ErrorMessage :message="editError" type="error" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">員工編號</label>
              <input
                type="text"
                class="form-control"
                v-model="editingStaff.id"
                readonly
              />
            </div>
            <div class="form-group">
              <label class="form-label">姓名 *</label>
              <input
                type="text"
                class="form-control"
                v-model="editingStaff.name"
                required
                maxlength="50"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">職稱</label>
              <input
                type="text"
                class="form-control"
                v-model="editingStaff.post"
                maxlength="50"
              />
            </div>
            <div class="form-group">
              <label class="form-label">工作組別</label>
              <input
                type="text"
                class="form-control"
                v-model="editingStaff.work_group"
                maxlength="20"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部門</label>
              <select class="form-control" v-model="editingStaff.department">
                <option value="">選擇部門</option>
                <option value="技術部">技術部</option>
                <option value="生產部">生產部</option>
                <option value="業務部">業務部</option>
                <option value="人資部">人資部</option>
                <option value="財務部">財務部</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">到職日期</label>
              <input
                type="date"
                class="form-control"
                v-model="editingStaff.begain_work"
                @change="handleEditDateChange('begain_work')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">離職日期</label>
              <input
                type="date"
                class="form-control"
                v-model="editingStaff.stop_work"
                @change="handleEditDateChange('stop_work')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">本薪 *</label>
              <input
                type="number"
                class="form-control"
                v-model="editingStaff.wage"
                required
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">勤務津貼</label>
              <input
                type="number"
                class="form-control"
                v-model="editingStaff.allowance"
                min="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">幹部加給</label>
              <input
                type="number"
                class="form-control"
                v-model="editingStaff.organizer"
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">勞保</label>
              <input
                type="number"
                class="form-control"
                v-model="editingStaff.labor_insurance"
                min="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">健保</label>
              <input
                type="number"
                class="form-control"
                v-model="editingStaff.health_insurance"
                min="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">退休提撥</label>
              <input
                type="number"
                class="form-control"
                v-model="editingStaff.pension"
                min="0"
              />
            </div>
            <div class="form-group">
              <label class="form-label">是否為外勞</label>
              <select class="form-control" v-model="editingStaff.is_foreign">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否參加福委會</label>
              <select class="form-control" v-model="editingStaff.benifit">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">是否需要打卡</label>
              <select class="form-control" v-model="editingStaff.need_check">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否需要外帳</label>
              <select class="form-control" v-model="editingStaff.have_fake">
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
            <button type="submit" class="btn btn-primary">更新員工</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 查看員工詳情模態框 -->
    <div
      v-if="showViewModal"
      class="modal-overlay"
      @click="showViewModal = false"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>員工詳情</h3>
          <button class="modal-close" @click="showViewModal = false">×</button>
        </div>

        <div class="modal-body">
          <div class="staff-detail-grid">
            <!-- 基本資訊 -->
            <div class="detail-section">
              <h4 class="section-title">基本資訊</h4>
              <div class="detail-row">
                <div class="detail-label">員工編號</div>
                <div class="detail-value">{{ viewingStaff.id }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">姓名</div>
                <div class="detail-value">{{ viewingStaff.name }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">職稱</div>
                <div class="detail-value">{{ viewingStaff.post || '-' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">工作組別</div>
                <div class="detail-value">
                  {{ viewingStaff.work_group || '-' }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">部門</div>
                <div class="detail-value">
                  {{ viewingStaff.department || '-' }}
                </div>
              </div>
            </div>

            <!-- 薪資資訊 -->
            <div class="detail-section">
              <h4 class="section-title">薪資資訊</h4>
              <div class="detail-row">
                <div class="detail-label">本薪</div>
                <div class="detail-value">
                  {{ viewingStaff.wage?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">勤務津貼</div>
                <div class="detail-value">
                  {{ viewingStaff.allowance?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">幹部加給</div>
                <div class="detail-value">
                  {{ viewingStaff.organizer?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">勞保</div>
                <div class="detail-value">
                  {{ viewingStaff.labor_insurance?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">健保</div>
                <div class="detail-value">
                  {{ viewingStaff.health_insurance?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">退休提撥</div>
                <div class="detail-value">
                  {{ viewingStaff.pension?.toLocaleString() || '-' }}
                </div>
              </div>
            </div>

            <!-- 工作資訊 -->
            <div class="detail-section">
              <h4 class="section-title">工作資訊</h4>
              <div class="detail-row">
                <div class="detail-label">到職日期</div>
                <div class="detail-value">
                  {{ formatDate(viewingStaff.begain_work) }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">離職日期</div>
                <div class="detail-value">
                  {{
                    viewingStaff.stop_work
                      ? formatDate(viewingStaff.stop_work)
                      : '-'
                  }}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">狀態</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="getStatusBadgeClass(viewingStaff)"
                  >
                    {{ getStatusText(viewingStaff) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 其他設定 -->
            <div class="detail-section">
              <h4 class="section-title">其他設定</h4>
              <div class="detail-row">
                <div class="detail-label">是否為外勞</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="
                      viewingStaff.is_foreign
                        ? 'badge-warning'
                        : 'badge-success'
                    "
                  >
                    {{ viewingStaff.is_foreign ? '是' : '否' }}
                  </span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">是否參加福委會</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="
                      viewingStaff.benifit ? 'badge-success' : 'badge-secondary'
                    "
                  >
                    {{ viewingStaff.benifit ? '是' : '否' }}
                  </span>
                </div>
              </div>

              <div class="detail-row">
                <div class="detail-label">是否需要打卡</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="
                      viewingStaff.need_check ? 'badge-info' : 'badge-secondary'
                    "
                  >
                    {{ viewingStaff.need_check ? '是' : '否' }}
                  </span>
                </div>
              </div>

              <div class="detail-row">
                <div class="detail-label">是否需要外帳</div>
                <div class="detail-value">
                  <span
                    class="badge"
                    :class="
                      viewingStaff.have_fake ? 'badge-warning' : 'badge-success'
                    "
                  >
                    {{ viewingStaff.have_fake ? '是' : '否' }}
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
          <button class="btn btn-primary" @click="editStaff(viewingStaff)">
            編輯員工
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

// 員工類型定義
interface Staff {
  id: string;
  name: string;
  post: string;
  work_group: string;
  department: string;
  wage: number;
  allowance: number;
  organizer: number;
  labor_insurance: number;
  health_insurance: number;
  pension: number;
  is_foreign: boolean;
  benifit: boolean;
  need_check: boolean;
  begain_work: string | null;
  stop_work: string | null;
  have_fake: boolean;
}

// 員工統計
const staffStats = ref({
  activeStaff: 0,
  foreignStaff: 0,
});

// 搜尋和篩選
const staffSearch = ref('');
const departmentFilter = ref('');
const statusFilter = ref('active');

// 模態框控制
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);

// 錯誤狀態
const addError = ref('');
const editError = ref('');

// 新增員工表單
const newStaff = ref<Staff>({
  id: '',
  name: '',
  post: '',
  work_group: '',
  department: '',
  wage: 0,
  allowance: 0,
  organizer: 0,
  labor_insurance: 0,
  health_insurance: 0,
  pension: 0,
  is_foreign: false,
  benifit: false,
  need_check: true,
  begain_work: new Date().toISOString().split('T')[0], // 預設為今天
  stop_work: null,
  have_fake: false,
});

// 編輯員工表單
const editingStaff = ref<Staff>({} as Staff);

// 查看員工詳情
const viewingStaff = ref<Staff>({} as Staff);

// 員工資料
const staffList = ref<Staff[]>([]);

// 載入員工資料
const loadStaffData = async () => {
  try {
    const response = await fetch('/api/staffs');
    if (response.ok) {
      const data = await response.json();
      staffList.value = data;
      updateStaffStats();
    }
  } catch (error) {
    console.error('載入員工資料失敗:', error);
    // 使用模擬資料作為備用
    staffList.value = getMockStaffData();
    updateStaffStats();
  }
};

// 更新員工統計
const updateStaffStats = () => {
  const active = staffList.value.filter((staff) => !staff.stop_work).length;
  const foreign = staffList.value.filter((staff) => staff.is_foreign).length;

  staffStats.value = {
    activeStaff: active,
    foreignStaff: foreign,
  };
};

// 模擬員工資料（當 API 不可用時使用）
const getMockStaffData = () => [
  {
    id: 'STAFF001',
    name: '張小明',
    post: 'CNC操作員',
    work_group: 'A組',
    department: '生產部',
    wage: 35000,
    allowance: 5000,
    organizer: 0,
    labor_insurance: 2000,
    health_insurance: 1500,
    pension: 3000,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2023-01-15',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF002',
    name: '李小華',
    post: '機械工程師',
    work_group: 'B組',
    department: '技術部',
    wage: 45000,
    allowance: 5000,
    organizer: 3000,
    labor_insurance: 2500,
    health_insurance: 1800,
    pension: 3500,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2022-08-20',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF003',
    name: '王美玲',
    post: '業務專員',
    work_group: 'C組',
    department: '業務部',
    wage: 38000,
    allowance: 4000,
    organizer: 0,
    labor_insurance: 2200,
    health_insurance: 1600,
    pension: 3200,
    is_foreign: false,
    benifit: true,
    need_check: false,
    begain_work: '2023-03-10',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF004',
    name: '陳志強',
    post: '品質檢驗員',
    work_group: 'A組',
    department: '生產部',
    wage: 32000,
    allowance: 4000,
    organizer: 0,
    labor_insurance: 1800,
    health_insurance: 1400,
    pension: 2800,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2022-11-05',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF005',
    name: '林雅婷',
    post: '人資專員',
    work_group: 'D組',
    department: '人資部',
    wage: 40000,
    allowance: 4500,
    organizer: 0,
    labor_insurance: 2300,
    health_insurance: 1700,
    pension: 3300,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2023-02-18',
    stop_work: null,
    have_fake: false,
  },
];

// 篩選後的員工列表
const filteredStaff = computed(() => {
  let filtered = staffList.value;

  if (staffSearch.value) {
    filtered = filtered.filter(
      (staff) =>
        staff.id.toLowerCase().includes(staffSearch.value.toLowerCase()) ||
        staff.name.toLowerCase().includes(staffSearch.value.toLowerCase()) ||
        (staff.post &&
          staff.post.toLowerCase().includes(staffSearch.value.toLowerCase())),
    );
  }

  if (departmentFilter.value) {
    filtered = filtered.filter(
      (staff) => staff.department === departmentFilter.value,
    );
  }

  if (statusFilter.value) {
    if (statusFilter.value === 'active') {
      filtered = filtered.filter((staff) => !staff.stop_work);
    } else if (statusFilter.value === 'resigned') {
      filtered = filtered.filter((staff) => staff.stop_work);
    }
  }

  return filtered;
});

// 表格欄位定義
const tableColumns = [
  { key: 'id', label: '員工編號' },
  { key: 'name', label: '姓名' },
  { key: 'post', label: '職稱' },
  { key: 'department', label: '部門' },
  { key: 'work_group', label: '工作組別' },
  { key: 'wage', label: '本薪' },
  { key: 'begain_work', label: '到職日期' },
  { key: 'status', label: '狀態' },
];

// 查看員工詳情
const viewStaff = (staff: Staff) => {
  viewingStaff.value = { ...staff };
  showViewModal.value = true;
};

// 處理日期欄位變更
const handleDateChange = (field: 'begain_work' | 'stop_work') => {
  if (newStaff.value[field] === '') {
    newStaff.value[field] = null;
  }
};

// 處理編輯表單日期欄位變更
const handleEditDateChange = (field: 'begain_work' | 'stop_work') => {
  if (editingStaff.value[field] === '') {
    editingStaff.value[field] = null;
  }
};

// 編輯員工
const editStaff = (staff: Staff) => {
  editingStaff.value = { ...staff };
  editError.value = '';
  showEditModal.value = true;
};

// 新增員工
const addStaff = async () => {
  // 清除之前的錯誤
  addError.value = '';

  // 處理日期欄位，將空字串轉換為 null
  const staffData: Staff = { ...newStaff.value };
  if (staffData.begain_work === '') staffData.begain_work = null;
  if (staffData.stop_work === '') staffData.stop_work = null;

  try {
    const response = await fetch('/api/staffs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(staffData),
    });

    if (response.ok) {
      const newStaffData = await response.json();
      staffList.value.push(newStaffData);
      updateStaffStats();

      // 重置表單
      newStaff.value = {
        id: '',
        name: '',
        post: '',
        work_group: '',
        department: '',
        wage: 0,
        allowance: 0,
        organizer: 0,
        labor_insurance: 0,
        health_insurance: 0,
        pension: 0,
        is_foreign: false,
        benifit: false,
        need_check: true,
        begain_work: new Date().toISOString().split('T')[0], // 預設為今天
        stop_work: null,
        have_fake: false,
      };

      showAddModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      addError.value = errorData.message || '新增員工失敗，請稍後再試';
    }
  } catch (error) {
    console.error('新增員工失敗:', error);
    addError.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 更新員工
const updateStaff = async () => {
  // 清除之前的錯誤
  editError.value = '';

  // 處理日期欄位，將空字串轉換為 null
  const staffData: Staff = { ...editingStaff.value };
  if (staffData.begain_work === '') staffData.begain_work = null;
  if (staffData.stop_work === '') staffData.stop_work = null;

  try {
    const response = await fetch(`/api/staffs/${editingStaff.value.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(staffData),
    });

    if (response.ok) {
      const updatedStaff = await response.json();
      const index = staffList.value.findIndex(
        (staff) => staff.id === updatedStaff.id,
      );
      if (index !== -1) {
        staffList.value[index] = updatedStaff;
        updateStaffStats();
      }
      showEditModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      editError.value = errorData.message || '更新員工失敗，請稍後再試';
    }
  } catch (error) {
    console.error('更新員工失敗:', error);
    editError.value = '網路連線錯誤，請檢查網路連線後再試';
  }
};

// 取得狀態顯示文字
const getStatusText = (staff: Staff) => {
  if (staff.stop_work) {
    return '離職';
  }
  return '在職';
};

// 取得狀態徽章樣式
const getStatusBadgeClass = (staff: Staff) => {
  if (staff.stop_work) {
    return 'badge-danger';
  }
  return 'badge-success';
};

// 格式化日期
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('zh-TW');
};

// 頁面載入時取得資料
onMounted(() => {
  loadStaffData();
});
</script>

<style scoped>
.staff-page {
  max-width: 1400px;
  margin: 0 auto;
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

.staff-status {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

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

/* 員工詳情樣式 */
.staff-detail-grid {
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

.badge-secondary {
  background-color: var(--secondary-100);
  color: var(--secondary-700);
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

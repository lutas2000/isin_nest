<template>
  <div class="staff-page">
    <!-- 上鎖畫面 -->
    <div v-if="isLocked" class="staff-lock-overlay">
      <div class="staff-lock-card">
        <h2 class="staff-lock-title">員工管理 - 已上鎖</h2>
        <p class="staff-lock-desc">請輸入解鎖密碼以檢視員工資料</p>
        <div class="staff-lock-form">
          <label class="form-label">解鎖密碼</label>
          <input
            v-model="passwordInput"
            type="password"
            class="form-control"
            placeholder="請輸入解鎖密碼"
            @keyup.enter="tryUnlock"
          />
          <p v-if="passwordError" class="staff-lock-error">
            {{ passwordError }}
          </p>
          <div class="form-actions">
            <button class="btn btn-primary" type="button" @click="tryUnlock">
              解鎖
            </button>
          </div>
          <p class="staff-lock-hint">
            此頁面若超過 5 分鐘未操作，將自動再次上鎖。
          </p>
        </div>
      </div>
    </div>

    <!-- 主要內容（解鎖後顯示） -->
    <div v-else>
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

      <!-- 員工列表 -->
      <div class="staff-content">
      <TableHeader title="員工列表">
        <template #actions>
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
        </template>
      </TableHeader>

      <EditableDataTable
        :columns="tableColumns"
        :data="filteredStaff"
        :show-actions="true"
        :editable="false"
        @row-view="viewStaff"
        @row-edit="editStaff"
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
      </EditableDataTable>
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

          <!-- 用戶資訊區塊 -->
          <div class="form-section">
            <h4 class="section-title">用戶資訊</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">員工編號 *</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.userName"
                  required
                  placeholder="請輸入員工編號"
                  @input="handleUserNameInput"
                />
                <small class="form-hint">用於登入系統的ID</small>
              </div>
              <div class="form-group">
                <label class="form-label">密碼 *</label>
                <input
                  type="password"
                  class="form-control"
                  v-model="newStaff.password"
                  required
                  placeholder="請輸入密碼"
                  minlength="6"
                />
                <small class="form-hint">至少 6 個字符</small>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">是否為管理員</label>
                <select class="form-control" v-model="newStaff.isAdmin">
                  <option :value="false">否</option>
                  <option :value="true">是</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 員工資訊區塊 -->
          <div class="form-section">
            <h4 class="section-title">員工資訊</h4>
            <div class="form-row">
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
              <div class="form-group">
                <label class="form-label">職稱</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.post"
                  maxlength="50"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">工作組別</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.work_group"
                  maxlength="20"
                  placeholder="例如：A組、B組"
                />
                <small class="form-hint">將根據工作組別自動分配預設權限</small>
              </div>
            <div class="form-group">
              <label class="form-label">部門</label>
              <!-- 可手動輸入或從目前已存在部門中選擇 -->
              <input
                type="text"
                class="form-control"
                v-model="newStaff.department"
                list="department-options"
                placeholder="輸入或選擇部門"
              />
              <datalist id="department-options">
                <option
                  v-for="dept in departmentOptions"
                  :key="dept"
                  :value="dept"
                />
              </datalist>
            </div>
            </div>

            <div class="form-row">
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
          </div>

          <!-- 薪資資訊區塊 -->
          <div class="form-section">
            <h4 class="section-title">薪資資訊</h4>

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
              <!-- 可手動輸入或從目前已存在部門中選擇 -->
              <input
                type="text"
                class="form-control"
                v-model="editingStaff.department"
                list="department-options"
                placeholder="輸入或選擇部門"
              />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { PageHeader, TableHeader } from '@/components';
import EditableDataTable from '@/components/EditableDataTable.vue';
import { useErrorStore } from '@/stores/error';
import { apiPost } from '@/services/api';
import { API_CONFIG } from '@/config/api';

const errorStore = useErrorStore();

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

// 頁面鎖定相關
const isLocked = ref(true);
const passwordInput = ref('');
const passwordError = ref('');
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 分鐘
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const lockScreen = () => {
  isLocked.value = true;
  passwordInput.value = '';
  passwordError.value = '';
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const startIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(() => {
    lockScreen();
  }, IDLE_TIMEOUT);
};

const resetIdleTimer = () => {
  if (!isLocked.value) {
    startIdleTimer();
  }
};

const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

const handleUserActivity = () => {
  resetIdleTimer();
};

const tryUnlock = async () => {
  passwordError.value = '';

  if (!passwordInput.value) {
    passwordError.value = '請輸入密碼';
    return;
  }

  try {
    const response = await fetch('/api/staffs/lock/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: passwordInput.value }),
    });

    if (!response.ok) {
      passwordError.value = '驗證失敗，請稍後再試';
      return;
    }

    const data = await response.json();
    if (data?.valid) {
      isLocked.value = false;
      passwordError.value = '';
      startIdleTimer();
    } else {
      passwordError.value = '密碼錯誤，請再試一次';
    }
  } catch (error) {
    console.error('解鎖驗證失敗:', error);
    passwordError.value = '網路錯誤，請稍後再試';
  }
};

// 搜尋和篩選
const staffSearch = ref('');
const departmentFilter = ref('');
const statusFilter = ref('active');

// 模態框控制
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);


// 新增員工表單（包含用戶資訊）
interface CreateStaffWithUser {
  // 用戶資訊
  userName: string;
  password: string;
  isAdmin?: boolean;
  // 員工資訊
  name: string;
  post?: string;
  work_group?: string;
  department?: string;
  wage?: number;
  allowance?: number;
  organizer?: number;
  labor_insurance?: number;
  health_insurance?: number;
  pension?: number;
  is_foreign?: boolean;
  benifit?: boolean;
  need_check?: boolean;
  begain_work?: string | null;
  stop_work?: string | null;
  have_fake?: boolean;
}

const newStaff = ref<CreateStaffWithUser>({
  userName: '',
  password: '',
  isAdmin: false,
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
      // 確保最後一定是陣列，避免之後呼叫 push 時出現「不是函式」的錯誤
      const list =
        Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
            ? (data as any).items
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];

      staffList.value = list;
    }
  } catch (error) {
    console.error('載入員工資料失敗:', error);
    // 使用模擬資料作為備用
    staffList.value = getMockStaffData();
  }
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

// 部門選項（從目前員工資料中彙總）
const departmentOptions = computed(() => {
  const set = new Set<string>()
  staffList.value.forEach((staff) => {
    if (staff.department) {
      set.add(staff.department)
    }
  })
  return Array.from(set).sort()
})

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

// 處理用戶名輸入（自動生成建議）
const handleUserNameInput = () => {
  // 可以根據姓名自動生成建議的用戶名
  if (!newStaff.value.userName && newStaff.value.name) {
    // 這裡可以添加自動生成邏輯，例如使用姓名的拼音或英文
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
  showEditModal.value = true;
};

// 新增員工（同時創建用戶）
const addStaff = async () => {
  errorStore.clearError();

  // 驗證必填欄位
  if (!newStaff.value.userName || !newStaff.value.password || !newStaff.value.name) {
    errorStore.showError('請填寫所有必填欄位');
    return;
  }

  // 驗證密碼長度
  if (newStaff.value.password.length < 6) {
    errorStore.showError('密碼長度至少需要 6 個字符');
    return;
  }

  // 處理日期欄位，將空字串轉換為 null 或 Date 對象
  const requestData: CreateStaffWithUser = { ...newStaff.value };
  if (requestData.begain_work === '') {
    requestData.begain_work = null;
  } else if (requestData.begain_work) {
    // 將日期字符串轉換為 Date 對象（後端會處理）
    requestData.begain_work = new Date(requestData.begain_work).toISOString().split('T')[0] as any;
  }
  if (requestData.stop_work === '') {
    requestData.stop_work = null;
  } else if (requestData.stop_work) {
    requestData.stop_work = new Date(requestData.stop_work).toISOString().split('T')[0] as any;
  }

  try {
    const response = await apiPost<{ message: string; user: any; staff: Staff }>(
      API_CONFIG.AUTH.CREATE_USER_WITH_STAFF,
      requestData
    );

    // 將新創建的員工添加到列表
    staffList.value.push(response.staff);

    // 重置表單
    newStaff.value = {
      userName: '',
      password: '',
      isAdmin: false,
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
  } catch (error) {
    console.error('新增員工失敗:', error);
    errorStore.showError(error instanceof Error ? error.message : '新增員工失敗，請稍後再試');
  }
};

// 更新員工
const updateStaff = async () => {
  errorStore.clearError();

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
      }
      showEditModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      errorStore.showError(errorData.message || '更新員工失敗，請稍後再試');
    }
  } catch (error) {
    console.error('更新員工失敗:', error);
    errorStore.showError('網路連線錯誤，請檢查網路連線後再試');
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

// 頁面載入時取得資料與掛載活動監聽
onMounted(() => {
  loadStaffData();
  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, handleUserActivity);
  });
});

onUnmounted(() => {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  activityEvents.forEach((eventName) => {
    window.removeEventListener(eventName, handleUserActivity);
  });
});
</script>

<style scoped>
.staff-page {
  width: 100%;
  margin: 0 auto;
}

/* 上鎖畫面樣式 */
.staff-lock-overlay {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.staff-lock-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 2rem;
  border: 1px solid var(--secondary-200);
}

.staff-lock-title {
  margin: 0 0 0.5rem 0;
  font-size: var(--font-size-xl);
  color: var(--secondary-900);
}

.staff-lock-desc {
  margin: 0 0 1.5rem 0;
  color: var(--secondary-600);
}

.staff-lock-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.staff-lock-error {
  color: var(--danger-600);
  font-size: var(--font-size-sm);
}

.staff-lock-hint {
  margin-top: 0.75rem;
  font-size: var(--font-size-xs);
  color: var(--secondary-500);
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 員工列表 */
.staff-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

/* content-header 樣式已移至 SectionHeader 組件 */

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

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--secondary-200);
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section .section-title {
  margin: 0 0 1rem 0;
  color: var(--secondary-800);
  font-size: var(--font-size-lg);
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary-500);
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--font-size-xs);
  color: var(--secondary-600);
  font-style: italic;
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

  /* content-header 響應式設計已移至 SectionHeader 組件 */

  .search-box {
    min-width: auto;
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

<template>
  <div class="staff-leave-page">
    <TableHeader :border="false">
      <template #actions>
        <button class="btn btn-primary" @click="openCreate">
          <span class="mr-2">📝</span>
          登錄請假
        </button>
      </template>
    </TableHeader>

    <div class="leave-layout">
      <div class="leave-main">
        <div class="search-filters">
          <div class="filter-controls">
            <label class="filter-label">月份</label>
            <input type="month" class="form-control" v-model="month" @change="loadLeaves" />
            <label class="filter-label">員工</label>
            <select class="form-control" v-model="filterName" @change="loadLeaves">
              <option value="">全部員工</option>
              <option v-for="staff in staffList" :key="staff.id" :value="staff.name">{{ staff.name }}</option>
            </select>
            <button class="btn btn-outline" @click="loadLeaves">
              <span class="mr-2">🔄</span>
              重新載入
            </button>
          </div>
        </div>

        <SectionHeader :title="`${month} 請假記錄（${leaves.length} 筆，${totalHours} 小時）`" />
        <div class="table-container">
          <EditableDataTable
            :columns="columns"
            :data="leaves"
            :show-actions="canWrite"
            :editable="false"
            :auto-focus-on-mount="false"
            @row-delete="removeLeave"
          >
            <template #cell-start_time="{ value }">{{ toTaipeiMinute(value) }}</template>
            <template #cell-end_time="{ value }">{{ toTaipeiMinute(value) }}</template>
            <template #cell-type="{ value }">
              <span class="badge badge-primary">{{ value }}</span>
            </template>
            <template #actions="{ row }">
              <button class="btn btn-sm btn-danger" @click="removeLeave(row)">刪除</button>
            </template>
          </EditableDataTable>
          <div v-if="!loading && leaves.length === 0" class="empty-state">本月尚無請假記錄</div>
        </div>
      </div>

      <aside class="leave-side">
        <SectionHeader title="已用時數" />
        <div class="balance-card">
          <select class="form-control" v-model="balanceName" @change="loadBalance">
            <option value="">選擇員工</option>
            <option v-for="staff in staffList" :key="staff.id" :value="staff.name">{{ staff.name }}</option>
          </select>
          <template v-if="balance">
            <div class="balance-row">
              <div class="balance-label">特休</div>
              <div class="balance-value">{{ balance.annualLeave.usedHours }} 小時</div>
              <div class="balance-note">{{ balance.annualLeave.periodStart }} ～ {{ balance.annualLeave.periodEnd }}</div>
            </div>
            <div class="balance-row">
              <div class="balance-label">病假</div>
              <div class="balance-value">{{ balance.sickLeave.usedHours }} 小時</div>
              <div class="balance-note">{{ balance.sickLeave.year }} 年</div>
            </div>
          </template>
          <div v-else class="balance-note">選擇員工後顯示特休（到職日週年）與病假（曆年）已用時數</div>
        </div>
      </aside>
    </div>

    <Modal :show="showCreate" title="登錄請假" @close="showCreate = false">
      <form id="leave-form" class="modal-form" @submit.prevent="submitCreate">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">員工 *</label>
            <select class="form-control" v-model="form.name" required @change="applyDefaults">
              <option value="">請選擇</option>
              <option v-for="staff in staffList" :key="staff.id" :value="staff.name">{{ staff.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">假別 *</label>
            <select class="form-control" v-model="form.type" required>
              <option v-for="type in leaveTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">開始 *</label>
            <input type="datetime-local" class="form-control" v-model="form.start" required step="60" @change="applyDefaultsIfDateChanged" />
          </div>
          <div class="form-group">
            <label class="form-label">結束 *</label>
            <input type="datetime-local" class="form-control" v-model="form.end" required step="60" />
          </div>
        </div>
        <p class="form-hint">
          時段預設帶入員工最新段別的上下班時間。跨日會拆成每天一筆，時數以 30 分鐘為單位捨去並扣除休息時間。
          <span v-if="defaultSegmentMissing" class="text-danger">此員工沒有段別設定，無法計算時數。</span>
        </p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-outline" @click="showCreate = false">取消</button>
        <button type="submit" form="leave-form" class="btn btn-primary" :disabled="submitting">送出</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { EditableDataTable, Modal, SectionHeader, TableHeader } from '@/components';
import { apiGet } from '@/services/api';
import {
  createLeave,
  deleteLeave,
  fromDatetimeLocal,
  getLeaveBalance,
  getLeaveDefaults,
  getLeaveTypes,
  getLeavesInRange,
  monthRange,
  toDatetimeLocal,
  toTaipeiMinute,
  todayTaipei,
  type LeaveBalance,
  type StaffLeave,
} from '@/services/hr';
import { API_CONFIG } from '@/config/api';
import { useAuthStore } from '@/stores/auth';
import { useErrorStore } from '@/stores/error';

interface StaffOption {
  id: string;
  name: string;
  stop_work?: string | null;
}

const errorStore = useErrorStore();
const authStore = useAuthStore();

const canWrite = computed(() => {
  if (authStore.isAdmin) return true;
  const features = (authStore.user?.features ?? []) as Array<string | { feature: string; permission: string }>;
  return features.some((f) => typeof f !== 'string' && f.feature === 'hr-staff-leave' && f.permission === 'write');
});

const month = ref(todayTaipei().slice(0, 7));
const filterName = ref('');
const loading = ref(false);
const leaves = ref<StaffLeave[]>([]);
const staffList = ref<StaffOption[]>([]);
const leaveTypes = ref<string[]>([]);

const balanceName = ref('');
const balance = ref<LeaveBalance | null>(null);

const showCreate = ref(false);
const submitting = ref(false);
const defaultSegmentMissing = ref(false);
const form = ref({ name: '', type: '', start: '', end: '' });
let lastDefaultDate = '';

const columns = [
  { key: 'name', label: '員工' },
  { key: 'type', label: '假別' },
  { key: 'start_time', label: '開始' },
  { key: 'end_time', label: '結束' },
  { key: 'time', label: '時數' },
  { key: 'verify', label: '簽核' },
];

const totalHours = computed(() => Math.round(leaves.value.reduce((sum, row) => sum + row.time, 0) * 10) / 10);

const loadStaff = async () => {
  const rows = await apiGet<StaffOption[]>(`${API_CONFIG.HR.STAFF}/all`);
  staffList.value = rows.filter((row) => !row.stop_work).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
};

const loadLeaves = async () => {
  loading.value = true;
  try {
    const { start, end } = monthRange(month.value);
    leaves.value = await getLeavesInRange(start, end, filterName.value || undefined);
  } catch (error) {
    leaves.value = [];
    errorStore.showError(error instanceof Error ? error.message : '載入請假記錄失敗');
  } finally {
    loading.value = false;
  }
};

const loadBalance = async () => {
  balance.value = null;
  if (!balanceName.value) return;
  try {
    balance.value = await getLeaveBalance(balanceName.value);
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '載入已用時數失敗');
  }
};

const openCreate = () => {
  const today = todayTaipei();
  form.value = { name: filterName.value, type: leaveTypes.value[0] ?? '', start: `${today}T08:00`, end: `${today}T17:00` };
  defaultSegmentMissing.value = false;
  lastDefaultDate = '';
  showCreate.value = true;
  if (form.value.name) void applyDefaults();
};

/** 選員工或換日期時，帶入最新段別的上下班時間。 */
const applyDefaults = async () => {
  if (!form.value.name) return;
  const date = (form.value.start || `${todayTaipei()}T08:00`).slice(0, 10);
  try {
    const defaults = await getLeaveDefaults(form.value.name, date);
    defaultSegmentMissing.value = defaults.segment === null;
    form.value.start = toDatetimeLocal(defaults.start_time);
    form.value.end = toDatetimeLocal(defaults.end_time);
    lastDefaultDate = date;
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '載入預設時段失敗');
  }
};

const applyDefaultsIfDateChanged = () => {
  const date = form.value.start.slice(0, 10);
  if (date && date !== lastDefaultDate) void applyDefaults();
};

const submitCreate = async () => {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await createLeave({
      name: form.value.name,
      type: form.value.type,
      start_time: fromDatetimeLocal(form.value.start),
      end_time: fromDatetimeLocal(form.value.end),
    });
    showCreate.value = false;
    await loadLeaves();
    if (balanceName.value === form.value.name) await loadBalance();
  } catch {
    // 錯誤已由 api 層顯示
  } finally {
    submitting.value = false;
  }
};

const removeLeave = async (row: StaffLeave) => {
  if (!confirm(`確定刪除 ${row.name} ${toTaipeiMinute(row.start_time)} 的${row.type}？`)) return;
  try {
    await deleteLeave(row.id);
    leaves.value = leaves.value.filter((item) => item.id !== row.id);
    if (balanceName.value === row.name) await loadBalance();
  } catch {
    // 錯誤已由 api 層顯示（含定稿期間 409）
  }
};

onMounted(async () => {
  try {
    const [, types] = await Promise.all([loadStaff(), getLeaveTypes()]);
    leaveTypes.value = types;
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '載入基本資料失敗');
  }
  await loadLeaves();
});
</script>

<style scoped>
.staff-leave-page {
  width: 100%;
  margin: 0 auto;
}

.leave-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .leave-layout {
    grid-template-columns: 1fr;
  }
}

.search-filters {
  background: white;
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 1.5rem;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.table-container {
  margin-top: 1rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-500);
}

.balance-card {
  background: white;
  padding: 1.25rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.balance-row {
  border-top: 1px solid var(--secondary-200);
  padding-top: 0.75rem;
}

.balance-label {
  color: var(--secondary-600);
  font-size: 0.875rem;
}

.balance-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--secondary-900);
}

.balance-note {
  color: var(--secondary-500);
  font-size: 0.8rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-hint {
  color: var(--secondary-600);
  font-size: 0.85rem;
  margin: 0;
}

.text-danger {
  color: var(--danger-600);
}
</style>

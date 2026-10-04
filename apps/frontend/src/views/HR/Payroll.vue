<template>
  <div class="payroll-page">
    <TableHeader :border="false">
      <template #actions>
        <button class="btn" :class="activeTab === 'calc' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'calc'">
          <span class="mr-2">🧮</span>
          計算薪資
        </button>
        <button class="btn" :class="activeTab === 'runs' ? 'btn-primary' : 'btn-outline'" @click="openRuns">
          <span class="mr-2">🗂️</span>
          薪資 run
        </button>
      </template>
    </TableHeader>

    <!-- 計算 / 預覽 -->
    <section v-if="activeTab === 'calc'">
      <div class="search-filters">
        <div class="filter-controls">
          <label class="filter-label">月份</label>
          <input type="month" class="form-control" v-model="calcMonth" @change="resetPreview" />
          <label class="filter-label">版本</label>
          <select class="form-control" v-model="calcVariant" @change="onVariantChange">
            <option v-for="(label, key) in VARIANT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <label class="filter-label">部門</label>
          <label v-for="department in DEFAULT_DEPARTMENTS[calcVariant]" :key="department" class="check-label">
            <input type="checkbox" :value="department" v-model="calcDepartments" />
            {{ department }}
          </label>
          <button class="btn btn-primary" :disabled="calculating || calcDepartments.length === 0" @click="runPreview">
            <span class="mr-2">🧮</span>
            {{ calculating ? '計算中…' : '計算' }}
          </button>
        </div>
        <p class="form-hint">
          只計算不保存。獎金、特休加、特休減、借支、其他代扣、稅金代扣可在表格直接輸入，合計與實領即時更新；按「建立 run」後連同手動欄位存成草稿並產生 Excel。
        </p>
      </div>

      <template v-if="preview">
        <div class="preview-meta">
          <span class="badge badge-secondary">來源：{{ preview.source === 'mariadb' ? '舊系統 MariaDB' : 'PostgreSQL' }}</span>
          <span class="badge badge-primary">{{ rocPeriodLabel(preview.period.start) }} {{ VARIANT_LABELS[preview.variant] }}</span>
          <span class="badge badge-warning" v-if="previewManualCount > 0">已輸入 {{ previewManualCount }} 個手動欄位</span>
        </div>
        <WarningList :warnings="preview.warnings" />

        <div v-for="department in preview.departments" :key="department.department" class="department-block">
          <SectionHeader :title="`${department.department}（${department.wages.length} 人）`">
            <template #actions>
              <button class="btn btn-outline btn-sm" @click="toggleDays(department.department)">
                {{ expandedDays.has(department.department) ? '收合每日明細' : '每日明細' }}
              </button>
            </template>
          </SectionHeader>
          <PayrollWageTable
            :rows="previewRows(department)"
            :variant="preview.variant"
            :editable="canWrite"
            :hours-by-name="hoursFromSummaries(department.summaries)"
            :dirty="previewManual"
            @update:manual="setPreviewManual"
          />
          <PayrollDayTable
            v-if="expandedDays.has(department.department)"
            class="mt-3"
            :days="department.days"
            :names="department.hourSheetNames"
          />
        </div>

        <div class="action-bar" v-if="canWrite">
          <button class="btn btn-primary" :disabled="creating" @click="createRuns">
            <span class="mr-2">💾</span>
            {{ creating ? '建立中…' : `建立 run（${preview.departments.length} 個部門）` }}
          </button>
          <span class="form-hint">每個部門各存一筆草稿 run，之後可在「薪資 run」頁籤修改手動欄位、下載與定稿。</span>
        </div>
      </template>
      <div v-else-if="!calculating" class="empty-state">選擇月份與版本後按「計算」。</div>
    </section>

    <!-- run 列表與明細 -->
    <section v-if="activeTab === 'runs'">
      <div class="search-filters">
        <div class="filter-controls">
          <label class="filter-label">月份</label>
          <input type="month" class="form-control" v-model="runMonth" @change="loadRuns" />
          <label class="filter-label">版本</label>
          <select class="form-control" v-model="runVariant" @change="loadRuns">
            <option value="">全部</option>
            <option v-for="(label, key) in VARIANT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <label class="filter-label">狀態</label>
          <select class="form-control" v-model="runStatus" @change="loadRuns">
            <option value="">全部</option>
            <option value="draft">草稿</option>
            <option value="final">定稿</option>
          </select>
          <button class="btn btn-outline" @click="loadRuns">
            <span class="mr-2">🔄</span>
            重新載入
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="table runs-table">
          <thead>
            <tr>
              <th>#</th>
              <th>期間</th>
              <th>版本</th>
              <th>部門</th>
              <th>狀態</th>
              <th>建立</th>
              <th>定稿</th>
              <th>警告</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="run in runs" :key="run.id" :class="{ selected: detail?.id === run.id }">
              <td>{{ run.id }}</td>
              <td>{{ rocPeriodLabel(run.periodStart) }}（{{ run.periodStart }} ～ {{ run.periodEnd }}）</td>
              <td>{{ VARIANT_LABELS[run.variant] }}</td>
              <td>{{ run.department }}</td>
              <td>
                <span class="badge" :class="run.status === 'final' ? 'badge-success' : 'badge-warning'">{{ STATUS_LABELS[run.status] }}</span>
              </td>
              <td>{{ toTaipeiMinute(run.createdAt) }}</td>
              <td>{{ run.finalizedAt ? toTaipeiMinute(run.finalizedAt) : '' }}</td>
              <td>{{ run.warningsJson?.length || '' }}</td>
              <td class="actions-col">
                <button class="btn btn-sm btn-outline" @click="openDetail(run.id)">檢視</button>
                <button class="btn btn-sm btn-outline" @click="download(run.id)">下載</button>
                <button v-if="canWrite && run.status === 'draft'" class="btn btn-sm btn-primary" @click="finalize(run)">定稿</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loadingRuns && runs.length === 0" class="empty-state">沒有符合條件的薪資 run</div>
      </div>

      <div v-if="detail" class="detail-block">
        <SectionHeader
          :title="`run #${detail.id}　${rocPeriodLabel(detail.periodStart)} ${VARIANT_LABELS[detail.variant]}　${detail.department}　${STATUS_LABELS[detail.status]}`"
        >
          <template #actions>
            <button class="btn btn-outline btn-sm" @click="detailDaysOpen = !detailDaysOpen">
              {{ detailDaysOpen ? '收合每日明細' : '每日明細' }}
            </button>
            <button class="btn btn-outline btn-sm" @click="download(detail.id)">下載 Excel</button>
            <template v-if="detailEditable">
              <button class="btn btn-outline btn-sm" :disabled="detailDirtyCount === 0" @click="detailDirty = {}">放棄修改</button>
              <button class="btn btn-primary btn-sm" :disabled="detailDirtyCount === 0 || saving" @click="saveDetailManual">
                {{ saving ? '儲存中…' : `儲存手動欄位（${detailDirtyCount}）` }}
              </button>
              <button class="btn btn-primary btn-sm" :disabled="detailDirtyCount > 0" @click="finalize(detail)">定稿</button>
            </template>
          </template>
        </SectionHeader>
        <WarningList :warnings="detail.warningsJson" />
        <PayrollWageTable
          :rows="detailRows"
          :variant="detail.variant"
          :editable="detailEditable"
          :hours-by-name="hoursFromStaff(detail.staff)"
          :dirty="detailDirty"
          @update:manual="setDetailManual"
        />
        <PayrollDayTable v-if="detailDaysOpen" class="mt-3" :days="detail.days" :names="detailHourNames" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { SectionHeader, TableHeader } from '@/components';
import PayrollWageTable, { type WageHoursSummary } from './components/PayrollWageTable.vue';
import PayrollDayTable from './components/PayrollDayTable.vue';
import WarningList from './components/PayrollWarningList.vue';
import { monthRange, toTaipeiMinute, todayTaipei } from '@/services/hr';
import {
  DEFAULT_DEPARTMENTS,
  PAYROLL_FEATURE,
  STATUS_LABELS,
  VARIANT_LABELS,
  applyManual,
  createPayrollRuns,
  downloadPayrollRunFile,
  finalizePayrollRun,
  getPayrollRun,
  getPayrollRuns,
  previewPayroll,
  rocPeriodLabel,
  updatePayrollManual,
  type ManualKey,
  type ManualWageMap,
  type PayrollPreview,
  type PayrollPreviewDepartment,
  type PayrollRun,
  type PayrollRunDetail,
  type PayrollRunStaff,
  type PayrollVariant,
  type StaffMonthSummary,
  type WageItems,
} from '@/services/payroll';
import { useAuthStore } from '@/stores/auth';
import { useErrorStore } from '@/stores/error';

const authStore = useAuthStore();
const errorStore = useErrorStore();
const canWrite = computed(() => authStore.hasFeature(PAYROLL_FEATURE, 'write'));

const activeTab = ref<'calc' | 'runs'>('calc');

// ---------------------------------------------------------------------------
// 計算 / 預覽
// ---------------------------------------------------------------------------
const calcMonth = ref(previousMonth());
const calcVariant = ref<PayrollVariant>('official');
const calcDepartments = ref<string[]>([...DEFAULT_DEPARTMENTS.official]);
const calculating = ref(false);
const creating = ref(false);
const preview = ref<PayrollPreview | null>(null);
const previewManual = ref<ManualWageMap>({});
const expandedDays = ref(new Set<string>());

function previousMonth(): string {
  const [year, month] = todayTaipei().slice(0, 7).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

const resetPreview = () => {
  preview.value = null;
  previewManual.value = {};
  expandedDays.value = new Set();
};

const onVariantChange = () => {
  calcDepartments.value = [...DEFAULT_DEPARTMENTS[calcVariant.value]];
  resetPreview();
};

const previewManualCount = computed(() =>
  Object.values(previewManual.value).reduce((sum, fields) => sum + Object.keys(fields).length, 0),
);

const periodInput = () => {
  const { start, end } = monthRange(calcMonth.value);
  const all = DEFAULT_DEPARTMENTS[calcVariant.value];
  const departments = calcDepartments.value.length === all.length ? undefined : all.filter((d) => calcDepartments.value.includes(d));
  return { start, end, variant: calcVariant.value, departments, manual: previewManual.value };
};

const runPreview = async () => {
  calculating.value = true;
  try {
    preview.value = await previewPayroll(periodInput());
  } catch {
    preview.value = null;
  } finally {
    calculating.value = false;
  }
};

const previewRows = (department: PayrollPreviewDepartment): WageItems[] =>
  department.wages.map((wage) => applyManual(wage, previewManual.value[wage.name] ?? {}, preview.value!.variant));

const setPreviewManual = (name: string, key: ManualKey, value: number) => {
  previewManual.value = { ...previewManual.value, [name]: { ...previewManual.value[name], [key]: value } };
};

const toggleDays = (department: string) => {
  const next = new Set(expandedDays.value);
  if (next.has(department)) next.delete(department);
  else next.add(department);
  expandedDays.value = next;
};

const hoursFromSummaries = (summaries: StaffMonthSummary[]): Record<string, WageHoursSummary> =>
  Object.fromEntries(summaries.map((s) => [s.name, pickHours(s)]));

const hoursFromStaff = (staff: PayrollRunStaff[]): Record<string, WageHoursSummary> =>
  Object.fromEntries(staff.map((s) => [s.name, pickHours(s)]));

const pickHours = (s: WageHoursSummary): WageHoursSummary => ({
  workHours: s.workHours,
  overtimeHours: s.overtimeHours,
  leaveHours: s.leaveHours,
  lateCount: s.lateCount,
});

const createRuns = async () => {
  if (!preview.value) return;
  if (!confirm(`確定為 ${rocPeriodLabel(preview.value.period.start)} ${VARIANT_LABELS[preview.value.variant]} 建立 ${preview.value.departments.length} 筆草稿 run？`)) return;
  creating.value = true;
  try {
    const result = await createPayrollRuns(periodInput());
    runMonth.value = calcMonth.value;
    runVariant.value = calcVariant.value;
    runStatus.value = '';
    activeTab.value = 'runs';
    await loadRuns();
    if (result.runs[0]) await openDetail(result.runs[0].id);
  } catch {
    // 錯誤已由 api 層顯示
  } finally {
    creating.value = false;
  }
};

// ---------------------------------------------------------------------------
// run 列表與明細
// ---------------------------------------------------------------------------
const runMonth = ref('');
const runVariant = ref<PayrollVariant | ''>('');
const runStatus = ref<'draft' | 'final' | ''>('');
const runs = ref<PayrollRun[]>([]);
const loadingRuns = ref(false);
const detail = ref<PayrollRunDetail | null>(null);
const detailDirty = ref<ManualWageMap>({});
const detailDaysOpen = ref(false);
const saving = ref(false);

const openRuns = async () => {
  activeTab.value = 'runs';
  if (runs.value.length === 0) await loadRuns();
};

const loadRuns = async () => {
  loadingRuns.value = true;
  try {
    runs.value = await getPayrollRuns({
      start: runMonth.value ? `${runMonth.value}-01` : undefined,
      variant: runVariant.value || undefined,
      status: runStatus.value || undefined,
    });
  } catch {
    runs.value = [];
  } finally {
    loadingRuns.value = false;
  }
};

const openDetail = async (id: number) => {
  try {
    detail.value = await getPayrollRun(id);
    detailDirty.value = {};
    detailDaysOpen.value = false;
  } catch {
    detail.value = null;
  }
};

const detailEditable = computed(() => canWrite.value && detail.value?.status === 'draft');
const detailDirtyCount = computed(() =>
  Object.values(detailDirty.value).reduce((sum, fields) => sum + Object.keys(fields).length, 0),
);
const detailRows = computed<WageItems[]>(() =>
  detail.value ? detail.value.staff.map((row) => applyManual(row, detailDirty.value[row.name] ?? {}, detail.value!.variant)) : [],
);
const detailHourNames = computed(() =>
  detail.value
    ? [...detail.value.staff].filter((s) => s.hourOrder !== null).sort((a, b) => a.hourOrder! - b.hourOrder!).map((s) => s.name)
    : [],
);

const setDetailManual = (name: string, key: ManualKey, value: number) => {
  detailDirty.value = { ...detailDirty.value, [name]: { ...detailDirty.value[name], [key]: value } };
};

const saveDetailManual = async () => {
  if (!detail.value) return;
  saving.value = true;
  try {
    detail.value = await updatePayrollManual(detail.value.id, detailDirty.value);
    detailDirty.value = {};
    await loadRuns();
  } catch {
    // 錯誤已由 api 層顯示
  } finally {
    saving.value = false;
  }
};

const finalize = async (run: PayrollRun) => {
  if (!confirm(`定稿後不可再修改。確定定稿 run #${run.id}（${rocPeriodLabel(run.periodStart)} ${VARIANT_LABELS[run.variant]} ${run.department}）？`)) return;
  try {
    await finalizePayrollRun(run.id);
    await loadRuns();
    if (detail.value?.id === run.id) await openDetail(run.id);
  } catch {
    // 錯誤已由 api 層顯示
  }
};

const download = async (id: number) => {
  try {
    await downloadPayrollRunFile(id);
  } catch (error) {
    if (!(error instanceof Error)) errorStore.showError('下載失敗');
  }
};

onMounted(() => {
  if (!authStore.hasFeature(PAYROLL_FEATURE)) {
    errorStore.showError('沒有薪資計算權限，請聯絡管理員在功能權限頁指派「薪資計算」');
  }
});
</script>

<style scoped>
.payroll-page {
  width: 100%;
  margin: 0 auto;
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

.filter-controls .form-control {
  width: auto;
}

.filter-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--secondary-700);
}

.form-hint {
  color: var(--secondary-600);
  font-size: 0.85rem;
  margin: 0.75rem 0 0;
}

.preview-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.department-block {
  margin-bottom: 2rem;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
}

.action-bar .form-hint {
  margin: 0;
}

.table-container {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.runs-table {
  margin: 0;
  font-size: 0.875rem;
  white-space: nowrap;
}

.runs-table tr.selected td {
  background: var(--primary-50, #eff6ff);
}

.actions-col {
  white-space: nowrap;
}

.actions-col .btn + .btn {
  margin-left: 0.25rem;
}

.detail-block {
  margin-top: 1rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-500);
}

.mt-3 {
  margin-top: 1rem;
}
</style>

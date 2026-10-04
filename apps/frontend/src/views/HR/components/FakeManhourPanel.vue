<template>
  <div class="fake-manhour-panel">
    <div class="panel-toolbar">
      <label class="filter-label">外帳員工</label>
      <select class="form-control" v-model="selectedName" @change="load">
        <option value="">請選擇</option>
        <option v-for="staff in fakeStaff" :key="staff.id" :value="staff.name">{{ staff.name }}</option>
      </select>
      <label class="filter-label">月份</label>
      <input type="month" class="form-control" v-model="month" @change="load" />
      <button class="btn btn-outline" :disabled="!selectedName" @click="load">
        <span class="mr-2">🔄</span>
        重新載入
      </button>
      <button class="btn btn-outline" :disabled="!selectedName || busy" @click="copyFromOfficial">
        <span class="mr-2">📋</span>
        從正式工時複製
      </button>
      <button class="btn btn-primary" :disabled="!selectedName" @click="showNewRow = !showNewRow">
        <span class="mr-2">➕</span>
        {{ showNewRow ? '取消新增' : '新增一列' }}
      </button>
    </div>
    <p class="panel-hint">
      只列出需要外帳（have_fake）的員工。這裡的起訖時間供外帳薪資報表使用；已定稿薪資期間內不可修改。
    </p>

    <div v-if="selectedName" class="table-container">
      <EditableDataTable
        :columns="columns"
        :data="rows"
        :show-actions="true"
        :editable="true"
        edit-mode="full"
        :auto-focus-on-mount="false"
        :show-new-row="showNewRow"
        :new-row-template="newRowTemplate"
        @save="saveRow"
        @new-row-save="createRow"
        @new-row-cancel="showNewRow = false"
        @row-delete="removeRow"
      >
        <template #actions="{ row }">
          <button class="btn btn-sm btn-danger" @click="removeRow(row)">刪除</button>
        </template>
      </EditableDataTable>
      <div v-if="!busy && rows.length === 0" class="empty-state">本月尚無外帳工時，可從正式工時複製後再調整</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { EditableDataTable, type EditableColumn } from '@/components';
import { apiGet } from '@/services/api';
import { API_CONFIG } from '@/config/api';
import {
  copyManhourToFake,
  createManhour2,
  deleteManhour2,
  getManhour2,
  monthRange,
  toTaipeiMinute,
  todayTaipei,
  updateManhour2,
  type StaffManhour2,
} from '@/services/hr';
import { useErrorStore } from '@/stores/error';

interface StaffOption {
  id: string;
  name: string;
  have_fake: boolean;
  stop_work?: string | null;
}

/** 表格列：時間以台北 `YYYY-MM-DD HH:mm` 文字編輯。 */
interface EditableRow {
  id: number;
  start_time: string;
  end_time: string;
  work_time: number;
}

const errorStore = useErrorStore();
const fakeStaff = ref<StaffOption[]>([]);
const selectedName = ref('');
const month = ref(todayTaipei().slice(0, 7));
const rows = ref<EditableRow[]>([]);
const busy = ref(false);
const showNewRow = ref(false);

const columns: EditableColumn[] = [
  { key: 'start_time', label: '開始（YYYY-MM-DD HH:mm）', editable: true, required: true, type: 'text' },
  { key: 'end_time', label: '結束（YYYY-MM-DD HH:mm）', editable: true, type: 'text' },
  { key: 'work_time', label: '時數', editable: false },
];

const newRowTemplate = () => ({ start_time: `${month.value}-01 08:00`, end_time: `${month.value}-01 17:00`, work_time: 0 });

const toRow = (item: StaffManhour2): EditableRow => ({
  id: item.id,
  start_time: toTaipeiMinute(item.start_time),
  end_time: toTaipeiMinute(item.end_time),
  work_time: item.work_time,
});

const loadStaff = async () => {
  const all = await apiGet<StaffOption[]>(`${API_CONFIG.HR.STAFF}/all`);
  fakeStaff.value = all.filter((row) => row.have_fake && !row.stop_work).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
};

const load = async () => {
  if (!selectedName.value) {
    rows.value = [];
    return;
  }
  busy.value = true;
  try {
    const { start, end } = monthRange(month.value);
    rows.value = (await getManhour2(selectedName.value, start, end)).map(toRow);
  } catch {
    rows.value = [];
  } finally {
    busy.value = false;
  }
};

const copyFromOfficial = async () => {
  busy.value = true;
  try {
    const { start, end } = monthRange(month.value);
    const result = await copyManhourToFake(selectedName.value, start, end);
    errorStore.showError(`已複製 ${result.copied} 筆，略過已存在 ${result.skipped} 筆`);
    await load();
  } catch {
    // 錯誤已由 api 層顯示
  } finally {
    busy.value = false;
  }
};

const saveRow = async (row: EditableRow) => {
  try {
    const updated = await updateManhour2(row.id, {
      start_time: row.start_time.trim(),
      end_time: row.end_time.trim() ? row.end_time.trim() : null,
    });
    const index = rows.value.findIndex((item) => item.id === row.id);
    if (index >= 0) rows.value[index] = toRow(updated);
  } catch {
    await load();
  }
};

const createRow = async (row: EditableRow) => {
  try {
    const created = await createManhour2({
      name: selectedName.value,
      start_time: String(row.start_time).trim(),
      end_time: String(row.end_time ?? '').trim() || undefined,
    });
    rows.value = [...rows.value, toRow(created)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    showNewRow.value = false;
  } catch {
    // 錯誤已由 api 層顯示
  }
};

const removeRow = async (row: EditableRow) => {
  if (!confirm(`確定刪除 ${row.start_time} 的外帳工時？`)) return;
  try {
    await deleteManhour2(row.id);
    rows.value = rows.value.filter((item) => item.id !== row.id);
  } catch {
    // 錯誤已由 api 層顯示
  }
};

onMounted(async () => {
  try {
    await loadStaff();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '載入員工失敗');
  }
});
</script>

<style scoped>
.panel-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.panel-hint {
  color: var(--secondary-600);
  font-size: 0.85rem;
  margin: 0.75rem 0 1rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-500);
}
</style>

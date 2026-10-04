<template>
  <div class="wage-table-wrap">
    <table class="table wage-table">
      <thead>
        <tr>
          <th class="sticky-col">姓名</th>
          <th v-if="showHours" class="col-hours">工時</th>
          <th v-if="showHours" class="col-hours">加班</th>
          <th v-if="showHours" class="col-hours">請假</th>
          <th v-if="showHours" class="col-hours">遲到</th>
          <th v-for="column in columns" :key="column.key" :class="[`group-${column.group}`, { manual: column.manual }]">
            {{ column.label }}
            <span v-if="column.manual && editable" class="manual-mark" title="可編輯">✎</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.name">
          <td class="sticky-col name-cell">{{ row.name }}</td>
          <template v-if="showHours">
            <td class="num col-hours">{{ hours(row.name)?.workHours ?? '' }}</td>
            <td class="num col-hours">{{ hours(row.name)?.overtimeHours ?? '' }}</td>
            <td class="num col-hours">{{ hours(row.name)?.leaveHours ?? '' }}</td>
            <td class="num col-hours">{{ hours(row.name)?.lateCount ?? '' }}</td>
          </template>
          <td
            v-for="column in columns"
            :key="column.key"
            class="num"
            :class="[`group-${column.group}`, { manual: column.manual, dirty: isDirty(row.name, column.key) }]"
          >
            <input
              v-if="column.manual && editable"
              type="number"
              step="1"
              class="manual-input"
              :value="row[column.key]"
              @change="onManualChange(row.name, column.key, $event)"
            />
            <template v-else>{{ formatMoney(row[column.key]) }}</template>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="rows.length > 1">
        <tr>
          <td class="sticky-col name-cell">合計</td>
          <td v-if="showHours" class="col-hours" colspan="4"></td>
          <td v-for="column in columns" :key="column.key" class="num" :class="`group-${column.group}`">
            {{ formatMoney(total(column.key)) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  formatMoney,
  wageColumns,
  type ManualKey,
  type PayrollVariant,
  type WageItems,
  type WageKey,
} from '@/services/payroll';

export interface WageHoursSummary {
  workHours: number;
  overtimeHours: number;
  leaveHours: number;
  lateCount: number;
}

interface Props {
  rows: WageItems[];
  variant: PayrollVariant;
  /** 手動欄位可編輯（draft run 或預覽） */
  editable?: boolean;
  /** 以姓名為鍵的工時摘要；給了就多顯示四欄 */
  hoursByName?: Record<string, WageHoursSummary>;
  /** 已修改但尚未儲存的手動欄位，以姓名為鍵 */
  dirty?: Record<string, Partial<Record<ManualKey, number>>>;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  hoursByName: undefined,
  dirty: () => ({}),
});

const emit = defineEmits<{
  'update:manual': [name: string, key: ManualKey, value: number];
}>();

const columns = computed(() => wageColumns(props.variant));
const showHours = computed(() => props.hoursByName !== undefined);
const hours = (name: string) => props.hoursByName?.[name];

const isDirty = (name: string, key: WageKey) => props.dirty[name]?.[key as ManualKey] !== undefined;

const total = (key: WageKey) => props.rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);

const onManualChange = (name: string, key: WageKey, event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    input.value = '0';
    emit('update:manual', name, key as ManualKey, 0);
    return;
  }
  emit('update:manual', name, key as ManualKey, Math.round(value));
};
</script>

<style scoped>
.wage-table-wrap {
  overflow-x: auto;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
}

.wage-table {
  margin: 0;
  min-width: 100%;
  font-size: 0.85rem;
  white-space: nowrap;
}

.wage-table th,
.wage-table td {
  padding: 0.4rem 0.6rem;
}

.wage-table th {
  position: sticky;
  top: 0;
  background: var(--secondary-50);
  z-index: 1;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: white;
  z-index: 2;
  box-shadow: 1px 0 0 var(--secondary-200);
}

thead .sticky-col {
  background: var(--secondary-50);
  z-index: 3;
}

.name-cell {
  font-weight: 600;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-hours {
  color: var(--secondary-500);
  border-right: 1px solid var(--secondary-200);
}

th.group-add {
  color: var(--primary-700);
}

th.group-deduct {
  color: var(--danger-600);
}

.group-total {
  font-weight: 600;
  background: var(--secondary-50);
}

td.manual {
  background: var(--warning-50, #fffbeb);
}

td.manual.dirty {
  background: var(--warning-100, #fef3c7);
}

.manual-mark {
  margin-left: 0.25rem;
  color: var(--warning-600, #d97706);
}

.manual-input {
  width: 6rem;
  text-align: right;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius, 4px);
  font: inherit;
}

tfoot td {
  font-weight: 600;
  border-top: 2px solid var(--secondary-300);
}
</style>

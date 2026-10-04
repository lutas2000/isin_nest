<template>
  <div class="day-table">
    <div class="day-toolbar">
      <label class="filter-label">員工</label>
      <select class="form-control" v-model="selectedName">
        <option v-for="name in names" :key="name" :value="name">{{ name }}</option>
      </select>
      <span class="day-summary">
        工時 {{ totals.work }}、加班 {{ totals.overtime }}、請假 {{ totals.leave }} 小時、遲到 {{ totals.late }} 次
      </span>
    </div>
    <table class="table day-rows">
      <thead>
        <tr>
          <th>日期</th>
          <th>類型</th>
          <th>打卡時段</th>
          <th class="num">工時</th>
          <th class="num">加班</th>
          <th>假別</th>
          <th class="num">請假時數</th>
          <th>遲到</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="day in rows" :key="day.date" :class="`vacation-${day.vacationType}`">
          <td>{{ day.date }}</td>
          <td>{{ VACATION_LABELS[day.vacationType] }}</td>
          <td class="segments">{{ day.segmentsText }}</td>
          <td class="num">{{ day.work || '' }}</td>
          <td class="num">{{ day.overtime || '' }}</td>
          <td>{{ day.leaveType }}</td>
          <td class="num">{{ day.leaveHours || '' }}</td>
          <td>{{ day.late ? '是' : '' }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="rows.length === 0" class="empty-state">此員工沒有每日明細（不需打卡）</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VACATION_LABELS, type DayResult } from '@/services/payroll';

interface Props {
  days: DayResult[];
  /** 打卡記錄表的員工順序 */
  names: string[];
}

const props = defineProps<Props>();

const selectedName = ref(props.names[0] ?? '');
watch(
  () => props.names,
  (names) => {
    if (!names.includes(selectedName.value)) selectedName.value = names[0] ?? '';
  },
);

const rows = computed(() => props.days.filter((day) => day.name === selectedName.value));

const round1 = (value: number) => Math.round(value * 10) / 10;
const totals = computed(() => ({
  work: round1(rows.value.reduce((sum, day) => sum + day.work, 0)),
  overtime: round1(rows.value.reduce((sum, day) => sum + day.overtime, 0)),
  leave: round1(rows.value.reduce((sum, day) => sum + day.leaveHours, 0)),
  late: rows.value.filter((day) => day.late).length,
}));
</script>

<style scoped>
.day-table {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 1rem;
}

.day-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.day-toolbar .form-control {
  width: auto;
}

.filter-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.day-summary {
  color: var(--secondary-600);
  font-size: 0.875rem;
}

.day-rows {
  margin: 0;
  font-size: 0.85rem;
}

.day-rows th,
.day-rows td {
  padding: 0.35rem 0.6rem;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.segments {
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.vacation-paid td:first-child {
  color: var(--danger-600);
}

.vacation-unpaid td:first-child {
  color: var(--success-600, #16a34a);
}

.empty-state {
  padding: 1.5rem;
  text-align: center;
  color: var(--secondary-500);
}
</style>

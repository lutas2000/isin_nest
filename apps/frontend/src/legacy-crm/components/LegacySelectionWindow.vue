<script setup lang="ts">
import { nextTick, onMounted, ref, watch, type PropType } from 'vue';

// The legacy 列印選擇 window behind a report dialog's 選項 button (isin_vb6
// src/components/LegacySelectionWindow.vue): every row starts marked ＊;
// ↑/↓ move the current row, Space or a double-click toggles it, and only
// marked rows print after 確定.
type Row = Record<string, any>;

const props = defineProps({
  title: { type: String, required: true },
  columns: {
    type: Array as PropType<{ key: string; label: string; align?: string }[]>,
    required: true,
  },
  rowKey: { type: String, required: true },
  rows: { type: Array as PropType<Row[]>, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // Keys chosen earlier for the same criteria; null selects every row.
  initial: {
    type: Object as PropType<Iterable<unknown> | null>,
    default: null,
  },
  // 圖組建檔's part picker toggles a row with a single click.
  clickToggles: { type: Boolean, default: false },
  // 訂單登錄 F8 報價記錄 has 選擇 right after 項次.
  markFirst: { type: Boolean, default: false },
  hint: {
    type: String,
    default:
      '若要變更選擇，用↑、↓鍵移方框至該筆再按空白鍵，或滑鼠雙擊該筆，可切換選取狀態(具＊者為欲選取項)。',
  },
});
const emit = defineEmits<{
  confirm: [keys: Set<unknown>];
  cancel: [];
}>();

const selected = ref(
  new Set<unknown>(props.initial ?? props.rows.map((row) => row[props.rowKey])),
);
const current = ref(0);
const grid = ref<HTMLElement | null>(null);

// Rows arrive after the window opens; without an earlier choice all are marked.
watch(
  () => props.rows,
  (rows) => {
    if (!props.initial)
      selected.value = new Set(rows.map((row) => row[props.rowKey]));
    current.value = 0;
  },
);

function toggle(index: number) {
  const key = props.rows[index]?.[props.rowKey];
  if (key == null) return;
  const next = new Set(selected.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selected.value = next;
}

function scrollToCurrent() {
  nextTick(() =>
    grid.value
      ?.querySelector(`[data-row="${current.value}"]`)
      ?.scrollIntoView({ block: 'nearest' }),
  );
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown')
    current.value = Math.min(current.value + 1, props.rows.length - 1);
  else if (event.key === 'ArrowUp')
    current.value = Math.max(current.value - 1, 0);
  else if (event.key === ' ') toggle(current.value);
  else if (event.key === 'Escape') emit('cancel');
  else return;
  event.preventDefault();
  scrollToCurrent();
}

function clickRow(index: number) {
  current.value = index;
  if (props.clickToggles) toggle(index);
}

const selectAll = () => {
  selected.value = new Set(props.rows.map((row) => row[props.rowKey]));
};
const selectNone = () => {
  selected.value = new Set();
};

onMounted(() => grid.value?.focus());
</script>

<template>
  <div class="legacy-modal-backdrop">
    <section
      class="legacy-selection"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="legacy-dialog-title">{{ title }}</div>
      <div class="legacy-selection-buttons">
        <template v-if="!loading">
          <button type="button" @click="selectNone">不選</button>
          <button type="button" @click="selectAll">全選</button>
          <button type="button" @click="emit('cancel')">取消</button>
          <button
            type="button"
            :disabled="Boolean(error)"
            @click="emit('confirm', new Set(selected))"
          >
            確定
          </button>
        </template>
      </div>
      <div
        ref="grid"
        class="legacy-selection-grid"
        tabindex="0"
        @keydown="handleKey"
      >
        <table>
          <thead>
            <tr>
              <th class="num">項次</th>
              <th v-if="markFirst">選擇</th>
              <th
                v-for="column in columns"
                :key="column.key"
                :class="{ num: column.align === 'right' }"
              >
                {{ column.label }}
              </th>
              <th v-if="!markFirst">選擇</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="row[rowKey]"
              :data-row="index"
              :class="{ current: index === current }"
              @click="clickRow(index)"
              @dblclick="!clickToggles && toggle(index)"
            >
              <td class="num">{{ index + 1 }}</td>
              <td v-if="markFirst" class="mark">
                {{ selected.has(row[rowKey]) ? '＊' : '' }}
              </td>
              <td
                v-for="column in columns"
                :key="column.key"
                :class="{ num: column.align === 'right' }"
              >
                {{ row[column.key] }}
              </td>
              <td v-if="!markFirst" class="mark">
                {{ selected.has(row[rowKey]) ? '＊' : '' }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="loading" class="legacy-selection-message">資料載入中…</p>
        <p v-else-if="error" class="legacy-selection-message error">
          {{ error }}
        </p>
      </div>
      <p class="legacy-selection-hint">{{ hint }}</p>
    </section>
  </div>
</template>

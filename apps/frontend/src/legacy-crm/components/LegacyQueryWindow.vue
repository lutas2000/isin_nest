<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type PropType } from 'vue';
import { legacyGet } from '../services/legacyApi';
import { shapeSize, type DrawingShape } from '../utils/legacyDocumentPaper';

// The legacy 「…查詢」 window opened by 查詢 R and by F1 輔助輸入: a numbered
// list of matching rows. Double-click a row, or move with ↑ ↓ PgUp PgDn and
// press Enter, to choose it; Esc gives up. 工件資料查詢 adds the drawing of
// the current row on the right; 訂單資料查詢 adds the lines of the row last
// shown with Space below the list.
const props = defineProps({
  title: { type: String, required: true },
  columns: { type: Array as PropType<any[]>, required: true },
  rows: { type: Array as PropType<any[]>, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  truncated: { type: Boolean, default: false },
  hint: {
    type: String,
    default:
      '用滑鼠雙擊(Double Click)欲選項次，或以方向鍵(↑、↓、PgUp、PgDn)移動虛線方框至欲選項目，再按Enter鍵來選擇，按Esc鍵放棄。',
  },
  // Show the outline of the current row's drawing_no (工件資料查詢).
  preview: { type: Boolean, default: false },
  // Columns of each row's `lines`, shown under the list (訂單資料查詢).
  detailColumns: { type: Array as PropType<any[] | null>, default: null },
});
const emit = defineEmits(['select', 'cancel']);

const current = ref(0);
const detailIndex = ref(0);
const grid = ref<HTMLElement | null>(null);
const PAGE = 20;

watch(
  () => props.rows,
  () => {
    current.value = 0;
    detailIndex.value = 0;
  },
);

function move(to: number) {
  if (!props.rows.length) return;
  current.value = Math.min(Math.max(to, 0), props.rows.length - 1);
  nextTick(() =>
    grid.value
      ?.querySelector(`[data-row="${current.value}"]`)
      ?.scrollIntoView({ block: 'nearest' }),
  );
}

function handleKey(event: KeyboardEvent) {
  const moves: Record<string, number> = {
    ArrowDown: current.value + 1,
    ArrowUp: current.value - 1,
    PageDown: current.value + PAGE,
    PageUp: current.value - PAGE,
  };
  if (event.key in moves) move(moves[event.key]);
  else if (event.key === 'Enter' && props.rows[current.value])
    emit('select', props.rows[current.value]);
  else if (event.key === 'Escape') emit('cancel');
  else if (event.key === ' ' && props.detailColumns)
    detailIndex.value = current.value;
  else return;
  event.preventDefault();
  event.stopPropagation();
}

const detailLines = computed(() => props.rows[detailIndex.value]?.lines ?? []);

// The current row's drawing, read from the legacy DXF folder.
const shapes = new Map<string, Promise<DrawingShape | null>>();
const shape = ref<(DrawingShape & { number: string }) | null>(null);
let shapeToken = 0;
watch(
  [current, () => props.rows],
  async () => {
    if (!props.preview) return;
    const row = props.rows[current.value];
    const number = String(row?.drawing_no ?? '').trim();
    const token = ++shapeToken;
    if (!number) {
      shape.value = null;
      return;
    }
    const key = `${row.customer_code ?? ''}\u0000${number}`;
    if (!shapes.has(key)) {
      const params = new URLSearchParams({
        numbers: number,
        customer: row.customer_code ?? '',
      });
      shapes.set(
        key,
        legacyGet<{ shapes?: Record<string, DrawingShape> }>(
          `/drawings/shapes?${params}`,
        )
          .then((payload) => payload.shapes?.[number] ?? null)
          .catch(() => null),
      );
    }
    const found = await shapes.get(key);
    if (token === shapeToken) shape.value = found ? { ...found, number } : null;
  },
  { immediate: true },
);

// Fits the outline into the preview box, keeping its proportions.
const shapeView = computed(() => {
  const value = shape.value;
  if (!value) return null;
  const pad = Math.max(value.width, value.height) * 0.04 || 1;
  return {
    viewBox: `${-pad} ${-pad} ${value.width + pad * 2} ${value.height + pad * 2}`,
  };
});

onMounted(() => grid.value?.focus());
</script>

<template>
  <div class="legacy-modal-backdrop">
    <section
      class="legacy-selection legacy-query"
      :class="{ 'with-preview': preview, 'with-detail': detailColumns }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="legacy-dialog-title">
        <span>{{ title }}</span>
        <button
          type="button"
          class="legacy-window-close"
          aria-label="關閉"
          @click="emit('cancel')"
        >
          ×
        </button>
      </div>
      <div class="legacy-query-body">
        <div class="legacy-query-list">
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
                  <th v-for="column in columns" :key="column.key">
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in rows"
                  :key="index"
                  :data-row="index"
                  :class="{ current: index === current }"
                  @click="current = index"
                  @dblclick="emit('select', row)"
                >
                  <td class="num">{{ index + 1 }}</td>
                  <td
                    v-for="column in columns"
                    :key="column.key"
                    :class="{ num: column.align === 'right' }"
                  >
                    {{
                      column.format
                        ? column.format(row[column.key], row)
                        : row[column.key]
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="loading" class="legacy-selection-message">資料載入中…</p>
            <p v-else-if="error" class="legacy-selection-message error">
              {{ error }}
            </p>
            <p v-else-if="!rows.length" class="legacy-selection-message">
              沒有符合的資料。
            </p>
            <p v-else-if="truncated" class="legacy-selection-message">
              只列出最近的 {{ rows.length }} 筆，請輸入編號或客戶縮小範圍。
            </p>
          </div>
          <div
            v-if="detailColumns"
            class="legacy-selection-grid legacy-query-detail"
          >
            <table>
              <thead>
                <tr>
                  <th class="num">明細</th>
                  <th v-for="column in detailColumns" :key="column.key">
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in detailLines" :key="index">
                  <td class="num">{{ index + 1 }}</td>
                  <td
                    v-for="column in detailColumns"
                    :key="column.key"
                    :class="{ num: column.align === 'right' }"
                  >
                    {{
                      column.format
                        ? column.format(line[column.key], line)
                        : line[column.key]
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <figure
          v-if="preview"
          class="legacy-query-preview"
          aria-label="圖面預覽"
        >
          <template v-if="shape && shapeView">
            <figcaption>
              {{ shape.number }}<br />{{ shapeSize(shape) }}
            </figcaption>
            <svg
              :viewBox="shapeView.viewBox"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                :d="shape.path"
                fill="none"
                stroke="#000"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </template>
        </figure>
      </div>
      <p class="legacy-selection-hint">{{ hint }}</p>
    </section>
  </div>
</template>

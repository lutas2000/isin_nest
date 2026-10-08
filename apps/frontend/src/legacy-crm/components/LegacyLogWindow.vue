<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { legacyGet, queryString } from '../services/legacyApi';
import { useLegacyModalKeys } from '../utils/legacyModalKeys';

// 寫入紀錄與列印紀錄查詢（LEGACY-CRM-REBUILD-PLAN.md 2.4、2.5）：只有 admin，選單列「紀錄查詢」開啟，
// 兩個頁籤。後端 GET /legacy-crm/logs/*（AdminGuard）。寫入紀錄點一列可看修改前後的整筆資料。
const emit = defineEmits<{ close: [] }>();

type Tab = 'write' | 'print';
interface LogRow {
  id: string;
  occurred_at: string;
  user_id: number | null;
  user_name: string | null;
  staff_id: string | null;
  entity_type?: string;
  entity_key: string | null;
  action?: string;
  kind?: string;
  target?: string;
  criteria?: unknown;
  row_count?: number | null;
  page_count?: number | null;
}
interface LogPage {
  items: LogRow[];
  total: number;
  page: number;
  page_size: number;
}
interface WriteDetail extends LogRow {
  before: unknown;
  after: unknown;
  side_effects: unknown;
  request_id: string | null;
  client: unknown;
}

const ACTIONS: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '刪除',
  rename: '改編號',
  import: '匯入',
};
const KINDS: Record<string, string> = {
  document_preview: '單據預覽',
  document_print: '單據印出',
  report_query: '報表查詢',
  report_print: '報表印出',
  statement_print: '請款單',
};
const PAGE_SIZE = 50;

const tab = ref<Tab>('write');
const filters = reactive({
  from: '',
  to: '',
  user: '',
  entity_key: '',
  entity_type: '',
  action: '',
  kind: '',
  target: '',
});
const facets = ref<{ entity_types: string[]; print_targets: string[] }>({
  entity_types: [],
  print_targets: [],
});
const result = ref<LogPage | null>(null);
const loading = ref(false);
const message = ref('');
const detail = ref<WriteDetail | null>(null);
const pageCount = computed(() =>
  result.value
    ? Math.max(1, Math.ceil(result.value.total / result.value.page_size))
    : 1,
);

const timeFormat = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const formatTime = (value: string) => timeFormat.format(new Date(value));
const json = (value: unknown) =>
  value == null ? '' : JSON.stringify(value, null, 2);
const criteriaText = (value: unknown) =>
  value && typeof value === 'object'
    ? Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';

async function search(page = 1) {
  loading.value = true;
  message.value = '';
  detail.value = null;
  const params = new URLSearchParams();
  const keys =
    tab.value === 'write'
      ? (['from', 'to', 'user', 'entity_key', 'entity_type', 'action'] as const)
      : (['from', 'to', 'user', 'entity_key', 'kind', 'target'] as const);
  for (const key of keys)
    if (filters[key].trim()) params.set(key, filters[key].trim());
  params.set('page', String(page));
  params.set('page_size', String(PAGE_SIZE));
  try {
    result.value = await legacyGet<LogPage>(
      `/logs/${tab.value}${queryString(params)}`,
    );
    if (!result.value.total) message.value = '沒有符合條件的紀錄。';
  } catch (reason) {
    result.value = null;
    message.value = reason instanceof Error ? reason.message : '查詢失敗';
  } finally {
    loading.value = false;
  }
}

function switchTab(next: Tab) {
  if (tab.value === next) return;
  tab.value = next;
  result.value = null;
  void search(1);
}

async function showDetail(row: LogRow) {
  if (tab.value !== 'write') return;
  try {
    detail.value = (
      await legacyGet<{ item: WriteDetail }>(`/logs/write/${row.id}`)
    ).item;
  } catch (reason) {
    message.value = reason instanceof Error ? reason.message : '讀取失敗';
  }
}

function handleKey(event: KeyboardEvent) {
  event.stopPropagation();
  if (/^F\d{1,2}$/.test(event.key)) event.preventDefault();
  if (event.key === 'Escape') {
    event.preventDefault();
    if (detail.value) detail.value = null;
    else emit('close');
  }
}

const layer = ref<HTMLElement | null>(null);
useLegacyModalKeys(layer, handleKey);

onMounted(async () => {
  try {
    facets.value = await legacyGet('/logs/facets');
  } catch {
    // 下拉選項拿不到時仍可用其他條件查詢。
  }
  await search(1);
});
</script>

<template>
  <div
    ref="layer"
    class="legacy-modal-backdrop legacy-feedback-layer"
    @keydown="handleKey"
    @click.self="emit('close')"
  >
    <section
      class="legacy-log-window"
      role="dialog"
      aria-modal="true"
      aria-label="紀錄查詢"
    >
      <div class="legacy-dialog-title">
        <span>紀錄查詢</span>
        <button
          type="button"
          class="legacy-window-close"
          aria-label="關閉"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="legacy-log-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'write'"
          :class="{ active: tab === 'write' }"
          @click="switchTab('write')"
        >
          寫入紀錄
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'print'"
          :class="{ active: tab === 'print' }"
          @click="switchTab('print')"
        >
          列印紀錄
        </button>
      </div>
      <form class="legacy-log-filters" @submit.prevent="search(1)">
        <label>日期 <input v-model="filters.from" type="date" /></label>
        <label>～ <input v-model="filters.to" type="date" /></label>
        <label>使用者 <input v-model="filters.user" size="10" /></label>
        <label>單號 <input v-model="filters.entity_key" size="12" /></label>
        <template v-if="tab === 'write'">
          <label>
            資料
            <select v-model="filters.entity_type">
              <option value="">全部</option>
              <option
                v-for="value in facets.entity_types"
                :key="value"
                :value="value"
              >
                {{ value }}
              </option>
            </select>
          </label>
          <label>
            動作
            <select v-model="filters.action">
              <option value="">全部</option>
              <option
                v-for="(label, value) in ACTIONS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </label>
        </template>
        <template v-else>
          <label>
            項目
            <select v-model="filters.target">
              <option value="">全部</option>
              <option
                v-for="value in facets.print_targets"
                :key="value"
                :value="value"
              >
                {{ value }}
              </option>
            </select>
          </label>
          <label>
            種類
            <select v-model="filters.kind">
              <option value="">全部</option>
              <option
                v-for="(label, value) in KINDS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </label>
        </template>
        <button type="submit" :disabled="loading">查詢</button>
      </form>
      <div class="legacy-selection-grid legacy-log-grid">
        <table>
          <thead v-if="tab === 'write'">
            <tr>
              <th>時間</th>
              <th>使用者</th>
              <th>動作</th>
              <th>資料</th>
              <th>單號／編號</th>
            </tr>
          </thead>
          <thead v-else>
            <tr>
              <th>時間</th>
              <th>使用者</th>
              <th>種類</th>
              <th>項目</th>
              <th>單號</th>
              <th>條件</th>
              <th class="num">筆數</th>
              <th class="num">頁數</th>
            </tr>
          </thead>
          <tbody v-if="result && tab === 'write'">
            <tr
              v-for="row in result.items"
              :key="row.id"
              :class="{ current: detail?.id === row.id }"
              @click="showDetail(row)"
            >
              <td>{{ formatTime(row.occurred_at) }}</td>
              <td>
                {{
                  row.user_name ?? (row.user_id ? `#${row.user_id}` : '系統')
                }}
              </td>
              <td>{{ ACTIONS[row.action ?? ''] ?? row.action }}</td>
              <td>{{ row.entity_type }}</td>
              <td>{{ row.entity_key }}</td>
            </tr>
          </tbody>
          <tbody v-else-if="result">
            <tr v-for="row in result.items" :key="row.id">
              <td>{{ formatTime(row.occurred_at) }}</td>
              <td>
                {{
                  row.user_name ?? (row.user_id ? `#${row.user_id}` : '系統')
                }}
              </td>
              <td>{{ KINDS[row.kind ?? ''] ?? row.kind }}</td>
              <td>{{ row.target }}</td>
              <td>{{ row.entity_key }}</td>
              <td>{{ criteriaText(row.criteria) }}</td>
              <td class="num">{{ row.row_count ?? '' }}</td>
              <td class="num">{{ row.page_count ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="detail" class="legacy-log-detail">
        <div>
          <strong>修改前</strong>
          <pre>{{ json(detail.before) }}</pre>
        </div>
        <div>
          <strong>修改後</strong>
          <pre>{{ json(detail.after) }}</pre>
        </div>
        <div v-if="detail.side_effects">
          <strong>連帶回寫</strong>
          <pre>{{ json(detail.side_effects) }}</pre>
        </div>
      </div>
      <div class="legacy-log-footer">
        <span
          class="legacy-feedback-message"
          :class="{ error: !!message && !loading && !result }"
        >
          {{ loading ? '查詢中…' : message }}
        </span>
        <span v-if="result"
          >第 {{ result.page }} / {{ pageCount }} 頁，共
          {{ result.total }} 筆</span
        >
        <button
          type="button"
          :disabled="loading || !result || result.page <= 1"
          @click="search((result?.page ?? 1) - 1)"
        >
          上頁
        </button>
        <button
          type="button"
          :disabled="loading || !result || result.page >= pageCount"
          @click="search((result?.page ?? 1) + 1)"
        >
          下頁
        </button>
        <button type="button" @click="emit('close')">關閉</button>
      </div>
    </section>
  </div>
</template>

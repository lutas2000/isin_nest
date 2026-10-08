<template>
  <div class="w-full">
    <div class="rounded-lg bg-white p-4 shadow md:p-8">
      <SectionHeader title="回報處理">
        <template #actions>
          <router-link
            to="/settings"
            class="text-sm text-secondary-600 hover:text-primary-600"
          >
            ← 系統設定
          </router-link>
        </template>
      </SectionHeader>

      <form
        class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
        @submit.prevent="search(1)"
      >
        <label class="text-sm text-secondary-700">
          狀態
          <select v-model="filters.status" :class="inputClass">
            <option value="">全部</option>
            <option
              v-for="(label, value) in FEEDBACK_STATUS_LABELS"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <label class="text-sm text-secondary-700">
          類型
          <select v-model="filters.kind" :class="inputClass">
            <option value="">全部</option>
            <option
              v-for="(label, value) in FEEDBACK_KIND_LABELS"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </label>
        <label class="text-sm text-secondary-700">
          處理者
          <select v-model="filters.assignee" :class="inputClass">
            <option value="">全部</option>
            <option value="none">未指派</option>
            <option
              v-for="user in assignees"
              :key="user.id"
              :value="String(user.id)"
            >
              {{ user.name }}
            </option>
          </select>
        </label>
        <label class="text-sm text-secondary-700">
          日期起
          <input v-model="filters.from" type="date" :class="inputClass" />
        </label>
        <label class="text-sm text-secondary-700">
          日期迄
          <input v-model="filters.to" type="date" :class="inputClass" />
        </label>
        <label class="text-sm text-secondary-700">
          關鍵字
          <input
            v-model="filters.q"
            type="search"
            placeholder="標題或描述"
            :class="inputClass"
          />
        </label>
        <div class="flex gap-2 lg:col-span-6">
          <button
            type="submit"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            查詢
          </button>
          <button
            type="button"
            class="rounded-md border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            @click="resetFilters"
          >
            清除條件
          </button>
        </div>
      </form>

      <div class="overflow-x-auto rounded-md border border-secondary-200">
        <table class="min-w-full divide-y divide-secondary-200 text-sm">
          <thead class="bg-secondary-50 text-left text-secondary-600">
            <tr>
              <th class="px-3 py-2 font-medium">編號</th>
              <th class="px-3 py-2 font-medium">回報時間</th>
              <th class="px-3 py-2 font-medium">類型</th>
              <th class="px-3 py-2 font-medium">標題</th>
              <th class="px-3 py-2 font-medium">回報者</th>
              <th class="px-3 py-2 font-medium">狀態</th>
              <th class="px-3 py-2 font-medium">處理者</th>
              <th v-if="authStore.isAdmin" class="px-3 py-2 font-medium">
                截圖
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-100">
            <tr
              v-for="report in result.items"
              :key="report.id"
              class="cursor-pointer hover:bg-primary-50"
              @click="openReport(report)"
            >
              <td class="px-3 py-2 text-secondary-500">#{{ report.id }}</td>
              <td class="whitespace-nowrap px-3 py-2">
                {{ formatTime(report.created_at) }}
              </td>
              <td class="px-3 py-2">{{ FEEDBACK_KIND_LABELS[report.kind] }}</td>
              <td class="px-3 py-2 text-secondary-900">{{ report.title }}</td>
              <td class="px-3 py-2">
                {{ report.reporter ?? `#${report.user_id}` }}
              </td>
              <td class="px-3 py-2">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="statusClass(report.status)"
                >
                  {{ FEEDBACK_STATUS_LABELS[report.status] }}
                </span>
              </td>
              <td class="px-3 py-2">{{ report.assignee ?? '—' }}</td>
              <td v-if="authStore.isAdmin" class="px-3 py-2">
                {{ report.has_screenshot ? '有' : '' }}
              </td>
            </tr>
            <tr v-if="!loading && !result.items.length">
              <td
                :colspan="authStore.isAdmin ? 8 : 7"
                class="px-3 py-8 text-center text-secondary-400"
              >
                沒有符合條件的回報
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="mt-3 flex items-center justify-between text-sm text-secondary-600"
      >
        <span>共 {{ result.total }} 筆</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-secondary-300 px-3 py-1 disabled:opacity-40"
            :disabled="result.page <= 1 || loading"
            @click="search(result.page - 1)"
          >
            上一頁
          </button>
          <span>{{ result.page }} / {{ pageCount }}</span>
          <button
            type="button"
            class="rounded-md border border-secondary-300 px-3 py-1 disabled:opacity-40"
            :disabled="result.page >= pageCount || loading"
            @click="search(result.page + 1)"
          >
            下一頁
          </button>
        </div>
      </div>
    </div>

    <Modal
      :show="!!selected"
      :title="selected ? `回報 #${selected.id}：${selected.title}` : ''"
      max-width-class="max-w-3xl"
      @close="closeReport"
    >
      <div v-if="selected" class="space-y-4 text-sm">
        <dl
          class="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-secondary-700"
        >
          <dt class="text-secondary-500">類型</dt>
          <dd>{{ FEEDBACK_KIND_LABELS[selected.kind] }}</dd>
          <dt class="text-secondary-500">回報者</dt>
          <dd>{{ selected.reporter ?? `#${selected.user_id}` }}</dd>
          <dt class="text-secondary-500">回報時間</dt>
          <dd>{{ formatTime(selected.created_at) }}</dd>
          <dt class="text-secondary-500">最後更新</dt>
          <dd>{{ formatTime(selected.updated_at) }}</dd>
          <template v-for="entry in contextEntries" :key="entry[0]">
            <dt class="text-secondary-500">{{ entry[0] }}</dt>
            <dd class="break-all">{{ entry[1] }}</dd>
          </template>
        </dl>

        <div>
          <div class="mb-1 font-medium text-secondary-700">描述</div>
          <p
            class="whitespace-pre-wrap rounded-md bg-secondary-50 p-3 text-secondary-900"
          >
            {{ selected.body }}
          </p>
        </div>

        <div v-if="authStore.isAdmin && selected.has_screenshot">
          <div class="mb-1 font-medium text-secondary-700">
            截圖（只有管理員看得到）
          </div>
          <img
            v-if="screenshotUrl"
            :src="screenshotUrl"
            alt="回報截圖"
            class="max-h-[60vh] w-full rounded-md border border-secondary-200 object-contain"
          />
          <button
            v-else
            type="button"
            class="rounded-md border border-secondary-300 px-3 py-1.5 text-secondary-700 hover:bg-secondary-50"
            :disabled="screenshotLoading"
            @click="loadScreenshot"
          >
            {{ screenshotLoading ? '載入中…' : '顯示截圖' }}
          </button>
        </div>

        <form
          class="grid grid-cols-1 gap-3 border-t border-secondary-200 pt-4 sm:grid-cols-2"
          @submit.prevent="save"
        >
          <label class="text-secondary-700">
            狀態
            <select v-model="editForm.status" :class="inputClass">
              <option
                v-for="(label, value) in FEEDBACK_STATUS_LABELS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </label>
          <label class="text-secondary-700">
            處理者
            <select v-model="editForm.assignee" :class="inputClass">
              <option value="">未指派</option>
              <option
                v-for="user in assignees"
                :key="user.id"
                :value="String(user.id)"
              >
                {{ user.name }}
              </option>
            </select>
          </label>
          <label class="text-secondary-700 sm:col-span-2">
            處理結果
            <textarea
              v-model="editForm.resolution"
              rows="3"
              maxlength="5000"
              :class="inputClass"
            />
          </label>
          <div class="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              class="rounded-md border border-secondary-300 px-4 py-2 font-medium text-secondary-700 hover:bg-secondary-50"
              @click="closeReport"
            >
              關閉
            </button>
            <button
              type="submit"
              class="rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? '儲存中…' : '儲存' }}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Modal, SectionHeader } from '@/components';
import { useAuthStore } from '@/stores/auth';
import {
  FEEDBACK_KIND_LABELS,
  FEEDBACK_STATUS_LABELS,
  fetchFeedbackScreenshot,
  listFeedback,
  listFeedbackAssignees,
  updateFeedback,
  type FeedbackFilters,
  type FeedbackPage,
  type FeedbackReport,
  type FeedbackStatus,
} from '@/services/feedback';

// 回報處理（LEGACY-CRM-REBUILD-PLAN.md 7.2）：admin 或 `feedback` write 可用（路由守衛與後端都會擋），
// 截圖只有 admin 看得到，後端也只回給 admin。
const authStore = useAuthStore();
const inputClass =
  'mt-1 block w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const emptyFilters = (): FeedbackFilters => ({
  status: '',
  kind: '',
  assignee: '',
  q: '',
  from: '',
  to: '',
});
const filters = reactive<FeedbackFilters>(emptyFilters());
const result = ref<FeedbackPage>({
  items: [],
  total: 0,
  page: 1,
  page_size: 50,
});
const loading = ref(false);
const assignees = ref<{ id: number; name: string }[]>([]);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(result.value.total / result.value.page_size)),
);

async function search(page = 1) {
  loading.value = true;
  try {
    result.value = await listFeedback({ ...filters, page, page_size: 50 });
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  Object.assign(filters, emptyFilters());
  void search(1);
}

const timeFormat = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const formatTime = (value: string) => timeFormat.format(new Date(value));

function statusClass(status: FeedbackStatus) {
  if (status === 'open') return 'bg-warning-100 text-warning-700';
  if (status === 'done') return 'bg-success-100 text-success-700';
  if (status === 'wont_fix') return 'bg-secondary-100 text-secondary-600';
  return 'bg-primary-100 text-primary-700';
}

// 明細與處理
const CONTEXT_LABELS: Record<string, string> = {
  route: '頁面',
  window: '目前視窗',
  screen: '螢幕',
  viewport: '視窗大小',
  user_agent: '瀏覽器',
  client_version: '前端版本',
  device_pixel_ratio: '像素比',
  reported_at: '前端時間',
};
const selected = ref<FeedbackReport | null>(null);
const editForm = reactive({
  status: 'open' as FeedbackStatus,
  assignee: '',
  resolution: '',
});
const saving = ref(false);
const screenshotUrl = ref<string | null>(null);
const screenshotLoading = ref(false);

const contextEntries = computed(() =>
  Object.entries(selected.value?.context ?? {})
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => [
      CONTEXT_LABELS[key] ?? key,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
    ]),
);

function releaseScreenshot() {
  if (screenshotUrl.value) URL.revokeObjectURL(screenshotUrl.value);
  screenshotUrl.value = null;
}

function openReport(report: FeedbackReport) {
  releaseScreenshot();
  selected.value = report;
  editForm.status = report.status;
  editForm.assignee = report.assignee_user_id
    ? String(report.assignee_user_id)
    : '';
  editForm.resolution = report.resolution ?? '';
}

function closeReport() {
  releaseScreenshot();
  selected.value = null;
}

async function loadScreenshot() {
  if (!selected.value) return;
  screenshotLoading.value = true;
  try {
    const blob = await fetchFeedbackScreenshot(selected.value.id);
    releaseScreenshot();
    screenshotUrl.value = URL.createObjectURL(blob);
  } finally {
    screenshotLoading.value = false;
  }
}

async function save() {
  if (!selected.value) return;
  saving.value = true;
  try {
    const { item } = await updateFeedback(selected.value.id, {
      status: editForm.status,
      assignee_user_id: editForm.assignee ? Number(editForm.assignee) : null,
      resolution: editForm.resolution.trim() || null,
    });
    result.value.items = result.value.items.map((entry) =>
      entry.id === item.id ? item : entry,
    );
    closeReport();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    search(1),
    listFeedbackAssignees().then((users) => {
      assignees.value = users;
    }),
  ]);
});
onBeforeUnmount(releaseScreenshot);
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { legacyGet } from '../services/legacyApi';
import { fetchAssistRows, type AssistRow } from '../utils/legacyAssist';

// 「訂單轉成工作單」, opened by 新增 F5 on 工作登錄 (isin_vb6
// src/components/LegacyOrderToWorkWindow.vue, docs/legacy-ui-spec.md, checked
// on Win7 2026-10-07). 起訖日期 starts at today for both ends and the list
// stays empty until 「...」 loads the orders dated in that range (of the
// chosen 客戶 when one is given). Clicking a row marks it with ＊; 確定 hands
// the marked orders to the form and 取消 leaves an empty new work sheet.
const props = defineProps({ today: { type: String, required: true } });
const emit = defineEmits<{ confirm: [orders: AssistRow[]]; cancel: [] }>();

const from = ref(props.today);
const to = ref(props.today);
const customer = ref('');
const customers = ref<AssistRow[]>([]);
const rows = ref<AssistRow[]>([]);
const marked = ref(new Set<number>());
const loading = ref(false);
const error = ref('');
const fromInput = ref<HTMLInputElement | null>(null);

// The combo shows 「編號 簡稱」; only the code filters.
const customerCode = computed(
  () => customer.value.trim().split(/\s+/)[0] ?? '',
);

async function load() {
  loading.value = true;
  error.value = '';
  marked.value = new Set();
  try {
    const params = new URLSearchParams({
      from: from.value.trim(),
      to: to.value.trim(),
    });
    if (customerCode.value) params.set('customer', customerCode.value);
    const payload = await legacyGet<{ items: AssistRow[] }>(
      `/assist/order-range?${params}`,
    );
    rows.value = payload.items;
  } catch (failure) {
    rows.value = [];
    error.value = (failure as Error).message;
  } finally {
    loading.value = false;
  }
}

function toggle(index: number) {
  const next = new Set(marked.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  marked.value = next;
}

const selectAll = () => {
  marked.value = new Set(rows.value.map((_, index) => index));
};
const selectNone = () => {
  marked.value = new Set();
};
const confirm = () =>
  emit(
    'confirm',
    rows.value.filter((_, index) => marked.value.has(index)),
  );

onMounted(async () => {
  fromInput.value?.focus();
  try {
    customers.value = await fetchAssistRows('customer');
  } catch {
    customers.value = [];
  }
});
</script>

<template>
  <div class="legacy-modal-backdrop">
    <section
      class="legacy-selection legacy-order-to-work"
      role="dialog"
      aria-modal="true"
      aria-label="訂單轉成工作單"
      @keydown.esc.prevent.stop="emit('cancel')"
    >
      <div class="legacy-dialog-title"><span>訂單轉成工作單</span></div>
      <div class="legacy-order-to-work-head">
        <span class="legacy-order-to-work-label">起訖日期</span>
        <input
          ref="fromInput"
          v-model="from"
          class="num"
          maxlength="10"
          aria-label="起始日期"
        />
        <input v-model="to" class="num" maxlength="10" aria-label="截止日期" />
        <button
          type="button"
          class="legacy-browse-button"
          aria-label="載入訂單"
          @click="load"
        >
          ...
        </button>
        <button
          type="button"
          class="legacy-order-to-work-button"
          @click="selectAll"
        >
          全　選
        </button>
        <button
          type="button"
          class="legacy-order-to-work-button"
          @click="confirm"
        >
          確　定
        </button>
        <span class="legacy-order-to-work-label">客　　戶</span>
        <input
          v-model="customer"
          class="legacy-order-to-work-customer"
          list="order-to-work-customers"
          maxlength="30"
          aria-label="客戶"
        />
        <datalist id="order-to-work-customers">
          <option
            v-for="row in customers"
            :key="row.code"
            :value="`${row.code} ${row.short_name ?? ''}`.trim()"
          />
        </datalist>
        <button
          type="button"
          class="legacy-order-to-work-button"
          @click="selectNone"
        >
          全不選
        </button>
        <button
          type="button"
          class="legacy-order-to-work-button"
          @click="emit('cancel')"
        >
          取　消
        </button>
      </div>
      <div class="legacy-selection-grid">
        <table>
          <thead>
            <tr>
              <th class="num">序</th>
              <th>選擇</th>
              <th>訂單編號</th>
              <th>訂單日期</th>
              <th>客戶</th>
              <th>交貨期限</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="row.order_no"
              :class="{ current: marked.has(index) }"
              @click="toggle(index)"
            >
              <td class="num">{{ index + 1 }}</td>
              <td>{{ marked.has(index) ? '＊' : '' }}</td>
              <td>{{ row.order_no }}</td>
              <td class="num">{{ row.order_date }}</td>
              <td>{{ row.customer_name }}</td>
              <td class="num">{{ row.delivery_date }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="loading" class="legacy-selection-message">資料載入中…</p>
        <p v-else-if="error" class="legacy-selection-message error">
          {{ error }}
        </p>
      </div>
    </section>
  </div>
</template>

<template>
  <div class="mx-auto w-full">
    <CrmTableContainer
      :loading="loading"
      :error="error"
      :show-search="false"
      @retry="loadStatistics"
    >
      <template #controls>
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="view" class="form-control max-w-[180px]">
            <option value="voucher">銷貨單</option>
            <option value="item">銷貨明細</option>
          </select>
          <input v-model="yearMonth" type="month" class="form-control max-w-[160px]" />
          <input
            v-model="customerInput"
            type="text"
            class="form-control max-w-[280px]"
            list="customer-filter-options"
            placeholder="輸入公司 ID 或名稱"
            @input="handleCustomerInput"
          />
          <datalist id="customer-filter-options">
            <option value="">全部公司</option>
            <option
              v-for="option in customerOptions"
              :key="option.value"
              :value="option.display"
            />
          </datalist>
          <input
            v-if="view === 'item'"
            v-model="notes"
            type="text"
            class="form-control max-w-[240px]"
            placeholder="備註關鍵字"
          />
          <button type="button" class="btn btn-outline btn-sm" @click="handleResetFilters">
            重設
          </button>
        </div>
      </template>

      <EditableDataTable
        :columns="columns"
        :data="rows"
        :show-actions="false"
        :editable="false"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      >
        <template #cell-customerName="{ row }">
          {{ row.customerName || row.customerId }}
        </template>
        <template #cell-amount="{ value }">
          {{ formatMoney(value) }}
        </template>
        <template #cell-tax="{ value }">
          {{ value === null || value === undefined ? '—' : formatMoney(value) }}
        </template>
        <template #cell-totalAmount="{ value }">
          {{ value === null || value === undefined ? '—' : formatMoney(value) }}
        </template>
        <template #cell-quantity="{ value }">
          {{ value === null || value === undefined ? '—' : value }}
        </template>
        <template #cell-unitPrice="{ value }">
          {{ value === null || value === undefined ? '—' : formatMoney(value) }}
        </template>
        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
        </template>
      </EditableDataTable>
    </CrmTableContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  CrmTableContainer,
  EditableDataTable,
  type EditableColumn,
} from '@/components';
import {
  salesVoucherService,
  type SalesStatisticsRow,
  type SalesStatisticsView,
} from '@/services/crm/sales-voucher.service';
import { customerService, type Customer } from '@/services/crm/customer.service';

const currentMonth = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<SalesStatisticsRow[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(50);

const view = ref<SalesStatisticsView>('voucher');
const yearMonth = ref(currentMonth());
const customerId = ref('');
const customerInput = ref('');
const notes = ref('');
const isBulkResetting = ref(false);

const customerOptions = ref<Array<{ value: string; label: string; display: string }>>([]);
let customerSearchTimer: ReturnType<typeof setTimeout> | null = null;

const voucherColumns: EditableColumn[] = [
  { key: 'voucherId', label: '銷貨單號', editable: false },
  { key: 'customerName', label: '公司', editable: false },
  { key: 'notes', label: '備註', editable: false, truncate: true, width: 'notes' },
  { key: 'amount', label: '未稅合計', editable: false, width: 'long-number' },
  { key: 'tax', label: '稅額', editable: false, width: 'long-number' },
  { key: 'totalAmount', label: '含稅合計', editable: false, width: 'long-number' },
  { key: 'createdAt', label: '建立日期', editable: false },
];

const itemColumns: EditableColumn[] = [
  { key: 'voucherId', label: '銷貨單號', editable: false },
  { key: 'itemId', label: '明細ID', editable: false, width: 'short-number' },
  { key: 'customerName', label: '公司', editable: false },
  { key: 'source', label: '來源', editable: false },
  { key: 'notes', label: '備註', editable: false, truncate: true, width: 'notes' },
  { key: 'quantity', label: '數量', editable: false, width: 'short-number' },
  { key: 'unitPrice', label: '單價', editable: false, width: 'long-number' },
  { key: 'amount', label: '小計', editable: false, width: 'long-number' },
  { key: 'createdAt', label: '建立日期', editable: false },
];

const columns = computed(() => (view.value === 'voucher' ? voucherColumns : itemColumns));

const formatMoney = (value: unknown) => {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return '0';
  return amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const loadCustomers = async (search?: string) => {
  try {
    const response = await customerService.getAll(1, 50, search);
    const list = Array.isArray(response) ? response : response.data;
    customerOptions.value = (list as Customer[]).map((customer) => ({
      value: customer.id,
      label: customer.companyShortName || customer.companyName || customer.id,
      display: `${customer.id}｜${customer.companyShortName || customer.companyName || customer.id}`,
    }));
  } catch {
    customerOptions.value = [];
  }
};

const normalizeCustomerId = (rawInput: string) => {
  const input = rawInput.trim();
  if (!input) return '';
  const directMatch = customerOptions.value.find(
    (option) =>
      option.display === input || option.value === input || option.label === input,
  );
  if (directMatch) return directMatch.value;
  if (input.includes('｜')) {
    const [idPart] = input.split('｜');
    return idPart.trim();
  }
  return input;
};

const handleCustomerInput = () => {
  if (customerSearchTimer) clearTimeout(customerSearchTimer);
  customerSearchTimer = setTimeout(() => {
    void loadCustomers(customerInput.value.trim() || undefined);
  }, 200);
};

const loadStatistics = async () => {
  customerId.value = normalizeCustomerId(customerInput.value);
  loading.value = true;
  error.value = null;
  try {
    const response = await salesVoucherService.getStatistics({
      view: view.value,
      yearMonth: yearMonth.value,
      customerId: customerId.value || undefined,
      notes: view.value === 'item' ? notes.value : '',
      page: currentPage.value,
      limit: pageSize.value,
    });
    rows.value = response.data;
    total.value = response.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入銷售統計失敗';
  } finally {
    loading.value = false;
  }
};

let textFilterApplyTimer: ReturnType<typeof setTimeout> | null = null;
const TEXT_FILTER_DEBOUNCE_MS = 350;

const scheduleTextFilterApply = () => {
  if (textFilterApplyTimer) clearTimeout(textFilterApplyTimer);
  textFilterApplyTimer = setTimeout(() => {
    textFilterApplyTimer = null;
    currentPage.value = 1;
    void loadStatistics();
  }, TEXT_FILTER_DEBOUNCE_MS);
};

const handleResetFilters = () => {
  if (textFilterApplyTimer) {
    clearTimeout(textFilterApplyTimer);
    textFilterApplyTimer = null;
  }
  isBulkResetting.value = true;
  view.value = 'voucher';
  yearMonth.value = currentMonth();
  customerId.value = '';
  customerInput.value = '';
  notes.value = '';
  currentPage.value = 1;
  void loadStatistics();
  queueMicrotask(() => {
    isBulkResetting.value = false;
  });
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  void loadStatistics();
};

const handlePageSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  void loadStatistics();
};

watch(view, () => {
  if (isBulkResetting.value) return;
  currentPage.value = 1;
  void loadStatistics();
});

watch(yearMonth, () => {
  if (isBulkResetting.value) return;
  currentPage.value = 1;
  void loadStatistics();
});

watch(customerInput, () => {
  if (isBulkResetting.value) return;
  scheduleTextFilterApply();
});

watch(notes, () => {
  if (isBulkResetting.value) return;
  if (view.value !== 'item') return;
  scheduleTextFilterApply();
});

onMounted(async () => {
  await loadCustomers();
  await loadStatistics();
});

onBeforeUnmount(() => {
  if (customerSearchTimer) {
    clearTimeout(customerSearchTimer);
  }
  if (textFilterApplyTimer) {
    clearTimeout(textFilterApplyTimer);
  }
});
</script>

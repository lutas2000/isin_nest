import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  salesVoucherService,
  type SalesStatisticsRow,
  type SalesStatisticsView,
} from '@/services/crm/sales-voucher.service';
import { customerService, type Customer } from '@/services/crm/customer.service';

export function currentSalesStatsMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export function useSalesStatisticsList(options: {
  view: SalesStatisticsView;
  includeNotesFilter?: boolean;
}) {
  const { view, includeNotesFilter = false } = options;

  const loading = ref(false);
  const error = ref<string | null>(null);
  const rows = ref<SalesStatisticsRow[]>([]);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(50);

  const yearMonth = ref(currentSalesStatsMonth());
  const customerId = ref('');
  const customerInput = ref('');
  const notes = ref('');
  const isBulkResetting = ref(false);

  const customerOptions = ref<Array<{ value: string; label: string; display: string }>>([]);
  let customerSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let textFilterApplyTimer: ReturnType<typeof setTimeout> | null = null;
  const TEXT_FILTER_DEBOUNCE_MS = 350;

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
        view,
        yearMonth: yearMonth.value,
        customerId: customerId.value || undefined,
        notes: includeNotesFilter ? notes.value : '',
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
    yearMonth.value = currentSalesStatsMonth();
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

  watch(yearMonth, () => {
    if (isBulkResetting.value) return;
    currentPage.value = 1;
    void loadStatistics();
  });

  watch(customerInput, () => {
    if (isBulkResetting.value) return;
    scheduleTextFilterApply();
  });

  if (includeNotesFilter) {
    watch(notes, () => {
      if (isBulkResetting.value) return;
      scheduleTextFilterApply();
    });
  }

  onMounted(async () => {
    await loadCustomers();
    await loadStatistics();
  });

  onBeforeUnmount(() => {
    if (customerSearchTimer) clearTimeout(customerSearchTimer);
    if (textFilterApplyTimer) clearTimeout(textFilterApplyTimer);
  });

  return {
    loading,
    error,
    rows,
    total,
    currentPage,
    pageSize,
    yearMonth,
    customerInput,
    notes,
    customerOptions,
    loadStatistics,
    handleResetFilters,
    handlePageChange,
    handlePageSizeChange,
    handleCustomerInput,
    formatMoney,
  };
}

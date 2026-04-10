<template>
  <div class="sales-vouchers-page">
    <PageHeader
      title="銷貨單"
      description="銷賬單據：可手動建立，或由訂單複製（與送貨／配送工單無關）"
    />

    <ShortcutHint :table-state="tableState" @shortcut-click="handleShortcutClick" />

    <div class="toolbar card-toolbar">
      <div class="toolbar-row">
        <label class="toolbar-label">從訂單建立</label>
        <input
          v-model="fromOrderId"
          type="text"
          class="form-control toolbar-input"
          placeholder="訂單編號"
        />
        <label class="toolbar-label">稅金</label>
        <input
          v-model.number="fromOrderTax"
          type="number"
          class="form-control toolbar-input toolbar-input-narrow"
          min="0"
          step="0.01"
        />
        <button type="button" class="btn btn-primary" @click="createFromOrder">
          建立銷貨單
        </button>
      </div>
    </div>

    <div class="sales-content">
      <SearchFilters
        title=""
        :show-search="true"
        search-placeholder="搜尋銷貨單號、訂單號或客戶..."
        :filters="[]"
        :show-date-filter="false"
        v-model:search="voucherSearch"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable
        v-else
        ref="editableTableRef"
        :columns="editableColumns"
        :data="filteredRows"
        :show-actions="true"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :editable="true"
        :show-new-row="showNewRow"
        :new-row-template="newRowTemplate"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @field-change="handleFieldChange"
        @save="handleSave"
        @new-row-save="handleNewRowSave"
        @new-row-cancel="showNewRow = false"
        @new-row-show="showNewRow = true"
        @row-delete="handleRowDelete"
        @row-view="handleRowView"
        @row-edit="handleRowEdit"
      >
        <template #cell-id="{ row, value }">
          <button
            v-if="value"
            class="link-button"
            type="button"
            @click="viewDetails(row)"
          >
            {{ value }}
          </button>
          <span v-else class="text-muted">待生成</span>
        </template>

        <template #cell-orderId="{ value }">
          <router-link
            v-if="value"
            :to="`/crm/orders/${value}/items`"
            class="link"
            @click.stop
          >
            {{ value }}
          </router-link>
          <span v-else class="text-muted">—</span>
        </template>

        <template #cell-customerId="{ row, value }">
          <span
            v-if="value"
            :title="row.customer?.companyName || row.customer?.companyShortName || value"
          >
            {{ value }}
          </span>
          <span v-else class="text-muted">未指定</span>
        </template>

        <template #cell-staffId="{ row, value }">
          <span v-if="value">{{ row.staff?.name || value }}</span>
          <span v-else class="text-muted">—</span>
        </template>

        <template #cell-amount="{ value }">
          {{ formatMoney(value) }}
        </template>

        <template #cell-tax="{ value }">
          {{ formatMoney(value) }}
        </template>

        <template #cell-grandTotal="{ row }">
          {{ formatMoney(grandTotal(row)) }}
        </template>

        <template #cell-notes="{ value }">
          <span v-if="value && value.length > 50" :title="value">
            {{ value.substring(0, 50) }}...
          </span>
          <span v-else>{{ value || '' }}</span>
        </template>

        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
        </template>

        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing">
            <button type="button" class="btn btn-sm btn-success" @click="save">保存</button>
            <button type="button" class="btn btn-sm btn-outline" @click="cancel">取消</button>
          </template>
          <template v-else>
            <span class="dropdown-item" @click="deleteVoucher(row.id)">刪除</span>
          </template>
        </template>
      </EditableDataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  PageHeader,
  EditableDataTable,
  type EditableColumn,
  SearchFilters,
  ShortcutHint,
} from '@/components';
import {
  salesVoucherService,
  type SalesVoucher,
} from '@/services/crm/sales-voucher.service';
import { customerService, type Customer } from '@/services/crm/customer.service';
import { apiGet } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

interface Staff {
  id: string;
  name: string;
}

const router = useRouter();
const authStore = useAuthStore();

const vouchers = ref<SalesVoucher[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);
const voucherSearch = ref('');
const showNewRow = ref(false);
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

const fromOrderId = ref('');
const fromOrderTax = ref(0);

const tableState = computed(() => {
  const tableRef = editableTableRef.value;
  if (!tableRef) return null;
  return {
    focusedRowIndex: tableRef.focusedRowIndex,
    focusedFieldKey: tableRef.focusedFieldKey,
    isNewRowFocused: tableRef.isNewRowFocused,
    editingRowId: tableRef.editingRowId,
    data: tableRef.data,
  };
});

const formatMoney = (v: unknown) => {
  const n = Number(v);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const grandTotal = (row: SalesVoucher) =>
  Number(row.amount ?? 0) + Number(row.tax ?? 0);

const newRowTemplate = () => ({
  id: '',
  orderId: '',
  staffId: authStore.staffId || '',
  customerId: '',
  shippingMethod: '自取',
  paymentMethod: '轉帳',
  notes: '',
  amount: 0,
  tax: 0,
});

const editableColumns = computed<EditableColumn[]>(() => [
  { key: 'id', label: '銷貨單號', editable: false, type: 'text' },
  {
    key: 'orderId',
    label: '關聯訂單',
    editable: true,
    type: 'text',
  },
  {
    key: 'customerId',
    label: '客戶',
    editable: true,
    required: true,
    type: 'search-select',
    searchFunction: async (searchTerm: string) => {
      try {
        const response = await customerService.getAll(undefined, undefined, searchTerm);
        const list = Array.isArray(response) ? response : (response as any).data || [];
        return (list as Customer[]).map((c) => ({
          value: c.id,
          label: c.companyShortName ? `${c.id}(${c.companyShortName})` : c.id,
        }));
      } catch {
        return [];
      }
    },
  },
  {
    key: 'staffId',
    label: '業務員',
    editable: true,
    required: true,
    type: 'search-select',
    searchFunction: async (searchTerm: string) => {
      try {
        const params: Record<string, string> = { department: '銷管部' };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        const staffResult = await apiGet<Staff[]>('/staffs/all', params);
        return staffResult.map((s) => ({ value: s.id, label: s.name }));
      } catch {
        return [];
      }
    },
  },
  {
    key: 'shippingMethod',
    label: '運送方式',
    editable: true,
    required: true,
    type: 'select',
    options: [
      { value: '自取', label: '自取' },
      { value: '快遞', label: '快遞' },
      { value: '貨運', label: '貨運' },
    ],
  },
  {
    key: 'paymentMethod',
    label: '付款方式',
    editable: true,
    required: true,
    type: 'select',
    options: [
      { value: '現金', label: '現金' },
      { value: '轉帳', label: '轉帳' },
      { value: '月結', label: '月結' },
    ],
  },
  {
    key: 'amount',
    label: '未稅合計',
    editable: false,
    type: 'number',
  },
  {
    key: 'tax',
    label: '稅金',
    editable: true,
    type: 'number',
  },
  {
    key: 'grandTotal',
    label: '含稅合計',
    editable: false,
    type: 'text',
  },
  { key: 'notes', label: '備註', editable: true, type: 'text', truncate: true },
  { key: 'createdAt', label: '建立日期', editable: false },
]);

const filteredRows = computed(() => {
  let list = vouchers.value;
  if (voucherSearch.value) {
    const s = voucherSearch.value.toLowerCase();
    list = list.filter(
      (v) =>
        v.id.toLowerCase().includes(s) ||
        (v.orderId && v.orderId.toLowerCase().includes(s)) ||
        v.customer?.companyName?.toLowerCase().includes(s) ||
        v.customer?.companyShortName?.toLowerCase().includes(s),
    );
  }
  return list;
});

const loadVouchers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await salesVoucherService.getAll(currentPage.value, pageSize.value);
    if (response && typeof response === 'object' && 'data' in response) {
      vouchers.value = response.data;
      total.value = response.total;
    } else {
      vouchers.value = response as SalesVoucher[];
      total.value = vouchers.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入失敗';
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadVouchers();
};

const handlePageSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadVouchers();
};

const viewDetails = (row: SalesVoucher) => {
  if (!row.id) return;
  router.push(`/crm/sales-vouchers/${row.id}/items`);
};

const handleFieldChange = () => {};

const handleSave = async (row: SalesVoucher, isNew: boolean) => {
  try {
    if (isNew) {
      await salesVoucherService.create({
        staffId: row.staffId,
        customerId: row.customerId,
        shippingMethod: row.shippingMethod,
        paymentMethod: row.paymentMethod,
        notes: row.notes || undefined,
        tax: Number(row.tax) || 0,
        orderId: row.orderId?.trim() || undefined,
      });
      await loadVouchers();
    } else {
      await salesVoucherService.update(row.id, {
        staffId: row.staffId,
        customerId: row.customerId,
        shippingMethod: row.shippingMethod,
        paymentMethod: row.paymentMethod,
        notes: row.notes || undefined,
        tax: Number(row.tax) || 0,
        orderId: row.orderId?.trim() || null,
      });
      await loadVouchers();
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存失敗');
  }
};

const handleNewRowSave = async (row: any) => {
  try {
    await salesVoucherService.create({
      staffId: row.staffId,
      customerId: row.customerId,
      shippingMethod: row.shippingMethod,
      paymentMethod: row.paymentMethod,
      notes: row.notes || undefined,
      tax: Number(row.tax) || 0,
      orderId: row.orderId?.trim() || undefined,
    });
    showNewRow.value = false;
    await loadVouchers();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立失敗');
  }
};

const createFromOrder = async () => {
  const oid = fromOrderId.value.trim();
  if (!oid) {
    alert('請輸入訂單編號');
    return;
  }
  try {
    await salesVoucherService.create({
      sourceOrderId: oid,
      tax: Number(fromOrderTax.value) || 0,
    });
    fromOrderId.value = '';
    fromOrderTax.value = 0;
    await loadVouchers();
  } catch (err) {
    alert(err instanceof Error ? err.message : '從訂單建立失敗');
  }
};

const deleteVoucher = async (id: string) => {
  if (!id || !confirm('確定刪除此銷貨單？')) return;
  try {
    await salesVoucherService.delete(id);
    await loadVouchers();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除失敗');
  }
};

const handleRowDelete = (row: SalesVoucher) => {
  void deleteVoucher(row.id);
};

const handleRowView = (row: SalesVoucher) => {
  viewDetails(row);
};

const handleRowEdit = () => {};

const handleShortcutClick = (action: string) => {
  const tableRef = editableTableRef.value;
  const state = tableState.value;
  if (!tableRef || !state) return;
  const data = state.data();
  const idx = state.focusedRowIndex;
  switch (action) {
    case 'row-view':
      if (idx !== null && data[idx]) handleRowView(data[idx]);
      break;
    case 'row-edit':
      if (idx !== null && data[idx]) tableRef.startEdit(data[idx], idx);
      break;
    case 'row-delete':
      if (idx !== null && data[idx]) handleRowDelete(data[idx]);
      break;
    case 'new-row-show':
      showNewRow.value = true;
      break;
    case 'cancel-new-row':
      tableRef.cancelNewRow();
      break;
    default:
      break;
  }
};

onMounted(() => {
  loadVouchers();
});
</script>

<style scoped>
.sales-vouchers-page {
  width: 100%;
  margin: 0 auto;
}

.card-toolbar {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.toolbar-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-700);
}

.toolbar-input {
  max-width: 200px;
}

.toolbar-input-narrow {
  max-width: 120px;
}

.sales-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.loading-message,
.error-message {
  padding: 2rem;
  text-align: center;
}

.error-message {
  color: var(--danger-600);
  background: var(--danger-50);
}

.link-button {
  background: none;
  border: none;
  padding: 0;
  color: var(--primary-600);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
}

.link {
  color: var(--primary-600);
  text-decoration: underline;
}

.text-muted {
  color: var(--secondary-400);
}

.form-control {
  padding: 0.5rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
}
</style>

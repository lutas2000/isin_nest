<template>
  <div class="sales-voucher-items-page">
    <PageHeader
      title="銷貨單明細"
      :description="voucher ? `單號 ${voucher.id}` : '載入中...'"
    >
      <template #actions>
        <button
          type="button"
          class="btn btn-outline btn-sm"
          :disabled="!voucher"
          @click="applyDefaultVatToDraft"
        >
          依預設稅率帶入稅金
        </button>
        <button type="button" class="btn btn-outline" @click="goBack">
          <span class="btn-icon">←</span>
          返回
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-message">載入中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div v-else-if="voucher" class="content">
      <div class="details-card">
        <div class="details-content">
          <DetailFieldsPanel v-model:editing="detailsEditing" :items="detailItems">
            <template #actions>
              <template v-if="!detailsEditing">
                <button type="button" class="btn btn-outline btn-sm" @click="startDetailsEdit">
                  編輯
                </button>
              </template>
              <template v-else>
                <button type="button" class="btn btn-primary btn-sm" @click="saveDetailsEdit">
                  儲存
                </button>
                <button type="button" class="btn btn-outline btn-sm" @click="cancelDetailsEdit">
                  取消
                </button>
              </template>
            </template>
            <template #edit-shippingMethod>
              <input v-model="detailDraft.shippingMethod" type="text" class="form-control" />
            </template>
            <template #edit-paymentMethod>
              <input v-model="detailDraft.paymentMethod" type="text" class="form-control" />
            </template>
            <template #edit-notes>
              <textarea v-model="detailDraft.notes" class="form-control" rows="3" />
            </template>
            <template #edit-tax>
              <input
                v-model.number="detailDraft.tax"
                type="number"
                class="form-control"
                min="0"
                step="0.01"
              />
            </template>
            <template #value-orderId>
              <router-link
                v-if="voucher?.orderId"
                :to="`/crm/orders/${voucher.orderId}/items`"
                class="link"
              >
                {{ voucher.orderId }}
              </router-link>
              <span v-else>—</span>
            </template>
          </DetailFieldsPanel>
        </div>
      </div>

      <ShortcutHint :table-state="tableState" @shortcut-click="handleShortcutClick" />

      <div class="items-card">
        <TableHeader title="銷貨明細">
          <template #actions>
            <button type="button" class="btn btn-primary" @click="showNewRow = true">
              <span class="btn-icon">➕</span>
              新增明細
            </button>
          </template>
        </TableHeader>
        <EditableDataTable
          ref="editableTableRef"
          :columns="editableColumns"
          :data="displayItems"
          :show-actions="true"
          :editable="true"
          :show-new-row="showNewRow"
          :new-row-template="newRowTemplate"
          @field-change="handleFieldChange"
          @save="handleSave"
          @new-row-save="handleNewRowSave"
          @new-row-cancel="showNewRow = false"
          @new-row-show="showNewRow = true"
          @row-delete="handleRowDelete"
          @row-edit="handleRowEdit"
        >
          <template #cell-sequence="{ value }">{{ value }}</template>
          <template #cell-cadFile="{ value }">{{ value || '-' }}</template>
          <template #cell-customerFile="{ value }">{{ value || '-' }}</template>
          <template #cell-material="{ value }">{{ value || '-' }}</template>
          <template #cell-thickness="{ value }">{{ value ?? '-' }}</template>
          <template #cell-processing="{ row }">
            <button type="button" class="processing-btn" @click.stop="openProcessingSelectModal(row)">
              <span v-if="row.processingIds?.length" class="processing-tags">
                {{ getProcessingNames(row.processingIds) }}
              </span>
              <span v-else class="processing-empty">選擇加工</span>
            </button>
          </template>
          <template #cell-substitute="{ value }">{{ value || '無' }}</template>
          <template #cell-quantity="{ value }">{{ value }}</template>
          <template #cell-unitPrice="{ value }">{{ formatMoney(value) }}</template>
          <template #cell-source="{ value }">{{ value || '-' }}</template>
          <template #cell-notes="{ value }">{{ value || '-' }}</template>
          <template #actions="{ row, isEditing, save, cancel }">
            <template v-if="isEditing">
              <button type="button" class="btn btn-sm btn-success" @click="save">保存</button>
              <button type="button" class="btn btn-sm btn-outline" @click="cancel">取消</button>
            </template>
            <template v-else>
              <span class="dropdown-item" @click="deleteItem(row.id)">刪除</span>
            </template>
          </template>
        </EditableDataTable>
      </div>
    </div>

    <ProcessingSelectModal
      :show="showProcessingSelectModal"
      :model-value="selectedItem?.processingIds || []"
      @close="showProcessingSelectModal = false"
      @confirm="handleProcessingConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  PageHeader,
  TableHeader,
  EditableDataTable,
  ShortcutHint,
  DetailFieldsPanel,
  type EditableColumn,
  type DetailFieldItem,
} from '@/components';
import ProcessingSelectModal from '@/components/ProcessingSelectModal.vue';
import {
  salesVoucherService,
  salesVoucherItemService,
  type SalesVoucher,
  type SalesVoucherItem,
} from '@/services/crm/sales-voucher.service';
import { processingService, type Processing } from '@/services/crm/processing.service';
import { API_CONFIG } from '@/config/api';
import { apiGet } from '@/services/api';

const route = useRoute();
const router = useRouter();

const voucher = ref<SalesVoucher | null>(null);
const items = ref<SalesVoucherItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const defaultVatPercent = ref(5);

const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);
const showNewRow = ref(false);
const showProcessingSelectModal = ref(false);
const selectedItem = ref<SalesVoucherItem | null>(null);
const allProcessings = ref<Processing[]>([]);

type DisplayItem = SalesVoucherItem & { sequence: number };

const dateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value));
};

const formatMoney = (v: unknown) => {
  const n = Number(v);
  if (Number.isNaN(n)) return '0';
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

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

const detailsEditing = ref(false);
const detailDraft = ref({
  shippingMethod: '',
  paymentMethod: '',
  notes: '',
  tax: 0,
});

const startDetailsEdit = () => {
  if (!voucher.value) return;
  detailDraft.value = {
    shippingMethod: voucher.value.shippingMethod || '',
    paymentMethod: voucher.value.paymentMethod || '',
    notes: voucher.value.notes || '',
    tax: Number(voucher.value.tax) || 0,
  };
  detailsEditing.value = true;
};

const cancelDetailsEdit = () => {
  detailsEditing.value = false;
};

const saveDetailsEdit = async () => {
  if (!voucher.value) return;
  try {
    await salesVoucherService.update(voucher.value.id, {
      shippingMethod: detailDraft.value.shippingMethod,
      paymentMethod: detailDraft.value.paymentMethod,
      notes: detailDraft.value.notes.trim() || undefined,
      tax: Number(detailDraft.value.tax) || 0,
    });
    detailsEditing.value = false;
    await loadAll();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存失敗');
  }
};

const applyDefaultVatToDraft = () => {
  if (!voucher.value) return;
  const amt = Number(voucher.value.amount) || 0;
  const rate = defaultVatPercent.value / 100;
  const tax = Math.round(amt * rate * 100) / 100;
  if (detailsEditing.value) {
    detailDraft.value.tax = tax;
  } else {
    void (async () => {
      try {
        await salesVoucherService.update(voucher.value!.id, { tax });
        await loadAll();
      } catch (err) {
        alert(err instanceof Error ? err.message : '更新稅金失敗');
      }
    })();
  }
};

const detailItems = computed<DetailFieldItem[]>(() => {
  if (!voucher.value) return [];
  const v = voucher.value;
  const base: DetailFieldItem[] = [
    { key: 'id', label: '銷貨單號', value: v.id },
    {
      key: 'orderId',
      label: '關聯訂單',
      value: v.orderId || '—',
    },
    { key: 'staff', label: '業務員', value: v.staff?.name || v.staffId },
    {
      key: 'customer',
      label: '客戶',
      value:
        v.customer?.companyName ||
        v.customer?.companyShortName ||
        v.customerId,
    },
    { key: 'amount', label: '未稅合計', value: formatMoney(v.amount) },
    { key: 'tax', label: '稅金', value: formatMoney(v.tax) },
    {
      key: 'total',
      label: '含稅合計',
      value: formatMoney(Number(v.amount) + Number(v.tax)),
    },
    {
      key: 'shippingMethod',
      label: '運送方式（條件快照）',
      value: v.shippingMethod || '—',
    },
    {
      key: 'paymentMethod',
      label: '付款方式（條件快照）',
      value: v.paymentMethod || '—',
    },
    { key: 'createdAt', label: '建立時間', value: formatDateTime(v.createdAt) },
    { key: 'updatedAt', label: '更新時間', value: formatDateTime(v.updatedAt) },
    {
      key: 'notes',
      label: '備註',
      value: v.notes || '—',
      fullWidth: true,
    },
  ];
  return base;
});

const newRowTemplate = () => ({
  salesVoucherId: voucher.value?.id || '',
  cadFile: '',
  customerFile: '',
  material: '',
  thickness: undefined as number | undefined,
  processingIds: [] as number[],
  quantity: 0,
  substitute: '',
  unitPrice: 0,
  source: '新圖',
  notes: '',
});

const editableColumns = computed<EditableColumn[]>(() => [
  { key: 'sequence', label: '項次', editable: false },
  { key: 'cadFile', label: 'CAD 檔案', editable: true, type: 'text' },
  { key: 'customerFile', label: '客戶檔案', editable: true, type: 'text' },
  { key: 'material', label: '材料', editable: true, type: 'text' },
  { key: 'thickness', label: '厚度', editable: true, type: 'number' },
  { key: 'processing', label: '加工', editable: false },
  {
    key: 'quantity',
    label: '數量',
    editable: true,
    required: true,
    type: 'number',
  },
  {
    key: 'substitute',
    label: '代料',
    editable: true,
    type: 'select',
    options: [
      { value: '代料', label: '代料' },
      { value: '代折', label: '代折' },
      { value: null, label: '無' },
    ],
  },
  {
    key: 'unitPrice',
    label: '單價',
    editable: true,
    type: 'number',
  },
  {
    key: 'source',
    label: '來源',
    editable: true,
    type: 'select',
    options: [
      { value: '新圖', label: '新圖' },
      { value: '舊圖', label: '舊圖' },
      { value: '修改', label: '修改' },
    ],
  },
  { key: 'notes', label: '備註', editable: true, type: 'text' },
]);

const orderedItems = computed(() =>
  [...items.value].sort((a, b) => a.id - b.id),
);

const displayItems = computed<DisplayItem[]>(() =>
  orderedItems.value.map((item, index) => ({
    ...item,
    sequence: index + 1,
  })),
);

const loadAll = async () => {
  const id = route.params.id as string;
  if (!id) {
    error.value = '無效的銷貨單號';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    voucher.value = await salesVoucherService.getById(id);
    if (voucher.value.salesVoucherItems?.length) {
      items.value = voucher.value.salesVoucherItems;
    } else {
      const res = await salesVoucherItemService.getAll(id, 1, 500);
      items.value =
        res && typeof res === 'object' && 'data' in res
          ? (res as any).data
          : (res as SalesVoucherItem[]);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入失敗';
  } finally {
    loading.value = false;
  }
};

const loadVatDefault = async () => {
  try {
    type CrmRow = { code: string; label: string };
    const rows = await apiGet<CrmRow[]>(`${API_CONFIG.CRM.CONFIGS}/vat_rate`);
    const row = rows?.find((r) => r.code === 'default') || rows?.[0];
    const n = row ? parseFloat(row.label) : NaN;
    if (!Number.isNaN(n) && n >= 0) {
      defaultVatPercent.value = n;
    }
  } catch {
    defaultVatPercent.value = 5;
  }
};

const loadProcessings = async () => {
  try {
    allProcessings.value = await processingService.getAllActive();
  } catch {
    allProcessings.value = [];
  }
};

const handleFieldChange = () => {};

const buildItemPayload = (row: SalesVoucherItem): Partial<SalesVoucherItem> => ({
  salesVoucherId: voucher.value!.id,
  cadFile: row.cadFile || undefined,
  customerFile: row.customerFile || undefined,
  material: row.material || undefined,
  thickness: row.thickness ?? undefined,
  processingIds: row.processingIds || undefined,
  quantity: row.quantity || 0,
  substitute: row.substitute || undefined,
  unitPrice: row.unitPrice || 0,
  source: row.source || '新圖',
  notes: row.notes || undefined,
});

const handleSave = async (row: SalesVoucherItem, isNew: boolean) => {
  if (!voucher.value) return;
  try {
    const data = buildItemPayload(row);
    if (isNew) {
      await salesVoucherItemService.create(data);
    } else {
      await salesVoucherItemService.update(row.id, data);
    }
    await loadAll();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存明細失敗');
  }
};

const handleNewRowSave = async (row: any) => {
  if (!voucher.value) return;
  try {
    await salesVoucherItemService.create({
      salesVoucherId: voucher.value.id,
      cadFile: row.cadFile || undefined,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness ?? undefined,
      processingIds: row.processingIds || undefined,
      quantity: row.quantity || 0,
      substitute: row.substitute || undefined,
      unitPrice: row.unitPrice || 0,
      source: row.source || '新圖',
      notes: row.notes || undefined,
    });
    showNewRow.value = false;
    await loadAll();
  } catch (err) {
    alert(err instanceof Error ? err.message : '新增明細失敗');
  }
};

const deleteItem = async (id: number) => {
  if (!confirm('確定刪除此明細？')) return;
  try {
    await salesVoucherItemService.delete(id);
    await loadAll();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除失敗');
  }
};

const handleRowDelete = (row: SalesVoucherItem) => {
  void deleteItem(row.id);
};

const handleRowEdit = () => {};

const handleShortcutClick = (action: string) => {
  const tableRef = editableTableRef.value;
  const state = tableState.value;
  if (!tableRef || !state) return;
  const data = state.data();
  const idx = state.focusedRowIndex;
  switch (action) {
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

const goBack = () => {
  router.push('/crm/sales-vouchers');
};

const openProcessingSelectModal = (row: SalesVoucherItem) => {
  selectedItem.value = row;
  showProcessingSelectModal.value = true;
};

const handleProcessingConfirm = async (value: { ids: number[] }) => {
  if (!selectedItem.value) return;
  try {
    await salesVoucherItemService.update(selectedItem.value.id, {
      processingIds: value.ids,
    });
    showProcessingSelectModal.value = false;
    selectedItem.value = null;
    await loadAll();
  } catch (err) {
    alert(err instanceof Error ? err.message : '更新加工失敗');
  }
};

const getProcessingNames = (ids?: number[]) => {
  if (!ids?.length) return '-';
  return ids
    .map((id) => allProcessings.value.find((p) => p.id === id)?.name || String(id))
    .join('、');
};

onMounted(() => {
  loadVatDefault();
  loadProcessings();
  loadAll();
});
</script>

<style scoped>
.sales-voucher-items-page {
  width: 100%;
  margin: 0 auto;
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

.content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.details-card,
.items-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 1rem 1.25rem;
}

.details-content {
  max-width: 100%;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
}

.processing-btn {
  background: var(--secondary-100);
  border: 1px solid var(--secondary-200);
  border-radius: var(--border-radius);
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.processing-tags {
  color: var(--secondary-800);
}

.processing-empty {
  color: var(--secondary-500);
}

.btn-icon {
  margin-right: 0.35rem;
}

.link {
  color: var(--primary-600);
  text-decoration: underline;
}
</style>

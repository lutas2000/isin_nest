<template>
  <div class="quote-items-view mx-auto w-full">
    <div v-if="loading" class="p-8 text-center">載入中...</div>
    <div
      v-else-if="error"
      class="rounded-lg bg-danger-50 p-8 text-center text-danger-600"
    >
      {{ error }}
    </div>
    
    <div v-else-if="quote" class="flex flex-col gap-8">
      <!-- 報價單詳細資訊 -->
      <div class="overflow-hidden rounded-lg bg-white shadow">
        <div class="p-8">
          <DetailFieldsPanel
            v-model:editing="detailsEditing"
            :items="detailItems"
          >
            <template #actions>
              <template v-if="!detailsEditing">
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  @click="startDetailsEdit"
                >
                  編輯
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  @click="saveDetailsEdit"
                >
                  儲存
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  @click="cancelDetailsEdit"
                >
                  取消
                </button>
              </template>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                @click="handlePrint('A4')"
              >
                列印A4
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                @click="handlePrint('A5')"
              >
                列印A5
              </button>
              <button type="button" class="btn btn-outline btn-sm" @click="goBack">
                <span class="mr-2">←</span>
                返回
              </button>
            </template>
            <template #edit-isSigned>
              <label class="inline-flex cursor-pointer items-center gap-2 text-base">
                <input v-model="detailDraft.isSigned" type="checkbox" />
                已簽名
              </label>
            </template>
            <template #edit-processingIds>
              <button
                type="button"
                class="inline-flex min-h-9 w-full cursor-pointer items-center gap-1 rounded border border-secondary-200 bg-secondary-50 px-2 py-1 text-left text-sm transition-all duration-200 hover:border-primary-300 hover:bg-secondary-100"
                @click="openQuoteHeaderProcessingModal"
              >
                <span
                  v-if="detailDraft.processingIds.length > 0"
                  class="text-secondary-800"
                >
                  {{ getProcessingNames(detailDraft.processingIds) }}
                </span>
                <span v-else class="italic text-secondary-400">選擇加工</span>
              </button>
            </template>
            <template #edit-isSupplyMaterial>
              <label class="inline-flex cursor-pointer items-center gap-2 text-base">
                <input v-model="detailDraft.isSupplyMaterial" type="checkbox" />
                代料
              </label>
            </template>
            <template #edit-quoteDeadline>
              <input
                v-model="detailDraft.quoteDeadline"
                type="date"
                class="form-control"
              />
            </template>
            <template #edit-notes>
              <textarea
                v-model="detailDraft.notes"
                class="form-control"
                rows="3"
              />
            </template>
          </DetailFieldsPanel>
        </div>
      </div>

      <!-- 快捷鍵提示 -->
    <ShortcutHint 
      :table-state="tableState" 
      @shortcut-click="handleShortcutClick"
    />

      <!-- 報價單工件列表 -->
      <CrmTableContainer
        title="工件列表"
        :loading="loading"
        :error="error"
      >
        <EditableDataTable
          ref="editableTableRef"
          :columns="editableColumns"
          :data="displayQuoteItems"
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
          <template #cell-sequence="{ value }">
            {{ value }}
          </template>

          <template #cell-customerFile="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-material="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-thickness="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-processing="{ row }">
            <button
              class="inline-flex cursor-pointer items-center gap-1 rounded border border-secondary-200 bg-secondary-50 px-2 py-1 text-left text-sm transition-all duration-200 hover:border-primary-300 hover:bg-secondary-100"
              @click.stop="openProcessingSelectModal(row)"
            >
              <span v-if="row.processingIds && row.processingIds.length > 0" class="text-secondary-800">
                {{ getProcessingNames(row.processingIds) }}
              </span>
              <span v-else class="italic text-secondary-400">選擇加工</span>
            </button>
          </template>

          <template #cell-notes="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-quantity="{ value }">
            {{ value }}
          </template>

          <template #cell-unitPrice="{ value }">
            {{ Number(value || 0).toLocaleString('zh-TW') }}
          </template>

          <template #cell-subtotal="{ row }">
            <span class="font-semibold text-primary-600">
              {{ Number((row.unitPrice || 0) * (row.quantity || 0)).toLocaleString('zh-TW') }}
            </span>
          </template>

          <template #cell-source="{ value }">
            {{ value || '-' }}
          </template>
          
          <template #actions="{ row, isEditing, save, cancel }">
            <!-- 編輯模式：顯示保存和取消按鈕（這些會直接顯示，不在下拉選單中） -->
            <template v-if="isEditing">
              <button 
                class="btn btn-sm btn-success" 
                @click="save"
              >
                保存
              </button>
              <button 
                class="btn btn-sm btn-outline" 
                @click="cancel"
              >
                取消
              </button>
            </template>
            <!-- 非編輯模式：顯示下拉選單項目（純文字） -->
            <template v-else>
              <span 
                class="dropdown-item" 
                @click="deleteItem(row.id)"
              >
                刪除
              </span>
            </template>
          </template>
        </EditableDataTable>
      </CrmTableContainer>
    </div>

    <!-- 列印組件 -->
    <QuotePrint
      v-if="quote"
      ref="quotePrintRef"
      :quote="quote"
      :items="orderedQuoteItems"
    />

    <!-- 加工選擇 Modal -->
    <ProcessingSelectModal
      :show="processingModalKind !== null"
      :model-value="processingModalModelValue"
      @close="closeProcessingModal"
      @confirm="handleProcessingConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  CrmTableContainer,
  EditableDataTable,
  ShortcutHint,
  DetailFieldsPanel,
  type EditableColumn,
  type DetailFieldItem,
} from '@/components';
import ProcessingSelectModal from '@/components/ProcessingSelectModal.vue';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import { quoteItemService, type QuoteItem } from '@/services/crm/quote.service';
import { processingService, type Processing } from '@/services/crm/processing.service';
import QuotePrint from './prints/QuotePrint.vue';

const route = useRoute();
const router = useRouter();

const quote = ref<Quote | null>(null);
const quoteItems = ref<QuoteItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

type DisplayQuoteItem = QuoteItem & {
  sequence: number;
};

// EditableDataTable ref
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

// Processing Modal 相關（單頭編輯 / 明細列）
type QuoteProcessingModalKind = 'item' | 'header' | null;
const processingModalKind = ref<QuoteProcessingModalKind>(null);
const selectedQuoteItem = ref<QuoteItem | null>(null);
const allProcessings = ref<Processing[]>([]);

const processingModalModelValue = computed(() => {
  if (processingModalKind.value === 'header') {
    return detailDraft.value.processingIds || [];
  }
  if (processingModalKind.value === 'item' && selectedQuoteItem.value) {
    return selectedQuoteItem.value.processingIds || [];
  }
  return [];
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '未知';
  return dateTimeFormatter.format(new Date(value));
};

const dateOnlyFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return dateOnlyFormatter.format(d);
};

// 表格狀態（用於 ShortcutHint）
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

// 報價單詳情區塊編輯
const detailsEditing = ref(false);
const detailDraft = ref({
  notes: '',
  isSigned: false,
  isSupplyMaterial: false,
  quoteDeadline: '',
  processingIds: [] as number[],
});

const startDetailsEdit = () => {
  if (!quote.value) return;
  detailDraft.value = {
    notes: quote.value.notes || '',
    isSigned: !!quote.value.isSigned,
    isSupplyMaterial: !!quote.value.isSupplyMaterial,
    quoteDeadline: quote.value.quoteDeadline
      ? String(quote.value.quoteDeadline).slice(0, 10)
      : '',
    processingIds: [...(quote.value.processingIds || [])],
  };
  detailsEditing.value = true;
};

const cancelDetailsEdit = () => {
  detailsEditing.value = false;
};

const saveDetailsEdit = async () => {
  if (!quote.value) return;
  try {
    await quoteService.update(quote.value.id, {
      notes: detailDraft.value.notes.trim() || undefined,
      isSigned: detailDraft.value.isSigned,
      isSupplyMaterial: detailDraft.value.isSupplyMaterial,
      quoteDeadline: detailDraft.value.quoteDeadline.trim() || undefined,
      processingIds: [...detailDraft.value.processingIds],
    });
    detailsEditing.value = false;
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存報價詳情失敗');
  }
};

// 新增行控制
const showNewRow = ref(false);

// 新增行模板
const newRowTemplate = () => {
  if (!quote.value) {
    return {
      customerFile: '',
      material: '',
      thickness: undefined as number | undefined,
      processingIds: [] as number[],
      notes: '',
      quantity: 0,
      unitPrice: 0,
      source: '',
    };
  }
  return {
    quoteId: quote.value.id,
    customerFile: '',
    material: '',
    thickness: undefined as number | undefined,
    processingIds: [...(quote.value.processingIds || [])] as number[],
    notes: '',
    quantity: 0,
    unitPrice: 0,
    source: '',
  };
};

// 可編輯表格列定義
const editableColumns = computed<EditableColumn[]>(() => [
  {
    key: 'sequence',
    label: '項次',
    editable: false
  },
  { 
    key: 'customerFile', 
    label: '客戶圖檔', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'material', 
    label: '材質', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'thickness', 
    label: '厚度', 
    editable: true, 
    type: 'number' 
  },
  { 
    key: 'processing', 
    label: '加工', 
    editable: false, // 使用 Modal 選擇
  },
  { 
    key: 'notes', 
    label: '備註', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'quantity', 
    label: '數量', 
    editable: true, 
    required: true, 
    type: 'number' 
  },
  { 
    key: 'unitPrice', 
    label: '單價', 
    editable: true, 
    required: true, 
    type: 'number' 
  },
  { 
    key: 'subtotal', 
    label: '小計', 
    editable: false 
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
    ]
  },
]);

const orderedQuoteItems = computed<QuoteItem[]>(() => {
  return [...quoteItems.value].sort((a, b) => {
    const aId = typeof a.id === 'number' ? a.id : Number.POSITIVE_INFINITY;
    const bId = typeof b.id === 'number' ? b.id : Number.POSITIVE_INFINITY;
    return aId - bId;
  });
});

const displayQuoteItems = computed<DisplayQuoteItem[]>(() =>
  orderedQuoteItems.value.map((item, index) => ({
    ...item,
    sequence: index + 1,
  })),
);

const detailItems = computed<DetailFieldItem[]>(() => {
  if (!quote.value) return [];

  const items: DetailFieldItem[] = [
    { key: 'id', label: '報價單編號', value: quote.value.id },
    { key: 'staff', label: '經手人', value: quote.value.staff?.name || '未知' },
    {
      key: 'customer',
      label: '客戶',
      value: quote.value.customer?.companyName || quote.value.customer?.companyShortName || '未指定',
    },
    {
      key: 'isSigned',
      label: '已簽名',
      value: quote.value.isSigned ? '是' : '否',
    },
    {
      key: 'processingIds',
      label: '後加工',
      value: getProcessingNames(quote.value.processingIds),
    },
    {
      key: 'isSupplyMaterial',
      label: '代料',
      value: quote.value.isSupplyMaterial ? '是' : '否',
    },
    {
      key: 'quoteDeadline',
      label: '報價期限',
      value: formatDateOnly(quote.value.quoteDeadline),
    },
    { key: 'totalAmount', label: '總計金額', value: Number(quote.value.totalAmount).toLocaleString('zh-TW') },
    { key: 'createdAt', label: '建立時間', value: formatDateTime(quote.value.createdAt) },
    { key: 'updatedAt', label: '更新時間', value: quote.value.updatedAt ? formatDateTime(quote.value.updatedAt) : '-' },
    {
      key: 'notes',
      label: '備註',
      value: quote.value.notes || '',
      fullWidth: true,
    },
  ];

  return items;
});

// 載入報價單資料
const loadQuote = async () => {
  const quoteId = route.params.id as string;
  if (!quoteId) {
    error.value = '無效的報價單編號';
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    // 載入報價單詳細資料
    quote.value = await quoteService.getById(quoteId);
    quoteItems.value = await quoteItemService.getAll(quoteId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入報價單資料失敗';
    console.error('Failed to load quote:', err);
  } finally {
    loading.value = false;
  }
};

// 處理欄位變更（僅更新本地狀態，不自動保存）
const handleFieldChange = (_row: QuoteItem, _field: string, _value: any, _isNew: boolean) => {
  // 只更新本地狀態，不觸發自動保存
  // 保存將在 Enter 或 blur 時觸發
};

// 處理手動保存
const handleSave = async (row: QuoteItem, isNew: boolean) => {
  if (!quote.value) {
    alert('報價單資料不存在');
    return;
  }

  const thickness = Number(row.thickness);
  const quantity = Number(row.quantity);
  if (!Number.isFinite(thickness) || thickness <= 0) {
    alert('厚度需大於 0');
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    alert('數量需大於 0');
    return;
  }

  try {
    const data: Partial<QuoteItem> = {
      quoteId: quote.value.id,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness,
      processingIds: row.processingIds || undefined,
      notes: row.notes || undefined,
      quantity,
      unitPrice: row.unitPrice || 0,
      source: row.source || undefined,
    };

    if (isNew) {
      await quoteItemService.create(data);
    } else {
      await quoteItemService.update(row.id, data);
    }

    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工件失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  if (!quote.value) {
    alert('報價單資料不存在');
    return;
  }

  const thickness = Number(row.thickness);
  const quantity = Number(row.quantity);
  if (!Number.isFinite(thickness) || thickness <= 0) {
    alert('厚度需大於 0');
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    alert('數量需大於 0');
    return;
  }

  try {
    const data: Partial<QuoteItem> = {
      quoteId: quote.value.id,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness,
      processingIds: row.processingIds || undefined,
      notes: row.notes || undefined,
      quantity,
      unitPrice: row.unitPrice || 0,
      source: row.source || undefined,
    };
    await quoteItemService.create(data);
    showNewRow.value = false;
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立工件失敗');
  }
};

// 刪除工件
const deleteItem = async (id: string) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await quoteItemService.delete(id);
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = async (row: QuoteItem) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await quoteItemService.delete(row.id);
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 處理 row-edit 事件（快捷鍵觸發，F2）
const handleRowEdit = (_row: QuoteItem, _index: number) => {
  // 編輯狀態會由 EditableDataTable 內部處理
  // 這裡可以加入額外的邏輯，例如記錄編輯歷史等
};

// 處理快捷鍵點擊
const handleShortcutClick = (action: string) => {
  if (!editableTableRef.value || !tableState.value) return;

  const state = tableState.value;
  const data = state.data();
  const currentRowIndex = state.focusedRowIndex;

  switch (action) {
    case 'arrow-up':
      if (currentRowIndex !== null && currentRowIndex > 0) {
        // 由表格內部處理
        break;
      }
      break;

    case 'arrow-down':
      if (currentRowIndex !== null && currentRowIndex < data.length - 1) {
        // 由表格內部處理
        break;
      }
      break;

    case 'row-edit':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        editableTableRef.value.startEdit(data[currentRowIndex], currentRowIndex);
        handleRowEdit(data[currentRowIndex], currentRowIndex);
      }
      break;

    case 'row-delete':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        handleRowDelete(data[currentRowIndex]);
      }
      break;

    case 'cancel-edit':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        editableTableRef.value.cancelEdit(data[currentRowIndex], currentRowIndex);
      }
      break;

    case 'new-row-show':
      showNewRow.value = true;
      break;

    case 'save-and-next':
    case 'next-field':
    case 'prev-field':
      // 這些操作由表格內部處理
      break;

    case 'cancel-new-row':
      editableTableRef.value.cancelNewRow();
      break;
  }
};

// 返回上一頁
const goBack = () => {
  router.push('/crm/quotes');
};

// 列印組件 ref
const quotePrintRef = ref<InstanceType<typeof QuotePrint> | null>(null);

// 處理列印
const handlePrint = (pageSize: 'A4' | 'A5' = 'A4') => {
  quotePrintRef.value?.print(pageSize);
};

// 載入所有加工項目（主檔）
const loadAllProcessings = async () => {
  try {
    const response = await processingService.getAllActive();
    allProcessings.value = response;
  } catch (err) {
    console.error('載入加工項目失敗:', err);
  }
};

const closeProcessingModal = () => {
  processingModalKind.value = null;
  selectedQuoteItem.value = null;
};

// 開啟加工選擇 Modal（明細列）
const openProcessingSelectModal = (item: QuoteItem) => {
  processingModalKind.value = 'item';
  selectedQuoteItem.value = item;
};

// 開啟加工選擇 Modal（報價單單頭）
const openQuoteHeaderProcessingModal = () => {
  processingModalKind.value = 'header';
  selectedQuoteItem.value = null;
};

// 確認加工選擇
const handleProcessingConfirm = async (value: { ids: number[]; processings: Processing[] }) => {
  if (processingModalKind.value === 'header') {
    detailDraft.value.processingIds = [...value.ids];
    closeProcessingModal();
    return;
  }

  if (processingModalKind.value === 'item' && selectedQuoteItem.value) {
    try {
      await quoteItemService.update(selectedQuoteItem.value.id, {
        processingIds: value.ids,
      });
      await loadQuote();
      closeProcessingModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新加工項目失敗');
    }
  }
};

// 取得加工名稱列表
const getProcessingNames = (processingIds?: number[]) => {
  if (!processingIds || processingIds.length === 0) return '-';
  return processingIds
    .map(id => allProcessings.value.find(p => p.id === id)?.name || `ID:${id}`)
    .join('、');
};

// 初始化
onMounted(() => {
  loadQuote();
  loadAllProcessings();
});
</script>

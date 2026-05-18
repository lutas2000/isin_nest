<template>
  <div class="mx-auto w-full">
    <div v-if="loading" class="p-8 text-center">載入中...</div>
    <div v-else-if="error" class="rounded-lg bg-danger-50 p-8 text-center text-danger-600">
      {{ error }}
    </div>

    <div v-else-if="workOrder" class="flex flex-col gap-8">
      <!-- 工作單詳細資訊 -->
      <div class="overflow-hidden rounded-lg bg-white shadow">
        <div class="p-4 md:p-3">
          <DetailFieldsPanel
            v-model:editing="detailsEditing"
            :items="detailItems"
          >
            <template #actions>
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                @click="handlePrint"
              >
                <span class="mr-2">🖨️</span>
                列印訂貨單
              </button>
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-secondary-300 bg-white px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50"
                @click="handlePrintWorkSheet"
              >
                <span class="mr-2">📄</span>
                列印工作單
              </button>
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-secondary-300 bg-white px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50"
                @click="goBack"
              >
                <span class="mr-2">←</span>
                返回
              </button>
              <template v-if="!detailsEditing">
                <button
                  type="button"
                  class="inline-flex items-center rounded-md border border-secondary-300 bg-white px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50"
                  @click="startDetailsEdit"
                >
                  編輯
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="inline-flex items-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  @click="saveDetailsEdit"
                >
                  儲存
                </button>
                <button
                  type="button"
                  class="inline-flex items-center rounded-md border border-secondary-300 bg-white px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50"
                  @click="cancelDetailsEdit"
                >
                  取消
                </button>
              </template>
            </template>
            <template #edit-shippingMethod>
              <EditableCell
                :column="shippingMethodDetailColumn"
                :value="detailDraft.shippingMethod"
                :row="detailDraft"
                :is-new="false"
                :is-editing="true"
                :search-function="shippingMethodDetailColumn.searchFunction"
                @update:value="detailDraft.shippingMethod = String($event ?? '')"
              />
            </template>
            <template #edit-paymentMethod>
              <EditableCell
                :column="paymentMethodDetailColumn"
                :value="detailDraft.paymentMethod"
                :row="detailDraft"
                :is-new="false"
                :is-editing="true"
                :search-function="paymentMethodDetailColumn.searchFunction"
                @update:value="detailDraft.paymentMethod = String($event ?? '')"
              />
            </template>
            <template #edit-deliveryDeadline>
              <input
                v-model="detailDraft.deliveryDeadline"
                type="date"
                class="w-full max-w-[12rem] rounded-md border border-secondary-300 px-3 py-2 text-base text-secondary-900 focus:border-primary-500 focus:outline-none"
              />
            </template>
            <template #edit-notes>
              <textarea
                v-model="detailDraft.notes"
                class="w-full rounded-md border border-secondary-300 px-3 py-2 text-base text-secondary-900 focus:border-primary-500 focus:outline-none"
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

      <!-- 訂單工件列表 -->
      <CrmTableContainer title="訂單工件列表">
        <EditableDataTable
          ref="editableTableRef"
          :columns="editableColumns"
          :data="displayWorkOrderItems"
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
          @focus-field="handleTableFocusField"
          @field-hotkey="handleTableFieldHotkey"
        >
          <template #cell-sequence="{ value }">
            {{ value }}
          </template>

          <template #cell-drawingNumber="{ value }">
            {{ value || '-' }}
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
              class="cursor-pointer rounded-md border border-primary-200 bg-primary-50 px-3 py-1 text-sm text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100"
              @click.stop="openProcessingSelectModal(row)"
            >
              <span v-if="row.processingIds && row.processingIds.length > 0">
                {{ getProcessingNames(row.processingIds) }}
              </span>
              <span v-else class="text-secondary-500">選擇加工</span>
            </button>
          </template>

          <template #cell-substitute="{ value }">
            {{ value || '無' }}
          </template>

          <template #cell-quantity="{ value }">
            {{ value }}
          </template>

          <template #cell-unit="{ value }">
            {{ value && String(value).trim() ? value : DEFAULT_ITEM_UNIT }}
          </template>

          <template #cell-source="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-notes="{ value }">
            {{ value || '-' }}
          </template>
          
          <template #actions="{ row, isEditing, save, cancel }">
            <!-- 編輯模式：顯示保存和取消按鈕 -->
            <template v-if="isEditing">
              <button 
                class="inline-flex items-center rounded-md bg-success-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-success-700"
                @click="save"
              >
                保存
              </button>
              <button 
                class="inline-flex items-center rounded-md border border-secondary-300 bg-white px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50"
                @click="cancel"
              >
                取消
              </button>
            </template>
            <!-- 非編輯模式：顯示下拉選單項目 -->
            <template v-else>
              <span 
                class="block cursor-pointer rounded px-2 py-1 text-sm text-danger-600 transition-colors hover:bg-danger-50"
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
    <OrderPrint
      v-if="workOrder"
      ref="workOrderPrintRef"
      :work-order="workOrder"
      :items="orderedWorkOrderItems"
    />
    <OrderWorkSheetPrint
      v-if="workOrder"
      ref="workOrderWorkSheetPrintRef"
      :work-order="workOrder"
      :items="orderedWorkOrderItems"
    />

    <!-- 加工選擇 Modal -->
    <ProcessingSelectModal
      :show="showProcessingSelectModal"
      :model-value="selectedWorkOrderItem?.processingIds || []"
      @close="closeProcessingSelectModal"
      @confirm="handleProcessingConfirm"
    />
    <CustomerModelSearchModal
      :show="showCustomerModelSearchModal"
      :customer-id="workOrder?.customerId"
      :initial-query="customerModelSearchInitialQuery"
      @close="closeCustomerModelSearchModal"
      @confirm="handleCustomerModelConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  CrmTableContainer,
  EditableDataTable,
  type EditableColumn,
  ShortcutHint,
  DetailFieldsPanel,
  type DetailFieldItem,
  CustomerModelSearchModal,
} from '@/components';
import EditableCell from '@/components/EditableCell.vue';
import ProcessingSelectModal from '@/components/ProcessingSelectModal.vue';
import { workOrderService, workOrderItemService, type WorkOrder, type WorkOrderItem } from '@/services/crm/work-order.service';
import { designWorkOrderService } from '@/services/crm/design-work-order.service';
import { processingService, type Processing } from '@/services/crm/processing.service';
import { vendorService, type Vendor } from '@/services/crm/vendor.service';
import { createCrmConfigSearchFunction } from '@/services/crm/crm-config-autocomplete.service';
import OrderPrint from './prints/OrderPrint.vue';
import OrderWorkSheetPrint from './prints/OrderWorkSheetPrint.vue';
import { DEFAULT_ITEM_UNIT, ITEM_UNIT_SUGGESTIONS } from '@/constants/crmItemUnit';

const route = useRoute();
const router = useRouter();

const workOrder = ref<WorkOrder | null>(null);
const workOrderItems = ref<WorkOrderItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

type DisplayWorkOrderItem = WorkOrderItem & {
  sequence: number;
};

type EditableTableInstance = InstanceType<typeof EditableDataTable> & {
  patchEditingField: (row: WorkOrderItem | null, index: number, field: string, value: unknown) => void;
  getResolvedEditingRow: (row: WorkOrderItem | null, index: number) => Partial<WorkOrderItem>;
};

// EditableDataTable ref
const editableTableRef = ref<EditableTableInstance | null>(null);

// Processing Modal 相關
const showProcessingSelectModal = ref(false);
const selectedWorkOrderItem = ref<WorkOrderItem | null>(null);
const allProcessings = ref<Processing[]>([]);
const vendors = ref<Vendor[]>([]);
const processingAutoOpenBlockedUntil = ref(0);

// 客戶型號搜尋 Modal 相關
const showCustomerModelSearchModal = ref(false);
const customerModelSearchInitialQuery = ref('');
const customerModelSearchContext = ref<{
  row: WorkOrderItem | null;
  rowIndex: number;
} | null>(null);

// 列印組件 ref
const workOrderPrintRef = ref<InstanceType<typeof OrderPrint> | null>(null);
const workOrderWorkSheetPrintRef =
  ref<InstanceType<typeof OrderWorkSheetPrint> | null>(null);

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

// 訂單詳情區塊編輯
const detailsEditing = ref(false);
const detailDraft = ref({
  shippingMethod: '',
  paymentMethod: '',
  deliveryDeadline: '',
  notes: '',
});

const searchShippingMethod = createCrmConfigSearchFunction('shipping_method');
const searchPaymentMethod = createCrmConfigSearchFunction('payment_method');
const searchSource = createCrmConfigSearchFunction('source');

const shippingMethodDetailColumn: EditableColumn = {
  key: 'shippingMethod',
  label: '運送方式',
  type: 'search-select',
  searchFunction: searchShippingMethod,
};

const paymentMethodDetailColumn: EditableColumn = {
  key: 'paymentMethod',
  label: '付款方式',
  type: 'search-select',
  searchFunction: searchPaymentMethod,
};

const startDetailsEdit = () => {
  if (!workOrder.value) return;
  const d = workOrder.value.deliveryDeadline;
  const dateStr =
    typeof d === 'string' && d.length >= 10 ? d.slice(0, 10) : d ? String(d).slice(0, 10) : '';
  detailDraft.value = {
    shippingMethod: workOrder.value.shippingMethod || '',
    paymentMethod: workOrder.value.paymentMethod || '',
    deliveryDeadline: dateStr,
    notes: workOrder.value.notes || '',
  };
  detailsEditing.value = true;
};

const cancelDetailsEdit = () => {
  detailsEditing.value = false;
};

const saveDetailsEdit = async () => {
  if (!workOrder.value) return;
  try {
    await workOrderService.update(workOrder.value.id, {
      shippingMethod: detailDraft.value.shippingMethod,
      paymentMethod: detailDraft.value.paymentMethod,
      deliveryDeadline: detailDraft.value.deliveryDeadline.trim() || undefined,
      notes: detailDraft.value.notes.trim() || undefined,
    });
    detailsEditing.value = false;
    await loadWorkOrder();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存訂單詳情失敗');
  }
};

// 新增行控制
const showNewRow = ref(false);

// 新增行模板
const newRowTemplate = () => {
  if (!workOrder.value) {
    return {
      drawingNumber: '',
      customerFile: '',
      material: '',
      thickness: undefined as number | undefined,
      processingIds: [] as number[],
      quantity: 0,
      unit: DEFAULT_ITEM_UNIT,
      substitute: '',
      unitPrice: 0,
      status: '待處理',
      notes: '',
    };
  }
  return {
    workOrderId: workOrder.value.id,
    drawingNumber: '',
    customerFile: '',
    material: '',
    thickness: undefined as number | undefined,
    processingIds: [] as number[],
    quantity: 0,
    unit: DEFAULT_ITEM_UNIT,
    substitute: '',
    unitPrice: 0,
    source: '訂單新增',
    status: '待處理',
    notes: '',
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
    key: 'drawingNumber', 
    label: '電腦圖號', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'customerFile', 
    label: '客戶檔案', 
    editable: true, 
    type: 'text',
    hotkeys: { f10: true },
  },
  { 
    key: 'material', 
    label: '材料', 
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
    keyboardFocusable: true,
  },
  { 
    key: 'quantity',
    label: '數量',
    editable: true,
    required: true,
    type: 'number'
  },
  {
    key: 'unit',
    label: '單位',
    editable: true,
    type: 'text',
    datalistOptions: [...ITEM_UNIT_SUGGESTIONS],
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
    ]
  },
  { 
    key: 'source', 
    label: '來源', 
    editable: true, 
    type: 'search-select',
    searchFunction: searchSource,
  },
  { 
    key: 'notes', 
    label: '備註', 
    editable: true, 
    type: 'text' 
  },
]);

const orderedWorkOrderItems = computed<WorkOrderItem[]>(() => {
  return [...workOrderItems.value].sort((a, b) => {
    const aId = typeof a.id === 'number' ? a.id : Number.POSITIVE_INFINITY;
    const bId = typeof b.id === 'number' ? b.id : Number.POSITIVE_INFINITY;
    return aId - bId;
  });
});

const displayWorkOrderItems = computed<DisplayWorkOrderItem[]>(() =>
  orderedWorkOrderItems.value.map((item, index) => ({
    ...item,
    sequence: index + 1,
  })),
);

const detailItems = computed<DetailFieldItem[]>(() => {
  if (!workOrder.value) return [];

  const items: DetailFieldItem[] = [
    { key: 'id', label: '訂單編號', value: workOrder.value.id },
    { key: 'staff', label: '業務員', value: workOrder.value.staff?.name || '未知' },
    {
      key: 'customer',
      label: '客戶',
      value: workOrder.value.customer?.companyName || workOrder.value.customer?.companyShortName || '未指定',
    },
    { key: 'shippingMethod', label: '運送方式', value: workOrder.value.shippingMethod || '-' },
    { key: 'paymentMethod', label: '付款方式', value: workOrder.value.paymentMethod || '-' },
    {
      key: 'deliveryDeadline',
      label: '交貨期限',
      value:
        typeof workOrder.value.deliveryDeadline === 'string' &&
        workOrder.value.deliveryDeadline.length >= 10
          ? workOrder.value.deliveryDeadline.slice(0, 10)
          : workOrder.value.deliveryDeadline || '-',
    },
    { key: 'createdAt', label: '建立時間', value: formatDateTime(workOrder.value.createdAt) },
    { key: 'endedAt', label: '完成時間', value: workOrder.value.endedAt ? formatDateTime(workOrder.value.endedAt) : '-' },
    { key: 'updatedAt', label: '更新時間', value: workOrder.value.updatedAt ? formatDateTime(workOrder.value.updatedAt) : '-' },
    {
      key: 'notes',
      label: '備註',
      value: workOrder.value.notes || '-',
      fullWidth: true,
    },
  ];

  return items;
});

// 載入訂單資料
const loadWorkOrder = async () => {
  const workOrderId = route.params.id as string;
  if (!workOrderId) {
    error.value = '無效的訂單編號';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    workOrder.value = await workOrderService.getById(workOrderId);

    // 優先使用後端關聯資料；若沒帶則另外查工件列表
    if (Array.isArray((workOrder.value as any).workOrderItems)) {
      workOrderItems.value = (workOrder.value as any).workOrderItems;
    } else if (Array.isArray(workOrder.value.orderItems)) {
      workOrderItems.value = workOrder.value.orderItems as any;
    } else {
      const response = await workOrderItemService.getAll(workOrderId);
      if (response && typeof response === 'object' && 'data' in response) {
        workOrderItems.value = response.data;
      } else {
        workOrderItems.value = response as WorkOrderItem[];
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入訂單資料失敗';
    console.error('Failed to load order:', err);
  } finally {
    loading.value = false;
  }
};

// 處理欄位變更（僅更新本地狀態，不自動保存）
const handleFieldChange = (_row: WorkOrderItem, _field: string, _value: any, _isNew: boolean) => {
  // 只更新本地狀態，不觸發自動保存
  // 保存將在 Enter 或 blur 時觸發
};

// 處理手動保存
const handleSave = async (row: WorkOrderItem, isNew: boolean) => {
  if (!workOrder.value) {
    alert('訂單資料不存在');
    return;
  }

  try {
    const data: Partial<WorkOrderItem> = {
      orderId: workOrder.value.id,
      drawingNumber: row.drawingNumber || undefined,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness || undefined,
      processingIds: row.processingIds || undefined,
      quantity: row.quantity || 0,
      unit: (row.unit && String(row.unit).trim()) || DEFAULT_ITEM_UNIT,
      substitute: row.substitute || undefined,
      unitPrice: row.unitPrice || 0,
      source: row.source || '訂單新增',
      status: row.status || '待處理',
      notes: row.notes || undefined,
    };

    const previousItem = workOrderItems.value.find(item => item.id === row.id);

    const savedItem = isNew
      ? await workOrderItemService.create(data)
      : await workOrderItemService.update(row.id, data);

    const newSource = data.source || savedItem.source;
    const oldSource = previousItem?.source;

    if (newSource === '新圖' && (isNew || oldSource !== '新圖')) {
      try {
        await designWorkOrderService.create({
          orderId: workOrder.value.id,
          orderItemId: savedItem.id,
          drawingNumber: savedItem.drawingNumber,
          customerFile: savedItem.customerFile,
          notes: savedItem.notes,
        });
      } catch (err) {
        console.error('建立設計工作單失敗', err);
        alert(err instanceof Error ? err.message : '建立設計工作單失敗');
      }
    }

    await loadWorkOrder();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工件失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  if (!workOrder.value) {
    alert('訂單資料不存在');
    return;
  }

  try {
    const data: Partial<WorkOrderItem> = {
      orderId: workOrder.value.id,
      drawingNumber: row.drawingNumber || undefined,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness || undefined,
      processingIds: row.processingIds || undefined,
      quantity: row.quantity || 0,
      unit: (row.unit && String(row.unit).trim()) || DEFAULT_ITEM_UNIT,
      substitute: (row as any).substitute || undefined,
      unitPrice: row.unitPrice || 0,
      source: row.source || '訂單新增',
      status: row.status || '待處理',
      notes: row.notes || undefined,
    };

    const savedItem = await workOrderItemService.create(data);

    const newSource = data.source || savedItem.source;
    if (newSource === '新圖') {
      try {
        await designWorkOrderService.create({
          orderId: workOrder.value.id,
          orderItemId: savedItem.id,
          drawingNumber: savedItem.drawingNumber,
          customerFile: savedItem.customerFile,
          notes: savedItem.notes,
        });
      } catch (err) {
        console.error('建立設計工作單失敗', err);
        alert(err instanceof Error ? err.message : '建立設計工作單失敗');
      }
    }

    showNewRow.value = false;
    await loadWorkOrder();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立工件失敗');
  }
};

// 刪除工件
const deleteItem = async (id: number) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await workOrderItemService.delete(id);
    await loadWorkOrder();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = async (row: WorkOrderItem) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await workOrderItemService.delete(row.id);
    await loadWorkOrder();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 處理 row-edit 事件（快捷鍵觸發，F2）
const handleRowEdit = (_row: WorkOrderItem, _index: number) => {
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

    case 'customer-model-search': {
      if (state.focusedFieldKey !== 'customerFile' || !workOrder.value?.customerId) {
        break;
      }
      const row = state.isNewRowFocused ? null : currentRowIndex !== null ? data[currentRowIndex] : null;
      const rowIndex = state.isNewRowFocused ? -1 : currentRowIndex ?? -1;
      const resolvedRow = editableTableRef.value.getResolvedEditingRow(row, rowIndex);
      customerModelSearchContext.value = { row, rowIndex };
      customerModelSearchInitialQuery.value = String(resolvedRow.customerFile ?? '');
      showCustomerModelSearchModal.value = true;
      break;
    }

    case 'cancel-new-row':
      editableTableRef.value.cancelNewRow();
      break;
  }
};

// 返回上一頁
const goBack = () => {
  router.push('/crm/orders');
};

// 處理列印
const handlePrint = () => {
  workOrderPrintRef.value?.print();
};

// 處理工作單列印
const handlePrintWorkSheet = () => {
  void workOrderWorkSheetPrintRef.value?.print();
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

// 載入廠商列表
const loadVendors = async () => {
  try {
    vendors.value = await vendorService.getAllWithoutPagination();
  } catch (err) {
    console.error('載入廠商列表失敗:', err);
  }
};

// 開啟加工選擇 Modal
const openProcessingSelectModal = (item: WorkOrderItem) => {
  if (showProcessingSelectModal.value) return;
  selectedWorkOrderItem.value = item;
  showProcessingSelectModal.value = true;
};

const closeProcessingSelectModal = () => {
  processingAutoOpenBlockedUntil.value = Date.now() + 200;
  showProcessingSelectModal.value = false;
  selectedWorkOrderItem.value = null;
};

const handleTableFocusField = (payload: {
  row: WorkOrderItem;
  rowIndex: number;
  fieldKey: string;
  isNewRow: boolean;
  byKeyboard: boolean;
}) => {
  if (!payload.byKeyboard || payload.fieldKey !== 'processing') {
    return;
  }
  if (Date.now() < processingAutoOpenBlockedUntil.value || showProcessingSelectModal.value) {
    return;
  }
  openProcessingSelectModal(payload.row);
};

const handleTableFieldHotkey = (payload: {
  key: 'F10';
  row: WorkOrderItem;
  rowIndex: number;
  fieldKey: string;
  isNewRow: boolean;
  resolvedRow: Partial<WorkOrderItem>;
}) => {
  if (payload.key !== 'F10' || payload.fieldKey !== 'customerFile') {
    return;
  }
  if (!workOrder.value?.customerId) {
    return;
  }

  customerModelSearchContext.value = {
    row: payload.isNewRow ? null : payload.row,
    rowIndex: payload.rowIndex,
  };
  customerModelSearchInitialQuery.value = String(payload.resolvedRow.customerFile ?? '');
  showCustomerModelSearchModal.value = true;
};

const closeCustomerModelSearchModal = () => {
  showCustomerModelSearchModal.value = false;
  customerModelSearchContext.value = null;
};

const handleCustomerModelConfirm = (value: { customerFile: string; item: WorkOrderItem | null }) => {
  const context = customerModelSearchContext.value;
  if (!context) return;

  editableTableRef.value?.patchEditingField(
    context.row,
    context.rowIndex,
    'customerFile',
    value.customerFile,
  );
  closeCustomerModelSearchModal();
};

// 確認加工選擇
const handleProcessingConfirm = async (value: { ids: number[]; processings: Processing[] }) => {
  if (!selectedWorkOrderItem.value) return;
  if (!selectedWorkOrderItem.value.id) {
    selectedWorkOrderItem.value.processingIds = [...value.ids];
    closeProcessingSelectModal();
    selectedWorkOrderItem.value = null;
    return;
  }

  try {
    await workOrderItemService.update(selectedWorkOrderItem.value.id, {
      processingIds: value.ids,
    });
    await loadWorkOrder();
    closeProcessingSelectModal();
    selectedWorkOrderItem.value = null;
  } catch (err) {
    alert(err instanceof Error ? err.message : '更新加工項目失敗');
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
  loadWorkOrder();
  loadAllProcessings();
  loadVendors();
});
</script>


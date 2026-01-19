<template>
  <div class="work-order-items-page">
    <PageHeader
      title="工作單詳情"
      :description="workOrder ? `` : '載入中...'"
    >
      <template #actions>
        <button class="btn btn-outline" @click="goBack">
          <span class="btn-icon">←</span>
          返回
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-message">載入中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div v-else-if="workOrder" class="work-order-items-content">
      <!-- 工作單詳細資訊 -->
      <div class="work-order-details-card">
        <TableHeader title="工作單資訊" />
        <div class="details-content">
          <div class="details-section">
            <h4>基本資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">工單編號：</span>
                <span class="details-value">{{ workOrder.id }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">業務員：</span>
                <span class="details-value">{{ workOrder.staff?.name || '未知' }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">客戶：</span>
                <span class="details-value">
                  {{ workOrder.customer?.companyName || workOrder.customer?.companyShortName || '未指定' }}
                </span>
              </div>
              <div class="details-item">
                <span class="details-label">狀態：</span>
                <span class="details-value">
                  <StatusBadge
                    :text="workOrder.isCompleted ? '已完成' : '進行中'"
                    :variant="workOrder.isCompleted ? 'success' : 'info'"
                  />
                </span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4>訂單資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">運送方式：</span>
                <span class="details-value">{{ workOrder.shippingMethod }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">付款方式：</span>
                <span class="details-value">{{ workOrder.paymentMethod }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">金額：</span>
                <span class="details-value highlight">NT$ {{ Number(workOrder.amount).toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="workOrder.notes">
            <h4>備註</h4>
            <p>{{ workOrder.notes }}</p>
          </div>

          <div class="details-section">
            <h4>時間資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">建立時間：</span>
                <span class="details-value">
                  {{ workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString('zh-TW') : '未知' }}
                </span>
              </div>
              <div class="details-item" v-if="workOrder.endedAt">
                <span class="details-label">完成時間：</span>
                <span class="details-value">
                  {{ new Date(workOrder.endedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
              <div class="details-item" v-if="workOrder.updatedAt">
                <span class="details-label">更新時間：</span>
                <span class="details-value">
                  {{ new Date(workOrder.updatedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷鍵提示 -->
      <ShortcutHint 
        :table-state="tableState" 
        @shortcut-click="handleShortcutClick"
      />

      <!-- 工單工件列表 -->
      <div class="work-order-items-card">
        <TableHeader title="工單工件列表">
          <template #actions>
            <button class="btn btn-primary" @click="showNewRow = true">
              <span class="btn-icon">➕</span>
              新增工件
            </button>
          </template>
        </TableHeader>
        <EditableDataTable
          ref="editableTableRef"
          :columns="editableColumns"
          :data="workOrderItems"
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
          <template #cell-id="{ value }">
            {{ value || '待生成' }}
          </template>

          <template #cell-cadFile="{ value }">
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

          <template #cell-processing="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-unit="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-quantity="{ value }">
            {{ value }}
          </template>

          <template #cell-unitPrice="{ value }">
            NT$ {{ Number(value || 0).toLocaleString('zh-TW') }}
          </template>

          <template #cell-subtotal="{ row }">
            <span class="highlight">
              NT$ {{ Number((row.unitPrice || 0) * (row.quantity || 0)).toLocaleString('zh-TW') }}
            </span>
          </template>

          <template #cell-status="{ value }">
            <StatusBadge :text="value || '-'" variant="secondary" size="sm" />
          </template>
          
          <template #actions="{ row, isEditing, save, cancel }">
            <!-- 編輯模式：顯示保存和取消按鈕 -->
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
            <!-- 非編輯模式：顯示下拉選單項目 -->
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PageHeader, StatusBadge, TableHeader, EditableDataTable, type EditableColumn, ShortcutHint } from '@/components';
import { workOrderService, workOrderItemService, type WorkOrder, type WorkOrderItem } from '@/services/crm/work-order.service';

const route = useRoute();
const router = useRouter();

const workOrder = ref<WorkOrder | null>(null);
const workOrderItems = ref<WorkOrderItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// EditableDataTable ref
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

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

// 新增行控制
const showNewRow = ref(false);

// 新增行模板
const newRowTemplate = () => {
  if (!workOrder.value) {
    return {
      cadFile: '',
      customerFile: '',
      material: '',
      thickness: '',
      processing: '',
      quantity: 0,
      unit: '',
      unitPrice: 0,
      status: '待處理',
    };
  }
  return {
    workOrderId: workOrder.value.id,
    cadFile: '',
    customerFile: '',
    material: '',
    thickness: '',
    processing: '',
    quantity: 0,
    unit: '',
    unitPrice: 0,
    source: '工單新增',
    status: '待處理',
  };
};

// 可編輯表格列定義
const editableColumns = computed<EditableColumn[]>(() => [
  { 
    key: 'id', 
    label: '工件編號', 
    editable: false 
  },
  { 
    key: 'cadFile', 
    label: 'CAD 檔案', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'customerFile', 
    label: '客戶檔案', 
    editable: true, 
    type: 'text' 
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
    type: 'text' 
  },
  { 
    key: 'processing', 
    label: '加工', 
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
    key: 'unit', 
    label: '單位', 
    editable: true, 
    type: 'text' 
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
    key: 'status', 
    label: '狀態', 
    editable: true, 
    type: 'select',
    options: [
      { value: '待處理', label: '待處理' },
      { value: '處理中', label: '處理中' },
      { value: '已完成', label: '已完成' },
    ]
  },
]);

// 載入工作單資料
const loadWorkOrder = async () => {
  const workOrderId = route.params.id as string;
  if (!workOrderId) {
    error.value = '無效的工作單編號';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    workOrder.value = await workOrderService.getById(workOrderId);

    // 優先使用後端關聯資料；若沒帶則另外查工件列表
    if (Array.isArray(workOrder.value.workOrderItems)) {
      workOrderItems.value = workOrder.value.workOrderItems;
    } else {
      const response = await workOrderItemService.getAll(workOrderId);
      if (response && typeof response === 'object' && 'data' in response) {
        workOrderItems.value = response.data;
      } else {
        workOrderItems.value = response as WorkOrderItem[];
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入工作單資料失敗';
    console.error('Failed to load work order:', err);
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
    alert('工作單資料不存在');
    return;
  }

  try {
    const data: Partial<WorkOrderItem> = {
      workOrderId: workOrder.value.id,
      cadFile: row.cadFile || undefined,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness || undefined,
      processing: row.processing || undefined,
      quantity: row.quantity || 0,
      unit: row.unit || undefined,
      unitPrice: row.unitPrice || 0,
      source: row.source || '工單新增',
      status: row.status || '待處理',
    };

    if (isNew) {
      await workOrderItemService.create(data);
    } else {
      await workOrderItemService.update(row.id, data);
    }

    await loadWorkOrder();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工件失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  if (!workOrder.value) {
    alert('工作單資料不存在');
    return;
  }

  try {
    const data: Partial<WorkOrderItem> = {
      workOrderId: workOrder.value.id,
      cadFile: row.cadFile || undefined,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness || undefined,
      processing: row.processing || undefined,
      quantity: row.quantity || 0,
      unit: row.unit || undefined,
      unitPrice: row.unitPrice || 0,
      source: row.source || '工單新增',
      status: row.status || '待處理',
    };
    await workOrderItemService.create(data);
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

    case 'cancel-new-row':
      editableTableRef.value.cancelNewRow();
      break;
  }
};

// 返回上一頁
const goBack = () => {
  router.push('/crm/orders');
};

// 初始化
onMounted(() => {
  loadWorkOrder();
});
</script>

<style scoped>
.work-order-items-page {
  max-width: 1400px;
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
  border-radius: var(--border-radius-lg);
}

.work-order-items-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.work-order-details-card,
.work-order-items-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.details-content {
  padding: 2rem;
}

.details-section {
  margin-bottom: 2rem;
}

.details-section:last-child {
  margin-bottom: 0;
}

.details-section h4 {
  margin-bottom: 1rem;
  color: var(--secondary-900);
  font-size: var(--font-size-lg);
  border-bottom: 2px solid var(--secondary-200);
  padding-bottom: 0.5rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.details-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.details-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
}

.details-value {
  font-size: var(--font-size-base);
  color: var(--secondary-900);
}

.details-value.highlight {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary-600);
}

.details-section p {
  color: var(--secondary-700);
  line-height: 1.6;
  margin: 0;
}

/* 工單工件列表 */
.empty-message {
  padding: 3rem;
  text-align: center;
  color: var(--secondary-500);
  font-size: var(--font-size-base);
}

.highlight {
  font-weight: 600;
  color: var(--primary-600);
}

.btn-icon {
  margin-right: 0.5rem;
}

/* Modal 表單樣式 */
.modal-form {
  max-height: 60vh;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

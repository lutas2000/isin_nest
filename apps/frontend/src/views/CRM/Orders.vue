<template>
  <div class="orders-page">
    <PageHeader 
      title="工作單管理"
      description="管理工作單、追蹤工單狀態和處理工作流程"
    >
    </PageHeader>

    <!-- 快捷鍵提示 -->
    <ShortcutHint 
      :table-state="tableState" 
      @shortcut-click="handleShortcutClick"
    />

    <!-- 工單列表 -->
    <div class="orders-content">
      <SearchFilters
        title=""
        :show-search="true"
        search-placeholder="搜尋工單編號或客戶..."
        :filters="[
          {
            key: 'status',
            placeholder: '全部狀態',
            options: [
              { value: 'active', label: '進行中' },
              { value: 'completed', label: '已完成' }
            ]
          }
        ]"
        :show-date-filter="false"
        v-model:search="orderSearch"
        @update:filter="handleFilterUpdate"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable
        v-else
        ref="editableTableRef"
        :columns="editableColumns"
        :data="filteredOrders"
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

        <template #cell-customerId="{ row, value }">
          <span v-if="!row.customerId">未指定</span>
          <span 
            v-else 
            :title="row.customer?.companyName || row.customer?.companyShortName || value"
          >
            {{ value }}
          </span>
        </template>

        <template #cell-staffId="{ row, value }">
          <span v-if="!row.staffId">未知</span>
          <span v-else>{{ row.staff?.name || value }}</span>
        </template>

        <template #cell-isCompleted="{ value }">
          <StatusBadge 
            :text="value ? '已完成' : '進行中'" 
            :variant="value ? 'success' : 'info'"
          />
        </template>
        
        <template #cell-amount="{ value }">
          NT$ {{ Number(value || 0).toLocaleString('zh-TW') }}
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
              v-if="!row.isCompleted"
              class="dropdown-item" 
              @click="completeOrder(row.id)"
            >
              完成
            </span>
            <span 
              class="dropdown-item" 
              @click="deleteOrder(row.id)"
            >
              刪除
            </span>
          </template>
        </template>
      </EditableDataTable>
    </div>

    <!-- 查看詳情 Modal -->
    <Modal 
      v-if="selectedOrder"
      :show="showDetailsModal" 
      :title="`工單詳情 #${selectedOrder.id}`"
      @close="showDetailsModal = false"
    >
      <div class="details-content">
        <div class="details-section">
          <h4>基本資訊</h4>
          <div class="details-grid">
            <div class="details-item">
              <span class="details-label">工單編號：</span>
              <span class="details-value">{{ selectedOrder.id }}</span>
            </div>
            <div class="details-item">
              <span class="details-label">業務員：</span>
              <span class="details-value">{{ selectedOrder.staff?.name || '未知' }}</span>
            </div>
            <div class="details-item">
              <span class="details-label">客戶：</span>
              <span class="details-value">
                {{ selectedOrder.customer?.companyShortName || selectedOrder.customer?.companyName || '未指定' }}
              </span>
            </div>
            <div class="details-item">
              <span class="details-label">狀態：</span>
              <span class="details-value">
                <StatusBadge 
                  :text="selectedOrder.isCompleted ? '已完成' : '進行中'" 
                  :variant="selectedOrder.isCompleted ? 'success' : 'info'"
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
              <span class="details-value">{{ selectedOrder.shippingMethod }}</span>
            </div>
            <div class="details-item">
              <span class="details-label">付款方式：</span>
              <span class="details-value">{{ selectedOrder.paymentMethod }}</span>
            </div>
            <div class="details-item">
              <span class="details-label">金額：</span>
              <span class="details-value">NT$ {{ Number(selectedOrder.amount).toLocaleString('zh-TW') }}</span>
            </div>
          </div>
        </div>

        <div class="details-section" v-if="selectedOrder.notes">
          <h4>備註</h4>
          <p>{{ selectedOrder.notes }}</p>
        </div>

        <div class="details-section">
          <h4>時間資訊</h4>
          <div class="details-grid">
            <div class="details-item">
              <span class="details-label">建立時間：</span>
              <span class="details-value">
                {{ selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('zh-TW') : '未知' }}
              </span>
            </div>
            <div class="details-item" v-if="selectedOrder.updatedAt">
              <span class="details-label">更新時間：</span>
              <span class="details-value">
                {{ new Date(selectedOrder.updatedAt).toLocaleString('zh-TW') }}
              </span>
            </div>
            <div class="details-item" v-if="selectedOrder.endedAt">
              <span class="details-label">完成時間：</span>
              <span class="details-value">
                {{ new Date(selectedOrder.endedAt).toLocaleString('zh-TW') }}
              </span>
            </div>
          </div>
        </div>

        <div class="details-section" v-if="selectedOrder.workOrderItems && selectedOrder.workOrderItems.length > 0">
          <h4>工單工件</h4>
          <div class="work-order-items-list">
            <div 
              class="work-order-item-card" 
              v-for="item in selectedOrder.workOrderItems" 
              :key="item.id"
            >
              <div class="work-order-item-header">
                <span class="work-order-item-title">工件 #{{ item.id }}</span>
                <span class="work-order-item-amount">NT$ {{ Number(item.unitPrice * item.quantity).toLocaleString('zh-TW') }}</span>
              </div>
              <div class="work-order-item-details">
                <div v-if="item.customerFile">客戶圖檔：{{ item.customerFile }}</div>
                <div v-if="item.material">材質：{{ item.material }}</div>
                <div v-if="item.thickness">厚度：{{ item.thickness }}</div>
                <div v-if="item.processing">加工方式：{{ item.processing }}</div>
                <div>數量：{{ item.quantity }}</div>
                <div>單價：NT$ {{ Number(item.unitPrice).toLocaleString('zh-TW') }}</div>
                <div>狀態：{{ item.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PageHeader, EditableDataTable, type EditableColumn, SearchFilters, StatusBadge, Modal, ShortcutHint } from '@/components';
import { workOrderService, type WorkOrder } from '@/services/crm/work-order.service';
import { customerService, type Customer } from '@/services/crm/customer.service';
import { apiGet } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

// 工單資料
const orders = ref<WorkOrder[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 分頁狀態
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);
const orderSearch = ref('');
const orderStatusFilter = ref('');

// 客戶和員工資料（用於下拉選單）
const customers = ref<Customer[]>([]);

// 員工類型定義
interface Staff {
  id: string;
  name: string;
  department?: string;
  [key: string]: any;
}

const staffList = ref<Staff[]>([]);

// 認證 store
const authStore = useAuthStore();

// 路由
const router = useRouter();

// Modal 控制
const showDetailsModal = ref(false);
const selectedOrder = ref<WorkOrder | null>(null);
const showNewRow = ref(false);

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

// 新增行模板
const newRowTemplate = () => ({
  id: '',
  staffId: authStore.staffId || '',
  customerId: '',
  shippingMethod: '',
  paymentMethod: '',
  notes: '',
  amount: 0,
  isCompleted: false,
});

// 可編輯表格列定義
const editableColumns = computed<EditableColumn[]>(() => [
  { 
    key: 'id', 
    label: '工單編號', 
    editable: true,
    required: true,
    type: 'text'
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
        const customerList = Array.isArray(response) ? response : (response as any).data || [];
        return customerList.map((c: Customer) => {
          const shortName = c.companyShortName || '';
          const label = shortName ? `${c.id}(${shortName})` : c.id;
          return {
            value: c.id,
            label: label
          };
        });
      } catch (err) {
        console.error('Failed to search customers:', err);
        return [];
      }
    }
  },
  { 
    key: 'staffId', 
    label: '業務員', 
    editable: true, 
    required: true, 
    type: 'search-select',
    searchFunction: async (searchTerm: string) => {
      try {
        const params: Record<string, any> = { department: '銷管部' };
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        const staffResult = await apiGet<Staff[]>('/staffs/all', params);
        return staffResult.map(s => ({ value: s.id, label: s.name }));
      } catch (err) {
        console.error('Failed to search staff:', err);
        return [];
      }
    }
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
      { value: '貨運', label: '貨運' }
    ]
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
      { value: '月結', label: '月結' }
    ]
  },
  { 
    key: 'amount', 
    label: '金額', 
    editable: true, 
    type: 'number' 
  },
  { 
    key: 'isCompleted', 
    label: '狀態', 
    editable: true, 
    type: 'select',
    options: [
      { value: false, label: '進行中' },
      { value: true, label: '已完成' }
    ]
  },
  { 
    key: 'notes', 
    label: '備註', 
    editable: true, 
    type: 'text',
    truncate: true
  },
  { 
    key: 'createdAt', 
    label: '建立日期', 
    editable: false 
  },
]);

// 篩選後的工單
const filteredOrders = computed(() => {
  let filtered = orders.value;

  // 文字搜尋
  if (orderSearch.value) {
    const search = orderSearch.value.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.id.toLowerCase().includes(search) ||
        order.customer?.companyName?.toLowerCase().includes(search) ||
        order.customer?.companyShortName?.toLowerCase().includes(search),
    );
  }

  // 狀態篩選
  if (orderStatusFilter.value === 'completed') {
    filtered = filtered.filter((order) => order.isCompleted);
  } else if (orderStatusFilter.value === 'active') {
    filtered = filtered.filter((order) => !order.isCompleted);
  }

  return filtered;
});

// 處理篩選器更新
const handleFilterUpdate = (key: string, value: string) => {
  if (key === 'status') {
    orderStatusFilter.value = value;
  }
};

// 載入工單資料
const loadOrders = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await workOrderService.getAll(currentPage.value, pageSize.value);
    if (response && typeof response === 'object' && 'data' in response) {
      orders.value = response.data;
      total.value = response.total;
    } else {
      orders.value = response as WorkOrder[];
      total.value = orders.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入工單失敗';
    console.error('Failed to load work orders:', err);
  } finally {
    loading.value = false;
  }
};

// 處理分頁變化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadOrders();
};

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadOrders();
};

// 載入客戶資料
const loadCustomers = async () => {
  try {
    const response = await customerService.getAll();
    if (response && typeof response === 'object' && 'data' in response) {
      customers.value = response.data;
    } else {
      customers.value = response as Customer[];
    }
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
};

// 載入員工資料
const loadStaff = async () => {
  try {
    const salesStaff = await apiGet<Staff[]>('/staffs/all?department=銷管部');
    staffList.value = salesStaff;
  } catch (err) {
    console.error('Failed to load staff:', err);
    staffList.value = [];
  }
};

// 查看詳情（導航到 WorkOrderItems 頁面）
const viewDetails = (order: WorkOrder) => {
  router.push(`/crm/orders/${order.id}/items`);
};

// 處理欄位變更（僅更新本地狀態，不自動保存）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleFieldChange = (_row: WorkOrder, _field: string, _value: any, _isNew: boolean) => {
  // 只更新本地狀態，不觸發自動保存
};

// 處理手動保存
const handleSave = async (row: WorkOrder, isNew: boolean) => {
  try {
    if (isNew) {
      const data: Partial<WorkOrder> = {
        id: row.id,
        staffId: row.staffId,
        customerId: row.customerId,
        shippingMethod: row.shippingMethod,
        paymentMethod: row.paymentMethod,
        notes: row.notes || undefined,
        amount: row.amount || 0,
      };
      await workOrderService.create(data);
      await loadOrders();
    } else {
      const data: Partial<WorkOrder> = {
        staffId: row.staffId,
        customerId: row.customerId,
        shippingMethod: row.shippingMethod,
        paymentMethod: row.paymentMethod,
        notes: row.notes || undefined,
        amount: row.amount || 0,
        isCompleted: row.isCompleted,
      };
      await workOrderService.update(row.id, data);
      await loadOrders();
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工單失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  try {
    const data: Partial<WorkOrder> = {
      id: row.id,
      staffId: row.staffId,
      customerId: row.customerId,
      shippingMethod: row.shippingMethod,
      paymentMethod: row.paymentMethod,
      notes: row.notes || undefined,
      amount: row.amount || 0,
    };
    await workOrderService.create(data);
    showNewRow.value = false;
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立工單失敗');
  }
};

// 完成工單
const completeOrder = async (id: string) => {
  if (!confirm('確定要完成此工單嗎？')) return;
  
  try {
    await workOrderService.complete(id);
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '完成工單失敗');
  }
};

// 刪除工單
const deleteOrder = async (id: string) => {
  if (!confirm('確定要刪除此工單嗎？此操作無法復原。')) return;
  
  try {
    await workOrderService.delete(id);
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工單失敗');
  }
};

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = async (row: WorkOrder) => {
  if (!confirm('確定要刪除此工單嗎？此操作無法復原。')) return;
  
  try {
    await workOrderService.delete(row.id);
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工單失敗');
  }
};

// 處理 row-view 事件（快捷鍵觸發）
const handleRowView = (row: WorkOrder) => {
  viewDetails(row);
};

// 處理 row-edit 事件（快捷鍵觸發，F2）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleRowEdit = (_row: WorkOrder, _index: number) => {
  // 編輯狀態會由 EditableDataTable 內部處理
};

// 處理快捷鍵點擊
const handleShortcutClick = (action: string) => {
  if (!editableTableRef.value || !tableState.value) return;

  const state = tableState.value;
  const data = state.data();
  const currentRowIndex = state.focusedRowIndex;

  switch (action) {
    case 'arrow-up':
    case 'arrow-down':
      break;

    case 'row-view':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        handleRowView(data[currentRowIndex]);
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
      break;

    case 'cancel-new-row':
      editableTableRef.value.cancelNewRow();
      break;
  }
};

// 初始化
onMounted(() => {
  loadCustomers();
  loadStaff();
  loadOrders();
});
</script>

<style scoped>
.orders-page {
  max-width: 1400px;
  margin: 0 auto;
}

.orders-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.orders-content {
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

.btn-icon {
  margin-right: 0.5rem;
}

.link-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: var(--primary-600);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
}

.link-button:hover {
  color: var(--primary-700);
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

.form-control:disabled {
  background-color: var(--secondary-100);
  cursor: not-allowed;
}

select.form-control {
  cursor: pointer;
}

textarea.form-control {
  resize: vertical;
}

/* 詳情 Modal 樣式 */
.details-content {
  max-height: 60vh;
  overflow-y: auto;
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

.details-section p {
  color: var(--secondary-700);
  line-height: 1.6;
}

/* 工單工件列表 */
.work-order-items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.work-order-item-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius);
  padding: 1rem;
  border: 1px solid var(--secondary-200);
}

.work-order-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.work-order-item-title {
  font-weight: 600;
  color: var(--secondary-900);
}

.work-order-item-amount {
  font-weight: 600;
  color: var(--primary-600);
}

.work-order-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: var(--font-size-sm);
  color: var(--secondary-700);
}

.text-muted {
  color: var(--secondary-400);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .orders-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .orders-overview {
    grid-template-columns: 1fr;
  }
}
</style>

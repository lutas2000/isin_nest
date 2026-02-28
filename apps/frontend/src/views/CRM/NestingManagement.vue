<template>
  <div class="nesting-management-page">
    <PageHeader 
      title="排版管理"
      description="管理排版、追蹤排版進度"
    >
      <template #actions>
        <button class="btn btn-outline" @click="handleImportClick">
          <span class="btn-icon">📄</span>
          匯入排版
        </button>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="btn-icon">➕</span>
          新增排版
        </button>
      </template>
    </PageHeader>

    <SearchFilters
      title=""
      v-model:search="searchQuery"
      search-placeholder="搜尋排版編號或訂貨單..."
    />

    <div class="table-card">
      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable
        v-else
        ref="editableTableRef"
        :columns="columns"
        :data="filteredData"
        :show-actions="true"
        :editable="true"
        :show-new-row="showNewRow"
        :new-row-template="newRowTemplate"
        @save="handleSave"
        @new-row-save="handleNewRowSave"
        @new-row-cancel="showNewRow = false"
        @row-delete="handleRowDelete"
        @row-view="handleRowView"
      >
        <template #cell-id="{ value }">
          <router-link :to="`/crm/nestings/${value}/items`" class="link">
            {{ value }}
          </router-link>
        </template>

        <template #cell-orderId="{ value }">
          <router-link :to="`/crm/orders/${value}/items`" class="link">{{ value }}</router-link>
        </template>

        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing">
            <button class="btn btn-sm btn-success" @click="save">保存</button>
            <button class="btn btn-sm btn-outline" @click="cancel">取消</button>
          </template>
          <template v-else>
            <span class="dropdown-item" @click="handleRowView(row)">查看詳情</span>
            <span class="dropdown-item" @click="handleRowDelete(row)">刪除</span>
          </template>
        </template>
      </EditableDataTable>
    </div>

    <!-- 排版詳情 Modal -->
    <Modal
      :show="showDetailModal"
      :title="`排版詳情 #${selectedNesting?.id || ''}`"
      size="lg"
      @close="closeDetailModal"
    >
      <div v-if="selectedNesting" class="nesting-detail">
        <div class="detail-section">
          <h4>基本資訊</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">排版 ID：</span>
              <span class="detail-value">{{ selectedNesting.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">訂貨單編號：</span>
              <span class="detail-value">{{ selectedNesting.orderId }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">材料：</span>
              <span class="detail-value">{{ selectedNesting.material }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">厚度：</span>
              <span class="detail-value">{{ selectedNesting.thickness }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">數量：</span>
              <span class="detail-value">{{ selectedNesting.quantity }} 張</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">X：</span>
              <span class="detail-value">{{ selectedNesting.x ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Y：</span>
              <span class="detail-value">{{ selectedNesting.y ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">切削長度：</span>
              <span class="detail-value">{{ selectedNesting.cutLength ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">劃線長度：</span>
              <span class="detail-value">{{ selectedNesting.lineLength ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">加工時間（秒）：</span>
              <span class="detail-value">{{ selectedNesting.processingTime ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">使用率 (%)：</span>
              <span class="detail-value">{{ selectedNesting.utilization ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">重量：</span>
              <span class="detail-value">{{ selectedNesting.weight ?? '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">廢料 (%)：</span>
              <span class="detail-value">{{ selectedNesting.scrap ?? '-' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>排版工件</h4>
          <div v-if="selectedNesting.nestingItems && selectedNesting.nestingItems.length > 0" class="nesting-items-list">
            <div v-for="item in selectedNesting.nestingItems" :key="item.id" class="nesting-item">
              <span class="item-order-item">工件 #{{ item.id }}</span>
              <span class="item-quantity">數量：{{ item.quantity }}</span>
            </div>
          </div>
          <div v-else class="empty-message">尚無排版工件</div>
        </div>

      </div>
    </Modal>
    <!-- 匯入排版 Modal -->
    <Modal
      :show="showImportModal"
      title="匯入排版"
      size="md"
      @close="closeImportModal"
    >
      <div class="import-form">
        <div class="form-group">
          <label class="form-label">訂貨單 <span class="required">*</span></label>
          <select v-model="importForm.orderId" class="form-select" :disabled="ordersLoading">
            <option value="">請選擇訂貨單</option>
            <option v-for="order in orders" :key="order.id" :value="order.id">
              {{ order.id }} — {{ order.customer?.name || order.customerId }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">材料 <span class="required">*</span></label>
          <input v-model="importForm.material" type="text" class="form-input" placeholder="例如：不鏽鋼" />
        </div>
        <div class="form-group">
          <label class="form-label">厚度 <span class="required">*</span></label>
          <input v-model="importForm.thickness" type="text" class="form-input" placeholder="例如：3mm" />
        </div>
        <div class="form-group">
          <label class="form-label">DOCX 檔案 <span class="required">*</span></label>
          <input
            ref="fileInput"
            type="file"
            accept=".docx"
            class="form-input"
            @change="handleFileSelect"
          />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline" @click="closeImportModal">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!importFormValid || importLoading"
          @click="handleImportSubmit"
        >
          {{ importLoading ? '匯入中...' : '確認匯入' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, EditableDataTable, SearchFilters, Modal, type EditableColumn } from '@/components';
import { nestingService, type Nesting } from '@/services/crm/nesting.service';
import { orderService, type Order } from '@/services/crm/order.service';

const loading = ref(false);
const error = ref<string | null>(null);
const nestings = ref<Nesting[]>([]);
const searchQuery = ref('');
const showNewRow = ref(false);
const showDetailModal = ref(false);
const selectedNesting = ref<Nesting | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const showImportModal = ref(false);
const importLoading = ref(false);
const ordersLoading = ref(false);
const orders = ref<Order[]>([]);
const importForm = ref({ orderId: '', material: '', thickness: '' });
const importFile = ref<File | null>(null);

const importFormValid = computed(() =>
  importForm.value.orderId && importForm.value.material && importForm.value.thickness && importFile.value,
);

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'orderId', label: '訂貨單編號', editable: true, required: true, type: 'text' },
  { key: 'material', label: '材料', editable: true, required: true, type: 'text' },
  { key: 'thickness', label: '厚度', editable: true, required: true, type: 'text' },
  { key: 'quantity', label: '張數', editable: true, type: 'number' },
];

const newRowTemplate = () => ({
  orderId: '',
  material: '',
  thickness: '',
  quantity: 1,
});

const filteredData = computed(() => {
  let data = [...nestings.value];
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    data = data.filter(item =>
      item.id?.toLowerCase().includes(query) ||
      item.orderId?.toLowerCase().includes(query) ||
      item.material?.toLowerCase().includes(query)
    );
  }

  return data;
});

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await nestingService.getAll();
    if (response && typeof response === 'object' && 'data' in response) {
      nestings.value = response.data;
    } else {
      nestings.value = response as unknown as Nesting[];
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入排版失敗';
  } finally {
    loading.value = false;
  }
};

const handleSave = async (row: Nesting) => {
  try {
    await nestingService.update(row.id, row);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存排版失敗');
  }
};

const handleNewRowSave = async (row: Partial<Nesting>) => {
  try {
    await nestingService.create(row);
    showNewRow.value = false;
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立排版失敗');
  }
};

const handleRowDelete = async (row: Nesting) => {
  if (!confirm('確定要刪除此排版嗎？')) return;
  try {
    await nestingService.delete(row.id);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除排版失敗');
  }
};

const handleRowView = (row: Nesting) => {
  selectedNesting.value = row;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedNesting.value = null;
};

const loadOrders = async () => {
  ordersLoading.value = true;
  try {
    const response = await orderService.getAll();
    if (response && typeof response === 'object' && 'data' in response) {
      orders.value = (response as any).data;
    } else {
      orders.value = response as Order[];
    }
  } catch {
    orders.value = [];
  } finally {
    ordersLoading.value = false;
  }
};

const handleImportClick = () => {
  importForm.value = { orderId: '', material: '', thickness: '' };
  importFile.value = null;
  showImportModal.value = true;
  loadOrders();
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  importFile.value = input.files?.[0] ?? null;
};

const closeImportModal = () => {
  showImportModal.value = false;
  importFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const handleImportSubmit = async () => {
  if (!importFile.value) return;

  const formData = new FormData();
  formData.append('file', importFile.value);
  formData.append('orderId', importForm.value.orderId);
  formData.append('material', importForm.value.material);
  formData.append('thickness', importForm.value.thickness);

  try {
    importLoading.value = true;
    await nestingService.importFromDocx(formData);
    closeImportModal();
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '匯入排版失敗');
  } finally {
    importLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.nesting-management-page {
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

.table-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.link {
  color: var(--primary-600);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.btn-icon {
  margin-right: 0.5rem;
}

.items-count {
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

/* 排版詳情 Modal */
.nesting-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  font-size: var(--font-size-base);
  color: var(--secondary-800);
  font-weight: 600;
  border-bottom: 2px solid var(--secondary-200);
  padding-bottom: 0.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
}

.detail-value {
  font-size: var(--font-size-base);
  color: var(--secondary-900);
}

.nesting-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nesting-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--secondary-50);
  border-radius: var(--border-radius);
}

.item-order-item {
  font-weight: 500;
}

.item-quantity {
  color: var(--secondary-600);
}

.empty-message {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-500);
}

.detail-section p {
  margin: 0;
  color: var(--secondary-700);
  line-height: 1.6;
}

/* 匯入表單 */
.import-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--secondary-700);
}

.form-label .required {
  color: var(--danger-600);
}

.form-select,
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  background: white;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px var(--primary-100);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

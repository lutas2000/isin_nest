<template>
  <div class="nesting-management-page">
    <PageHeader 
      title="排版管理"
      description="管理排版、追蹤排版進度"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="btn-icon">➕</span>
          新增排版
        </button>
      </template>
    </PageHeader>

    <SearchFilters
      v-model:searchValue="searchQuery"
      v-model:filterStatus="filterStatus"
      search-placeholder="搜尋排版編號或訂貨單..."
      :status-options="statusOptions"
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
        <template #cell-nestingNumber="{ value }">
          <span class="nesting-number">{{ value || '待生成' }}</span>
        </template>

        <template #cell-orderId="{ value }">
          <router-link :to="`/crm/orders/${value}/items`" class="link">{{ value }}</router-link>
        </template>

        <template #cell-status="{ value }">
          <StatusBadge 
            :text="getStatusLabel(value)" 
            :variant="getStatusVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-nestingItems="{ row }">
          <span class="items-count">{{ row.nestingItems?.length || 0 }} 個工件</span>
        </template>

        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '-' }}
        </template>

        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing">
            <button class="btn btn-sm btn-success" @click="save">保存</button>
            <button class="btn btn-sm btn-outline" @click="cancel">取消</button>
          </template>
          <template v-else>
            <span class="dropdown-item" @click="handleRowView(row)">查看詳情</span>
            <span class="dropdown-item" @click="finalizeNesting(row.id)" v-if="row.status === 'draft'">定案</span>
            <span class="dropdown-item" @click="handleRowDelete(row)">刪除</span>
          </template>
        </template>
      </EditableDataTable>
    </div>

    <!-- 排版詳情 Modal -->
    <Modal
      :show="showDetailModal"
      :title="`排版詳情 #${selectedNesting?.nestingNumber || ''}`"
      size="lg"
      @close="closeDetailModal"
    >
      <div v-if="selectedNesting" class="nesting-detail">
        <div class="detail-section">
          <h4>基本資訊</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">排版編號：</span>
              <span class="detail-value">{{ selectedNesting.nestingNumber }}</span>
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
              <span class="detail-label">狀態：</span>
              <span class="detail-value">
                <StatusBadge :text="getStatusLabel(selectedNesting.status)" :variant="getStatusVariant(selectedNesting.status)" />
              </span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>排版工件</h4>
          <div v-if="selectedNesting.nestingItems && selectedNesting.nestingItems.length > 0" class="nesting-items-list">
            <div v-for="item in selectedNesting.nestingItems" :key="item.id" class="nesting-item">
              <span class="item-order-item">工件 #{{ item.orderItemId }}</span>
              <span class="item-quantity">數量：{{ item.quantity }}</span>
            </div>
          </div>
          <div v-else class="empty-message">尚無排版工件</div>
        </div>

        <div class="detail-section" v-if="selectedNesting.notes">
          <h4>備註</h4>
          <p>{{ selectedNesting.notes }}</p>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, StatusBadge, EditableDataTable, SearchFilters, Modal, type EditableColumn } from '@/components';
import { nestingService, type Nesting, NestingStatus } from '@/services/crm/nesting.service';

const loading = ref(false);
const error = ref<string | null>(null);
const nestings = ref<Nesting[]>([]);
const searchQuery = ref('');
const filterStatus = ref('');
const showNewRow = ref(false);
const showDetailModal = ref(false);
const selectedNesting = ref<Nesting | null>(null);
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

const statusOptions = [
  { value: '', label: '所有狀態' },
  { value: 'draft', label: '草稿' },
  { value: 'finalized', label: '已定案' },
];

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'nestingNumber', label: '排版編號', editable: false },
  { key: 'orderId', label: '訂貨單編號', editable: true, required: true, type: 'text' },
  { key: 'material', label: '材料', editable: true, required: true, type: 'text' },
  { key: 'thickness', label: '厚度', editable: true, required: true, type: 'text' },
  { key: 'quantity', label: '張數', editable: true, type: 'number' },
  { key: 'nestingItems', label: '工件數', editable: false },
  { key: 'status', label: '狀態', editable: false },
  { key: 'createdAt', label: '建立日期', editable: false },
];

const newRowTemplate = () => ({
  orderId: '',
  material: '',
  thickness: '',
  quantity: 1,
  status: 'draft',
  notes: '',
});

const filteredData = computed(() => {
  let data = [...nestings.value];
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    data = data.filter(item => 
      item.nestingNumber?.toLowerCase().includes(query) ||
      item.orderId?.toLowerCase().includes(query) ||
      item.material?.toLowerCase().includes(query)
    );
  }
  
  if (filterStatus.value) {
    data = data.filter(item => item.status === filterStatus.value);
  }
  
  return data;
});

const getStatusLabel = (status: NestingStatus) => {
  const labels: Record<string, string> = {
    [NestingStatus.DRAFT]: '草稿',
    [NestingStatus.FINALIZED]: '已定案',
  };
  return labels[status] || status;
};

const getStatusVariant = (status: NestingStatus) => {
  const variants: Record<string, string> = {
    [NestingStatus.DRAFT]: 'secondary',
    [NestingStatus.FINALIZED]: 'success',
  };
  return variants[status] || 'secondary';
};

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

const finalizeNesting = async (id: number) => {
  if (!confirm('確定要定案此排版嗎？定案後將無法修改。')) return;
  try {
    await nestingService.finalize(id);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '定案排版失敗');
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
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

.nesting-number {
  font-weight: 600;
  color: var(--primary-700);
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

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

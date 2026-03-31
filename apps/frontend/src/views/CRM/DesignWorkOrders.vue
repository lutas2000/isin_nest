<template>
  <div class="design-work-orders-page">
    <PageHeader 
      title="設計工作單管理"
      description="管理設計工作單、追蹤設計進度"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="btn-icon">➕</span>
          新增設計工作單
        </button>
      </template>
    </PageHeader>

    <!-- 搜尋和篩選區域 -->
    <SearchFilters
      title=""
      v-model:searchValue="searchQuery"
      v-model:filterStatus="filterStatus"
      search-placeholder="搜尋訂單編號或設計師..."
      :status-options="statusOptions"
    />

    <!-- 設計工作單列表 -->
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
        @field-change="handleFieldChange"
        @save="handleSave"
        @new-row-save="handleNewRowSave"
        @new-row-cancel="showNewRow = false"
        @row-delete="handleRowDelete"
      >
        <template #cell-id="{ value }">
          {{ value || '待生成' }}
        </template>

        <template #cell-orderId="{ value }">
          <router-link :to="`/crm/orders/${value}/items`" class="link">
            {{ value }}
          </router-link>
        </template>

        <template #cell-assignedStaff="{ row }">
          {{ row.assignedStaff?.name || '-' }}
        </template>

        <template #cell-status="{ value }">
          <StatusBadge 
            :text="getStatusLabel(value)" 
            :variant="getStatusVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '-' }}
        </template>

        <template #cell-drawingNumber="{ row, value }">
          <span v-if="row.isDrawingGroup" class="group-badge" title="圖組">圖組</span>
          <router-link
            v-if="row.isDrawingGroup && value"
            :to="`/crm/design-work-orders/${row.id}`"
            class="link"
          >
            {{ value }}
          </router-link>
          <span v-else>{{ value || '-' }}</span>
        </template>

        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing">
            <button class="btn btn-sm btn-success" @click="save">保存</button>
            <button class="btn btn-sm btn-outline" @click="cancel">取消</button>
          </template>
          <template v-else>
            <span class="dropdown-item" @click="updateStatus(row.id, DesignWorkOrderStatus.IN_PROGRESS)" v-if="row.status === 'pending'">
              開始設計
            </span>
            <span class="dropdown-item" @click="updateStatus(row.id, DesignWorkOrderStatus.COMPLETED)" v-if="row.status === 'in_progress'">
              完成設計
            </span>
            <span
              class="dropdown-item"
              v-if="canConvertToGroup(row)"
              @click="handleConvertToGroup(row)"
            >
              轉換為圖組
            </span>
            <span
              class="dropdown-item"
              v-if="row.isDrawingGroup"
              @click="handleDissolveGroup(row)"
            >
              解除圖組
            </span>
            <span class="dropdown-item" @click="goToCncPreview(row)">預覽 CNC</span>
            <span class="dropdown-item" @click="handleRowDelete(row)">刪除</span>
          </template>
        </template>
      </EditableDataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PageHeader, StatusBadge, EditableDataTable, SearchFilters, type EditableColumn } from '@/components';
import { 
  designWorkOrderService, 
  type DesignWorkOrder, 
  DesignWorkOrderStatus 
} from '@/services/crm/design-work-order.service';

const loading = ref(false);
const error = ref<string | null>(null);
const designWorkOrders = ref<DesignWorkOrder[]>([]);
const searchQuery = ref('');
const filterStatus = ref('');
const showNewRow = ref(false);
const router = useRouter();

const statusOptions = [
  { value: '', label: '所有狀態' },
  { value: 'pending', label: '待處理' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '已完成' },
];

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'orderId', label: '訂單編號', editable: true, required: true, type: 'text' },
  { key: 'orderItemId', label: '工件ID', editable: true, required: true, type: 'number' },
  { key: 'drawingNumber', label: '圖號', editable: true, type: 'text' },
  { key: 'assignedStaff', label: '設計師', editable: false },
  { key: 'priority', label: '優先順序', editable: true, type: 'number' },
  { key: 'status', label: '狀態', editable: false },
  { key: 'createdAt', label: '建立日期', editable: false },
];

const newRowTemplate = () => ({
  orderId: '',
  orderItemId: 0,
  drawingNumber: '',
  priority: 0,
  status: 'pending',
  notes: '',
});

const filteredData = computed(() => {
  let data = [...designWorkOrders.value];
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    data = data.filter(item => 
      item.orderId?.toLowerCase().includes(query) ||
      item.drawingNumber?.toLowerCase().includes(query) ||
      item.assignedStaff?.name?.toLowerCase().includes(query)
    );
  }
  
  if (filterStatus.value) {
    data = data.filter(item => item.status === filterStatus.value);
  }
  
  return data;
});

const canConvertToGroup = (row: DesignWorkOrder) => {
  return !row.isDrawingGroup && (row.parentDesignWorkOrderId == null || row.parentDesignWorkOrderId === undefined);
};

const getStatusLabel = (status: DesignWorkOrderStatus) => {
  const labels: Record<string, string> = {
    [DesignWorkOrderStatus.PENDING]: '待處理',
    [DesignWorkOrderStatus.IN_PROGRESS]: '進行中',
    [DesignWorkOrderStatus.COMPLETED]: '已完成',
  };
  return labels[status] || status;
};

const getStatusVariant = (status: DesignWorkOrderStatus) => {
  const variants: Record<string, string> = {
    [DesignWorkOrderStatus.PENDING]: 'secondary',
    [DesignWorkOrderStatus.IN_PROGRESS]: 'warning',
    [DesignWorkOrderStatus.COMPLETED]: 'success',
  };
  return variants[status] || 'secondary';
};

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await designWorkOrderService.getAll();
    if (response && typeof response === 'object' && 'data' in response) {
      designWorkOrders.value = response.data;
    } else {
      designWorkOrders.value = response as unknown as DesignWorkOrder[];
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入設計工作單失敗';
  } finally {
    loading.value = false;
  }
};

const handleFieldChange = () => {};

const handleSave = async (row: DesignWorkOrder) => {
  try {
    await designWorkOrderService.update(row.id, row);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存設計工作單失敗');
  }
};

const handleNewRowSave = async (row: Partial<DesignWorkOrder>) => {
  try {
    await designWorkOrderService.create(row);
    showNewRow.value = false;
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立設計工作單失敗');
  }
};

const handleRowDelete = async (row: DesignWorkOrder) => {
  if (!confirm('確定要刪除此設計工作單嗎？')) return;
  try {
    await designWorkOrderService.delete(row.id);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除設計工作單失敗');
  }
};

const handleConvertToGroup = async (row: DesignWorkOrder) => {
  if (!canConvertToGroup(row)) return;
  try {
    await designWorkOrderService.convertToGroup(row.id);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '轉換為圖組失敗');
  }
};

const handleDissolveGroup = async (row: DesignWorkOrder) => {
  if (!row.isDrawingGroup) return;
  if (!confirm('確定要解除此圖組嗎？此操作可能會刪除其子設計工作單，且無法復原。')) {
    return;
  }
  try {
    await designWorkOrderService.dissolveGroup(row.id);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '解除圖組失敗');
  }
};

const updateStatus = async (id: number, status: DesignWorkOrderStatus) => {
  try {
    await designWorkOrderService.updateStatus(id, status);
    await loadData();
  } catch (err) {
    alert(err instanceof Error ? err.message : '更新狀態失敗');
  }
};

const goToCncPreview = (row: DesignWorkOrder) => {
  if (!row.drawingNumber) {
    alert('此設計工作單沒有圖號，無法預覽 CNC 檔案');
    return;
  }
  router.push(`/crm/design-work-orders/${row.id}/cnc-preview`);
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.design-work-orders-page {
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

.group-badge {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary-700);
  background: var(--primary-50);
  border-radius: var(--border-radius);
  vertical-align: middle;
}

.btn-icon {
  margin-right: 0.5rem;
}
</style>

<template>
  <div class="cutting-work-orders-page">
    <PageHeader 
      title="切割工作單管理"
      description="管理切割工作單、追蹤切割進度"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="btn-icon">➕</span>
          新增切割工作單
        </button>
      </template>
    </PageHeader>

    <SearchFilters
      v-model:searchValue="searchQuery"
      v-model:filterStatus="filterStatus"
      search-placeholder="搜尋訂貨單編號或機台..."
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
      >
        <template #cell-orderId="{ value }">
          <router-link :to="`/crm/orders/${value}/items`" class="link">{{ value }}</router-link>
        </template>

        <template #cell-status="{ value }">
          <StatusBadge :text="getStatusLabel(value)" :variant="getStatusVariant(value)" size="sm" />
        </template>

        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing">
            <button class="btn btn-sm btn-success" @click="save">保存</button>
            <button class="btn btn-sm btn-outline" @click="cancel">取消</button>
          </template>
          <template v-else>
            <span class="dropdown-item" @click="updateStatus(row.id, 'in_progress')" v-if="row.status === 'assigned'">開始切割</span>
            <span class="dropdown-item" @click="updateStatus(row.id, 'completed')" v-if="row.status === 'in_progress'">完成切割</span>
            <span class="dropdown-item" @click="handleRowDelete(row)">刪除</span>
          </template>
        </template>
      </EditableDataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, StatusBadge, EditableDataTable, SearchFilters, type EditableColumn } from '@/components';
import { cuttingWorkOrderService, type CuttingWorkOrder, CuttingWorkOrderStatus } from '@/services/crm/cutting-work-order.service';

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<CuttingWorkOrder[]>([]);
const searchQuery = ref('');
const filterStatus = ref('');
const showNewRow = ref(false);
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

const statusOptions = [
  { value: '', label: '所有狀態' },
  { value: 'pending', label: '待處理' },
  { value: 'assigned', label: '已分派' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '已完成' },
];

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'orderId', label: '訂貨單編號', editable: true, required: true, type: 'text' },
  { key: 'material', label: '材料', editable: true, type: 'text' },
  { key: 'thickness', label: '厚度', editable: true, type: 'text' },
  { key: 'machineId', label: '機台', editable: true, type: 'text' },
  { key: 'status', label: '狀態', editable: false },
];

const newRowTemplate = () => ({ orderId: '', material: '', thickness: '', machineId: '', status: 'pending' });

const filteredData = computed(() => {
  let result = [...data.value];
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => item.orderId?.toLowerCase().includes(query) || item.machineId?.toLowerCase().includes(query));
  }
  if (filterStatus.value) result = result.filter(item => item.status === filterStatus.value);
  return result;
});

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { pending: '待處理', assigned: '已分派', in_progress: '進行中', completed: '已完成' };
  return labels[status] || status;
};

const getStatusVariant = (status: string) => {
  const variants: Record<string, string> = { pending: 'secondary', assigned: 'info', in_progress: 'warning', completed: 'success' };
  return variants[status] || 'secondary';
};

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await cuttingWorkOrderService.getAll();
    data.value = response && 'data' in response ? response.data : response as unknown as CuttingWorkOrder[];
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入切割工作單失敗';
  } finally {
    loading.value = false;
  }
};

const handleSave = async (row: CuttingWorkOrder) => {
  try { await cuttingWorkOrderService.update(row.id, row); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '儲存失敗'); }
};

const handleNewRowSave = async (row: Partial<CuttingWorkOrder>) => {
  try { await cuttingWorkOrderService.create(row); showNewRow.value = false; await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '建立失敗'); }
};

const handleRowDelete = async (row: CuttingWorkOrder) => {
  if (!confirm('確定要刪除此切割工作單嗎？')) return;
  try { await cuttingWorkOrderService.delete(row.id); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '刪除失敗'); }
};

const updateStatus = async (id: number, status: CuttingWorkOrderStatus) => {
  try { await cuttingWorkOrderService.updateStatus(id, status); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '更新狀態失敗'); }
};

onMounted(() => { loadData(); });
</script>

<style scoped>
.cutting-work-orders-page { max-width: 1400px; margin: 0 auto; }
.loading-message, .error-message { padding: 2rem; text-align: center; }
.error-message { color: var(--danger-600); background: var(--danger-50); border-radius: var(--border-radius-lg); }
.table-card { background: white; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); overflow: hidden; }
.link { color: var(--primary-600); text-decoration: none; }
.link:hover { text-decoration: underline; }
.btn-icon { margin-right: 0.5rem; }
</style>

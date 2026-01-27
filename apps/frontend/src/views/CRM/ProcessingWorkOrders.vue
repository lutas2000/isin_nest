<template>
  <div class="processing-work-orders-page">
    <PageHeader title="加工工作單管理" description="管理加工工作單、追蹤加工進度">
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true"><span class="btn-icon">➕</span>新增加工工作單</button>
      </template>
    </PageHeader>

    <SearchFilters v-model:searchValue="searchQuery" v-model:filterStatus="filterStatus" search-placeholder="搜尋訂貨單編號..." :status-options="statusOptions" />

    <div class="table-card">
      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable v-else ref="editableTableRef" :columns="columns" :data="filteredData" :show-actions="true" :editable="true" :show-new-row="showNewRow" :new-row-template="newRowTemplate" @save="handleSave" @new-row-save="handleNewRowSave" @new-row-cancel="showNewRow = false" @row-delete="handleRowDelete">
        <template #cell-orderId="{ value }"><router-link :to="`/crm/orders/${value}/items`" class="link">{{ value }}</router-link></template>
        <template #cell-status="{ value }"><StatusBadge :text="getStatusLabel(value)" :variant="getStatusVariant(value)" size="sm" /></template>
        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing"><button class="btn btn-sm btn-success" @click="save">保存</button><button class="btn btn-sm btn-outline" @click="cancel">取消</button></template>
          <template v-else>
            <span class="dropdown-item" @click="updateStatus(row.id, 'in_progress')" v-if="row.status === 'pending'">開始加工</span>
            <span class="dropdown-item" @click="updateStatus(row.id, 'completed')" v-if="row.status === 'in_progress'">完成加工</span>
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
import { processingWorkOrderService, type ProcessingWorkOrder, ProcessingWorkOrderStatus } from '@/services/crm/processing-work-order.service';

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<ProcessingWorkOrder[]>([]);
const searchQuery = ref('');
const filterStatus = ref('');
const showNewRow = ref(false);
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

const statusOptions = [{ value: '', label: '所有狀態' }, { value: 'pending', label: '待處理' }, { value: 'in_progress', label: '進行中' }, { value: 'completed', label: '已完成' }];

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'orderId', label: '訂貨單編號', editable: true, required: true, type: 'text' },
  { key: 'orderItemId', label: '工件ID', editable: true, required: true, type: 'number' },
  { key: 'processingType', label: '加工類型', editable: true, type: 'text' },
  { key: 'status', label: '狀態', editable: false },
];

const newRowTemplate = () => ({ orderId: '', orderItemId: 0, processingType: '', status: 'pending' });

const filteredData = computed(() => {
  let result = [...data.value];
  if (searchQuery.value) { const query = searchQuery.value.toLowerCase(); result = result.filter(item => item.orderId?.toLowerCase().includes(query) || item.processingType?.toLowerCase().includes(query)); }
  if (filterStatus.value) result = result.filter(item => item.status === filterStatus.value);
  return result;
});

const getStatusLabel = (status: string) => ({ pending: '待處理', in_progress: '進行中', completed: '已完成' }[status] || status);
const getStatusVariant = (status: string) => ({ pending: 'secondary', in_progress: 'warning', completed: 'success' }[status] || 'secondary');

const loadData = async () => { loading.value = true; error.value = null; try { const response = await processingWorkOrderService.getAll(); data.value = response && 'data' in response ? response.data : response as unknown as ProcessingWorkOrder[]; } catch (err) { error.value = err instanceof Error ? err.message : '載入加工工作單失敗'; } finally { loading.value = false; } };

const handleSave = async (row: ProcessingWorkOrder) => { try { await processingWorkOrderService.update(row.id, row); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '儲存失敗'); } };
const handleNewRowSave = async (row: Partial<ProcessingWorkOrder>) => { try { await processingWorkOrderService.create(row); showNewRow.value = false; await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '建立失敗'); } };
const handleRowDelete = async (row: ProcessingWorkOrder) => { if (!confirm('確定要刪除此加工工作單嗎？')) return; try { await processingWorkOrderService.delete(row.id); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '刪除失敗'); } };
const updateStatus = async (id: number, status: ProcessingWorkOrderStatus) => { try { await processingWorkOrderService.updateStatus(id, status); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '更新狀態失敗'); } };

onMounted(() => { loadData(); });
</script>

<style scoped>
.processing-work-orders-page { max-width: 1400px; margin: 0 auto; }
.loading-message, .error-message { padding: 2rem; text-align: center; }
.error-message { color: var(--danger-600); background: var(--danger-50); border-radius: var(--border-radius-lg); }
.table-card { background: white; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); overflow: hidden; }
.link { color: var(--primary-600); text-decoration: none; }
.link:hover { text-decoration: underline; }
.btn-icon { margin-right: 0.5rem; }
</style>

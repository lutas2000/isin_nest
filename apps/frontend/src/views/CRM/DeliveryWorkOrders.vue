<template>
  <div class="delivery-work-orders-page">
    <PageHeader title="送貨工作單管理" description="管理送貨工作單、追蹤送貨進度">
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true"><span class="btn-icon">➕</span>新增送貨工作單</button>
      </template>
    </PageHeader>

    <SearchFilters v-model:searchValue="searchQuery" v-model:filterStatus="filterStatus" search-placeholder="搜尋訂貨單編號或地址..." :status-options="statusOptions" />

    <div class="table-card">
      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable v-else ref="editableTableRef" :columns="columns" :data="filteredData" :show-actions="true" :editable="true" :show-new-row="showNewRow" :new-row-template="newRowTemplate" @save="handleSave" @new-row-save="handleNewRowSave" @new-row-cancel="showNewRow = false" @row-delete="handleRowDelete">
        <template #cell-orderId="{ value }"><router-link :to="`/crm/orders/${value}/items`" class="link">{{ value }}</router-link></template>
        <template #cell-status="{ value }"><StatusBadge :text="getStatusLabel(value)" :variant="getStatusVariant(value)" size="sm" /></template>
        <template #cell-scheduledDate="{ value }">{{ value ? new Date(value).toLocaleDateString('zh-TW') : '-' }}</template>
        <template #actions="{ row, isEditing, save, cancel }">
          <template v-if="isEditing"><button class="btn btn-sm btn-success" @click="save">保存</button><button class="btn btn-sm btn-outline" @click="cancel">取消</button></template>
          <template v-else>
            <span class="dropdown-item" @click="updateStatus(row.id, 'ready')" v-if="row.status === 'pending'">準備送貨</span>
            <span class="dropdown-item" @click="updateStatus(row.id, 'in_transit')" v-if="row.status === 'ready'">開始送貨</span>
            <span class="dropdown-item" @click="updateStatus(row.id, 'delivered')" v-if="row.status === 'in_transit'">已送達</span>
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
import { deliveryWorkOrderService, type DeliveryWorkOrder, DeliveryWorkOrderStatus } from '@/services/crm/delivery-work-order.service';

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<DeliveryWorkOrder[]>([]);
const searchQuery = ref('');
const filterStatus = ref('');
const showNewRow = ref(false);
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

const statusOptions = [{ value: '', label: '所有狀態' }, { value: 'pending', label: '待處理' }, { value: 'ready', label: '準備送貨' }, { value: 'in_transit', label: '運送中' }, { value: 'delivered', label: '已送達' }];

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'orderId', label: '訂貨單編號', editable: true, required: true, type: 'text' },
  { key: 'deliveryAddress', label: '送貨地址', editable: true, type: 'text' },
  { key: 'contactPhone', label: '聯絡電話', editable: true, type: 'text' },
  { key: 'scheduledDate', label: '預定日期', editable: true, type: 'date' },
  { key: 'status', label: '狀態', editable: false },
];

const newRowTemplate = () => ({ orderId: '', deliveryAddress: '', contactPhone: '', scheduledDate: '', status: 'pending' });

const filteredData = computed(() => {
  let result = [...data.value];
  if (searchQuery.value) { const query = searchQuery.value.toLowerCase(); result = result.filter(item => item.orderId?.toLowerCase().includes(query) || item.deliveryAddress?.toLowerCase().includes(query)); }
  if (filterStatus.value) result = result.filter(item => item.status === filterStatus.value);
  return result;
});

const getStatusLabel = (status: string) => ({ pending: '待處理', ready: '準備送貨', in_transit: '運送中', delivered: '已送達' }[status] || status);
const getStatusVariant = (status: string) => ({ pending: 'secondary', ready: 'info', in_transit: 'warning', delivered: 'success' }[status] || 'secondary');

const loadData = async () => { loading.value = true; error.value = null; try { const response = await deliveryWorkOrderService.getAll(); data.value = response && 'data' in response ? response.data : response as unknown as DeliveryWorkOrder[]; } catch (err) { error.value = err instanceof Error ? err.message : '載入送貨工作單失敗'; } finally { loading.value = false; } };

const handleSave = async (row: DeliveryWorkOrder) => { try { await deliveryWorkOrderService.update(row.id, row); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '儲存失敗'); } };
const handleNewRowSave = async (row: Partial<DeliveryWorkOrder>) => { try { await deliveryWorkOrderService.create(row); showNewRow.value = false; await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '建立失敗'); } };
const handleRowDelete = async (row: DeliveryWorkOrder) => { if (!confirm('確定要刪除此送貨工作單嗎？')) return; try { await deliveryWorkOrderService.delete(row.id); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '刪除失敗'); } };
const updateStatus = async (id: number, status: DeliveryWorkOrderStatus) => { try { await deliveryWorkOrderService.updateStatus(id, status); await loadData(); } catch (err) { alert(err instanceof Error ? err.message : '更新狀態失敗'); } };

onMounted(() => { loadData(); });
</script>

<style scoped>
.delivery-work-orders-page { max-width: 1400px; margin: 0 auto; }
.loading-message, .error-message { padding: 2rem; text-align: center; }
.error-message { color: var(--danger-600); background: var(--danger-50); border-radius: var(--border-radius-lg); }
.table-card { background: white; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); overflow: hidden; }
.link { color: var(--primary-600); text-decoration: none; }
.link:hover { text-decoration: underline; }
.btn-icon { margin-right: 0.5rem; }
</style>

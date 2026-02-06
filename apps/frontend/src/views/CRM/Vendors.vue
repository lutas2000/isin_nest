<template>
  <div class="vendors-page">
    <PageHeader
      title="廠商管理"
      description="管理委外加工廠商、聯絡資訊與備註"
    >
    </PageHeader>

    <!-- 快捷鍵提示 -->
    <ShortcutHint
      :table-state="tableState"
      @shortcut-click="handleShortcutClick"
    />

    <!-- 廠商列表 -->
    <div class="vendors-content">
      <SearchFilters
        title=""
        :show-search="true"
        search-placeholder="搜尋廠商名稱或聯絡人..."
        :show-date-filter="false"
        v-model:search="vendorSearch"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable
        v-else
        ref="editableTableRef"
        :columns="editableColumns"
        :data="vendors"
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
          <template v-else>
            <span
              class="dropdown-item"
              @click="deleteVendor(row.id)"
            >
              刪除
            </span>
          </template>
        </template>
      </EditableDataTable>
    </div>

    <!-- 查看詳情 Modal -->
    <Modal
      v-if="selectedVendor"
      :show="showDetailsModal"
      :title="`廠商詳情 #${selectedVendor.id}`"
      @close="showDetailsModal = false"
    >
      <div class="details-content">
        <div class="details-section">
          <h4>基本資訊</h4>
          <div class="details-grid">
            <div class="details-item">
              <span class="details-label">廠商 ID：</span>
              <span class="details-value">{{ selectedVendor.id }}</span>
            </div>
            <div class="details-item">
              <span class="details-label">廠商名稱：</span>
              <span class="details-value">{{ selectedVendor.name }}</span>
            </div>
            <div class="details-item" v-if="selectedVendor.contactName">
              <span class="details-label">聯絡人：</span>
              <span class="details-value">{{ selectedVendor.contactName }}</span>
            </div>
            <div class="details-item" v-if="selectedVendor.phone">
              <span class="details-label">電話：</span>
              <span class="details-value">{{ selectedVendor.phone }}</span>
            </div>
            <div class="details-item full-width" v-if="selectedVendor.address">
              <span class="details-label">地址：</span>
              <span class="details-value">{{ selectedVendor.address }}</span>
            </div>
          </div>
        </div>

        <div class="details-section" v-if="selectedVendor.notes">
          <h4>備註</h4>
          <p>{{ selectedVendor.notes }}</p>
        </div>

        <div class="details-section">
          <h4>時間資訊</h4>
          <div class="details-grid">
            <div class="details-item">
              <span class="details-label">建立時間：</span>
              <span class="details-value">
                {{ selectedVendor.createdAt ? new Date(selectedVendor.createdAt).toLocaleString('zh-TW') : '未知' }}
              </span>
            </div>
            <div class="details-item" v-if="selectedVendor.updatedAt">
              <span class="details-label">更新時間：</span>
              <span class="details-value">
                {{ new Date(selectedVendor.updatedAt).toLocaleString('zh-TW') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { PageHeader, EditableDataTable, type EditableColumn, SearchFilters, Modal, ShortcutHint } from '@/components';
import { vendorService, type Vendor } from '@/services/crm/vendor.service';

// 廠商資料
const vendors = ref<Vendor[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 分頁狀態
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);
const vendorSearch = ref('');

// Modal 控制
const showDetailsModal = ref(false);
const selectedVendor = ref<Vendor | null>(null);
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
  name: '',
  contactName: '',
  phone: '',
  address: '',
  notes: '',
});

// 可編輯表格列定義
const editableColumns = computed<EditableColumn[]>(() => [
  {
    key: 'id',
    label: '廠商 ID',
    editable: false,
  },
  {
    key: 'name',
    label: '廠商名稱',
    editable: true,
    required: true,
    type: 'text',
  },
  {
    key: 'contactName',
    label: '聯絡人',
    editable: true,
    type: 'text',
  },
  {
    key: 'phone',
    label: '電話',
    editable: true,
    type: 'text',
  },
  {
    key: 'address',
    label: '地址',
    editable: true,
    type: 'text',
    truncate: true,
  },
  {
    key: 'notes',
    label: '備註',
    editable: true,
    type: 'textarea',
    truncate: true,
  },
  {
    key: 'createdAt',
    label: '建立日期',
    editable: false,
  },
]);

// 載入廠商資料
const loadVendors = async () => {
  loading.value = true;
  error.value = null;
  try {
    const searchTerm = vendorSearch.value.trim() || undefined;
    const response = await vendorService.getAll(currentPage.value, pageSize.value, searchTerm);
    if (response && typeof response === 'object' && 'data' in response) {
      vendors.value = response.data;
      total.value = response.total;
    } else {
      vendors.value = response as Vendor[];
      total.value = vendors.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入廠商失敗';
    console.error('Failed to load vendors:', err);
  } finally {
    loading.value = false;
  }
};

// 處理分頁變化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadVendors();
};

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadVendors();
};

// 查看詳情
const viewDetails = (vendor: Vendor) => {
  selectedVendor.value = vendor;
  showDetailsModal.value = true;
};

// 處理欄位變更
const handleFieldChange = (_row: Vendor, _field: string, _value: any, _isNew: boolean) => {
  // 僅更新本地狀態，保存將在 Enter 或 blur 時觸發
};

// 處理手動保存
const handleSave = async (row: Vendor, isNew: boolean) => {
  try {
    const data = {
      name: row.name,
      contactName: row.contactName || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
    };

    if (isNew) {
      await vendorService.create(data);
    } else {
      await vendorService.update(row.id, data);
    }
    await loadVendors();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存廠商失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  try {
    const data = {
      name: row.name,
      contactName: row.contactName || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
    };
    await vendorService.create(data);
    showNewRow.value = false;
    await loadVendors();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立廠商失敗');
  }
};

// 刪除廠商
const deleteVendor = async (id: number) => {
  if (!confirm('確定要刪除此廠商嗎？此操作無法復原。')) return;

  try {
    await vendorService.delete(id);
    await loadVendors();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除廠商失敗');
  }
};

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = async (row: Vendor) => {
  if (!confirm('確定要刪除此廠商嗎？此操作無法復原。')) return;

  try {
    await vendorService.delete(row.id);
    await loadVendors();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除廠商失敗');
  }
};

// 處理 row-view 事件（快捷鍵觸發）
const handleRowView = (row: Vendor) => {
  viewDetails(row);
};

// 處理 row-edit 事件（快捷鍵觸發）
const handleRowEdit = (_row: Vendor, _index: number) => {
  // 編輯狀態由 EditableDataTable 內部處理
};

// 處理快捷鍵點擊
const handleShortcutClick = (action: string) => {
  if (!editableTableRef.value || !tableState.value) return;

  const state = tableState.value;
  const data = state.data();
  const currentRowIndex = state.focusedRowIndex;

  switch (action) {
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

    case 'cancel-new-row':
      editableTableRef.value.cancelNewRow();
      break;
  }
};

// 監聽搜尋關鍵字變化
watch(vendorSearch, () => {
  currentPage.value = 1;
  loadVendors();
});

// 初始化
onMounted(() => {
  loadVendors();
});
</script>

<style scoped>
.vendors-page {
  max-width: 1400px;
  margin: 0 auto;
}

.vendors-content {
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

.text-muted {
  color: var(--secondary-400);
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

.details-item.full-width {
  grid-column: 1 / -1;
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

/* 響應式設計 */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>

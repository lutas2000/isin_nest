<template>
  <div class="processing-list-page">
    <PageHeader 
      title="加工項目管理"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="btn-icon">+</span>
          新增加工項目
        </button>
      </template>
    </PageHeader>

    <!-- 快捷鍵提示 + 加工項目列表 -->
    <div class="processing-content">
      <SearchFilters
        title="加工項目列表"
        :show-search="true"
        search-placeholder="搜尋加工名稱..."
        v-model:search="processingSearch"
      />

      <ShortcutHint
        :table-state="editableTableState"
        @shortcut-click="handleShortcutClick"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable
        v-else
        ref="editableTableRef"
        :columns="editableColumns"
        :data="filteredProcessings"
        :show-actions="true"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :editable="false"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      >
        <template #cell-vendor="{ row }">
          <span v-if="row.vendor" class="vendor-badge">
            {{ row.vendor.name }}
          </span>
          <span v-else class="internal-badge">內部加工</span>
        </template>

        <template #actions="{ row }">
          <button class="btn btn-sm btn-primary" @click="editProcessing(row)">編輯</button>
          <button class="btn btn-sm btn-danger" @click="deleteProcessing(row)">刪除</button>
        </template>
      </EditableDataTable>
    </div>

    <!-- 創建/編輯加工項目 Modal -->
    <Modal
      :show="showCreateModal"
      :title="editingProcessing ? '編輯加工項目' : '新增加工項目'"
      @close="closeModal"
    >
      <div class="modal-form">
        <div class="form-group">
          <label>加工名稱 *</label>
          <input 
            type="text" 
            class="form-control" 
            v-model="processingForm.name"
            placeholder="例如：折彎、烤漆"
          />
        </div>

        <div class="form-group">
          <label>執行廠商</label>
          <select class="form-control" v-model="processingForm.vendorId">
            <option :value="null">內部加工（無外包廠商）</option>
            <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
              {{ vendor.name }}
            </option>
          </select>
          <small class="form-hint">選擇「內部加工」代表由公司自行處理</small>
        </div>

        <div class="form-group">
          <label>顯示順序</label>
          <input 
            type="number" 
            class="form-control" 
            v-model.number="processingForm.displayOrder"
            placeholder="數字越小越前面"
          />
        </div>

        <div class="form-group">
          <label>備註</label>
          <textarea 
            class="form-control" 
            v-model="processingForm.notes"
            rows="3"
            placeholder="請輸入備註"
          ></textarea>
        </div>

      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveProcessing" :disabled="saving">
          {{ saving ? '儲存中...' : '儲存' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import SearchFilters from '../../components/SearchFilters.vue'
import EditableDataTable, { type EditableColumn } from '../../components/EditableDataTable.vue'
import ShortcutHint from '../../components/ShortcutHint.vue'
import Modal from '../../components/Modal.vue'
import { processingService, type Processing, type CreateProcessingDto } from '../../services/crm/processing.service'
import { vendorService, type Vendor } from '../../services/crm/vendor.service'

// 狀態
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const processings = ref<Processing[]>([])
const vendors = ref<Vendor[]>([])
const processingSearch = ref('')
const currentPage = ref(1)
const pageSize = ref(50)
const total = ref(0)

const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null)

// Modal 狀態
const showCreateModal = ref(false)
const editingProcessing = ref<Processing | null>(null)
const processingForm = ref<CreateProcessingDto>({
  name: '',
  vendorId: undefined,
  notes: '',
  displayOrder: 0,
})

// 表格欄位定義（此頁僅瀏覽，不開放直接 inline 編輯，且不顯示 ID / 順序）
const editableColumns: EditableColumn[] = [
  { key: 'name', label: '加工名稱', editable: false },
  { key: 'vendor', label: '執行廠商', editable: false },
  { key: 'notes', label: '備註', truncate: true },
]

// 提供給 ShortcutHint 使用的表格狀態
const editableTableState = computed(() => {
  if (!editableTableRef.value) return null
  const exposed: any = editableTableRef.value
  return {
    focusedRowIndex: exposed.focusedRowIndex?.value ?? null,
    focusedFieldKey: exposed.focusedFieldKey?.value ?? null,
    isNewRowFocused: exposed.isNewRowFocused?.value ?? false,
    editingRowId: exposed.editingRowId?.value ?? null,
    data: () => processings.value,
  }
})

// 處理 ShortcutHint 觸發的快捷操作（此頁僅支援查看/刪除）
const handleShortcutClick = (action: string) => {
  const state = editableTableState.value
  if (!state) return
  const rows = state.data()
  const index = state.focusedRowIndex ?? 0
  const current = rows[index]
  if (!current) return

  if (action === 'row-view') {
    editProcessing(current)
  } else if (action === 'row-delete') {
    deleteProcessing(current)
  }
}

// 過濾後的資料
const filteredProcessings = computed(() => {
  let result = processings.value

  // 搜尋過濾
  if (processingSearch.value) {
    const search = processingSearch.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(search) ||
      (p.vendor?.name || '').toLowerCase().includes(search)
    )
  }

  return result
})

// 載入資料
const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await processingService.getAll(currentPage.value, pageSize.value)
    processings.value = response.data
    total.value = response.total
  } catch (err: any) {
    error.value = err.message || '載入失敗'
  } finally {
    loading.value = false
  }
}

// 載入廠商
const loadVendors = async () => {
  try {
    const response = await vendorService.getAllWithoutPagination()
    vendors.value = response
  } catch (err: any) {
    console.error('載入廠商失敗:', err)
  }
}

// 分頁處理
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadData()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadData()
}

// 編輯加工項目
const editProcessing = (processing: Processing) => {
  editingProcessing.value = processing
  processingForm.value = {
    name: processing.name,
    vendorId: processing.vendorId,
    notes: processing.notes || '',
    displayOrder: processing.displayOrder,
  }
  showCreateModal.value = true
}

// 儲存加工項目
const saveProcessing = async () => {
  if (!processingForm.value.name) {
    alert('請輸入加工名稱')
    return
  }

  saving.value = true
  try {
    const data = {
      ...processingForm.value,
      vendorId: processingForm.value.vendorId || undefined,
    }

    if (editingProcessing.value) {
      await processingService.update(editingProcessing.value.id, data)
    } else {
      await processingService.create(data)
    }
    closeModal()
    loadData()
  } catch (err: any) {
    alert(err.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

// 刪除加工項目
const deleteProcessing = async (processing: Processing) => {
  if (!confirm(`確定要刪除「${processing.name}」嗎？此操作無法復原！`)) return
  
  try {
    await processingService.delete(processing.id)
    loadData()
  } catch (err: any) {
    alert(err.message || '刪除失敗')
  }
}

// 關閉 Modal
const closeModal = () => {
  showCreateModal.value = false
  editingProcessing.value = null
  processingForm.value = {
    name: '',
    vendorId: undefined,
    notes: '',
    displayOrder: 0,
  }
}

// 初始化
onMounted(() => {
  loadData()
  loadVendors()
})
</script>

<style scoped>
.processing-list-page {
  padding: 1.5rem;
}

.processing-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-message,
.error-message {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.error-message {
  color: var(--danger-color);
}

.vendor-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--info-bg, #e3f2fd);
  color: var(--info-color, #1976d2);
  border-radius: 4px;
  font-size: 0.85rem;
}

.internal-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--success-bg, #e8f5e9);
  color: var(--success-color, #388e3c);
  border-radius: 4px;
  font-size: 0.85rem;
}

.status-active {
  color: var(--success-color, #388e3c);
  font-weight: 500;
}

.status-inactive {
  color: var(--text-muted);
}

.inactive-text {
  color: var(--text-muted);
  text-decoration: line-through;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
}

.form-hint {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.filter-group {
  display: flex;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--secondary-bg);
  color: var(--text-primary);
}

.btn-success {
  background: var(--success-color, #388e3c);
  color: white;
}

.btn-warning {
  background: var(--warning-color, #f57c00);
  color: white;
}

.btn-danger {
  background: var(--danger-color, #d32f2f);
  color: white;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}

.btn-icon {
  margin-right: 0.5rem;
}
</style>

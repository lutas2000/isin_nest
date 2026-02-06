<template>
  <div class="processing-list-page">
    <PageHeader 
      title="加工項目管理"
      description="管理加工項目、執行廠商與顯示順序"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="btn-icon">+</span>
          新增加工項目
        </button>
      </template>
    </PageHeader>

    <!-- 快捷鍵提示 -->
    <ShortcutHint
      :table-state="editableTableState"
      @shortcut-click="handleShortcutClick"
    />

    <!-- 加工項目列表 -->
    <div class="processing-content">
      <SearchFilters
        title=""
        :show-search="true"
        search-placeholder="搜尋加工名稱..."
        v-model:search="processingSearch"
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
        <template #cell-vendorId="{ row }">
          <span v-if="row.vendor" class="vendor-badge">
            {{ row.vendor.name }}
          </span>
          <span v-else class="internal-badge">內部加工</span>
        </template>

        <template #actions="{ row, isEditing, save, cancel, startEdit }">
          <template v-if="isEditing">
            <button class="btn btn-sm btn-success" @click="save">保存</button>
            <button class="btn btn-sm btn-outline" @click="cancel">取消</button>
          </template>
          <template v-else>
            <span class="dropdown-item" @click="startEdit">編輯</span>
            <span 
              class="dropdown-item danger" 
              @click="deleteProcessing(row)"
            >
              刪除
            </span>
          </template>
        </template>
      </EditableDataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PageHeader, SearchFilters, EditableDataTable, ShortcutHint, type EditableColumn } from '@/components'
import { processingService, type Processing } from '@/services/crm/processing.service'
import { vendorService, type Vendor } from '@/services/crm/vendor.service'

// 狀態
const loading = ref(false)
const error = ref<string | null>(null)
const processings = ref<Processing[]>([])
const vendors = ref<Vendor[]>([])
const processingSearch = ref('')
const currentPage = ref(1)
const pageSize = ref(50)
const total = ref(0)
const showNewRow = ref(false)

const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null)

// 新增行模板
const newRowTemplate = () => ({
  name: '',
  vendorId: undefined as number | undefined,
  displayOrder: 0,
})

// 表格欄位定義（支援 inline 編輯）
const editableColumns = computed<EditableColumn[]>(() => [
  { key: 'name', label: '加工名稱', editable: true, required: true, type: 'text' },
  { 
    key: 'vendorId', 
    label: '執行廠商', 
    editable: true, 
    type: 'select',
    options: [
      { value: '', label: '內部加工' },
      ...vendors.value.map(v => ({ value: v.id, label: v.name })),
    ],
  },
  { key: 'displayOrder', label: '顯示順序', editable: true, type: 'number' },
])

// 提供給 ShortcutHint 使用的表格狀態
const editableTableState = computed(() => {
  const tableRef = editableTableRef.value
  if (!tableRef) return null
  return {
    focusedRowIndex: tableRef.focusedRowIndex,
    focusedFieldKey: tableRef.focusedFieldKey,
    isNewRowFocused: tableRef.isNewRowFocused,
    editingRowId: tableRef.editingRowId,
    data: () => filteredProcessings.value,
  }
})

// 處理 ShortcutHint 觸發的快捷操作
const handleShortcutClick = (action: string) => {
  const state = editableTableState.value
  if (!state || !editableTableRef.value) return
  const rows = state.data()
  const index = state.focusedRowIndex ?? 0
  const current = rows[index]
  if (!current) return

  if (action === 'row-view') {
    editableTableRef.value.startEdit(current, index)
  } else if (action === 'row-edit') {
    editableTableRef.value.startEdit(current, index)
  } else if (action === 'row-delete') {
    deleteProcessing(current)
  } else if (action === 'new-row-show') {
    showNewRow.value = true
  } else if (action === 'cancel-new-row') {
    editableTableRef.value.cancelNewRow()
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

// 處理欄位變更（僅更新本地狀態）
const handleFieldChange = () => {}

// 處理保存（編輯既有項目）
const handleSave = async (row: Processing, isNew: boolean) => {
  try {
    const rawVendorId = row.vendorId as string | number | null | undefined
    const vendorId = (rawVendorId === '' || rawVendorId == null) ? undefined : Number(rawVendorId)
    const data = {
      name: row.name,
      vendorId: vendorId || undefined,
      displayOrder: row.displayOrder ?? 0,
    }
    if (isNew) {
      await processingService.create(data)
    } else {
      await processingService.update(row.id, data)
    }
    await loadData()
  } catch (err: any) {
    alert(err.message || '儲存失敗')
  }
}

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  try {
    const rawVendorId = row.vendorId as string | number | null | undefined
    const vendorId = (rawVendorId === '' || rawVendorId == null) ? undefined : Number(rawVendorId)
    await processingService.create({
      name: row.name,
      vendorId: vendorId || undefined,
      displayOrder: row.displayOrder ?? 0,
    })
    showNewRow.value = false
    await loadData()
  } catch (err: any) {
    alert(err.message || '建立失敗')
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

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = (row: Processing) => {
  deleteProcessing(row)
}

// 處理 row-view 事件（快捷鍵觸發，進入編輯模式）
const handleRowView = (row: Processing) => {
  const index = filteredProcessings.value.findIndex(p => p.id === row.id)
  if (index >= 0) editableTableRef.value?.startEdit(row, index)
}

// 處理 row-edit 事件（快捷鍵觸發）
const handleRowEdit = () => {}

// 初始化
onMounted(() => {
  loadData()
  loadVendors()
})
</script>

<style scoped>
.processing-list-page {
  max-width: 1400px;
  margin: 0 auto;
}

.processing-content {
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

.vendor-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--primary-100);
  color: var(--primary-700);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
}

.internal-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--secondary-100);
  color: var(--secondary-700);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
}

.btn-icon {
  margin-right: 0.5rem;
}

</style>

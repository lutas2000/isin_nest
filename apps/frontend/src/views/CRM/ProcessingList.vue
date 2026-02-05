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

    <!-- 加工項目列表 -->
    <div class="processing-content">
      <SearchFilters
        title="加工項目列表"
        :show-search="true"
        search-placeholder="搜尋加工名稱..."
        v-model:search="processingSearch"
      >
        <template #filters>
          <div class="filter-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="showInactive" />
              <span>顯示停用項目</span>
            </label>
          </div>
        </template>
      </SearchFilters>

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="filteredProcessings"
        :show-actions="true"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      >
        <template #cell-name="{ row, value }">
          <span :class="{ 'inactive-text': !row.isActive }">{{ value }}</span>
        </template>

        <template #cell-vendor="{ row }">
          <span v-if="row.vendor" class="vendor-badge">
            {{ row.vendor.name }}
          </span>
          <span v-else class="internal-badge">內部加工</span>
        </template>

        <template #cell-isActive="{ row }">
          <span :class="row.isActive ? 'status-active' : 'status-inactive'">
            {{ row.isActive ? '啟用' : '停用' }}
          </span>
        </template>

        <template #actions="{ row }">
          <button class="btn btn-sm btn-primary" @click="editProcessing(row)">編輯</button>
          <button 
            v-if="row.isActive"
            class="btn btn-sm btn-warning" 
            @click="deactivateProcessing(row)"
          >
            停用
          </button>
          <button 
            v-else
            class="btn btn-sm btn-success" 
            @click="activateProcessing(row)"
          >
            啟用
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteProcessing(row)">刪除</button>
        </template>
      </DataTable>
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

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="processingForm.isActive" />
            <span>啟用</span>
          </label>
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
import DataTable from '../../components/DataTable.vue'
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
const showInactive = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const total = ref(0)

// Modal 狀態
const showCreateModal = ref(false)
const editingProcessing = ref<Processing | null>(null)
const processingForm = ref<CreateProcessingDto & { isActive: boolean }>({
  name: '',
  vendorId: null as number | undefined,
  notes: '',
  displayOrder: 0,
  isActive: true,
})

// 表格欄位定義
const tableColumns = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'name', label: '加工名稱' },
  { key: 'vendor', label: '執行廠商' },
  { key: 'displayOrder', label: '順序', width: '80px' },
  { key: 'isActive', label: '狀態', width: '100px' },
  { key: 'notes', label: '備註' },
]

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

  // 啟用/停用過濾
  if (!showInactive.value) {
    result = result.filter(p => p.isActive)
  }

  return result
})

// 載入資料
const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await processingService.getAll(currentPage.value, pageSize.value, showInactive.value)
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
    const response = await vendorService.getAllVendors()
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
    vendorId: processing.vendorId || null as any,
    notes: processing.notes || '',
    displayOrder: processing.displayOrder,
    isActive: processing.isActive,
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

// 停用加工項目
const deactivateProcessing = async (processing: Processing) => {
  if (!confirm(`確定要停用「${processing.name}」嗎？`)) return
  
  try {
    await processingService.deactivate(processing.id)
    loadData()
  } catch (err: any) {
    alert(err.message || '停用失敗')
  }
}

// 啟用加工項目
const activateProcessing = async (processing: Processing) => {
  try {
    await processingService.activate(processing.id)
    loadData()
  } catch (err: any) {
    alert(err.message || '啟用失敗')
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
    vendorId: null as any,
    notes: '',
    displayOrder: 0,
    isActive: true,
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

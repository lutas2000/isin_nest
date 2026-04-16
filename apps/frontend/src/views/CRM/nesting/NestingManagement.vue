<template>
  <div class="nesting-management-page">
    <PageHeader 
      title="排版管理"
      description="管理排版、追蹤排版進度"
    >
      <template #actions>
        <button class="btn btn-outline" @click="showImportModal = true">
          <span class="mr-2">📄</span>
          匯入排版
        </button>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="mr-2">➕</span>
          新增排版
        </button>
      </template>
    </PageHeader>

    <CrmTableContainer
      :loading="loading"
      :error="error"
      :show-search="true"
      :search="searchQuery"
      search-placeholder="搜尋排版編號或訂單..."
      @update:search="searchQuery = $event"
      @retry="loadData"
    >
      <EditableDataTable
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
            <span class="dropdown-item" @click="handleRowPrint(row)">列印</span>
            <span class="dropdown-item" @click="handleRowDelete(row)">刪除</span>
          </template>
        </template>
      </EditableDataTable>
    </CrmTableContainer>

    <NestingImportModal
      :show="showImportModal"
      @close="showImportModal = false"
      @imported="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PageHeader, EditableDataTable, CrmTableContainer, type EditableColumn } from '@/components'
import { nestingService, type Nesting } from '@/services/crm/nesting.service'
import NestingImportModal from './components/NestingImportModal.vue'
import { useRouter } from 'vue-router'
import { printNestingById } from './utils/nestingPreviewPrint'

const router = useRouter()
const loading = ref(false)
const error = ref<string | null>(null)
const nestings = ref<Nesting[]>([])
const searchQuery = ref('')
const showNewRow = ref(false)
const showImportModal = ref(false)

const columns: EditableColumn[] = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'orderId', label: '訂單編號', editable: true, required: true, type: 'text' },
  { key: 'material', label: '材料', editable: true, required: true, type: 'text' },
  { key: 'thickness', label: '厚度', editable: true, required: true, type: 'text' },
  { key: 'quantity', label: '張數', editable: true, type: 'number' },
]

const newRowTemplate = () => ({
  orderId: '',
  material: '',
  thickness: '',
  quantity: 1,
})

const filteredData = computed(() => {
  let data = [...nestings.value]
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    data = data.filter(item =>
      item.id?.toLowerCase().includes(query) ||
      item.orderId?.toLowerCase().includes(query) ||
      item.material?.toLowerCase().includes(query)
    )
  }

  return data
})

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await nestingService.getAll()
    if (response && typeof response === 'object' && 'data' in response) {
      nestings.value = response.data
    } else {
      nestings.value = response as unknown as Nesting[]
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入排版失敗'
  } finally {
    loading.value = false
  }
}

const handleSave = async (row: Nesting) => {
  try {
    await nestingService.update(row.id, row)
    await loadData()
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存排版失敗')
  }
}

const handleNewRowSave = async (row: Partial<Nesting>) => {
  try {
    await nestingService.create(row)
    showNewRow.value = false
    await loadData()
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立排版失敗')
  }
}

const handleRowDelete = async (row: Nesting) => {
  if (!confirm('確定要刪除此排版嗎？')) return
  try {
    await nestingService.delete(row.id)
    await loadData()
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除排版失敗')
  }
}

const handleRowView = (row: Nesting) => {
  router.push(`/crm/nestings/${row.id}/items`)
}

const handleRowPrint = async (row: Nesting) => {
  await printNestingById(row.id)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.nesting-management-page {
  width: 100%;
  margin: 0 auto;
}

.link {
  color: var(--primary-600);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

</style>

<template>
  <Modal
    :show="show"
    title="搜尋客戶"
    max-width-class="max-w-5xl"
    @close="handleClose"
  >
    <div
      class="flex h-[70vh] max-h-[70vh] min-h-0 flex-col gap-3"
      @keydown="handleKeydown"
    >
      <div class="space-y-2">
        <input
          id="customer-search-input"
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="輸入客戶 id、簡稱或全名..."
          autocomplete="off"
          class="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm text-secondary-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        <p class="text-xs text-secondary-500">
          ↑↓ 移動　Enter 套用　Esc 關閉
        </p>
      </div>

      <div
        class="min-h-0 flex-1 overflow-hidden [&_.table-container]:max-h-[28rem] [&_.table-container]:overflow-y-auto"
      >
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-secondary-500">
          載入中...
        </div>
        <div
          v-else-if="customers.length === 0"
          class="px-4 py-10 text-center text-sm text-secondary-500"
        >
          沒有符合的客戶
        </div>
        <EditableDataTable
          v-else
          ref="tableRef"
          :columns="columns"
          :data="customers"
          :show-actions="false"
          :editable="false"
          :dbl-click-to-edit="false"
          :pagination="total > 0"
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          :auto-focus-on-mount="false"
          @update:page="handlePageChange"
          @row-view="handleRowView"
        >
          <template #cell-companyShortName="{ value }">
            {{ value ? String(value) : '-' }}
          </template>
          <template #cell-companyName="{ value }">
            {{ value ? String(value) : '-' }}
          </template>
        </EditableDataTable>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-3 md:flex-row">
        <button class="btn btn-secondary" type="button" @click="handleClose">取消</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!canConfirm"
          @click="handleConfirm"
        >
          套用
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Modal from './Modal.vue'
import EditableDataTable, { type EditableColumn } from './EditableDataTable.vue'
import { customerService, type Customer } from '@/services/crm/customer.service'
import type { PaginatedResponse } from '@/types/pagination'

const props = defineProps<{
  show: boolean
  initialQuery?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', value: { id: string; customer: Customer | null }): void
}>()

const loading = ref(false)
const customers = ref<Customer[]>([])
const total = ref(0)
const searchQuery = ref('')
const activeIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
const tableRef = ref<(InstanceType<typeof EditableDataTable> & { focusedRowIndex: number | null }) | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)

let searchTimer: ReturnType<typeof setTimeout> | null = null
let loadSequence = 0
let ignoreNextSearchChange = false

const columns: EditableColumn[] = [
  { key: 'id', label: '客戶 id', editable: false, truncate: true },
  { key: 'companyShortName', label: '簡稱', editable: false, truncate: true, width: 'notes' },
  { key: 'companyName', label: '全名', editable: false, truncate: true, width: 'notes' },
]

const activeCustomer = computed(() => customers.value[activeIndex.value] ?? null)

const canConfirm = computed(() => !!activeCustomer.value)

const setActiveIndex = (index: number) => {
  if (customers.value.length === 0) {
    activeIndex.value = -1
    if (tableRef.value) tableRef.value.focusedRowIndex = null
    return
  }

  const max = customers.value.length - 1
  const nextIndex = Math.min(Math.max(index, 0), max)
  activeIndex.value = nextIndex
  if (tableRef.value) tableRef.value.focusedRowIndex = nextIndex
}

const clearSearchTimer = () => {
  if (!searchTimer) return
  clearTimeout(searchTimer)
  searchTimer = null
}

const extractItems = (response: Customer[] | PaginatedResponse<Customer>) => {
  if (Array.isArray(response)) {
    total.value = response.length
    return response
  }
  total.value = response.total
  return response.data
}

const loadCustomers = async () => {
  const sequence = ++loadSequence

  loading.value = true
  try {
    const trimmedQuery = searchQuery.value.trim()
    const response = await customerService.getAll(
      currentPage.value,
      pageSize.value,
      trimmedQuery || undefined,
    )
    if (sequence !== loadSequence) return

    customers.value = extractItems(response)
    await nextTick()
    setActiveIndex(0)
  } catch (err) {
    if (sequence !== loadSequence) return

    console.error('載入客戶清單失敗:', err)
    customers.value = []
    total.value = 0
    setActiveIndex(-1)
  } finally {
    if (sequence === loadSequence) {
      loading.value = false
    }
  }
}

const handleClose = () => {
  emit('close')
}

const confirmCustomer = (customer: Customer | null = activeCustomer.value) => {
  if (!customer) return
  emit('confirm', { id: customer.id, customer })
}

const handleConfirm = () => {
  confirmCustomer()
}

const handleRowView = (row: Customer) => {
  const rowIndex = customers.value.findIndex((item) => item.id === row.id)
  if (rowIndex >= 0) {
    setActiveIndex(rowIndex)
  }
  confirmCustomer(row)
}

const moveActive = async (delta: number) => {
  if (customers.value.length === 0) return
  setActiveIndex(activeIndex.value + delta)
  await nextTick()
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await loadCustomers()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return

  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
    return
  }

  const isSearchInputEvent = event.target === searchInputRef.value

  if (event.key === 'ArrowDown') {
    if (!isSearchInputEvent) return
    event.preventDefault()
    void moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    if (!isSearchInputEvent) return
    event.preventDefault()
    void moveActive(-1)
    return
  }

  if (event.key === 'Enter') {
    if (!isSearchInputEvent) return
    event.preventDefault()
    handleConfirm()
  }
}

watch(
  () => props.show,
  async (show) => {
    if (!show) {
      clearSearchTimer()
      return
    }
    const nextSearchQuery = props.initialQuery ?? ''
    ignoreNextSearchChange = nextSearchQuery !== searchQuery.value
    searchQuery.value = nextSearchQuery
    activeIndex.value = 0
    currentPage.value = 1
    await loadCustomers()
    await nextTick()
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
  },
)

watch(
  () => props.initialQuery,
  (value) => {
    if (props.show) {
      searchQuery.value = value ?? ''
    }
  },
)

watch(searchQuery, () => {
  if (!props.show) return
  if (ignoreNextSearchChange) {
    ignoreNextSearchChange = false
    return
  }

  clearSearchTimer()
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    void loadCustomers()
  }, 300)
})

watch(
  () => tableRef.value?.focusedRowIndex,
  (focusedRowIndex) => {
    if (typeof focusedRowIndex === 'number') {
      activeIndex.value = focusedRowIndex
    }
  },
)

watch(customers, () => {
  if (customers.value.length === 0) {
    setActiveIndex(-1)
  }
})
</script>

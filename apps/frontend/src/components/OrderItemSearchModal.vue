<template>
  <Modal
    :show="show"
    :title="modalTitle"
    max-width-class="max-w-7xl"
    @close="handleClose"
  >
    <div class="grid h-[70vh] max-h-[70vh] grid-cols-[minmax(0,1fr)_22rem] gap-4" @keydown="handleKeydown">
      <div class="flex min-h-0 flex-col gap-3">
        <div class="space-y-2">
          <input
            id="order-item-search-input"
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
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
          <div v-else-if="!customerId" class="px-4 py-10 text-center text-sm text-secondary-500">
            此訂單沒有客戶資料，無法搜尋歷史工件
          </div>
          <div v-else-if="items.length === 0" class="px-4 py-10 text-center text-sm text-secondary-500">
            沒有符合的歷史工件
          </div>
          <EditableDataTable
            v-else
            ref="tableRef"
            :columns="columns"
            :data="items"
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
            <template #cell-customerFile="{ value }">
              {{ value ? String(value) : '-' }}
            </template>
            <template #cell-drawingNumber="{ value }">
              {{ value ? String(value) : '-' }}
            </template>
            <template #cell-orderId="{ value }">
              {{ value ? String(value) : '-' }}
            </template>
          </EditableDataTable>
        </div>
      </div>

      <DxfPreviewPanel
        class="h-full min-h-0"
        :order-item-id="activeItem?.id ?? null"
        suppress-api-error
      />
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
import DxfPreviewPanel from './DxfPreviewPanel.vue'
import EditableDataTable, { type EditableColumn } from './EditableDataTable.vue'
import { orderItemService, type OrderItem } from '@/services/crm/order.service'
import type { PaginatedResponse } from '@/types/pagination'

export type OrderItemSearchMode = 'customerFile' | 'drawingNumber'

const props = withDefaults(
  defineProps<{
    show: boolean
    customerId?: string | null
    initialQuery?: string
    searchMode?: OrderItemSearchMode
  }>(),
  {
    searchMode: 'customerFile',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', value: { customerFile: string; drawingNumber: string; item: OrderItem | null }): void
}>()

const loading = ref(false)
const items = ref<OrderItem[]>([])
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
  { key: 'customerFile', label: '客戶型號', editable: false, truncate: true, width: 'notes' },
  { key: 'drawingNumber', label: '電腦圖號', editable: false, truncate: true, width: 'notes' },
  { key: 'orderId', label: '訂單編號', editable: false, truncate: true },
]

const modalTitle = computed(() =>
  props.searchMode === 'drawingNumber' ? '搜尋電腦圖號' : '搜尋客戶型號',
)

const searchPlaceholder = computed(() =>
  props.searchMode === 'drawingNumber' ? '輸入電腦圖號...' : '輸入客戶型號...',
)

const activeItem = computed(() => items.value[activeIndex.value] ?? null)

const canConfirm = computed(() => {
  if (activeItem.value) return true
  return searchQuery.value.trim().length > 0
})

const setActiveIndex = (index: number) => {
  if (items.value.length === 0) {
    activeIndex.value = -1
    if (tableRef.value) tableRef.value.focusedRowIndex = null
    return
  }

  const max = items.value.length - 1
  const nextIndex = Math.min(Math.max(index, 0), max)
  activeIndex.value = nextIndex
  if (tableRef.value) tableRef.value.focusedRowIndex = nextIndex
}

const clearSearchTimer = () => {
  if (!searchTimer) return
  clearTimeout(searchTimer)
  searchTimer = null
}

const extractItems = (response: OrderItem[] | PaginatedResponse<OrderItem>) => {
  if (Array.isArray(response)) {
    total.value = response.length
    return response
  }
  total.value = response.total
  return response.data
}

const buildFilters = () => {
  const trimmedQuery = searchQuery.value.trim()
  const filters: {
    customerId: string
    customerFile?: string
    drawingNumber?: string
  } = {
    customerId: props.customerId!,
  }

  if (trimmedQuery) {
    if (props.searchMode === 'drawingNumber') {
      filters.drawingNumber = trimmedQuery
    } else {
      filters.customerFile = trimmedQuery
    }
  }

  return filters
}

const loadItems = async () => {
  const sequence = ++loadSequence

  if (!props.customerId) {
    items.value = []
    total.value = 0
    setActiveIndex(-1)
    return
  }

  loading.value = true
  try {
    const response = await orderItemService.getAll(
      undefined,
      currentPage.value,
      pageSize.value,
      buildFilters(),
    )
    if (sequence !== loadSequence) return

    items.value = extractItems(response)
    await nextTick()
    setActiveIndex(0)
  } catch (err) {
    if (sequence !== loadSequence) return

    console.error('載入歷史工件清單失敗:', err)
    items.value = []
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

const buildConfirmPayload = (item: OrderItem | null = activeItem.value) => {
  if (item) {
    return {
      customerFile: item.customerFile?.trim() ?? '',
      drawingNumber: item.drawingNumber?.trim() ?? '',
      item,
    }
  }

  const query = searchQuery.value.trim()
  if (!query) return null

  if (props.searchMode === 'drawingNumber') {
    return {
      customerFile: '',
      drawingNumber: query,
      item: null,
    }
  }

  return {
    customerFile: query,
    drawingNumber: '',
    item: null,
  }
}

const confirmItem = (item: OrderItem | null = activeItem.value) => {
  const payload = buildConfirmPayload(item)
  if (!payload) return
  emit('confirm', payload)
}

const handleConfirm = () => {
  confirmItem()
}

const handleRowView = (row: OrderItem) => {
  const rowIndex = items.value.findIndex((item) => item.id === row.id)
  if (rowIndex >= 0) {
    setActiveIndex(rowIndex)
  }
  confirmItem(row)
}

const moveActive = async (delta: number) => {
  if (items.value.length === 0) return
  setActiveIndex(activeIndex.value + delta)
  await nextTick()
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await loadItems()
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
    await loadItems()
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

watch(
  () => props.searchMode,
  () => {
    if (!props.show) return
    currentPage.value = 1
    void loadItems()
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
    void loadItems()
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

watch(items, () => {
  if (items.value.length === 0) {
    setActiveIndex(-1)
  }
})
</script>

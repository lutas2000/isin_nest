<template>
  <Modal
    :show="show"
    title="搜尋客戶型號"
    max-width-class="max-w-5xl"
    @close="handleClose"
  >
    <div class="grid max-h-[70vh] grid-cols-[minmax(0,1fr)_22rem] gap-4 md:grid-cols-1" @keydown="handleKeydown">
      <div class="flex min-h-0 flex-col gap-3">
        <div class="space-y-2">
          <input
            id="customer-model-search-input"
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="輸入客戶型號..."
            autocomplete="off"
            class="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm text-secondary-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <p class="text-xs text-secondary-500">
            ↑↓ 移動　Enter 套用客戶型號　Esc 關閉
          </p>
        </div>

        <div
          ref="listRef"
          class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-secondary-200"
        >
          <div v-if="loading" class="px-4 py-10 text-center text-sm text-secondary-500">
            載入中...
          </div>
          <div v-else-if="!customerId" class="px-4 py-10 text-center text-sm text-secondary-500">
            此訂單沒有客戶資料，無法搜尋客戶型號
          </div>
          <div v-else-if="filteredItems.length === 0" class="px-4 py-10 text-center text-sm text-secondary-500">
            沒有符合的歷史工件
          </div>
          <button
            v-for="(item, index) in filteredItems"
            :key="item.id"
            type="button"
            :ref="el => setItemRef(item.id, el)"
            :class="[
              'grid w-full grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem] gap-3 border-b border-secondary-100 px-4 py-3 text-left transition last:border-b-0 md:grid-cols-1 md:gap-1',
              activeIndex === index ? 'bg-primary-50 ring-1 ring-inset ring-primary-200' : 'bg-white hover:bg-secondary-50',
            ]"
            @mouseenter="activeIndex = index"
            @click="activeIndex = index"
            @dblclick="handleConfirm"
          >
            <span class="min-w-0">
              <span class="block text-xs text-secondary-500">客戶型號</span>
              <span class="block truncate text-sm font-medium text-secondary-900">
                {{ item.customerFile || '-' }}
              </span>
            </span>
            <span class="min-w-0">
              <span class="block text-xs text-secondary-500">電腦圖號</span>
              <span class="block truncate text-sm text-secondary-800">
                {{ item.cadFile || '-' }}
              </span>
            </span>
            <span class="min-w-0">
              <span class="block text-xs text-secondary-500">訂單編號</span>
              <span class="block truncate text-sm text-secondary-800">
                {{ item.orderId || '-' }}
              </span>
            </span>
          </button>
        </div>

        <p v-if="total > items.length" class="text-xs text-secondary-500">
          目前顯示前 {{ items.length }} 筆，共 {{ total }} 筆。
        </p>
      </div>

      <DxfPreviewPanel
        class="min-h-[28rem]"
        :order-item-id="activeItem?.id ?? null"
      />
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-3 md:flex-row">
        <button class="btn btn-secondary" type="button" @click="handleClose">取消</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!confirmValue"
          @click="handleConfirm"
        >
          套用客戶型號
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Modal from './Modal.vue'
import DxfPreviewPanel from './DxfPreviewPanel.vue'
import { orderItemService, type OrderItem } from '@/services/crm/order.service'
import type { PaginatedResponse } from '@/types/pagination'

const props = defineProps<{
  show: boolean
  customerId?: string | null
  initialQuery?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', value: { customerFile: string; item: OrderItem | null }): void
}>()

const loading = ref(false)
const items = ref<OrderItem[]>([])
const total = ref(0)
const searchQuery = ref('')
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const itemRefs = ref<Record<number, HTMLElement>>({})

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? ''

const filteredItems = computed(() => {
  const keyword = normalize(searchQuery.value)
  const sortedItems = [...items.value].sort((a, b) => {
    const aCad = a.cadFile?.trim() || '\uffff'
    const bCad = b.cadFile?.trim() || '\uffff'
    return aCad.localeCompare(bCad, 'zh-TW', { numeric: true })
  })

  if (!keyword) return sortedItems

  return sortedItems.filter((item) => {
    return normalize(item.customerFile).includes(keyword)
  })
})

const activeItem = computed(() => filteredItems.value[activeIndex.value] ?? null)
const confirmValue = computed(() => activeItem.value?.customerFile?.trim() || searchQuery.value.trim())

const setItemRef = (id: number, el: unknown) => {
  if (el instanceof HTMLElement) {
    itemRefs.value[id] = el
    return
  }
  delete itemRefs.value[id]
}

const syncActiveIndex = (preferredIndex = 0) => {
  if (filteredItems.value.length === 0) {
    activeIndex.value = -1
    return
  }
  const max = filteredItems.value.length - 1
  activeIndex.value = Math.min(Math.max(preferredIndex, 0), max)
}

const scrollActiveIntoView = () => {
  const item = activeItem.value
  if (!item || !listRef.value) return
  const element = itemRefs.value[item.id]
  element?.scrollIntoView({ block: 'nearest' })
}

const extractItems = (response: OrderItem[] | PaginatedResponse<OrderItem>) => {
  if (Array.isArray(response)) {
    total.value = response.length
    return response
  }
  total.value = response.total
  return response.data
}

const loadItems = async () => {
  if (!props.customerId) {
    items.value = []
    total.value = 0
    return
  }

  loading.value = true
  try {
    const response = await orderItemService.getAll(undefined, 1, 100, {
      customerId: props.customerId,
    })
    items.value = extractItems(response)
    syncActiveIndex(0)
    await nextTick()
    scrollActiveIntoView()
  } catch (err) {
    console.error('載入客戶型號清單失敗:', err)
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('close')
}

const handleConfirm = () => {
  const value = confirmValue.value
  if (!value) return
  emit('confirm', {
    customerFile: value,
    item: activeItem.value,
  })
}

const moveActive = async (delta: number) => {
  if (filteredItems.value.length === 0) return
  const max = filteredItems.value.length - 1
  activeIndex.value = Math.min(Math.max(activeIndex.value + delta, 0), max)
  await nextTick()
  scrollActiveIntoView()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return

  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    void moveActive(-1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    handleConfirm()
  }
}

watch(
  () => props.show,
  async (show) => {
    if (!show) return
    searchQuery.value = props.initialQuery ?? ''
    activeIndex.value = 0
    itemRefs.value = {}
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

watch(filteredItems, async () => {
  syncActiveIndex(activeIndex.value)
  await nextTick()
  scrollActiveIntoView()
})
</script>

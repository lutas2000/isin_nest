<template>
  <Modal :show="show" title="選擇加工項目" @close="handleClose">
    <div class="flex max-h-[60vh] flex-col gap-4" @keydown="handleKeydown">
      <div class="space-y-2">
        <label for="processing-search-input" class="text-sm font-medium text-secondary-700">
          搜尋加工（名稱 / 代碼）
        </label>
        <input
          id="processing-search-input"
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="輸入名稱或代碼..."
          autocomplete="off"
          class="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm text-secondary-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        <p class="text-xs text-secondary-500">
          ↑↓ 移動　Space 勾選/取消　Enter 儲存　Esc 關閉
        </p>
      </div>

      <div
        ref="listRef"
        class="overflow-y-auto rounded-lg border border-secondary-200"
      >
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-secondary-500">
          載入中...
        </div>
        <div v-else-if="filteredProcessings.length === 0" class="px-4 py-10 text-center text-sm text-secondary-500">
          沒有符合的加工項目
        </div>
        <button
          v-for="(processing, index) in filteredProcessings"
          :key="processing.id"
          type="button"
          :ref="el => setItemRef(processing.id, el)"
          :class="[
            'flex w-full items-start gap-3 border-b border-secondary-100 px-4 py-3 text-left transition last:border-b-0',
            activeIndex === index ? 'bg-primary-50 ring-1 ring-inset ring-primary-200' : 'bg-white hover:bg-secondary-50',
          ]"
          @mouseenter="activeIndex = index"
          @click="toggleSelection(processing)"
        >
          <span
            class="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded border text-xs font-semibold"
            :class="isSelected(processing.id)
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-secondary-300 bg-white text-transparent'"
          >
            ✓
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-secondary-900">
              {{ processing.name }}
            </span>
            <span class="mt-1 block text-xs text-secondary-500">
              代碼：{{ processing.code || '-' }}
              <span class="mx-1 text-secondary-300">|</span>
              {{ processing.vendor ? `委外：${processing.vendor.name}` : '內部加工' }}
            </span>
          </span>
        </button>
      </div>

      <div v-if="selectedProcessings.length > 0" class="rounded-lg bg-secondary-50 p-3">
        <p class="mb-2 text-xs font-medium text-secondary-600">
          已選擇（{{ selectedProcessings.length }}）
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="processing in selectedProcessings"
            :key="processing.id"
            type="button"
            class="inline-flex items-center gap-1 rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
            @click="removeSelection(processing.id)"
          >
            {{ processing.name }}
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" type="button" @click="handleClose">取消</button>
      <button
        v-if="selectedProcessings.length > 0"
        class="btn btn-outline"
        type="button"
        @click="handleClear"
      >
        清除
      </button>
      <button class="btn btn-primary" type="button" @click="handleConfirm">
        確定（{{ selectedProcessings.length }}）
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Modal from './Modal.vue'
import { processingService, type Processing } from '../services/crm/processing.service'

const props = defineProps<{
  show: boolean
  modelValue: number[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number[]): void
  (e: 'close'): void
  (e: 'confirm', value: { ids: number[]; processings: Processing[] }): void
}>()

const loading = ref(false)
const allProcessings = ref<Processing[]>([])
const selectedIds = ref<number[]>([])
const searchQuery = ref('')
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const itemRefs = ref<Record<number, HTMLElement>>({})

const filteredProcessings = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) {
    return allProcessings.value
  }
  return allProcessings.value.filter((processing) => {
    const name = processing.name?.toLowerCase() ?? ''
    const code = processing.code?.toLowerCase() ?? ''
    const vendor = processing.vendor?.name?.toLowerCase() ?? ''
    return name.includes(keyword) || code.includes(keyword) || vendor.includes(keyword)
  })
})

const selectedProcessings = computed(() => {
  return allProcessings.value.filter((processing) => selectedIds.value.includes(processing.id))
})

const isSelected = (id: number) => selectedIds.value.includes(id)

const setItemRef = (id: number, el: unknown) => {
  if (el instanceof HTMLElement) {
    itemRefs.value[id] = el
    return
  }
  delete itemRefs.value[id]
}

const syncActiveIndex = (preferredIndex = 0) => {
  if (filteredProcessings.value.length === 0) {
    activeIndex.value = -1
    return
  }
  const max = filteredProcessings.value.length - 1
  activeIndex.value = Math.min(Math.max(preferredIndex, 0), max)
}

const scrollActiveIntoView = () => {
  const activeItem = filteredProcessings.value[activeIndex.value]
  if (!activeItem || !listRef.value) {
    return
  }
  const element = itemRefs.value[activeItem.id]
  if (!element) {
    return
  }
  element.scrollIntoView({ block: 'nearest' })
}

const toggleSelection = (processing: Processing) => {
  const index = selectedIds.value.indexOf(processing.id)
  if (index === -1) {
    selectedIds.value = [...selectedIds.value, processing.id]
    return
  }
  selectedIds.value = selectedIds.value.filter((id) => id !== processing.id)
}

const removeSelection = (id: number) => {
  selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id)
}

const toggleActiveSelection = () => {
  const activeItem = filteredProcessings.value[activeIndex.value]
  if (!activeItem) {
    return
  }
  toggleSelection(activeItem)
}

const loadProcessings = async () => {
  loading.value = true
  try {
    const data = await processingService.getAllActive()
    allProcessings.value = data
  } catch (err) {
    console.error('載入加工項目失敗:', err)
  } finally {
    loading.value = false
  }
}

const focusSearchInput = async () => {
  await nextTick()
  searchInputRef.value?.focus()
  searchInputRef.value?.select()
}

const openModalSetup = async () => {
  searchQuery.value = ''
  selectedIds.value = [...(props.modelValue || [])]
  syncActiveIndex(0)
  await loadProcessings()
  syncActiveIndex(0)
  await focusSearchInput()
  scrollActiveIntoView()
}

const handleClose = () => {
  emit('close')
}

const handleClear = () => {
  selectedIds.value = []
}

const handleConfirm = () => {
  emit('update:modelValue', [...selectedIds.value])
  emit('confirm', {
    ids: [...selectedIds.value],
    processings: [...selectedProcessings.value],
  })
  emit('close')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.show) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key === 'ArrowDown') {
    if (filteredProcessings.value.length === 0) {
      return
    }
    event.preventDefault()
    syncActiveIndex(activeIndex.value + 1)
    nextTick(scrollActiveIntoView)
    return
  }

  if (event.key === 'ArrowUp') {
    if (filteredProcessings.value.length === 0) {
      return
    }
    event.preventDefault()
    syncActiveIndex(activeIndex.value - 1)
    nextTick(scrollActiveIntoView)
    return
  }

  if (event.key === ' ' || event.code === 'Space') {
    if (filteredProcessings.value.length === 0) {
      return
    }
    event.preventDefault()
    toggleActiveSelection()
    return
  }

  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    handleConfirm()
  }
}

watch(
  () => props.show,
  (show) => {
    if (!show) {
      return
    }
    void openModalSetup()
  },
)

watch(
  () => props.modelValue,
  (value) => {
    if (!props.show) {
      return
    }
    selectedIds.value = [...(value || [])]
  },
  { deep: true },
)

watch(
  () => searchQuery.value,
  () => {
    syncActiveIndex(0)
    nextTick(scrollActiveIntoView)
  },
)

watch(
  () => filteredProcessings.value.length,
  () => {
    syncActiveIndex(activeIndex.value)
    nextTick(scrollActiveIntoView)
  },
)

onMounted(() => {
  if (props.show) {
    void openModalSetup()
  }
})
</script>

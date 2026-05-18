<template>
  <div class="flex h-full min-h-72 flex-col overflow-hidden rounded-lg border border-secondary-200 bg-white">
    <div class="border-b border-secondary-200 px-4 py-3">
      <p class="text-sm font-medium text-secondary-900">{{ title }}</p>
      <p v-if="fileName" class="mt-1 truncate text-xs text-secondary-500">{{ fileName }}</p>
      <p v-if="dimensionsLabel" class="mt-1 text-xs text-secondary-600">{{ dimensionsLabel }}</p>
    </div>

    <div class="flex min-h-0 flex-1 items-center justify-center bg-secondary-50 p-4">
      <div v-if="loading" class="text-sm text-secondary-500">DXF 預覽載入中...</div>
      <img
        v-else-if="imageDataUrl"
        :src="imageDataUrl"
        alt="DXF preview"
        class="max-h-full max-w-full object-contain"
      />
      <div v-else class="text-center text-sm text-secondary-500">
        <p>{{ emptyText }}</p>
        <p v-if="!orderItemId" class="mt-1 text-xs">請先選擇一筆工件</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { orderItemService } from '@/services/crm/order.service'
import { renderDxfContentToDataUrl } from '@/utils/dxfPreviewRender'

const props = withDefaults(defineProps<{
  orderItemId: number | null
  title?: string
  emptyText?: string
  /** 為 true 時 API 失敗不觸發全域錯誤彈窗（仍顯示空白預覽） */
  suppressApiError?: boolean
}>(), {
  title: 'DXF 預覽',
  emptyText: '沒有可預覽的 DXF',
  suppressApiError: false,
})

const loading = ref(false)
const imageDataUrl = ref<string | null>(null)
const fileName = ref('')
const width = ref<number | null>(null)
const height = ref<number | null>(null)
let requestToken = 0

const dimensionsLabel = computed(() => {
  const w = width.value
  const h = height.value
  if (typeof w !== 'number' || typeof h !== 'number' || Number.isNaN(w) || Number.isNaN(h)) {
    return ''
  }
  return `W ${w.toFixed(3)} × H ${h.toFixed(3)} mm`
})

watch(
  () => props.orderItemId,
  async (orderItemId) => {
    const token = ++requestToken
    imageDataUrl.value = null
    fileName.value = ''
    width.value = null
    height.value = null

    if (!orderItemId) {
      loading.value = false
      return
    }

    loading.value = true
    try {
      const preview = await orderItemService.getDxfPreview(orderItemId, {
        silent: props.suppressApiError,
      })
      const rendered = await renderDxfContentToDataUrl(preview.content, {
        width: 360,
        height: 240,
      })

      if (token !== requestToken) return
      imageDataUrl.value = rendered.imageDataUrl
      fileName.value = preview.fileName
      width.value = rendered.width
      height.value = rendered.height
    } catch (err) {
      console.warn(`載入 DXF preview 失敗 (itemId=${orderItemId}):`, err)
      if (token !== requestToken) return
      imageDataUrl.value = null
      fileName.value = ''
      width.value = null
      height.value = null
    } finally {
      if (token === requestToken) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)
</script>

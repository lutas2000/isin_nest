<template>
  <div class="flex h-full min-h-72 flex-col overflow-hidden rounded-lg border border-secondary-200 bg-white">
    <div class="border-b border-secondary-200 px-4 py-3">
      <p class="text-sm font-medium text-secondary-900">{{ title }}</p>
      <p v-if="fileName" class="mt-1 truncate text-xs text-secondary-500">{{ fileName }}</p>
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
import { ref, watch } from 'vue'
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
let requestToken = 0

watch(
  () => props.orderItemId,
  async (orderItemId) => {
    const token = ++requestToken
    imageDataUrl.value = null
    fileName.value = ''

    if (!orderItemId) {
      loading.value = false
      return
    }

    loading.value = true
    try {
      const preview = await orderItemService.getDxfPreview(orderItemId, {
        silent: props.suppressApiError,
      })
      const dataUrl = await renderDxfContentToDataUrl(preview.content, {
        width: 360,
        height: 240,
      })

      if (token !== requestToken) return
      imageDataUrl.value = dataUrl
      fileName.value = preview.fileName
    } catch (err) {
      console.warn(`載入 DXF preview 失敗 (itemId=${orderItemId}):`, err)
      if (token !== requestToken) return
      imageDataUrl.value = null
      fileName.value = ''
    } finally {
      if (token === requestToken) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex h-full min-h-72 flex-col overflow-hidden rounded-lg border border-secondary-200 bg-white">
    <div class="border-b border-secondary-200 px-4 py-3">
      <p class="text-sm font-medium text-secondary-900">{{ title }}</p>
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
  /** 尺寸標籤字體大小（px） */
  fontSize?: number
  /** 尺寸標籤字體粗細，例如 400、600、'bold' */
  fontWeight?: number | string
}>(), {
  title: 'DXF 預覽',
  emptyText: '沒有可預覽的 DXF',
  suppressApiError: false,
})

const loading = ref(false)
const imageDataUrl = ref<string | null>(null)
let requestToken = 0

watch(
  () => [props.orderItemId, props.fontSize, props.fontWeight] as const,
  async ([orderItemId]) => {
    const token = ++requestToken
    imageDataUrl.value = null

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
        fontSize: props.fontSize,
        fontWeight: props.fontWeight,
      })

      if (token !== requestToken) return
      imageDataUrl.value = rendered.imageDataUrl
    } catch (err) {
      console.warn(`載入 DXF preview 失敗 (itemId=${orderItemId}):`, err)
      if (token !== requestToken) return
      imageDataUrl.value = null
    } finally {
      if (token === requestToken) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)
</script>

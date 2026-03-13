<template>
  <div class="preview-card">
    <button
      type="button"
      class="preview-toggle"
      :aria-expanded="previewExpanded"
      @click="previewExpanded = !previewExpanded"
    >
      <span class="preview-title">Preview</span>
      <span class="preview-chevron">{{ previewExpanded ? '▼' : '▶' }}</span>
    </button>
    <div v-show="previewExpanded" class="preview-body">
      <div
        v-if="previewDocxBlob"
        ref="previewContainerRef"
        class="preview-docx-wrap"
      />
      <p v-else-if="previewLoaded && !previewDocxBlob" class="preview-empty">
        無預覽檔案
      </p>
      <p v-else class="preview-loading">載入預覽中…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { renderAsync } from 'docx-preview'
import { nestingService } from '@/services/crm/nesting.service'
import { printNestingPreviewElement } from '../utils/nestingPreviewPrint'

interface Props {
  nestingId?: string
}

const props = defineProps<Props>()

const previewExpanded = ref(true)
const previewDocxBlob = ref<Blob | null>(null)
const previewLoaded = ref(false)
const previewContainerRef = ref<HTMLElement | null>(null)

const loadPreview = async (nestingId: string) => {
  previewLoaded.value = false
  previewDocxBlob.value = null
  const blob = await nestingService.getPreviewDocx(nestingId)
  previewDocxBlob.value = blob
  previewLoaded.value = true
}

watch(() => props.nestingId, (nestingId) => {
  if (nestingId) {
    loadPreview(nestingId)
  } else {
    previewLoaded.value = true
    previewDocxBlob.value = null
  }
}, { immediate: true })

watch(previewDocxBlob, (blob) => {
  if (!blob) return
  nextTick(() => {
    const el = previewContainerRef.value
    if (!el) return
    el.innerHTML = ''
    renderAsync(blob, el, undefined, { useBase64URL: true }).catch(() => {
      el.innerHTML = '<p class="preview-empty">預覽渲染失敗</p>'
    })
  })
})

const print = () => {
  if (!props.nestingId) {
    alert('缺少排版編號，無法列印')
    return
  }

  if (!previewDocxBlob.value) {
    alert('目前沒有可列印的預覽內容')
    return
  }

  const previewEl = previewContainerRef.value
  if (!previewEl) {
    alert('預覽尚未完成，請稍後再試')
    return
  }

  printNestingPreviewElement(previewEl, `排版預覽 - ${props.nestingId}`)
}

defineExpose({
  print,
})
</script>

<style scoped>
.preview-card {
  margin-top: 1rem;
  margin-bottom: 1rem;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.preview-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--secondary-50);
  border: none;
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--secondary-800);
  text-align: left;
}

.preview-toggle:hover {
  background: var(--secondary-100);
}

.preview-title {
  flex: 1;
}

.preview-chevron {
  color: var(--secondary-500);
}

.preview-body {
  padding: 0.5rem;
  border-top: 1px solid var(--secondary-200);
}

.preview-docx-wrap {
  width: 100%;
  min-height: 320px;
  max-height: 70vh;
  overflow: auto;
  border: 1px solid var(--secondary-200);
  border-radius: var(--border-radius);
  padding: 1rem;
  background: #fff;
}

.preview-docx-wrap :deep(.docx-wrapper) {
  background: #fff;
}

.preview-docx-wrap :deep(img) {
  max-width: 100% !important;
  object-fit: cover;
}

.preview-empty,
.preview-loading {
  padding: 1rem;
  color: var(--secondary-600);
  margin: 0;
}
</style>

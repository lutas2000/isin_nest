<template>
  <div class="nesting-items-page" v-if="nesting">
    <PageHeader
      :title="`排版詳情 - ${nesting.id}`"
      description="查看此排版中的所有工件"
    >
      <template #actions>
        <button v-if="nesting" class="btn btn-primary" @click="handlePrint">
          <span class="btn-icon">🖨️</span>
          列印
        </button>
        <router-link to="/crm/nestings" class="btn btn-outline">
          返回排版列表
        </router-link>
      </template>
    </PageHeader>

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

    <div class="summary-card">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">排版編號</span>
          <span class="value">{{ nesting.id }}</span>
        </div>
        <div class="summary-item">
          <span class="label">訂單編號</span>
          <span class="value">{{ nesting.orderId }}</span>
        </div>
        <div class="summary-item">
          <span class="label">材料</span>
          <span class="value">{{ nesting.material }}</span>
        </div>
        <div class="summary-item">
          <span class="label">厚度</span>
          <span class="value">{{ nesting.thickness }}</span>
        </div>
        <div class="summary-item">
          <span class="label">張數</span>
          <span class="value">{{ nesting.quantity }}</span>
        </div>
        <div class="summary-item">
          <span class="label">加工時間（秒）</span>
          <span class="value">{{ nesting.processingTime ?? '-' }}</span>
        </div>
      </div>
    </div>

    <div class="table-card">
      <table class="items-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>X</th>
            <th>Y</th>
            <th>加工時間</th>
            <th>數量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!nesting.nestingItems || nesting.nestingItems.length === 0">
            <td colspan="5" class="empty-cell">尚無排版工件</td>
          </tr>
          <tr v-for="item in nesting.nestingItems" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.x ?? '-' }}</td>
            <td>{{ item.y ?? '-' }}</td>
            <td>{{ formatSeconds(item.processingTime) }}</td>
            <td>{{ item.quantity }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
  <div v-else class="loading-message">
    載入中...
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { renderAsync } from 'docx-preview'
import { PageHeader } from '@/components'
import { nestingService, type Nesting } from '@/services/crm/nesting.service'

const route = useRoute()
const nesting = ref<Nesting | null>(null)
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

const loadData = async () => {
  const id = route.params.id as string
  nesting.value = await nestingService.getById(id)
}

watch(nesting, (n) => {
  if (n?.id) loadPreview(n.id)
}, { immediate: true })

const formatSeconds = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const getHeadStyles = () => {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n')
}

const handlePrint = () => {
  const previewEl = previewContainerRef.value
  if (!previewEl || !previewDocxBlob.value) {
    alert('目前沒有可列印的預覽內容')
    return
  }

  const previewContent = previewEl.innerHTML
  if (!previewContent.trim()) {
    alert('預覽尚未完成，請稍後再試')
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('無法開啟列印視窗，請檢查瀏覽器彈出視窗設定')
    return
  }

  const title = `排版預覽 - ${nesting.value?.id || ''}`
  const styles = getHeadStyles()
  const printOnlyStyles = `
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }

      /* Preview 容器原本是可捲動區塊，列印時要展開完整內容 */
      .preview-docx-wrap {
        max-height: none !important;
        min-height: auto !important;
        overflow: visible !important;
      }

      /* 避免外框與 padding 壓縮可列印寬度，導致右側表格超出 */
      .preview-docx-wrap,
      .preview-docx-wrap.docx-wrapper {
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .preview-docx-wrap .docx-wrapper {
        padding: 0 !important;
        background: #fff !important;
      }

      .preview-docx-wrap .docx {
        box-shadow: none !important;
        margin: 0 auto !important;
        max-width: 100% !important;
      }
    </style>
  `

  const previewHtml = previewEl.outerHTML

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        ${styles}
        ${printOnlyStyles}
      </head>
      <body>
        ${previewHtml}
      </body>
    </html>
  `)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.nesting-items-page {
  max-width: 1200px;
  margin: 0 auto;
}

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

.summary-card {
  margin-top: 1rem;
  margin-bottom: 1rem;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-item .label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.summary-item .value {
  font-size: var(--font-size-base);
  color: var(--secondary-900);
}

.table-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.items-table th {
  background: var(--secondary-50);
  font-weight: 600;
  color: var(--secondary-800);
}

.empty-cell {
  text-align: center;
  color: var(--secondary-500);
}

.loading-message {
  padding: 2rem;
  text-align: center;
}

.btn-icon {
  margin-right: 0.5rem;
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

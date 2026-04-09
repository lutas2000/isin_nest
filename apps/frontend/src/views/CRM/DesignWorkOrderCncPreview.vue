<template>
  <div class="design-work-order-cnc-preview-page">
    <PageHeader
      title="CNC 檔案預覽"
      :description="previewDescription"
    >
      <template #actions>
        <button class="btn btn-outline" @click="goBackToList">
          返回設計工作單
        </button>
      </template>
    </PageHeader>

    <div class="preview-card">
      <div v-if="loading" class="loading-message">CNC 檔案載入中...</div>
      <div v-else-if="error" class="error-block">
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="goBackToList">返回設計工作單</button>
      </div>
      <template v-else>
        <div class="meta-panel">
          <div class="meta-item">
            <span class="meta-label">圖號</span>
            <span class="meta-value">{{ previewData?.drawingNumber || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">檔案</span>
            <span class="meta-value">{{ previewData?.fileName || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">總寬</span>
            <span class="meta-value">{{ formatSize(previewData?.width) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">總高</span>
            <span class="meta-value">{{ formatSize(previewData?.height) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">視圖</span>
            <span class="meta-value">2D</span>
          </div>
        </div>

        <div class="preview-wrapper">
          <canvas ref="canvasRef" class="preview-canvas" tabindex="0"></canvas>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// @ts-expect-error transitive dep from gcode-preview, no type declarations
import { Box3, Vector3 } from 'three'
import { init, type WebGLPreview } from 'gcode-preview'
import { PageHeader } from '@/components'
import { designWorkOrderService, type DesignWorkOrderCncPreview } from '@/services/crm/design-work-order.service'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const previewData = ref<DesignWorkOrderCncPreview | null>(null)
let preview: WebGLPreview | null = null
let destroyed = false

const previewDescription = computed(() => {
  if (previewData.value?.drawingNumber) {
    return `圖號 ${previewData.value.drawingNumber} 的 CNC 2D 預覽`
  }
  return '顯示 CNC 檔案 2D 預覽與總寬高'
})

const formatSize = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(3)} mm`
}

const apply2DCamera = () => {
  if (!preview || !canvasRef.value) return

  const box = new Box3().setFromObject(preview.scene)
  if (box.isEmpty()) return

  const center = new Vector3()
  const size = new Vector3()
  box.getCenter(center)
  box.getSize(size)

  const fovRad = preview.camera.fov * Math.PI / 180
  const halfTan = Math.tan(fovRad / 2)
  const aspect = canvasRef.value.clientWidth / canvasRef.value.clientHeight

  const distForZ = (size.z / 2) / halfTan
  const distForX = (size.x / 2) / (halfTan * aspect)
  const distance = Math.max(distForZ, distForX, 1) * 1.15

  if (distance > preview.camera.far * 0.8) {
    preview.camera.far = distance * 3
    preview.camera.updateProjectionMatrix()
  }

  preview.camera.position.set(center.x, center.y + distance, center.z)
  preview.controls.target.set(center.x, center.y, center.z)
  preview.controls.enableRotate = false
  preview.controls.minPolarAngle = 0
  preview.controls.maxPolarAngle = 0
  preview.controls.update()
}

const renderPreview = async (content: string) => {
  await nextTick()
  if (destroyed) return
  if (!canvasRef.value) {
    // 如果畫布尚未準備好，就稍後再嘗試一次，不直接丟錯
    setTimeout(() => {
      if (!destroyed && canvasRef.value) {
        renderPreview(content)
      }
    }, 50)
    return
  }
  preview?.dispose()
  preview = init({
    canvas: canvasRef.value,
    renderTravel: true,
    renderTubes: true,
    lineWidth: 2,
    initialCameraPosition: [0, 1000, 0.001],
  })
  preview.processGCode(content)
  apply2DCamera()
}

const loadPreview = async () => {
  loading.value = true
  error.value = null
  try {
    const id = Number(route.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      throw new Error('無效的設計工作單 ID')
    }

    const data = await designWorkOrderService.getCncPreview(id)
    previewData.value = data
    await renderPreview(data.content)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入 CNC 預覽失敗'
  } finally {
    loading.value = false
  }
}

const goBackToList = () => {
  router.push('/crm/design-work-orders')
}

onMounted(() => {
  loadPreview()
})

onBeforeUnmount(() => {
  destroyed = true
  preview?.dispose()
  preview = null
})
</script>

<style scoped>
.design-work-order-cnc-preview-page {
  width: 100%;
  margin: 0 auto;
}

.preview-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.loading-message {
  padding: 2rem;
  text-align: center;
}

.error-block {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--danger-600);
  background: var(--danger-50);
}

.meta-panel {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--secondary-200);
  background: var(--secondary-50);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--secondary-600);
}

.meta-value {
  font-weight: 600;
  color: var(--secondary-900);
}

.preview-wrapper {
  height: min(70vh, 820px);
  min-height: 420px;
  padding: 1rem;
}

.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: var(--border-radius-md);
  background: #f5f7fa;
}

@media (max-width: 1024px) {
  .meta-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

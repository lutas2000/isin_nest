<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LegacyDrawingPanel from './LegacyDrawingPanel.vue';
import { legacyGet } from '../services/legacyApi';
import type { DrawingShape } from '../utils/legacyDocumentPaper';

// F11「秀圖」in the transaction grids (isin_vb6
// src/components/LegacyDrawingWindow.vue, Win7 2026-10-07): a small window
// titled 圖型顯示 with the row's drawing — its number and size over the
// framed outline — then「顯示尺寸框線」and 關閉. The DXF is looked up by the
// form's customer, as the printouts do.
const props = defineProps({
  drawingNo: { type: String, required: true },
  customerCode: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const shape = ref<DrawingShape | null>(null);
const showBox = ref(false);
const closeButton = ref<HTMLButtonElement | null>(null);

onMounted(async () => {
  closeButton.value?.focus();
  try {
    const params = new URLSearchParams({
      numbers: props.drawingNo,
      customer: props.customerCode,
    });
    const payload = await legacyGet<{
      shapes?: Record<string, DrawingShape | null>;
    }>(`/drawings/shapes?${params}`);
    shape.value = payload.shapes?.[props.drawingNo] ?? null;
  } catch {
    // An empty panel, as the legacy window shows without a drawing.
  }
});
</script>

<template>
  <div class="legacy-modal-backdrop">
    <section
      class="legacy-selection legacy-drawing-window"
      role="dialog"
      aria-modal="true"
      aria-label="圖型顯示"
    >
      <div class="legacy-dialog-title">
        <span>圖型顯示</span>
        <button
          type="button"
          class="legacy-window-close"
          aria-label="關閉"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="legacy-drawing-window-body">
        <LegacyDrawingPanel
          :shape="shape"
          :number="drawingNo"
          :height="464"
          :show-box="showBox"
        />
        <div class="legacy-drawing-window-actions">
          <label><input v-model="showBox" type="checkbox" />顯示尺寸框線</label>
          <button ref="closeButton" type="button" @click="emit('close')">
            關　閉
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

// The legacy 資料列印 window (isin_vb6 src/components/LegacyPreviewWindow.vue):
// page and zoom toolbar along the top right with the same shortcut letters,
// and the paper below it. The page box reads 「第{總頁數}-{目前頁}頁」 as on
// Win7.
const props = defineProps({
  label: { type: String, required: true },
  pageCount: { type: Number, default: 1 },
  printable: { type: Boolean, default: false },
  printTitle: { type: String, default: '列印版面尚待核對' },
});
const pageIndex = defineModel<number>('page', { default: 0 });
const zoom = defineModel<number>('zoom', { default: 1 });
const emit = defineEmits(['close', 'print']);

function goTo(index: number) {
  pageIndex.value = Math.min(
    Math.max(index, 0),
    Math.max(props.pageCount - 1, 0),
  );
}

function setZoom(step: number) {
  zoom.value = Math.min(
    2,
    Math.max(0.5, Math.round((zoom.value + step) * 100) / 100),
  );
}

const shortcuts: Record<string, () => unknown> = {
  m: () => goTo(0),
  i: () => goTo(props.pageCount - 1),
  j: () => goTo(pageIndex.value - 1),
  k: () => goTo(pageIndex.value + 1),
  l: () => setZoom(0.25),
  s: () => setZoom(-0.25),
  o: () => props.printable && emit('print'),
  c: () => emit('close'),
  escape: () => emit('close'),
};

function handleKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const action = shortcuts[event.key.toLowerCase()];
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

onMounted(() => window.addEventListener('keydown', handleKey, true));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey, true));
</script>

<template>
  <div
    class="legacy-preview"
    role="dialog"
    aria-modal="true"
    :aria-label="`${label}預覽`"
  >
    <div class="legacy-preview-titlebar">資料列印</div>
    <div class="legacy-preview-toolbar">
      <span class="legacy-preview-page"
        >第{{ Math.max(pageCount, 1) }}-{{ pageIndex + 1 }}頁</span
      >
      <button type="button" :disabled="pageIndex === 0" @click="goTo(0)">
        頭頁 M
      </button>
      <button
        type="button"
        :disabled="pageIndex >= pageCount - 1"
        @click="goTo(pageCount - 1)"
      >
        末頁 I
      </button>
      <button
        type="button"
        :disabled="pageIndex === 0"
        @click="goTo(pageIndex - 1)"
      >
        上頁 J
      </button>
      <button
        type="button"
        :disabled="pageIndex >= pageCount - 1"
        @click="goTo(pageIndex + 1)"
      >
        下頁 K
      </button>
      <button type="button" :disabled="zoom >= 2" @click="setZoom(0.25)">
        放大 L
      </button>
      <button type="button" :disabled="zoom <= 0.5" @click="setZoom(-0.25)">
        縮小 S
      </button>
      <button
        type="button"
        :disabled="!printable"
        :title="printable ? '列印或另存 PDF' : printTitle"
        @click="emit('print')"
      >
        印出 O
      </button>
      <button type="button" @click="emit('close')">關閉 C</button>
    </div>
    <div class="legacy-preview-canvas">
      <div class="legacy-preview-paper" :style="{ zoom }"><slot /></div>
    </div>
  </div>
</template>

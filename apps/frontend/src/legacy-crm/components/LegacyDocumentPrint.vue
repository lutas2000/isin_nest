<script setup lang="ts">
import { onMounted, ref, watch, type PropType } from 'vue';
import LegacyPreviewWindow from './LegacyPreviewWindow.vue';
import LegacyReportSheet from './LegacyReportSheet.vue';
import { logLegacyPrint } from '../services/legacyPrintLog';
import type { DocumentPrint } from '../utils/documentPrinting';
import type { PaperPage } from '../utils/legacyPapers';

// 列印 P / 列印標籤(L) of a transaction form (isin_vb6
// src/components/LegacyDocumentPrint.vue): the legacy 資料列印 preview of the
// document's pages, each printed on its legacy paper. Opening the preview and
// 印出 O are each logged (LEGACY-CRM-REBUILD-PLAN.md 2.5).
const props = defineProps({
  label: { type: String, required: true },
  pages: { type: Array as PropType<PaperPage[]>, required: true },
  log: { type: Object as PropType<DocumentPrint['log'] | null>, default: null },
});
const emit = defineEmits(['close']);
const page = ref(0);
const zoom = ref(1);

watch(
  () => props.pages,
  () => {
    page.value = 0;
  },
);

function record(kind: 'document_preview' | 'document_print') {
  if (!props.log) return;
  logLegacyPrint({
    kind,
    target: props.log.target,
    entity_key: props.log.entityKey,
    criteria: props.log.criteria ?? null,
    page_count: props.pages.length,
  });
}

onMounted(() => record('document_preview'));

function printPages() {
  record('document_print');
  window.print();
}
</script>

<template>
  <LegacyPreviewWindow
    v-model:page="page"
    v-model:zoom="zoom"
    :label="label"
    :page-count="pages.length"
    printable
    @print="printPages"
    @close="emit('close')"
  >
    <LegacyReportSheet v-if="pages[page]" :page="pages[page]" />
  </LegacyPreviewWindow>
  <section class="legacy-print-pages" aria-hidden="true">
    <LegacyReportSheet
      v-for="(sheet, index) in pages"
      :key="index"
      :page="sheet"
    />
  </section>
</template>

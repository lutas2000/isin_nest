<script setup lang="ts">
import { computed, type PropType } from 'vue';
import envelopeLogo from '../assets/legacy-envelope-logo.png';
import { PX_MM } from '../utils/legacyDocumentPaper';
import {
  LEGACY_PAPERS,
  type LegacyPaperName,
  type PaperImage,
  type PaperPage,
  type PaperRule,
  type PaperShape,
  type PaperText,
} from '../utils/legacyPapers';

// One page of a legacy report or document, positioned from the paper's
// top-left corner the way the legacy program prints it (isin_vb6
// src/components/LegacyReportSheet.vue).
//
// Pages in unit "px" (every report and document since 2026-10-07) are in
// 1/96 inch, read from the legacy XPS output, with text y on the baseline.
// Pages without a unit are in lpx, read from the legacy preview, with text y
// on the vertical centre; lpx convert to printed px with the factors found by
// comparing preview and XPS output of the same pages (2026-10-06): 0.915
// across and 0.9846 down. Pages may carry part outlines
// ({x, y, width, height, viewWidth, viewHeight, path}). The sheet is the
// legacy paper named by page.paper (legacyPapers.ts), full by default.
const props = defineProps({
  page: { type: Object as PropType<PaperPage>, required: true },
});

const isPx = computed(() => props.page.unit === 'px');
// Pictures the legacy program prints, by the name pages give them.
const IMAGES: Record<string, string> = { 'envelope-logo': envelopeLogo };
const X = (value: number) => (isPx.value ? value : value * 0.915 - 0.9);
const Y = (value: number) => (isPx.value ? value : value * 0.9846 - 1.1);
const W = (value: number) => (isPx.value ? value : value * 0.915);
const H = (value: number) => (isPx.value ? value : value * 0.9846);
const mm = (px: number) => `${(px * PX_MM).toFixed(3)}mm`;

const paperName = computed<LegacyPaperName>(() =>
  props.page.paper && LEGACY_PAPERS[props.page.paper]
    ? props.page.paper
    : 'full',
);
const sheetStyle = computed(() => {
  const paper = LEGACY_PAPERS[paperName.value];
  return {
    width: `${paper.width.toFixed(3)}mm`,
    height: `${paper.height.toFixed(3)}mm`,
  };
});

// Horizontal rules are {x1, x2, y}; vertical ones {x, y1, y2}.
function ruleStyle(rule: PaperRule) {
  if (rule.y1 != null)
    return {
      left: mm(X(rule.x ?? 0)),
      top: mm(Y(rule.y1)),
      height: mm(H((rule.y2 ?? rule.y1) - rule.y1)),
    };
  return {
    left: mm(X(rule.x1 ?? 0)),
    width: mm(W((rule.x2 ?? 0) - (rule.x1 ?? 0))),
    top: mm(Y(rule.y ?? 0)),
    borderTopWidth: rule.weight ? mm(H(rule.weight)) : undefined,
  };
}

function shapeStyle(shape: PaperShape | PaperImage) {
  return {
    left: mm(X(shape.x)),
    top: mm(Y(shape.y)),
    width: mm(W(shape.width)),
    height: mm(H(shape.height)),
  };
}

// 細明體 has an ascent of 0.8 em and a descent of 0.2 em, so with a line
// height of 1 em the baseline sits 0.8 em below the top.
function itemStyle(item: PaperText) {
  const shift =
    item.align === 'right' ? '-100%' : item.align === 'center' ? '-50%' : '0';
  const size = W(item.size);
  const top = item.baseline ? Y(item.y) - size * 0.8 : Y(item.y) - size / 2;
  return {
    left: mm(X(item.x)),
    top: mm(top),
    fontSize: mm(size),
    lineHeight: mm(size),
    letterSpacing: item.spacing ? `${item.spacing}em` : undefined,
    transform: `translateX(${shift})`,
  };
}
</script>

<template>
  <div
    class="legacy-sheet"
    :class="[
      `legacy-paper-${paperName}`,
      page.kind ? `legacy-sheet-${page.kind}` : '',
    ]"
    :style="sheetStyle"
  >
    <div class="legacy-sheet-origin">
      <div
        v-for="(rule, index) in page.rules"
        :key="`r${index}`"
        :class="rule.y1 != null ? 'legacy-sheet-vrule' : 'legacy-sheet-rule'"
        :style="ruleStyle(rule)"
      ></div>
      <svg
        v-for="(shape, index) in page.shapes ?? []"
        :key="`s${index}`"
        class="legacy-sheet-shape"
        :style="shapeStyle(shape)"
        :viewBox="`0 0 ${shape.viewWidth} ${shape.viewHeight}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path :d="shape.path" />
      </svg>
      <img
        v-for="(image, index) in page.images ?? []"
        :key="`i${index}`"
        class="legacy-sheet-image"
        :src="IMAGES[image.name]"
        alt=""
        :style="shapeStyle(image)"
      />
      <span
        v-for="(item, index) in page.items"
        :key="index"
        class="legacy-sheet-text"
        :class="{ 'legacy-sheet-logo': item.logo }"
        :style="itemStyle(item)"
        >{{ item.text }}</span
      >
    </div>
  </div>
</template>

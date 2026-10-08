<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { shapeSize, type DrawingShape } from '../utils/legacyDocumentPaper';

// The legacy DxfShow panel (Win7 2026-10-07): a white box with centred
// header lines — the size「51x40」in 工件建檔, the drawing no and the size in
// 圖型顯示 — over a black frame the outline is fitted into, 10 px inside it.
// 顯示尺寸框線 adds the outline's extents. Nothing is drawn without a shape.
const props = defineProps({
  shape: { type: Object as PropType<DrawingShape | null>, default: null },
  number: { type: String, default: '' },
  width: { type: Number, default: 396 },
  height: { type: Number, default: 429 },
  showBox: { type: Boolean, default: false },
});

const LINE = 27;
const lines = computed(() =>
  props.shape ? [props.number, shapeSize(props.shape)].filter(Boolean) : [],
);
const frame = computed(() => {
  const top = 10 + lines.value.length * LINE;
  return {
    x: 3.5,
    y: top + 0.5,
    width: props.width - 9,
    height: props.height - top - 7,
  };
});
</script>

<template>
  <svg
    class="legacy-drawing-panel"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="shape ? `${number} DXF 圖面` : 'DXF 圖面'"
  >
    <rect :width="width" :height="height" fill="#fff" />
    <template v-if="shape">
      <text
        v-for="(line, index) in lines"
        :key="index"
        :x="width / 2"
        :y="27 + index * LINE"
        text-anchor="middle"
      >
        {{ line }}
      </text>
      <rect
        :x="frame.x"
        :y="frame.y"
        :width="frame.width"
        :height="frame.height"
        fill="none"
        stroke="#000"
      />
      <svg
        :x="frame.x + 10"
        :y="frame.y + 10"
        :width="frame.width - 20"
        :height="frame.height - 20"
        :viewBox="`0 0 ${shape.width || 1} ${shape.height || 1}`"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
      >
        <rect
          v-if="showBox"
          :width="shape.width"
          :height="shape.height"
          fill="none"
          stroke="#000"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="shape.path"
          fill="none"
          stroke="#000"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </template>
  </svg>
</template>

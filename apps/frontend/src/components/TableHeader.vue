<template>
  <div :class="headerClass">
    <h3 v-if="props.title" class="m-0 text-lg font-semibold text-secondary-900">{{ props.title }}</h3>
    <div v-if="$slots.actions" :class="actionsClass">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title?: string;
  compact?: boolean;
  border?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  compact: false,
  border: true,
});

const headerClass = computed(() => {
  const padding = props.compact ? 'px-4 py-3 md:px-4 md:py-3' : 'px-8 py-6 md:px-4 md:py-4';
  const border = props.border ? 'border-b border-secondary-200' : '';
  return `flex items-center justify-between gap-4 bg-white md:flex-col md:items-start ${padding} ${border}`.trim();
});

const actionsClass = 'flex flex-wrap items-center gap-3 md:w-full md:flex-col md:items-stretch';
</script>


<template>
  <div class="print-view" ref="printViewRef">
    <div class="print-container">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { printFromRef, type PrintOptions } from '@/utils/print';

const printViewRef = ref<HTMLElement | null>(null);

const print = (options?: PrintOptions) => {
  printFromRef(printViewRef.value, options);
};

defineExpose({
  print,
  element: printViewRef,
});
</script>

<style scoped>
.print-view {
  display: none;
}
</style>

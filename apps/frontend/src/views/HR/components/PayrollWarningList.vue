<template>
  <div v-if="warnings.length > 0" class="warning-list">
    <div class="warning-title">警告（{{ warnings.length }}）</div>
    <ul>
      <li v-for="(warning, index) in shown" :key="index">{{ warning }}</li>
    </ul>
    <button v-if="warnings.length > limit" class="btn btn-sm btn-outline" @click="expanded = !expanded">
      {{ expanded ? '收合' : `顯示全部 ${warnings.length} 筆` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ warnings: string[] }>();
const limit = 8;
const expanded = ref(false);
const shown = computed(() => (expanded.value ? props.warnings : props.warnings.slice(0, limit)));
</script>

<style scoped>
.warning-list {
  background: var(--warning-50, #fffbeb);
  border: 1px solid var(--warning-200, #fde68a);
  border-radius: var(--border-radius-lg);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.warning-title {
  font-weight: 600;
  color: var(--warning-700, #b45309);
  margin-bottom: 0.25rem;
}

.warning-list ul {
  margin: 0 0 0.5rem;
  padding-left: 1.25rem;
}
</style>

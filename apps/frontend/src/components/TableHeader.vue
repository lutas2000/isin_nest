<template>
  <div class="table-header">
    <h3 v-if="title" class="table-title">{{ title }}</h3>
    <div class="table-actions" v-if="$slots.actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: undefined,
});
</script>

<style scoped>
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--secondary-200);
  background: white;
}

.table-title {
  margin: 0;
  color: var(--secondary-900);
  font-weight: 600;
}

.table-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem 1.5rem;
  }

  .table-actions {
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }

  .table-actions > * {
    width: 100%;
  }
}
</style>


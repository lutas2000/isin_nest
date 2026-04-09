<template>
  <div class="detail-pairs">
    <div
      v-for="item in items"
      :key="item.key"
      class="detail-pair"
      :class="{ 'detail-pair--full-width': item.fullWidth }"
    >
      <span class="detail-pair-label">{{ item.label }}：</span>
      <span class="detail-pair-value">
        <slot :name="`value-${item.key}`" :item="item">
          {{ formatValue(item.value) }}
        </slot>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface DetailPairItem {
  key: string;
  label: string;
  value: string | number | null | undefined;
  fullWidth?: boolean;
}

defineProps<{
  items: DetailPairItem[];
}>();

const formatValue = (value: DetailPairItem['value']) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};
</script>

<style scoped>
.detail-pairs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

.detail-pair {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.detail-pair--full-width {
  grid-column: 1 / -1;
}

.detail-pair-label {
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.detail-pair-value {
  color: var(--secondary-900);
  font-size: var(--font-size-base);
  min-width: 0;
}

@media (max-width: 768px) {
  .detail-pairs {
    grid-template-columns: 1fr;
  }
}
</style>

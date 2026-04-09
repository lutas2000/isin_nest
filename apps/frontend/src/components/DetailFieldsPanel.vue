<template>
  <div class="detail-fields-panel">
    <div v-if="$slots.actions" class="detail-fields-panel__actions">
      <slot name="actions" />
    </div>
    <div class="detail-fields-panel__grid">
      <div
        v-for="item in items"
        :key="item.key"
        class="detail-fields-panel__row"
        :class="{ 'detail-fields-panel__row--full-width': item.fullWidth }"
      >
        <span class="detail-fields-panel__label">{{ item.label }}：</span>
        <span class="detail-fields-panel__value">
          <template v-if="editing && hasEditSlot(item.key)">
            <slot :name="`edit-${item.key}`" :item="item" />
          </template>
          <template v-else>
            <slot :name="`value-${item.key}`" :item="item">
              {{ formatValue(item.value) }}
            </slot>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';

export interface DetailFieldItem {
  key: string;
  label: string;
  value: string | number | null | undefined;
  fullWidth?: boolean;
}

defineProps<{
  items: DetailFieldItem[];
}>();

const editing = defineModel<boolean>('editing', { default: false });

const slots = useSlots();

const hasEditSlot = (key: string) => !!slots[`edit-${key}`];

const formatValue = (value: DetailFieldItem['value']) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};
</script>

<style scoped>
.detail-fields-panel__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-fields-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

.detail-fields-panel__row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.detail-fields-panel__row--full-width {
  grid-column: 1 / -1;
}

.detail-fields-panel__label {
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.detail-fields-panel__value {
  color: var(--secondary-900);
  font-size: var(--font-size-base);
  min-width: 0;
}

.detail-fields-panel__value :deep(.form-control) {
  width: 100%;
  min-width: 0;
}

@media (max-width: 768px) {
  .detail-fields-panel__actions {
    justify-content: flex-start;
  }

  .detail-fields-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>

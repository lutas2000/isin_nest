<template>
  <div class="!p-6 md:!p-4">
    <div
      v-if="$slots.actions"
      class="mb-4 flex flex-wrap items-center justify-end gap-3"
    >
      <slot name="actions" />
    </div>
    <div class="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
      <div
        v-for="item in items"
        :key="item.key"
        class="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-1.5"
        :class="{ 'md:col-span-2': item.fullWidth }"
      >
        <span class="whitespace-nowrap text-sm text-secondary-600">{{ item.label }}：</span>
        <span class="min-w-0 text-base text-secondary-900">
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

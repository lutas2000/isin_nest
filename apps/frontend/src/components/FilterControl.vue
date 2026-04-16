<template>
  <div v-if="filters.length > 0" class="flex flex-wrap items-center gap-2">
    <select
      v-for="filter in filters"
      :key="filter.key"
      class="rounded border border-secondary-300 px-3 py-2 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
      :value="getFilterValue(filter.key)"
      @change="handleChange(filter.key, $event)"
    >
      <option value="">{{ filter.placeholder }}</option>
      <option
        v-for="option in filter.options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <button
      v-if="hasActiveFilters"
      type="button"
      class="rounded px-2 py-1 text-sm text-secondary-500 transition-colors hover:text-danger-600"
      @click="clearAll"
    >
      清除篩選
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  key: string;
  placeholder: string;
  options: FilterOption[];
}

interface Props {
  filters: FilterDefinition[];
  modelValue: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>];
}>();

const getFilterValue = (key: string) => props.modelValue[key] ?? '';

const hasActiveFilters = computed(() =>
  Object.values(props.modelValue).some((v) => v !== ''),
);

const handleChange = (key: string, event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', { ...props.modelValue, [key]: target.value });
};

const clearAll = () => {
  const cleared: Record<string, string> = {};
  for (const f of props.filters) {
    cleared[f.key] = '';
  }
  emit('update:modelValue', cleared);
};
</script>

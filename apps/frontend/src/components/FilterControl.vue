<template>
  <div v-if="filters.length > 0" class="flex flex-wrap items-center gap-2 px-2 py-1">
    <div
      v-for="filter in filters"
      :key="filter.key"
      class="relative"
    >
      <select
        class="h-10 min-w-[112px] appearance-none rounded-xl border border-[var(--secondary-200)] bg-white py-2 pl-3 pr-8 text-sm font-medium transition-colors hover:border-[var(--secondary-300)] hover:bg-secondary-50 focus:border-[var(--primary-500)] focus:outline-none"
        :class="getFilterValue(filter.key) ? 'text-secondary-900' : 'text-secondary-500'"
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
      <svg
        class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>

    <button
      v-if="hasActiveFilters"
      type="button"
      class="inline-flex h-10 items-center gap-1 rounded-xl border border-secondary-200 px-3 text-sm font-medium text-secondary-600 transition-colors hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600"
      @click="clearAll"
    >
      <svg
        class="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
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

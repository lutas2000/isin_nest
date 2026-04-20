<template>
  <div v-if="filters.length > 0" class="flex flex-wrap items-center gap-2 px-2 py-1">
    <div
      v-for="filter in filters"
      :key="filter.key"
      class="relative"
    >
      <select
        class="h-10 min-w-[112px] appearance-none rounded-xl border border-[var(--secondary-200)] bg-white py-2 pl-4 pr-8 text-sm font-medium transition-colors hover:border-[var(--secondary-300)] hover:bg-secondary-50 focus:border-[var(--primary-500)] focus:outline-none"
        :class="getFilterValue(filter.key) ? 'text-secondary-900' : 'text-secondary-500'"
        style="padding-inline-start: 1rem;"
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
        width="14"
        height="14"
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
</script>

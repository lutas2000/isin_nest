<template>
  <div :class="containerClass">
    <div :class="headerClass">
      <div :class="controlsClass">
        <div v-if="showSearch" class="min-w-[300px] md:min-w-0">
          <input
            type="text"
            class="w-full rounded border border-secondary-300 px-3 py-2 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
            :placeholder="searchPlaceholder"
            v-model="searchValue"
            @input="handleSearchInput"
          />
        </div>

        <select
          v-for="filter in filters"
          :key="filter.key"
          class="rounded border border-secondary-300 px-3 py-2 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
          v-model="filterValues[filter.key]"
          @change="handleFilterChange(filter.key, $event)"
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

        <input
          v-if="showDateFilter"
          type="date"
          class="rounded border border-secondary-300 px-3 py-2 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
          v-model="dateValue"
          @change="handleDateChange"
        />

        <slot name="controls"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;
  placeholder: string;
  options: FilterOption[];
}

interface Props {
  showSearch?: boolean;
  searchPlaceholder?: string;
  filters?: Filter[];
  showDateFilter?: boolean;
  search?: string;
  date?: string;
  card?: boolean;
  compact?: boolean;
  controlsLayout?: 'row' | 'column';
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  searchPlaceholder: '搜尋...',
  filters: () => [],
  showDateFilter: false,
  search: '',
  date: '',
  card: true,
  compact: false,
  controlsLayout: 'row',
});

const emit = defineEmits<{
  'update:search': [value: string];
  'update:filter': [key: string, value: string];
  'update:date': [value: string];
}>();

const searchValue = ref(props.search);
const dateValue = ref(props.date);
const filterValues = ref<Record<string, string>>({});

const containerClass = computed(() => {
  if (!props.card) {
    return '';
  }
  return 'overflow-hidden rounded-lg bg-white shadow';
});

const headerClass = computed(() => {
  const base = props.card
    ? 'flex items-center justify-between gap-4 border-b border-secondary-200 px-8 md:px-4'
    : 'flex items-center justify-between gap-4';
  const density = props.compact ? 'py-3' : 'pb-4 pt-8 md:pt-4';
  return `${base} ${density} md:flex-col md:items-start`;
});

const controlsClass = computed(() => {
  if (props.controlsLayout === 'column') {
    return 'flex w-full flex-col gap-3';
  }
  return 'flex flex-wrap items-center gap-3 md:w-full md:flex-col md:items-stretch';
});

const getInputValue = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  return target?.value ?? '';
};

const handleSearchInput = (event: Event) => {
  emit('update:search', getInputValue(event));
};

const handleFilterChange = (key: string, event: Event) => {
  emit('update:filter', key, getInputValue(event));
};

const handleDateChange = (event: Event) => {
  emit('update:date', getInputValue(event));
};

// 監聽 props 變化
watch(() => props.search, (newValue) => {
  searchValue.value = newValue;
});

watch(() => props.date, (newValue) => {
  dateValue.value = newValue;
});
</script>

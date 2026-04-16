<template>
  <div class="overflow-hidden rounded-lg bg-white shadow">
    <!-- Toolbar: search + filters + sort + custom controls -->
    <div
      v-if="showToolbar || $slots.controls"
      class="flex flex-wrap items-center gap-3 border-b border-secondary-100 !px-6 !py-4 md:!px-4 md:!py-3"
    >
      <SearchField
        v-if="showSearch"
        class="w-[320px] shrink-0 max-w-full"
        :model-value="search"
        :placeholder="searchPlaceholder"
        @update:model-value="emit('update:search', $event)"
      />

      <FilterControl
        v-if="filters.length > 0"
        :filters="filters"
        :model-value="filterValues"
        @update:model-value="handleFilterUpdate"
      />

      <SortControl
        v-if="sortOptions.length > 0"
        :options="sortOptions"
        :model-value="sortValue"
        @update:model-value="handleSortUpdate"
      />

      <div v-if="$slots.controls" class="ml-auto flex items-center gap-2">
        <slot name="controls" />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center p-12 text-secondary-500">
      <svg class="mr-3 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>{{ loadingText }}</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="m-4 rounded border border-danger-200 bg-danger-50 p-6 text-center">
      <p class="text-danger-700">{{ error }}</p>
      <button
        v-if="showRetry"
        type="button"
        class="mt-3 rounded bg-danger-600 px-4 py-2 text-sm text-white transition-colors hover:bg-danger-700"
        @click="$emit('retry')"
      >
        重試
      </button>
    </div>

    <!-- Table content -->
    <div v-else>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SearchField from './SearchField.vue';
import FilterControl, { type FilterDefinition } from './FilterControl.vue';
import SortControl, { type SortOption, type SortValue } from './SortControl.vue';

interface Props {
  loading?: boolean;
  loadingText?: string;
  error?: string | null;
  showRetry?: boolean;
  showSearch?: boolean;
  search?: string;
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  filterValues?: Record<string, string>;
  sortOptions?: SortOption[];
  sortValue?: SortValue;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: '載入中...',
  error: null,
  showRetry: true,
  showSearch: false,
  search: '',
  searchPlaceholder: '搜尋...',
  filters: () => [],
  filterValues: () => ({}),
  sortOptions: () => [],
  sortValue: () => ({ key: '', direction: 'asc' }),
});

const emit = defineEmits<{
  'update:search': [value: string];
  'update:filters': [value: Record<string, string>];
  'update:sort': [value: SortValue];
  retry: [];
}>();

const showToolbar = computed(
  () =>
    props.showSearch ||
    props.filters.length > 0 ||
    props.sortOptions.length > 0,
);

const handleFilterUpdate = (value: Record<string, string>) => {
  emit('update:filters', value);
};

const handleSortUpdate = (value: SortValue) => {
  emit('update:sort', value);
};
</script>

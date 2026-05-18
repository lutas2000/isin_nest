<template>
  <div
    v-if="filters.length > 0"
    ref="rootRef"
    class="flex flex-wrap items-center gap-2"
  >
    <div
      v-for="filter in filters"
      :key="getFilterId(filter)"
      class="relative"
    >
      <button
        type="button"
        class="inline-flex max-w-[240px] items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100"
        :class="
          isFilterActive(filter)
            ? 'border-primary-200 bg-primary-50 text-primary-800'
            : 'border-secondary-200 bg-white text-secondary-700 hover:border-secondary-300 hover:bg-secondary-50'
        "
        @click.stop="toggleFilter(filter)"
      >
        <span class="shrink-0 text-secondary-500">{{ filter.label }}</span>
        <span
          v-if="getFilterSummary(filter)"
          class="truncate text-secondary-900"
        >
          {{ getFilterSummary(filter) }}
        </span>
        <svg
          class="h-3.5 w-3.5 shrink-0 text-secondary-400 transition-transform"
          :class="{ 'rotate-180': openFilterId === getFilterId(filter) }"
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
      </button>

      <div
        v-if="openFilterId === getFilterId(filter)"
        class="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-72 overflow-hidden rounded-2xl border border-secondary-100 bg-white shadow-xl"
        @click.stop
      >
        <template v-if="filter.type === 'select'">
          <div
            v-if="filter.searchable !== false"
            class="border-b border-secondary-100 p-3"
          >
            <input
              type="text"
              class="h-9 w-full rounded-xl border border-secondary-200 bg-secondary-50 px-3 text-sm text-secondary-800 transition-colors placeholder:text-secondary-400 focus:border-primary-500 focus:bg-white focus:outline-none"
              :placeholder="filter.placeholder || '搜尋...'"
              :value="optionSearchTerms[getFilterId(filter)] ?? ''"
              @input="handleOptionSearchInput(filter, $event)"
            />
          </div>

          <ul class="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                class="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary-50"
                :class="
                  !getFilterValue(filter)
                    ? 'bg-primary-50 font-medium text-primary-700'
                    : 'text-secondary-700'
                "
                @click="selectOption(filter, '')"
              >
                全部
              </button>
            </li>
            <li
              v-for="option in getVisibleOptions(filter)"
              :key="option.value"
            >
              <button
                type="button"
                class="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary-50"
                :class="
                  getFilterValue(filter) === option.value
                    ? 'bg-primary-50 font-medium text-primary-700'
                    : 'text-secondary-700'
                "
                @click="selectOption(filter, option.value)"
              >
                {{ option.label }}
              </button>
            </li>
            <li
              v-if="getVisibleOptions(filter).length === 0"
              class="px-4 py-3 text-sm text-secondary-400"
            >
              沒有符合的選項
            </li>
          </ul>
        </template>

        <template v-else>
          <div
            v-if="filter.showMonthShortcuts"
            class="flex items-center gap-1.5 border-b border-secondary-100 p-3"
          >
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-secondary-200 bg-white text-secondary-600 transition-colors hover:border-secondary-300 hover:bg-secondary-50"
              aria-label="上月"
              @click="shiftMonth(filter, -1)"
            >
              ‹
            </button>
            <button
              type="button"
              class="h-8 flex-1 rounded-lg border border-primary-200 bg-primary-50 text-sm font-medium text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100"
              @click="applyThisMonth(filter)"
            >
              本月
            </button>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-secondary-200 bg-white text-secondary-600 transition-colors hover:border-secondary-300 hover:bg-secondary-50"
              aria-label="下月"
              @click="shiftMonth(filter, 1)"
            >
              ›
            </button>
          </div>

          <div class="space-y-3 p-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-secondary-500">開始日期</label>
              <input
                type="date"
                class="h-10 w-full rounded-xl border border-secondary-200 bg-white px-3 text-sm text-secondary-800 transition-colors focus:border-primary-500 focus:outline-none"
                :value="props.modelValue[filter.fromKey] ?? ''"
                @input="updateValue(filter.fromKey, getInputValue($event))"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium text-secondary-500">結束日期</label>
              <input
                type="date"
                class="h-10 w-full rounded-xl border border-secondary-200 bg-white px-3 text-sm text-secondary-800 transition-colors focus:border-primary-500 focus:outline-none"
                :value="props.modelValue[filter.toKey] ?? ''"
                @input="updateValue(filter.toKey, getInputValue($event))"
              />
            </div>
            <button
              type="button"
              class="w-full rounded-xl border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-600 transition-colors hover:bg-secondary-50"
              @click="clearDateRange(filter)"
            >
              清除日期
            </button>
          </div>
        </template>
      </div>
    </div>

    <button
      v-if="showClearButton && hasActiveFilters"
      type="button"
      class="rounded-full border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700 transition-colors hover:border-danger-300 hover:bg-danger-100 focus:outline-none focus:ring-2 focus:ring-danger-100"
      @click="clearAllFilters"
    >
      清除
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { CrmDateRangeFilterDefinition, CrmFilterDefinition, CrmSelectFilterDefinition } from '@/types/crm-filter';
import {
  getCurrentMonthDateRange,
  getDefaultChipFilterValues,
  hasActiveChipFilters,
  hasDateRangeValue,
  shiftMonthDateRange,
} from '@/utils/crmFilter';

interface Props {
  filters: CrmFilterDefinition[];
  modelValue: Record<string, string>;
  showClearButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  filters: () => [],
  modelValue: () => ({}),
  showClearButton: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>];
}>();

const rootRef = ref<HTMLElement | null>(null);
const openFilterId = ref<string | null>(null);
const optionSearchTerms = reactive<Record<string, string>>({});

const hasActiveFilters = computed(() =>
  hasActiveChipFilters(props.filters, props.modelValue),
);

const clearAllFilters = () => {
  openFilterId.value = null;
  emit('update:modelValue', getDefaultChipFilterValues(props.filters, props.modelValue));
};

const getFilterId = (filter: CrmFilterDefinition) =>
  filter.type === 'select' ? filter.key : `${filter.fromKey}:${filter.toKey}`;

const getInputValue = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  return target?.value ?? '';
};

const getFilterValue = (filter: CrmFilterDefinition) => {
  if (filter.type === 'select') {
    return props.modelValue[filter.key] ?? '';
  }

  return '';
};

const isFilterActive = (filter: CrmFilterDefinition) => {
  if (filter.type === 'select') {
    return Boolean(getFilterValue(filter));
  }

  return hasDateRangeValue(
    props.modelValue[filter.fromKey] ?? '',
    props.modelValue[filter.toKey] ?? '',
  );
};

const getFilterSummary = (filter: CrmFilterDefinition) => {
  if (filter.type === 'select') {
    const value = getFilterValue(filter);
    if (!value) {
      return '';
    }

    return filter.options.find((option) => option.value === value)?.label ?? value;
  }

  const from = props.modelValue[filter.fromKey] ?? '';
  const to = props.modelValue[filter.toKey] ?? '';

  if (!from && !to) {
    return '';
  }

  if (from && to) {
    return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
  }

  if (from) {
    return `${formatDateLabel(from)} 起`;
  }

  return `至 ${formatDateLabel(to)}`;
};

const formatDateLabel = (value: string) => value.replace(/-/g, '/');

const getVisibleOptions = (filter: CrmSelectFilterDefinition) => {
  const keyword = (optionSearchTerms[getFilterId(filter)] ?? '').trim().toLowerCase();
  if (!keyword) {
    return filter.options;
  }

  return filter.options.filter((option) =>
    option.label.toLowerCase().includes(keyword) ||
    option.value.toLowerCase().includes(keyword),
  );
};

const updateValue = (key: string, value: string) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const selectOption = (filter: CrmSelectFilterDefinition, value: string) => {
  updateValue(filter.key, value);
  openFilterId.value = null;
  optionSearchTerms[getFilterId(filter)] = '';
};

const clearDateRange = (filter: CrmDateRangeFilterDefinition) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [filter.fromKey]: '',
    [filter.toKey]: '',
  });
};

const applyMonthRange = (
  filter: CrmDateRangeFilterDefinition,
  range: { from: string; to: string },
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [filter.fromKey]: range.from,
    [filter.toKey]: range.to,
  });
};

const applyThisMonth = (filter: CrmDateRangeFilterDefinition) => {
  applyMonthRange(filter, getCurrentMonthDateRange());
};

const shiftMonth = (filter: CrmDateRangeFilterDefinition, deltaMonths: number) => {
  const from = props.modelValue[filter.fromKey] ?? '';
  const to = props.modelValue[filter.toKey] ?? '';
  applyMonthRange(filter, shiftMonthDateRange(from, to, deltaMonths));
};

const handleOptionSearchInput = (filter: CrmSelectFilterDefinition, event: Event) => {
  optionSearchTerms[getFilterId(filter)] = getInputValue(event);
};

const toggleFilter = (filter: CrmFilterDefinition) => {
  const filterId = getFilterId(filter);
  openFilterId.value = openFilterId.value === filterId ? null : filterId;

  if (openFilterId.value && filter.type === 'select' && optionSearchTerms[filterId] === undefined) {
    optionSearchTerms[filterId] = '';
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!rootRef.value?.contains(event.target as Node)) {
    openFilterId.value = null;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

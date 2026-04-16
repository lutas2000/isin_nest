<template>
  <div v-if="options.length > 0" class="flex items-center gap-2">
    <select
      class="h-10 min-w-[112px] appearance-none rounded-xl border border-secondary-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-secondary-700 transition-colors hover:border-secondary-300 hover:bg-secondary-50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
      :value="modelValue.key"
      @change="handleKeyChange"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="opt.key"
        :value="opt.key"
      >
        {{ opt.label }}
      </option>
    </select>

    <button
      v-if="modelValue.key"
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-xl border border-secondary-200 text-secondary-600 transition-colors hover:border-secondary-300 hover:bg-secondary-50 hover:text-primary-600 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
      @click="toggleDirection"
    >
      <svg
        class="h-4 w-4 transition-transform"
        :class="{ 'rotate-180': modelValue.direction === 'desc' }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface SortOption {
  key: string;
  label: string;
}

export interface SortValue {
  key: string;
  direction: 'asc' | 'desc';
}

interface Props {
  options: SortOption[];
  modelValue: SortValue;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '排序方式',
});

const emit = defineEmits<{
  'update:modelValue': [value: SortValue];
}>();

const handleKeyChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', {
    key: target.value,
    direction: props.modelValue.direction || 'asc',
  });
};

const toggleDirection = () => {
  emit('update:modelValue', {
    key: props.modelValue.key,
    direction: props.modelValue.direction === 'asc' ? 'desc' : 'asc',
  });
};
</script>

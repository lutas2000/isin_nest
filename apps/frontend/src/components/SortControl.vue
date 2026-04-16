<template>
  <div v-if="options.length > 0" class="flex items-center gap-2">
    <select
      class="rounded border border-secondary-300 px-3 py-2 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
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
      class="flex items-center justify-center rounded border border-secondary-300 px-2 py-2 text-secondary-600 transition-colors hover:border-primary-500 hover:text-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
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

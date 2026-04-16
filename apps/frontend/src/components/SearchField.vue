<template>
  <div class="px-4 py-1">
    <input
      type="text"
      class="h-10 w-full rounded-xl border border-[var(--secondary-200)] bg-secondary-50 !px-3 py-2 text-sm text-secondary-800 transition-colors placeholder:text-secondary-400 hover:border-[var(--secondary-300)] hover:bg-white focus:border-[var(--primary-500)] focus:bg-white focus:outline-none"
      :placeholder="placeholder"
      :value="modelValue"
      @input="handleInput"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string;
  placeholder?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: '搜尋...',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

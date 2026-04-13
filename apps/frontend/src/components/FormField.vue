<template>
  <div class="mb-4 flex flex-col">
    <label v-if="label" class="mb-2 font-medium text-secondary-700" :for="fieldId">
      {{ label }}
      <span v-if="required" class="ml-1 text-danger-500">*</span>
    </label>

    <input
      v-if="type === 'text' || type === 'email' || type === 'password' || type === 'number'"
      :type="type"
      :id="fieldId"
      class="rounded border border-secondary-300 px-3 py-3 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-secondary-50 md:py-2.5"
      :class="{ 'border-danger-500 focus:border-danger-500 focus:ring-danger-100': hasError }"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :min="min"
      :max="max"
      :maxlength="maxlength"
      v-model="inputValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup="$emit('keyup', $event)"
    />
    
    <select
      v-else-if="type === 'select'"
      :id="fieldId"
      class="rounded border border-secondary-300 px-3 py-3 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-secondary-50 md:py-2.5"
      :class="{ 'border-danger-500 focus:border-danger-500 focus:ring-danger-100': hasError }"
      :required="required"
      :disabled="disabled"
      v-model="inputValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ placeholder || '請選擇...' }}</option>
      <option 
        v-for="option in options" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    
    <textarea
      v-else-if="type === 'textarea'"
      :id="fieldId"
      class="min-h-20 resize-y rounded border border-secondary-300 px-3 py-3 text-base transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-secondary-50 md:py-2.5"
      :class="{ 'border-danger-500 focus:border-danger-500 focus:ring-danger-100': hasError }"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
      v-model="inputValue"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
    
    <div v-if="hasError" class="mt-1 text-sm text-danger-600">
      {{ errorMessage }}
    </div>

    <div v-if="helpText" class="mt-1 text-sm text-secondary-600">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Option {
  value: string | number | boolean;
  label: string;
}

interface Props {
  modelValue: string | number | boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  maxlength?: number;
  rows?: number;
  options?: Option[];
  errorMessage?: string;
  helpText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  rows: 3
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean];
  'keyup': [event: KeyboardEvent];
}>();

const fieldId = ref(`field-${Math.random().toString(36).substr(2, 9)}`);
const inputValue = ref(props.modelValue);

const hasError = computed(() => {
  return !!props.errorMessage;
});

// 監聽 modelValue 變化
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue;
});
</script>

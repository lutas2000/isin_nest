<template>
  <div class="form-group">
    <label v-if="label" class="form-label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <input
      v-if="type === 'text' || type === 'email' || type === 'password' || type === 'number'"
      :type="type"
      :id="fieldId"
      class="form-control"
      :class="{ 'is-invalid': hasError }"
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
      class="form-control"
      :class="{ 'is-invalid': hasError }"
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
      class="form-control"
      :class="{ 'is-invalid': hasError }"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
      v-model="inputValue"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
    
    <div v-if="hasError" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-if="helpText" class="help-text">
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

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-label {
  font-weight: 500;
  color: var(--secondary-700);
  margin-bottom: 0.5rem;
}

.required {
  color: var(--danger-500);
  margin-left: 0.25rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.form-control:disabled {
  background-color: var(--secondary-50);
  cursor: not-allowed;
}

.form-control.is-invalid {
  border-color: var(--danger-500);
}

.form-control.is-invalid:focus {
  border-color: var(--danger-500);
  box-shadow: 0 0 0 3px var(--danger-100);
}

.error-message {
  color: var(--danger-600);
  font-size: var(--font-size-sm);
  margin-top: 0.25rem;
}

.help-text {
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
  margin-top: 0.25rem;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .form-control {
    padding: 0.625rem;
  }
}
</style>

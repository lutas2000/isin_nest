<template>
  <div class="editable-cell">
    <!-- 文字輸入 -->
    <input
      v-if="column.type === 'text' || !column.type"
      type="text"
      class="form-control"
      :class="{ 
        'required-field-empty': column.required && (!value || value === ''),
        'form-control-error': column.required && (!value || value === '')
      }"
      :value="value"
      @input="handleInput($event)"
      @keydown="handleKeyDown"
      @blur="handleBlur"
    />

    <!-- 數字輸入 -->
    <input
      v-else-if="column.type === 'number'"
      type="number"
      class="form-control"
      :class="{ 
        'required-field-empty': column.required && (value === null || value === undefined || value === ''),
        'form-control-error': column.required && (value === null || value === undefined || value === '')
      }"
      :value="value"
      @input="handleInput($event)"
      @keydown="handleKeyDown"
      @blur="handleBlur"
      step="any"
    />

    <!-- 下拉選單 -->
    <select
      v-else-if="column.type === 'select'"
      class="form-control"
      :class="{ 
        'required-field-empty': column.required && (!value || value === ''),
        'form-control-error': column.required && (!value || value === '')
      }"
      :value="value"
      @change="handleSelectChange($event)"
      @keydown="handleKeyDown"
      @blur="handleBlur"
    >
      <option value="">{{ column.required ? '請選擇...' : '' }}</option>
      <option
        v-for="option in options"
        :key="getOptionValue(option)"
        :value="getOptionValue(option)"
      >
        {{ getOptionLabel(option) }}
      </option>
    </select>

    <!-- 文字區域 -->
    <textarea
      v-else-if="column.type === 'textarea'"
      class="form-control"
      :class="{ 
        'required-field-empty': column.required && (!value || value === ''),
        'form-control-error': column.required && (!value || value === '')
      }"
      :value="value"
      @input="handleInput($event)"
      @keydown="handleKeyDown"
      @blur="handleBlur"
      rows="2"
    ></textarea>

    <!-- 布林值（下拉選單） -->
    <select
      v-else-if="column.type === 'boolean'"
      class="form-control"
      :value="value"
      @change="handleSelectChange($event)"
      @keydown="handleKeyDown"
      @blur="handleBlur"
    >
      <option :value="true">是</option>
      <option :value="false">否</option>
    </select>

    <!-- 載入指示器 -->
    <span v-if="isSaving" class="saving-indicator">💾</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { EditableColumn } from './EditableDataTable.vue';

interface Props {
  column: EditableColumn;
  value: any;
  row: any;
  isNew: boolean;
  isEditing: boolean;
  options?: Array<{value: any, label: string}>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:value': [value: any];
  'keydown': [event: KeyboardEvent];
}>();

const isSaving = ref(false);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  let value: any = target.value;
  
  if (props.column.type === 'number') {
    value = value === '' ? null : Number(value);
  }
  
  emit('update:value', value);
};

const handleSelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  let value: any = target.value;
  
  // 處理布林值
  if (props.column.type === 'boolean') {
    value = value === 'true';
  }
  
  emit('update:value', value);
};

const handleKeyDown = (event: KeyboardEvent) => {
  emit('keydown', event);
};

const handleBlur = () => {
  // 可以在此處觸發驗證或自動保存
};

const getOptionValue = (option: any) => {
  if (typeof option === 'object' && option !== null) {
    return option.value;
  }
  return option;
};

const getOptionLabel = (option: any) => {
  if (typeof option === 'object' && option !== null) {
    return option.label;
  }
  return String(option);
};
</script>

<style scoped>
.editable-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px var(--primary-100);
}

.form-control-error,
.required-field-empty {
  border-color: var(--danger-500);
  background-color: var(--danger-50);
}

.form-control-error:focus,
.required-field-empty:focus {
  border-color: var(--danger-600);
  box-shadow: 0 0 0 2px var(--danger-100);
}

select.form-control {
  cursor: pointer;
}

textarea.form-control {
  resize: vertical;
  min-height: 2.5rem;
}

.saving-indicator {
  font-size: 0.875rem;
  opacity: 0.6;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>

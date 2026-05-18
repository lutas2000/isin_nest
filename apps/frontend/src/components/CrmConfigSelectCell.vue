<template>
  <div class="crm-config-select-cell">
    <input
      ref="inputRef"
      type="text"
      class="form-control"
      :class="{
        'required-field-empty': required && !value,
        'form-control-error': required && !value,
      }"
      :value="inputText"
      @input="handleInput"
      @keydown="handleKeyDown"
      @focus="handleFocus"
      @blur="handleBlur"
    />
    <button
      type="button"
      class="crm-config-dropdown-trigger"
      tabindex="-1"
      aria-label="展開選項"
      @mousedown.prevent="openDropdown"
    >
      ▾
    </button>
    <Teleport to="body">
      <div
        v-if="showDropdown"
        class="crm-config-dropdown"
        :style="dropdownStyle"
      >
        <div v-if="loading" class="crm-config-dropdown-status">載入中...</div>
        <div v-else-if="dropdownOptions.length === 0" class="crm-config-dropdown-status">
          無符合選項
        </div>
        <div v-else class="crm-config-dropdown-results" ref="resultsRef">
          <div
            v-for="(option, idx) in dropdownOptions"
            :key="`${option.code}-${option.label}`"
            :ref="(el) => setResultItemRef(el, idx)"
            class="crm-config-dropdown-item"
            :class="{
              selected: option.value === value,
              highlighted: highlightedIndex === idx,
            }"
            @mousedown.prevent="selectOption(option)"
            @mouseenter="highlightedIndex = idx"
          >
            <span class="crm-config-dropdown-label">{{ option.label }}</span>
            <span class="crm-config-dropdown-code">{{ option.code }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import {
  fetchCrmConfigOptions,
  type CrmConfigCategory,
  type CrmConfigOption,
} from '@/services/crm/crm-config-autocomplete.service';

interface Props {
  category: CrmConfigCategory;
  value: string;
  required?: boolean;
  isFocused?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  required: false,
  isFocused: false,
});

const emit = defineEmits<{
  'update:value': [value: string];
  keydown: [event: KeyboardEvent];
  blur: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const resultsRef = ref<HTMLElement | null>(null);
const inputText = ref('');
const showDropdown = ref(false);
const allOptions = ref<CrmConfigOption[]>([]);
const dropdownOptions = ref<CrmConfigOption[]>([]);
const loading = ref(false);
const highlightedIndex = ref(-1);
const dropdownStyle = ref<{ top: string; left: string; width: string }>({
  top: '0px',
  left: '0px',
  width: '0px',
});
const resultItemRefs = ref<(HTMLElement | null)[]>([]);
let blurTimer: ReturnType<typeof setTimeout> | null = null;

const syncInputFromValue = (value: string) => {
  inputText.value = value ?? '';
};

watch(
  () => props.value,
  (value) => {
    if (!showDropdown.value) {
      syncInputFromValue(value);
    }
  },
  { immediate: true },
);

watch(
  () => props.isFocused,
  (focused) => {
    if (focused) {
      nextTick(() => {
        inputRef.value?.focus();
        inputRef.value?.select();
      });
    }
  },
  { immediate: true },
);

watch(highlightedIndex, (index) => {
  if (index < 0 || !showDropdown.value) {
    return;
  }
  nextTick(() => {
    resultItemRefs.value[index]?.scrollIntoView({ block: 'nearest' });
  });
});

watch(dropdownOptions, (options) => {
  resultItemRefs.value = new Array(options.length).fill(null);
});

watch(
  () => props.category,
  () => {
    allOptions.value = [];
    dropdownOptions.value = [];
    closeDropdown();
  },
);

const setResultItemRef = (el: unknown, idx: number) => {
  if (el) {
    resultItemRefs.value[idx] = el as HTMLElement;
  }
};

const updateDropdownPosition = () => {
  if (!inputRef.value || !showDropdown.value) {
    return;
  }

  const rect = inputRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    top: `${rect.bottom}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
};

const loadDropdownOptions = async () => {
  loading.value = true;
  try {
    if (allOptions.value.length === 0) {
      allOptions.value = await fetchCrmConfigOptions(props.category, '', true);
    }
    dropdownOptions.value = allOptions.value;
    highlightedIndex.value = dropdownOptions.value.length > 0 ? 0 : -1;
  } catch (error) {
    console.error('Failed to load CRM config options:', error);
    allOptions.value = [];
    dropdownOptions.value = [];
    highlightedIndex.value = -1;
  } finally {
    loading.value = false;
  }
};

const openDropdown = async () => {
  showDropdown.value = true;
  updateDropdownPosition();
  await loadDropdownOptions();
};

const closeDropdown = () => {
  showDropdown.value = false;
  highlightedIndex.value = -1;
};

const emitValue = (nextValue: string) => {
  emit('update:value', nextValue);
};

const selectOption = (option: CrmConfigOption) => {
  inputText.value = option.label;
  emitValue(option.value);
  closeDropdown();
};

const ensureAllOptionsLoaded = async (): Promise<CrmConfigOption[]> => {
  if (allOptions.value.length === 0) {
    allOptions.value = await fetchCrmConfigOptions(props.category, '', true);
  }
  return allOptions.value;
};

const cycleToNextOption = async () => {
  try {
    const options = await ensureAllOptionsLoaded();
    if (options.length === 0) {
      return;
    }

    const currentValue = props.value || inputText.value;
    const currentIndex = options.findIndex((option) => option.value === currentValue);
    const nextOption = options[(currentIndex + 1) % options.length];
    selectOption(nextOption);
  } catch (error) {
    console.error('Failed to cycle CRM config options:', error);
  }
};

const isCodeShortcutKey = (event: KeyboardEvent): boolean => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
    return false;
  }
  return event.key.length === 1;
};

const tryApplyCodeShortcutFromKey = async (key: string): Promise<boolean> => {
  const options = await ensureAllOptionsLoaded();
  const matched = options.find((option) => option.code === key);
  if (!matched) {
    return false;
  }
  selectOption(matched);
  return true;
};

const handleInput = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const nextText = target.value;
  inputText.value = nextText;
  emitValue(nextText);

  if (!nextText.trim()) {
    await openDropdown();
    return;
  }

  closeDropdown();
};

const handleFocus = async () => {
  if (!inputText.value.trim()) {
    await openDropdown();
    return;
  }
  closeDropdown();
};

const handleKeyDown = async (event: KeyboardEvent) => {
  if (event.key === 'F1') {
    event.preventDefault();
    event.stopPropagation();
    await cycleToNextOption();
    return;
  }

  if (event.key === 'F10') {
    event.preventDefault();
    event.stopPropagation();
    await openDropdown();
    return;
  }

  if (showDropdown.value && isCodeShortcutKey(event)) {
    if (await tryApplyCodeShortcutFromKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  if (event.key === 'ArrowDown') {
    if (!showDropdown.value) {
      emit('keydown', event);
      return;
    }
    if (dropdownOptions.value.length > 0) {
      event.preventDefault();
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        dropdownOptions.value.length - 1,
      );
    }
    return;
  }

  if (event.key === 'ArrowUp') {
    if (!showDropdown.value) {
      emit('keydown', event);
      return;
    }
    if (showDropdown.value && dropdownOptions.value.length > 0) {
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
    }
    return;
  }

  if (event.key === 'Enter') {
    if (showDropdown.value && highlightedIndex.value >= 0) {
      event.preventDefault();
      const option = dropdownOptions.value[highlightedIndex.value];
      if (option) {
        selectOption(option);
      }
      return;
    }
    emit('keydown', event);
    return;
  }

  if (event.key === 'Escape') {
    if (showDropdown.value) {
      event.preventDefault();
      closeDropdown();
      syncInputFromValue(props.value);
      return;
    }
    emit('keydown', event);
    return;
  }

  emit('keydown', event);
};

const handleBlur = () => {
  if (blurTimer) {
    clearTimeout(blurTimer);
  }
  blurTimer = setTimeout(() => {
    closeDropdown();
    syncInputFromValue(props.value);
    emit('blur');
  }, 150);
};

watch(showDropdown, (show) => {
  if (show) {
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
  } else {
    window.removeEventListener('scroll', updateDropdownPosition, true);
    window.removeEventListener('resize', updateDropdownPosition);
  }
});

onUnmounted(() => {
  if (blurTimer) {
    clearTimeout(blurTimer);
  }
  window.removeEventListener('scroll', updateDropdownPosition, true);
  window.removeEventListener('resize', updateDropdownPosition);
});
</script>

<style scoped>
.crm-config-select-cell {
  position: relative;
  width: 100%;
}

.form-control {
  width: 100%;
  padding: 0.5rem 1.125rem 0.5rem 0.5rem;
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

.crm-config-dropdown-trigger {
  position: absolute;
  right: 0.125rem;
  bottom: 0.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  padding: 0;
  border: none;
  border-radius: 0.125rem;
  background: transparent;
  color: var(--secondary-500);
  font-size: 0.625rem;
  line-height: 1;
  cursor: pointer;
}

.crm-config-dropdown-trigger:hover {
  color: var(--primary-600);
  background: var(--secondary-100);
}

.crm-config-dropdown {
  position: fixed;
  z-index: 9999;
  max-height: 12.5rem;
  overflow-y: auto;
  margin-top: 0.125rem;
  background: white;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.crm-config-dropdown-status {
  padding: 0.625rem 0.75rem;
  text-align: center;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.crm-config-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--secondary-200);
}

.crm-config-dropdown-item:last-child {
  border-bottom: none;
}

.crm-config-dropdown-item:hover,
.crm-config-dropdown-item.highlighted {
  background-color: var(--primary-50);
}

.crm-config-dropdown-item.selected {
  background-color: var(--primary-100);
}

.crm-config-dropdown-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.crm-config-dropdown-code {
  flex-shrink: 0;
  font-family: ui-monospace, monospace;
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
}
</style>

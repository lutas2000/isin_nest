<template>
  <div class="editable-cell">
    <!-- 文字輸入 -->
    <input
      v-if="column.type === 'text' || !column.type"
      ref="inputRef"
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
      ref="inputRef"
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

    <!-- 日期輸入 -->
    <input
      v-else-if="column.type === 'date'"
      ref="inputRef"
      type="date"
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

    <!-- 下拉選單 -->
    <select
      v-else-if="column.type === 'select'"
      ref="selectRef"
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
      ref="textareaRef"
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
      ref="selectRef"
      class="form-control"
      :value="value"
      @change="handleSelectChange($event)"
      @keydown="handleKeyDown"
      @blur="handleBlur"
    >
      <option :value="true">是</option>
      <option :value="false">否</option>
    </select>

    <!-- 可搜尋的下拉選單 -->
    <div
      v-else-if="column.type === 'search-select'"
      class="search-select-container"
    >
      <input
        ref="searchInputRef"
        type="text"
        class="form-control search-input"
        :class="{ 
          'required-field-empty': column.required && (!value || value === ''),
          'form-control-error': column.required && (!value || value === '')
        }"
        :value="searchDisplayValue"
        @input="handleSearchInput($event)"
        @keydown="handleSearchKeyDown"
        @focus="handleSearchFocus"
        @blur="handleSearchSelectBlur"
        placeholder="輸入搜尋關鍵字..."
      />
      <Teleport to="body">
        <div 
          v-if="showSearchDropdown" 
          class="search-dropdown"
          :style="dropdownStyle"
        >
          <div v-if="searchLoading" class="search-loading">載入中...</div>
          <div
            v-else-if="searchResults.length === 0"
            class="search-no-results"
          >
            無搜尋結果
          </div>
          <div
            v-else
            class="search-results"
            ref="searchResultsRef"
          >
            <div
              v-for="(option, idx) in searchResults"
              :key="getOptionValue(option)"
              :ref="el => setResultItemRef(el, idx)"
              class="search-result-item"
              :class="{ 'selected': getOptionValue(option) === value, 'highlighted': highlightedIndex === idx }"
              @mousedown.prevent="selectSearchOption(option)"
              @mouseenter="highlightedIndex = idx"
            >
              {{ getOptionLabel(option) }}
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- 載入指示器 -->
    <span v-if="isSaving" class="saving-indicator">💾</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted } from 'vue';
import type { EditableColumn } from './EditableDataTable.vue';

interface Props {
  column: EditableColumn;
  value: any;
  row: any;
  isNew: boolean;
  isEditing: boolean;
  isFocused?: boolean;
  options?: Array<{value: any, label: string}>;
  searchFunction?: (searchTerm: string) => Promise<Array<{value: any, label: string}>>;
}

const props = withDefaults(defineProps<Props>(), {
  isFocused: false,
});

const emit = defineEmits<{
  'update:value': [value: any];
  'keydown': [event: KeyboardEvent];
  'blur': [];
}>();

const isSaving = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const selectRef = ref<HTMLSelectElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchResultsRef = ref<HTMLDivElement | null>(null);

// 可搜尋下拉選單相關狀態
const searchTerm = ref('');
const searchResults = ref<Array<{value: any, label: string}>>([]);
const searchLoading = ref(false);
const showSearchDropdown = ref(false);
const highlightedIndex = ref(-1);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const selectedOptionLabel = ref<string>('');
const dropdownStyle = ref<{ top: string; left: string; width: string }>({
  top: '0px',
  left: '0px',
  width: '0px',
});
const resultItemRefs = ref<(HTMLDivElement | null)[]>([]);

// 計算顯示值
const searchDisplayValue = computed(() => {
  // 如果用戶正在輸入搜尋關鍵字，顯示搜尋關鍵字
  if (searchTerm.value) {
    return searchTerm.value;
  }
  // 如果沒有搜尋關鍵字但有選中的值，顯示選中的 label
  if (props.value && selectedOptionLabel.value) {
    return selectedOptionLabel.value;
  }
  // 否則顯示空字串
  return '';
});

// 當 isFocused 變為 true 時，自動 focus 到對應的 input
watch(() => props.isFocused, (focused) => {
  if (focused) {
    nextTick(() => {
      const element = inputRef.value || selectRef.value || textareaRef.value || searchInputRef.value;
      if (element) {
        element.focus();
        // 如果是 input 或 textarea，選取所有文字
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.select();
        }
      }
    });
  }
}, { immediate: true });

// 監聽 value 變化，更新選中項的 label
watch(() => props.value, async (newValue) => {
  if (props.column.type === 'search-select' && newValue) {
    // 如果有 options，從中找對應的 label
    if (props.options && props.options.length > 0) {
      const option = props.options.find(opt => getOptionValue(opt) === newValue);
      if (option) {
        selectedOptionLabel.value = getOptionLabel(option);
        return;
      }
    }
    // 如果沒有找到，嘗試搜尋（用空字串搜尋以獲取所有結果）
    if (props.searchFunction) {
      try {
        const results = await props.searchFunction('');
        const option = results.find(opt => getOptionValue(opt) === newValue);
        if (option) {
          selectedOptionLabel.value = getOptionLabel(option);
        }
      } catch (err) {
        console.error('Failed to load option label:', err);
      }
    }
  } else if (!newValue) {
    selectedOptionLabel.value = '';
  }
}, { immediate: true });

// 計算下拉選單位置
const updateDropdownPosition = () => {
  if (!searchInputRef.value || !showSearchDropdown.value) {
    return;
  }
  
  nextTick(() => {
    if (!searchInputRef.value) return;
    
    const rect = searchInputRef.value.getBoundingClientRect();
    // 使用 fixed 定位，位置相對於視窗，不需要加上滾動偏移
    dropdownStyle.value = {
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  });
};

// 監聽下拉選單顯示狀態，更新位置
watch(() => showSearchDropdown.value, (show) => {
  if (show) {
    updateDropdownPosition();
    // 監聽滾動和調整大小事件
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
  } else {
    // 移除監聽器
    window.removeEventListener('scroll', updateDropdownPosition, true);
    window.removeEventListener('resize', updateDropdownPosition);
  }
});

// 組件卸載時清理事件監聽器
onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition, true);
  window.removeEventListener('resize', updateDropdownPosition);
});

// 設置結果項目的 ref
const setResultItemRef = (el: any, idx: number) => {
  if (el) {
    resultItemRefs.value[idx] = el as HTMLDivElement;
  }
};

// 監聽 highlightedIndex 變化，自動捲動到高亮的項目
watch(highlightedIndex, (newIndex) => {
  if (newIndex >= 0 && resultItemRefs.value[newIndex] && showSearchDropdown.value) {
    nextTick(() => {
      const highlightedItem = resultItemRefs.value[newIndex];
      if (highlightedItem && searchResultsRef.value) {
        highlightedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    });
  }
});

// 監聽 searchResults 變化，重置 refs 數組
watch(() => searchResults.value, () => {
  resultItemRefs.value = new Array(searchResults.value.length).fill(null);
}, { deep: true });

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
  // 當失去 focus 時，觸發保存事件
  emit('blur');
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

// 可搜尋下拉選單的處理函數
const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchTerm.value = target.value;
  highlightedIndex.value = -1;
  
  // 清除之前的計時器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  // 如果輸入框被清空，允許清空值（如果欄位不是必填）
  if (!searchTerm.value.trim()) {
    showSearchDropdown.value = false;
    searchResults.value = [];
    // 如果原本有值且欄位不是必填，允許清空
    if (props.value) {
      emit('update:value', '');
      selectedOptionLabel.value = '';
    }
    return;
  }

  // 顯示下拉選單
  showSearchDropdown.value = true;

  // 防抖搜尋
  searchDebounceTimer = setTimeout(async () => {
    if (!props.searchFunction) return;
    
    searchLoading.value = true;
    try {
      const results = await props.searchFunction(searchTerm.value.trim());
      searchResults.value = results;
      highlightedIndex.value = -1;
    } catch (err) {
      console.error('Search failed:', err);
      searchResults.value = [];
    } finally {
      searchLoading.value = false;
    }
  }, 300);
};

const handleSearchFocus = () => {
  // 如果已經有值，顯示下拉選單並搜尋
  if (searchTerm.value.trim() || props.value) {
    showSearchDropdown.value = true;
    if (searchTerm.value.trim() && props.searchFunction) {
      handleSearchInput({ target: searchInputRef.value } as any);
    }
  }
};

const handleSearchKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (showSearchDropdown.value && searchResults.value.length > 0) {
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        searchResults.value.length - 1
      );
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (showSearchDropdown.value) {
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (showSearchDropdown.value && highlightedIndex.value >= 0 && searchResults.value.length > 0) {
      selectSearchOption(searchResults.value[highlightedIndex.value]);
    } else {
      // 如果沒有高亮選項，發送 keydown 事件讓父組件處理
      emit('keydown', event);
    }
  } else if (event.key === 'Escape') {
    showSearchDropdown.value = false;
    searchTerm.value = '';
    emit('keydown', event);
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    // 當用戶刪除文字時，如果輸入框已清空且原本有值，允許清空值
    const target = event.target as HTMLInputElement;
    if (target.value === '' && props.value) {
      // 允許清空值（如果欄位不是必填）
      if (!props.column.required) {
        emit('update:value', '');
        selectedOptionLabel.value = '';
      }
    }
    // 繼續正常處理輸入
  } else {
    // 其他按鍵正常處理
    emit('keydown', event);
  }
};

const selectSearchOption = (option: {value: any, label: string}) => {
  const optionValue = getOptionValue(option);
  emit('update:value', optionValue);
  selectedOptionLabel.value = getOptionLabel(option);
  searchTerm.value = '';
  showSearchDropdown.value = false;
  highlightedIndex.value = -1;
};

const handleSearchSelectBlur = (event: FocusEvent) => {
  // 延遲隱藏，讓點擊選項的 mousedown 事件可以執行
  setTimeout(() => {
    // 檢查 focus 是否還在容器內
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!relatedTarget || !searchInputRef.value?.parentElement?.contains(relatedTarget)) {
      showSearchDropdown.value = false;
      // 如果沒有選中值，清空搜尋
      if (!props.value) {
        searchTerm.value = '';
      } else {
        // 恢復顯示選中的 label
        searchTerm.value = '';
      }
      // 發送 blur 事件，觸發父組件的保存邏輯
      emit('blur');
    }
  }, 200);
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

/* 可搜尋下拉選單樣式 */
.search-select-container {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
}

.search-dropdown {
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.25rem;
}

.search-loading,
.search-no-results {
  padding: 0.75rem;
  text-align: center;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.search-results {
  display: flex;
  flex-direction: column;
}

.search-result-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--secondary-200);
  transition: background-color 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover,
.search-result-item.highlighted {
  background-color: var(--primary-50);
}

.search-result-item.selected {
  background-color: var(--primary-100);
  font-weight: 500;
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

<template>
  <div 
    ref="tableRef"
    class="editable-data-table"
    @keydown="handleTableKeyDown"
    tabindex="0"
  >
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key">
              <span v-if="column.required" class="required-mark">*</span>
              {{ column.label }}
            </th>
            <th v-if="showActions">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 新增行（如果啟用） -->
          <tr 
            v-if="showNewRow" 
            :key="'new-row'"
            class="new-row"
            :class="{ 
              'editing-row': true,
              'focused-row': isNewRowFocused
            }"
          >
            <td v-for="column in columns" :key="column.key">
              <EditableCell
                v-if="isColumnEditable(column)"
                :column="column"
                :value="newRowData[column.key]"
                :row="newRowData"
                :is-new="true"
                :is-editing="true"
                :is-focused="isNewRowFocused && focusedFieldKey === column.key && isColumnEditable(column)"
                :options="getColumnOptions(column)"
                :search-function="column.searchFunction"
                @update:value="handleNewRowFieldChange(column.key, $event)"
                @keydown="handleFieldKeyDown($event, null, column.key, -1)"
                @blur="handleNewRowBlur"
              />
              <slot 
                v-else
                :name="`cell-${column.key}`" 
                :row="newRowData" 
                :value="newRowData[column.key]"
                :column="column"
              >
                <span v-if="column.truncate && typeof newRowData[column.key] === 'string'" class="truncated-text">
                  {{ truncateText(newRowData[column.key], 50) }}
                </span>
                <span v-else>{{ newRowData[column.key] }}</span>
              </slot>
            </td>
            <td v-if="showActions">
              <div class="action-buttons">
                <button 
                  class="btn btn-sm btn-success" 
                  @click="saveNewRow"
                  :disabled="!isNewRowValid"
                >
                  保存
                </button>
                <button 
                  class="btn btn-sm btn-outline" 
                  @click="cancelNewRow"
                >
                  取消
                </button>
              </div>
            </td>
          </tr>

          <!-- 資料行 -->
          <tr 
            v-for="(row, index) in data" 
            :key="getRowKey(row, index)"
            :class="{ 
              'editing-row': editingRowId === getRowKey(row, index),
              'new-row': isNewRow(row),
              'focused-row': focusedRowIndex === index && !isEditing(row, index)
            }"
            @dblclick="handleRowDblClick(row, index)"
          >
            <td v-for="column in columns" :key="column.key">
              <EditableCell
                v-if="isEditing(row, index) && isColumnEditable(column)"
                :column="column"
                :value="getEditingValue(row, column.key, index)"
                :row="row"
                :is-new="false"
                :is-editing="true"
                :is-focused="focusedRowIndex === index && focusedFieldKey === column.key"
                :options="getColumnOptions(column)"
                :search-function="column.searchFunction"
                @update:value="handleFieldChange(row, column.key, $event, index)"
                @keydown="handleFieldKeyDown($event, row, column.key, index)"
                @blur="handleFieldBlur(row, column.key, index)"
              />
              <slot 
                v-else
                :name="`cell-${column.key}`" 
                :row="row" 
                :value="row[column.key]"
                :column="column"
              >
                <span v-if="column.truncate && typeof row[column.key] === 'string'" class="truncated-text">
                  {{ truncateText(row[column.key], 50) }}
                </span>
                <span v-else>{{ row[column.key] }}</span>
              </slot>
            </td>
            <td v-if="showActions">
              <div class="action-buttons">
                <!-- 編輯模式：直接顯示 slot 內容或預設按鈕 -->
                <template v-if="isEditing(row, index)">
                  <slot 
                    name="actions" 
                    :row="row" 
                    :index="index" 
                    :is-editing="true"
                    :save="() => saveRow(row, index)"
                    :cancel="() => cancelEdit(row, index)"
                    :start-edit="() => startEdit(row, index)"
                  >
                    <button 
                      class="btn btn-sm btn-success" 
                      @click="saveRow(row, index)"
                    >
                      保存
                    </button>
                    <button 
                      class="btn btn-sm btn-outline" 
                      @click="cancelEdit(row, index)"
                    >
                      取消
                    </button>
                  </slot>
                </template>
                <!-- 非編輯模式：使用下拉選單，slot 內容放入下拉選單 -->
                <div 
                  class="actions-dropdown" 
                  :class="{ 'is-open': openDropdownIndex === index }"
                  :ref="(el) => setDropdownTriggerRef(el as HTMLElement | null, index)"
                >
                  <button 
                    class="actions-trigger"
                    @click="toggleDropdown(index)"
                    @blur="handleDropdownBlur"
                  >
                    <svg class="actions-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="5" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                      <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  <Teleport to="body">
                    <Transition name="dropdown-fade">
                      <div 
                        v-if="openDropdownIndex === index" 
                        class="dropdown-menu-portal"
                        :style="getDropdownPosition(index)"
                        @click="handleDropdownItemClick"
                      >
                        <div class="dropdown-menu-content">
                          <slot 
                            name="actions" 
                            :row="row" 
                            :index="index" 
                            :is-editing="false"
                            :save="() => saveRow(row, index)"
                            :cancel="() => cancelEdit(row, index)"
                            :start-edit="() => { startEdit(row, index); closeDropdown(); }"
                          >
                            <span 
                              class="dropdown-item"
                              @click="startEdit(row, index)"
                            >
                              <svg class="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              編輯
                            </span>
                          </slot>
                        </div>
                      </div>
                    </Transition>
                  </Teleport>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 分頁控制 -->
    <div v-if="pagination" class="pagination-container">
      <div class="pagination-info">
        顯示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} 筆，共 {{ total }} 筆
      </div>
      <div class="pagination-controls">
        <select v-model="localPageSize" @change="handlePageSizeChange" class="page-size-select">
          <option :value="25">25 筆/頁</option>
          <option :value="50">50 筆/頁</option>
          <option :value="100">100 筆/頁</option>
        </select>
        <button 
          class="btn btn-sm btn-outline" 
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          上一頁
        </button>
        <span class="page-info">
          第 {{ currentPage }} / {{ totalPages }} 頁
        </span>
        <button 
          class="btn btn-sm btn-outline" 
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          下一頁
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import EditableCell from './EditableCell.vue';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface EditableColumn extends Column {
  editable?: boolean;
  required?: boolean;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'boolean' | 'search-select';
  options?: Array<{value: any, label: string}> | (() => Array<{value: any, label: string}>);
  searchFunction?: (searchTerm: string) => Promise<Array<{value: any, label: string}>>;
  truncate?: boolean;
  validator?: (value: any) => boolean;
}

interface Props {
  columns: EditableColumn[];
  data: any[];
  showActions?: boolean;
  rowKey?: string;
  pagination?: boolean;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  editable?: boolean;
  showNewRow?: boolean;
  newRowTemplate?: any;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  rowKey: 'id',
  pagination: false,
  currentPage: 1,
  pageSize: 50,
  total: 0,
  editable: true,
  showNewRow: false,
  newRowTemplate: () => ({}),
});

const emit = defineEmits<{
  'update:page': [page: number];
  'update:page-size': [pageSize: number];
  'field-change': [row: any, field: string, value: any, isNew: boolean];
  'save': [row: any, isNew: boolean];
  'cancel': [row: any];
  'new-row-save': [row: any];
  'new-row-cancel': [];
  'new-row-show': [];
  'row-delete': [row: any];
  'row-view': [row: any];
  'row-edit': [row: any, index: number];
}>();

const localPageSize = ref(props.pageSize);
const editingRowId = ref<string | null>(null);
const editingData = ref<Record<string, any>>({});
const newRowData = ref<any>({});
const focusedRowIndex = ref<number | null>(null);
const focusedFieldKey = ref<string | null>(null);
const isNewRowFocused = ref(false);
const tableRef = ref<HTMLDivElement | null>(null);
const openDropdownIndex = ref<number | null>(null);
const dropdownTriggerRefs = ref<Map<number, HTMLElement>>(new Map());

// 設定下拉選單觸發按鈕的 ref
const setDropdownTriggerRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    dropdownTriggerRefs.value.set(index, el);
  } else {
    dropdownTriggerRefs.value.delete(index);
  }
};

// 計算下拉選單位置
const getDropdownPosition = (index: number) => {
  const triggerEl = dropdownTriggerRefs.value.get(index);
  if (!triggerEl) {
    return { top: '0px', left: '0px' };
  }
  
  const rect = triggerEl.getBoundingClientRect();
  const menuWidth = 180; // 預估選單寬度
  const menuHeight = 200; // 預估選單高度
  
  // 計算位置，確保不會超出視窗
  let top = rect.bottom + 4;
  let left = rect.right - menuWidth;
  
  // 如果超出右邊界，往左調整
  if (left < 8) {
    left = rect.left;
  }
  
  // 如果超出下邊界，顯示在上方
  if (top + menuHeight > window.innerHeight - 8) {
    top = rect.top - menuHeight - 4;
  }
  
  return {
    top: `${top}px`,
    left: `${left}px`,
  };
};

const totalPages = computed(() => {
  return Math.ceil(props.total / props.pageSize);
});

// 可編輯欄位 keys
const editableColumnKeys = computed(() => {
  return props.columns
    .filter(col => isColumnEditable(col))
    .map(col => col.key);
});

// 取得第一個可編輯欄位 key
const getFirstEditableFieldKey = (): string | null => {
  return editableColumnKeys.value.length > 0 ? editableColumnKeys.value[0] : null;
};

// 取得下一個可編輯欄位 key
const getNextEditableFieldKey = (currentKey: string): string | null => {
  const currentIndex = editableColumnKeys.value.indexOf(currentKey);
  if (currentIndex === -1 || currentIndex === editableColumnKeys.value.length - 1) {
    return null;
  }
  return editableColumnKeys.value[currentIndex + 1];
};

// 取得上一個可編輯欄位 key
const getPrevEditableFieldKey = (currentKey: string): string | null => {
  const currentIndex = editableColumnKeys.value.indexOf(currentKey);
  if (currentIndex <= 0) {
    return null;
  }
  return editableColumnKeys.value[currentIndex - 1];
};

const getRowKey = (row: any, index: number) => {
  return row[props.rowKey] || `row-${index}`;
};

const isEditing = (row: any, index: number) => {
  return editingRowId.value === getRowKey(row, index);
};

const isNewRow = (row: any) => {
  return row.__isNew === true;
};

const isColumnEditable = (column: EditableColumn) => {
  return props.editable && (column.editable !== false);
};

const getEditingValue = (row: any, field: string, index: number) => {
  const key = getRowKey(row, index);
  // 如果正在編輯該行，優先使用 editingData 中的值（包括空字串、null、undefined）
  // 這樣可以確保用戶清空的值不會被原始資料覆蓋
  if (editingData.value[key] && field in editingData.value[key]) {
    return editingData.value[key][field];
  }
  return row[field];
};

const getColumnOptions = (column: EditableColumn): Array<{value: any, label: string}> => {
  if (!column.options) return [];
  if (typeof column.options === 'function') {
    return column.options();
  }
  return column.options as Array<{value: any, label: string}>;
};

const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 滑鼠雙擊 row 進入編輯模式
const handleRowDblClick = (row: any, index: number) => {
  // 若整個表格不可編輯，或該列已在編輯中，就不處理
  if (!props.editable || isEditing(row, index)) {
    return;
  }

  startEdit(row, index);
  emit('row-edit', row, index);
};

const isNewRowValid = computed(() => {
  return props.columns
    .filter(col => col.required)
    .every(col => {
      const value = newRowData.value[col.key];
      return value !== undefined && value !== null && value !== '';
    });
});

// 初始化新增行資料
watch(() => props.showNewRow, (show) => {
  if (show && props.newRowTemplate) {
    newRowData.value = typeof props.newRowTemplate === 'function' 
      ? props.newRowTemplate() 
      : { ...props.newRowTemplate };
    // 當顯示新增行時，設定 focus
    isNewRowFocused.value = true;
    focusedFieldKey.value = getFirstEditableFieldKey();
    focusedRowIndex.value = null;
  } else if (!show) {
    newRowData.value = {};
    isNewRowFocused.value = false;
    // 恢復 focus 到第一筆資料
    if (props.data.length > 0) {
      focusedRowIndex.value = 0;
      focusedFieldKey.value = null;
    }
  }
}, { immediate: true });

// 監聯資料變化，確保 focus row 有效
watch(() => props.data, (newData) => {
  // 如果正在編輯某一行，保持 editingData 不變（避免資料更新時覆蓋編輯中的值）
  if (editingRowId.value) {
    // 找到正在編輯的行在新資料中的位置
    const editingRow = newData.find((row: any, idx: number) => 
      getRowKey(row, idx) === editingRowId.value
    );
    if (editingRow) {
      // 更新 editingData 中不存在的欄位（保持用戶正在編輯的欄位不變）
      const key = editingRowId.value;
      if (editingData.value[key]) {
        // 只更新 editingData 中不存在的欄位，保留用戶已編輯的欄位
        Object.keys(editingRow).forEach(field => {
          if (!(field in editingData.value[key])) {
            editingData.value[key][field] = editingRow[field];
          }
        });
      }
    }
  }
  
  if (newData.length > 0) {
    // 如果有資料但沒有 focus row，設定為第一筆
    if (focusedRowIndex.value === null && !isNewRowFocused.value) {
      focusedRowIndex.value = 0;
    }
    // 如果 focus row index 超出範圍，調整為最後一筆
    else if (focusedRowIndex.value !== null && focusedRowIndex.value >= newData.length) {
      focusedRowIndex.value = Math.max(0, newData.length - 1);
    }
  } else {
    // 沒有資料時清除 focus
    focusedRowIndex.value = null;
    focusedFieldKey.value = null;
  }
}, { immediate: true });

// 初始化 focus
onMounted(() => {
  if (props.data.length > 0 && !props.showNewRow) {
    focusedRowIndex.value = 0;
  }
  // 自動 focus 到表格，讓鍵盤操作可以立即使用
  nextTick(() => {
    if (tableRef.value) {
      tableRef.value.focus();
    }
  });
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:page', page);
  }
};

const handlePageSizeChange = () => {
  emit('update:page-size', localPageSize.value);
  emit('update:page', 1);
};

const startEdit = (row: any, index: number) => {
  const key = getRowKey(row, index);
  editingRowId.value = key;
  editingData.value[key] = { ...row };
  // 設定 focus
  focusedRowIndex.value = index;
  focusedFieldKey.value = getFirstEditableFieldKey();
  isNewRowFocused.value = false;
  // 等待 DOM 更新後 focus 到第一個欄位
  nextTick(() => {
    // focus 會由 EditableCell 的 isFocused prop 處理
  });
};

const cancelEdit = (row: any, index: number) => {
  const key = getRowKey(row, index);
  editingRowId.value = null;
  delete editingData.value[key];
  // 清除 field focus，保留 row focus
  focusedFieldKey.value = null;
  focusedRowIndex.value = index;
  isNewRowFocused.value = false;
  emit('cancel', row);
};

const saveRow = (row: any, index: number) => {
  const key = getRowKey(row, index);
  const editedData = editingData.value[key];
  if (editedData) {
    emit('save', { ...row, ...editedData }, false);
  }
  editingRowId.value = null;
  delete editingData.value[key];
  // 清除 field focus，保留 row focus
  focusedFieldKey.value = null;
  focusedRowIndex.value = index;
  isNewRowFocused.value = false;
};

const handleFieldChange = (row: any, field: string, value: any, index?: number) => {
  const rowIndex = index ?? (focusedRowIndex.value ?? 0);
  const key = getRowKey(row, rowIndex);
  // 確保 editingData 存在，如果不存在則初始化
  if (!editingData.value[key]) {
    editingData.value[key] = { ...row };
  }
  // 明確設置值，包括空字串、null、undefined
  // 只更新本地狀態，不觸發保存
  editingData.value[key][field] = value;
  // 不觸發 field-change 事件（避免自動保存）
  // emit('field-change', row, field, value, false);
};

// 處理欄位失去 focus（不再自動保存，只有按下保存按鈕或最後一個欄位 Enter 才保存）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleFieldBlur = (_row: any, _field: string, _index?: number) => {
  // 移除自動保存邏輯，保持編輯狀態
  // 用戶需要明確按下保存按鈕或最後一個欄位 Enter 才會保存
};

const handleNewRowFieldChange = (field: string, value: any) => {
  // 只更新本地狀態，不觸發保存
  newRowData.value[field] = value;
  // 不觸發 field-change 事件（避免自動保存）
  // emit('field-change', newRowData.value, field, value, true);
};

// 處理新增行欄位失去 focus
const handleNewRowBlur = () => {
  // 新增行失去 focus 時不自動保存，需要用戶明確點擊保存按鈕
  // 或者可以在最後一個欄位失去 focus 時自動保存（如果所有必填欄位都已填寫）
  // 這裡我們選擇不自動保存，讓用戶明確操作
};

const saveNewRow = () => {
  if (isNewRowValid.value) {
    emit('new-row-save', { ...newRowData.value });
    newRowData.value = typeof props.newRowTemplate === 'function' 
      ? props.newRowTemplate() 
      : { ...props.newRowTemplate };
    // 保存後，focus 回到第一筆資料（如果有的話）
    if (props.data.length > 0) {
      focusedRowIndex.value = 0;
      focusedFieldKey.value = null;
      isNewRowFocused.value = false;
    } else {
      focusedFieldKey.value = getFirstEditableFieldKey();
    }
  }
};

const cancelNewRow = () => {
  newRowData.value = typeof props.newRowTemplate === 'function' 
      ? props.newRowTemplate() 
      : { ...props.newRowTemplate };
  // 取消新增行，focus 回到第一筆資料（如果有的話）
  isNewRowFocused.value = false;
  focusedFieldKey.value = null;
  if (props.data.length > 0) {
    focusedRowIndex.value = 0;
  } else {
    focusedRowIndex.value = null;
  }
  emit('new-row-cancel');
};

// 處理表格層級的快捷鍵（row 層級）
const handleTableKeyDown = (event: KeyboardEvent) => {
  // 處理 Insert 或 F7 新增行快捷鍵（優先處理，不受其他狀態影響）
  if (event.key === 'Insert' || event.key === 'F7') {
    event.preventDefault();
    // 只有在沒有正在編輯任何欄位，且沒有正在顯示新增行時才觸發
    if (focusedFieldKey.value === null && !isNewRowFocused.value && !editingRowId.value) {
      emit('new-row-show');
    }
    return;
  }

  // 如果正在編輯欄位（有 focusedFieldKey），不處理 row 層級的快捷鍵
  if (focusedFieldKey.value !== null) {
    return;
  }

  // 如果是新增行模式，不處理 row 層級快捷鍵（新增行由欄位層級處理）
  if (isNewRowFocused.value) {
    return;
  }

  // 先處理上下鍵，避免瀏覽器捲動，並支援 row 之間的移動
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    if (props.data.length === 0) return;

    event.preventDefault();

    // 如果目前沒有 focus row，預設到第一筆
    if (focusedRowIndex.value === null) {
      focusedRowIndex.value = 0;
      return;
    }

    if (event.key === 'ArrowUp' && focusedRowIndex.value > 0) {
      focusedRowIndex.value -= 1;
    } else if (
      event.key === 'ArrowDown' &&
      focusedRowIndex.value < props.data.length - 1
    ) {
      focusedRowIndex.value += 1;
    }

    return;
  }

  if (focusedRowIndex.value === null || props.data.length === 0) {
    return;
  }

  const currentRow = props.data[focusedRowIndex.value];
  const currentIndex = focusedRowIndex.value;

  // 檢查是否正在編輯該 row
  const isEditingCurrentRow = editingRowId.value === getRowKey(currentRow, currentIndex);

  if (event.key === 'Delete' || event.key === 'Del') {
    // 只有在非編輯狀態時才允許刪除
    if (!isEditingCurrentRow) {
      event.preventDefault();
      emit('row-delete', currentRow);
    }
  } else if (event.key === 'Enter') {
    // 只有在非編輯狀態時才允許查看詳情
    if (!isEditingCurrentRow) {
      event.preventDefault();
      emit('row-view', currentRow);
    }
  } else if (event.key === 'F2') {
    // 只有在非編輯狀態時才允許進入編輯
    if (!isEditingCurrentRow) {
      event.preventDefault();
      startEdit(currentRow, currentIndex);
      emit('row-edit', currentRow, currentIndex);
    }
  } else if (event.key === 'Escape') {
    // 如果 row 正在編輯，取消編輯
    if (isEditingCurrentRow) {
      event.preventDefault();
      // 檢查是否為暫存 row
      if (currentRow.__isNew === true || currentRow.__isDraft === true) {
        // 丟棄暫存 row
        emit('row-delete', currentRow);
      } else {
        cancelEdit(currentRow, currentIndex);
      }
    }
  }
};

// 處理欄位層級的快捷鍵
const handleFieldKeyDown = (event: KeyboardEvent, row: any | null, fieldKey: string, rowIndex: number) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到表格層級
    if (row) {
      // 檢查是否為暫存 row
      if (row.__isNew === true || row.__isDraft === true) {
        emit('row-delete', row);
      } else {
        cancelEdit(row, rowIndex);
      }
    } else {
      cancelNewRow();
    }
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到表格層級，避免觸發查看詳情
    // Enter 鍵：移動到下一個欄位，只有最後一個欄位才保存並退出編輯
    const nextField = getNextEditableFieldKey(fieldKey);
    if (nextField) {
      // 跳到下一個欄位，保持編輯模式
      if (row) {
        // 確保仍在編輯模式
        if (editingRowId.value !== getRowKey(row, rowIndex)) {
          startEdit(row, rowIndex);
        }
        focusedFieldKey.value = nextField;
      } else {
        focusedFieldKey.value = nextField;
        isNewRowFocused.value = true;
      }
    } else {
      // 最後一個欄位，保存並退出編輯
      if (row) {
        saveRow(row, rowIndex);
      } else if (isNewRowValid.value) {
        saveNewRow();
      }
    }
  } else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到表格層級
    const nextField = getNextEditableFieldKey(fieldKey);
    if (nextField) {
      focusedFieldKey.value = nextField;
      if (row) {
        focusedRowIndex.value = rowIndex;
        isNewRowFocused.value = false;
      } else {
        isNewRowFocused.value = true;
      }
    }
  } else if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡到表格層級
    const prevField = getPrevEditableFieldKey(fieldKey);
    if (prevField) {
      focusedFieldKey.value = prevField;
      if (row) {
        focusedRowIndex.value = rowIndex;
        isNewRowFocused.value = false;
      } else {
        isNewRowFocused.value = true;
      }
    }
  }
  // 上下鍵在 select 中保留原生行為，不攔截
};

watch(() => props.pageSize, (newSize) => {
  localPageSize.value = newSize;
});

// 下拉選單控制
const toggleDropdown = (index: number) => {
  if (openDropdownIndex.value === index) {
    openDropdownIndex.value = null;
  } else {
    openDropdownIndex.value = index;
  }
};

const closeDropdown = () => {
  openDropdownIndex.value = null;
};

const handleDropdownBlur = (event: FocusEvent) => {
  // 延遲關閉，以便點擊下拉選單項目時不會立即關閉
  setTimeout(() => {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget && !tableRef.value?.contains(relatedTarget)) {
      closeDropdown();
    }
  }, 200);
};

const handleDropdownItemClick = (event: MouseEvent) => {
  // 點擊下拉選單項目時，延遲關閉下拉選單，確保點擊事件能夠執行
  const target = event.target as HTMLElement;
  if (target.classList.contains('dropdown-item') || target.closest('.dropdown-item')) {
    // 延遲關閉，讓點擊事件先執行
    setTimeout(() => {
      closeDropdown();
    }, 150);
  }
};

// 點擊外部關閉下拉選單
const handleClickOutside = (event: MouseEvent) => {
  if (openDropdownIndex.value !== null) {
    const target = event.target as HTMLElement;
    // 檢查是否點擊在下拉選單觸發按鈕或下拉選單內容上
    const isInTrigger = dropdownTriggerRefs.value.get(openDropdownIndex.value)?.contains(target);
    const isInPortal = target.closest('.dropdown-menu-portal');
    
    if (!isInTrigger && !isInPortal) {
      closeDropdown();
    }
  }
};

// 滾動或視窗大小改變時關閉下拉選單
const handleScrollOrResize = () => {
  if (openDropdownIndex.value !== null) {
    closeDropdown();
  }
};

// 監聯點擊外部事件
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', handleScrollOrResize, true);
  window.addEventListener('resize', handleScrollOrResize);
});

// 清理事件監聽器
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', handleScrollOrResize, true);
  window.removeEventListener('resize', handleScrollOrResize);
});

// 暴露狀態和方法供外部組件使用
defineExpose({
  focusedRowIndex,
  focusedFieldKey,
  isNewRowFocused,
  editingRowId,
  data: () => props.data,
  startEdit,
  cancelEdit,
  saveRow,
  saveNewRow,
  cancelNewRow,
});
</script>

<style scoped>
.editable-data-table {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.table th {
  background-color: var(--secondary-50);
  font-weight: 600;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table tbody tr:hover {
  background-color: var(--secondary-50);
}

.table tbody tr.editing-row {
  background-color: var(--primary-50);
  border: 2px solid var(--primary-300);
}

.table tbody tr.new-row {
  background-color: var(--info-50);
}

.table tbody tr.focused-row {
  background-color: var(--secondary-100);
  border-left: 3px solid var(--primary-500);
}

.editable-data-table:focus {
  outline: none;
}

.required-mark {
  color: var(--danger-600);
  margin-right: 0.25rem;
}

.truncated-text {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  position: relative;
  justify-content: center;
}

.actions-dropdown {
  position: relative;
  display: inline-flex;
}

.actions-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  color: var(--secondary-500);
  transition: all 0.2s ease;
}

.actions-trigger:hover {
  background: var(--secondary-100);
  color: var(--secondary-700);
  border-color: var(--secondary-200);
}

.actions-trigger:active {
  background: var(--secondary-200);
}

.actions-dropdown.is-open .actions-trigger {
  background: var(--primary-50);
  color: var(--primary-600);
  border-color: var(--primary-200);
}

.actions-icon {
  width: 18px;
  height: 18px;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid var(--secondary-200);
  background-color: var(--secondary-50);
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-info {
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  background: white;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.page-info {
  padding: 0 0.5rem;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .table-container {
    font-size: var(--font-size-sm);
  }
  
  .table th,
  .table td {
    padding: 0.5rem;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .pagination-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .pagination-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>

<!-- 下拉選單樣式（非 scoped，因為使用 Teleport 渲染到 body） -->
<style>
/* 下拉選單 Portal 容器 */
.dropdown-menu-portal {
  position: fixed;
  z-index: 9999;
}

/* 下拉選單內容 */
.dropdown-menu-content {
  background: white;
  border: 1px solid var(--secondary-200, #e5e7eb);
  border-radius: 8px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 10px 15px -3px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  max-width: 240px;
  overflow: hidden;
  padding: 4px;
}

/* 下拉選單項目 */
.dropdown-menu-content .dropdown-item,
.dropdown-menu-content button,
.dropdown-menu-content > * {
  display: flex !important;
  align-items: center;
  gap: 8px;
  width: 100% !important;
  padding: 10px 12px !important;
  margin: 0 !important;
  background: none !important;
  border: none !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  color: var(--secondary-700, #374151) !important;
  text-align: left !important;
  text-decoration: none !important;
  box-shadow: none !important;
  transition: all 0.15s ease !important;
  white-space: nowrap;
  user-select: none;
}

.dropdown-menu-content .dropdown-item:hover,
.dropdown-menu-content button:hover,
.dropdown-menu-content > *:hover {
  background: var(--secondary-100, #f3f4f6) !important;
  color: var(--secondary-900, #111827) !important;
}

.dropdown-menu-content .dropdown-item:active,
.dropdown-menu-content button:active,
.dropdown-menu-content > *:active {
  background: var(--secondary-200, #e5e7eb) !important;
  transform: scale(0.98);
}

/* 下拉選單項目圖示 */
.dropdown-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--secondary-500, #6b7280);
}

.dropdown-menu-content .dropdown-item:hover .dropdown-item-icon,
.dropdown-menu-content button:hover .dropdown-item-icon {
  color: var(--primary-600, #2563eb);
}

/* 危險操作樣式 */
.dropdown-menu-content .dropdown-item.danger,
.dropdown-menu-content button.danger,
.dropdown-menu-content .btn-danger {
  color: var(--danger-600, #dc2626) !important;
}

.dropdown-menu-content .dropdown-item.danger:hover,
.dropdown-menu-content button.danger:hover,
.dropdown-menu-content .btn-danger:hover {
  background: var(--danger-50, #fef2f2) !important;
  color: var(--danger-700, #b91c1c) !important;
}

.dropdown-menu-content .dropdown-item.danger .dropdown-item-icon,
.dropdown-menu-content .btn-danger .dropdown-item-icon {
  color: var(--danger-500, #ef4444);
}

/* 分隔線 */
.dropdown-menu-content .dropdown-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--secondary-200, #e5e7eb);
}

/* 下拉選單動畫 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.95);
}

.dropdown-fade-enter-to,
.dropdown-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 響應式設計 - 下拉選單 */
@media (max-width: 768px) {
  .dropdown-menu-content {
    min-width: 140px;
  }
  
  .dropdown-menu-content .dropdown-item,
  .dropdown-menu-content button,
  .dropdown-menu-content > * {
    padding: 8px 10px !important;
    font-size: 13px !important;
  }
}
</style>

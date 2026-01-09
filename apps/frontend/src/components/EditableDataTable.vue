<template>
  <div class="editable-data-table">
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
            :class="{ 'editing-row': true }"
          >
            <td v-for="column in columns" :key="column.key">
              <EditableCell
                :column="column"
                :value="newRowData[column.key]"
                :row="newRowData"
                :is-new="true"
                :is-editing="true"
                :options="getColumnOptions(column)"
                @update:value="handleNewRowFieldChange(column.key, $event)"
                @keydown="handleKeyDown($event, null, column.key)"
              />
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
              'new-row': isNewRow(row)
            }"
          >
            <td v-for="column in columns" :key="column.key">
              <EditableCell
                v-if="isEditing(row, index) && isColumnEditable(column)"
                :column="column"
                :value="getEditingValue(row, column.key, index)"
                :row="row"
                :is-new="false"
                :is-editing="true"
                :options="getColumnOptions(column)"
                @update:value="handleFieldChange(row, column.key, $event)"
                @keydown="handleKeyDown($event, row, column.key)"
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
                <slot name="actions" :row="row" :index="index" :is-editing="isEditing(row, index)">
                  <button 
                    v-if="!isEditing(row, index)"
                    class="btn btn-sm btn-primary" 
                    @click="startEdit(row, index)"
                  >
                    編輯
                  </button>
                  <template v-else>
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
                  </template>
                </slot>
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
import { ref, computed, watch } from 'vue';
import EditableCell from './EditableCell.vue';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface EditableColumn extends Column {
  editable?: boolean;
  required?: boolean;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'boolean';
  options?: Array<{value: any, label: string}> | (() => Array<{value: any, label: string}>);
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
}>();

const localPageSize = ref(props.pageSize);
const editingRowId = ref<string | null>(null);
const editingData = ref<Record<string, any>>({});
const newRowData = ref<any>({});

const totalPages = computed(() => {
  return Math.ceil(props.total / props.pageSize);
});

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
  } else if (!show) {
    newRowData.value = {};
  }
}, { immediate: true });

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
};

const cancelEdit = (row: any, index: number) => {
  const key = getRowKey(row, index);
  editingRowId.value = null;
  delete editingData.value[key];
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
};

const handleFieldChange = (row: any, field: string, value: any) => {
  const key = getRowKey(row, 0);
  if (!editingData.value[key]) {
    editingData.value[key] = { ...row };
  }
  editingData.value[key][field] = value;
  emit('field-change', row, field, value, false);
};

const handleNewRowFieldChange = (field: string, value: any) => {
  newRowData.value[field] = value;
  emit('field-change', newRowData.value, field, value, true);
};

const saveNewRow = () => {
  if (isNewRowValid.value) {
    emit('new-row-save', { ...newRowData.value });
    newRowData.value = typeof props.newRowTemplate === 'function' 
      ? props.newRowTemplate() 
      : { ...props.newRowTemplate };
  }
};

const cancelNewRow = () => {
  newRowData.value = typeof props.newRowTemplate === 'function' 
    ? props.newRowTemplate() 
    : { ...props.newRowTemplate };
  emit('new-row-cancel');
};

const handleKeyDown = (event: KeyboardEvent, row: any | null, field: string) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (row) {
      cancelEdit(row);
    } else {
      cancelNewRow();
    }
  } else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (row) {
      saveRow(row);
    } else if (isNewRowValid.value) {
      saveNewRow();
    }
  }
  // Tab 導航由瀏覽器原生處理
};

watch(() => props.pageSize, (newSize) => {
  localPageSize.value = newSize;
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

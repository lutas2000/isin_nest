<template>
  <div class="shortcut-hint" :class="{ 'empty': !hasShortcuts }">
    <div class="shortcut-list" v-if="hasShortcuts">
      <button
        v-for="shortcut in visibleShortcuts"
        :key="shortcut.key"
        class="shortcut-button"
        :class="{ 'disabled': shortcut.disabled }"
        :disabled="shortcut.disabled"
        :aria-label="shortcut.label"
        @click="handleShortcutClick(shortcut)"
      >
        <span class="shortcut-key">{{ shortcut.display }}</span>
        <span class="shortcut-label">{{ shortcut.label }}</span>
      </button>
    </div>
    <div v-else class="shortcut-placeholder">
      <span class="placeholder-text">無可用快捷鍵</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface TableState {
  focusedRowIndex: number | null;
  focusedFieldKey: string | null;
  isNewRowFocused: boolean;
  editingRowId: string | null;
  data: () => any[];
}

interface Shortcut {
  key: string;
  display: string;
  label: string;
  disabled?: boolean;
  action: string;
}

interface Props {
  tableState: TableState | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'shortcut-click': [action: string, shortcut: Shortcut];
}>();

// 判斷當前狀態
const isRowLevel = computed(() => 
  props.tableState?.focusedFieldKey === null && 
  !props.tableState?.isNewRowFocused
);

const isFieldLevel = computed(() => 
  props.tableState?.focusedFieldKey !== null && 
  !props.tableState?.isNewRowFocused
);

const isNewRowLevel = computed(() => 
  props.tableState?.isNewRowFocused === true
);

const isEditing = computed(() => 
  props.tableState?.editingRowId !== null
);

// 定義所有快捷鍵
const allShortcuts = computed<Shortcut[]>(() => {
  const shortcuts: Shortcut[] = [];

  if (isRowLevel.value) {
    // Row 層級快捷鍵
    const hasData = props.tableState?.data() && props.tableState.data().length > 0;
    const currentRowIndex = props.tableState?.focusedRowIndex ?? null;
    
    shortcuts.push(
      {
        key: 'insert',
        display: 'Insert / F7',
        label: '新增',
        disabled: isEditing.value,
        action: 'new-row-show'
      },
      {
        key: 'arrow-up',
        display: '↑',
        label: '上一行',
        disabled: !hasData || currentRowIndex === null || currentRowIndex === 0,
        action: 'arrow-up'
      },
      {
        key: 'arrow-down',
        display: '↓',
        label: '下一行',
        disabled: !hasData || currentRowIndex === null || (currentRowIndex >= (props.tableState?.data().length ?? 0) - 1),
        action: 'arrow-down'
      },
      {
        key: 'enter',
        display: 'Enter',
        label: '查看詳情',
        disabled: !hasData || currentRowIndex === null || isEditing.value,
        action: 'row-view'
      },
      {
        key: 'f2',
        display: 'F2',
        label: '編輯',
        disabled: !hasData || currentRowIndex === null || isEditing.value,
        action: 'row-edit'
      },
      {
        key: 'delete',
        display: 'Delete',
        label: '刪除',
        disabled: !hasData || currentRowIndex === null || isEditing.value,
        action: 'row-delete'
      }
    );

    // 如果正在編輯，顯示 Escape
    if (isEditing.value) {
      shortcuts.push({
        key: 'escape',
        display: 'Esc',
        label: '取消編輯',
        action: 'cancel-edit'
      });
    }
  } else if (isFieldLevel.value) {
    // Field 層級快捷鍵
    shortcuts.push(
      {
        key: 'enter',
        display: 'Enter',
        label: '保存並下一欄位',
        action: 'save-and-next'
      },
      {
        key: 'tab',
        display: 'Tab',
        label: '下一欄位',
        action: 'next-field'
      },
      {
        key: 'shift-tab',
        display: 'Shift+Tab',
        label: '上一欄位',
        action: 'prev-field'
      },
      {
        key: 'escape',
        display: 'Esc',
        label: '取消編輯',
        action: 'cancel-edit'
      }
    );
  } else if (isNewRowLevel.value) {
    // New Row 層級快捷鍵
    shortcuts.push(
      {
        key: 'enter',
        display: 'Enter',
        label: '保存並下一欄位',
        action: 'save-and-next'
      },
      {
        key: 'tab',
        display: 'Tab',
        label: '下一欄位',
        action: 'next-field'
      },
      {
        key: 'shift-tab',
        display: 'Shift+Tab',
        label: '上一欄位',
        action: 'prev-field'
      },
      {
        key: 'escape',
        display: 'Esc',
        label: '取消新增',
        action: 'cancel-new-row'
      }
    );
  }

  return shortcuts;
});

// 過濾出可見且未禁用的快捷鍵
const visibleShortcuts = computed(() => {
  return allShortcuts.value.filter(s => !s.disabled);
});

// 是否有快捷鍵可顯示
const hasShortcuts = computed(() => {
  return visibleShortcuts.value.length > 0;
});

// 處理快捷鍵點擊
const handleShortcutClick = (shortcut: Shortcut) => {
  if (shortcut.disabled) return;
  emit('shortcut-click', shortcut.action, shortcut);
};
</script>

<style scoped>
.shortcut-hint {
  background: var(--secondary-50);
  border: 1px solid var(--secondary-200);
  border-radius: var(--border-radius);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  min-height: 60px;
  display: flex;
  align-items: center;
}

.shortcut-hint.empty {
  justify-content: center;
}

.shortcut-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.shortcut-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--secondary-700);
}

.shortcut-button:hover:not(:disabled) {
  background: var(--primary-50);
  border-color: var(--primary-300);
  color: var(--primary-700);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.shortcut-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-button:disabled,
.shortcut-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--secondary-100);
}

.shortcut-key {
  font-weight: 600;
  font-family: 'Courier New', monospace;
  background: var(--secondary-100);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.875rem;
  min-width: 1.5rem;
  text-align: center;
  display: inline-block;
}

.shortcut-button:hover:not(:disabled) .shortcut-key {
  background: var(--primary-100);
}

.shortcut-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.shortcut-button:hover:not(:disabled) .shortcut-label {
  color: var(--primary-700);
}

.shortcut-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 60px;
}

.placeholder-text {
  color: var(--secondary-500);
  font-size: var(--font-size-sm);
  font-style: italic;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .shortcut-hint {
    padding: 0.5rem 0.75rem;
    min-height: 50px;
  }

  .shortcut-list {
    gap: 0.375rem;
  }

  .shortcut-button {
    padding: 0.25rem 0.5rem;
    font-size: var(--font-size-xs);
  }

  .shortcut-key {
    font-size: 0.75rem;
    padding: 0.125rem 0.25rem;
    min-width: 1.25rem;
  }

  .shortcut-label {
    font-size: var(--font-size-xs);
  }
}
</style>

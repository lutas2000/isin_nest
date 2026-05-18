<template>
  <div
    class="mb-4 flex min-h-[50px] items-center rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 md:min-h-[60px] md:px-4 md:py-3"
    :class="{ 'justify-center': !hasShortcuts }"
  >
    <div
      v-if="hasShortcuts"
      class="flex w-full flex-wrap items-center gap-1.5 md:gap-2"
    >
      <button
        v-for="shortcut in visibleShortcuts"
        :key="shortcut.key"
        type="button"
        class="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-secondary-300 bg-white px-2 py-1 text-xs text-secondary-700 transition-all duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:bg-secondary-100 disabled:opacity-40 md:px-3 md:py-1.5 md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        :disabled="shortcut.disabled"
        :aria-label="shortcut.label"
        @click="handleShortcutClick(shortcut)"
      >
        <span
          class="inline-block min-w-5 rounded px-1 py-0.5 text-center font-mono text-xs font-semibold bg-secondary-100 group-hover:bg-primary-100 md:min-w-6 md:px-1.5 md:text-sm"
        >
          {{ shortcut.display }}
        </span>
        <span
          class="text-xs text-secondary-600 group-hover:text-primary-700 md:text-sm"
        >
          {{ shortcut.label }}
        </span>
      </button>
    </div>
    <div
      v-else
      class="flex min-h-[50px] w-full items-center justify-center md:min-h-[60px]"
    >
      <span class="text-xs italic text-secondary-500 md:text-sm">
        無可用快捷鍵
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EditableTableShortcutState } from '@/utils/editableTableShortcutState';

interface Shortcut {
  key: string;
  display: string;
  label: string;
  disabled?: boolean;
  action: string;
}

interface Props {
  tableState: EditableTableShortcutState | null;
  /** 不顯示的快捷鍵 key（如 'f2'） */
  hiddenKeys?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  hiddenKeys: () => [],
});

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

const isTableEditable = computed(() => props.tableState?.editable ?? true);
const canKeyboardRowEdit = computed(() => props.tableState?.canKeyboardRowEdit ?? true);

// 定義所有快捷鍵
const allShortcuts = computed<Shortcut[]>(() => {
  const shortcuts: Shortcut[] = [];

  if (isRowLevel.value) {
    // Row 層級快捷鍵
    const hasData = props.tableState?.data() && props.tableState.data().length > 0;
    const currentRowIndex = props.tableState?.focusedRowIndex ?? null;

    if (isTableEditable.value) {
      shortcuts.push({
        key: 'insert',
        display: 'Insert / F7',
        label: '新增',
        disabled: isEditing.value,
        action: 'new-row-show',
      });
    }

    shortcuts.push(
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
    );

    if (canKeyboardRowEdit.value) {
      shortcuts.push({
        key: 'f2',
        display: 'F2',
        label: '編輯',
        disabled: !hasData || currentRowIndex === null || isEditing.value,
        action: 'row-edit',
      });
    }

    shortcuts.push({
      key: 'delete',
      display: 'Delete',
      label: '刪除',
      disabled: !hasData || currentRowIndex === null || isEditing.value,
      action: 'row-delete',
    });

    // 如果正在編輯，顯示 Escape
    if (isEditing.value && isTableEditable.value) {
      shortcuts.push({
        key: 'escape',
        display: 'Esc',
        label: '取消編輯',
        action: 'cancel-edit'
      });
    }
  } else if (isFieldLevel.value && isTableEditable.value) {
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

    if (props.tableState?.focusedFieldKey === 'customerFile') {
      shortcuts.push({
        key: 'f10',
        display: 'F10',
        label: '搜尋客戶型號',
        action: 'order-item-search',
      });
    }

    if (props.tableState?.focusedFieldKey === 'drawingNumber') {
      shortcuts.push({
        key: 'f10',
        display: 'F10',
        label: '搜尋電腦圖號',
        action: 'order-item-search',
      });
    }

    if (props.tableState?.focusedFieldKey === 'customerId') {
      shortcuts.push({
        key: 'f10',
        display: 'F10',
        label: '搜尋客戶',
        action: 'customer-search',
      });
    }
  } else if (isNewRowLevel.value && isTableEditable.value) {
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

    if (props.tableState?.focusedFieldKey === 'customerId') {
      shortcuts.push({
        key: 'f10',
        display: 'F10',
        label: '搜尋客戶',
        action: 'customer-search',
      });
    }
  }

  return shortcuts;
});

// 過濾出可見且未禁用的快捷鍵
const visibleShortcuts = computed(() => {
  const hidden = new Set(props.hiddenKeys);
  return allShortcuts.value.filter(s => !s.disabled && !hidden.has(s.key));
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

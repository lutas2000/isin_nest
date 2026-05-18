import type EditableDataTable from '@/components/EditableDataTable.vue';

export interface EditableTableShortcutState {
  focusedRowIndex: number | null;
  focusedFieldKey: string | null;
  isNewRowFocused: boolean;
  editingRowId: string | null;
  data: () => any[];
  /** 對應 EditableDataTable 的 editable */
  editable: boolean;
  /** 對應 editable && dblClickToEdit，F2 行內編輯是否可用 */
  canKeyboardRowEdit: boolean;
}

export function buildEditableTableShortcutState(
  tableRef: InstanceType<typeof EditableDataTable> | null | undefined,
  options?: { data?: () => any[] },
): EditableTableShortcutState | null {
  if (!tableRef) return null;

  return {
    focusedRowIndex: tableRef.focusedRowIndex,
    focusedFieldKey: tableRef.focusedFieldKey,
    isNewRowFocused: tableRef.isNewRowFocused,
    editingRowId: tableRef.editingRowId,
    data: options?.data ?? tableRef.data,
    editable: tableRef.isTableEditable(),
    canKeyboardRowEdit: tableRef.canKeyboardRowEdit(),
  };
}

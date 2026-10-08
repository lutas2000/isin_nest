import { nextTick } from 'vue';
import {
  copyPreviousTransactionLine,
  deleteTransactionLine,
  insertTransactionLine,
  type BlankLine,
  type TransactionLine,
} from './transactionLines';

// Function keys of a legacy detail grid (isin_vb6 src/utils/lineKeys.js, Win7
// 2026-10-07), handled on the <tbody> whose rows carry data-index:
//   F2 複製上一筆 (only where the grid offers it), F3 插入一筆, F4 刪除此筆,
//   and the form's own keys in `actions` (F8, F11, F12 …), each given the row index.
// F3／F4 only change the screen, as on Win7; the form is saved with 更新／存檔.
// Returns the new items, or null when the key is not one of these.
export interface LineKeyOptions<T extends TransactionLine> {
  blank: BlankLine<T>;
  minimum?: number;
  copyPrevious?: boolean;
  actions?: Record<string, (index: number) => unknown>;
}

export function lineKeyItems<T extends TransactionLine>(
  event: KeyboardEvent,
  items: T[],
  { blank, minimum = 1, copyPrevious = false, actions = {} }: LineKeyOptions<T>,
): T[] | null {
  const target = event.target as HTMLElement | null;
  const row = target?.closest?.<HTMLTableRowElement>('tr[data-index]');
  if (!row) return null;
  const index = Number(row.dataset.index);
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    action(index);
    return items;
  }
  let next: T[] | null = null;
  if (event.key === 'F3') next = insertTransactionLine(items, index, blank);
  else if (event.key === 'F4')
    next = deleteTransactionLine(items, index, blank, minimum);
  else if (event.key === 'F2' && copyPrevious)
    next = copyPreviousTransactionLine(items, index);
  if (!next) return null;
  event.preventDefault();
  refocus(
    row.parentElement as HTMLTableSectionElement | null,
    index,
    target?.closest?.('td')?.cellIndex ?? 1,
  );
  return next;
}

// Rows are re-keyed when renumbered, so put the cursor back in the same cell.
function refocus(
  tbody: HTMLTableSectionElement | null,
  index: number,
  cellIndex: number,
) {
  void nextTick(() =>
    tbody?.rows[index]?.cells[cellIndex]?.querySelector('input')?.focus(),
  );
}

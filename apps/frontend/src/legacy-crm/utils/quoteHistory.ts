import {
  fetchAssistRows,
  type AssistColumn,
  type AssistRow,
} from './legacyAssist';
import type { BlankLine, TransactionLine } from './transactionLines';

// The 「{客戶} 報價記錄」 window of 訂單／報價登錄 F8 (isin_vb6
// src/utils/quoteHistory.js, Win7 2026-10-07/08): the customer's latest quote
// of each 客戶型號／材質／厚度, newest first.
export const QUOTE_HISTORY_COLUMNS: AssistColumn[] = [
  { key: 'customer_model', label: '客戶型號' },
  { key: 'material', label: '材質' },
  { key: 'thickness', label: '厚度' },
  { key: 'summary', label: '摘要' },
  { key: 'quantity', label: '數　量', align: 'right' },
  { key: 'unit_price', label: '單　價', align: 'right' },
  { key: 'quote_date', label: '日　期', align: 'right' },
];

export const QUOTE_HISTORY_HINT =
  '若要變更選擇，用↑、↓鍵移方框至該筆再按空白鍵，或滑鼠單擊該筆，可切換選取狀態(具＊者為選取項)。然後用滑鼠敲擊『確定』鈕將資料代入，敲擊『取消』鈕放棄資料代入。';

export async function loadQuoteHistory(customer: string): Promise<AssistRow[]> {
  return (await fetchAssistRows('quote-history', { customer })).map((row) => ({
    ...row,
    key: `${row.quote_no}\u0000${row.line_no}`,
    quantity: Number(row.quantity).toFixed(2),
    unit_price: Number(row.unit_price).toFixed(2),
  }));
}

// The chosen rows replace the grid rows from the cursor down, in the
// window's order; `fill(blank, row)` makes each replacement line.
export function placeQuoteRows<T extends TransactionLine>(
  items: T[],
  index: number,
  chosen: AssistRow[],
  blankLine: BlankLine<T>,
  fill: (line: T, row: AssistRow) => T,
): T[] {
  const next = [...items];
  chosen.forEach((row, offset) => {
    const at = index + offset;
    if (at >= 99) return;
    while (next.length <= at) next.push(blankLine(next.length + 1));
    next[at] = fill(
      {
        ...blankLine(Number(next[at].line_no)),
        ...('legacy_sn' in next[at] ? { legacy_sn: next[at].legacy_sn } : {}),
      },
      row,
    );
  });
  return next;
}

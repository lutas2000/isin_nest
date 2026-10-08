// Status-bar texts of the legacy transaction and master forms, set as each
// field gets the focus (read from the executable's GotFocus handlers and checked on
// Win7 2026-10-08). A field is tagged with data-hint; a text field without
// one clears the bar, as the legacy text boxes do, and a drop-down leaves it
// as it was. Some legacy texts sit on the neighbouring column (訂單「代料」
// shows the F10 text meant for 後加工, 收款「銀行帳號」 and「代收」 too) and
// are kept as they are.
export const FORM_HINT =
  'F1輔助輸入。若要查已知編號內容，請於輸入完整編號後，按Enter鍵。';
export const ASSIST_HINT = 'F1輔助輸入。';
export const PHRASE_HINT = 'F10輔助詞彙輸入。';

export const LINE_HINTS = {
  orders:
    'F1輔助輸入，F2建立工件圖檔，F3插入一筆，F4刪除此筆，F8查報價記錄，F9查完成數，F11秀圖，F12查交易歷史。',
  sales: 'F1輔助輸入，F3插入一筆，F4刪除此筆，F11秀圖，F12交易歷史。',
  quotes: 'F1輔助輸入，F3插入一筆空白，F4刪除此筆，F8查報價記錄。',
  quoteNotes: 'F3插入一筆空白，F4刪除此筆。',
  work: 'F1輔助輸入，F3插入一筆，F4刪除此筆，F8圖組展開，F9查完工記錄，F11秀圖。',
  groups: 'F1輔助輸入，F2複製上一筆，F3插入一筆，F4刪除此筆。',
  receiptPayments:
    'F1輔助輸入,F3在此插入空白,F4刪除此項(須再執行增加或修改才生效)。',
};

// The quote form's own wording of the F1／F10 texts.
export const QUOTE_MATERIAL_HINT = 'F1輔助查詢。';
export const QUOTE_PHRASE_HINT = 'F10輔助輸入詞彙。';
// 收款: 代收 column and the 保留 mark of an allocation line.
export const RECEIPT_NUMBER_HINT = 'F1輔助輸入號碼。';
export const RECEIPT_RESERVE_HINT =
  '按任意鍵決定此筆資料沖帳與否，當此欄內容為＊時，此筆出貨不沖帳。';

// 主檔: 工件「客戶型號」 and the 廠商 fields whose text names F12 展開顯示
// (LegacyExpandWindow.vue; F12 works on every 客戶／廠商 field).
export const PART_MODEL_HINT = 'F1輔助客戶型號查詢。';
export const SUPPLIER_EXPAND_HINT = 'F12展開顯示。';

// The text for a focused element, or undefined to leave the bar unchanged.
export function focusHint(element: EventTarget | null): string | undefined {
  if (!(element instanceof Element) || element.closest('[role="dialog"]'))
    return undefined;
  if (element instanceof HTMLTextAreaElement) return element.dataset.hint ?? '';
  if (
    !(element instanceof HTMLInputElement) ||
    ['checkbox', 'radio', 'button', 'file'].includes(element.type)
  )
    return undefined;
  return element.dataset.hint ?? '';
}

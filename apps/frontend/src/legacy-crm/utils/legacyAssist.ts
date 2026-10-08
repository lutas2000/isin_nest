import { reactive } from 'vue';
import { legacyGet, queryString } from '../services/legacyApi';

// F1 輔助輸入 and F10 詞彙 as the legacy forms do them (isin_vb6
// docs/legacy-ui-spec.md「F1 輔助輸入」, checked on Win7 2026-10-07). F1 on a
// code field opens a 「…查詢」 window of rows starting with what the field
// holds; on a few short fields it instead steps the field through a fixed
// list of values.

export type AssistRow = Record<string, any>;

export interface AssistColumn {
  key: string;
  label: string;
  align?: 'right';
  format?: (value: any, row: AssistRow) => string;
}

export interface AssistWindowDefinition {
  title: string;
  columns: AssistColumn[];
  preview?: boolean;
  detailColumns?: AssistColumn[];
  hint?: string;
}

const fixed2 = (value: unknown) =>
  value == null || value === '' ? '' : Number(value).toFixed(2);
const blankZero = (value: unknown) => (Number(value) ? fixed2(value) : '');

const partColumns: AssistColumn[] = [
  { key: 'drawing_no', label: '電腦圖號' },
  { key: 'customer_model', label: '客戶型號' },
  { key: 'material', label: '材質' },
  { key: 'thickness', label: '厚度' },
  { key: 'customer_code', label: '' },
];
const partnerColumns = (noun: string): AssistColumn[] => [
  { key: 'code', label: `${noun}編號` },
  { key: 'short_name', label: '簡稱' },
  { key: 'phone', label: '電話' },
  { key: 'latest', label: '最近交易', align: 'right' },
];

export const ASSIST_WINDOWS: Record<string, AssistWindowDefinition> = {
  customer: { title: '客戶資料查詢', columns: partnerColumns('客戶') },
  supplier: { title: '廠商資料查詢', columns: partnerColumns('廠商') },
  employee: {
    title: '員工資料查詢',
    columns: [
      { key: 'code', label: '編號' },
      { key: 'name', label: '姓名' },
    ],
  },
  part: { title: '工件資料查詢', columns: partColumns, preview: true },
  'part-model': { title: '工件資料查詢', columns: partColumns, preview: true },
  material: {
    title: '材質查詢',
    columns: [
      { key: 'material', label: '材質' },
      { key: 'thickness', label: '厚度' },
      { key: 'name', label: '品名' },
      { key: 'category', label: '類別' },
    ],
  },
  group: {
    title: '圖組查詢',
    columns: [
      { key: 'group_no', label: '圖組編號' },
      { key: 'customer_drawing_no', label: '客戶型號' },
      { key: 'customer_name', label: '客戶' },
    ],
  },
  'group-file': {
    title: '圖組建檔查詢',
    columns: [
      { key: 'group_no', label: '圖組編號' },
      { key: 'customer_drawing_no', label: '客戶圖號' },
      { key: 'customer_name', label: '客戶' },
      { key: 'created_date', label: '建檔日期', align: 'right' },
    ],
  },
  bank: {
    title: '銀行資料查詢',
    columns: [
      { key: 'account', label: '銀行帳號' },
      { key: 'short_name', label: '銀行簡稱' },
    ],
  },
  phrase: {
    title: '詞彙輔助輸入',
    columns: [
      { key: 'code', label: '編號' },
      { key: 'content', label: '內容' },
    ],
  },
  'open-order': {
    title: '訂單資料查詢',
    columns: [
      { key: 'order_no', label: '訂單編號' },
      { key: 'customer_name', label: '客戶' },
      { key: 'order_date', label: '訂單日期', align: 'right' },
      { key: 'delivery_date', label: '交貨期限', align: 'right' },
      { key: 'actor_name', label: '業務' },
      { key: 'payment_method', label: '收款條件' },
      { key: 'delivery_method', label: '送貨方式' },
      { key: 'note', label: '備註' },
    ],
    detailColumns: [
      { key: 'drawing_no', label: '電腦圖號' },
      { key: 'customer_model', label: '客戶型號' },
      { key: 'material', label: '材質' },
      { key: 'thickness', label: '厚度' },
      { key: 'outsource', label: '代料' },
      { key: 'quantity', label: '訂單數', align: 'right', format: fixed2 },
      { key: 'shipped', label: '已交數', align: 'right', format: blankZero },
      { key: 'unit', label: '單位' },
    ],
    hint: '用滑鼠左鍵雙擊(Double Click)欲選項目，或以方向鍵(↑、↓、PgUp、PgDn)移動虛線方框至欲選項目，再按Space鍵顯示明細，按Enter鍵來選擇，按Esc鍵放棄。',
  },
};

// 工作登錄 shows only the first four order columns.
export const BRIEF_ORDER_COLUMNS = ASSIST_WINDOWS['open-order'].columns.slice(
  0,
  4,
);

// Values F1 steps through, in the legacy order; a value not in the list
// starts again from the first.
export const ASSIST_CYCLES = {
  unit: ['片', '組', '台', '只', ''],
  outsource: ['代', '備', '代折', '備折', '折'],
  source: ['舊檔', '修改', '備片', '新圖'],
  tax: ['外加', '內含', '免稅', ''],
  payment: ['自票', '客票', '現金'],
};

export function nextCycleValue(values: string[], value: unknown): string {
  const index = values.indexOf(String(value ?? '').trim());
  return values[(index + 1) % values.length];
}

export const PART_MODEL_REQUIRED = '請輸入客戶型號至少前一個字，提升查詢效率';

export interface AssistFilters {
  prefix?: unknown;
  customer?: unknown;
  order?: unknown;
}

export async function fetchAssistRows(
  kind: string,
  { prefix = '', customer = '', order = '' }: AssistFilters = {},
): Promise<AssistRow[]> {
  const params = new URLSearchParams();
  if (String(prefix).trim()) params.set('prefix', String(prefix).trim());
  if (String(customer).trim()) params.set('customer', String(customer).trim());
  if (order) params.set('order', String(order));
  return (
    await legacyGet<{ items: AssistRow[] }>(
      `/assist/${kind}${queryString(params)}`,
    )
  ).items;
}

export interface AssistWindowState extends AssistWindowDefinition {
  rows: AssistRow[];
  loading: boolean;
  error: string;
  onSelect?: (row: AssistRow) => void;
}

export interface AssistOpenOptions extends AssistFilters {
  columns?: AssistColumn[] | null;
  onSelect: (row: AssistRow) => void;
}

// State for one form's F1 window and F10 prompt, shown by LegacyAssistHost.
export function useLegacyAssist() {
  const state = reactive<{
    window: AssistWindowState | null;
    phrase: { code: string; append: (content: string) => void } | null;
  }>({ window: null, phrase: null });
  let token = 0;

  // Opens the F1 window of `kind`; `onSelect(row)` fills the form.
  async function open(
    kind: string,
    {
      prefix = '',
      customer = '',
      order = '',
      columns = null,
      onSelect,
    }: AssistOpenOptions,
  ) {
    const definition = ASSIST_WINDOWS[kind];
    const current = ++token;
    state.window = {
      ...definition,
      columns: columns ?? definition.columns,
      rows: [],
      loading: true,
      error: '',
      onSelect,
    };
    try {
      const rows = await fetchAssistRows(kind, { prefix, customer, order });
      if (current === token && state.window)
        Object.assign(state.window, { rows, loading: false });
    } catch (error) {
      if (current === token && state.window)
        Object.assign(state.window, {
          loading: false,
          error: (error as Error).message,
        });
    }
  }

  function choose(row: AssistRow) {
    const { onSelect } = state.window ?? {};
    state.window = null;
    onSelect?.(row);
  }

  function close() {
    token += 1;
    state.window = null;
  }

  // F10: asks for a 詞彙編號 and appends that phrase's content through
  // `append(content)`. A code that is not complete lists the phrases that
  // start with it.
  function phrase(append: (content: string) => void) {
    state.phrase = { code: '', append };
  }

  async function confirmPhrase(code: unknown) {
    const { append } = state.phrase ?? {};
    state.phrase = null;
    if (!append) return;
    const value = String(code ?? '').trim();
    try {
      const rows = value
        ? await fetchAssistRows('phrase', { prefix: value })
        : null;
      const exact = rows?.find((row) => row.code === value);
      if (exact) {
        append(String(exact.content ?? ''));
        return;
      }
    } catch {
      // Fall through to the list, which reports the error.
    }
    await open('phrase', {
      prefix: value,
      onSelect: (row) => append(String(row.content ?? '')),
    });
  }

  return reactive({
    state,
    open,
    choose,
    close,
    phrase,
    confirmPhrase,
    cancelPhrase: () => {
      state.phrase = null;
    },
  });
}

export type LegacyAssist = ReturnType<typeof useLegacyAssist>;

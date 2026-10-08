/**
 * 舊版銷管各表的驗證與正規化，移植自 isin_vb6 `server/db.mjs` 的 normalize* 函式：
 * 文字去頭尾空白並檢查長度、金額與數量轉成 units、明細項次與空白列規則、移轉時保留來源金額。
 * 錯誤訊息與 isin_vb6 相同。輸出是可直接寫入 legacy_crm 的列（欄名即資料表欄名）。
 *
 * 日期欄在這裡先當文字檢查長度，最後才拆成 `date` 與 `*_raw`：
 * - `lenient`（正式移轉）：無法解析的值存 null 並保留原字串；
 * - `strict`（畫面輸入）：無法解析就拒絕。
 */
import { LegacyValidationError } from './legacy-validation.error';
import { parseRocDate, splitRocDate } from './roc-date';
import { multiplyUnits, toUnits } from './units';

export type DateMode = 'strict' | 'lenient';
export type Row = Record<string, unknown>;
type Input = Record<string, unknown>;

export interface NormalizeOptions {
  dates?: DateMode;
}

export interface DocumentOptions extends NormalizeOptions {
  /** 移轉的單據保留來源的小計與總額，不重算 */
  preserveSourceAmounts?: boolean;
}

/** 各表的民國日期欄；拆成 `<欄>`（date）與 `<欄>_raw`。 */
export const LEGACY_DATE_COLUMNS: Record<string, string[]> = {
  partners: ['start_date', 'latest_transaction_date'],
  parts: ['drawing_date'],
  drawing_groups: ['created_date'],
  order_documents: ['order_date', 'delivery_date'],
  order_items: ['legacy_date_r', 'legacy_date_e'],
  sales_documents: ['sale_date', 'legacy_date_e'],
  sales_items: ['legacy_date_r'],
  quote_documents: ['quote_date'],
  work_documents: ['transfer_date'],
  receipt_documents: ['receipt_date', 'closing_date'],
  receipt_payment_lines: ['check_date'],
};

// ---- 共用 ----

const isPresent = (value: unknown) =>
  value != null && String(value).trim() !== '';

function assertObject(
  input: unknown,
  message = '資料格式無效',
): asserts input is Input {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LegacyValidationError(message);
  }
}

const charLength = (value: string) => Array.from(value).length;

function boundedText(
  label: string,
  value: unknown,
  limit: number,
  { required = false } = {},
): string {
  const normalized = value == null ? '' : String(value).trim();
  if (required && !normalized)
    throw new LegacyValidationError(`${label}不可空白`);
  if (charLength(normalized) > limit)
    throw new LegacyValidationError(`${label}最多 ${limit} 個字元`);
  return normalized;
}

/** 文字日期欄拆成 date 與 raw。strict 時無法解析就拒絕。 */
function applyDates(
  table: string,
  row: Row,
  mode: DateMode,
  labels: Record<string, string> = {},
): Row {
  for (const column of LEGACY_DATE_COLUMNS[table] ?? []) {
    const text = String(row[column] ?? '');
    if (mode === 'strict') {
      const date = text ? parseRocDate(text) : null;
      if (text && !date)
        throw new LegacyValidationError(
          `${labels[column] ?? column}不是有效日期`,
        );
      row[column] = date;
      row[`${column}_raw`] = null;
    } else {
      const { date, raw } = splitRocDate(text);
      row[column] = date;
      row[`${column}_raw`] = raw;
    }
  }
  return row;
}

/** 表頭日期先檢查（strict 時），讓錯誤訊息指到表頭欄位而不是沿用表頭日期的明細欄。 */
function checkHeaderDates(
  table: string,
  header: Row,
  mode: DateMode,
  labels: Record<string, string>,
) {
  if (mode === 'strict') applyDates(table, { ...header }, mode, labels);
}

function lineNumber(
  item: Input,
  index: number,
  used: Set<number>,
  message: string,
  duplicate: string,
  max = 99,
) {
  const value =
    item.line_no == null || String(item.line_no).trim() === ''
      ? index + 1
      : Number(item.line_no);
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw new LegacyValidationError(message);
  if (used.has(value)) throw new LegacyValidationError(duplicate);
  used.add(value);
  return value;
}

function plainObjects(items: unknown[]): Input[] {
  return items.filter(
    (item): item is Input =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  );
}

// ---- 客戶／廠商 ----

const PARTNER_TEXT_LIMITS: Record<string, number> = {
  full_name: 100,
  short_name: 50,
  responsible: 50,
  phone1: 40,
  phone2: 40,
  fax: 40,
  tax_id: 30,
  postal_code: 20,
  address: 250,
  shipping_address: 250,
  invoice_title: 100,
  invoice_tax_id: 30,
  bank_name: 100,
  bank_account: 100,
  contact1: 50,
  contact2: 50,
  contact3: 50,
  start_date: 20,
  latest_transaction_date: 20,
  email: 150,
  dxf_path: 250,
  main_product: 100,
  notes: 2000,
};

const FIELD_LABELS: Record<string, string> = {
  full_name: '全名',
  short_name: '簡稱',
  responsible: '負責人',
  phone1: '電話 1',
  phone2: '電話 2',
  postal_code: '郵遞區號',
  shipping_address: '送貨地址',
  start_date: '開始交易日期',
  latest_transaction_date: '最近交易日期',
  dxf_path: 'DXF 路徑',
  main_product: '主要產品',
  material: '材質',
  thickness: '厚度',
  product_name: '品名',
  category: '分類',
  drawing_no: '電腦圖號',
  drawing_name: '圖名',
  drawing_ref: '客戶簡稱（舊 CUST）',
  customer_code: '客戶編號',
  customer_model: '客戶型號',
  actor_no: '繪圖員編號',
  actor: '繪圖者',
  drawing_date: '繪製日期',
  directory_path: '目錄位置',
  cnc1: 'CNC 檔一',
  cnc2: 'CNC 檔二',
  cnc3: 'CNC 檔三',
  cnc4: 'CNC 檔四',
  cnc5: 'CNC 檔五',
  notes: '備註',
  yy: '隱藏欄位 YY',
  price_ref: '備料單價',
  price1: '代料單價',
  price2: '折工單價',
  price3: '備折單價',
  price4: '代折單價',
  price5: '外包單價',
};

export function normalizePartner(
  input: unknown,
  options: NormalizeOptions & { kind?: string } = {},
): Row {
  assertObject(input);
  const kind = options.kind ?? input.kind;
  if (kind !== 'customer' && kind !== 'supplier')
    throw new LegacyValidationError('客戶／廠商類型無效');
  const code = boundedText('編號', input.code, 250, { required: true });
  if (charLength(code) > 10)
    throw new LegacyValidationError('編號最多 10 個字元');
  const row: Row = { kind, code };
  for (const [field, limit] of Object.entries(PARTNER_TEXT_LIMITS)) {
    row[field] = boundedText(
      FIELD_LABELS[field] ?? field,
      input[field],
      limit,
      {
        required: field === 'full_name',
      },
    );
  }
  row.credit_limit_units = toUnits('信用額度', input.credit_limit);
  row.balance_units = toUnits('帳款', input.balance);
  return applyDates('partners', row, options.dates ?? 'strict', FIELD_LABELS);
}

// ---- 材質 ----

const MATERIAL_LIMITS: Record<string, number> = {
  material: 50,
  thickness: 30,
  product_name: 100,
  category: 50,
};

export function normalizeMaterial(input: unknown): Row {
  assertObject(input);
  const row: Row = {};
  for (const [field, limit] of Object.entries(MATERIAL_LIMITS)) {
    row[field] = boundedText(FIELD_LABELS[field], input[field], limit, {
      required: field === 'material' || field === 'thickness',
    });
  }
  return row;
}

// ---- 工件 ----

const PART_TEXT_LIMITS: Record<string, number> = {
  drawing_name: 30,
  drawing_ref: 40,
  customer_code: 10,
  customer_model: 40,
  material: 10,
  thickness: 4,
  unit: 2,
  actor_no: 6,
  actor: 8,
  drawing_date: 10,
  directory_path: 50,
  cnc1: 30,
  cnc2: 30,
  cnc3: 12,
  cnc4: 12,
  cnc5: 50,
  notes: 50,
  yy: 1,
};
const PART_PRICE_FIELDS = [
  'price_ref',
  'price1',
  'price2',
  'price3',
  'price4',
  'price5',
];

export function normalizePart(
  input: unknown,
  options: NormalizeOptions = {},
): Row {
  assertObject(input);
  const drawingNo = boundedText(
    FIELD_LABELS.drawing_no,
    input.drawing_no,
    250,
    { required: true },
  );
  const row: Row = { drawing_no: drawingNo };
  for (const [field, limit] of Object.entries(PART_TEXT_LIMITS)) {
    row[field] = boundedText(FIELD_LABELS[field], input[field], limit);
  }
  if (charLength(drawingNo) > 10)
    throw new LegacyValidationError('電腦圖號最多 10 個字元');
  for (const field of PART_PRICE_FIELDS)
    row[`${field}_units`] = toUnits(FIELD_LABELS[field], input[field]);
  return applyDates('parts', row, options.dates ?? 'strict', FIELD_LABELS);
}

// ---- 銀行（含支票列印位置） ----

const BANK_TEXT_LIMITS: Record<string, [string, number]> = {
  short_name: ['銀行簡稱', 10],
  full_name: ['銀行全名', 30],
  contact: ['聯絡人', 20],
  phone1: ['電話一', 20],
  phone2: ['電話二', 20],
  address: ['地址', 60],
  legacy_bono: ['舊欄位 BONO', 30],
  legacy_boname: ['舊欄位 BONAME', 20],
  account_no: ['帳戶號碼', 8],
  account_name: ['帳戶名稱', 30],
  notes: ['備註', 40],
};

export const BANK_CHECK_LAYOUT_FIELDS = [
  'year',
  'month',
  'day',
  'payment_text',
  'ntd_text',
  'currency_prefix',
  'non_endorsable',
  'bank_account',
  'issue_date',
  'payee',
  'due_date',
  'expense_amount',
];

type Coordinate = number | '';
interface CheckLayout {
  corrections: { x: Coordinate; y: Coordinate };
  fields: Record<
    string,
    {
      layout1: { x: Coordinate; y: Coordinate };
      layout2: { x: Coordinate; y: Coordinate };
    }
  >;
}

function normalizeCoordinate(value: unknown, label: string): Coordinate {
  const text = value == null ? '' : String(value).trim();
  if (!text) return '';
  const number = Number(text);
  if (!Number.isFinite(number) || Math.abs(number) > 100000) {
    throw new LegacyValidationError(`${label}必須是有效座標`);
  }
  return number;
}

const asObject = (value: unknown): Input =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Input)
    : {};

export function normalizeBankCheckLayout(input: unknown): CheckLayout {
  const source = asObject(input);
  const corrections = asObject(source.corrections);
  const fields = asObject(source.fields);
  const layout: CheckLayout = {
    corrections: {
      x: normalizeCoordinate(corrections.x, 'X 軸修正'),
      y: normalizeCoordinate(corrections.y, 'Y 軸修正'),
    },
    fields: {},
  };
  for (const field of BANK_CHECK_LAYOUT_FIELDS) {
    const layouts = asObject(fields[field]);
    const coordinates = (name: string) => {
      const point = asObject(layouts[name]);
      return {
        x: normalizeCoordinate(point.x, `${field} X 軸`),
        y: normalizeCoordinate(point.y, `${field} Y 軸`),
      };
    };
    layout.fields[field] = {
      layout1: coordinates('layout1'),
      layout2: coordinates('layout2'),
    };
  }
  return layout;
}

/** 移轉時支票位置是一個座標一欄：check_{欄}_x／_y（第一組）、_x2／_y2（第二組）、check_correction_x／_y。 */
export function checkLayoutFromColumns(input: Input) {
  return {
    corrections: {
      x: input.check_correction_x ?? '',
      y: input.check_correction_y ?? '',
    },
    fields: Object.fromEntries(
      BANK_CHECK_LAYOUT_FIELDS.map((field) => [
        field,
        {
          layout1: {
            x: input[`check_${field}_x`] ?? '',
            y: input[`check_${field}_y`] ?? '',
          },
          layout2: {
            x: input[`check_${field}_x2`] ?? '',
            y: input[`check_${field}_y2`] ?? '',
          },
        },
      ]),
    ),
  };
}

export function normalizeBank(input: unknown): Row {
  assertObject(input);
  const row: Row = {
    code: boundedText('銀行編號', input.code, 10, { required: true }),
  };
  for (const [field, [label, limit]] of Object.entries(BANK_TEXT_LIMITS)) {
    row[field] = boundedText(label, input[field], limit);
  }
  row.balance_units = toUnits('存款金額', input.balance);
  row.check_layout = normalizeBankCheckLayout(input.check_layout);
  return row;
}

// ---- 詞彙、郵遞區號 ----

export function normalizePhrase(input: unknown): Row {
  assertObject(input);
  return {
    phrase_no: boundedText('詞彙編號', input.phrase_no, 10, { required: true }),
    content: boundedText('詞彙內容', input.content, 250, { required: true }),
  };
}

export function normalizePostalCode(input: unknown): Row {
  assertObject(input);
  return {
    postal_code: boundedText('郵遞區號', input.postal_code, 10, {
      required: true,
    }),
    region_name: boundedText('地區名稱', input.region_name, 100, {
      required: true,
    }),
  };
}

// ---- 單據 ----

export interface NormalizedDocument {
  key: string;
  header: Row;
  lines: Record<string, Row[]>;
}

const ORDER_HEADER: Record<string, [string, number]> = {
  order_date: ['訂單日期', 10],
  delivery_date: ['交貨日期', 10],
  customer_code: ['客戶編號', 10],
  customer_name: ['客戶名稱', 10],
  actor_no: ['業務編號', 10],
  actor_name: ['業務姓名', 10],
  payment_method: ['收款方式', 10],
  delivery_method: ['送貨方式', 10],
  note: ['備註', 20],
  note2: ['備註二', 10],
  closed: ['結案狀態', 2],
  legacy_xx: ['舊欄位 XX', 1],
};
const ORDER_ITEM: Record<string, [string, number]> = {
  legacy_sn: ['舊項次 SN', 2],
  legacy_date_r: ['明細訂單日期', 10],
  legacy_date_e: ['明細交貨日期', 10],
  legacy_factor_no: ['明細客戶編號', 10],
  legacy_factor: ['明細客戶名稱', 10],
  legacy_d_dwgok: ['舊欄位 D_DWGOK', 10],
  drawing_no: ['電腦圖號', 10],
  customer_model: ['客戶型號', 40],
  material: ['材質', 10],
  thickness: ['厚度', 4],
  outsource: ['代料', 10],
  source: ['圖源', 4],
  post_process: ['後加工', 50],
  unit: ['單位', 4],
};

const labelsOf = (fields: Record<string, [string, number]>) =>
  Object.fromEntries(
    Object.entries(fields).map(([field, [label]]) => [field, label]),
  );

function headerText(
  input: Input,
  fields: Record<string, [string, number]>,
  row: Row,
) {
  for (const [field, [label, limit]] of Object.entries(fields))
    row[field] = boundedText(label, input[field], limit);
  return row;
}

/** 明細的舊欄位沒給值時沿用表頭（舊版明細重複存表頭的日期與客戶）；SN 空白時用項次。 */
function itemText(
  item: Input,
  fields: Record<string, [string, number]>,
  defaults: Record<string, string>,
  row: Row,
) {
  for (const [field, [label, limit]] of Object.entries(fields)) {
    const fallback = defaults[field] ?? '';
    const value =
      field === 'legacy_sn' && !String(item[field] ?? '').trim()
        ? fallback
        : (item[field] ?? fallback);
    row[field] = boundedText(label, value, limit);
  }
  return row;
}

export function normalizeOrder(
  input: unknown,
  options: DocumentOptions = {},
): NormalizedDocument {
  assertObject(input, '訂單資料格式無效');
  const mode = options.dates ?? 'strict';
  const header = headerText(input, ORDER_HEADER, {
    order_no: boundedText('訂單編號', input.order_no, 10, { required: true }),
  });
  checkHeaderDates('order_documents', header, mode, labelsOf(ORDER_HEADER));
  const inputItems = input.items ?? [];
  if (!Array.isArray(inputItems))
    throw new LegacyValidationError('訂單明細格式無效');
  const items = plainObjects(inputItems).filter(
    (item) =>
      Object.keys(ORDER_ITEM).some(
        (field) => String(item[field] ?? '').trim() !== '',
      ) ||
      ['quantity', 'shipped_quantity'].some((field) => isPresent(item[field])),
  );
  if (items.length > 99) throw new LegacyValidationError('訂單明細最多 99 列');

  const lineNumbers = new Set<number>();
  const serials = new Set<string>();
  const rows = items.map((item, index) => {
    const lineNo = lineNumber(
      item,
      index,
      lineNumbers,
      '訂單項次須介於 1 至 99',
      '訂單項次不可重複',
    );
    const row = itemText(
      item,
      ORDER_ITEM,
      {
        legacy_sn: String(lineNo),
        legacy_date_r: header.order_date as string,
        legacy_date_e: header.delivery_date as string,
        legacy_factor_no: header.customer_code as string,
        legacy_factor: header.customer_name as string,
      },
      { order_no: header.order_no, line_no: lineNo },
    );
    const serial = row.legacy_sn as string;
    if (serial && serials.has(serial))
      throw new LegacyValidationError('訂單明細 SN 不可重複');
    if (serial) serials.add(serial);
    row.quantity_units = toUnits('數量', item.quantity);
    row.shipped_quantity_units = toUnits('出貨數', item.shipped_quantity);
    if (
      (row.quantity_units as number) < 0 ||
      (row.shipped_quantity_units as number) < 0
    ) {
      throw new LegacyValidationError('數量與出貨數不可小於零');
    }
    return applyDates('order_items', row, mode, labelsOf(ORDER_ITEM));
  });
  return {
    key: header.order_no as string,
    header: applyDates('order_documents', header, mode, labelsOf(ORDER_HEADER)),
    lines: { items: rows },
  };
}

const SALES_HEADER: Record<string, [string, number]> = {
  sale_date: ['出貨日期', 10],
  legacy_date_e: ['保留日期 DATE_E', 10],
  customer_code: ['客戶編號', 10],
  customer_name: ['客戶名稱', 10],
  actor_no: ['經手人編號', 10],
  actor_name: ['經手人', 10],
  linked_order_no: ['訂單編號', 10],
  payment_method: ['收款方式', 10],
  delivery_method: ['送貨方式', 10],
  invoice_number: ['發票號碼', 30],
  shipping_address: ['送貨地址', 60],
  note: ['備註', 50],
  tax_mode: ['營業稅別', 10],
};
const SALES_ITEM: Record<string, [string, number]> = {
  legacy_sn: ['舊項次 SN', 2],
  legacy_date_r: ['明細出貨日期', 10],
  legacy_factor_no: ['明細客戶編號', 10],
  legacy_factor: ['明細客戶名稱', 10],
  drawing_no: ['電腦圖號', 10],
  customer_model: ['客戶型號', 40],
  material: ['材質', 10],
  thickness: ['厚度', 6],
  outsource: ['代料', 10],
  unit: ['單位', 4],
};

export function normalizeSale(
  input: unknown,
  options: DocumentOptions = {},
): NormalizedDocument {
  assertObject(input, '銷貨資料格式無效');
  const mode = options.dates ?? 'strict';
  const preserve = options.preserveSourceAmounts ?? false;
  const header = headerText(input, SALES_HEADER, {
    sale_no: boundedText('出貨編號', input.sale_no, 10, { required: true }),
  });
  checkHeaderDates('sales_documents', header, mode, labelsOf(SALES_HEADER));
  const inputItems = input.items ?? [];
  if (!Array.isArray(inputItems))
    throw new LegacyValidationError('銷貨明細格式無效');
  const items = plainObjects(inputItems).filter(
    (item) =>
      Object.keys(SALES_ITEM).some(
        (field) => String(item[field] ?? '').trim() !== '',
      ) ||
      ['quantity', 'unit_price'].some((field) => isPresent(item[field])) ||
      (preserve && isPresent(item.line_total)),
  );
  if (items.length > 99) throw new LegacyValidationError('銷貨明細最多 99 列');

  const lineNumbers = new Set<number>();
  const serials = new Set<string>();
  const rows = items.map((item, index) => {
    const lineNo = lineNumber(
      item,
      index,
      lineNumbers,
      '銷貨項次須介於 1 至 99',
      '銷貨項次不可重複',
    );
    const row = itemText(
      item,
      SALES_ITEM,
      {
        legacy_sn: String(lineNo),
        legacy_date_r: header.sale_date as string,
        legacy_factor_no: header.customer_code as string,
        legacy_factor: header.customer_name as string,
      },
      { sale_no: header.sale_no, line_no: lineNo },
    );
    const serial = row.legacy_sn as string;
    if (serial && serials.has(serial))
      throw new LegacyValidationError('銷貨明細 SN 不可重複');
    if (serial) serials.add(serial);
    row.quantity_units = toUnits('數量', item.quantity);
    row.unit_price_units = toUnits('單價', item.unit_price);
    row.line_total_units =
      preserve && isPresent(item.line_total)
        ? toUnits('小計', item.line_total)
        : multiplyUnits(
            row.quantity_units as number,
            row.unit_price_units as number,
          );
    return applyDates('sales_items', row, mode, labelsOf(SALES_ITEM));
  });

  const calculated = rows.reduce(
    (sum, row) => sum + (row.line_total_units as number),
    0,
  );
  header.tax_units = toUnits('營業稅額', input.tax_amount);
  // 「內含」時明細小計已含稅，貨款是扣掉稅額後的餘額。
  const included =
    (header.tax_mode as string).trim() === '內含'
      ? (header.tax_units as number)
      : 0;
  header.amount_units =
    preserve && isPresent(input.amount)
      ? toUnits('貨款', input.amount)
      : calculated - included;
  if (!Number.isSafeInteger(header.amount_units))
    throw new LegacyValidationError('銷貨金額超出可儲存範圍');
  header.discount_units = toUnits('折讓金額', input.discount_amount);
  header.received_units = toUnits('已收金額', input.received_amount);
  if (
    [header.tax_units, header.discount_units, header.received_units].some(
      (value) => (value as number) < 0,
    )
  ) {
    throw new LegacyValidationError('稅額、折讓與已收金額不可小於零');
  }
  header.total_units =
    preserve && isPresent(input.total_amount)
      ? toUnits('應收金額', input.total_amount)
      : (header.amount_units as number) +
        (header.tax_units as number) -
        (header.discount_units as number);
  if (!Number.isSafeInteger(header.total_units))
    throw new LegacyValidationError('應收金額超出可儲存範圍');
  return {
    key: header.sale_no as string,
    header: applyDates('sales_documents', header, mode, labelsOf(SALES_HEADER)),
    lines: { items: rows },
  };
}

const QUOTE_HEADER: Record<string, [string, number]> = {
  quote_date: ['報價日期', 10],
  customer_code: ['客戶編號', 10],
  customer_name: ['客戶名稱', 10],
  actor_no: ['經手人編號', 10],
  actor_name: ['經手人', 10],
  attention: ['ATTENTION', 40],
  legacy_xx: ['舊欄位 XX', 1],
};
const QUOTE_ITEM_LIMITS: Record<string, number> = {
  customer_model: 40,
  material: 10,
  thickness: 6,
  summary: 250,
};

export function normalizeQuote(
  input: unknown,
  options: DocumentOptions = {},
): NormalizedDocument {
  assertObject(input, '報價資料格式無效');
  const mode = options.dates ?? 'strict';
  const preserve = options.preserveSourceAmounts ?? false;
  const header = headerText(input, QUOTE_HEADER, {
    quote_no: boundedText('報價編號', input.quote_no, 10, { required: true }),
  });
  const inputItems = input.items ?? [];
  const inputNotes = input.notes ?? [];
  if (!Array.isArray(inputItems) || !Array.isArray(inputNotes)) {
    throw new LegacyValidationError('報價明細格式無效');
  }
  if (inputItems.length > 99 || inputNotes.length > 99) {
    throw new LegacyValidationError('報價明細與備註各最多 99 列');
  }
  const items = plainObjects(inputItems).filter(
    (item) =>
      Object.keys(QUOTE_ITEM_LIMITS).some(
        (field) => String(item[field] ?? '').trim() !== '',
      ) ||
      ['quantity', 'unit_price'].some((field) => isPresent(item[field])) ||
      (preserve && isPresent(item.line_total)),
  );
  const notes = inputNotes.filter(
    (item) =>
      String(
        typeof item === 'object' && item !== null
          ? ((item as Input).note ?? '')
          : (item ?? ''),
      ).trim() !== '',
  );
  const itemLineNumbers = new Set<number>();
  const itemRows = items.map((item, index) => {
    const row: Row = {
      quote_no: header.quote_no,
      line_no: lineNumber(
        item,
        index,
        itemLineNumbers,
        '報價列次須介於 1 至 99',
        '報價列次不可重複',
      ),
    };
    for (const [field, limit] of Object.entries(QUOTE_ITEM_LIMITS)) {
      row[field] = boundedText('報價' + field, item[field], limit);
    }
    row.quantity_units = toUnits('報價數量', item.quantity);
    row.unit_price_units = toUnits('報價單價', item.unit_price);
    row.line_total_units =
      preserve && isPresent(item.line_total)
        ? toUnits('報價小計', item.line_total)
        : multiplyUnits(
            row.quantity_units as number,
            row.unit_price_units as number,
          );
    return row;
  });
  const calculated = itemRows.reduce(
    (sum, row) => sum + (row.line_total_units as number),
    0,
  );
  header.total_units =
    preserve && isPresent(input.total_amount)
      ? toUnits('報價金額合計', input.total_amount)
      : calculated;
  if (!Number.isSafeInteger(header.total_units))
    throw new LegacyValidationError('報價總額超出可儲存範圍');
  const noteLineNumbers = new Set<number>();
  const noteRows = notes.map((item, index) => {
    const source =
      typeof item === 'object' && item !== null
        ? (item as Input)
        : { note: item };
    return {
      quote_no: header.quote_no,
      line_no: lineNumber(
        source,
        index,
        noteLineNumbers,
        '報價列次須介於 1 至 99',
        '報價列次不可重複',
      ),
      note: boundedText('報價備註', source.note, 250),
    };
  });
  return {
    key: header.quote_no as string,
    header: applyDates('quote_documents', header, mode, labelsOf(QUOTE_HEADER)),
    lines: { items: itemRows, notes: noteRows },
  };
}

const RECEIPT_HEADER: Record<string, [string, number]> = {
  receipt_date: ['收款日期', 10],
  closing_date: ['帳款結日', 10],
  customer_code: ['客戶編號', 10],
  customer_name: ['客戶名稱', 10],
  actor_no: ['經手人編號', 10],
  actor_name: ['經手人', 10],
};
const RECEIPT_TOTALS: Record<string, string> = {
  current_received: '本期實收',
  current_merchandise: '本期貨款',
  current_tax: '本期稅額',
  current_discount: '本期折讓',
  previous_advance: '前期預收',
  previous_unpaid: '前期未收',
  current_advance: '本期預收',
  current_unpaid: '本期未收',
};
const RECEIPT_PAYMENT_LIMITS: Record<string, number> = {
  category: 10,
  check_number: 30,
  check_date: 10,
  bank_account: 30,
  collect_agent: 20,
  bank_short_name: 20,
  note: 40,
};
const RECEIPT_ALLOCATION_AMOUNTS = [
  'merchandise',
  'tax',
  'discount',
  'receivable',
  'unpaid',
  'offset',
  'previously_offset',
];
// 舊版沖帳明細列出客戶所有未收的出貨；10/02 副本單張最多 380 列。
export const RECEIPT_ALLOCATION_MAX_LINES = 999;

export function normalizeReceipt(
  input: unknown,
  options: NormalizeOptions = {},
): NormalizedDocument {
  assertObject(input, '收款資料格式無效');
  const mode = options.dates ?? 'strict';
  const header = headerText(input, RECEIPT_HEADER, {
    receipt_no: boundedText('單據編號', input.receipt_no, 10, {
      required: true,
    }),
  });
  for (const [field, label] of Object.entries(RECEIPT_TOTALS)) {
    header[`${field}_units`] = toUnits(label, input[field]);
    if ((header[`${field}_units`] as number) < 0)
      throw new LegacyValidationError(`${label}不可小於零`);
  }
  const paymentInput = input.payments ?? [];
  const allocationInput = input.allocations ?? [];
  if (!Array.isArray(paymentInput) || !Array.isArray(allocationInput)) {
    throw new LegacyValidationError('收款明細格式無效');
  }
  const tooMany = `收款明細最多 99 列，沖帳明細最多 ${RECEIPT_ALLOCATION_MAX_LINES} 列`;
  if (
    paymentInput.length > 99 ||
    allocationInput.length > RECEIPT_ALLOCATION_MAX_LINES
  ) {
    throw new LegacyValidationError(tooMany);
  }
  const payments = plainObjects(paymentInput).filter(
    (item) =>
      Object.keys(RECEIPT_PAYMENT_LIMITS).some(
        (field) => String(item[field] ?? '').trim() !== '',
      ) || isPresent(item.amount),
  );
  const allocations = plainObjects(allocationInput).filter(
    (item) =>
      String(item.sale_no ?? '').trim() !== '' ||
      RECEIPT_ALLOCATION_AMOUNTS.some((field) => isPresent(item[field])),
  );

  const paymentLineNumbers = new Set<number>();
  const paymentRows = payments.map((item, index) => {
    const row: Row = {
      receipt_no: header.receipt_no,
      line_no: lineNumber(
        item,
        index,
        paymentLineNumbers,
        '收款項次須介於 1 至 99',
        '收款項次不可重複',
      ),
    };
    for (const [field, limit] of Object.entries(RECEIPT_PAYMENT_LIMITS)) {
      row[field] = boundedText(`收款${field}`, item[field], limit);
    }
    row.amount_units = toUnits('收款金額', item.amount);
    if ((row.amount_units as number) < 0)
      throw new LegacyValidationError('收款金額不可小於零');
    return applyDates('receipt_payment_lines', row, mode, {
      check_date: '票據到期日',
    });
  });

  const allocationLineNumbers = new Set<number>();
  const allocationRows = allocations.map((item, index) => {
    const row: Row = {
      receipt_no: header.receipt_no,
      line_no: lineNumber(
        item,
        index,
        allocationLineNumbers,
        `沖帳項次須介於 1 至 ${RECEIPT_ALLOCATION_MAX_LINES}`,
        '沖帳項次不可重複',
        RECEIPT_ALLOCATION_MAX_LINES,
      ),
      sale_no: boundedText('出貨編號', item.sale_no, 10),
    };
    for (const field of RECEIPT_ALLOCATION_AMOUNTS) {
      row[`${field}_units`] = toUnits(`沖帳${field}`, item[field]);
      if ((row[`${field}_units`] as number) < 0)
        throw new LegacyValidationError('沖帳金額不可小於零');
    }
    return row;
  });
  return {
    key: header.receipt_no as string,
    header: applyDates(
      'receipt_documents',
      header,
      mode,
      labelsOf(RECEIPT_HEADER),
    ),
    lines: { payments: paymentRows, allocations: allocationRows },
  };
}

const WORK_HEADER: Record<string, [string, number]> = {
  transfer_date: ['轉單日期', 10],
  customer_code: ['客戶編號', 10],
  customer_name: ['客戶名稱', 10],
  actor_no: ['經手人編號', 10],
  actor_name: ['經手人', 10],
  order_no: ['訂單編號', 10],
};
const WORK_ITEM_LIMITS: Record<string, number> = {
  order_no: 10,
  drawing_no: 10,
  material: 10,
  thickness: 6,
  outsource: 10,
  cnc_ok: 10,
  plating_work: 20,
  post_process: 50,
};

export function normalizeWork(
  input: unknown,
  options: NormalizeOptions = {},
): NormalizedDocument {
  assertObject(input, '工作資料格式無效');
  const mode = options.dates ?? 'strict';
  const header = headerText(input, WORK_HEADER, {
    work_no: boundedText('工作編號', input.work_no, 10, { required: true }),
  });
  const inputItems = input.items ?? [];
  if (!Array.isArray(inputItems))
    throw new LegacyValidationError('工作明細格式無效');
  const items = plainObjects(inputItems).filter(
    (item) =>
      Object.keys(WORK_ITEM_LIMITS).some(
        (field) => String(item[field] ?? '').trim() !== '',
      ) ||
      ['order_quantity', 'completed_quantity'].some((field) =>
        isPresent(item[field]),
      ),
  );
  if (items.length > 99) throw new LegacyValidationError('工作明細最多 99 列');
  const lineNumbers = new Set<number>();
  const rows = items.map((item, index) => {
    const row: Row = {
      work_no: header.work_no,
      line_no: lineNumber(
        item,
        index,
        lineNumbers,
        '工作項次須介於 1 至 99',
        '工作項次不可重複',
      ),
    };
    for (const [field, limit] of Object.entries(WORK_ITEM_LIMITS)) {
      row[field] = boundedText(`工作${field}`, item[field], limit);
    }
    row.order_quantity_units = toUnits('訂單數', item.order_quantity);
    row.completed_quantity_units = toUnits('完工數', item.completed_quantity);
    if (
      (row.order_quantity_units as number) < 0 ||
      (row.completed_quantity_units as number) < 0
    ) {
      throw new LegacyValidationError('訂單數與完工數不可小於零');
    }
    return row;
  });
  return {
    key: header.work_no as string,
    header: applyDates('work_documents', header, mode, labelsOf(WORK_HEADER)),
    lines: { items: rows },
  };
}

const GROUP_HEADER: Record<string, [string, number]> = {
  created_date: ['建檔日期', 10],
  customer_code: ['客戶編號', 10],
  customer_name: ['客戶', 10],
  customer_drawing_no: ['客戶圖號', 40],
  notes: ['備註', 20],
  legacy_xx: ['舊欄位 XX', 1],
};
const GROUP_ITEM: Record<string, [string, number]> = {
  drawing_no: ['電腦圖號', 10],
  customer_drawing_no: ['客戶圖號', 40],
  material: ['材質', 10],
  thickness: ['厚度', 6],
};

export function normalizeDrawingGroup(
  input: unknown,
  options: NormalizeOptions = {},
): NormalizedDocument {
  assertObject(input);
  const mode = options.dates ?? 'strict';
  const header = headerText(input, GROUP_HEADER, {
    group_no: boundedText('圖組編號', input.group_no, 10, { required: true }),
  });
  const inputItems = input.items ?? [];
  if (!Array.isArray(inputItems))
    throw new LegacyValidationError('圖組明細格式無效');
  const items = plainObjects(inputItems).filter(
    (item) =>
      [...Object.keys(GROUP_ITEM), 'is_laser'].some((field) =>
        String(item[field] ?? '').trim(),
      ) || isPresent(item.quantity),
  );
  if (items.length > 99) throw new LegacyValidationError('圖組明細最多 99 列');
  const lineNumbers = new Set<number>();
  const rows = items.map((item, index) => {
    const row: Row = {
      group_no: header.group_no,
      line_no: lineNumber(
        item,
        index,
        lineNumbers,
        '圖組項次須介於 1 至 99',
        '圖組項次不可重複',
      ),
      customer_code: header.customer_code,
    };
    headerText(item, GROUP_ITEM, row);
    row.quantity_units = toUnits('數量', item.quantity);
    // 與舊版 dwgroup.FLAG 相同，任意兩字照原樣保存（舊圖組有「1」「U」「漆」等值）。
    row.is_laser = boundedText('雷射工件', item.is_laser, 2);
    return row;
  });
  return {
    key: header.group_no as string,
    header: applyDates('drawing_groups', header, mode, labelsOf(GROUP_HEADER)),
    lines: { items: rows },
  };
}

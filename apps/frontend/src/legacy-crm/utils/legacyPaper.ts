import type { PaperPage, PaperText } from './legacyPapers';

// Paper layouts of the legacy 資料列印 reports (isin_vb6 src/utils/legacyPaper.js,
// docs/legacy-ui-spec.md).
//
// Every layout is in printed px (1/96 inch) from the paper's top-left corner,
// with text y on the baseline, read from the legacy program's XPS output of
// 2026-10-07; each report was compared with that output line by line.

type Row = Record<string, any>;

// The result of GET reports/:key/preview (backend legacy-crm/reports).
export interface ReportResult {
  items: Row[];
  summary?: Row | null;
  truncated?: boolean;
  limit?: number;
  count?: number;
  pages?: Row[];
  period?: { from?: string; to?: string } | null;
  [key: string]: unknown;
}

export interface ReportContext {
  company: string;
  profile: { name: string; address: string; phone: string; fax: string };
  printDate: string;
  filters: Record<string, string>;
}

type Format = (value: unknown) => string;

interface Column {
  key: string;
  label: string;
  at?: number;
  end?: number;
  format?: Format | null;
  padStart?: number;
}

interface GroupInfo {
  code: string;
  name: string;
}

// One printed line of a report: a row's columns, values put in named
// columns (`cells`), free text at x (`free`), and the rule under it.
interface Line {
  row?: Row;
  blank?: string[];
  cells?: Record<string, string>;
  free?: [number, string][];
  rule?: number;
  ruleSpace?: number;
  breakBelow?: number;
  group?: GroupInfo;
  newPage?: boolean;
  double?: boolean;
}

interface Header {
  title: number;
  titleSize: number;
  subtitle?: number;
  subtitleSize?: number;
  meta: number;
  ruleTop: number;
  labels: number;
  labels2?: number;
  ruleBottom: number;
  body: number;
}

interface PxLayout {
  kind?: undefined;
  unit: 'px';
  fontSize: number;
  rowHeight: number;
  ruleDrop: number;
  ruleSpace: number;
  bottom: number;
  header: Header;
  left: number;
  right: number;
  title: (ctx: ReportContext) => string;
  subtitle?: (ctx: ReportContext) => string;
  meta: (ctx: ReportContext, page: PaperPage) => [number, string][];
  columns: Column[];
  columns2?: Column[];
  lines: (result: ReportResult, ctx?: ReportContext) => Line[];
  repeatAtPageStart?: string[];
  repeatOnSecond?: string[];
  continuationRule?: boolean;
  pageNumbers?: 'group';
  deferRule?: boolean;
  emptyRule?: boolean;
  sort?: string;
}

type SpecialLayout =
  | { kind: 'invoice'; detailed: boolean }
  | { kind: 'label' }
  | { kind: 'envelope' };

export type ReportLayout = PxLayout | SpecialLayout;

const grouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const noGrouping = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
  useGrouping: false,
});
const twoDecimals = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const isBlank = (value: unknown) => value == null || value === '';
// Legacy reports leave zero amounts blank.
export const grouped: Format = (value) =>
  isBlank(value) || Number(value) === 0 ? '' : grouping.format(Number(value));
export const plain: Format = (value) =>
  isBlank(value) || Number(value) === 0 ? '' : noGrouping.format(Number(value));
export const price2: Format = (value) =>
  isBlank(value) ? '' : twoDecimals.format(Number(value));
// The brief invoice prints zero amounts as 0.
const groupedZero: Format = (value) => grouping.format(Number(value ?? 0));
const text = (value: unknown) => (value == null ? '' : String(value));

const sum = (rows: Row[], key: string) =>
  rows.reduce(
    (total, row) => total + Math.round(Number(row[key] ?? 0) * 10000),
    0,
  ) / 10000;

// Splits rows into runs that share the same key, keeping their order.
function runs(rows: Row[], keyOf: (row: Row) => unknown) {
  const groups: { key: any; rows: Row[] }[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    if (!groups.length || groups[groups.length - 1].key !== key)
      groups.push({ key, rows: [] });
    groups[groups.length - 1].rows.push(row);
  }
  return groups;
}

// Header styles. "single": one title line "{company}-{name}" with the period
// line and one row of column labels between two rules (sales, order, work).
// "spaced": the title sits lower and the name follows the company after a
// space (journal, receivable and receipt reports). "double": company and
// report name on two lines (contact, employee and part lists).

// Printed-px metrics of the sales reports (see the layouts below). Summary
// reports have a 20 px title and their column labels 1.28 px higher than the
// detail reports, whose title is 18.72 px.
const RULE_PX = 2.56;
const WIDE_RULE = 3.84;
// A line whose baseline would fall below 1001.2 px goes to the next page
// (the XPS output has lines at 1000.96 and breaks before 1001.44).
const PX_PAGE_BOTTOM = 1001.2;
// The second check the 工件別明細表 makes right after a 小計: the next
// baseline past 1014.5 px breaks the page there (seen at 1016.8, not at
// 1012.96).
const LATE_BREAK = 1014.5;
const SALES_PX = {
  unit: 'px' as const,
  fontSize: 13.4405,
  rowHeight: 15.36,
  ruleDrop: 4.64,
  ruleSpace: RULE_PX,
  bottom: PX_PAGE_BOTTOM,
};
const SALES_SUMMARY_PX: Header = {
  title: 18.56,
  titleSize: 20.0008,
  meta: 51.68,
  ruleTop: 56.32,
  labels: 69.6,
  ruleBottom: 74.24,
  body: 87.52,
};
const SALES_DETAIL_PX: Header = {
  title: 17.6,
  titleSize: 18.7207,
  meta: 51.68,
  ruleTop: 56.32,
  labels: 70.88,
  ruleBottom: 75.52,
  body: 88.8,
};

const period = (ctx: ReportContext) =>
  `${ctx.filters.date_from || ''}~${ctx.filters.date_to || ''}`;

const amountCells = (keys: string[], source: Row | null | undefined) =>
  Object.fromEntries(keys.map((key) => [key, grouped(source?.[key])]));

// Each layout lists its columns as {key, label, at, end, align}: `at` is the
// left edge of left-aligned text and `end` the right edge of right-aligned
// text, both relative to `left`.
export const legacyPaperLayouts: Record<string, ReportLayout> = {
  // The sales reports are laid out in printed px (1/96 inch) with text y on
  // the baseline, all read from the legacy XPS output of 2026-10-07
  // (115.09.01~115.09.02, every one of the seven matched line for line).
  // Rows are 15.36 px apart; a rule sits 4.64 px under the baseline above it
  // and adds 2.56 px, or 3.84 px where the legacy report leaves more room.
  'sales-work-summary': {
    ...SALES_PX,
    header: SALES_SUMMARY_PX,
    left: 19.2,
    right: 672,
    title: (ctx) => `${ctx.company}-銷售統計表【工件別】`,
    meta: (ctx, page) => [
      [19.2, `資料期間：${period(ctx)}`],
      [281.83, `印表日期：${ctx.printDate}`],
      [582.4, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'drawing_no', label: '電腦圖號', at: 19.2 },
      { key: 'customer_model', label: '客戶型號', at: 95.95 },
      { key: 'material', label: '材質', at: 351.99 },
      { key: 'thickness', label: '厚度', at: 428.87 },
      { key: 'quantity', label: '數量', end: 534.37, format: grouped },
      { key: 'unit', label: '單位', at: 544.05 },
      { key: 'amount', label: '金額', end: 663, format: grouped },
    ],
    lines(result) {
      const lines: Line[] = result.items.map((row) => ({ row }));
      if (lines.length) lines[lines.length - 1].rule = 19.2;
      if (result.summary)
        lines.push({
          free: [[467.2, '總　計']],
          cells: { amount: grouped(result.summary.amount) },
          rule: 19.2,
        });
      return lines;
    },
  },
  'sales-work-detail': {
    ...SALES_PX,
    header: SALES_DETAIL_PX,
    left: 19.2,
    right: 678.4,
    title: (ctx) => `${ctx.company}-銷售明細表【工件別】`,
    meta: (ctx, page) => [
      [19.2, `資料期間：${period(ctx)}`],
      [284.92, `印表日期：${ctx.printDate}`],
      [588.8, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'drawing_no', label: '電腦圖號', at: 19.2 },
      { key: 'material', label: '材質', at: 102.4 },
      { key: 'thickness', label: '厚度', at: 185.59 },
      { key: 'customer_name', label: '客戶名稱', at: 224.03 },
      { key: 'sale_no', label: '出貨編號', at: 307.23 },
      { key: 'quantity', label: '數量', end: 457.63, format: grouped },
      { key: 'unit', label: '單位', at: 473.62 },
      { key: 'unit_price', label: '單價', end: 579.27, format: grouped },
      { key: 'amount', label: '金額', end: 669.45, format: grouped },
    ],
    // The drawing number and customer are printed on a drawing's first line
    // only; a short rule from 材質 leads to its 小計.
    lines(result) {
      const lines: Line[] = [];
      for (const group of runs(result.items, (row) => row.drawing_no)) {
        group.rows.forEach((row, index) =>
          lines.push({
            row,
            blank: index > 0 ? ['drawing_no', 'customer_name'] : [],
          }),
        );
        Object.assign(lines[lines.length - 1], {
          rule: 102.4,
          ruleSpace: WIDE_RULE,
        });
        lines.push({
          free: [[307.2, '小　計']],
          cells: {
            quantity: grouped(sum(group.rows, 'quantity')),
            amount: grouped(sum(group.rows, 'amount')),
          },
          rule: 19.2,
          breakBelow: LATE_BREAK,
        });
      }
      if (result.summary) {
        if (lines.length) lines[lines.length - 1].ruleSpace = WIDE_RULE;
        lines.push({
          free: [[307.2, '總　計']],
          cells: {
            amount: grouped(
              result.summary.amount ?? sum(result.items, 'amount'),
            ),
          },
          rule: 19.2,
          ruleSpace: WIDE_RULE,
        });
        lines.push({ free: [[19.2, '印表結束']] });
      }
      return lines;
    },
  },
  'sales-date-summary': {
    ...SALES_PX,
    header: SALES_SUMMARY_PX,
    left: 19.2,
    right: 537.6,
    title: (ctx) => `${ctx.company}-銷售統計表【日期別】`,
    meta: (ctx, page) => [
      [19.2, `資料期間：${period(ctx)}`],
      [214.62, `印表日期：${ctx.printDate}`],
      [448, `頁次： ${page.number}`],
    ],
    repeatAtPageStart: ['sale_date'],
    columns: [
      { key: 'sale_date', label: '日期', at: 19.2 },
      { key: 'drawing_no', label: '電腦圖號', at: 102.4 },
      { key: 'material', label: '材質', at: 185.59 },
      { key: 'thickness', label: '厚度', at: 268.79 },
      { key: 'quantity', label: '數量', end: 387.2, format: grouped },
      { key: 'unit', label: '單位', at: 396.74 },
      { key: 'amount', label: '金額', end: 528.59, format: grouped },
    ],
    lines(result) {
      const lines: Line[] = [];
      for (const group of runs(result.items, (row) => row.sale_date)) {
        group.rows.forEach((row, index) =>
          lines.push({ row, blank: index > 0 ? ['sale_date'] : [] }),
        );
        lines[lines.length - 1].rule = 102.4;
        lines.push({
          free: [[185.6, '日合計']],
          cells: { amount: grouped(sum(group.rows, 'amount')) },
          rule: 19.2,
        });
      }
      if (result.summary) {
        lines.push({
          free: [[185.6, '總　計']],
          cells: { amount: grouped(result.summary.amount) },
          rule: 19.2,
        });
        lines.push({ free: [[19.2, '印表結束']] });
      }
      return lines;
    },
  },
  'sales-date-detail': {
    ...SALES_PX,
    header: SALES_DETAIL_PX,
    left: 19.2,
    right: 678.4,
    title: (ctx) => `${ctx.company}-銷售明細表【日期別】`,
    meta: (ctx, page) => [
      [19.2, `資料期間：${period(ctx)}`],
      [284.92, `印表日期：${ctx.printDate}`],
      [595.2, `頁次： ${page.number}`],
    ],
    repeatAtPageStart: ['sale_date'],
    columns: [
      { key: 'sale_date', label: '日期', at: 19.2 },
      { key: 'drawing_no', label: '電腦圖號', at: 102.4 },
      { key: 'material', label: '材質', at: 185.59 },
      { key: 'thickness', label: '厚度', at: 268.79 },
      { key: 'customer_name', label: '客戶', at: 351.99 },
      { key: 'quantity', label: '數量', end: 457.63, format: grouped },
      { key: 'unit', label: '單位', at: 473.62 },
      { key: 'unit_price', label: '單價', end: 579.27, format: grouped },
      { key: 'amount', label: '金額', end: 675.9, format: grouped },
    ],
    // Every line has a rule from 電腦圖號. 日合計 is followed by a short rule
    // when another day follows, and by a full one before 總計.
    lines(result) {
      const lines: Line[] = [];
      for (const group of runs(result.items, (row) => row.sale_date)) {
        group.rows.forEach((row, index) =>
          lines.push({
            row,
            rule: 102.4,
            blank: [
              ...(index > 0 ? ['sale_date'] : []),
              ...(index > 0 &&
              row.drawing_no === group.rows[index - 1].drawing_no
                ? ['drawing_no']
                : []),
            ],
          }),
        );
        lines.push({
          free: [[352, '日合計']],
          cells: { amount: grouped(sum(group.rows, 'amount')) },
          rule: 102.4,
        });
      }
      if (result.summary) {
        if (lines.length)
          Object.assign(lines[lines.length - 1], {
            rule: 19.2,
            ruleSpace: WIDE_RULE,
          });
        lines.push({
          free: [[352, '總　計']],
          cells: { amount: grouped(result.summary.amount) },
          rule: 19.2,
          ruleSpace: WIDE_RULE,
        });
        lines.push({ free: [[19.2, '印表結束']] });
      }
      return lines;
    },
  },
  // One customer per page; 頁次 restarts for every customer.
  'sales-customer-summary': {
    ...SALES_PX,
    header: SALES_SUMMARY_PX,
    left: 19.2,
    right: 499.2,
    pageNumbers: 'group',
    title: (ctx) => `${ctx.company}-銷售統計表【客戶別】`,
    meta: (ctx, page) => [
      [19.2, `客戶：${page.group?.name ?? ''}\u3000${page.group?.code ?? ''}`],
      [175.2, `期間：${period(ctx)}`],
      [409.65, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'drawing_no', label: '電腦圖號', at: 19.2 },
      { key: 'material', label: '材質', at: 115.17 },
      { key: 'thickness', label: '厚度', at: 211.26 },
      { key: 'quantity', label: '數量', end: 329.54, format: grouped },
      { key: 'unit', label: '單位', at: 358.44 },
      { key: 'amount', label: '金額', end: 490.29, format: grouped },
    ],
    lines(result) {
      const lines: Line[] = [];
      for (const group of runs(result.items, (row) => row.customer_code)) {
        const info = { code: group.key, name: group.rows[0].customer_name };
        group.rows.forEach((row, index) =>
          lines.push({ row, group: info, newPage: index === 0 }),
        );
        lines[lines.length - 1].rule = 19.2;
        lines.push({
          group: info,
          free: [[115.2, '合計']],
          cells: { amount: grouped(sum(group.rows, 'amount')) },
        });
      }
      return lines;
    },
  },
  'sales-customer-detail': {
    ...SALES_PX,
    header: SALES_DETAIL_PX,
    left: 19.2,
    right: 640,
    pageNumbers: 'group',
    title: (ctx) => `${ctx.company}-銷售明細表【客戶別】`,
    meta: (ctx, page) => [
      [19.2, `客戶：${page.group?.name ?? ''}\u3000${page.group?.code ?? ''}`],
      [232.16, `資料期間：${period(ctx)}`],
      [467.23, `印表日期：${ctx.printDate}`],
    ],
    columns: [
      { key: 'sale_no', label: '出貨編號', at: 19.2 },
      { key: 'drawing_no', label: '電腦圖號', at: 108.85 },
      { key: 'material', label: '材質', at: 198.36 },
      { key: 'thickness', label: '厚度', at: 288.01 },
      { key: 'quantity', label: '數量', end: 406.42, format: grouped },
      { key: 'unit', label: '單位', at: 428.87 },
      { key: 'unit_price', label: '單價', end: 534.37, format: grouped },
      { key: 'amount', label: '金額', end: 631.01, format: grouped },
    ],
    // A full rule ends every sale, with more room before the next sale than
    // before the customer's 小計 (except for the last customer).
    lines(result) {
      const lines: Line[] = [];
      const customers = runs(result.items, (row) => row.customer_code);
      for (const [customerIndex, customer] of customers.entries()) {
        const info = {
          code: customer.key,
          name: customer.rows[0].customer_name,
        };
        runs(customer.rows, (row) => row.sale_no).forEach((sale, saleIndex) => {
          sale.rows.forEach((row, index) =>
            lines.push({
              row,
              group: info,
              newPage: saleIndex === 0 && index === 0,
              blank: index > 0 ? ['sale_no'] : [],
            }),
          );
          Object.assign(lines[lines.length - 1], {
            rule: 19.2,
            ruleSpace: WIDE_RULE,
          });
        });
        if (customerIndex < customers.length - 1)
          lines[lines.length - 1].ruleSpace = RULE_PX;
        lines.push({
          group: info,
          free: [[288, '小　計']],
          cells: { amount: grouped(sum(customer.rows, 'amount')) },
        });
      }
      return lines;
    },
  },
  'sales-journal': {
    ...SALES_PX,
    header: {
      title: 35.2,
      titleSize: 20.0008,
      meta: 61.92,
      ruleTop: 66.56,
      labels: 79.84,
      ruleBottom: 84.48,
      body: 97.76,
    },
    left: 12.8,
    right: 742.4,
    title: (ctx) => `${ctx.company} 銷售日記表`,
    meta: (ctx, page) => [
      [12.8, `資料期間：${period(ctx)}`],
      [358.36, `印表日期：${ctx.printDate}`],
      [678.4, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'sale_no', label: '出貨編號', at: 12.8 },
      { key: 'customer_name', label: '客戶名稱', at: 89.55 },
      { key: 'drawing_no', label: '電腦圖號', at: 166.42 },
      { key: 'material', label: '材質', at: 243.17 },
      { key: 'thickness', label: '厚度', at: 320.05 },
      { key: 'quantity', label: '數量', end: 398.68, format: plain },
      { key: 'unit', label: '單位', at: 409.56 },
      { key: 'unit_price', label: '單價', end: 489, format: price2 },
      { key: 'line_total', label: '小計', end: 552.97, format: plain },
      { key: 'tax_amount', label: '稅額', end: 603.51, format: plain },
      { key: 'total_amount', label: '應收金額', end: 668.16, format: plain },
      { key: 'received_amount', label: '已收金額', end: 732.14, format: plain },
    ],
    lines(result) {
      // The server already blanks the number and customer after a sale's
      // first line and the totals before its last line.
      const lines: Line[] = [];
      for (const row of result.items) {
        if (row.sale_no && lines.length) lines[lines.length - 1].rule = 12.8;
        lines.push({ row });
      }
      if (lines.length) lines[lines.length - 1].rule = 12.8;
      if (result.summary) {
        const summary = result.summary;
        lines.push({
          free: [[409.6, '合計']],
          cells: Object.fromEntries(
            ['line_total', 'tax_amount', 'total_amount', 'received_amount'].map(
              (key) => [key, plain(summary[key])],
            ),
          ),
        });
      }
      return lines;
    },
  },
  'order-unshipped': orderLayout(
    '未交貨工件明細表',
    'delivery_date',
    '交貨期限',
    ['已交數量', '未交數量'],
    ['shipped_quantity', 'open_quantity'],
    'quantity',
  ),
  'work-unfinished': orderLayout(
    '未完工工件明細表',
    'transfer_date',
    '工作單日期',
    ['已完工數量', '未完工數量'],
    ['completed_quantity', 'open_quantity'],
    'order_quantity',
  ),
  'order-shipped': orderLayout(
    '訂單出貨明細表',
    null,
    '訂單編號',
    ['已交數量', '未交數量'],
    ['shipped_quantity', 'open_quantity'],
    'quantity',
  ),
  'order-completed': orderLayout(
    '訂單完工明細表',
    null,
    '訂單編號',
    ['已完工數量', '未完工數量'],
    ['completed_quantity', 'open_quantity'],
    'order_quantity',
  ),
  // The legacy 工作明細表 reads completion slips (workout.mdb), which hold no
  // data, so it only ever prints its header.
  'work-register': {
    unit: 'px',
    fontSize: 16,
    rowHeight: 17.92,
    ruleDrop: 5.12,
    ruleSpace: 3.84,
    bottom: PX_PAGE_BOTTOM,
    emptyRule: true,
    header: {
      title: 17.6,
      titleSize: 18.7207,
      meta: 53.76,
      ruleTop: 58.88,
      labels: 75.52,
      ruleBottom: 80.64,
      body: 96,
    },
    left: 19.2,
    right: 684.8,
    title: (ctx) => `${ctx.company}-工作明細表`,
    meta: (ctx, page) => [
      [19.2, `期間：${period(ctx)}`],
      [276.01, `印表日期：${ctx.printDate}`],
      [601.6, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'employee', label: '員工', at: 19.2 },
      { key: 'date', label: '日期', at: 115.2 },
      { key: 'customer', label: '客戶', at: 211.21 },
      { key: 'drawing_no', label: '電腦圖號', at: 307.21 },
      { key: 'material', label: '材質', at: 403.21 },
      { key: 'thickness', label: '厚度', at: 499.22 },
      { key: 'machine', label: '機台', at: 550.42 },
      {
        key: 'completed_quantity',
        label: '完工數量',
        end: 681.62,
        format: grouped,
      },
    ],
    lines: (result) => result.items.map((row) => ({ row })),
  },
  // 應收明細表, 應收帳款總表, 收款統計表 and 收款明細表 in printed px from
  // the legacy XPS output of 2026-10-07 (115.09.01~115.09.02).
  'receivable-detail': {
    unit: 'px',
    fontSize: 13.4405,
    rowHeight: 15.36,
    ruleDrop: 4.64,
    ruleSpace: 2.56,
    bottom: PX_PAGE_BOTTOM,
    deferRule: true,
    header: {
      title: 48,
      titleSize: 20.0008,
      meta: 81.12,
      ruleTop: 85.76,
      labels: 99.04,
      ruleBottom: 103.68,
      body: 116.96,
    },
    left: 19.2,
    right: 729.6,
    title: (ctx) => `${ctx.company}\u3000應收明細表`,
    meta: (ctx, page) => [
      [19.2, `資料期間：${period(ctx)}`],
      [288.01, `印表日期：${ctx.printDate}`],
      [556.8, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'customer_name', label: '客戶', at: 19.2 },
      { key: 'sale_no', label: '出貨編號', at: 108.85 },
      { key: 'amount', label: '貨款', end: 279, format: grouped },
      { key: 'tax', label: '營業稅', end: 368.65, format: grouped },
      { key: 'discount', label: '折扣金額', end: 458.3, format: grouped },
      { key: 'total', label: '應收金額', end: 547.81, format: grouped },
      { key: 'received', label: '已收金額', end: 637.46, format: grouped },
      { key: 'unpaid', label: '未收金額', end: 727.11, format: grouped },
    ],
    lines(result) {
      const amounts = [
        'amount',
        'tax',
        'discount',
        'total',
        'received',
        'unpaid',
      ];
      const lines: Line[] = [];
      for (const group of runs(result.items, (row) => row.customer_code)) {
        group.rows.forEach((row, index) =>
          lines.push({ row, blank: index > 0 ? ['customer_name'] : [] }),
        );
        lines[lines.length - 1].rule = 108.8;
        lines.push({
          free: [[108.8, '合　計']],
          cells: Object.fromEntries(
            amounts.map((key) => [key, grouped(sum(group.rows, key))]),
          ),
          rule: 19.2,
        });
      }
      if (result.summary) {
        lines.push({
          free: [[108.8, '總　計']],
          cells: amountCells(amounts, result.summary),
          rule: 19.2,
        });
        lines.push({ free: [[19.2, '印表結束']] });
      }
      return lines;
    },
  },
  // Rows are ruled underneath; 34 fit on a page.
  // 16 px text on 25.6 px rows, each under a full rule 7.68 px below it.
  'receivable-summary': {
    unit: 'px',
    fontSize: 16,
    rowHeight: 17.92,
    ruleDrop: 7.68,
    ruleSpace: 7.68,
    bottom: PX_PAGE_BOTTOM,
    header: {
      title: 51.2,
      titleSize: 24,
      meta: 83.2,
      ruleTop: 90.88,
      labels: 107.52,
      ruleBottom: 115.2,
      body: 133.12,
    },
    left: 12.8,
    right: 716.8,
    title: (ctx) => `${ctx.company} 應收帳款總表`,
    meta: (ctx, page) => [
      [12.8, `印表日期：${ctx.printDate}`],
      [248.81, `交易期間：${period(ctx)}`],
      [627.2, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'customer_name', label: '客戶', at: 12.8 },
      {
        key: 'previous_unpaid',
        label: '前期未收',
        end: 243.21,
        format: grouped,
      },
      { key: 'amount', label: '本期貨款', end: 339.21, format: grouped },
      { key: 'tax', label: '營業稅', end: 435.22, format: grouped },
      { key: 'receivable', label: '應收金額', end: 531.22, format: grouped },
      { key: 'received', label: '已收金額', end: 627.22, format: grouped },
      { key: 'unpaid', label: '未收金額', end: 723.23, format: grouped },
    ],
    lines(result) {
      const lines: Line[] = result.items.map((row) => ({ row, rule: 12.8 }));
      if (result.summary) {
        const amounts = [
          'previous_unpaid',
          'amount',
          'tax',
          'receivable',
          'received',
          'unpaid',
        ];
        lines.push({
          free: [[64, '總　計']],
          cells: amountCells(amounts, result.summary),
          rule: 12.8,
          ruleSpace: 6.4,
        });
        lines.push({ free: [[12.8, '印表結束']] });
      }
      return lines;
    },
  },
  'receipt-summary': {
    unit: 'px',
    fontSize: 16,
    rowHeight: 19.2,
    ruleDrop: 6.4,
    ruleSpace: 3.84,
    bottom: PX_PAGE_BOTTOM,
    header: {
      title: 48,
      titleSize: 20.0008,
      meta: 83.2,
      ruleTop: 89.6,
      labels: 106.24,
      ruleBottom: 112.64,
      body: 129.28,
    },
    left: 25.6,
    right: 627.2,
    title: (ctx) => `${ctx.company}\u3000收款統計表`,
    meta: (ctx, page) => [
      [25.6, `印表日期：${ctx.printDate}`],
      [210.41, `交易期間：${period(ctx)}`],
      [537.6, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'customer_code', label: '客戶', at: 25.6 },
      { key: 'customer_name', label: '', at: 128 },
      { key: 'received_amount', label: '實收金額', end: 310.41, format: plain },
      { key: 'merchandise_amount', label: '貨款', end: 412.81, format: plain },
      { key: 'tax_amount', label: '營業稅', end: 515.22, format: plain },
      { key: 'discount_amount', label: '折讓金額', end: 617.62, format: plain },
    ],
    lines(result) {
      const lines: Line[] = result.items.map((row) => ({ row }));
      if (!result.truncated) {
        if (lines.length) lines[lines.length - 1].rule = 25.6;
        const amounts = [
          'received_amount',
          'merchandise_amount',
          'tax_amount',
          'discount_amount',
        ];
        lines.push({
          free: [[128, `共${result.items.length}筆`]],
          cells: Object.fromEntries(
            amounts.map((key) => [key, plain(sum(result.items, key))]),
          ),
          rule: 25.6,
        });
        lines.push({ free: [[25.6, '印表結束']] });
      }
      return lines;
    },
  },
  'receipt-legacy-4': {
    unit: 'px',
    fontSize: 13.4405,
    rowHeight: 15.36,
    ruleDrop: 4.64,
    ruleSpace: 2.56,
    bottom: PX_PAGE_BOTTOM,
    header: {
      title: 49.12,
      titleSize: 21.28,
      meta: 81.12,
      ruleTop: 85.76,
      labels: 100.32,
      ruleBottom: 104.96,
      body: 118.24,
    },
    left: 12.8,
    right: 742.4,
    title: (ctx) => `${ctx.company}\u3000收款明細表`,
    meta: (ctx, page) => [
      [12.8, `印表日期：${ctx.printDate}`],
      [280.13, `交易期間：${period(ctx)}`],
      [627.2, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'customer_name', label: '客戶名稱', at: 12.8 },
      { key: 'closing_date', label: '帳款止日', at: 96 },
      { key: 'receivable', label: '應收金額', end: 246.4, format: grouped },
      { key: 'received', label: '實收金額', end: 329.59, format: grouped },
      { key: 'bank_account', label: '銀行帳號', at: 345.59 },
      { key: 'check_number', label: '支票號碼', at: 428.78 },
      { key: 'check_date', label: '到 期 日', at: 543.97 },
      { key: 'note', label: '備註', at: 627.17 },
    ],
    lines(result) {
      const lines: Line[] = [];
      for (const group of runs(result.items, (row) => row.customer_code)) {
        group.rows.forEach((row, index) =>
          lines.push({
            row,
            rule: 96,
            blank: index > 0 ? ['customer_name'] : [],
          }),
        );
        lines[lines.length - 1].rule = 12.8;
      }
      if (lines.length) lines[lines.length - 1].ruleSpace = 3.84;
      if (!result.truncated) {
        lines.push({
          free: [[12.8, '合計']],
          cells: {
            receivable: grouped(sum(result.items, 'receivable')),
            received: grouped(sum(result.items, 'received')),
          },
        });
      }
      return lines;
    },
  },
  'invoice-detail': { kind: 'invoice', detailed: true },
  'invoice-brief': { kind: 'invoice', detailed: false },
  ...contactLayouts('customer', '客戶'),
  ...contactLayouts('supplier', '廠商'),
  // 員工資料表 and 工件基本資料表 in printed px from the legacy XPS output of
  // 2026-10-07. Dates sit in 10-character fields, as stored in the legacy data.
  'employee-list': {
    unit: 'px',
    fontSize: 16,
    rowHeight: 17.92,
    ruleDrop: 5.12,
    ruleSpace: 2.56,
    bottom: PX_PAGE_BOTTOM,
    header: {
      title: 34.56,
      titleSize: 24,
      subtitle: 62.08,
      subtitleSize: 20,
      meta: 83.2,
      ruleTop: 88.32,
      labels: 103.68,
      labels2: 121.6,
      ruleBottom: 126.72,
      body: 142.08,
    },
    left: 19.2,
    right: 646.4,
    title: (ctx) => ctx.company,
    subtitle: () => '員工資料表',
    meta: (ctx, page) => [
      [19.2, `印表日期： ${ctx.printDate}`],
      [531.2, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'code', label: '編號', at: 19.2 },
      { key: 'full_name', label: '姓名', at: 70.4 },
      { key: 'id_number', label: '身分證號', at: 185.61 },
      { key: 'birth_date', label: '出生日期', at: 300.81, padStart: 10 },
      { key: 'title', label: '職稱', at: 416.01 },
      { key: 'hire_date', label: '任職日期', at: 531.22, padStart: 10 },
    ],
    columns2: [
      { key: 'phone', label: '聯絡電話', at: 70.4 },
      { key: 'address', label: '通訊地址', at: 185.6 },
    ],
    lines: (result) => [
      ...result.items.map((row) => ({ row, double: true, rule: 19.2 })),
      ...(result.truncated
        ? []
        : [{ free: [[19.2, '印表結束']] as [number, string][] }]),
    ],
  },
  'part-list': {
    unit: 'px',
    fontSize: 16,
    rowHeight: 17.92,
    ruleDrop: 5.12,
    ruleSpace: 2.56,
    bottom: PX_PAGE_BOTTOM,
    header: {
      title: 34.56,
      titleSize: 24,
      subtitle: 62.08,
      subtitleSize: 20,
      meta: 83.2,
      ruleTop: 88.32,
      labels: 103.68,
      ruleBottom: 108.8,
      body: 124.16,
    },
    left: 12.8,
    right: 723.2,
    title: (ctx) => ctx.company,
    subtitle: () => '工件基本資料表',
    meta: (ctx, page) => [
      [12.8, `印表日期：${ctx.printDate}`],
      [544, `頁次： ${page.number}`],
    ],
    columns: [
      { key: 'drawing_no', label: '電腦圖號', at: 12.8 },
      { key: 'customer_model', label: '客戶型號', at: 102.4 },
      { key: 'material', label: '材質', at: 390.41 },
      { key: 'thickness', label: '厚度', at: 480.02 },
      { key: 'customer_short_name', label: '客戶', at: 544.02 },
      { key: 'latest_sale_date', label: '最近交易', at: 633.62 },
    ],
    lines: (result) => [
      ...result.items.map((row) => ({ row, rule: 12.8 })),
      ...(result.truncated
        ? []
        : [{ free: [[12.8, '印表結束']] as [number, string][] }]),
    ],
  },
};

// The four order reports, in printed px from the legacy XPS output of
// 2026-10-07 (115.09.01~115.09.02): 16 px text on 17.92 px rows, a rule
// 5.12 px under the baseline above it adding 3.84 px.
// On a new page the dated reports print the date and customer again on the
// first line; the order reports do not, and instead start the order over on
// the page's second line (a full rule, then order and customer), as if the
// first line had not been an order line (訂單出貨／訂單完工 XPS, 2026-10-07).
function orderLayout(
  name: string,
  dateKey: string | null,
  firstLabel: string,
  doneLabels: [string, string],
  doneKeys: [string, string],
  quantityKey: string,
): PxLayout {
  const firstKey = dateKey ?? 'order_no';
  return {
    // The dated reports also open every later page with a full rule under
    // the column labels and 3.84 px more room.
    ...(dateKey
      ? {
          repeatAtPageStart: [firstKey, 'customer_name'],
          continuationRule: true,
        }
      : { repeatOnSecond: [firstKey, 'customer_name'] }),
    unit: 'px',
    fontSize: 16,
    rowHeight: 17.92,
    ruleDrop: 5.12,
    ruleSpace: 3.84,
    bottom: PX_PAGE_BOTTOM,
    header: {
      title: 17.6,
      titleSize: 18.7207,
      meta: 53.76,
      ruleTop: 58.88,
      labels: 75.52,
      ruleBottom: 80.64,
      body: 96,
    },
    left: 19.2,
    right: 729.6,
    title: (ctx) => `${ctx.company}-${name}`,
    meta: (ctx, page) => [
      [19.2, `期間：${period(ctx)}`],
      [298.41, `印表日期：${ctx.printDate}`],
      [646.4, `頁次： ${page.number}`],
    ],
    columns: [
      { key: firstKey, label: firstLabel, at: 19.2 },
      { key: 'customer_name', label: '客戶', at: 115.2 },
      { key: 'drawing_no', label: '電腦圖號', at: 211.21 },
      { key: 'material', label: '材質', at: 307.21 },
      { key: 'thickness', label: '厚度', at: 403.21 },
      { key: quantityKey, label: '訂單數量', end: 534.42, format: grouped },
      { key: doneKeys[0], label: doneLabels[0], end: 630.42, format: grouped },
      { key: doneKeys[1], label: doneLabels[1], end: 726.43, format: grouped },
    ],
    // With no rows the legacy report still draws its closing rule.
    emptyRule: true,
    lines(result) {
      const lines: Line[] = [];
      if (dateKey) {
        // Dated reports group by date, then customer: the date prints once
        // per day and the customer once per run, with a rule from the
        // customer column after each customer and a full rule after each day.
        for (const day of runs(result.items, (row) => row[dateKey])) {
          runs(day.rows, (row) => row.customer_code).forEach(
            (customer, customerIndex) => {
              customer.rows.forEach((row, index) =>
                lines.push({
                  row,
                  blank: [
                    ...(customerIndex > 0 || index > 0 ? [dateKey] : []),
                    ...(index > 0 ? ['customer_name'] : []),
                  ],
                }),
              );
              lines[lines.length - 1].rule = 115.2;
            },
          );
          // A day ends with a full rule.
          lines[lines.length - 1].rule = 19.2;
        }
      } else {
        for (const order of runs(result.items, (row) => row.order_no)) {
          order.rows.forEach((row, index) =>
            lines.push({
              row,
              blank: index > 0 ? ['order_no', 'customer_name'] : [],
            }),
          );
          lines[lines.length - 1].rule = 19.2;
        }
      }
      if (lines.length) lines[lines.length - 1].rule = 19.2;
      return lines;
    },
  };
}

// 客戶／廠商聯絡摘要表 in printed px from the legacy XPS output of
// 2026-10-07: two lines a record, each record under a full rule.
function contactLayouts(
  kind: 'customer' | 'supplier',
  label: string,
): Record<string, ReportLayout> {
  const list = (key: string): [string, ReportLayout] => [
    `${kind}-contacts-${key}`,
    {
      unit: 'px',
      fontSize: 16,
      rowHeight: 17.92,
      ruleDrop: 5.12,
      ruleSpace: 2.56,
      bottom: PX_PAGE_BOTTOM,
      header: {
        title: 34.56,
        titleSize: 24,
        subtitle: 62.08,
        subtitleSize: 20,
        meta: 83.2,
        ruleTop: 88.32,
        labels: 103.68,
        labels2: 121.6,
        ruleBottom: 126.72,
        body: 142.08,
      },
      left: 19.2,
      right: 755.2,
      title: (ctx) => ctx.company,
      subtitle: () => `${label}聯絡摘要表`,
      meta: (ctx, page) => [
        [
          35.2,
          kind === 'customer'
            ? `交易期間： ${ctx.filters.date_from || ''}至 ${ctx.filters.date_to || ''}`
            : `交易期間：至 ${ctx.printDate}`,
        ],
        [390.41, `印表日期： ${ctx.printDate}`],
        [659.2, `頁次： ${page.number}`],
      ],
      columns: [
        { key: 'code', label: '編號', at: 19.2 },
        { key: 'short_name', label: '簡稱', at: 76.8 },
        { key: 'full_name', label: '全名', at: 160.01 },
        { key: 'responsible', label: '負責人', at: 390.41 },
        { key: 'tax_id', label: '統一編號', at: 467.22 },
        { key: 'phone1', label: '電話', at: 563.22 },
        { key: 'fax', label: '傳真', at: 659.22 },
      ],
      columns2: [
        { key: 'address', label: '通訊地址', at: 76.8 },
        {
          key: 'shipping_address',
          label: kind === 'customer' ? '送貨地址' : '工廠地址',
          at: 390.41,
        },
        { key: 'postal_code', label: '郵遞區號', at: 659.22 },
      ],
      lines: (result) => [
        ...result.items.map((row) => ({ row, double: true, rule: 19.2 })),
        ...(result.truncated
          ? []
          : [{ free: [[19.2, '印表結束']] as [number, string][] }]),
      ],
    },
  ];
  return Object.fromEntries([
    list('code'),
    list('postal'),
    [`${kind}-address-labels`, { kind: 'label' }],
    [`${kind}-envelopes`, { kind: 'envelope' }],
  ]);
}

// Report pages print on the full continuous form; 名條 go on 90 × 38.1 mm
// labels, envelopes and invoices on the half form (legacyPapers.ts). Their
// content and page breaks follow the Win7 preview.

// The addressee's name is followed by two full-width spaces and 鈞啟.
function addressBlock(row: Row) {
  return [
    text(row.postal_code),
    text(row.address),
    row.phone1 ? `TEL:${row.phone1}` : '',
  ];
}

// 地址名條 and 郵寄信封 in printed px from the legacy XPS output of
// 2026-10-07: every label and envelope is its own page, a line with nothing
// to print is left out (the others keep their places), and four or ten
// spaces stand between the name and 鈞啟.
function labelPages(result: ReportResult): PaperPage[] {
  return result.items.map((row, index) => {
    const page: PaperPage = {
      number: index + 1,
      kind: 'label',
      paper: 'label',
      unit: 'px',
      items: [],
      rules: [],
    };
    addressBlock(row).forEach((value, line) => {
      if (value)
        page.items.push({
          x: 25.6,
          y: 32 + line * 19.2,
          size: 16,
          text: value,
          baseline: true,
        });
    });
    page.items.push({
      x: 25.6,
      y: 99.84,
      size: 16,
      text: `${text(row.full_name)}    鈞啟`,
      baseline: true,
    });
    return page;
  });
}

function envelopePages(result: ReportResult, ctx: ReportContext): PaperPage[] {
  const profile = ctx.profile;
  return result.items.map((row, index) => {
    const page: PaperPage = {
      number: index + 1,
      kind: 'envelope',
      paper: 'half',
      unit: 'px',
      items: [],
      rules: [],
    };
    // The green G mark is a 66 × 66 picture in the legacy program.
    page.images = [
      { name: 'envelope-logo', x: 70.4, y: 19.2, width: 65.92, height: 65.92 },
    ];
    distributed(page, profile.name, [147.2, 531.2], 38.4, 24);
    distributed(page, profile.address, [147.2, 528], 61.44, 16);
    distributed(
      page,
      `電話:${profile.phone}  傳真:${profile.fax}`,
      [147.2, 524.8],
      80.64,
      16,
    );
    addressBlock(row).forEach((value, line) => {
      if (value)
        page.items.push({
          x: 211.2,
          y: 218.24 + line * 19.2,
          size: 20,
          text: value,
          baseline: true,
        });
    });
    page.items.push({
      x: 211.2,
      y: 295.04,
      size: 20,
      text: `${text(row.full_name)}          鈞啟`,
      baseline: true,
    });
    return page;
  });
}

// Invoices print on a short form, one customer at a time. The first page
// carries the letterhead, the customer block and the column labels;
// continuation pages start straight with the next line.
// 請款單 in printed px (1/96 inch, text y on the baseline), read from the
// legacy XPS output of 2026-10-07 (one customer, 115.09.01~115.09.02). Each
// half sheet starts a new XPS page; a customer's later pages have no header.
const INVOICE_PX = {
  fontSize: 16,
  row: 17.92,
  // The letterhead lines are spread over this box (legacy 分散對齊).
  letterhead: [230.4, 544] as [number, number],
  titleBox: [307.2, 467.2] as [number, number],
  // A line whose baseline would fall below this goes on the next half sheet
  // (seen at 496.64, not at 514.56).
  bottom: 505.6,
  continuedTop: 30.72,
  detailed: {
    right: 697.6,
    second: 428.82,
    columns: [
      { key: 'sale_date', label: '日期', at: 19.2 },
      { key: 'sale_no', label: '出貨編號', at: 108.8 },
      { key: 'drawing_no', label: '電腦編號', at: 198.41 },
      { key: 'material', label: '材質', at: 288.01 },
      { key: 'thickness', label: '厚度', at: 377.61 },
      { key: 'outsource', label: '', at: 428.82 },
      { key: 'quantity', label: '數量', end: 512.02, format: plain },
      { key: 'unit_price', label: '單價', end: 608.02, format: price2 },
      { key: 'amount', label: '金額', end: 684.82, format: plain },
    ] as Column[],
  },
  brief: {
    right: 716.8,
    second: 531.22,
    columns: [
      { key: 'sale_date', label: '日期', at: 19.2 },
      { key: 'sale_no', label: '出貨編號', at: 121.6 },
      { key: 'invoice_number', label: '發票號碼', at: 224.01 },
      { key: 'amount', label: '貨款', end: 406.41, format: groupedZero },
      { key: 'tax', label: '營業稅', end: 508.82, format: groupedZero },
      { key: 'received', label: '已收金額', end: 611.22, format: groupedZero },
      { key: 'unpaid', label: '未收金額', end: 713.63, format: groupedZero },
    ] as Column[],
  },
};

// 分散對齊: the characters are spread so the first starts at x0 and the last
// ends at x1, a full-width character taking two units and any other one.
function distributed(
  page: PaperPage,
  value: string,
  [x0, x1]: [number, number],
  y: number,
  size: number,
) {
  const chars = [...value];
  const units = chars.map((char) => (char.charCodeAt(0) > 255 ? 2 : 1));
  const lastWidth = (units[units.length - 1] * size) / 2;
  const before = units.slice(0, -1).reduce((total, unit) => total + unit, 0);
  const step = before ? (x1 - x0 - lastWidth) / before : 0;
  let at = 0;
  chars.forEach((char, index) => {
    if (char.trim())
      page.items.push({
        x: x0 + at * step,
        y,
        size,
        text: char,
        baseline: true,
      });
    at += units[index];
  });
}

function invoicePages(
  result: ReportResult,
  ctx: ReportContext,
  detailed: boolean,
): PaperPage[] {
  const spec = INVOICE_PX[detailed ? 'detailed' : 'brief'];
  const left = 19.2;
  const profile = ctx.profile;
  const pages: PaperPage[] = [];
  let page!: PaperPage;
  let y = 0;
  const newPage = (continued: boolean) => {
    page = {
      number: pages.length + 1,
      kind: 'invoice',
      paper: 'half',
      unit: 'px',
      items: [],
      rules: [],
    };
    pages.push(page);
    y = continued ? INVOICE_PX.continuedTop : 0;
  };
  const write = (
    x: number,
    baseline: number,
    value: string,
    align?: PaperText['align'],
  ) => {
    if (value !== '')
      page.items.push({
        x,
        y: baseline,
        size: INVOICE_PX.fontSize,
        text: value,
        baseline: true,
        ...(align ? { align } : {}),
      });
  };
  const rule = (atY: number, weight = 0.5) =>
    page.rules.push({ x1: left, x2: spec.right, y: atY, weight });
  const cell = (column: Column, value: unknown, baseline: number) => {
    const formatted = column.format ? column.format(value) : text(value);
    if (column.end != null) write(column.end, baseline, formatted, 'right');
    else write(column.at ?? 0, baseline, formatted);
  };
  // The next line goes on a new half sheet when its baseline would pass the bottom.
  const room = () => {
    if (y > INVOICE_PX.bottom) newPage(true);
  };

  for (const customer of result.pages ?? []) {
    newPage(false);
    distributed(page, profile.name, INVOICE_PX.letterhead, 21.76, 24);
    distributed(page, profile.address, INVOICE_PX.letterhead, 40.96, 16);
    distributed(
      page,
      `TEL:${profile.phone}    FAX:${profile.fax}`,
      INVOICE_PX.letterhead,
      58.88,
      16,
    );
    distributed(
      page,
      detailed ? '應收帳款明細表' : '應收帳款簡要表',
      INVOICE_PX.titleBox,
      83.68,
      21.28,
    );
    rule(90.88, 0.32);
    const info = customer.customer ?? {};
    // Two spaces and ﹝﹞ (U+FE5D/U+FE5E), as the legacy program prints them.
    write(left, 107.52, `客戶名稱：${text(info.name)}  ﹝${text(info.code)}﹞`);
    write(left, 124.16, `通訊地址：${text(info.address)}`);
    write(
      left,
      140.8,
      `請款期間：${text(result.period?.from)}~${text(result.period?.to)}`,
    );
    write(spec.second, 107.52, `統一編號：${text(info.tax_id)}`);
    write(spec.second, 124.16, `聯絡電話：${text(info.phone)}`);
    write(spec.second, 140.8, `製表日期：${ctx.printDate}`);
    rule(148.48, 0.32);
    for (const column of spec.columns)
      cell({ ...column, format: null }, column.label, 163.84);
    rule(168.96);
    y = 184.32;

    const totals = customer.totals ?? {};
    if (detailed) {
      // Each sale ends with a rule 5.12 px under its last line; the last
      // sale gets a second, then the right-aligned totals.
      for (const sale of customer.sales ?? []) {
        const items: Row[] = sale.items?.length ? sale.items : [{}];
        items.forEach((item, index) => {
          room();
          const row: Row = {
            ...item,
            ...(index === 0
              ? { sale_date: sale.sale_date, sale_no: sale.sale_no }
              : {}),
          };
          for (const column of spec.columns) cell(column, row[column.key], y);
          y += INVOICE_PX.row;
        });
        rule(y - INVOICE_PX.row + 5.12);
        y += 2.56;
      }
      // y is now 20.48 below the last line: the second rule sits 7.68 under
      // that line and the first total 23.04 under it.
      rule(y - 20.48 + 7.68, 0.32);
      y += 2.56;
      const lines: [string, string][] = [
        ['本期貨款：', plain(totals.amount)],
        ['營 業 稅：', plain(totals.tax)],
        ['前期未收：', plain(totals.previous_unpaid)],
        ['預 收 款：', plain(totals.advance)],
        ['應收合計：', plain(totals.receivable)],
      ];
      for (const [label, value] of lines) {
        room();
        write(544, y, label);
        write(684.81, y, value, 'right');
        y += INVOICE_PX.row;
      }
      rule(y - INVOICE_PX.row + 5.12);
    } else {
      for (const sale of customer.sales ?? []) {
        room();
        for (const column of spec.columns) cell(column, sale[column.key], y);
        y += INVOICE_PX.row;
      }
      const end = (key: string) =>
        spec.columns.find((column) => column.key === key)?.end ?? 0;
      // Last line → rule 7.68 below it → 合計 15.36 below the rule.
      rule(y - INVOICE_PX.row + 7.68);
      y += 7.68 - INVOICE_PX.row + 15.36;
      room();
      write(224, y, '合計');
      for (const key of ['amount', 'tax', 'received', 'unpaid'])
        write(end(key), y, groupedZero(totals[key]), 'right');
      rule(y + 5.12);
      y += 21.76;
      for (const [label, value] of [
        ['＋ 前期未收：', totals.previous_unpaid],
        ['－ 預 收 款：', totals.advance],
      ] as [string, unknown][]) {
        room();
        write(531.2, y, label);
        write(713.61, y, groupedZero(value), 'right');
        y += INVOICE_PX.row;
      }
      const lastLabel = y - INVOICE_PX.row;
      rule(lastLabel + 5.12);
      y = lastLabel + 21.76;
      room();
      write(555.2, y, '應收合計：');
      write(713.61, y, groupedZero(totals.receivable), 'right');
      rule(y + 5.12);
    }
  }
  return pages;
}

// Pages of a layout measured in printed px: text y is the baseline, and a
// line whose baseline would fall below layout.bottom starts a new page.
function pxPages(
  layout: PxLayout,
  ctx: ReportContext,
  lines: Line[],
): PaperPage[] {
  const header = layout.header;
  const columnsByKey = new Map(
    [...layout.columns, ...(layout.columns2 ?? [])].map((column) => [
      column.key,
      column,
    ]),
  );
  const pages: PaperPage[] = [];
  let page: PaperPage | null = null;
  let y = 0;
  let linesOnPage = 0;
  let groupKey: string | undefined;
  let groupPage = 0;
  let pushedDown = false;
  let repeatOnSecond = false;
  let lastRuled = false;
  // layout.deferRule: the rule under a line is drawn when the next line
  // comes; if that line starts a new page, the rule goes under the column
  // labels there (應收明細表).
  let pendingRule: { x1: number; y: number; space: number } | null = null;

  const place = (
    target: PaperPage,
    column: Column,
    value: string,
    baseline: number,
    padded = false,
  ) => {
    if (value === '') return;
    if (padded && column.padStart) value = value.padStart(column.padStart, ' ');
    target.items.push(
      column.end != null
        ? {
            x: column.end,
            y: baseline,
            size: layout.fontSize,
            text: value,
            align: 'right',
            baseline: true,
          }
        : {
            x: column.at ?? 0,
            y: baseline,
            size: layout.fontSize,
            text: value,
            baseline: true,
          },
    );
  };

  const startPage = (line: Line | null): PaperPage => {
    const key = line?.group?.code;
    groupPage =
      layout.pageNumbers === 'group' && key !== groupKey ? 1 : groupPage + 1;
    groupKey = key;
    const next: PaperPage = {
      number: layout.pageNumbers === 'group' ? groupPage : pages.length + 1,
      group: line?.group ?? null,
      unit: 'px',
      items: [],
      rules: [],
    };
    pages.push(next);
    next.items.push({
      x: (layout.left + layout.right) / 2,
      y: header.title,
      size: header.titleSize,
      text: layout.title(ctx),
      align: 'center',
      baseline: true,
    });
    if (layout.subtitle)
      next.items.push({
        x: (layout.left + layout.right) / 2,
        y: header.subtitle ?? 0,
        size: header.subtitleSize ?? layout.fontSize,
        text: layout.subtitle(ctx),
        align: 'center',
        baseline: true,
      });
    for (const [x, value] of layout.meta(ctx, next))
      next.items.push({
        x,
        y: header.meta,
        size: layout.fontSize,
        text: value,
        baseline: true,
      });
    next.rules.push({ x1: layout.left, x2: layout.right, y: header.ruleTop });
    for (const column of layout.columns)
      place(next, column, column.label, header.labels);
    for (const column of layout.columns2 ?? [])
      place(next, column, column.label, header.labels2 ?? header.labels);
    next.rules.push({
      x1: layout.left,
      x2: layout.right,
      y: header.ruleBottom,
    });
    y = header.body + (pushedDown ? layout.rowHeight : 0);
    if (layout.continuationRule && pages.length > 1) {
      next.rules.push({
        x1: layout.left,
        x2: layout.right,
        y: header.ruleBottom + 2.56,
      });
      y += layout.ruleSpace;
    }
    linesOnPage = 0;
    return next;
  };

  for (const line of lines) {
    if (page && pendingRule && !(y > layout.bottom)) {
      page.rules.push({
        x1: pendingRule.x1,
        x2: layout.right,
        y: pendingRule.y,
      });
      y += pendingRule.space;
      pendingRule = null;
    }
    // A two-line record goes by its first line (員工資料表 XPS: a second line
    // at 1004.8 px).
    if (
      !page ||
      pushedDown ||
      (line.newPage && linesOnPage) ||
      y > layout.bottom
    ) {
      repeatOnSecond = Boolean(layout.repeatOnSecond);
      page = startPage(line);
      if (pendingRule) {
        page.rules.push({
          x1: pendingRule.x1,
          x2: layout.right,
          y: header.ruleBottom + 2.56,
        });
        y += pendingRule.space;
        pendingRule = null;
      }
      pushedDown = false;
      // Values printed once per group come back on the first line of a page.
      for (const key of layout.repeatAtPageStart ?? []) {
        if (line.blank?.includes(key))
          line.blank = line.blank.filter((blank) => blank !== key);
      }
    } else if (repeatOnSecond && linesOnPage === 1) {
      const repeated = layout.repeatOnSecond ?? [];
      if (line.blank?.some((key) => repeated.includes(key)) && !lastRuled) {
        page.rules.push({
          x1: layout.left,
          x2: layout.right,
          y: y - layout.rowHeight + layout.ruleDrop,
        });
        y += layout.ruleSpace;
      }
      for (const key of repeated) {
        if (line.blank?.includes(key))
          line.blank = line.blank.filter((blank) => blank !== key);
      }
      repeatOnSecond = false;
    }
    const current = page;
    if (line.row) {
      for (const column of layout.columns) {
        if (line.blank?.includes(column.key)) continue;
        const value = line.row[column.key];
        place(
          current,
          column,
          column.format ? column.format(value) : text(value),
          y,
          true,
        );
      }
      // A two-line record prints its second columns on the next line.
      if (line.double) {
        for (const column of layout.columns2 ?? [])
          place(
            current,
            column,
            text(line.row[column.key]),
            y + layout.rowHeight,
          );
        y += layout.rowHeight;
      }
    }
    for (const [key, value] of Object.entries(line.cells ?? {})) {
      const column = columnsByKey.get(key);
      if (column) place(current, column, value, y);
    }
    for (const [x, value] of line.free ?? [])
      current.items.push({
        x,
        y,
        size: layout.fontSize,
        text: value,
        baseline: true,
      });
    if (line.rule != null && layout.deferRule) {
      pendingRule = {
        x1: line.rule,
        y: y + layout.ruleDrop,
        space: line.ruleSpace ?? layout.ruleSpace,
      };
    } else if (line.rule != null) {
      current.rules.push({
        x1: line.rule,
        x2: layout.right,
        y: y + layout.ruleDrop,
      });
    }
    y += layout.rowHeight;
    linesOnPage += 1;
    if (line.rule != null && !layout.deferRule)
      y += line.ruleSpace ?? layout.ruleSpace;
    lastRuled = line.rule != null;
    // The legacy 工件別明細表 checks the page again right after a 小計; a page
    // it breaks there starts one row lower.
    if (line.breakBelow != null && y > line.breakBelow) pushedDown = true;
  }
  if (pendingRule && page)
    page.rules.push({ x1: pendingRule.x1, x2: layout.right, y: pendingRule.y });
  if (!page) {
    page = startPage(null);
    if (layout.emptyRule)
      page.rules.push({
        x1: layout.left,
        x2: layout.right,
        y: header.ruleBottom + 2.56,
      });
  }
  return pages;
}

// Turns a report result into positioned pages:
// {number, unit: "px", items: [{x, y, size, text, align, baseline}], rules: [{x1, x2, y}]}.
export function buildLegacyPages(
  reportKey: string,
  result: ReportResult | null | undefined,
  ctx: ReportContext,
): PaperPage[] {
  const layout = legacyPaperLayouts[reportKey];
  if (!layout || !result) return [];
  if (layout.kind === 'label') return labelPages(result);
  if (layout.kind === 'envelope') return envelopePages(result, ctx);
  if (layout.kind === 'invoice')
    return invoicePages(result, ctx, layout.detailed);
  return pxPages(layout, ctx, layout.lines(result, ctx));
}

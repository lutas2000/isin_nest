// Layout of the legacy 報表列印 dialogs as observed on Win7 (isin_vb6
// src/utils/legacyReportDialogs.js, docs/legacy-ui-spec.md). Radio buttons
// are listed column by column in on-screen order; each one maps to a report
// key in the server catalog. Fields are listed per column with the legacy
// label and the filter parameter they fill. `options` describes the 選項
// selection window: the row key and the columns it lists.
// Status bar (executable, Win7 2026-10-08): the bar is blank when a dialog
// opens; a date field clears it, any other field shows「F1輔助輸入。」, or
// its own `hint`.
const CUSTOMER_DATE_HINT = '欲全部顯示，請將交易起日清除成空白即可。';

export interface ReportDialogField {
  label: string;
  key: string;
  date?: boolean;
  lookup?: string;
  hint?: string;
}

export interface ReportDialog {
  title: string;
  options?: {
    key: string;
    columns: { key: string; label: string; align?: 'right' }[];
  };
  columns: string[][];
  labels: Record<string, string>;
  fields: ReportDialogField[][];
}

export const legacyReportDialogs: Record<string, ReportDialog> = {
  'order-reports': {
    title: '訂單報表列印',
    columns: [
      [
        'order-unshipped',
        'order-shipped',
        'work-unfinished',
        'order-completed',
      ],
    ],
    labels: {
      'order-unshipped': '未交貨工件明細表',
      'order-shipped': '訂單出貨明細表',
      'work-unfinished': '未完工工件明細表',
      'order-completed': '訂單完工明細表',
    },
    fields: [
      [
        { label: '應交起日', key: 'date_from', date: true },
        { label: '應交訖日', key: 'date_to', date: true },
      ],
      [
        { label: '客戶編號', key: 'customer_code', lookup: 'customer' },
        { label: '訂單編號', key: 'order_no' },
        { label: '電腦圖號', key: 'drawing_no', lookup: 'part' },
      ],
    ],
  },
  'sales-reports': {
    title: '銷貨報表列印',
    columns: [
      [
        'sales-work-summary',
        'sales-date-summary',
        'sales-customer-summary',
        'sales-journal',
      ],
      ['sales-work-detail', 'sales-date-detail', 'sales-customer-detail'],
    ],
    labels: {
      'sales-work-summary': '工件別統計表',
      'sales-date-summary': '日期別統計表',
      'sales-customer-summary': '客戶別統計表',
      'sales-journal': '銷售日記表',
      'sales-work-detail': '工件別明細表',
      'sales-date-detail': '日期別明細表',
      'sales-customer-detail': '客戶別明細表',
    },
    fields: [
      [
        { label: '開始日期', key: 'date_from', date: true },
        { label: '截止日期', key: 'date_to', date: true },
        { label: '開始客戶', key: 'customer_from', lookup: 'customer' },
        { label: '截止客戶', key: 'customer_to', lookup: 'customer' },
      ],
      // F1 on 品號 stops the legacy program with run-time error 13 (it passes
      // the field's text where FCheck takes a number), so it never opened a
      // list; it does nothing here.
      [
        { label: '開始品號', key: 'item_from' },
        { label: '截止品號', key: 'item_to' },
      ],
    ],
  },
  'work-reports': {
    title: '工作報表列印',
    columns: [['work-register']],
    labels: { 'work-register': '工作明細表' },
    fields: [
      [
        { label: '開始日期', key: 'date_from', date: true },
        { label: '截止日期', key: 'date_to', date: true },
        { label: '客戶編號', key: 'customer_code', lookup: 'customer' },
        { label: '訂單編號', key: 'order_no' },
        { label: '電腦圖號', key: 'drawing_no', lookup: 'part' },
        { label: '員工編號', key: 'employee_code', lookup: 'employee' },
      ],
    ],
  },
  'receipt-reports': {
    title: '收款報表列印',
    columns: [
      ['receivable-summary', 'receipt-summary', 'invoice-detail'],
      ['receivable-detail', 'receipt-legacy-4', 'invoice-brief'],
    ],
    labels: {
      'receivable-summary': '應收統計表',
      'receipt-summary': '收款統計表',
      'invoice-detail': '請款單(明細式)',
      'receivable-detail': '應收明細表',
      'receipt-legacy-4': '收款明細表',
      'invoice-brief': '請款單(簡要式)',
    },
    fields: [
      [
        { label: '開始日期', key: 'date_from', date: true },
        { label: '截止日期', key: 'date_to', date: true },
      ],
      [
        { label: '開始客戶', key: 'customer_from', lookup: 'customer' },
        { label: '截止客戶', key: 'customer_to', lookup: 'customer' },
      ],
    ],
  },
  'customer-reports': {
    title: '客戶資料列印',
    options: {
      key: 'code',
      columns: [
        { key: 'code', label: '編號' },
        { key: 'short_name', label: '簡稱' },
        { key: 'phone1', label: '電話' },
        { key: 'latest_transaction_date', label: '最近交易日' },
      ],
    },
    columns: [
      [
        'customer-contacts-code',
        'customer-contacts-postal',
        'customer-address-labels',
        'customer-envelopes',
      ],
    ],
    labels: {
      'customer-contacts-code': '聯絡摘要表(按編號順序)',
      'customer-contacts-postal': '聯絡摘要表(按郵遞區號)',
      'customer-address-labels': '地址名條',
      'customer-envelopes': '郵寄信封',
    },
    fields: [
      [
        {
          label: '交易起日',
          key: 'date_from',
          date: true,
          hint: CUSTOMER_DATE_HINT,
        },
        {
          label: '交易訖日',
          key: 'date_to',
          date: true,
          hint: CUSTOMER_DATE_HINT,
        },
      ],
      [
        { label: '開始客戶', key: 'customer_from', lookup: 'customer' },
        { label: '截止客戶', key: 'customer_to', lookup: 'customer' },
      ],
    ],
  },
  'supplier-reports': {
    title: '廠商資料列印',
    options: {
      key: 'code',
      columns: [
        { key: 'code', label: '編號' },
        { key: 'short_name', label: '簡稱' },
        { key: 'phone1', label: '電話' },
        { key: 'latest_transaction_date', label: '最近交易日' },
      ],
    },
    columns: [
      [
        'supplier-contacts-code',
        'supplier-contacts-postal',
        'supplier-address-labels',
        'supplier-envelopes',
      ],
    ],
    labels: {
      'supplier-contacts-code': '聯絡摘要表(按編號順序)',
      'supplier-contacts-postal': '聯絡摘要表(按郵遞區號)',
      'supplier-address-labels': '地址名條',
      'supplier-envelopes': '郵寄信封',
    },
    fields: [
      [
        { label: '開始廠商', key: 'supplier_from', lookup: 'supplier' },
        { label: '截止廠商', key: 'supplier_to', lookup: 'supplier' },
      ],
    ],
  },
  'employee-reports': {
    title: '員工資料列印',
    options: {
      key: 'code',
      columns: [
        { key: 'code', label: '編號' },
        { key: 'full_name', label: '姓名' },
      ],
    },
    columns: [['employee-list']],
    labels: { 'employee-list': '員工資料表' },
    fields: [
      [
        { label: '開始編號', key: 'employee_from', lookup: 'employee' },
        { label: '截止編號', key: 'employee_to', lookup: 'employee' },
      ],
    ],
  },
  'part-reports': {
    title: '工作資料列印',
    options: {
      key: 'drawing_no',
      columns: [
        { key: 'drawing_no', label: '電腦圖號' },
        { key: 'customer_model', label: '客戶型號' },
        { key: 'material', label: '材質' },
        { key: 'thickness', label: '厚度' },
        { key: 'latest_sale_date', label: '最近交易' },
      ],
    },
    columns: [['part-list']],
    labels: { 'part-list': '工作件資料表' },
    fields: [
      [
        { label: '開始品號', key: 'part_from', lookup: 'part' },
        { label: '截止品號', key: 'part_to', lookup: 'part' },
        { label: '客戶編號', key: 'customer_code', lookup: 'customer' },
      ],
    ],
  },
};

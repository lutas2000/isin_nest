/**
 * MDB 表 → legacy_crm 的欄位對應，照搬 isin_vb6 `scripts/stage-legacy-import.mjs`
 * （依據 isin_vb6 docs/legacy-mdb-field-mapping.md，並經 Win7 舊版畫面核對）。
 * 欄位名稱為 legacy-records.ts 正規化函式的輸入欄名，值為 MDB 欄名（不分大小寫）。
 */
import {
  checkLayoutFromColumns,
  normalizeBank,
  normalizeDrawingGroup,
  normalizeMaterial,
  normalizeOrder,
  normalizePart,
  normalizePartner,
  normalizePhrase,
  normalizeQuote,
  normalizeReceipt,
  normalizeSale,
  normalizeWork,
  NormalizedDocument,
  Row,
} from '../common/legacy-records';

const partner = {
  code: 'code',
  full_name: 'name',
  short_name: 'cutname',
  responsible: 'master',
  phone1: 'tel1',
  phone2: 'tel2',
  fax: 'fax',
  tax_id: 'coco',
  postal_code: 'zipno',
  address: 'addr',
  shipping_address: 'inaddr',
  invoice_title: 'subname',
  invoice_tax_id: 'coco2',
  bank_name: 'bank',
  bank_account: 'account',
  contact1: 'agent1',
  contact2: 'agent2',
  contact3: 'agent3',
  start_date: 'deal_f',
  latest_transaction_date: 'deal_l',
  credit_limit: 'credit',
  balance: 'debt',
  email: 'email',
  dxf_path: 'dxfpath',
  main_product: 'prod',
  notes: 'remark',
};

export interface MasterStep {
  target: string;
  /** `<mdb>.<table>`，即 CSV 目錄名 */
  source: string;
  table: string;
  map: Record<string, string>;
  /** 回傳要寫入的列與判斷來源重複用的鍵 */
  normalize: (input: Record<string, string>) => { key: string; row: Row };
}

const lenient = { dates: 'lenient' as const };

export const MASTER_STEPS: MasterStep[] = [
  {
    target: 'customer',
    source: 'cust.cust',
    table: 'partners',
    map: partner,
    normalize: (input) => {
      const row = normalizePartner(input, { ...lenient, kind: 'customer' });
      return { key: row.code as string, row };
    },
  },
  {
    target: 'supplier',
    source: 'supp.cust',
    table: 'partners',
    map: partner,
    normalize: (input) => {
      const row = normalizePartner(input, { ...lenient, kind: 'supplier' });
      return { key: row.code as string, row };
    },
  },
  {
    target: 'bank',
    source: 'bank.BANK',
    table: 'banks',
    map: {
      code: 'BKNO',
      short_name: 'BKNK',
      full_name: 'BKNAME',
      contact: 'CONTACT',
      phone1: 'TEL1',
      phone2: 'TEL2',
      address: 'ADDRESS',
      account_no: 'ACNO',
      account_name: 'ACNAME',
      balance: 'Debt',
      notes: 'REMARK',
      // 支票列印位置設定，2026-10-07 與 Win7 表單核對：t 憑票支付、c 新台幣、n NT$、
      // p 禁止背書轉讓、issue 開票日期、ac 受款人、ex 到期日、amt 支出金額、off 修正。datexx 一律空白。
      check_year_x: 'xposy',
      check_year_y: 'yposy',
      check_month_x: 'xposm',
      check_month_y: 'yposm',
      check_day_x: 'xposd',
      check_day_y: 'yposd',
      check_payment_text_x: 'xpost',
      check_payment_text_y: 'ypost',
      check_ntd_text_x: 'xposc',
      check_ntd_text_y: 'yposc',
      check_currency_prefix_x: 'xposn',
      check_currency_prefix_y: 'yposn',
      check_non_endorsable_x: 'xposp',
      check_non_endorsable_y: 'yposp',
      check_bank_account_x: 'xbkno',
      check_bank_account_y: 'ybkno',
      check_issue_date_x: 'xissue1',
      check_issue_date_y: 'yissue1',
      check_issue_date_x2: 'xissue2',
      check_issue_date_y2: 'yissue2',
      check_payee_x: 'xac1',
      check_payee_y: 'yac1',
      check_payee_x2: 'xac2',
      check_payee_y2: 'yac2',
      check_due_date_x: 'xex1',
      check_due_date_y: 'yex1',
      check_due_date_x2: 'xex2',
      check_due_date_y2: 'yex2',
      check_expense_amount_x: 'xamt1',
      check_expense_amount_y: 'yamt1',
      check_expense_amount_x2: 'xamt2',
      check_expense_amount_y2: 'yamt2',
      check_correction_x: 'offx',
      check_correction_y: 'offy',
    },
    normalize: (input) => {
      const row = normalizeBank({
        ...input,
        check_layout: checkLayoutFromColumns(input),
      });
      return { key: row.code as string, row };
    },
  },
  {
    target: 'phrase',
    source: 'phrase.phrase',
    table: 'phrases',
    map: { phrase_no: 'phno', content: 'phrase' },
    normalize: (input) => {
      const row = normalizePhrase(input);
      return { key: row.phrase_no as string, row };
    },
  },
  {
    // 材質建檔依序顯示 kind 的 metal、thick、remark、soul（材質、厚度、品名、分類）；kno 只是 metal 補上 thick。
    target: 'material',
    source: 'master.kind',
    table: 'materials',
    map: {
      material: 'metal',
      thickness: 'thick',
      product_name: 'remark',
      category: 'soul',
    },
    normalize: (input) => {
      const row = normalizeMaterial(input);
      return {
        key: JSON.stringify([
          row.material,
          row.thickness,
          row.product_name,
          row.category,
        ]),
        row,
      };
    },
  },
  {
    target: 'part',
    source: 'dcst.dcst',
    table: 'parts',
    map: {
      // Win7 工件建檔（2026-10-07）：客戶型號是 DWG_REF，CUST 是客戶簡稱，最近交易是 CNC3，加工內容是 CNC5。
      drawing_no: 'DWG_NO',
      drawing_name: 'DWG_NAME',
      drawing_ref: 'CUST',
      customer_code: 'CUST_NO',
      customer_model: 'DWG_REF',
      material: 'METAL',
      thickness: 'THICK',
      unit: 'UNIT',
      price_ref: 'PR_REF',
      price1: 'PR_REF1',
      price2: 'PR_REF2',
      price3: 'PR_REF3',
      price4: 'PR_REF4',
      actor_no: 'ACTOR_NO',
      actor: 'ACTOR',
      drawing_date: 'DWG_DATE',
      directory_path: 'DISK',
      cnc1: 'CNC1',
      cnc2: 'CNC2',
      cnc3: 'CNC3',
      cnc5: 'CNC5',
      notes: 'REMARK',
    },
    normalize: (input) => {
      const row = normalizePart(input, lenient);
      return { key: row.drawing_no as string, row };
    },
  },
];

export interface DocumentRelation {
  /** 正規化輸入的屬性名，也是 NormalizedDocument.lines 的鍵 */
  key: string;
  source: string;
  /** 指向表頭鍵的欄 */
  parent: string;
  table: string;
  map: Record<string, string>;
}

export interface DocumentStep {
  target: string;
  source: string;
  /** 表頭鍵欄 */
  key: string;
  table: string;
  map: Record<string, string>;
  relations: DocumentRelation[];
  normalize: (input: Record<string, unknown>) => NormalizedDocument;
}

/** 移轉的單據保留來源金額，也不觸發出貨數、已收金額、最近交易日的回寫。 */
const migrated = { dates: 'lenient' as const, preserveSourceAmounts: true };

export const DOCUMENT_STEPS: DocumentStep[] = [
  {
    target: 'order',
    source: 'order.gtable',
    key: 'QNO',
    table: 'order_documents',
    map: {
      order_no: 'QNO',
      order_date: 'DATE_R',
      delivery_date: 'DATE_E',
      customer_code: 'FACTOR_NO',
      customer_name: 'FACTOR',
      actor_no: 'ACTOR_NO',
      actor_name: 'ACTOR',
      delivery_method: 'PCON',
      payment_method: 'QCON',
      note: 'NOTES',
      closed: 'CLOSED',
    },
    relations: [
      {
        key: 'items',
        source: 'order.itable',
        parent: 'QNO',
        table: 'order_items',
        map: {
          line_no: 'SN',
          legacy_sn: 'SN',
          legacy_date_r: 'DATE_R',
          legacy_date_e: 'DATE_E',
          legacy_factor_no: 'FACTOR_NO',
          legacy_factor: 'FACTOR',
          drawing_no: 'DWG_NO',
          customer_model: 'DWG_REF',
          material: 'METAL',
          thickness: 'THICK',
          outsource: 'BUY',
          source: 'SOURCE',
          post_process: 'OSP',
          quantity: 'QTY',
          unit: 'UNIT',
          shipped_quantity: 'SOOK',
        },
      },
    ],
    normalize: (input) => normalizeOrder(input, migrated),
  },
  {
    target: 'sale',
    source: 'sold.gtable',
    key: 'QNO',
    table: 'sales_documents',
    map: {
      sale_no: 'QNO',
      sale_date: 'DATE_R',
      customer_code: 'FACTOR_NO',
      customer_name: 'FACTOR',
      actor_no: 'ACTOR_NO',
      actor_name: 'ACTOR',
      linked_order_no: 'RESERV',
      payment_method: 'PCON',
      delivery_method: 'QCON',
      invoice_number: 'invoice',
      shipping_address: 'SENDTO',
      note: 'NOTES',
      tax_mode: 'TAXID',
      amount: 'AMMOUNT',
      tax_amount: 'TAX',
      discount_amount: 'DISC',
      total_amount: 'TWOT',
      received_amount: 'PAID',
    },
    relations: [
      {
        key: 'items',
        source: 'sold.itable',
        parent: 'QNO',
        table: 'sales_items',
        map: {
          line_no: 'SN',
          legacy_sn: 'SN',
          legacy_date_r: 'DATE_R',
          legacy_factor_no: 'FACTOR_NO',
          legacy_factor: 'FACTOR',
          drawing_no: 'DWG_NO',
          customer_model: 'DWG_REF',
          material: 'METAL',
          thickness: 'THICK',
          outsource: 'BUY',
          quantity: 'QTY',
          unit: 'UNIT',
          unit_price: 'PRICE',
          line_total: 'TOTAL',
        },
      },
    ],
    normalize: (input) => normalizeSale(input, migrated),
  },
  {
    target: 'quote',
    source: 'quote.gtable',
    key: 'QNO',
    table: 'quote_documents',
    map: {
      quote_no: 'QNO',
      quote_date: 'DATE_R',
      customer_code: 'FACTOR_NO',
      customer_name: 'FACTOR',
      actor_no: 'ACTOR_NO',
      actor_name: 'ACTOR',
      attention: 'ATTEN',
      total_amount: 'AMOUNT',
    },
    relations: [
      {
        key: 'items',
        source: 'quote.itable',
        parent: 'QNO',
        table: 'quote_items',
        map: {
          line_no: 'SN',
          customer_model: 'DWG_REF',
          material: 'METAL',
          thickness: 'THICK',
          summary: 'WORK',
          quantity: 'QTY',
          unit_price: 'PRICE',
          line_total: 'TOTAL',
        },
      },
      {
        key: 'notes',
        source: 'quote.jtable',
        parent: 'QNO',
        table: 'quote_note_lines',
        map: { line_no: 'SN', note: 'DWG_REF' },
      },
    ],
    normalize: (input) => normalizeQuote(input, migrated),
  },
  {
    target: 'receipt',
    source: 'gotten.dcmy',
    key: 'qno',
    table: 'receipt_documents',
    map: {
      receipt_no: 'qno',
      receipt_date: 'date_r',
      closing_date: 'dstop',
      customer_code: 'factor_no',
      customer_name: 'factor',
      actor_no: 'actor_no',
      actor_name: 'actor',
      current_received: 'much',
      current_merchandise: 'sale',
      current_tax: 'tax',
      current_discount: 'disc',
      previous_advance: 'prepaid',
      previous_unpaid: 'prenot',
      current_advance: 'leaf',
      current_unpaid: 'thisnot',
    },
    relations: [
      {
        key: 'payments',
        source: 'gotten.check',
        parent: 'qno',
        table: 'receipt_payment_lines',
        map: {
          line_no: 'sn',
          category: 'cash',
          amount: 'much',
          check_number: 'check_no',
          check_date: 'cash_date',
          bank_account: 'acno',
          collect_agent: 'acname',
          bank_short_name: 'Bank',
          note: 'notes',
        },
      },
      {
        key: 'allocations',
        source: 'gotten.dcrf',
        parent: 'pay_chk',
        table: 'receipt_allocation_lines',
        map: {
          sale_no: 'id_no',
          merchandise: 'amount',
          tax: 'tax',
          discount: 'disc',
          receivable: 'twot',
          unpaid: 'remainder',
          offset: 'pay_off',
          previously_offset: 'prepaid',
        },
      },
    ],
    normalize: (input) => normalizeReceipt(input, migrated),
  },
  {
    target: 'work',
    source: 'workplan.gtable',
    key: 'QNO',
    table: 'work_documents',
    map: {
      work_no: 'QNO',
      transfer_date: 'DATE_R',
      customer_code: 'FACTOR_NO',
      customer_name: 'FACTOR',
      actor_no: 'ACTOR_NO',
      actor_name: 'ACTOR',
      order_no: 'RESERV',
    },
    relations: [
      {
        key: 'items',
        source: 'workplan.itable',
        parent: 'QNO',
        table: 'work_items',
        map: {
          line_no: 'SN',
          drawing_no: 'DWG_NO',
          material: 'METAL',
          thickness: 'THICK',
          outsource: 'BUY',
          order_quantity: 'QTY',
          completed_quantity: 'QTY_OK',
          cnc_ok: 'CNC_OK',
          plating_work: 'FLAG',
          post_process: 'OSP',
          order_no: 'RESERV',
        },
      },
    ],
    normalize: (input) => normalizeWork(input, migrated),
  },
  {
    // 明細以 DSETS（在 gtable 唯一）指向圖組，並重複存客戶；新版客戶取自表頭。
    target: 'group',
    source: 'dwgroup.gtable',
    key: 'DSETS',
    table: 'drawing_groups',
    map: {
      group_no: 'DSETS',
      created_date: 'DATE_R',
      customer_code: 'FACTOR_NO',
      customer_name: 'FACTOR',
      customer_drawing_no: 'DWG_REF',
      notes: 'NOTES',
    },
    relations: [
      {
        key: 'items',
        source: 'dwgroup.itable',
        parent: 'DSETS',
        table: 'drawing_group_items',
        map: {
          line_no: 'SN',
          drawing_no: 'DWG_NO',
          customer_drawing_no: 'DWG_REF',
          material: 'METAL',
          thickness: 'THICK',
          quantity: 'QTY',
          is_laser: 'FLAG',
        },
      },
    ],
    normalize: (input) => normalizeDrawingGroup(input, migrated),
  },
];

/** 舊員工檔：不匯入，只用來預填 staff.legacy_crm_code（見 staff-codes.ts）。 */
export const EMPLOYEE_SOURCE = {
  source: 'personel.staff',
  map: { code: 'plno', name: 'name', leave_date: 'quit' },
};

export const ALL_TARGETS = [
  ...MASTER_STEPS.map((step) => step.target),
  ...DOCUMENT_STEPS.map((step) => step.target),
];

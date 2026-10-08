/**
 * 舊版銷管報表目錄（移植自 isin_vb6 server/reports.mjs）。
 *
 * 目錄（標題、說明、篩選欄、欄位）與 isin_vb6 相同；SQL 改寫為 PostgreSQL：
 * - 日期欄是 `date`，篩選與排序直接用日期欄（isin_vb6 以 `substr('   ' || trim(col), -9)` 靠右對齊比較文字）；
 *   輸出時日期欄另帶 `<別名>_raw`，由 finishReportRow 轉回民國字串。
 * - 金額與數量以 `<名稱>__units` 取出 units，在 JS 除以 10,000（不讓 PostgreSQL 回傳 numeric 字串）。
 * - SQLite 的「MIN() 搭配裸欄位取最小那列」改用 ROW_NUMBER() 取第一列。
 * - 空白日期在 PostgreSQL 是 NULL；isin_vb6 的靠右對齊字串讓空白日期排最前，因此遞增排序加 NULLS FIRST。
 */
import { displayRocDate } from '../common/roc-date';

export interface ReportFilterDefinition {
  type: 'range' | 'exact';
  from?: string;
  to?: string;
  key?: string;
  label: string;
  /** PostgreSQL 運算式；文字欄皆為 COLLATE "C"（與 SQLite BINARY 相同） */
  column: string;
  placeholder: string;
  lookup: string;
  legacyDate?: boolean;
}

export interface ReportColumnDefinition {
  key: string;
  label: string;
  format: string;
}

export interface ReportDefinition {
  key: string;
  group: string;
  title: string;
  available: boolean;
  note: string;
  filters: ReportFilterDefinition[];
  columns: ReportColumnDefinition[];
  /** 完整 SQL（不含 LIMIT）；where 為以 AND 串接的條件，沒有條件時為 TRUE */
  sql?: (where: string) => string;
  /** finishReportRow 之後的調整 */
  map?: (row: Record<string, unknown>) => Record<string, unknown>;
  kind?: 'customer' | 'supplier';
  empty?: boolean;
  invoice?: { withItems: boolean };
}

const dateRange = (column: string, label: string): ReportFilterDefinition => ({
  type: 'range',
  from: 'date_from',
  to: 'date_to',
  label,
  column,
  placeholder: '例：115.01.31',
  lookup: '',
  legacyDate: true,
});
const codeRange = (
  column: string,
  from: string,
  to: string,
  label: string,
  lookup = '',
): ReportFilterDefinition => ({
  type: 'range',
  from,
  to,
  label,
  column,
  placeholder: '起／迄編號',
  lookup,
});
const exact = (
  column: string,
  key: string,
  label: string,
  placeholder = '',
  lookup = '',
): ReportFilterDefinition => ({
  type: 'exact',
  key,
  label,
  column,
  placeholder,
  lookup,
});
const col = (
  key: string,
  label: string,
  format = 'text',
): ReportColumnDefinition => ({ key, label, format });

/** 日期欄輸出：ISO 文字與原字串，finishReportRow 轉成民國字串。 */
const date = (expression: string, alias: string) =>
  `${expression}::text AS ${alias}, ${expression}_raw AS ${alias}_raw`;

const T = 'legacy_crm';

export const REPORTS: ReportDefinition[] = [
  {
    key: 'order-unshipped',
    group: 'order-reports',
    title: '未交貨工件明細表',
    available: true,
    note: '舊版一個月預覽共 8 頁，欄位為應交日期、客戶、圖號、材質、厚度、訂單數量、已交數量及未交數量。此處依新系統訂購量大於已出貨量篩選；紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.delivery_date', '應交日期'),
      exact(
        'd.customer_code',
        'customer_code',
        '客戶編號',
        '可選擇客戶',
        'customer',
      ),
      exact('d.order_no', 'order_no', '訂單編號'),
      exact('i.drawing_no', 'drawing_no', '電腦圖號', '可選擇工作件', 'part'),
    ],
    columns: [
      col('delivery_date', '應交日期'),
      col('customer_name', '客戶'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '訂單數量', 'quantity'),
      col('shipped_quantity', '已交數量', 'quantity'),
      col('open_quantity', '未交數量', 'quantity'),
    ],
    // isin_vb6 以文字排序 d.delivery_date（99 年排在 100 年之後）；此處依日期。
    sql: (
      where,
    ) => `SELECT ${date('d.delivery_date', 'delivery_date')}, d.order_no, d.customer_code, d.customer_name,
      i.line_no, i.drawing_no, i.customer_model, i.material, i.thickness,
      i.quantity_units AS quantity__units,
      i.shipped_quantity_units AS shipped_quantity__units,
      i.quantity_units - i.shipped_quantity_units AS open_quantity__units
      FROM ${T}.order_documents d JOIN ${T}.order_items i ON i.order_no = d.order_no
      WHERE i.quantity_units > i.shipped_quantity_units AND ${where}
      ORDER BY d.delivery_date NULLS FIRST, d.customer_name, i.drawing_no, i.line_no, d.order_no`,
  },
  {
    key: 'order-shipped',
    group: 'order-reports',
    title: '訂單出貨明細表',
    available: true,
    note: '舊版一個月預覽共 58 頁，欄位為訂單編號、客戶、圖號、材質、厚度、訂單數量、已交數量及未交數量，按訂單／客戶段落列出。此處顯示新系統已保存的訂單數與出貨數；紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.delivery_date', '應交日期'),
      exact(
        'd.customer_code',
        'customer_code',
        '客戶編號',
        '可選擇客戶',
        'customer',
      ),
      exact('d.order_no', 'order_no', '訂單編號'),
      exact('i.drawing_no', 'drawing_no', '電腦圖號', '可選擇工作件', 'part'),
    ],
    columns: [
      col('order_no', '訂單編號'),
      col('customer_name', '客戶'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '訂單數量', 'quantity'),
      col('shipped_quantity', '已交數量', 'quantity'),
      col('open_quantity', '未交數量', 'quantity'),
    ],
    sql: (
      where,
    ) => `SELECT ${date('d.delivery_date', 'delivery_date')}, d.order_no, d.customer_code, d.customer_name,
      i.line_no, i.drawing_no, i.customer_model, i.material, i.thickness,
      i.quantity_units AS quantity__units,
      i.shipped_quantity_units AS shipped_quantity__units,
      i.quantity_units - i.shipped_quantity_units AS open_quantity__units
      FROM ${T}.order_documents d JOIN ${T}.order_items i ON i.order_no = d.order_no
      WHERE ${where}
      ORDER BY d.order_no, i.line_no`,
  },
  {
    key: 'work-unfinished',
    group: 'order-reports',
    title: '未完工工件明細表',
    available: true,
    note: '舊版一個月預覽共 53 頁，欄位為工作單日期、客戶、圖號、材質、厚度、訂單數量、已完工數量及未完工數量，依日期／客戶段落列出。此處依新系統工作明細訂單量大於完工量篩選；舊版來源與排序仍待核實。',
    filters: [
      dateRange('w.transfer_date', '轉單日期'),
      exact(
        'w.customer_code',
        'customer_code',
        '客戶編號',
        '可選擇客戶',
        'customer',
      ),
      exact('w.order_no', 'order_no', '訂單編號'),
      exact('wi.drawing_no', 'drawing_no', '電腦圖號', '可選擇工作件', 'part'),
      exact(
        'w.actor_no',
        'employee_code',
        '員工編號',
        '可選擇員工',
        'employee',
      ),
    ],
    columns: [
      col('transfer_date', '工作單日期'),
      col('customer_name', '客戶'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('order_quantity', '訂單數量', 'quantity'),
      col('completed_quantity', '已完工數量', 'quantity'),
      col('open_quantity', '未完工數量', 'quantity'),
    ],
    // 舊版 SQL：workplan.itable where qty > qty_ok, order by date_r, factor_no, dwg_no。
    sql: (
      where,
    ) => `SELECT ${date('w.transfer_date', 'transfer_date')}, w.work_no, w.customer_code, w.customer_name,
      w.order_no, w.actor_no, wi.line_no, wi.drawing_no, wi.material, wi.thickness,
      wi.order_quantity_units AS order_quantity__units,
      wi.completed_quantity_units AS completed_quantity__units,
      wi.order_quantity_units - wi.completed_quantity_units AS open_quantity__units
      FROM ${T}.work_documents w JOIN ${T}.work_items wi ON wi.work_no = w.work_no
      WHERE wi.order_quantity_units > wi.completed_quantity_units AND ${where}
      ORDER BY w.transfer_date NULLS FIRST, w.customer_code, wi.drawing_no, w.work_no, wi.line_no`,
  },
  {
    key: 'order-completed',
    group: 'order-reports',
    title: '訂單完工明細表',
    available: true,
    note: '依舊版 2026-10-07 XPS 核對：列出期間內工作單的明細，依各列所屬訂單（舊 workplan.itable.RESERV）分段，訂單數量、已完工數量取工作單明細。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('w.transfer_date', '工作單日期'),
      exact(
        'w.customer_code',
        'customer_code',
        '客戶編號',
        '可選擇客戶',
        'customer',
      ),
      exact('wi.order_no', 'order_no', '訂單編號'),
      exact('wi.drawing_no', 'drawing_no', '電腦圖號', '可選擇工作件', 'part'),
    ],
    columns: [
      col('order_no', '訂單編號'),
      col('customer_name', '客戶'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('order_quantity', '訂單數量', 'quantity'),
      col('completed_quantity', '已完工數量', 'quantity'),
      col('open_quantity', '未完工數量', 'quantity'),
    ],
    // 舊版 SQL 依 reserv, sn 排序：訂單、項次，再依工作單。
    sql: (
      where,
    ) => `SELECT wi.order_no, w.customer_code, w.customer_name, w.work_no,
      wi.line_no, wi.drawing_no, wi.material, wi.thickness,
      wi.order_quantity_units AS order_quantity__units,
      wi.completed_quantity_units AS completed_quantity__units,
      wi.order_quantity_units - wi.completed_quantity_units AS open_quantity__units
      FROM ${T}.work_documents w JOIN ${T}.work_items wi ON wi.work_no = w.work_no
      WHERE ${where}
      ORDER BY wi.order_no, wi.line_no, w.work_no`,
  },

  {
    key: 'sales-journal',
    group: 'sales-reports',
    title: '銷售日記表資料預覽',
    available: true,
    note: '預設查詢最近一個月，可自行調整日期；欄位與同單分組位置依舊版 XPS 樣張核對。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('sale_no', '出貨編號'),
      col('customer_name', '客戶名稱'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('unit_price', '單價', 'currency'),
      col('line_total', '小計', 'currency'),
      col('tax_amount', '稅額', 'currency'),
      col('total_amount', '應收金額', 'currency'),
      col('received_amount', '已收金額', 'currency'),
    ],
    // isin_vb6 以文字排序 d.sale_date；此處依日期。
    sql: (where) => `SELECT
      CASE WHEN ROW_NUMBER() OVER (PARTITION BY d.sale_no ORDER BY i.line_no) = 1
        THEN d.sale_no ELSE '' END AS sale_no,
      CASE WHEN ROW_NUMBER() OVER (PARTITION BY d.sale_no ORDER BY i.line_no) = 1
        THEN d.customer_name ELSE '' END AS customer_name,
      i.drawing_no, i.material, i.thickness,
      i.quantity_units AS quantity__units,
      i.unit,
      i.unit_price_units AS unit_price__units,
      i.line_total_units AS line_total__units,
      CASE WHEN ROW_NUMBER() OVER (PARTITION BY d.sale_no ORDER BY i.line_no DESC) = 1
        THEN NULLIF(d.tax_units, 0) END AS tax_amount__units,
      CASE WHEN ROW_NUMBER() OVER (PARTITION BY d.sale_no ORDER BY i.line_no DESC) = 1
        THEN d.total_units END AS total_amount__units,
      CASE WHEN ROW_NUMBER() OVER (PARTITION BY d.sale_no ORDER BY i.line_no DESC) = 1
        THEN NULLIF(d.received_units, 0) END AS received_amount__units
      FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
      WHERE ${where}
      ORDER BY d.sale_date NULLS FIRST, d.sale_no, i.line_no`,
  },
  {
    key: 'sales-work-summary',
    group: 'sales-reports',
    title: '工件別統計表',
    available: true,
    note: '每個電腦圖號一列，數量與金額加總；客戶型號、材質、厚度、單位取期間內第一筆（依日期、出貨編號、項次），和舊版 2026-10-07 XPS 逐行相同。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('drawing_no', '電腦圖號'),
      col('customer_model', '客戶型號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('amount', '金額', 'currency'),
    ],
    // isin_vb6：GROUP BY 圖號，其他欄取 MIN(日期 || 出貨編號 || 項次) 那一列。
    sql: (
      where,
    ) => `SELECT s.drawing_no, s.customer_model, s.material, s.thickness,
      s.quantity__units, s.unit, s.amount__units
      FROM (
        SELECT i.drawing_no, i.customer_model, i.material, i.thickness, i.unit,
          SUM(i.quantity_units) OVER w AS quantity__units,
          SUM(i.line_total_units) OVER w AS amount__units,
          ROW_NUMBER() OVER (PARTITION BY i.drawing_no
            ORDER BY d.sale_date NULLS FIRST, d.sale_no, i.line_no) AS first_line
        FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
        WHERE ${where}
        WINDOW w AS (PARTITION BY i.drawing_no)
      ) s
      WHERE s.first_line = 1
      ORDER BY s.drawing_no`,
  },
  {
    key: 'sales-work-detail',
    group: 'sales-reports',
    title: '工件別明細表',
    available: true,
    note: '舊版一個月預覽欄位為圖號、材質、厚度、客戶名稱、出貨編號、數量、單位、單價及金額，並顯示小計列。此處只列 SQLite 原始銷貨明細，不合併、不推算小計；紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('customer_name', '客戶名稱'),
      col('sale_no', '出貨編號'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('unit_price', '單價', 'currency'),
      col('amount', '金額', 'currency'),
    ],
    sql: (
      where,
    ) => `SELECT i.drawing_no, i.material, i.thickness, d.customer_name, d.customer_code, d.sale_no,
      i.quantity_units AS quantity__units,
      i.unit,
      i.unit_price_units AS unit_price__units,
      i.line_total_units AS amount__units
      FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
      WHERE ${where}
      ORDER BY i.drawing_no, i.material, i.thickness, d.customer_name, d.sale_no, i.line_no`,
  },
  {
    key: 'sales-date-summary',
    group: 'sales-reports',
    title: '日期別統計表',
    available: true,
    note: '每天每個電腦圖號一列，數量與金額加總；材質、厚度、單位取當天第一筆（依出貨編號、項次），和舊版 2026-10-07 XPS 逐行相同。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('sale_date', '日期'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('amount', '金額', 'currency'),
    ],
    // isin_vb6：GROUP BY 日期文字、圖號，其他欄取 MIN(出貨編號 || 項次) 那一列。
    // 日期文字相同才同組，因此以 (日期, 原字串) 分組。
    sql: (
      where,
    ) => `SELECT s.sale_date, s.sale_date_raw, s.drawing_no, s.material, s.thickness,
      s.quantity__units, s.unit, s.amount__units
      FROM (
        SELECT ${date('d.sale_date', 'sale_date')}, d.sale_date AS sort_date,
          i.drawing_no, i.material, i.thickness, i.unit,
          SUM(i.quantity_units) OVER w AS quantity__units,
          SUM(i.line_total_units) OVER w AS amount__units,
          ROW_NUMBER() OVER (PARTITION BY d.sale_date, d.sale_date_raw, i.drawing_no
            ORDER BY d.sale_no, i.line_no) AS first_line
        FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
        WHERE ${where}
        WINDOW w AS (PARTITION BY d.sale_date, d.sale_date_raw, i.drawing_no)
      ) s
      WHERE s.first_line = 1
      ORDER BY s.sort_date NULLS FIRST, s.drawing_no`,
  },
  {
    key: 'sales-date-detail',
    group: 'sales-reports',
    title: '日期別明細表',
    available: true,
    note: '依舊版一個月預覽核對的日期、圖號、材質、厚度、客戶、數量、單位、單價、金額欄位；此處保留 SQLite 銷貨原始明細列並依日期統計金額。僅供唯讀預覽。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('sale_date', '日期'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('customer_name', '客戶'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('unit_price', '單價', 'currency'),
      col('amount', '金額', 'currency'),
    ],
    // isin_vb6 以文字排序 d.sale_date；此處依日期。
    sql: (
      where,
    ) => `SELECT ${date('d.sale_date', 'sale_date')}, d.sale_no, d.customer_name, i.drawing_no, i.material, i.thickness,
      i.quantity_units AS quantity__units,
      i.unit,
      i.unit_price_units AS unit_price__units,
      i.line_total_units AS amount__units
      FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
      WHERE ${where}
      ORDER BY d.sale_date NULLS FIRST, i.drawing_no, i.material, i.thickness, d.customer_code, d.sale_no, i.line_no`,
  },
  {
    key: 'sales-customer-summary',
    group: 'sales-reports',
    title: '客戶別統計表',
    available: true,
    note: '舊版一個月預覽共 153 頁，按客戶標示名稱／編號，欄位為圖號、材質、厚度、數量、單位及金額，並列客戶合計；末頁未見跨客戶總計。此處依客戶及工作欄位彙總 SQLite 銷貨資料；僅供唯讀預覽。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('amount', '金額', 'currency'),
    ],
    // 同一客戶編號有兩個名稱時，isin_vb6 的排序未指定；SQLite 依 GROUP BY 的順序（名稱在圖號之前）。
    sql: (
      where,
    ) => `SELECT d.customer_code, d.customer_name, i.drawing_no, i.material, i.thickness,
      SUM(i.quantity_units) AS quantity__units,
      i.unit,
      SUM(i.line_total_units) AS amount__units
      FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
      WHERE ${where}
      GROUP BY d.customer_code, d.customer_name, i.drawing_no, i.material, i.thickness, i.unit
      ORDER BY d.customer_code, i.drawing_no, i.material, i.thickness, i.unit, d.customer_name`,
  },
  {
    key: 'sales-customer-detail',
    group: 'sales-reports',
    title: '客戶別明細表',
    available: true,
    note: '舊版一個月預覽顯示客戶名稱／編號、出貨編號、圖號、材質、厚度、數量、單位、單價、金額及客戶小計。此處保留 SQLite 銷貨原始明細列並計算客戶金額小計；僅供唯讀預覽。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange('i.drawing_no', 'item_from', 'item_to', '品號', 'part'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('sale_no', '出貨編號'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('quantity', '數量', 'quantity'),
      col('unit', '單位'),
      col('unit_price', '單價', 'currency'),
      col('amount', '金額', 'currency'),
    ],
    sql: (
      where,
    ) => `SELECT d.customer_code, d.customer_name, d.sale_no, i.drawing_no, i.material, i.thickness,
      i.quantity_units AS quantity__units,
      i.unit,
      i.unit_price_units AS unit_price__units,
      i.line_total_units AS amount__units
      FROM ${T}.sales_documents d JOIN ${T}.sales_items i ON i.sale_no = d.sale_no
      WHERE ${where}
      ORDER BY d.customer_code, d.sale_no, i.line_no`,
  },
  {
    key: 'work-register',
    group: 'work-reports',
    title: '工作明細表',
    available: true,
    // 舊版的報表列出完工單（workout.mdb），該 MDB 從未有資料；新系統也沒有完工單，
    // 因此和舊版一樣只印表頭。
    empty: true,
    note: '舊版欄位為員工、日期、客戶、電腦圖號、材質、厚度、機台、完工數量，資料來自完工單（workout.mdb），該 MDB 是空表，所以舊版永遠只印表頭；新版同樣沒有完工單資料。',
    filters: [
      dateRange('w.transfer_date', '日期'),
      exact(
        'w.customer_code',
        'customer_code',
        '客戶編號',
        '可選擇客戶',
        'customer',
      ),
      exact('w.order_no', 'order_no', '訂單編號'),
      exact('i.drawing_no', 'drawing_no', '圖號', '可選擇工作件', 'part'),
      exact(
        'w.actor_no',
        'employee_code',
        '員工編號',
        '可選擇員工',
        'employee',
      ),
    ],
    columns: [
      col('employee', '員工'),
      col('date', '日期'),
      col('customer', '客戶'),
      col('drawing_no', '電腦圖號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('machine', '機台'),
      col('completed_quantity', '完工數量', 'quantity'),
    ],
  },
  {
    key: 'receipt-register',
    group: 'receipt-reports',
    title: '收款資料明細預覽',
    available: true,
    note: '僅列出收款登錄已保存欄位，不推算應收餘額、沖帳結果或舊版統計公式。',
    filters: [
      dateRange('d.receipt_date', '收款日期'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('receipt_date', '收款日期'),
      col('receipt_no', '收款單號'),
      col('customer_code', '客戶編號'),
      col('customer_name', '客戶名稱'),
      col('actor_no', '經手人'),
      col('current_received', '本次收款', 'currency'),
      col('current_merchandise', '本期貨款', 'currency'),
      col('current_tax', '本期稅額', 'currency'),
      col('current_discount', '本期折讓', 'currency'),
      col('current_unpaid', '本期未收', 'currency'),
    ],
    // isin_vb6 以文字排序 d.receipt_date；此處依日期。
    sql: (
      where,
    ) => `SELECT ${date('d.receipt_date', 'receipt_date')}, d.receipt_no, d.customer_code, d.customer_name, d.actor_no,
      d.current_received_units AS current_received__units,
      d.current_merchandise_units AS current_merchandise__units,
      d.current_tax_units AS current_tax__units,
      d.current_discount_units AS current_discount__units,
      d.current_unpaid_units AS current_unpaid__units
      FROM ${T}.receipt_documents d
      WHERE ${where}
      ORDER BY d.receipt_date NULLS FIRST, d.receipt_no`,
  },
  {
    key: 'receipt-payment-register',
    group: 'receipt-reports',
    title: '收款付款行原始資料預覽',
    available: true,
    note: '舊版一個月「收款明細表」共 3 頁，畫面欄位含客戶、帳款結日、應收／實收、銀行帳號、支票號碼、到期日與備註。此處只列新系統已保存的收款主檔快照與付款行原始欄位；不將前期未收或票據日期推定為舊版應收餘額／到期日，亦不計算沖帳；舊版同名報表見「收款明細表」。',
    filters: [
      dateRange('d.receipt_date', '收款日期'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('customer_name', '客戶名稱'),
      col('closing_date', '帳款結日'),
      col('receipt_no', '收款單號'),
      col('previous_unpaid', '前期未收（新系統欄位）', 'currency'),
      col('current_received', '本期實收（新系統欄位）', 'currency'),
      col('category', '收款類別'),
      col('payment_amount', '付款行金額', 'currency'),
      col('bank_account', '銀行帳號'),
      col('check_number', '票據號碼'),
      col('check_date', '票據日期'),
      col('bank_short_name', '銀行簡稱'),
      col('collect_agent', '代收'),
      col('note', '備註'),
    ],
    // isin_vb6 以文字排序 d.receipt_date；此處依日期。沒有付款行的收款，付款行欄位為 null（同 isin_vb6）。
    sql: (
      where,
    ) => `SELECT ${date('d.receipt_date', 'receipt_date')}, d.receipt_no, d.customer_code, d.customer_name,
      ${date('d.closing_date', 'closing_date')},
      d.previous_unpaid_units AS previous_unpaid__units,
      d.current_received_units AS current_received__units,
      p.line_no, p.category, p.amount_units AS payment_amount__units,
      p.bank_account, p.check_number, ${date('p.check_date', 'check_date')},
      p.bank_short_name, p.collect_agent, p.note
      FROM ${T}.receipt_documents d LEFT JOIN ${T}.receipt_payment_lines p ON p.receipt_no = d.receipt_no
      WHERE ${where}
      ORDER BY d.customer_code, d.receipt_date NULLS FIRST, d.receipt_no, p.line_no`,
    map: (row) => (row.line_no === null ? { ...row, check_date: null } : row),
  },
  {
    key: 'sales-account-fields',
    group: 'receipt-reports',
    title: '銷貨單帳款欄位（新系統原始預覽）',
    available: true,
    note: '只呈現新版銷貨單已保存欄位及明細貨款加總，包含新版銷貨總額與已收金額（舊版 PAID 快照，之後由新系統收款沖銷增減）；不計算未收，也不宣稱對應舊版應收報表。',
    filters: [
      dateRange('d.sale_date', '銷貨日期'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('sale_date', '銷貨日期'),
      col('sale_no', '出貨編號'),
      col('customer_code', '客戶編號'),
      col('customer_name', '客戶名稱'),
      col('invoice_number', '發票號碼（新系統欄位）'),
      col('merchandise_amount', '貨款（明細加總）', 'currency'),
      col('tax_amount', '營業稅（銷貨單欄位）', 'currency'),
      col('discount_amount', '折讓（銷貨單欄位）', 'currency'),
      col('sales_total', '銷貨總額（新版）', 'currency'),
      col('received_snapshot', '已收快照（銷貨單欄位）', 'currency'),
    ],
    // isin_vb6 以文字排序 d.sale_date；此處依日期。
    sql: (
      where,
    ) => `SELECT ${date('d.sale_date', 'sale_date')}, d.sale_no, d.customer_code, d.customer_name, d.invoice_number,
      COALESCE(i.merchandise_units, 0) AS merchandise_amount__units,
      d.tax_units AS tax_amount__units,
      d.discount_units AS discount_amount__units,
      d.total_units AS sales_total__units,
      d.received_units AS received_snapshot__units
      FROM ${T}.sales_documents d
      LEFT JOIN (
        SELECT sale_no, SUM(line_total_units) AS merchandise_units
        FROM ${T}.sales_items GROUP BY sale_no
      ) i ON i.sale_no = d.sale_no
      WHERE ${where}
      ORDER BY d.sale_date NULLS FIRST, d.sale_no`,
  },
  {
    key: 'receivable-detail',
    group: 'receipt-reports',
    title: '應收明細表',
    available: true,
    note: '依 2026-10-02 舊版預覽核對：列出出貨日期與客戶區間內的全部銷貨（含已收清），依客戶小計並列總計；已收金額為銷貨單已收（舊版 PAID，新系統收款沖銷會增減）。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '出貨日期'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('customer_name', '客戶'),
      col('sale_no', '出貨編號'),
      col('amount', '貨款', 'currency'),
      col('tax', '營業稅', 'currency'),
      col('discount', '折扣金額', 'currency'),
      col('total', '應收金額', 'currency'),
      col('received', '已收金額', 'currency'),
      col('unpaid', '未收金額', 'currency'),
    ],
    // isin_vb6 以文字排序 d.sale_date；此處依日期。
    sql: (
      where,
    ) => `SELECT ${date('d.sale_date', 'sale_date')}, d.sale_no, d.customer_code, d.customer_name,
      d.amount_units AS amount__units,
      d.tax_units AS tax__units,
      d.discount_units AS discount__units,
      d.total_units AS total__units,
      d.received_units AS received__units,
      d.total_units - d.received_units AS unpaid__units
      FROM ${T}.sales_documents d
      WHERE ${where}
      ORDER BY d.customer_code, d.sale_date NULLS FIRST, d.sale_no`,
  },
  {
    key: 'receivable-summary',
    group: 'receipt-reports',
    title: '應收帳款總表',
    available: true,
    note: '舊版選單名稱為「應收統計表」。依舊版預覽核對：先列期間內有銷貨的客戶，再列（2026-10-06 確認）期間內沒有銷貨、但開始日期前仍有未收的客戶，兩段各依客戶編號排序；前期未收 = 開始日期前未收銷貨的未收加總，應收金額 = 前期未收 + 期間銷貨應收，未收金額 = 應收金額 − 已收金額。期間內有折讓時的欄位呈現尚未在舊版畫面核對。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '出貨日期'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('customer_name', '客戶'),
      col('previous_unpaid', '前期未收', 'currency'),
      col('amount', '本期貨款', 'currency'),
      col('tax', '營業稅', 'currency'),
      col('receivable', '應收金額', 'currency'),
      col('received', '已收金額', 'currency'),
      col('unpaid', '未收金額', 'currency'),
    ],
    // units 欄留給 receivableSummaryItems 計算。
    sql: (
      where,
    ) => `SELECT d.customer_code, MIN(d.customer_name) AS customer_name,
      SUM(d.amount_units) AS amount_units,
      SUM(d.tax_units) AS tax_units,
      SUM(d.total_units) AS total_units,
      SUM(d.received_units) AS received_units
      FROM ${T}.sales_documents d
      WHERE ${where}
      GROUP BY d.customer_code
      ORDER BY d.customer_code`,
  },
  {
    key: 'invoice-brief',
    group: 'receipt-reports',
    title: '請款單（簡要式）',
    available: true,
    invoice: { withItems: false },
    note: '依 2026-10-02 舊版預覽核對：每位客戶從新的一頁開始「應收帳款簡要表」（短表單，續頁無表頭），只列期間內未收的銷貨；合計下方加前期未收（開始日期前的未收）、減預收款（最後一張收款的本期預收）得應收合計。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '請款期間'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [],
  },
  {
    key: 'invoice-detail',
    group: 'receipt-reports',
    title: '請款單（明細式）',
    available: true,
    invoice: { withItems: true },
    note: '依 2026-10-02 舊版預覽核對：每位客戶從新的一頁開始「應收帳款明細表」（短表單，續頁無表頭），列出期間內未收銷貨的品項；下方為本期貨款、營業稅、前期未收、預收款與應收合計。期間內有部分已收或折讓的銷貨時，舊版應收合計的算法尚未核對。紙面版型見 docs/legacy-ui-spec.md。',
    filters: [
      dateRange('d.sale_date', '請款期間'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [],
  },
  {
    key: 'receipt-legacy-4',
    group: 'receipt-reports',
    title: '收款明細表',
    available: true,
    note: '依 2026-10-06 舊版預覽與 MDB 副本核對：每張收款一列，依客戶、帳款止日、收款日排序；應收金額 = 本期貨款 + 本期稅額，實收金額 = 本期實收（13/13 樣本相符）。同客戶同日的順序舊版是 Access 內部順序，新版以收款單號排列。銀行帳號、支票號碼、到期日、備註取該收款第一筆有票據資料的付款行。',
    filters: [
      dateRange('d.closing_date', '帳款止日'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('customer_name', '客戶名稱'),
      col('closing_date', '帳款止日'),
      col('receivable', '應收金額', 'currency'),
      col('received', '實收金額', 'currency'),
      col('bank_account', '銀行帳號'),
      col('check_number', '支票號碼'),
      col('check_date', '到期日'),
      col('note', '備註'),
    ],
    sql: (where) => `SELECT d.customer_code, d.customer_name,
      ${date('d.closing_date', 'closing_date')}, ${date('d.receipt_date', 'receipt_date')}, d.receipt_no,
      d.current_merchandise_units + d.current_tax_units AS receivable__units,
      d.current_received_units AS received__units,
      COALESCE(p.bank_account, '') AS bank_account, COALESCE(p.check_number, '') AS check_number,
      ${date('p.check_date', 'check_date')}, COALESCE(p.note, '') AS note
      FROM ${T}.receipt_documents d
      LEFT JOIN ${T}.receipt_payment_lines p ON p.receipt_no = d.receipt_no AND p.line_no = (
        SELECT MIN(q.line_no) FROM ${T}.receipt_payment_lines q
        WHERE q.receipt_no = d.receipt_no
          AND (q.bank_account <> '' OR q.check_number <> '' OR q.check_date IS NOT NULL OR q.check_date_raw IS NOT NULL)
      )
      WHERE ${where}
      ORDER BY d.customer_code, d.closing_date NULLS FIRST, d.receipt_date NULLS FIRST, d.receipt_no`,
  },
  {
    key: 'receipt-summary',
    group: 'receipt-reports',
    title: '收款統計表',
    available: true,
    note: '依舊版一個月預覽核對的客戶編號／名稱及實收、貨款、營業稅、折讓欄位，彙總新系統已保存的收款單金額；舊版納入條件及排序仍待核實，僅供唯讀預覽。',
    filters: [
      dateRange('d.receipt_date', '收款日期'),
      codeRange(
        'd.customer_code',
        'customer_from',
        'customer_to',
        '客戶編號',
        'customer',
      ),
    ],
    columns: [
      col('customer_code', '客戶編號'),
      col('customer_name', '客戶名稱'),
      col('received_amount', '實收金額', 'currency'),
      col('merchandise_amount', '貨款', 'currency'),
      col('tax_amount', '營業稅', 'currency'),
      col('discount_amount', '折讓金額', 'currency'),
    ],
    sql: (where) => `SELECT d.customer_code, d.customer_name,
      SUM(d.current_received_units) AS received_amount__units,
      SUM(d.current_merchandise_units) AS merchandise_amount__units,
      SUM(d.current_tax_units) AS tax_amount__units,
      SUM(d.current_discount_units) AS discount_amount__units
      FROM ${T}.receipt_documents d
      WHERE ${where}
      GROUP BY d.customer_code, d.customer_name
      ORDER BY d.customer_code, d.customer_name`,
  },
  ...partnerReports(
    'customer-reports',
    'customer',
    '客戶',
    'customer_from',
    'customer_to',
  ),
  ...partnerReports(
    'supplier-reports',
    'supplier',
    '廠商',
    'supplier_from',
    'supplier_to',
  ),
  {
    key: 'employee-list',
    group: 'employee-reports',
    title: '員工資料表',
    available: true,
    note: '依 2026-10-06 舊版預覽：每人兩行（編號、姓名、身分證號、出生日期、職稱、任職日期／聯絡電話、通訊地址），依編號排序。',
    // 員工改由 public.staff 綁定舊版代碼者提供；身分證號、出生日期、電話、地址不在 staff 表，留白。
    filters: [
      codeRange(
        's.legacy_crm_code COLLATE "C"',
        'employee_from',
        'employee_to',
        '員工編號',
        'employee',
      ),
    ],
    columns: [
      col('code', '編號'),
      col('full_name', '姓名'),
      col('id_number', '身分證號'),
      col('birth_date', '出生日期'),
      col('title', '職稱'),
      col('hire_date', '任職日期'),
      col('phone', '聯絡電話'),
      col('address', '通訊地址'),
    ],
    sql: (
      where,
    ) => `SELECT s.legacy_crm_code AS code, s.name AS full_name, '' AS id_number, '' AS birth_date,
      COALESCE(s.post, '') AS title, s.begain_work::text AS hire_date, NULL AS hire_date_raw,
      '' AS phone, '' AS address
      FROM public.staff s
      WHERE s.legacy_crm_code IS NOT NULL AND ${where}
      ORDER BY s.legacy_crm_code COLLATE "C"`,
  },
  {
    key: 'part-list',
    group: 'part-reports',
    title: '工件基本資料表',
    available: true,
    note: '依 2026-10-06 舊版預覽：電腦圖號、客戶型號、材質、厚度、客戶簡稱、最近交易（該圖號最後一次銷貨日期），依圖號排序。',
    filters: [
      codeRange('p.drawing_no', 'part_from', 'part_to', '品號', 'part'),
      exact(
        'p.customer_code',
        'customer_code',
        '客戶編號',
        '可選擇客戶',
        'customer',
      ),
    ],
    columns: [
      col('drawing_no', '電腦圖號'),
      col('customer_model', '客戶型號'),
      col('material', '材質'),
      col('thickness', '厚度'),
      col('customer_short_name', '客戶'),
      col('latest_sale_date', '最近交易'),
    ],
    sql: (
      where,
    ) => `SELECT p.drawing_no, p.customer_model, p.material, p.thickness,
      COALESCE(c.short_name, '') AS customer_short_name,
      trim(p.cnc3) AS latest_sale_date
      FROM ${T}.parts p LEFT JOIN ${T}.partners c ON c.kind = 'customer' AND c.code = p.customer_code
      WHERE ${where}
      ORDER BY p.drawing_no`,
  },
];

function partnerReports(
  group: string,
  kind: 'customer' | 'supplier',
  label: string,
  from: string,
  to: string,
): ReportDefinition[] {
  const sql = (orderBy: string) => (where: string) =>
    `SELECT p.code, p.short_name, p.full_name, p.responsible, p.tax_id,
      p.phone1, p.fax, p.address, p.shipping_address, p.postal_code,
      ${date('p.latest_transaction_date', 'latest_transaction_date')}
      FROM ${T}.partners p
      WHERE ${where}
      ORDER BY ${orderBy}`;
  const base = {
    group,
    available: true,
    filters: [
      ...(kind === 'customer'
        ? [dateRange('p.latest_transaction_date', '最近交易日期')]
        : []),
      codeRange('p.code', from, to, `${label}編號`, kind),
    ],
    columns: [
      col('code', `${label}編號`),
      col('short_name', '簡稱'),
      col('full_name', '全名'),
      col('responsible', '負責人'),
      col('tax_id', '統一編號'),
      col('phone1', '電話'),
      col('fax', '傳真'),
      col('address', '通訊地址'),
      col('shipping_address', '送貨地址'),
      col('postal_code', '郵遞區號'),
    ],
    sql: sql('p.code'),
    kind,
    note:
      kind === 'customer'
        ? '客戶日期篩選使用新系統已保存的最近交易日期，預設近一個月；這不代表舊版交易日期規則已完全核實。此處是 SQLite 資料預覽，不是列印版面。'
        : '欄位依舊版 XPS 聯絡摘要樣張核對；此處仍是 SQLite 資料預覽，不是列印版面。',
  };
  const labelColumns = [
    col('code', `${label}編號`),
    col('full_name', '名稱'),
    col('postal_code', '郵遞區號'),
    col('address', '地址'),
  ];
  return [
    {
      ...base,
      key: `${kind}-contacts-code`,
      title: `${label}聯絡摘要（編號排序）`,
    },
    {
      ...base,
      key: `${kind}-contacts-postal`,
      title: `${label}聯絡摘要（郵遞區號排序）`,
      sql: sql('p.postal_code, p.code'),
    },
    {
      ...base,
      key: `${kind}-address-labels`,
      title: `${label}地址名條資料預覽`,
      columns: labelColumns,
    },
    {
      ...base,
      key: `${kind}-envelopes`,
      title: `${label}郵寄信封資料預覽`,
      columns: labelColumns,
    },
  ];
}

export const REPORT_BY_KEY = new Map(
  REPORTS.map((report) => [report.key, report]),
);

/** isin_vb6 listReportCatalog：只輸出畫面需要的欄位。 */
export function listReportCatalog(group?: string | null) {
  return REPORTS.filter((report) => !group || report.group === group).map(
    ({
      key,
      group: reportGroup,
      title,
      available,
      note,
      filters,
      columns,
    }) => ({
      key,
      group: reportGroup,
      title,
      available,
      note,
      filters: filters.map(
        ({ type, from, to, key: filterKey, label, placeholder, lookup }) => ({
          type,
          from,
          to,
          key: filterKey,
          label,
          placeholder,
          lookup: lookup || '',
        }),
      ),
      columns,
    }),
  );
}

/**
 * 查詢列轉成 isin_vb6 的輸出形狀（保留欄位順序）：
 * `x__units` → `x`（units / 10,000，null 保留 null）；`x` 與 `x_raw` → 民國字串 `x`（空白為 ''）。
 */
export function finishReportRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('__units')) {
      result[key.slice(0, -'__units'.length)] =
        value == null ? null : Number(value) / 10000;
    } else if (key.endsWith('_raw') && key.slice(0, -4) in row) {
      continue;
    } else if (`${key}_raw` in row) {
      result[key] = displayRocDate(
        value as string | null,
        row[`${key}_raw`] as string | null,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

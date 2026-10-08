import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LegacyRequestContext } from '../common/legacy-access';
import { LegacyDb } from '../common/legacy-db';
import { LegacyNotFoundError } from '../common/legacy-errors';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { displayRocDate, parseRocDate } from '../common/roc-date';
import { recordPrintLog } from '../print-log/record-print-log';
import {
  finishReportRow,
  listReportCatalog,
  REPORT_BY_KEY,
  ReportDefinition,
  ReportFilterDefinition,
} from './report-definitions';

type Row = Record<string, unknown>;
export type ReportFilters = Record<string, unknown>;

export const REPORT_MAX_ROWS = 5000;
const RECEIVABLE_DETAIL_AMOUNTS = [
  'amount',
  'tax',
  'discount',
  'total',
  'received',
  'unpaid',
];
const RECEIVABLE_SUMMARY_AMOUNTS = [
  'previous_unpaid',
  'amount',
  'tax',
  'receivable',
  'received',
  'unpaid',
];
const SUMMARY_REPORTS = new Set([
  'receivable-detail',
  'receivable-summary',
  'sales-journal',
  'sales-work-summary',
  'sales-work-detail',
  'sales-date-summary',
  'sales-customer-summary',
  'sales-date-detail',
  'sales-customer-detail',
]);

/** 報表查詢實際套用的條件（記錄在 print_log.criteria）。 */
export type ReportCriteria = Record<string, string>;

export interface ReportRun {
  result: Row;
  criteria: ReportCriteria;
  rowCount: number;
}

const toUnitsBigInt = (value: unknown) =>
  BigInt(Math.round(Number(value ?? 0) * 10000));
const fromUnitsBigInt = (value: bigint) => Number(value) / 10000;
const toAmount = (units: unknown) => Number(units ?? 0) / 10000;

/** isin_vb6 sumUnits：各欄以 units 加總，避免浮點誤差。 */
function sumUnits(items: Row[], keys: string[]): Record<string, number> {
  const totals = Object.fromEntries(keys.map((key) => [key, 0n])) as Record<
    string,
    bigint
  >;
  for (const item of items) {
    for (const key of keys) totals[key] += toUnitsBigInt(item[key]);
  }
  return Object.fromEntries(
    keys.map((key) => [key, fromUnitsBigInt(totals[key])]),
  );
}

/**
 * 組 WHERE 條件。參數依序編號；日期篩選以民國字串輸入，轉成 ISO 日期與 `date` 欄比較。
 * 空白日期（NULL 且無原字串）視為最早的日期，與 isin_vb6 靠右對齊字串比較相同：
 * 不在「起」之後，但在「迄」之前。
 */
class Conditions {
  readonly where: string[] = [];
  readonly values: unknown[] = [];
  readonly criteria: ReportCriteria = {};

  param(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  dateCompare(column: string, operator: '>=' | '<=' | '<', isoDate: string) {
    const placeholder = this.param(isoDate);
    this.where.push(
      operator === '>='
        ? `${column} >= ${placeholder}`
        : `(${column} ${operator} ${placeholder} OR (${column} IS NULL AND ${column}_raw IS NULL))`,
    );
  }

  get sql(): string {
    return this.where.length ? this.where.join(' AND ') : 'TRUE';
  }
}

function filterText(filters: ReportFilters, key: string, max: number): string {
  const raw = filters[key];
  const value = String(
    (Array.isArray(raw) ? raw[raw.length - 1] : raw) ?? '',
  ).trim();
  if (value.length > max)
    throw new LegacyValidationError(`篩選條件不得超過 ${max} 個字元`);
  return value;
}

/** 民國日期篩選；isin_vb6 直接比較文字，這裡無法解析的日期回 400。 */
function filterDate(value: string, label: string): string {
  const date = parseRocDate(value);
  if (!date)
    throw new LegacyValidationError(
      `${label}「${value}」不是有效日期，請輸入民國年.月.日（例：115.01.31）`,
    );
  return date;
}

function applyFilters(
  report: ReportDefinition,
  filters: ReportFilters,
  conditions: Conditions,
) {
  for (const filter of report.filters) {
    if (filter.type === 'range') applyRange(filter, filters, conditions);
    else {
      const key = filter.key as string;
      const value = filterText(filters, key, 50);
      if (value) {
        conditions.where.push(`${filter.column} = ${conditions.param(value)}`);
        conditions.criteria[key] = value;
      }
    }
  }
}

function applyRange(
  filter: ReportFilterDefinition,
  filters: ReportFilters,
  conditions: Conditions,
) {
  for (const [key, operator] of [
    [filter.from as string, '>='],
    [filter.to as string, '<='],
  ] as const) {
    const value = filterText(filters, key, 20);
    if (!value) continue;
    if (filter.legacyDate) {
      conditions.dateCompare(
        filter.column,
        operator,
        filterDate(value, filter.label),
      );
    } else {
      conditions.where.push(
        `${filter.column} ${operator} ${conditions.param(value)}`,
      );
    }
    conditions.criteria[key] = value;
  }
}

@Injectable()
export class LegacyReportsService {
  constructor(private readonly dataSource: DataSource) {}

  catalog(group?: string | null) {
    return listReportCatalog(group);
  }

  /** 報表預覽並記錄 print_log（kind = report_query）。 */
  async preview(
    reportKey: string,
    filters: ReportFilters,
    context: LegacyRequestContext,
  ): Promise<Row> {
    const { result, criteria, rowCount } = await this.execute(
      reportKey,
      filters,
    );
    await recordPrintLog(this.dataSource.manager, context, {
      kind: 'report_query',
      target: reportKey,
      criteria,
      rowCount,
      pageCount: null,
    });
    return result;
  }

  /** 與 isin_vb6 runReport 相同的回傳（不記錄）。 */
  async run(reportKey: string, filters: ReportFilters = {}): Promise<Row> {
    return (await this.execute(reportKey, filters)).result;
  }

  async execute(
    reportKey: string,
    filters: ReportFilters = {},
  ): Promise<ReportRun> {
    const report = REPORT_BY_KEY.get(reportKey);
    if (!report) throw new LegacyNotFoundError('找不到報表');
    if (!report.available)
      throw new ConflictException('此報表的資料規則尚未核實');
    const db = new LegacyDb(this.dataSource.manager);

    if (report.invoice) {
      const { pages, count, truncated, period, criteria, sales } =
        await this.invoicePages(db, filters, report.invoice);
      return {
        result: {
          reportKey,
          items: [],
          columns: [],
          limit: REPORT_MAX_ROWS,
          pages,
          count,
          truncated,
          period,
        },
        criteria,
        rowCount: sales,
      };
    }

    // isin_vb6：只印表頭的報表不檢查篩選條件，直接回傳空結果。
    if (report.empty) {
      const criteria: ReportCriteria = {};
      for (const filter of report.filters) {
        for (const key of [filter.from, filter.to, filter.key]) {
          const raw = key ? filters[key] : undefined;
          const value = String(
            (Array.isArray(raw) ? raw[raw.length - 1] : raw) ?? '',
          ).trim();
          if (key && value) criteria[key] = value.slice(0, 50);
        }
      }
      return {
        result: {
          reportKey,
          items: [],
          count: 0,
          limit: REPORT_MAX_ROWS,
          truncated: false,
          columns: report.columns,
        },
        criteria,
        rowCount: 0,
      };
    }
    const conditions = new Conditions();
    applyFilters(report, filters, conditions);
    if (report.kind)
      conditions.where.push(`p.kind = ${conditions.param(report.kind)}`);

    const sql = `${(report.sql as (where: string) => string)(conditions.sql)} LIMIT ${REPORT_MAX_ROWS + 1}`;
    const rows = (await db.all(sql, conditions.values)).map((row) => {
      const finished = finishReportRow(row);
      return report.map ? report.map(finished) : finished;
    });
    const truncated = rows.length > REPORT_MAX_ROWS;
    const sliced = rows.slice(0, REPORT_MAX_ROWS);
    const items =
      reportKey === 'receivable-summary'
        ? await this.receivableSummaryItems(db, sliced, conditions)
        : sliced;
    const summary = truncated ? null : reportSummary(reportKey, items);
    return {
      result: {
        reportKey,
        items,
        count: items.length,
        limit: REPORT_MAX_ROWS,
        truncated,
        columns: report.columns,
        ...(SUMMARY_REPORTS.has(reportKey) ? { summary } : {}),
      },
      criteria: conditions.criteria,
      rowCount: items.length,
    };
  }

  /**
   * 應收帳款總表：期間內有銷貨的客戶加上開始日期前的未收（前期未收），
   * 再列出期間內沒有銷貨、但開始日期前仍有未收的客戶。
   */
  private async receivableSummaryItems(
    db: LegacyDb,
    rows: Row[],
    applied: Conditions,
  ) {
    const dateFrom = applied.criteria.date_from ?? '';
    const customerFrom = applied.criteria.customer_from ?? '';
    const customerTo = applied.criteria.customer_to ?? '';
    const previous = new Map<string, number>();
    const earlierOnly: Row[] = [];
    if (dateFrom) {
      const conditions = new Conditions();
      conditions.where.push('total_units > received_units');
      conditions.dateCompare(
        'sale_date',
        '<',
        filterDate(dateFrom, '出貨日期'),
      );
      if (customerFrom)
        conditions.where.push(
          `customer_code >= ${conditions.param(customerFrom)}`,
        );
      if (customerTo)
        conditions.where.push(
          `customer_code <= ${conditions.param(customerTo)}`,
        );
      const balances = await db.all<{
        customer_code: string;
        customer_name: string;
        units: string;
      }>(
        `SELECT customer_code, MIN(customer_name) AS customer_name, SUM(total_units - received_units) AS units
         FROM legacy_crm.sales_documents WHERE ${conditions.sql}
         GROUP BY customer_code ORDER BY customer_code`,
        conditions.values,
      );
      const listed = new Set(rows.map((row) => row.customer_code));
      for (const balance of balances) {
        previous.set(balance.customer_code, Number(balance.units));
        if (!listed.has(balance.customer_code)) {
          earlierOnly.push({
            customer_code: balance.customer_code,
            customer_name: balance.customer_name,
            amount_units: 0,
            tax_units: 0,
            total_units: 0,
            received_units: 0,
          });
        }
      }
    }
    return [...rows, ...earlierOnly].map((row) => {
      const previousUnits = previous.get(row.customer_code as string) ?? 0;
      const totalUnits = Number(row.total_units);
      const receivedUnits = Number(row.received_units);
      const receivableUnits = previousUnits + totalUnits;
      return {
        customer_code: row.customer_code,
        customer_name: row.customer_name,
        previous_unpaid: previousUnits / 10000,
        amount: Number(row.amount_units) / 10000,
        tax: Number(row.tax_units) / 10000,
        receivable: receivableUnits / 10000,
        received: receivedUnits / 10000,
        unpaid: (receivableUnits - receivedUnits) / 10000,
      };
    });
  }

  /**
   * 請款單：每位客戶一頁，只列期間內未收的銷貨；再加前期未收（開始日期前的未收）、
   * 減最後一張收款的本期預收。
   */
  private async invoicePages(
    db: LegacyDb,
    filters: ReportFilters,
    { withItems }: { withItems: boolean },
  ) {
    const dateFrom = filterText(filters, 'date_from', 20);
    const dateTo = filterText(filters, 'date_to', 20);
    const customerFrom = filterText(filters, 'customer_from', 20);
    const customerTo = filterText(filters, 'customer_to', 20);
    const conditions = new Conditions();
    conditions.where.push('d.total_units > d.received_units');
    const isoFrom = dateFrom ? filterDate(dateFrom, '請款期間') : '';
    if (dateFrom) conditions.dateCompare('d.sale_date', '>=', isoFrom);
    if (dateTo)
      conditions.dateCompare(
        'd.sale_date',
        '<=',
        filterDate(dateTo, '請款期間'),
      );
    if (customerFrom)
      conditions.where.push(
        `d.customer_code >= ${conditions.param(customerFrom)}`,
      );
    if (customerTo)
      conditions.where.push(
        `d.customer_code <= ${conditions.param(customerTo)}`,
      );
    const criteria: ReportCriteria = Object.fromEntries(
      Object.entries({
        date_from: dateFrom,
        date_to: dateTo,
        customer_from: customerFrom,
        customer_to: customerTo,
      }).filter(([, value]) => value),
    );

    const sales = await db.all(
      `SELECT d.sale_no, d.sale_date::text AS sale_date, d.sale_date_raw, d.customer_code, d.customer_name,
         d.invoice_number, d.amount_units, d.tax_units, d.discount_units, d.total_units, d.received_units
       FROM legacy_crm.sales_documents d WHERE ${conditions.sql}
       ORDER BY d.customer_code, d.sale_date NULLS FIRST, d.sale_no LIMIT ${REPORT_MAX_ROWS + 1}`,
      conditions.values,
    );
    const truncated = sales.length > REPORT_MAX_ROWS;
    const listed = sales.slice(0, REPORT_MAX_ROWS);

    const customers = new Map<string, Row[]>();
    for (const sale of listed) {
      const code = sale.customer_code as string;
      if (!customers.has(code)) customers.set(code, []);
      customers.get(code)?.push(sale);
    }
    const codes = [...customers.keys()];
    const partners = new Map(
      (
        await db.all(
          `SELECT code, full_name, address, tax_id, phone1 FROM legacy_crm.partners
           WHERE kind = 'customer' AND code = ANY($1)`,
          [codes],
        )
      ).map((row) => [row.code as string, row]),
    );
    const previous = new Map<string, number>();
    if (isoFrom) {
      const earlier = new Conditions();
      earlier.where.push(
        `customer_code = ANY(${earlier.param(codes)})`,
        'total_units > received_units',
      );
      earlier.dateCompare('sale_date', '<', isoFrom);
      for (const row of await db.all(
        `SELECT customer_code, SUM(total_units - received_units) AS units FROM legacy_crm.sales_documents
         WHERE ${earlier.sql} GROUP BY customer_code`,
        earlier.values,
      )) {
        previous.set(row.customer_code as string, Number(row.units));
      }
    }
    // isin_vb6：ORDER BY 收款日期 DESC, 收款單號 DESC 取第一張；空白日期最舊。
    const advances = new Map(
      (
        await db.all(
          `SELECT DISTINCT ON (customer_code) customer_code, current_advance_units AS units
           FROM legacy_crm.receipt_documents WHERE customer_code = ANY($1)
           ORDER BY customer_code, receipt_date DESC NULLS LAST, receipt_no DESC`,
          [codes],
        )
      ).map((row) => [row.customer_code as string, Number(row.units)]),
    );
    const items = new Map<string, Row[]>();
    if (withItems && listed.length) {
      for (const row of await db.all(
        `SELECT sale_no, drawing_no, material, thickness, outsource,
           quantity_units, unit_price_units, line_total_units
         FROM legacy_crm.sales_items WHERE sale_no = ANY($1) ORDER BY sale_no, line_no`,
        [listed.map((sale) => sale.sale_no)],
      )) {
        const saleNo = row.sale_no as string;
        if (!items.has(saleNo)) items.set(saleNo, []);
        items.get(saleNo)?.push({
          drawing_no: row.drawing_no,
          material: row.material,
          thickness: row.thickness,
          outsource: row.outsource,
          quantity: toAmount(row.quantity_units),
          unit_price: toAmount(row.unit_price_units),
          amount: toAmount(row.line_total_units),
        });
      }
    }

    const pages = [...customers].map(([code, customerSales]) => {
      const info = partners.get(code);
      const sum = (field: string) =>
        customerSales.reduce((total, sale) => total + Number(sale[field]), 0);
      const unpaidUnits = sum('total_units') - sum('received_units');
      const previousUnits = previous.get(code) ?? 0;
      const advanceUnits = advances.get(code) ?? 0;
      return {
        customer: {
          code,
          name: (info?.full_name as string) || customerSales[0].customer_name,
          address: info?.address ?? '',
          tax_id: info?.tax_id ?? '',
          phone: info?.phone1 ?? '',
        },
        sales: customerSales.map((sale) => ({
          sale_date: displayRocDate(
            sale.sale_date as string | null,
            sale.sale_date_raw as string | null,
          ),
          sale_no: sale.sale_no,
          invoice_number: sale.invoice_number,
          amount: toAmount(sale.amount_units),
          tax: toAmount(sale.tax_units),
          received: toAmount(sale.received_units),
          unpaid: toAmount(
            Number(sale.total_units) - Number(sale.received_units),
          ),
          ...(withItems
            ? { items: items.get(sale.sale_no as string) ?? [] }
            : {}),
        })),
        totals: {
          amount: toAmount(sum('amount_units')),
          tax: toAmount(sum('tax_units')),
          received: toAmount(sum('received_units')),
          unpaid: toAmount(unpaidUnits),
          previous_unpaid: toAmount(previousUnits),
          advance: toAmount(advanceUnits),
          receivable: toAmount(unpaidUnits + previousUnits - advanceUnits),
        },
      };
    });
    return {
      pages,
      count: pages.length,
      truncated,
      period: { from: dateFrom, to: dateTo },
      criteria,
      sales: listed.length,
    };
  }
}

/** isin_vb6 runReport 的 summary（只在未截斷時計算）。 */
function reportSummary(reportKey: string, items: Row[]): Row | null {
  let summary: Row | null = null;
  const total = (key: string) =>
    fromUnitsBigInt(
      items.reduce((sum, item) => sum + toUnitsBigInt(item[key]), 0n),
    );
  if (reportKey === 'receivable-detail') {
    const customers = new Map<unknown, Row[]>();
    for (const item of items) {
      if (!customers.has(item.customer_code))
        customers.set(item.customer_code, []);
      customers.get(item.customer_code)?.push(item);
    }
    summary = {
      ...sumUnits(items, RECEIVABLE_DETAIL_AMOUNTS),
      byCustomer: [...customers].map(([code, customerItems]) => ({
        code,
        ...sumUnits(customerItems, RECEIVABLE_DETAIL_AMOUNTS),
      })),
    };
  } else if (reportKey === 'receivable-summary') {
    summary = sumUnits(items, RECEIVABLE_SUMMARY_AMOUNTS);
  } else if (reportKey === 'sales-journal') {
    summary = Object.fromEntries(
      ['line_total', 'tax_amount', 'total_amount', 'received_amount'].map(
        (key) => [key, total(key)],
      ),
    );
  } else if (
    reportKey === 'sales-work-summary' ||
    reportKey === 'sales-date-summary' ||
    reportKey === 'sales-work-detail'
  ) {
    summary = { quantity: total('quantity'), amount: total('amount') };
  } else if (
    reportKey === 'sales-customer-summary' ||
    reportKey === 'sales-customer-detail'
  ) {
    summary = { byCustomer: [] };
  } else if (reportKey === 'sales-date-detail') {
    summary = { amount: total('amount') };
  }
  if (
    (reportKey === 'sales-date-summary' || reportKey === 'sales-date-detail') &&
    summary
  ) {
    const dailyTotals = new Map<
      unknown,
      { quantity: bigint; amount: bigint }
    >();
    for (const item of items) {
      const current = dailyTotals.get(item.sale_date) || {
        quantity: 0n,
        amount: 0n,
      };
      if (reportKey === 'sales-date-summary')
        current.quantity += toUnitsBigInt(item.quantity);
      current.amount += toUnitsBigInt(item.amount);
      dailyTotals.set(item.sale_date, current);
    }
    summary.byDate = [...dailyTotals].map(([date, totals]) =>
      reportKey === 'sales-date-detail'
        ? { date, amount: fromUnitsBigInt(totals.amount) }
        : {
            date,
            quantity: fromUnitsBigInt(totals.quantity),
            amount: fromUnitsBigInt(totals.amount),
          },
    );
  }
  if (
    (reportKey === 'sales-customer-summary' ||
      reportKey === 'sales-customer-detail') &&
    summary
  ) {
    const customerTotals = new Map<
      string,
      { code: unknown; name: unknown; amount: bigint }
    >();
    for (const item of items) {
      const key = JSON.stringify([item.customer_code, item.customer_name]);
      const current = customerTotals.get(key) || {
        code: item.customer_code,
        name: item.customer_name,
        amount: 0n,
      };
      current.amount += toUnitsBigInt(item.amount);
      customerTotals.set(key, current);
    }
    summary.byCustomer = [...customerTotals.values()].map((customer) => ({
      code: customer.code,
      name: customer.name,
      amount: fromUnitsBigInt(customer.amount),
    }));
  }
  return summary;
}

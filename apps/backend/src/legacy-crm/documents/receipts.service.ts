import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LegacyRequestContext } from '../common/legacy-access';
import {
  columns,
  containsPattern,
  LegacyDb,
  present,
  units,
} from '../common/legacy-db';
import { LegacyNotFoundError, rethrowUnique } from '../common/legacy-errors';
import { normalizeReceipt, Row } from '../common/legacy-records';
import { parseRocDate } from '../common/roc-date';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { LegacyWriteLogService } from '../write-log/write-log.service';
import {
  documentKey,
  insertLines,
  insertRow,
  rocText,
  updateRow,
  withRaw,
} from './document-sql';

const TOTALS = [
  'current_received',
  'current_merchandise',
  'current_tax',
  'current_discount',
  'previous_advance',
  'previous_unpaid',
  'current_advance',
  'current_unpaid',
];
const HEADER = withRaw(
  [
    'receipt_date',
    'closing_date',
    'customer_code',
    'customer_name',
    'actor_no',
    'actor_name',
    ...TOTALS.map((field) => `${field}_units`),
  ],
  ['receipt_date', 'closing_date'],
);
const PAYMENT = withRaw(
  [
    'receipt_no',
    'line_no',
    'category',
    'amount_units',
    'check_number',
    'check_date',
    'bank_account',
    'collect_agent',
    'bank_short_name',
    'note',
  ],
  ['check_date'],
);
const ALLOCATION_AMOUNTS = [
  'merchandise',
  'tax',
  'discount',
  'receivable',
  'unpaid',
  'offset',
  'previously_offset',
];
const ALLOCATION = [
  'receipt_no',
  'line_no',
  'sale_no',
  ...ALLOCATION_AMOUNTS.map((field) => `${field}_units`),
];

function receiptFromRow(row: Row | null) {
  if (!row) return null;
  const receipt = present('receipt_documents', row);
  const result: Row = {
    receipt_no: receipt.receipt_no,
    receipt_date: receipt.receipt_date,
    closing_date: receipt.closing_date,
    customer_code: receipt.customer_code,
    customer_name: receipt.customer_name,
    actor_no: receipt.actor_no,
    actor_name: receipt.actor_name,
    created_at: receipt.created_at,
    updated_at: receipt.updated_at,
    ...(receipt.payment_count == null
      ? {}
      : { payment_count: Number(receipt.payment_count) }),
    ...(receipt.allocation_count == null
      ? {}
      : { allocation_count: Number(receipt.allocation_count) }),
  };
  for (const field of TOTALS) result[field] = units(receipt[`${field}_units`]);
  return result;
}

function offsetsBySale(allocations: Row[]) {
  const offsets = new Map<string, number>();
  for (const item of allocations) {
    const offset = Number(item.offset_units);
    if (!item.sale_no || !offset) continue;
    offsets.set(
      item.sale_no as string,
      (offsets.get(item.sale_no as string) ?? 0) + offset,
    );
  }
  return offsets;
}

async function storedOffsets(db: LegacyDb, receiptNo: string) {
  return offsetsBySale(
    await db.all(
      'SELECT sale_no, offset_units FROM legacy_crm.receipt_allocation_lines WHERE receipt_no = $1',
      [receiptNo],
    ),
  );
}

/**
 * 收款存檔讓各出貨的已收金額跟著沖帳金額走；只套用新舊沖帳的差額，移轉來的已收金額維持原值。
 * 與舊版相同（2026-10-07 讀程式）：沖回後小於零、或已收超過應收時，出貨改回未收；客戶應收餘額（cust.debt）扣掉沖帳金額。
 */
async function settleSales(
  db: LegacyDb,
  previous: Map<string, number>,
  next: Map<string, number>,
  customerCode = '',
) {
  let offsetUnits = 0;
  const sales: unknown[] = [];
  for (const saleNo of new Set([...previous.keys(), ...next.keys()])) {
    const delta = (next.get(saleNo) ?? 0) - (previous.get(saleNo) ?? 0);
    if (delta === 0) continue;
    offsetUnits += delta;
    const sale = await db.get<{ received_units: string; total_units: string }>(
      'SELECT received_units, total_units FROM legacy_crm.sales_documents WHERE sale_no = $1',
      [saleNo],
    );
    if (!sale) continue;
    const from = Number(sale.received_units);
    let received = from + delta;
    if (received < 0 || received > Number(sale.total_units))
      received = delta < 0 ? 0 : received;
    await db.run(
      'UPDATE legacy_crm.sales_documents SET received_units = $1, updated_at = now() WHERE sale_no = $2',
      [received, saleNo],
    );
    sales.push({ sale_no: saleNo, received_units: { from, to: received } });
  }
  const code = String(customerCode ?? '').trim();
  let balance: { customer_code: string; balance_units_delta: number } | null =
    null;
  if (code && offsetUnits) {
    const count = await db.run(
      `UPDATE legacy_crm.partners SET balance_units = balance_units - $1, updated_at = now()
       WHERE kind = 'customer' AND code = $2`,
      [offsetUnits, code],
    );
    if (count)
      balance = { customer_code: code, balance_units_delta: -offsetUnits };
  }
  return { sales, balance };
}

/** 新收款把沖帳列的折讓寫到還沒收過款的出貨：出貨的折讓與應收跟著改（舊版 FGotten）。 */
async function fileDiscounts(db: LegacyDb, allocations: Row[]) {
  const filed: unknown[] = [];
  for (const item of allocations) {
    if (
      !item.sale_no ||
      !(Number(item.offset_units) > 0) ||
      !Number(item.discount_units)
    )
      continue;
    const sale = await db.get<{
      amount_units: string;
      tax_units: string;
      received_units: string;
    }>(
      'SELECT amount_units, tax_units, received_units FROM legacy_crm.sales_documents WHERE sale_no = $1',
      [item.sale_no],
    );
    if (!sale || Number(sale.received_units) !== 0) continue;
    const total =
      Number(sale.amount_units) +
      Number(sale.tax_units) -
      Number(item.discount_units);
    await db.run(
      'UPDATE legacy_crm.sales_documents SET discount_units = $1, total_units = $2, updated_at = now() WHERE sale_no = $3',
      [item.discount_units, total, item.sale_no],
    );
    filed.push({
      sale_no: item.sale_no,
      discount_units: item.discount_units,
      total_units: total,
    });
  }
  return filed;
}

function bounded(
  label: string,
  value: unknown,
  limit: number,
  required = false,
) {
  const text = value == null ? '' : String(value).trim();
  if (required && !text) throw new LegacyValidationError(`${label}不可空白`);
  if (Array.from(text).length > limit)
    throw new LegacyValidationError(`${label}最多 ${limit} 個字元`);
  return text;
}

/** 收款登錄。 */
@Injectable()
export class LegacyReceiptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  async get(receiptNo: string, db = new LegacyDb(this.dataSource.manager)) {
    const row = await db.get(
      `SELECT ${columns('receipt_documents')} FROM legacy_crm.receipt_documents WHERE receipt_no = $1`,
      [String(receiptNo)],
    );
    if (!row) return null;
    const receipt = receiptFromRow(row) as Row & {
      receipt_no: string;
      customer_code: string;
    };
    const payments = await db.all(
      `SELECT ${columns(
        'receipt_payment_lines',
        '',
        PAYMENT.filter((name) => name !== 'receipt_no'),
      )}
       FROM legacy_crm.receipt_payment_lines WHERE receipt_no = $1 ORDER BY line_no`,
      [receipt.receipt_no],
    );
    const allocations = await db.all(
      `SELECT ${ALLOCATION.filter((name) => name !== 'receipt_no').join(', ')}
       FROM legacy_crm.receipt_allocation_lines WHERE receipt_no = $1 ORDER BY line_no`,
      [receipt.receipt_no],
    );
    return {
      ...receipt,
      payments: payments.map((row) => {
        const {
          line_no,
          category,
          amount_units,
          check_number,
          check_date,
          bank_account,
          collect_agent,
          bank_short_name,
          note,
        } = present('receipt_payment_lines', row);
        return {
          line_no,
          category,
          amount: units(amount_units),
          check_number,
          check_date,
          bank_account,
          collect_agent,
          bank_short_name,
          note,
        };
      }),
      allocations: allocations.map((row) => ({
        line_no: row.line_no,
        sale_no: row.sale_no,
        ...Object.fromEntries(
          ALLOCATION_AMOUNTS.map((field) => [
            field,
            units(row[`${field}_units`]),
          ]),
        ),
      })),
    };
  }

  async list(search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const select = `SELECT ${columns('receipt_documents', 'd')}, COUNT(DISTINCT p.line_no) AS payment_count,
        COUNT(DISTINCT a.line_no) AS allocation_count
      FROM legacy_crm.receipt_documents AS d
      LEFT JOIN legacy_crm.receipt_payment_lines AS p ON p.receipt_no = d.receipt_no
      LEFT JOIN legacy_crm.receipt_allocation_lines AS a ON a.receipt_no = d.receipt_no`;
    const order =
      'GROUP BY d.receipt_no ORDER BY d.receipt_date DESC NULLS LAST, d.receipt_no LIMIT 500';
    const rows = term
      ? await db.all(
          `${select}
           WHERE (d.receipt_no ILIKE $1 ESCAPE '!' OR ${rocText('d.receipt_date')} ILIKE $1 ESCAPE '!'
             OR d.customer_code ILIKE $1 ESCAPE '!' OR d.customer_name ILIKE $1 ESCAPE '!'
             OR d.actor_no ILIKE $1 ESCAPE '!' OR d.actor_name ILIKE $1 ESCAPE '!'
             OR a.sale_no ILIKE $1 ESCAPE '!')
           ${order}`,
          [containsPattern(term)],
        )
      : await db.all(`${select} ${order}`);
    return rows.map(receiptFromRow);
  }

  /**
   * 沖帳明細候選：客戶在帳款結日（含）以前、還有未收的出貨，依日期與單號排序；
   * 前期預收取該客戶單號最大的收款的本期預收。修改收款時把本張已沖的金額加回。
   */
  async candidates({
    customerCode = '',
    closingDate = '',
    receiptNo = '',
  } = {}) {
    const db = new LegacyDb(this.dataSource.manager);
    const customer = bounded('客戶編號', customerCode, 10, true);
    const closingText = bounded('帳款結日', closingDate, 10);
    const ownReceipt = bounded('單據編號', receiptNo, 10);
    const closing = closingText ? parseRocDate(closingText) : null;
    if (closingText && !closing)
      throw new LegacyValidationError('帳款結日不是有效日期');
    const own = ownReceipt
      ? await storedOffsets(db, ownReceipt)
      : new Map<string, number>();
    const previous = await db.get<{ current_advance_units: string }>(
      `SELECT current_advance_units FROM legacy_crm.receipt_documents
       WHERE customer_code = $1 AND receipt_no <> $2 ORDER BY receipt_no DESC LIMIT 1`,
      [customer, ownReceipt],
    );
    const sales = await db.all<Record<string, string>>(
      `SELECT sale_no, amount_units, tax_units, discount_units, total_units, received_units
       FROM legacy_crm.sales_documents
       WHERE customer_code = $1 AND ($2::date IS NULL OR sale_date IS NULL OR sale_date <= $2::date)
       ORDER BY sale_date NULLS FIRST, sale_no`,
      [customer, closing],
    );
    const allocations: unknown[] = [];
    for (const sale of sales) {
      const unpaid =
        Number(sale.total_units) -
        Number(sale.received_units) +
        (own.get(sale.sale_no) ?? 0);
      if (unpaid <= 0) continue;
      allocations.push({
        sale_no: sale.sale_no,
        merchandise: units(sale.amount_units),
        tax: units(sale.tax_units),
        discount: units(sale.discount_units),
        receivable: units(sale.total_units),
        unpaid: unpaid / 10000,
      });
    }
    return {
      previous_advance: units(previous?.current_advance_units),
      allocations,
    };
  }

  private async replaceLines(
    db: LegacyDb,
    receipt: ReturnType<typeof normalizeReceipt>,
  ) {
    await db.run(
      'DELETE FROM legacy_crm.receipt_payment_lines WHERE receipt_no = $1',
      [receipt.key],
    );
    await db.run(
      'DELETE FROM legacy_crm.receipt_allocation_lines WHERE receipt_no = $1',
      [receipt.key],
    );
    await insertLines(
      db,
      'receipt_payment_lines',
      receipt.lines.payments,
      PAYMENT,
    );
    await insertLines(
      db,
      'receipt_allocation_lines',
      receipt.lines.allocations,
      ALLOCATION,
    );
  }

  async create(input: unknown, context: LegacyRequestContext) {
    const receipt = normalizeReceipt(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await insertRow(db, 'receipt_documents', receipt.header, [
        'receipt_no',
        ...HEADER,
      ]).catch((error) => rethrowUnique(error, '已有相同收款單號'));
      await this.replaceLines(db, receipt);
      const discounts = await fileDiscounts(db, receipt.lines.allocations);
      const settled = await settleSales(
        db,
        new Map(),
        offsetsBySale(receipt.lines.allocations),
        receipt.header.customer_code as string,
      );
      const after = await this.get(receipt.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'receipt_document',
        entityKey: receipt.key,
        action: 'create',
        after,
        sideEffects: { discounts, ...settled },
      });
      return after;
    });
  }

  async update(
    receiptNo: string,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const receipt = normalizeReceipt({
      ...(input as object),
      receipt_no: receiptNo,
    });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(receipt.key, db);
      const previous = await storedOffsets(db, receipt.key);
      if (
        (await updateRow(
          db,
          'receipt_documents',
          receipt.header,
          HEADER,
          'receipt_no',
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.replaceLines(db, receipt);
      const settled = await settleSales(
        db,
        previous,
        offsetsBySale(receipt.lines.allocations),
        receipt.header.customer_code as string,
      );
      const after = await this.get(receipt.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'receipt_document',
        entityKey: receipt.key,
        action: 'update',
        before,
        after,
        sideEffects: settled,
      });
      return after;
    });
  }

  async remove(receiptNo: string, context: LegacyRequestContext) {
    const key = documentKey('單據編號', receiptNo);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(key, db);
      const settled = await settleSales(
        db,
        await storedOffsets(db, key),
        new Map(),
        (before?.customer_code as string) ?? '',
      );
      if (
        (await db.run(
          'DELETE FROM legacy_crm.receipt_documents WHERE receipt_no = $1',
          [key],
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.writeLog.record(manager, context, {
        entityType: 'receipt_document',
        entityKey: key,
        action: 'delete',
        before,
        sideEffects: settled,
      });
    });
  }
}

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
import {
  NormalizedDocument,
  normalizeSale,
  Row,
} from '../common/legacy-records';
import { LegacyWriteLogService } from '../write-log/write-log.service';
import {
  documentKey,
  insertLines,
  insertRow,
  rocText,
  updateRow,
  withRaw,
} from './document-sql';
import { refreshOrderClosed } from './orders.service';

const HEADER = withRaw(
  [
    'sale_date',
    'legacy_date_e',
    'customer_code',
    'customer_name',
    'actor_no',
    'actor_name',
    'linked_order_no',
    'payment_method',
    'delivery_method',
    'invoice_number',
    'shipping_address',
    'note',
    'amount_units',
    'tax_mode',
    'tax_units',
    'discount_units',
    'total_units',
    'received_units',
  ],
  ['sale_date', 'legacy_date_e'],
);
const ITEM = withRaw(
  [
    'sale_no',
    'line_no',
    'legacy_sn',
    'legacy_date_r',
    'legacy_factor_no',
    'legacy_factor',
    'drawing_no',
    'customer_model',
    'material',
    'thickness',
    'outsource',
    'quantity_units',
    'unit',
    'unit_price_units',
    'line_total_units',
  ],
  ['legacy_date_r'],
);

export function saleFromRow(row: Row | null) {
  if (!row) return null;
  const sale = present('sales_documents', row);
  return {
    sale_no: sale.sale_no,
    sale_date: sale.sale_date,
    legacy_date_e: sale.legacy_date_e,
    customer_code: sale.customer_code,
    customer_name: sale.customer_name,
    actor_no: sale.actor_no,
    actor_name: sale.actor_name,
    linked_order_no: sale.linked_order_no,
    payment_method: sale.payment_method,
    delivery_method: sale.delivery_method,
    invoice_number: sale.invoice_number,
    shipping_address: sale.shipping_address,
    note: sale.note,
    amount: units(sale.amount_units),
    tax_mode: sale.tax_mode,
    tax_amount: units(sale.tax_units),
    discount_amount: units(sale.discount_units),
    total_amount: units(sale.total_units),
    received_amount: units(sale.received_units),
    created_at: sale.created_at,
    updated_at: sale.updated_at,
    ...(sale.item_count == null ? {} : { item_count: Number(sale.item_count) }),
  };
}

const SEPARATOR = '\u001f';

/**
 * 出貨數（訂單明細 SOOK）：連結訂單、同圖號的出貨數量合計。出貨存檔或刪除時只依差額調整訂單明細，
 * 從舊資料移轉來的出貨數維持原值。
 */
async function saleShipments(db: LegacyDb, saleNo: string) {
  const rows = await db.all<{
    order_no: string;
    drawing_no: string;
    units: string;
  }>(
    `SELECT btrim(d.linked_order_no) AS order_no, btrim(i.drawing_no) AS drawing_no, SUM(i.quantity_units) AS units
     FROM legacy_crm.sales_documents d JOIN legacy_crm.sales_items i ON i.sale_no = d.sale_no
     WHERE d.sale_no = $1 AND btrim(d.linked_order_no) <> '' AND btrim(i.drawing_no) <> ''
     GROUP BY 1, 2`,
    [saleNo],
  );
  return new Map(
    rows.map((row) => [
      `${row.order_no}${SEPARATOR}${row.drawing_no}`,
      Number(row.units),
    ]),
  );
}

/**
 * 一個圖號的出貨數變動攤到訂單各列：增加時依項次逐列補到訂購量（多出的放最後一列）；
 * 減少時從最後一列扣起，不低於 0。
 */
async function shipOrderDrawing(
  db: LegacyDb,
  orderNo: string,
  drawingNo: string,
  deltaUnits: number,
) {
  const lines = await db.all<{
    line_no: number;
    quantity_units: string;
    shipped_quantity_units: string;
  }>(
    `SELECT line_no, quantity_units, shipped_quantity_units FROM legacy_crm.order_items
     WHERE order_no = $1 AND btrim(drawing_no) = $2 ORDER BY line_no`,
    [orderNo, drawingNo],
  );
  if (!lines.length) return null;
  let remaining = Math.abs(deltaUnits);
  const ordered = deltaUnits > 0 ? lines : [...lines].reverse();
  const next = new Map<number, number>();
  ordered.forEach((line, index) => {
    const shipped = Number(line.shipped_quantity_units);
    const take =
      deltaUnits > 0
        ? index === ordered.length - 1
          ? remaining
          : Math.min(
              remaining,
              Math.max(0, Number(line.quantity_units) - shipped),
            )
        : Math.min(remaining, shipped);
    remaining -= take;
    next.set(line.line_no, deltaUnits > 0 ? shipped + take : shipped - take);
  });
  const changes: { line_no: number; from: number; to: number }[] = [];
  for (const line of lines) {
    const value = next.get(line.line_no) as number;
    if (value !== Number(line.shipped_quantity_units)) {
      await db.run(
        'UPDATE legacy_crm.order_items SET shipped_quantity_units = $1 WHERE order_no = $2 AND line_no = $3',
        [value, orderNo, line.line_no],
      );
      changes.push({
        line_no: line.line_no,
        from: Number(line.shipped_quantity_units),
        to: value,
      });
    }
  }
  return changes;
}

async function applyShipmentChange(
  db: LegacyDb,
  before: Map<string, number>,
  after: Map<string, number>,
) {
  const touched = new Set<string>();
  const effects: unknown[] = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const delta = (after.get(key) ?? 0) - (before.get(key) ?? 0);
    if (!delta) continue;
    const [orderNo, drawingNo] = key.split(SEPARATOR);
    const changes = await shipOrderDrawing(db, orderNo, drawingNo, delta);
    if (changes) {
      touched.add(orderNo);
      effects.push({
        order_no: orderNo,
        drawing_no: drawingNo,
        delta_units: delta,
        lines: changes,
      });
    }
  }
  for (const orderNo of touched) {
    await db.run(
      'UPDATE legacy_crm.order_documents SET updated_at = now() WHERE order_no = $1',
      [orderNo],
    );
    await refreshOrderClosed(db, orderNo);
  }
  return effects;
}

/**
 * 客戶「最近交易日期」（cust.deal_l）：出貨新增或修改時照寫出貨日期，不比較早晚
 * （舊版 FSold `update cust set deal_l = '{出貨日期}'`，2026-10-08 Win7 實測改早也照寫）。訂單、報價、刪除出貨不動。
 */
async function touchCustomerLatest(db: LegacyDb, sale: Row) {
  const code = String(sale.customer_code ?? '').trim();
  if (!sale.sale_date || !code) return null;
  const count = await db.run(
    `UPDATE legacy_crm.partners SET latest_transaction_date = $1, latest_transaction_date_raw = NULL, updated_at = now()
     WHERE kind = 'customer' AND code = $2`,
    [sale.sale_date, code],
  );
  return count
    ? { customer_code: code, latest_transaction_date: sale.sale_date }
    : null;
}

/**
 * 出貨存檔也把每列的材質、厚度、單位、單價寫回工件（舊版 FSold）：單價依代料欄寫到對應欄位——
 * 代 → 代料、折 → 折工、備折、代折，其他 → 備料。沒有建檔的工件不動，超過工件欄寬的值不寫。
 */
const PART_PRICE_BY_OUTSOURCE: Record<string, string> = {
  代: 'price1_units',
  折: 'price2_units',
  備折: 'price3_units',
  代折: 'price4_units',
};

async function fileSaleOnParts(db: LegacyDb, items: Row[]) {
  const filed: string[] = [];
  for (const item of items) {
    const drawingNo = String(item.drawing_no ?? '').trim();
    if (!drawingNo) continue;
    const priceColumn =
      PART_PRICE_BY_OUTSOURCE[String(item.outsource ?? '').trim()] ??
      'price_ref_units';
    const fits = (value: unknown, limit: number) =>
      String(value ?? '').length <= limit;
    const count = await db.run(
      `UPDATE legacy_crm.parts SET
         material = CASE WHEN $1 THEN $2 ELSE material END,
         thickness = CASE WHEN $3 THEN $4 ELSE thickness END,
         unit = CASE WHEN $5 THEN $6 ELSE unit END,
         ${priceColumn} = $7, updated_at = now()
       WHERE drawing_no = $8`,
      [
        fits(item.material, 10),
        item.material,
        fits(item.thickness, 4),
        item.thickness,
        fits(item.unit, 2),
        item.unit,
        item.unit_price_units,
        drawingNo,
      ],
    );
    if (count) filed.push(drawingNo);
  }
  return filed;
}

/** 出貨登錄。 */
@Injectable()
export class LegacySalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  private async items(db: LegacyDb, saleNo: string) {
    const rows = await db.all(
      `SELECT ${columns(
        'sales_items',
        '',
        ITEM.filter((name) => name !== 'sale_no'),
      )}
       FROM legacy_crm.sales_items WHERE sale_no = $1 ORDER BY line_no`,
      [saleNo],
    );
    return rows.map((row) => {
      const { quantity_units, unit_price_units, line_total_units, ...rest } =
        present('sales_items', row);
      return {
        ...rest,
        quantity: units(quantity_units),
        unit_price: units(unit_price_units),
        line_total: units(line_total_units),
      };
    });
  }

  async get(saleNo: string, db = new LegacyDb(this.dataSource.manager)) {
    const row = await db.get(
      `SELECT ${columns('sales_documents')} FROM legacy_crm.sales_documents WHERE sale_no = $1`,
      [String(saleNo)],
    );
    if (!row) return null;
    const sale = saleFromRow(row) as Row;
    return { ...sale, items: await this.items(db, sale.sale_no as string) };
  }

  async list(search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const select = `SELECT ${columns('sales_documents', 'd')}, COUNT(i.line_no) AS item_count
      FROM legacy_crm.sales_documents AS d LEFT JOIN legacy_crm.sales_items AS i ON i.sale_no = d.sale_no`;
    const order =
      'GROUP BY d.sale_no ORDER BY d.sale_date DESC NULLS LAST, d.sale_no LIMIT 500';
    const rows = term
      ? await db.all(
          `${select}
           WHERE (d.sale_no ILIKE $1 ESCAPE '!' OR ${rocText('d.sale_date')} ILIKE $1 ESCAPE '!'
             OR d.customer_code ILIKE $1 ESCAPE '!' OR d.customer_name ILIKE $1 ESCAPE '!'
             OR d.linked_order_no ILIKE $1 ESCAPE '!' OR d.invoice_number ILIKE $1 ESCAPE '!'
             OR i.drawing_no ILIKE $1 ESCAPE '!' OR i.customer_model ILIKE $1 ESCAPE '!')
           ${order}`,
          [containsPattern(term)],
        )
      : await db.all(`${select} ${order}`);
    return rows.map(saleFromRow);
  }

  private async afterSave(
    db: LegacyDb,
    sale: NormalizedDocument,
    before: Map<string, number>,
  ) {
    return {
      shipments: await applyShipmentChange(
        db,
        before,
        await saleShipments(db, sale.key),
      ),
      customer_latest: await touchCustomerLatest(db, sale.header),
      parts_filed: await fileSaleOnParts(db, sale.lines.items),
    };
  }

  async create(input: unknown, context: LegacyRequestContext) {
    const sale = normalizeSale(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await insertRow(db, 'sales_documents', sale.header, [
        'sale_no',
        ...HEADER,
      ]).catch((error) => rethrowUnique(error, '已有相同出貨編號'));
      await insertLines(db, 'sales_items', sale.lines.items, ITEM);
      const sideEffects = await this.afterSave(db, sale, new Map());
      const after = await this.get(sale.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'sales_document',
        entityKey: sale.key,
        action: 'create',
        after,
        sideEffects,
      });
      return after;
    });
  }

  async update(saleNo: string, input: unknown, context: LegacyRequestContext) {
    const sale = normalizeSale({ ...(input as object), sale_no: saleNo });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(sale.key, db);
      const shipped = await saleShipments(db, sale.key);
      if (
        (await updateRow(
          db,
          'sales_documents',
          sale.header,
          HEADER,
          'sale_no',
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await db.run('DELETE FROM legacy_crm.sales_items WHERE sale_no = $1', [
        sale.key,
      ]);
      await insertLines(db, 'sales_items', sale.lines.items, ITEM);
      const sideEffects = await this.afterSave(db, sale, shipped);
      const after = await this.get(sale.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'sales_document',
        entityKey: sale.key,
        action: 'update',
        before,
        after,
        sideEffects,
      });
      return after;
    });
  }

  async remove(saleNo: string, context: LegacyRequestContext) {
    const key = documentKey('出貨編號', saleNo);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(key, db);
      const shipped = await saleShipments(db, key);
      if (
        (await db.run(
          'DELETE FROM legacy_crm.sales_documents WHERE sale_no = $1',
          [key],
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      const shipments = await applyShipmentChange(db, shipped, new Map());
      await this.writeLog.record(manager, context, {
        entityType: 'sales_document',
        entityKey: key,
        action: 'delete',
        before,
        sideEffects: { shipments },
      });
    });
  }
}

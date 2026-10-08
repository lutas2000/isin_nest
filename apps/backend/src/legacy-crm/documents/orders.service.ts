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
import { normalizeOrder, Row } from '../common/legacy-records';
import { LegacyWriteLogService } from '../write-log/write-log.service';
import {
  documentKey,
  insertLines,
  insertRow,
  rocText,
  updateRow,
  withRaw,
} from './document-sql';

const HEADER = withRaw(
  [
    'order_date',
    'delivery_date',
    'customer_code',
    'customer_name',
    'actor_no',
    'actor_name',
    'payment_method',
    'delivery_method',
    'note',
    'note2',
    'closed',
    'legacy_xx',
  ],
  ['order_date', 'delivery_date'],
);
const ITEM = withRaw(
  [
    'order_no',
    'line_no',
    'legacy_sn',
    'legacy_date_r',
    'legacy_date_e',
    'legacy_factor_no',
    'legacy_factor',
    'legacy_d_dwgok',
    'drawing_no',
    'customer_model',
    'material',
    'thickness',
    'outsource',
    'source',
    'post_process',
    'quantity_units',
    'unit',
    'shipped_quantity_units',
  ],
  ['legacy_date_r', 'legacy_date_e'],
);

export function orderFromRow(row: Row | null) {
  if (!row) return null;
  const order = present('order_documents', row);
  return {
    order_no: order.order_no,
    order_date: order.order_date,
    delivery_date: order.delivery_date,
    customer_code: order.customer_code,
    customer_name: order.customer_name,
    actor_no: order.actor_no,
    actor_name: order.actor_name,
    payment_method: order.payment_method,
    delivery_method: order.delivery_method,
    note: order.note,
    note2: order.note2,
    closed: order.closed,
    legacy_xx: order.legacy_xx,
    created_at: order.created_at,
    updated_at: order.updated_at,
    ...(order.item_count == null
      ? {}
      : { item_count: Number(order.item_count) }),
  };
}

/**
 * 結案（gtable.CLOSED）：每列都出完貨或沒有明細時為 'Y'。舊版在訂單存檔、以及連結此訂單的出貨存檔或刪除時重算
 * （FOrderA、FSold，2026-10-07 讀程式確認）。
 */
export async function refreshOrderClosed(db: LegacyDb, orderNo: string) {
  await db.run(
    `UPDATE legacy_crm.order_documents d SET closed = CASE WHEN EXISTS (
       SELECT 1 FROM legacy_crm.order_items i WHERE i.order_no = d.order_no
         AND coalesce(i.shipped_quantity_units, 0) < coalesce(i.quantity_units, 0)
     ) THEN '' ELSE 'Y' END
     WHERE order_no = $1`,
    [String(orderNo ?? '').trim()],
  );
}

/** 訂貨登錄。 */
@Injectable()
export class LegacyOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  private async items(db: LegacyDb, orderNo: string) {
    const rows = await db.all(
      `SELECT ${columns(
        'order_items',
        '',
        ITEM.filter((name) => name !== 'order_no'),
      )}
       FROM legacy_crm.order_items WHERE order_no = $1 ORDER BY line_no`,
      [orderNo],
    );
    return rows.map((row) => {
      const { quantity_units, shipped_quantity_units, ...rest } = present(
        'order_items',
        row,
      );
      return {
        ...rest,
        quantity: units(quantity_units),
        shipped_quantity: units(shipped_quantity_units),
      };
    });
  }

  async get(orderNo: string, db = new LegacyDb(this.dataSource.manager)) {
    const row = await db.get(
      `SELECT ${columns('order_documents')} FROM legacy_crm.order_documents WHERE order_no = $1`,
      [String(orderNo)],
    );
    if (!row) return null;
    const order = orderFromRow(row) as Row;
    return { ...order, items: await this.items(db, order.order_no as string) };
  }

  async list(search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const select = `SELECT ${columns('order_documents', 'd')}, COUNT(i.line_no) AS item_count
      FROM legacy_crm.order_documents AS d LEFT JOIN legacy_crm.order_items AS i ON i.order_no = d.order_no`;
    const order =
      'GROUP BY d.order_no ORDER BY d.order_date DESC NULLS LAST, d.order_no LIMIT 500';
    const rows = term
      ? await db.all(
          `${select}
           WHERE (d.order_no ILIKE $1 ESCAPE '!' OR ${rocText('d.order_date')} ILIKE $1 ESCAPE '!'
             OR ${rocText('d.delivery_date')} ILIKE $1 ESCAPE '!' OR d.customer_code ILIKE $1 ESCAPE '!'
             OR d.customer_name ILIKE $1 ESCAPE '!' OR d.actor_no ILIKE $1 ESCAPE '!'
             OR d.actor_name ILIKE $1 ESCAPE '!' OR i.drawing_no ILIKE $1 ESCAPE '!'
             OR i.customer_model ILIKE $1 ESCAPE '!')
           ${order}`,
          [containsPattern(term)],
        )
      : await db.all(`${select} ${order}`);
    return rows.map(orderFromRow);
  }

  async create(input: unknown, context: LegacyRequestContext) {
    const order = normalizeOrder(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await insertRow(db, 'order_documents', order.header, [
        'order_no',
        ...HEADER,
      ]).catch((error) => rethrowUnique(error, '已有相同訂單編號'));
      await insertLines(db, 'order_items', order.lines.items, ITEM);
      await refreshOrderClosed(db, order.key);
      const after = await this.get(order.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'order_document',
        entityKey: order.key,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async update(orderNo: string, input: unknown, context: LegacyRequestContext) {
    const order = normalizeOrder({ ...(input as object), order_no: orderNo });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(order.key, db);
      if (
        (await updateRow(
          db,
          'order_documents',
          order.header,
          HEADER,
          'order_no',
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await db.run('DELETE FROM legacy_crm.order_items WHERE order_no = $1', [
        order.key,
      ]);
      await insertLines(db, 'order_items', order.lines.items, ITEM);
      await refreshOrderClosed(db, order.key);
      const after = await this.get(order.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'order_document',
        entityKey: order.key,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async remove(orderNo: string, context: LegacyRequestContext) {
    const key = documentKey('訂單編號', orderNo);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(key, db);
      if (
        (await db.run(
          'DELETE FROM legacy_crm.order_documents WHERE order_no = $1',
          [key],
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.writeLog.record(manager, context, {
        entityType: 'order_document',
        entityKey: key,
        action: 'delete',
        before,
      });
    });
  }
}

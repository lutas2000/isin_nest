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
import { normalizeQuote, Row } from '../common/legacy-records';
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
    'quote_date',
    'customer_code',
    'customer_name',
    'actor_no',
    'actor_name',
    'attention',
    'legacy_xx',
    'total_units',
  ],
  ['quote_date'],
);
const ITEM = [
  'quote_no',
  'line_no',
  'customer_model',
  'material',
  'thickness',
  'summary',
  'quantity_units',
  'unit_price_units',
  'line_total_units',
];
const NOTE = ['quote_no', 'line_no', 'note'];

function quoteFromRow(row: Row | null) {
  if (!row) return null;
  const quote = present('quote_documents', row);
  return {
    quote_no: quote.quote_no,
    quote_date: quote.quote_date,
    customer_code: quote.customer_code,
    customer_name: quote.customer_name,
    actor_no: quote.actor_no,
    actor_name: quote.actor_name,
    attention: quote.attention,
    legacy_xx: quote.legacy_xx,
    total: units(quote.total_units),
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    ...(quote.item_count == null
      ? {}
      : { item_count: Number(quote.item_count) }),
  };
}

/** 報價登錄。 */
@Injectable()
export class LegacyQuotesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  async get(quoteNo: string, db = new LegacyDb(this.dataSource.manager)) {
    const row = await db.get(
      `SELECT ${columns('quote_documents')} FROM legacy_crm.quote_documents WHERE quote_no = $1`,
      [String(quoteNo)],
    );
    if (!row) return null;
    const quote = quoteFromRow(row) as Row;
    const items = await db.all(
      `SELECT line_no, customer_model, material, thickness, summary, quantity_units, unit_price_units, line_total_units
       FROM legacy_crm.quote_items WHERE quote_no = $1 ORDER BY line_no`,
      [quote.quote_no],
    );
    const notes = await db.all(
      'SELECT line_no, note FROM legacy_crm.quote_note_lines WHERE quote_no = $1 ORDER BY line_no',
      [quote.quote_no],
    );
    return {
      ...quote,
      items: items.map(
        ({ quantity_units, unit_price_units, line_total_units, ...rest }) => ({
          ...rest,
          quantity: units(quantity_units),
          unit_price: units(unit_price_units),
          line_total: units(line_total_units),
        }),
      ),
      notes,
    };
  }

  async list(search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const rows = term
      ? await db.all(
          `SELECT ${columns('quote_documents', 'q')}, COUNT(DISTINCT i.line_no) AS item_count
           FROM legacy_crm.quote_documents AS q
           LEFT JOIN legacy_crm.quote_items AS i ON i.quote_no = q.quote_no
           LEFT JOIN legacy_crm.quote_note_lines AS n ON n.quote_no = q.quote_no
           WHERE (q.quote_no ILIKE $1 ESCAPE '!' OR ${rocText('q.quote_date')} ILIKE $1 ESCAPE '!'
             OR q.customer_code ILIKE $1 ESCAPE '!' OR q.customer_name ILIKE $1 ESCAPE '!'
             OR q.actor_name ILIKE $1 ESCAPE '!' OR q.attention ILIKE $1 ESCAPE '!'
             OR i.customer_model ILIKE $1 ESCAPE '!' OR i.summary ILIKE $1 ESCAPE '!'
             OR n.note ILIKE $1 ESCAPE '!')
           GROUP BY q.quote_no ORDER BY q.quote_date DESC NULLS LAST, q.quote_no LIMIT 500`,
          [containsPattern(term)],
        )
      : await db.all(
          `SELECT ${columns('quote_documents', 'q')}, COUNT(DISTINCT i.line_no) AS item_count
           FROM legacy_crm.quote_documents AS q LEFT JOIN legacy_crm.quote_items AS i ON i.quote_no = q.quote_no
           GROUP BY q.quote_no ORDER BY q.quote_date DESC NULLS LAST, q.quote_no LIMIT 500`,
        );
    return rows.map(quoteFromRow);
  }

  private async replaceLines(
    db: LegacyDb,
    quote: ReturnType<typeof normalizeQuote>,
  ) {
    await db.run('DELETE FROM legacy_crm.quote_items WHERE quote_no = $1', [
      quote.key,
    ]);
    await db.run(
      'DELETE FROM legacy_crm.quote_note_lines WHERE quote_no = $1',
      [quote.key],
    );
    await insertLines(db, 'quote_items', quote.lines.items, ITEM);
    await insertLines(db, 'quote_note_lines', quote.lines.notes, NOTE);
  }

  async create(input: unknown, context: LegacyRequestContext) {
    const quote = normalizeQuote(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await insertRow(db, 'quote_documents', quote.header, [
        'quote_no',
        ...HEADER,
      ]).catch((error) => rethrowUnique(error, '已有相同報價編號'));
      await this.replaceLines(db, quote);
      const after = await this.get(quote.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'quote_document',
        entityKey: quote.key,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async update(quoteNo: string, input: unknown, context: LegacyRequestContext) {
    const quote = normalizeQuote({ ...(input as object), quote_no: quoteNo });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(quote.key, db);
      if (
        (await updateRow(
          db,
          'quote_documents',
          quote.header,
          HEADER,
          'quote_no',
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.replaceLines(db, quote);
      const after = await this.get(quote.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'quote_document',
        entityKey: quote.key,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async remove(quoteNo: string, context: LegacyRequestContext) {
    const key = documentKey('報價編號', quoteNo);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(key, db);
      if (
        (await db.run(
          'DELETE FROM legacy_crm.quote_documents WHERE quote_no = $1',
          [key],
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.writeLog.record(manager, context, {
        entityType: 'quote_document',
        entityKey: key,
        action: 'delete',
        before,
      });
    });
  }
}

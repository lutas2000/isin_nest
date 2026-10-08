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
  normalizeWork,
  Row,
} from '../common/legacy-records';
import { formatRocDate } from '../common/roc-date';
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

const HEADER = withRaw(
  [
    'transfer_date',
    'customer_code',
    'customer_name',
    'actor_no',
    'actor_name',
    'order_no',
  ],
  ['transfer_date'],
);
const ITEM = [
  'work_no',
  'line_no',
  'drawing_no',
  'material',
  'thickness',
  'outsource',
  'order_quantity_units',
  'completed_quantity_units',
  'cnc_ok',
  'plating_work',
  'post_process',
  'order_no',
];

/** 工作單存檔前的 CNC 檔檢查（舊版「工作登錄檢查」）；由圖檔模組提供，未設定 CNC 路徑時不檢查。 */
export const LEGACY_CNC_CHECK = Symbol('LEGACY_CNC_CHECK');
export type LegacyCncCheck = (items: unknown) => Promise<string[]>;

function workFromRow(row: Row | null) {
  if (!row) return null;
  const work = present('work_documents', row);
  return {
    work_no: work.work_no,
    transfer_date: work.transfer_date,
    customer_code: work.customer_code,
    customer_name: work.customer_name,
    actor_no: work.actor_no,
    actor_name: work.actor_name,
    order_no: work.order_no,
    created_at: work.created_at,
    updated_at: work.updated_at,
    ...(work.item_count == null ? {} : { item_count: Number(work.item_count) }),
  };
}

/** 工作登錄。 */
@Injectable()
export class LegacyWorksService {
  private cncCheck: LegacyCncCheck = async () => [];

  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  /** 由圖檔模組在啟動時注入 CNC 檢查。 */
  useCncCheck(check: LegacyCncCheck) {
    this.cncCheck = check;
  }

  async get(workNo: string, db = new LegacyDb(this.dataSource.manager)) {
    const row = await db.get(
      `SELECT ${columns('work_documents')} FROM legacy_crm.work_documents WHERE work_no = $1`,
      [String(workNo)],
    );
    if (!row) return null;
    const work = workFromRow(row) as Row;
    const items = await db.all(
      `SELECT line_no, drawing_no, material, thickness, outsource, order_quantity_units, completed_quantity_units,
              cnc_ok, plating_work, post_process, order_no
       FROM legacy_crm.work_items WHERE work_no = $1 ORDER BY line_no`,
      [work.work_no],
    );
    return {
      ...work,
      items: items.map(
        ({ order_quantity_units, completed_quantity_units, ...rest }) => {
          const {
            line_no,
            drawing_no,
            material,
            thickness,
            outsource,
            cnc_ok,
            plating_work,
            post_process,
            order_no,
          } = rest;
          return {
            line_no,
            drawing_no,
            material,
            thickness,
            outsource,
            order_quantity: units(order_quantity_units),
            completed_quantity: units(completed_quantity_units),
            cnc_ok,
            plating_work,
            post_process,
            order_no,
          };
        },
      ),
    };
  }

  async list(search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const select = `SELECT ${columns('work_documents', 'w')},
      (SELECT COUNT(*) FROM legacy_crm.work_items AS wi WHERE wi.work_no = w.work_no) AS item_count
      FROM legacy_crm.work_documents AS w`;
    const order =
      'ORDER BY w.transfer_date DESC NULLS LAST, w.work_no LIMIT 500';
    const rows = term
      ? await db.all(
          `${select}
           WHERE (w.work_no ILIKE $1 ESCAPE '!' OR ${rocText('w.transfer_date')} ILIKE $1 ESCAPE '!'
             OR w.order_no ILIKE $1 ESCAPE '!' OR w.customer_code ILIKE $1 ESCAPE '!'
             OR w.customer_name ILIKE $1 ESCAPE '!' OR w.actor_no ILIKE $1 ESCAPE '!'
             OR w.actor_name ILIKE $1 ESCAPE '!'
             OR EXISTS (SELECT 1 FROM legacy_crm.work_items AS wi WHERE wi.work_no = w.work_no AND
               (wi.drawing_no ILIKE $1 ESCAPE '!' OR wi.material ILIKE $1 ESCAPE '!' OR wi.cnc_ok ILIKE $1 ESCAPE '!'
                OR wi.plating_work ILIKE $1 ESCAPE '!' OR wi.post_process ILIKE $1 ESCAPE '!')))
           ${order}`,
          [containsPattern(term)],
        )
      : await db.all(`${select} ${order}`);
    return rows.map(workFromRow);
  }

  /** 明細沒有自己的訂單編號時沿用表頭的訂單編號。 */
  private lines(work: NormalizedDocument) {
    return work.lines.items.map((item) => ({
      ...item,
      order_no: item.order_no || work.header.order_no,
    }));
  }

  /**
   * 工作單存檔時，把日期寫到每個雷射工件（雷射工件不是 N）的工件「最近交易」（dcst.CNC3），
   * 與舊版工作登錄相同；舊版「刪除久未使用之CNC檔」依此判斷。
   */
  private async fileWorkDateOnParts(db: LegacyDb, work: NormalizedDocument) {
    if (!work.header.transfer_date) return [];
    const date = formatRocDate(work.header.transfer_date as string);
    const filed: string[] = [];
    for (const item of work.lines.items) {
      const drawingNo = String(item.drawing_no ?? '').trim();
      if (
        !drawingNo ||
        String(item.plating_work ?? '')
          .trim()
          .toUpperCase() === 'N'
      )
        continue;
      if (
        await db.run(
          'UPDATE legacy_crm.parts SET cnc3 = $1, updated_at = now() WHERE drawing_no = $2',
          [date, drawingNo],
        )
      ) {
        filed.push(drawingNo);
      }
    }
    return filed.length ? { cnc3: date, parts: filed } : null;
  }

  private async checkCnc(input: unknown) {
    const missing = await this.cncCheck((input as { items?: unknown })?.items);
    if (missing.length) throw new LegacyValidationError(missing.join('\n'));
  }

  async create(input: unknown, context: LegacyRequestContext) {
    await this.checkCnc(input);
    const work = normalizeWork(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await insertRow(db, 'work_documents', work.header, [
        'work_no',
        ...HEADER,
      ]).catch((error) => rethrowUnique(error, '已有相同工作編號'));
      await insertLines(db, 'work_items', this.lines(work), ITEM);
      const sideEffects = await this.fileWorkDateOnParts(db, work);
      const after = await this.get(work.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'work_document',
        entityKey: work.key,
        action: 'create',
        after,
        sideEffects,
      });
      return after;
    });
  }

  async update(workNo: string, input: unknown, context: LegacyRequestContext) {
    await this.checkCnc(input);
    const work = normalizeWork({ ...(input as object), work_no: workNo });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(work.key, db);
      if (
        (await updateRow(
          db,
          'work_documents',
          work.header,
          HEADER,
          'work_no',
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await db.run('DELETE FROM legacy_crm.work_items WHERE work_no = $1', [
        work.key,
      ]);
      await insertLines(db, 'work_items', this.lines(work), ITEM);
      const sideEffects = await this.fileWorkDateOnParts(db, work);
      const after = await this.get(work.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'work_document',
        entityKey: work.key,
        action: 'update',
        before,
        after,
        sideEffects,
      });
      return after;
    });
  }

  async remove(workNo: string, context: LegacyRequestContext) {
    const key = documentKey('工作編號', workNo);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(key, db);
      if (
        (await db.run(
          'DELETE FROM legacy_crm.work_documents WHERE work_no = $1',
          [key],
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.writeLog.record(manager, context, {
        entityType: 'work_document',
        entityKey: key,
        action: 'delete',
        before,
      });
    });
  }
}

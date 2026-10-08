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
import { normalizeDrawingGroup, Row } from '../common/legacy-records';
import { LegacyWriteLogService } from '../write-log/write-log.service';
import {
  documentKey,
  insertLines,
  insertRow,
  updateRow,
  withRaw,
} from './document-sql';

const HEADER = withRaw(
  [
    'created_date',
    'customer_code',
    'customer_name',
    'customer_drawing_no',
    'notes',
    'legacy_xx',
  ],
  ['created_date'],
);
const ITEM = [
  'group_no',
  'customer_code',
  'line_no',
  'drawing_no',
  'customer_drawing_no',
  'material',
  'thickness',
  'quantity_units',
  'is_laser',
];

/** 圖組建檔。 */
@Injectable()
export class LegacyGroupsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  /** 圖組明細；項次照 isin_vb6 以文字回傳（舊表是文字欄）。 */
  private async items(db: LegacyDb, groupNo: string) {
    const rows = await db.all(
      `SELECT ${ITEM.join(', ')} FROM legacy_crm.drawing_group_items WHERE group_no = $1 ORDER BY line_no`,
      [groupNo],
    );
    return rows.map((row) => ({
      group_no: row.group_no,
      customer_code: row.customer_code,
      line_no: String(row.line_no),
      drawing_no: row.drawing_no,
      customer_drawing_no: row.customer_drawing_no,
      material: row.material,
      thickness: row.thickness,
      quantity: units(row.quantity_units),
      is_laser: row.is_laser,
    }));
  }

  private async withItems(db: LegacyDb, row: Row) {
    const group = present('drawing_groups', row);
    return { ...group, items: await this.items(db, group.group_no as string) };
  }

  async get(groupNo: string, db = new LegacyDb(this.dataSource.manager)) {
    const row = await db.get(
      `SELECT ${columns('drawing_groups')} FROM legacy_crm.drawing_groups WHERE group_no = $1`,
      [String(groupNo)],
    );
    return row ? this.withItems(db, row) : null;
  }

  async list(search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const rows = term
      ? await db.all(
          `SELECT ${columns('drawing_groups')} FROM legacy_crm.drawing_groups
           WHERE group_no ILIKE $1 ESCAPE '!' OR customer_code ILIKE $1 ESCAPE '!'
             OR customer_name ILIKE $1 ESCAPE '!' OR customer_drawing_no ILIKE $1 ESCAPE '!'
           ORDER BY group_no LIMIT 500`,
          [containsPattern(term)],
        )
      : await db.all(
          `SELECT ${columns('drawing_groups')} FROM legacy_crm.drawing_groups ORDER BY group_no LIMIT 500`,
        );
    const result: unknown[] = [];
    for (const row of rows) result.push(await this.withItems(db, row));
    return result;
  }

  private async replaceItems(
    db: LegacyDb,
    group: ReturnType<typeof normalizeDrawingGroup>,
  ) {
    await db.run(
      'DELETE FROM legacy_crm.drawing_group_items WHERE group_no = $1',
      [group.key],
    );
    await insertLines(db, 'drawing_group_items', group.lines.items, ITEM);
  }

  async create(input: unknown, context: LegacyRequestContext) {
    const group = normalizeDrawingGroup(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await insertRow(db, 'drawing_groups', group.header, [
        'group_no',
        ...HEADER,
      ]).catch((error) => rethrowUnique(error, '已有相同圖組編號'));
      await this.replaceItems(db, group);
      const after = await this.get(group.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'drawing_group',
        entityKey: group.key,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async update(groupNo: string, input: unknown, context: LegacyRequestContext) {
    const group = normalizeDrawingGroup({
      ...(input as object),
      group_no: groupNo,
    });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(group.key, db);
      if (
        (await updateRow(
          db,
          'drawing_groups',
          group.header,
          HEADER,
          'group_no',
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.replaceItems(db, group);
      const after = await this.get(group.key, db);
      await this.writeLog.record(manager, context, {
        entityType: 'drawing_group',
        entityKey: group.key,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async remove(groupNo: string, context: LegacyRequestContext) {
    const key = documentKey('圖組編號', groupNo);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(key, db);
      if (
        (await db.run(
          'DELETE FROM legacy_crm.drawing_groups WHERE group_no = $1',
          [key],
        )) === 0
      ) {
        throw new LegacyNotFoundError();
      }
      await this.writeLog.record(manager, context, {
        entityType: 'drawing_group',
        entityKey: key,
        action: 'delete',
        before,
      });
    });
  }
}

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
import {
  LegacyNotFoundError,
  MASTER_DUPLICATE,
  rethrowUnique,
} from '../common/legacy-errors';
import {
  normalizeBank,
  normalizeBankCheckLayout,
  normalizeMaterial,
  normalizePart,
  normalizePhrase,
  normalizePostalCode,
  Row,
} from '../common/legacy-records';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { LegacyWriteLogService } from '../write-log/write-log.service';

type Input = Record<string, unknown>;

const PART_TEXT_FIELDS = [
  'drawing_name',
  'drawing_ref',
  'customer_code',
  'customer_model',
  'material',
  'thickness',
  'unit',
  'actor_no',
  'actor',
  'drawing_date',
  'drawing_date_raw',
  'directory_path',
  'cnc1',
  'cnc2',
  'cnc3',
  'cnc4',
  'cnc5',
  'notes',
  'yy',
];
const PART_PRICE_FIELDS = [
  'price_ref',
  'price1',
  'price2',
  'price3',
  'price4',
  'price5',
];
const PART_COLUMNS = [
  ...PART_TEXT_FIELDS,
  ...PART_PRICE_FIELDS.map((field) => `${field}_units`),
];

const BANK_FIELDS = [
  'short_name',
  'full_name',
  'contact',
  'phone1',
  'phone2',
  'address',
  'legacy_bono',
  'legacy_boname',
  'account_no',
  'account_name',
  'notes',
  'balance_units',
  'check_layout',
];

interface SimpleMaster {
  table: string;
  key: string;
  keyLabel: string;
  keyLimit: number;
  value: string;
  entityType: string;
  normalize: (input: unknown) => Row;
}

export const SIMPLE_MASTERS: Record<'phrases' | 'postal-codes', SimpleMaster> =
  {
    phrases: {
      table: 'phrases',
      key: 'phrase_no',
      keyLabel: '詞彙編號',
      keyLimit: 10,
      value: 'content',
      entityType: 'phrase',
      normalize: normalizePhrase,
    },
    'postal-codes': {
      table: 'postal_codes',
      key: 'postal_code',
      keyLabel: '郵遞區號',
      keyLimit: 10,
      value: 'region_name',
      entityType: 'postal_code',
      normalize: normalizePostalCode,
    },
  };

function boundedKey(label: string, value: unknown, limit: number) {
  const key = value == null ? '' : String(value).trim();
  if (!key) throw new LegacyValidationError(`${label}不可空白`);
  if (Array.from(key).length > limit)
    throw new LegacyValidationError(`${label}最多 ${limit} 個字元`);
  return key;
}

function partFromRow(row: Row | null) {
  if (!row) return null;
  const part: Row = present('parts', row);
  for (const field of PART_PRICE_FIELDS) {
    part[field] = units(part[`${field}_units`]);
    delete part[`${field}_units`];
  }
  return part;
}

function bankFromRow(row: Row | null) {
  if (!row) return null;
  const { balance_units, check_layout, ...bank } = present('banks', row);
  return {
    ...bank,
    balance: units(balance_units),
    check_layout: normalizeBankCheckLayout(check_layout),
  };
}

const materialFromRow = (row: Row | null) =>
  row && {
    id: row.id,
    material: row.material,
    thickness: row.thickness,
    product_name: row.product_name,
    category: row.category,
  };

function materialId(id: unknown) {
  const value = Number(id);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new LegacyValidationError('材質資料編號無效');
  return value;
}

/** 材質、工件、銀行、詞彙、郵遞區號建檔。 */
@Injectable()
export class LegacyMastersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  private db() {
    return new LegacyDb(this.dataSource.manager);
  }

  // ---- 材質 ----

  async listMaterials(search = '') {
    const term = String(search).trim();
    const select =
      'SELECT id, material, thickness, product_name, category FROM legacy_crm.materials';
    const rows = term
      ? await this.db().all(
          `${select} WHERE material ILIKE $1 ESCAPE '!' OR thickness ILIKE $1 ESCAPE '!'
             OR product_name ILIKE $1 ESCAPE '!' OR category ILIKE $1 ESCAPE '!'
           ORDER BY material, thickness, id LIMIT 500`,
          [containsPattern(term)],
        )
      : await this.db().all(
          `${select} ORDER BY material, thickness, id LIMIT 500`,
        );
    return rows.map(materialFromRow);
  }

  async getMaterial(id: unknown, db = this.db()) {
    const value = Number(id);
    if (!Number.isSafeInteger(value)) return null;
    return materialFromRow(
      await db.get(
        'SELECT id, material, thickness, product_name, category FROM legacy_crm.materials WHERE id = $1',
        [value],
      ),
    );
  }

  async createMaterial(input: unknown, context: LegacyRequestContext) {
    const material = normalizeMaterial(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const row = await db.get<{ id: number }>(
        `INSERT INTO legacy_crm.materials (material, thickness, product_name, category)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          material.material,
          material.thickness,
          material.product_name,
          material.category,
        ],
      );
      const after = await this.getMaterial(row?.id, db);
      await this.writeLog.record(manager, context, {
        entityType: 'material',
        entityKey: String(row?.id),
        action: 'create',
        after,
      });
      return after;
    });
  }

  async updateMaterial(
    id: unknown,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const value = materialId(id);
    const material = normalizeMaterial(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getMaterial(value, db);
      const count = await db.run(
        `UPDATE legacy_crm.materials SET material = $1, thickness = $2, product_name = $3, category = $4,
           updated_at = now() WHERE id = $5`,
        [
          material.material,
          material.thickness,
          material.product_name,
          material.category,
          value,
        ],
      );
      if (count === 0) throw new LegacyNotFoundError();
      const after = await this.getMaterial(value, db);
      await this.writeLog.record(manager, context, {
        entityType: 'material',
        entityKey: String(value),
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async deleteMaterial(id: unknown, context: LegacyRequestContext) {
    const value = materialId(id);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getMaterial(value, db);
      const count = await db.run(
        'DELETE FROM legacy_crm.materials WHERE id = $1',
        [value],
      );
      if (count === 0) throw new LegacyNotFoundError();
      await this.writeLog.record(manager, context, {
        entityType: 'material',
        entityKey: String(value),
        action: 'delete',
        before,
      });
    });
  }

  // ---- 工件 ----

  async listParts(search = '') {
    const term = String(search).trim();
    const rows = term
      ? await this.db().all(
          `SELECT ${columns('parts')} FROM legacy_crm.parts
           WHERE drawing_no ILIKE $1 ESCAPE '!' OR drawing_name ILIKE $1 ESCAPE '!'
             OR drawing_ref ILIKE $1 ESCAPE '!' OR customer_code ILIKE $1 ESCAPE '!'
             OR customer_model ILIKE $1 ESCAPE '!' OR material ILIKE $1 ESCAPE '!'
           ORDER BY drawing_no LIMIT 500`,
          [containsPattern(term)],
        )
      : await this.db().all(
          `SELECT ${columns('parts')} FROM legacy_crm.parts ORDER BY drawing_no LIMIT 500`,
        );
    return rows.map(partFromRow);
  }

  /**
   * 工件建檔的「最近交易」是 CNC3（工作登錄存檔時寫入的日期）；另外算出最近一次出貨日期給出貨記錄視窗。
   */
  async getPart(drawingNo: string, db = this.db()) {
    const part = partFromRow(
      await db.get(
        `SELECT ${columns('parts')} FROM legacy_crm.parts WHERE drawing_no = $1`,
        [String(drawingNo)],
      ),
    );
    if (!part) return part;
    const latest = await db.get(
      `SELECT d.sale_date::text AS sale_date, d.sale_date_raw FROM legacy_crm.sales_items i
         JOIN legacy_crm.sales_documents d ON d.sale_no = i.sale_no
       WHERE i.drawing_no = $1 ORDER BY d.sale_date DESC NULLS LAST LIMIT 1`,
      [part.drawing_no],
    );
    return {
      ...part,
      latest_sale_date: latest
        ? present('sales_documents', latest).sale_date
        : '',
    };
  }

  /**
   * 出貨記錄：圖號的出貨明細，指定訂單時只看該訂單（訂單登錄 F12），否則可限定客戶（工件建檔、出貨登錄 F12）；
   * 新的在前（舊版 `order by date_r desc`）。
   */
  async listPartSales(
    drawingNo: string,
    { customerCode = '', orderNo = '' } = {},
  ) {
    const order = String(orderNo ?? '').trim();
    const customer = String(customerCode ?? '').trim();
    const params: unknown[] = [String(drawingNo ?? '').trim()];
    let filter = '';
    if (order) {
      filter = 'AND btrim(d.linked_order_no) = $2';
      params.push(order);
    } else if (customer) {
      filter = 'AND d.customer_code = $2';
      params.push(customer);
    }
    const rows = await this.db().all(
      `SELECT d.sale_date::text AS sale_date, d.sale_date_raw, d.sale_no, btrim(d.linked_order_no) AS order_no,
              i.material, i.thickness, i.outsource, i.quantity_units, i.unit_price_units, i.line_total_units
       FROM legacy_crm.sales_items i JOIN legacy_crm.sales_documents d ON d.sale_no = i.sale_no
       WHERE i.drawing_no = $1 ${filter}
       ORDER BY d.sale_date DESC NULLS LAST, d.sale_no, i.line_no`,
      params,
    );
    return rows.map((row) => {
      const { quantity_units, unit_price_units, line_total_units, ...rest } =
        present('sales_documents', row);
      return {
        ...rest,
        quantity: units(quantity_units),
        unit_price: units(unit_price_units),
        line_total: units(line_total_units),
      };
    });
  }

  async createPart(input: unknown, context: LegacyRequestContext) {
    const part = normalizePart(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const names = ['drawing_no', ...PART_COLUMNS];
      await db
        .run(
          `INSERT INTO legacy_crm.parts (${names.join(', ')}) VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
          names.map((name) => part[name]),
        )
        .catch((error) => rethrowUnique(error, MASTER_DUPLICATE));
      const after = await this.getPart(part.drawing_no as string, db);
      await this.writeLog.record(manager, context, {
        entityType: 'part',
        entityKey: part.drawing_no as string,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async updatePart(
    drawingNo: string,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const part = normalizePart({ ...(input as Input), drawing_no: drawingNo });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getPart(part.drawing_no as string, db);
      const count = await db.run(
        `UPDATE legacy_crm.parts SET ${PART_COLUMNS.map((name, i) => `${name} = $${i + 1}`).join(', ')},
           updated_at = now() WHERE drawing_no = $${PART_COLUMNS.length + 1}`,
        [...PART_COLUMNS.map((name) => part[name]), part.drawing_no],
      );
      if (count === 0) throw new LegacyNotFoundError();
      const after = await this.getPart(part.drawing_no as string, db);
      await this.writeLog.record(manager, context, {
        entityType: 'part',
        entityKey: part.drawing_no as string,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async deletePart(drawingNo: string, context: LegacyRequestContext) {
    const key = boundedKey('電腦圖號', drawingNo, 250);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getPart(key, db);
      const count = await db.run(
        'DELETE FROM legacy_crm.parts WHERE drawing_no = $1',
        [key],
      );
      if (count === 0) throw new LegacyNotFoundError();
      await this.writeLog.record(manager, context, {
        entityType: 'part',
        entityKey: key,
        action: 'delete',
        before,
      });
    });
  }

  // ---- 銀行 ----

  async listBanks(search = '') {
    const term = String(search).trim();
    const rows = term
      ? await this.db().all(
          `SELECT * FROM legacy_crm.banks
           WHERE code ILIKE $1 ESCAPE '!' OR short_name ILIKE $1 ESCAPE '!' OR full_name ILIKE $1 ESCAPE '!'
             OR contact ILIKE $1 ESCAPE '!' OR phone1 ILIKE $1 ESCAPE '!' OR account_no ILIKE $1 ESCAPE '!'
           ORDER BY code LIMIT 500`,
          [containsPattern(term)],
        )
      : await this.db().all(
          'SELECT * FROM legacy_crm.banks ORDER BY code LIMIT 500',
        );
    return rows.map(bankFromRow);
  }

  async getBank(code: string, db = this.db()) {
    return bankFromRow(
      await db.get('SELECT * FROM legacy_crm.banks WHERE code = $1', [
        String(code),
      ]),
    );
  }

  async createBank(input: unknown, context: LegacyRequestContext) {
    const bank = normalizeBank(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const names = ['code', ...BANK_FIELDS];
      await db
        .run(
          `INSERT INTO legacy_crm.banks (${names.join(', ')}) VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
          names.map((name) =>
            name === 'check_layout' ? JSON.stringify(bank[name]) : bank[name],
          ),
        )
        .catch((error) => rethrowUnique(error, MASTER_DUPLICATE));
      const after = await this.getBank(bank.code as string, db);
      await this.writeLog.record(manager, context, {
        entityType: 'bank',
        entityKey: bank.code as string,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async updateBank(
    code: string,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const bank = normalizeBank({ ...(input as Input), code });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getBank(bank.code as string, db);
      const count = await db.run(
        `UPDATE legacy_crm.banks SET ${BANK_FIELDS.map((name, i) => `${name} = $${i + 1}`).join(', ')},
           updated_at = now() WHERE code = $${BANK_FIELDS.length + 1}`,
        [
          ...BANK_FIELDS.map((name) =>
            name === 'check_layout' ? JSON.stringify(bank[name]) : bank[name],
          ),
          bank.code,
        ],
      );
      if (count === 0) throw new LegacyNotFoundError();
      const after = await this.getBank(bank.code as string, db);
      await this.writeLog.record(manager, context, {
        entityType: 'bank',
        entityKey: bank.code as string,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async deleteBank(code: string, context: LegacyRequestContext) {
    const key = boundedKey('銀行編號', code, 10);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getBank(key, db);
      const count = await db.run(
        'DELETE FROM legacy_crm.banks WHERE code = $1',
        [key],
      );
      if (count === 0) throw new LegacyNotFoundError();
      await this.writeLog.record(manager, context, {
        entityType: 'bank',
        entityKey: key,
        action: 'delete',
        before,
      });
    });
  }

  // ---- 詞彙、郵遞區號 ----

  async listSimple(kind: keyof typeof SIMPLE_MASTERS, search = '') {
    const spec = SIMPLE_MASTERS[kind];
    const term = String(search).trim();
    return term
      ? this.db().all(
          `SELECT * FROM legacy_crm.${spec.table}
           WHERE ${spec.key} ILIKE $1 ESCAPE '!' OR ${spec.value} ILIKE $1 ESCAPE '!'
           ORDER BY ${spec.key} LIMIT 500`,
          [containsPattern(term)],
        )
      : this.db().all(
          `SELECT * FROM legacy_crm.${spec.table} ORDER BY ${spec.key} LIMIT 500`,
        );
  }

  async getSimple(
    kind: keyof typeof SIMPLE_MASTERS,
    key: string,
    db = this.db(),
  ) {
    const spec = SIMPLE_MASTERS[kind];
    return db.get(
      `SELECT * FROM legacy_crm.${spec.table} WHERE ${spec.key} = $1`,
      [String(key)],
    );
  }

  async createSimple(
    kind: keyof typeof SIMPLE_MASTERS,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const spec = SIMPLE_MASTERS[kind];
    const record = spec.normalize(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      await db
        .run(
          `INSERT INTO legacy_crm.${spec.table} (${spec.key}, ${spec.value}) VALUES ($1, $2)`,
          [record[spec.key], record[spec.value]],
        )
        .catch((error) => rethrowUnique(error, MASTER_DUPLICATE));
      const after = await this.getSimple(kind, record[spec.key] as string, db);
      await this.writeLog.record(manager, context, {
        entityType: spec.entityType,
        entityKey: record[spec.key] as string,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async updateSimple(
    kind: keyof typeof SIMPLE_MASTERS,
    key: string,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const spec = SIMPLE_MASTERS[kind];
    const record = spec.normalize({ ...(input as Input), [spec.key]: key });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getSimple(kind, record[spec.key] as string, db);
      const count = await db.run(
        `UPDATE legacy_crm.${spec.table} SET ${spec.value} = $1, updated_at = now() WHERE ${spec.key} = $2`,
        [record[spec.value], record[spec.key]],
      );
      if (count === 0) throw new LegacyNotFoundError();
      const after = await this.getSimple(kind, record[spec.key] as string, db);
      await this.writeLog.record(manager, context, {
        entityType: spec.entityType,
        entityKey: record[spec.key] as string,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async deleteSimple(
    kind: keyof typeof SIMPLE_MASTERS,
    key: string,
    context: LegacyRequestContext,
  ) {
    const spec = SIMPLE_MASTERS[kind];
    const normalized = boundedKey(spec.keyLabel, key, spec.keyLimit);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.getSimple(kind, normalized, db);
      const count = await db.run(
        `DELETE FROM legacy_crm.${spec.table} WHERE ${spec.key} = $1`,
        [normalized],
      );
      if (count === 0) throw new LegacyNotFoundError();
      await this.writeLog.record(manager, context, {
        entityType: spec.entityType,
        entityKey: normalized,
        action: 'delete',
        before,
      });
    });
  }
}

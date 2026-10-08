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
import { normalizePartner, Row } from '../common/legacy-records';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { LegacyWriteLogService } from '../write-log/write-log.service';

const PARTNER_FIELDS = [
  'full_name',
  'short_name',
  'responsible',
  'phone1',
  'phone2',
  'fax',
  'tax_id',
  'postal_code',
  'address',
  'shipping_address',
  'invoice_title',
  'invoice_tax_id',
  'bank_name',
  'bank_account',
  'contact1',
  'contact2',
  'contact3',
  'start_date',
  'start_date_raw',
  'latest_transaction_date',
  'latest_transaction_date_raw',
  'email',
  'dxf_path',
  'main_product',
  'notes',
  'credit_limit_units',
  'balance_units',
];

// 客戶「更改編號」（Win7 2026-10-07 核對）：客戶換新編號，舊編號下的訂單、出貨、工件等一起換。
const CUSTOMER_CODE_COLUMNS: [string, string][] = [
  ['parts', 'customer_code'],
  ['drawing_groups', 'customer_code'],
  ['drawing_group_items', 'customer_code'],
  ['order_documents', 'customer_code'],
  ['order_items', 'legacy_factor_no'],
  ['sales_documents', 'customer_code'],
  ['sales_items', 'legacy_factor_no'],
  ['quote_documents', 'customer_code'],
  ['work_documents', 'customer_code'],
  ['receipt_documents', 'customer_code'],
];

function normalizeKind(kind: unknown): 'customer' | 'supplier' {
  if (kind !== 'customer' && kind !== 'supplier')
    throw new LegacyValidationError('客戶／廠商類型無效');
  return kind;
}

/** isin_vb6 partnerFromRow：units 換成 credit_limit、balance。 */
function partnerFromRow(row: Row | null) {
  if (!row) return null;
  const { credit_limit_units, balance_units, ...fields } = present(
    'partners',
    row,
  );
  return {
    ...fields,
    credit_limit: units(credit_limit_units),
    balance: units(balance_units),
  };
}

@Injectable()
export class LegacyPartnersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly writeLog: LegacyWriteLogService,
  ) {}

  async list(kind: unknown, search = '') {
    const db = new LegacyDb(this.dataSource.manager);
    const term = String(search).trim();
    const rows = term
      ? await db.all(
          `SELECT ${columns('partners')} FROM legacy_crm.partners
           WHERE kind = $1 AND (code ILIKE $2 ESCAPE '!' OR full_name ILIKE $2 ESCAPE '!'
             OR short_name ILIKE $2 ESCAPE '!' OR responsible ILIKE $2 ESCAPE '!' OR phone1 ILIKE $2 ESCAPE '!')
           ORDER BY code LIMIT 500`,
          [normalizeKind(kind), containsPattern(term)],
        )
      : await db.all(
          `SELECT ${columns('partners')} FROM legacy_crm.partners WHERE kind = $1 ORDER BY code LIMIT 500`,
          [normalizeKind(kind)],
        );
    return rows.map(partnerFromRow);
  }

  async get(
    kind: unknown,
    code: string,
    db = new LegacyDb(this.dataSource.manager),
  ) {
    const row = await db.get(
      `SELECT ${columns('partners')} FROM legacy_crm.partners WHERE kind = $1 AND code = $2`,
      [normalizeKind(kind), String(code)],
    );
    return partnerFromRow(row);
  }

  async create(input: unknown, context: LegacyRequestContext) {
    const partner = normalizePartner(input);
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const names = ['kind', 'code', ...PARTNER_FIELDS];
      await db
        .run(
          `INSERT INTO legacy_crm.partners (${names.join(', ')})
           VALUES (${names.map((_, index) => `$${index + 1}`).join(', ')})`,
          names.map((name) => partner[name]),
        )
        .catch((error) => rethrowUnique(error, '此類型已有相同編號'));
      const after = await this.get(partner.kind, partner.code as string, db);
      await this.writeLog.record(manager, context, {
        entityType: 'partner',
        entityKey: `${partner.kind}:${partner.code}`,
        action: 'create',
        after,
      });
      return after;
    });
  }

  async update(
    kind: string,
    code: string,
    input: unknown,
    context: LegacyRequestContext,
  ) {
    const partner = normalizePartner({ ...(input as object), code }, { kind });
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(partner.kind, partner.code as string, db);
      const assignments = PARTNER_FIELDS.map(
        (field, index) => `${field} = $${index + 1}`,
      ).join(', ');
      const count = await db.run(
        `UPDATE legacy_crm.partners SET ${assignments}, updated_at = now()
         WHERE kind = $${PARTNER_FIELDS.length + 1} AND code = $${PARTNER_FIELDS.length + 2}`,
        [
          ...PARTNER_FIELDS.map((field) => partner[field]),
          partner.kind,
          partner.code,
        ],
      );
      if (count === 0) throw new LegacyNotFoundError();
      const after = await this.get(partner.kind, partner.code as string, db);
      await this.writeLog.record(manager, context, {
        entityType: 'partner',
        entityKey: `${partner.kind}:${partner.code}`,
        action: 'update',
        before,
        after,
      });
      return after;
    });
  }

  async remove(kind: string, code: string, context: LegacyRequestContext) {
    const normalizedKind = normalizeKind(kind);
    await this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get(normalizedKind, code, db);
      const count = await db.run(
        'DELETE FROM legacy_crm.partners WHERE kind = $1 AND code = $2',
        [normalizedKind, String(code)],
      );
      if (count === 0) throw new LegacyNotFoundError();
      await this.writeLog.record(manager, context, {
        entityType: 'partner',
        entityKey: `${normalizedKind}:${code}`,
        action: 'delete',
        before,
      });
    });
  }

  async renameCustomer(
    code: string,
    newCode: unknown,
    context: LegacyRequestContext,
  ) {
    const from = String(code ?? '').trim();
    const to = newCode == null ? '' : String(newCode).trim();
    if (!to) throw new LegacyValidationError('新的編號不可空白');
    if (Array.from(to).length > 250)
      throw new LegacyValidationError('新的編號最多 250 個字元');
    if (Array.from(to).length > 10)
      throw new LegacyValidationError('客戶編號最多 10 個字元');
    return this.dataSource.transaction(async (manager) => {
      const db = new LegacyDb(manager);
      const before = await this.get('customer', from, db);
      if (!before) throw new LegacyNotFoundError();
      if (to === from) return before;
      if (await this.get('customer', to, db))
        throw new LegacyValidationError(`客戶編號${to}已經存在`);
      await db.run(
        `UPDATE legacy_crm.partners SET code = $1, updated_at = now() WHERE kind = 'customer' AND code = $2`,
        [to, from],
      );
      const moved: Record<string, number> = {};
      for (const [table, column] of CUSTOMER_CODE_COLUMNS) {
        const count = await db.run(
          `UPDATE legacy_crm.${table} SET ${column} = $1 WHERE ${column} = $2`,
          [to, from],
        );
        if (count) moved[`${table}.${column}`] = count;
      }
      const after = await this.get('customer', to, db);
      await this.writeLog.record(manager, context, {
        entityType: 'partner',
        entityKey: `customer:${from}`,
        action: 'rename',
        before,
        after,
        sideEffects: { renamed: { from, to }, moved },
      });
      return after;
    });
  }
}

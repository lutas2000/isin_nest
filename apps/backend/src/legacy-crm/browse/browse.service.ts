import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LegacyDb, units } from '../common/legacy-db';
import { LegacyNotFoundError } from '../common/legacy-errors';
import { Row } from '../common/legacy-records';
import { displayRocDate, parseRocDate } from '../common/roc-date';
import { LegacyValidationError } from '../common/legacy-validation.error';

/**
 * 舊版表單的資料瀏覽（isin_vb6 server/legacyBrowse.mjs，docs/legacy-ui-spec.md）：
 * 頭筆／上筆／下筆／尾筆依主鍵文字順序移動（欄位為 C 排序，與舊版相同）；
 * 查詢視窗列出編號（與客戶）符合的資料，單據依日期新到舊、主檔依主鍵。
 */
interface BrowseSpec {
  table: string;
  key: string;
  sort: string;
  party: string | null;
  select: string;
  queryOrder: string;
  /** 查詢結果中要轉成民國字串的日期欄別名 → 資料表日期欄 */
  date?: string;
  where?: string;
  numberColumn?: string;
  numericKey?: boolean;
}

const documentType = (
  table: string,
  key: string,
  date: string,
  select: string,
): BrowseSpec => ({
  table,
  key,
  sort: key,
  party: 'customer_code',
  select: `${select}, ${date}::text AS date, ${date}_raw AS date_raw`,
  queryOrder: `${date} DESC NULLS LAST, ${key} DESC`,
  date,
});
const masterType = (
  table: string,
  key: string,
  select: string,
  extra: Partial<BrowseSpec> = {},
): BrowseSpec => ({
  table,
  key,
  sort: key,
  party: null,
  select,
  queryOrder: key,
  ...extra,
});
const partnerSelect =
  'code AS number, full_name AS name, responsible, phone1 AS phone, main_product';

const TYPES: Record<string, BrowseSpec> = {
  orders: documentType(
    'order_documents',
    'order_no',
    'order_date',
    'order_no AS number, customer_name AS party, actor_name AS actor',
  ),
  sales: documentType(
    'sales_documents',
    'sale_no',
    'sale_date',
    'sale_no AS number, customer_name AS party, actor_name AS actor',
  ),
  receipts: documentType(
    'receipt_documents',
    'receipt_no',
    'receipt_date',
    'receipt_no AS number, customer_name AS party, actor_name AS actor',
  ),
  quotes: documentType(
    'quote_documents',
    'quote_no',
    'quote_date',
    'quote_no AS number, customer_name AS party, actor_name AS actor',
  ),
  'work-orders': documentType(
    'work_documents',
    'work_no',
    'transfer_date',
    'work_no AS number, customer_name AS party, actor_name AS actor',
  ),
  groups: documentType(
    'drawing_groups',
    'group_no',
    'created_date',
    'group_no AS number, customer_name AS party, customer_drawing_no AS drawing',
  ),
  customers: masterType('partners', 'code', partnerSelect, {
    where: "kind = 'customer'",
  }),
  suppliers: masterType('partners', 'code', partnerSelect, {
    where: "kind = 'supplier'",
  }),
  parts: masterType(
    'parts',
    'drawing_no',
    'drawing_no AS number, customer_model, material, thickness, customer_code',
  ),
  banks: masterType(
    'banks',
    'code',
    'code AS number, full_name AS name, short_name, phone1 AS phone',
  ),
  phrases: masterType('phrases', 'phrase_no', 'phrase_no AS number, content'),
  'postal-codes': masterType(
    'postal_codes',
    'postal_code',
    'postal_code AS number, region_name',
  ),
  // 材質沒有編號：依材質、厚度排列，以 id 識別一筆。
  materials: masterType(
    'materials',
    'id',
    'id AS number, material, thickness, product_name, category',
    {
      sort: `(material || chr(31) || thickness || chr(31) || lpad(id::text, 12, '0')) COLLATE "C"`,
      numberColumn: 'material',
      queryOrder: 'material, thickness, id',
      numericKey: true,
    },
  ),
};

const QUERY_LIMIT = 500;
const NUMBERED_TYPES = ['orders', 'sales', 'receipts', 'quotes', 'work-orders'];

function browseType(type: string) {
  const spec = TYPES[type];
  if (!spec) throw new LegacyNotFoundError('找不到資料類別');
  return spec;
}

function text(value: unknown, limit: number) {
  const result = String(value ?? '').trim();
  if (result.length > limit) throw new LegacyValidationError('查詢條件過長');
  return result;
}

@Injectable()
export class LegacyBrowseService {
  constructor(private readonly dataSource: DataSource) {}

  private db() {
    return new LegacyDb(this.dataSource.manager);
  }

  /** 按下移動按鈕後要顯示的鍵；該方向沒有資料時為 null。空白表單按下筆從第一筆、按上筆從最後一筆開始。 */
  async navigate(
    type: string,
    { direction, from }: { direction?: string; from?: string } = {},
  ) {
    const spec = browseType(type);
    const current = text(from, 40);
    const scope = spec.where ? [spec.where] : [];
    const keyMatch = spec.numericKey
      ? `${spec.key}::text = $1`
      : `${spec.key} = $1`;
    const position = `COALESCE((SELECT ${spec.sort} FROM legacy_crm.${spec.table} WHERE ${keyMatch}${
      spec.where ? ` AND ${spec.where}` : ''
    }), $2)`;
    const pick = async (
      conditions: string[],
      order: 'ASC' | 'DESC',
      values: unknown[] = [],
    ) => {
      const where = [...scope, ...conditions];
      const row = await this.db().get<{ value: unknown }>(
        `SELECT ${spec.key} AS value FROM legacy_crm.${spec.table}
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY ${spec.sort} ${order} LIMIT 1`,
        values,
      );
      return row?.value ?? null;
    };
    let value: unknown;
    if (direction === 'first' || (direction === 'next' && !current))
      value = await pick([], 'ASC');
    else if (direction === 'last' || (direction === 'previous' && !current))
      value = await pick([], 'DESC');
    else if (direction === 'next')
      value = await pick([`${spec.sort} > ${position}`], 'ASC', [
        current,
        current,
      ]);
    else if (direction === 'previous')
      value = await pick([`${spec.sort} < ${position}`], 'DESC', [
        current,
        current,
      ]);
    else throw new LegacyValidationError('不支援的移動方向');
    return { number: value == null ? null : String(value) };
  }

  /** 查詢視窗：編號（材質為材質欄）以輸入文字開頭、單據另可限定客戶。 */
  async query(
    type: string,
    { number, party }: { number?: string; party?: string } = {},
  ) {
    const spec = browseType(type);
    const where = spec.where ? [spec.where] : [];
    const values: unknown[] = [];
    const numberText = text(number, 40);
    const partyText = text(party, 20);
    if (numberText) {
      values.push(`${numberText.replace(/[!%_]/g, '!$&')}%`);
      where.push(
        `${spec.numberColumn ?? spec.key} ILIKE $${values.length} ESCAPE '!'`,
      );
    }
    if (partyText && spec.party) {
      values.push(partyText);
      where.push(`${spec.party} = $${values.length}`);
    }
    const rows = await this.db().all(
      `SELECT ${spec.select} FROM legacy_crm.${spec.table}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ${spec.queryOrder} LIMIT ${QUERY_LIMIT + 1}`,
      values,
    );
    const items = rows.slice(0, QUERY_LIMIT).map((row) => {
      if (!spec.date) return row;
      const { date, date_raw, ...rest } = row;
      return {
        ...rest,
        date: displayRocDate(date as string | null, date_raw as string | null),
      };
    });
    return { items, truncated: rows.length > QUERY_LIMIT, limit: QUERY_LIMIT };
  }

  /**
   * 新增單據的單號（2026-10-07 Win7 核對）：民國年後兩位、月、日，再加當天的兩位流水號，例如 15100734 之後是 15100735。
   */
  async nextNumber(type: string, { date }: { date?: string } = {}) {
    if (!NUMBERED_TYPES.includes(type)) browseType('');
    const { table, key } = browseType(type);
    const parts = String(date ?? '')
      .trim()
      .split('.');
    const [year, month, day] = parts.map((part) => Number(part));
    if (
      parts.length !== 3 ||
      !(year > 0) ||
      !(month >= 1 && month <= 12) ||
      !(day >= 1 && day <= 31)
    ) {
      return { number: '' };
    }
    const prefix = [year % 100, month, day]
      .map((value) => String(value).padStart(2, '0'))
      .join('');
    const row = await this.db().get<{ serial: number | null }>(
      `SELECT max(CAST(substr(${key}, 7) AS INTEGER)) AS serial FROM legacy_crm.${table}
       WHERE length(${key}) = 8 AND substr(${key}, 1, 6) = $1 AND substr(${key}, 7) ~ '^[0-9]{2}$'`,
      [prefix],
    );
    return {
      number: `${prefix}${String((row?.serial ?? 0) + 1).padStart(2, '0')}`,
    };
  }

  // ---- F1 輔助輸入（isin_vb6 server/legacyAssist.mjs，2026-10-07 Win7 核對） ----

  async assist(kind: string, options: Record<string, string | undefined> = {}) {
    const assist = ASSISTS[kind];
    if (!assist) throw new LegacyNotFoundError('找不到輔助輸入類別');
    return { items: await assist(this.db(), options) };
  }
}

const LIMIT = 2000;
const like = (value: string) =>
  `${value.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
const filled = (value: unknown) => String(value ?? '').trim() !== '';

/** 由 [sql, 值] 組 WHERE；值空白的條件略過，只有 [sql] 的條件一律套用。參數依序編號為 $1…。 */
function where(conditions: ([string] | [string, unknown])[]) {
  const used = conditions.filter(
    (condition) => condition.length === 1 || filled(condition[1]),
  );
  const params: unknown[] = [];
  const clauses = used.map((condition) => {
    if (condition.length === 1) return condition[0];
    params.push(String(condition[1]).trim());
    return condition[0].replace('?', `$${params.length}`);
  });
  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

const showDate = (row: Row, column: string, alias = column) => {
  const { [`${column}_raw`]: raw, ...rest } = row;
  return {
    ...rest,
    [alias]: displayRocDate(row[column] as string | null, raw as string | null),
  };
};

type Assist = (
  db: LegacyDb,
  options: Record<string, string | undefined>,
) => Promise<unknown[]>;

async function partnerRows(db: LegacyDb, kind: string, prefix?: string) {
  const filter = where([
    ['kind = ?', kind],
    ["code ILIKE ? ESCAPE '\\'", prefix && like(prefix.trim())],
  ]);
  const rows = await db.all(
    `SELECT code, short_name, phone1 AS phone, latest_transaction_date::text AS latest_transaction_date,
            latest_transaction_date_raw
     FROM legacy_crm.partners ${filter.clause} ORDER BY code LIMIT ${LIMIT}`,
    filter.params,
  );
  return rows.map((row) => {
    const { latest_transaction_date, latest_transaction_date_raw, ...rest } =
      row;
    return {
      ...rest,
      latest: displayRocDate(
        latest_transaction_date as string | null,
        latest_transaction_date_raw as string | null,
      ),
    };
  });
}

const ASSISTS: Record<string, Assist> = {
  customer: (db, { prefix }) => partnerRows(db, 'customer', prefix),
  supplier: (db, { prefix }) => partnerRows(db, 'supplier', prefix),

  /**
   * 員工：全系統只有一個 staff 表（規劃 2.3）。列出在職、且有舊版員工編號（legacy_crm_code）的員工；
   * 沒有編號的不能選。
   */
  employee(db, { prefix }) {
    const filter = where([
      ['legacy_crm_code IS NOT NULL'],
      ['(stop_work IS NULL OR stop_work > current_date)'],
      ["legacy_crm_code ILIKE ? ESCAPE '\\'", prefix && like(prefix.trim())],
    ]);
    return db.all(
      `SELECT legacy_crm_code AS code, name FROM public.staff ${filter.clause}
       ORDER BY legacy_crm_code COLLATE "C" LIMIT ${LIMIT}`,
      filter.params,
    );
  },

  // 單據表單列出該客戶的工件，圖號新到舊；工件建檔從輸入的開頭依圖號順序。沒有客戶也沒有開頭時不列。
  async part(db, { prefix, customer, order }) {
    if (!filled(prefix) && !filled(customer)) return [];
    const filter = where([
      ['customer_code = ?', customer],
      ["drawing_no ILIKE ? ESCAPE '\\'", prefix && like(prefix.trim())],
    ]);
    return db.all(
      `SELECT drawing_no, customer_model, material, thickness, unit, customer_code
       FROM legacy_crm.parts ${filter.clause} ORDER BY drawing_no ${order === 'asc' ? 'ASC' : 'DESC'} LIMIT ${LIMIT}`,
      filter.params,
    );
  },

  // 客戶型號至少要輸入第一個字。
  async 'part-model'(db, { prefix }) {
    if (!filled(prefix)) return [];
    return db.all(
      `SELECT drawing_no, customer_model, material, thickness, unit, customer_code
       FROM legacy_crm.parts WHERE customer_model ILIKE $1 ESCAPE '\\' ORDER BY drawing_no DESC LIMIT ${LIMIT}`,
      [like(String(prefix).trim())],
    );
  },

  material(db) {
    return db.all(
      `SELECT material, thickness, product_name AS name, category FROM legacy_crm.materials
       ORDER BY material, thickness, id LIMIT ${LIMIT}`,
    );
  },

  group(db, { customer }) {
    const filter = where([['customer_code = ?', customer]]);
    return db.all(
      `SELECT group_no, customer_drawing_no, customer_name FROM legacy_crm.drawing_groups
       ${filter.clause} ORDER BY group_no LIMIT ${LIMIT}`,
      filter.params,
    );
  },

  // 圖組建檔自己的圖組編號 F1：從輸入的開頭依編號順序。
  async 'group-file'(db, { prefix }) {
    const filter = where([
      ["group_no ILIKE ? ESCAPE '\\'", prefix && like(prefix.trim())],
    ]);
    const rows = await db.all(
      `SELECT group_no, customer_drawing_no, customer_name, created_date::text AS created_date, created_date_raw
       FROM legacy_crm.drawing_groups ${filter.clause} ORDER BY group_no LIMIT ${LIMIT}`,
      filter.params,
    );
    return rows.map((row) => showDate(row, 'created_date'));
  },

  async bank(db) {
    const rows = await db.all<{
      code: string;
      account_no: string;
      short_name: string;
    }>(
      `SELECT code, account_no, short_name FROM legacy_crm.banks ORDER BY code LIMIT ${LIMIT}`,
    );
    return rows.map((row) => ({
      account: String(row.account_no ?? '').trim() || row.code,
      short_name: row.short_name,
    }));
  },

  phrase(db, { prefix }) {
    const filter = where([
      ["phrase_no ILIKE ? ESCAPE '\\'", prefix && like(prefix.trim())],
    ]);
    return db.all(
      `SELECT phrase_no AS code, content FROM legacy_crm.phrases ${filter.clause} ORDER BY phrase_no LIMIT ${LIMIT}`,
      filter.params,
    );
  },

  // 未結案且還有未出貨的訂單，交貨日早的在前，各附明細。
  async 'open-order'(db, { prefix, customer }) {
    const filter = where([
      ["btrim(coalesce(o.closed, '')) = ''"],
      ['o.customer_code = ?', customer],
      ["o.order_no ILIKE ? ESCAPE '\\'", prefix && like(prefix.trim())],
    ]);
    const orders = await db.all(
      `SELECT o.order_no, o.customer_code, o.customer_name, o.order_date::text AS order_date, o.order_date_raw,
              o.delivery_date::text AS delivery_date, o.delivery_date_raw,
              o.actor_name, o.payment_method, o.delivery_method, o.note
       FROM legacy_crm.order_documents o
       ${filter.clause}
         AND EXISTS (SELECT 1 FROM legacy_crm.order_items i WHERE i.order_no = o.order_no
                     AND coalesce(i.shipped_quantity_units, 0) < coalesce(i.quantity_units, 0))
       ORDER BY o.delivery_date NULLS FIRST, o.order_no LIMIT ${LIMIT}`,
      filter.params,
    );
    const result: unknown[] = [];
    for (const order of orders) {
      const lines = await db.all(
        `SELECT drawing_no, customer_model, material, thickness, outsource, unit, quantity_units, shipped_quantity_units
         FROM legacy_crm.order_items WHERE order_no = $1 ORDER BY line_no`,
        [order.order_no],
      );
      result.push({
        ...showDate(showDate(order, 'order_date'), 'delivery_date'),
        lines: lines.map(
          ({ quantity_units, shipped_quantity_units, ...rest }) => ({
            ...rest,
            quantity: units(quantity_units),
            shipped: units(shipped_quantity_units),
          }),
        ),
      });
    }
    return result;
  },

  // 工作登錄新增的「訂單轉成工作單」：起訖日期內（可限定客戶）的訂單，依單號，各附工作單要的明細。
  async 'order-range'(db, { from, to, customer }) {
    const date = (value: string | undefined, label: string) => {
      if (!filled(value)) return undefined;
      const parsed = parseRocDate(value);
      if (!parsed) throw new LegacyValidationError(`${label}不是有效日期`);
      return parsed;
    };
    const filter = where([
      ['o.order_date >= ?::date', date(from, '起始日期')],
      ['o.order_date <= ?::date', date(to, '截止日期')],
      ['o.customer_code = ?', customer],
    ]);
    const orders = await db.all(
      `SELECT o.order_no, o.order_date::text AS order_date, o.order_date_raw,
              o.delivery_date::text AS delivery_date, o.delivery_date_raw, o.customer_code, o.customer_name
       FROM legacy_crm.order_documents o ${filter.clause} ORDER BY o.order_no LIMIT ${LIMIT}`,
      filter.params,
    );
    const result: unknown[] = [];
    for (const order of orders) {
      const lines = await db.all(
        `SELECT drawing_no, material, thickness, outsource, quantity_units
         FROM legacy_crm.order_items WHERE order_no = $1 ORDER BY line_no`,
        [order.order_no],
      );
      result.push({
        ...showDate(showDate(order, 'order_date'), 'delivery_date'),
        lines: lines.map(({ quantity_units, ...rest }) => ({
          ...rest,
          quantity: units(quantity_units),
        })),
      });
    }
    return result;
  },

  /**
   * 訂單登錄 F8「報價記錄」：舊版讀 quotehis.mdb（檔案清理時由報價明細依 date_r、qno、sn 重建，
   * 每個客戶型號／材質／厚度只留最新一筆），列表 `order by date_r desc, dwg_ref`。這裡直接由報價明細算出。
   */
  async 'quote-history'(db, { customer }) {
    if (!filled(customer)) return [];
    const rows = await db.all(
      `SELECT quote_no, line_no, customer_model, material, thickness, summary, quantity_units, unit_price_units,
              quote_date, quote_date_raw
       FROM (
         SELECT i.*, d.quote_date::text AS quote_date, d.quote_date_raw, d.quote_date AS date_key,
                row_number() OVER (
                  PARTITION BY i.customer_model, i.material, i.thickness
                  ORDER BY d.quote_date DESC NULLS LAST, d.quote_no DESC, i.line_no DESC
                ) AS latest
         FROM legacy_crm.quote_items i JOIN legacy_crm.quote_documents d ON d.quote_no = i.quote_no
         WHERE d.customer_code = $1
       ) latest_quotes
       WHERE latest = 1
       ORDER BY date_key DESC NULLS LAST, customer_model, quote_no DESC, line_no DESC LIMIT ${LIMIT}`,
      [String(customer).trim()],
    );
    return rows.map((row) => {
      const {
        quantity_units,
        unit_price_units,
        quote_date,
        quote_date_raw,
        ...rest
      } = row;
      return {
        ...rest,
        quantity: units(quantity_units),
        unit_price: units(unit_price_units),
        quote_date: displayRocDate(
          quote_date as string | null,
          quote_date_raw as string | null,
        ),
      };
    });
  },
};

/**
 * 從 legacy order.mdb（gtable / itable）遷移至 PostgreSQL `order` / `order_item`。
 *
 * 與 migrate-quote-from-access.ts 類似，但 Order 有多個必填欄位、OrderItem 為整數主鍵、
 * order.mdb 的 itable 通常無 PRICE 欄（單價改由 SOOK 或 0）。
 *
 * 環境變數（可選）：
 *   ORDER_MIGRATION_DEFAULT_SHIPPING_METHOD — 預設運送方式（預設：客戶取件）
 *   ORDER_MIGRATION_DEFAULT_PAYMENT_METHOD — 預設付款方式（預設：月結）
 *   ORDER_MIGRATION_BATCH_SIZE — 每批自 Access 讀取列數（預設 3000）
 *   ACCESS_FILE_PATH — 未傳路徑參數時使用
 *   ACCESS_DB_PASSWORD — Access 密碼
 *   SKIP_COUNT — 跳過 gtable 前 N 列（可用 --skip=N 覆寫）
 *   ONLY_MODE — order | order-item（可用 --only= 覆寫）
 *
 * 用法：
 *   npm run migrate-order-from-access -- /nas/isin/order.mdb
 *   npm run migrate-order-from-access -- /nas/isin/order.mdb --only=order --skip=0
 *   npm run migrate-order-from-access -- /nas/isin/order.mdb --only=order-item
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import MDBReader from 'mdb-reader';
import iconv from 'iconv-lite';
import { Order, OrderStatus } from '../apps/backend/src/crm/order/entities/order.entity';
import { OrderItem } from '../apps/backend/src/crm/order-item/entities/order-item.entity';
import { Customer } from '../apps/backend/src/crm/customer/entities/customer.entity';
import { Contact } from '../apps/backend/src/crm/contact/entities/contact.entity';
import { Staff } from '../apps/backend/src/hr/staff/entities/staff.entity';
import { User } from '../apps/backend/src/auth/entities/user.entity';
import { UserFeature } from '../apps/backend/src/auth/entities/user-feature.entity';
import { Feature } from '../apps/backend/src/auth/entities/feature.entity';
import { Quote } from '../apps/backend/src/crm/quote/entities/quote.entity';
import { QuoteItem } from '../apps/backend/src/crm/quote-item/entities/quote-item.entity';
import { ProcessingWorkOrder } from '../apps/backend/src/crm/processing-work-order/entities/processing-work-order.entity';
import { Processing } from '../apps/backend/src/crm/processing/entities/processing.entity';
import { Vendor } from '../apps/backend/src/crm/vendor/entities/vendor.entity';

/** TypeORM 需載入關聯鏈上所有 entity（僅註冊腳本用到的 repository 仍不夠）。 */
const MIGRATION_ENTITIES = [
  Order,
  OrderItem,
  Customer,
  Contact,
  Staff,
  User,
  UserFeature,
  Feature,
  Quote,
  QuoteItem,
  ProcessingWorkOrder,
  Processing,
  Vendor,
] as const;

const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
};

const TARGET_DB = process.env.DB_NAME || process.env.DB_DATABASE || 'isin_db';
const ACCESS_DB_PASSWORD = process.env.ACCESS_DB_PASSWORD || '';

function firstPositionalArg(): string | undefined {
  return process.argv.slice(2).find((a) => !a.startsWith('--'));
}

const ACCESS_FILE_PATH =
  firstPositionalArg() ||
  process.env.ACCESS_FILE_PATH ||
  '/nas/isin/order.mdb';

const SKIP_COUNT = parseInt(
  process.argv.find((arg) => arg.startsWith('--skip='))?.split('=')[1] ||
    process.env.SKIP_COUNT ||
    '0',
  10,
);

const ONLY_MODE =
  process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1] ||
  process.env.ONLY_MODE ||
  undefined;

const BATCH_SIZE = Math.max(
  100,
  parseInt(process.env.ORDER_MIGRATION_BATCH_SIZE || '3000', 10) || 3000,
);

const DEFAULT_SHIPPING =
  process.env.ORDER_MIGRATION_DEFAULT_SHIPPING_METHOD || '客戶取件';
const DEFAULT_PAYMENT =
  process.env.ORDER_MIGRATION_DEFAULT_PAYMENT_METHOD || '月結';

const DEFAULT_FACTOR_NO = '111';

/** 從 gtable 列擷取與客戶（factory）相關的 Access 欄位，供錯誤時輸出。 */
function factoryFieldsFromGtable(row: Record<string, unknown>) {
  return {
    QNO: toOptionalTrimmedString(row.QNO),
    FACTOR_NO: toOptionalTrimmedString(row.FACTOR_NO),
    FACTOR: toOptionalTrimmedString(row.FACTOR),
    DATE_R: toOptionalTrimmedString(row.DATE_R),
    DATE_E: toOptionalTrimmedString(row.DATE_E),
    ACTOR_NO: toOptionalTrimmedString(row.ACTOR_NO),
    ACTOR: toOptionalTrimmedString(row.ACTOR),
  };
}

/** customer 無法對應時中止遷移並印出 Access 來源資料。 */
function abortOnMissingCustomer(
  reason: string,
  row: Record<string, unknown>,
): never {
  console.error(`遷移中止：${reason}`);
  console.error('Access 來源 factory 相關欄位：');
  console.error(JSON.stringify(factoryFieldsFromGtable(row), null, 2));
  console.error('完整 gtable 列：');
  console.error(JSON.stringify(row, null, 2));
  process.exit(1);
}

/** 從 gtable 列擷取與經辦人員（staff）相關的 Access 欄位，供錯誤時輸出。 */
function staffFieldsFromGtable(row: Record<string, unknown>) {
  return {
    QNO: toOptionalTrimmedString(row.QNO),
    ACTOR_NO: toOptionalTrimmedString(row.ACTOR_NO),
    ACTOR: toOptionalTrimmedString(row.ACTOR),
    DATE_R: toOptionalTrimmedString(row.DATE_R),
    FACTOR_NO: toOptionalTrimmedString(row.FACTOR_NO),
    FACTOR: toOptionalTrimmedString(row.FACTOR),
  };
}

/** staff 無法對應時中止遷移並印出 Access 來源資料。 */
function abortOnMissingStaff(
  reason: string,
  row: Record<string, unknown>,
): never {
  console.error(`遷移中止：${reason}`);
  console.error('Access 來源 staff 相關欄位：');
  console.error(JSON.stringify(staffFieldsFromGtable(row), null, 2));
  console.error('完整 gtable 列：');
  console.error(JSON.stringify(row, null, 2));
  process.exit(1);
}

function cleanString(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  let cleaned = value
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  if (cleaned === '') {
    return undefined;
  }
  try {
    const buffer = Buffer.from(cleaned, 'utf8');
    const validated = buffer.toString('utf8');
    if (validated.length === 0) {
      return undefined;
    }
    const final = validated.replace(/\0/g, '').trim();
    return final || undefined;
  } catch {
    try {
      const latin1Buffer = Buffer.from(cleaned, 'latin1');
      const repaired = latin1Buffer.toString('utf8');
      const final = repaired
        .replace(/\0/g, '')
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        .trim();
      return final || undefined;
    } catch {
      return undefined;
    }
  }
}

function convertBig5ToUtf8(value: unknown): unknown {
  if (typeof value === 'string' && value.length > 0) {
    try {
      const buffer = Buffer.from(value, 'latin1');
      return iconv.decode(buffer, 'big5');
    } catch {
      return value;
    }
  }
  return value;
}

function convertObjectBig5ToUtf8(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'string') {
    return convertBig5ToUtf8(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectBig5ToUtf8(item));
  }
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
      converted[key] = convertObjectBig5ToUtf8((obj as Record<string, unknown>)[key]);
    }
    return converted;
  }
  return obj;
}

/** 民國年 "100.01.03"（可含前导空白）→ Date */
function convertRocDateToDate(rocDateStr: string | null | undefined): Date | undefined {
  if (!rocDateStr || typeof rocDateStr !== 'string') {
    return undefined;
  }
  const trimmed = rocDateStr.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return undefined;
    }
    const rocYear = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(rocYear) || isNaN(month) || isNaN(day)) {
      return undefined;
    }
    const adYear = rocYear + 1911;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }
    const date = new Date(adYear, month - 1, day);
    if (
      date.getFullYear() !== adYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return undefined;
    }
    return date;
  } catch {
    return undefined;
  }
}

/** 民國年 → ISO 日期字串 YYYY-MM-DD（供 date 欄） */
function convertRocDateToIsoDateString(
  rocDateStr: string | null | undefined,
): string | undefined {
  const d = convertRocDateToDate(rocDateStr);
  if (!d) {
    return undefined;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseClosedFlag(closed: unknown): boolean {
  if (closed === null || closed === undefined) {
    return false;
  }
  const s = String(closed).trim().toLowerCase();
  return ['y', '1', 'true', 'yes', '-1'].includes(s);
}

function toOptionalTrimmedString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

function mergeOrderNotes(row: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const pcon = cleanString(toOptionalTrimmedString(row.PCON));
  const notes = cleanString(toOptionalTrimmedString(row.NOTES));
  const note2 = cleanString(toOptionalTrimmedString(row.NOTE2));
  if (pcon) {
    parts.push(pcon);
  }
  if (notes) {
    parts.push(notes);
  }
  if (note2) {
    parts.push(note2);
  }
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join('\n');
}

function numericOrZero(v: unknown): number {
  if (v === null || v === undefined) {
    return 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function convertGtableToOrder(
  row: Record<string, unknown>,
  opts: {
    staffId: string;
    customerId: string;
    quoteId?: string;
    shippingMethod: string;
    paymentMethod: string;
  },
): Partial<Order> {
  const qno = toOptionalTrimmedString(row.QNO);
  const createdAt = convertRocDateToDate(toOptionalTrimmedString(row.DATE_R) as string);
  const deliveryDeadline = convertRocDateToIsoDateString(
    toOptionalTrimmedString(row.DATE_E) as string,
  );

  const order: Partial<Order> = {
    id: qno,
    quoteId: opts.quoteId,
    staffId: opts.staffId,
    customerId: opts.customerId,
    shippingMethod: opts.shippingMethod.slice(0, 50),
    paymentMethod: opts.paymentMethod.slice(0, 50),
    deliveryDeadline,
    notes: mergeOrderNotes(row),
    amount: 0,
    status: OrderStatus.PENDING,
    isCompleted: parseClosedFlag(row.CLOSED),
  };

  if (createdAt) {
    (order as { createdAt?: Date }).createdAt = createdAt;
  }

  return order;
}

function convertItableToOrderItem(
  row: Record<string, unknown>,
  orderId: string,
): Partial<OrderItem> {
  const qty = Math.round(numericOrZero(row.QTY));
  const thickRaw = row.THICK;
  let thickness: number | undefined;
  if (thickRaw !== null && thickRaw !== undefined && String(thickRaw).trim() !== '') {
    const t = Number(thickRaw);
    thickness = Number.isFinite(t) ? t : undefined;
  }

  let unitPrice = numericOrZero(row.SOOK);
  if (!unitPrice && row.PRICE != null) {
    unitPrice = numericOrZero(row.PRICE);
  }

  const buy = cleanString(toOptionalTrimmedString(row.BUY));
  const substitute = buy ? buy.slice(0, 3) : undefined;

  let source = cleanString(toOptionalTrimmedString(row.SOURCE)) || 'legacy';
  if (source.length > 50) {
    source = source.slice(0, 50);
  }

  let unit = cleanString(toOptionalTrimmedString(row.UNIT)) || '片';
  if (unit.length > 20) {
    unit = unit.slice(0, 20);
  }

  let drawingNumber = cleanString(toOptionalTrimmedString(row.DWG_NO));
  if (drawingNumber && drawingNumber.length > 100) {
    drawingNumber = drawingNumber.slice(0, 100);
  }

  let customerFile = cleanString(toOptionalTrimmedString(row.DWG_REF));
  if (customerFile && customerFile.length > 500) {
    customerFile = customerFile.slice(0, 500);
  }

  let material = cleanString(toOptionalTrimmedString(row.METAL));
  if (material && material.length > 100) {
    material = material.slice(0, 100);
  }

  return {
    orderId,
    drawingNumber,
    customerFile,
    material,
    thickness,
    quantity: qty,
    unit,
    substitute,
    source,
    unitPrice,
    status: 'TODO',
    nestingId: null,
  };
}

async function recalculateOrderAmounts(dataSource: DataSource, orderIds: string[]): Promise<void> {
  const unique = [...new Set(orderIds.filter(Boolean))];
  if (unique.length === 0) {
    return;
  }
  const chunkSize = 400;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    await dataSource.query(
      `
      UPDATE "order" AS o
      SET amount = COALESCE(s.sum_amt, 0)
      FROM (
        SELECT order_id::text AS oid,
               SUM(quantity::numeric * unit_price::numeric)::numeric AS sum_amt
        FROM order_item
        WHERE order_id = ANY($1::varchar[])
        GROUP BY order_id
      ) AS s
      WHERE o.id = s.oid
    `,
      [chunk],
    );
  }
}

async function migrateOrderFromAccess() {
  let targetDataSource: DataSource | null = null;

  try {
    if (!ACCESS_FILE_PATH) {
      console.error('請提供 order.mdb 路徑（第一個參數）或設定 ACCESS_FILE_PATH');
      process.exit(1);
    }

    if (ONLY_MODE && ONLY_MODE !== 'order' && ONLY_MODE !== 'order-item') {
      console.error('--only 必須為 order 或 order-item');
      process.exit(1);
    }

    console.log('開始從 Access 遷移訂單…');
    console.log(`Access: ${ACCESS_FILE_PATH}`);
    console.log(`DB: ${TARGET_DB} @ ${dbConfig.host}:${dbConfig.port}`);
    console.log(`批次大小: ${BATCH_SIZE}`);
    if (ONLY_MODE) {
      console.log(`模式: 僅 ${ONLY_MODE}`);
    }
    if (SKIP_COUNT > 0) {
      console.log(`gtable 將跳過前 ${SKIP_COUNT} 列`);
    }

    let reader: MDBReader;
    try {
      const buffer = readFileSync(ACCESS_FILE_PATH);
      const options = ACCESS_DB_PASSWORD ? { password: ACCESS_DB_PASSWORD } : undefined;
      reader = new MDBReader(buffer, options);
      console.log('Access 檔案讀取成功');
    } catch (e) {
      console.error('讀取 Access 失敗', e);
      process.exit(1);
    }

    const tableNames = reader.getTableNames({ normalTables: true });
    const needG = !ONLY_MODE || ONLY_MODE === 'order';
    const needI = !ONLY_MODE || ONLY_MODE === 'order-item';
    if (needG && !tableNames.includes('gtable')) {
      console.error('找不到 gtable');
      process.exit(1);
    }
    if (needI && !tableNames.includes('itable')) {
      console.error('找不到 itable');
      process.exit(1);
    }

    const gtable = needG ? reader.getTable('gtable') : null;
    const itable = needI ? reader.getTable('itable') : null;

    targetDataSource = new DataSource({
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: dbConfig.password,
      database: TARGET_DB,
      entities: [...MIGRATION_ENTITIES],
      synchronize: false,
      extra: {
        max: 10,
        connectionTimeoutMillis: 60000,
        idleTimeoutMillis: 30000,
      },
    });

    await targetDataSource.initialize();
    console.log('PostgreSQL 連線成功');

    const orderRepo = targetDataSource.getRepository(Order);
    const orderItemRepo = targetDataSource.getRepository(OrderItem);
    const staffRepo = targetDataSource.getRepository(Staff);
    const customerRepo = targetDataSource.getRepository(Customer);
    const quoteRepo = targetDataSource.getRepository(Quote);

    let orderOk = 0;
    let orderSkip = 0;
    let orderErr = 0;
    let itemOk = 0;
    let itemSkip = 0;
    let itemErr = 0;

    const ordersNeedingAmountRecalc = new Set<string>();

    if (!ONLY_MODE || ONLY_MODE === 'order') {
      const totalRows = gtable!.rowCount;
      for (let offset = SKIP_COUNT; offset < totalRows; offset += BATCH_SIZE) {
        const limit = Math.min(BATCH_SIZE, totalRows - offset);
        const batch = gtable!.getData({
          rowOffset: offset,
          rowLimit: limit,
        }) as Record<string, unknown>[];

        for (const raw of batch) {
          const row = convertObjectBig5ToUtf8(raw) as Record<string, unknown>;
          try {
            const id = toOptionalTrimmedString(row.QNO);
            if (!id) {
              orderSkip++;
              continue;
            }

            const existing = await orderRepo.findOne({ where: { id } });
            if (existing) {
              orderSkip++;
              continue;
            }

            const customerId =
              toOptionalTrimmedString(row.FACTOR_NO) ?? DEFAULT_FACTOR_NO;

            const cust = await customerRepo.findOne({ where: { id: customerId } });
            if (!cust) {
              abortOnMissingCustomer(
                `訂單 ${id} 的 FACTOR_NO=${customerId} 在 customer 表不存在`,
                row,
              );
            }

            const actorNo = toOptionalTrimmedString(row.ACTOR_NO);
            if (!actorNo) {
              abortOnMissingStaff(`訂單 ${id} 缺少 ACTOR_NO`, row);
            }

            const st = await staffRepo.findOne({ where: { id: actorNo } });
            if (!st) {
              abortOnMissingStaff(
                `訂單 ${id} 的 ACTOR_NO=${actorNo} 在 staff 表不存在`,
                row,
              );
            }
            const staffId = actorNo;

            const q = await quoteRepo.findOne({ where: { id } });
            const quoteId = q ? id : undefined;

            const orderData = convertGtableToOrder(row, {
              staffId,
              customerId,
              quoteId,
              shippingMethod: DEFAULT_SHIPPING,
              paymentMethod: DEFAULT_PAYMENT,
            });

            const entity = orderRepo.create(orderData as Order);
            await orderRepo.save(entity);
            orderOk++;

            if (orderOk % 100 === 0) {
              console.log(
                `訂單進度 offset=${offset}/${totalRows} 成功=${orderOk} 略過=${orderSkip}`,
              );
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`訂單錯誤 QNO=${row.QNO}: ${msg}`);
            orderErr++;
            throw err;
          }
        }
      }
      console.log(`訂單階段完成：成功=${orderOk} 略過=${orderSkip} 錯誤=${orderErr}`);
    }

    if (!ONLY_MODE || ONLY_MODE === 'order-item') {
      const totalItems = itable!.rowCount;
      let processed = 0;
      for (let offset = 0; offset < totalItems; offset += BATCH_SIZE) {
        const limit = Math.min(BATCH_SIZE, totalItems - offset);
        const batch = itable!.getData({
          rowOffset: offset,
          rowLimit: limit,
        }) as Record<string, unknown>[];

        for (const raw of batch) {
          processed++;
          const row = convertObjectBig5ToUtf8(raw) as Record<string, unknown>;
          try {
            const qno = toOptionalTrimmedString(row.QNO);
            if (!qno) {
              itemSkip++;
              continue;
            }

            const ord = await orderRepo.findOne({ where: { id: qno } });
            if (!ord) {
              itemSkip++;
              continue;
            }

            const itemData = convertItableToOrderItem(row, qno);
            const entity = orderItemRepo.create(itemData as OrderItem);
            await orderItemRepo.save(entity);
            itemOk++;
            ordersNeedingAmountRecalc.add(qno);

            if (itemOk % 500 === 0) {
              console.log(
                `明細進度 ${processed}/${totalItems} 成功=${itemOk} 略過=${itemSkip}`,
              );
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`明細錯誤 QNO=${row.QNO} SN=${row.SN}: ${msg}`);
            itemErr++;
            throw err;
          }
        }
      }

      console.log(
        `明細階段完成：成功=${itemOk} 略過=${itemSkip} 錯誤=${itemErr}，重算訂單金額…`,
      );
      await recalculateOrderAmounts(targetDataSource, [...ordersNeedingAmountRecalc]);
      console.log(
        `已依 order_item 加總更新 ${ordersNeedingAmountRecalc.size} 張訂單之 amount`,
      );
    }

    console.log('遷移結束。');
  } catch (error) {
    console.error('遷移失敗:', error);
    process.exit(1);
  } finally {
    if (targetDataSource?.isInitialized) {
      await targetDataSource.destroy();
      console.log('資料庫連線已關閉');
    }
  }
}

migrateOrderFromAccess().catch((e) => {
  console.error(e);
  process.exit(1);
});

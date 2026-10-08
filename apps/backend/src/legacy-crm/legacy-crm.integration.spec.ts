import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { CreateLegacyCrmSchema1791438513900 } from '../migrations/1791438513900-CreateLegacyCrmSchema';
import { PrepareLegacyCrmApi1791460000000 } from '../migrations/1791460000000-PrepareLegacyCrmApi';
import { LegacyBrowseService } from './browse/browse.service';
import { LegacyRequestContext } from './common/legacy-access';
import { LegacyGroupsService } from './documents/groups.service';
import { LegacyOrdersService } from './documents/orders.service';
import { LegacyQuotesService } from './documents/quotes.service';
import { LegacyReceiptsService } from './documents/receipts.service';
import { LegacySalesService } from './documents/sales.service';
import { LegacyWorksService } from './documents/works.service';
import { LegacyMastersService } from './masters/masters.service';
import { LegacyPartnersService } from './partners/partners.service';
import { LegacyWriteLogService } from './write-log/write-log.service';

/**
 * 舊版銷管的業務規則，對真的 PostgreSQL 驗證（移植自 isin_vb6 tests/legacyBusinessRules、saleShipments、
 * customerLatest、customerRename、documentNumber）。每次執行會清空並重建測試資料庫的 legacy_crm 與最小的 staff 表，
 * 所以只對可拋棄的資料庫執行：
 *
 *   LEGACY_CRM_TEST_HOST=127.0.0.1 LEGACY_CRM_TEST_PORT=55432 LEGACY_CRM_TEST_DB=legacy_crm_spec \
 *   LEGACY_CRM_TEST_USER=test LEGACY_CRM_TEST_PASS=test npx jest -c apps/backend/jest.config.ts legacy-crm.integration
 *
 * 資料庫名稱必須以 _spec 結尾、主機必須是 127.0.0.1，避免誤連正式資料庫。
 */
const enabled =
  process.env.LEGACY_CRM_TEST_HOST === '127.0.0.1' &&
  /_spec$/.test(process.env.LEGACY_CRM_TEST_DB ?? '');

(enabled ? describe : describe.skip)(
  'legacy CRM business rules (PostgreSQL)',
  () => {
    let dataSource: DataSource;
    let partners: LegacyPartnersService;
    let masters: LegacyMastersService;
    let orders: LegacyOrdersService;
    let sales: LegacySalesService;
    let quotes: LegacyQuotesService;
    let works: LegacyWorksService;
    let receipts: LegacyReceiptsService;
    let groups: LegacyGroupsService;
    let browse: LegacyBrowseService;
    const context: LegacyRequestContext = {
      userId: 7,
      requestId: randomUUID(),
      client: { ip: '127.0.0.1', userAgent: 'jest', frontendVersion: null },
    };

    const query = (sql: string, params: unknown[] = []) =>
      dataSource.query(sql, params);
    const shipped = async (orderNo = 'O1') =>
      (
        await query(
          'SELECT shipped_quantity_units FROM legacy_crm.order_items WHERE order_no = $1 ORDER BY line_no',
          [orderNo],
        )
      ).map(
        (row: { shipped_quantity_units: string }) =>
          Number(row.shipped_quantity_units) / 10000,
      );
    const sale = (
      saleNo: string,
      items: [string, string][],
      linked = 'O1',
      date = '115.10.07',
    ) => ({
      sale_no: saleNo,
      sale_date: date,
      customer_code: 'C1',
      linked_order_no: linked,
      items: items.map(([drawing_no, quantity], index) => ({
        line_no: index + 1,
        drawing_no,
        quantity,
      })),
    });

    beforeAll(async () => {
      dataSource = new DataSource({
        type: 'postgres',
        host: process.env.LEGACY_CRM_TEST_HOST,
        port: Number(process.env.LEGACY_CRM_TEST_PORT) || 5432,
        username: process.env.LEGACY_CRM_TEST_USER,
        password: process.env.LEGACY_CRM_TEST_PASS,
        database: process.env.LEGACY_CRM_TEST_DB,
      });
      await dataSource.initialize();
      await query('DROP SCHEMA IF EXISTS legacy_crm CASCADE');
      await query('DROP TABLE IF EXISTS public.staff, public.features');
      await query(
        'CREATE TABLE public.staff (id varchar(10) PRIMARY KEY, "userId" int, name varchar(6) NOT NULL, stop_work date)',
      );
      await query(
        'CREATE TABLE public.features (id serial PRIMARY KEY, name varchar UNIQUE NOT NULL, description varchar)',
      );
      const runner = dataSource.createQueryRunner();
      await new CreateLegacyCrmSchema1791438513900().up(runner);
      await new PrepareLegacyCrmApi1791460000000().up(runner);
      await runner.release();

      const writeLog = new LegacyWriteLogService();
      partners = new LegacyPartnersService(dataSource, writeLog);
      masters = new LegacyMastersService(dataSource, writeLog);
      orders = new LegacyOrdersService(dataSource, writeLog);
      sales = new LegacySalesService(dataSource, writeLog);
      quotes = new LegacyQuotesService(dataSource, writeLog);
      works = new LegacyWorksService(dataSource, writeLog);
      receipts = new LegacyReceiptsService(dataSource, writeLog);
      groups = new LegacyGroupsService(dataSource, writeLog);
      browse = new LegacyBrowseService(dataSource);
    });

    afterAll(async () => {
      await dataSource?.destroy();
    });

    beforeEach(async () => {
      const tables: { tablename: string }[] = await query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'legacy_crm'",
      );
      await query(
        `TRUNCATE ${tables.map((t) => `legacy_crm."${t.tablename}"`).join(', ')} RESTART IDENTITY`,
      );
      await query('TRUNCATE public.staff');
      await partners.create(
        { kind: 'customer', code: 'C1', full_name: '甲', balance: '1000' },
        context,
      );
    });

    it('records the migration objects: crm feature and C collation', async () => {
      expect(
        await query("SELECT name FROM public.features WHERE name = 'crm'"),
      ).toHaveLength(1);
      const [column] = await query(
        `SELECT collation_name FROM information_schema.columns
       WHERE table_schema = 'legacy_crm' AND table_name = 'order_documents' AND column_name = 'order_no'`,
      );
      expect(column.collation_name).toBe('C');
    });

    it('returns dates as ROC text and rejects impossible dates on entry', async () => {
      await orders.create(
        {
          order_no: 'O1',
          order_date: '96.01.02',
          delivery_date: ' 115.10.08',
          customer_code: 'C1',
        },
        context,
      );
      const order = (await orders.get('O1')) as Record<string, unknown>;
      expect([order.order_date, order.delivery_date]).toEqual([
        '96.01.02',
        '115.10.08',
      ]);
      const [row] = await query(
        'SELECT order_date::text AS d FROM legacy_crm.order_documents',
      );
      expect(row.d).toBe('2007-01-02');
      await expect(
        orders.create({ order_no: 'O2', order_date: '115.13.01' }, context),
      ).rejects.toThrow('訂單日期不是有效日期');
    });

    it('closes an order when every line has shipped and opens it again when the sale goes', async () => {
      await orders.create(
        {
          order_no: 'O1',
          order_date: '115.10.07',
          customer_code: 'C1',
          items: [
            { line_no: 1, drawing_no: 'P1', quantity: '5' },
            { line_no: 2, drawing_no: 'P2', quantity: '2' },
          ],
        },
        context,
      );
      const closed = async () =>
        ((await orders.get('O1')) as Record<string, unknown>).closed;
      expect(await closed()).toBe('');
      await sales.create(sale('S1', [['P1', '5']]), context);
      expect(await closed()).toBe('');
      await sales.create(sale('S2', [['P2', '2']]), context);
      expect(await closed()).toBe('Y');
      await sales.remove('S2', context);
      expect(await closed()).toBe('');
      await orders.create(
        {
          order_no: 'O2',
          order_date: '115.10.07',
          customer_code: 'C1',
          items: [],
        },
        context,
      );
      expect(((await orders.get('O2')) as Record<string, unknown>).closed).toBe(
        'Y',
      );
    });

    it('spreads sale quantities over the order lines by drawing number', async () => {
      await orders.create(
        {
          order_no: 'O1',
          customer_code: 'C1',
          items: [
            { line_no: 1, drawing_no: 'P1', quantity: '3' },
            {
              line_no: 2,
              drawing_no: 'P2',
              quantity: '5',
              shipped_quantity: '1',
            },
            { line_no: 3, drawing_no: 'P1', quantity: '2' },
          ],
        },
        context,
      );
      await sales.create(
        sale('S1', [
          ['P1', '4'],
          ['P2', '2'],
          ['X9', '1'],
        ]),
        context,
      );
      expect(await shipped()).toEqual([3, 3, 1]);
      await sales.update(
        'S1',
        sale('S1', [
          ['P1', '6'],
          ['P2', '2'],
        ]),
        context,
      );
      expect(await shipped()).toEqual([3, 3, 3]);
      await sales.update('S1', sale('S1', [['P1', '1']]), context);
      expect(await shipped()).toEqual([1, 1, 0]);
      await sales.create(sale('S2', [['P1', '9']]), context);
      expect(await shipped()).toEqual([3, 1, 7]);
      await sales.remove('S2', context);
      await sales.remove('S1', context);
      expect(await shipped()).toEqual([0, 1, 0]);

      await orders.create(
        {
          order_no: 'O2',
          customer_code: 'C1',
          items: [{ line_no: 1, drawing_no: 'P1', quantity: '2' }],
        },
        context,
      );
      await sales.create(sale('S3', [['P1', '2']]), context);
      await sales.update('S3', sale('S3', [['P1', '2']], 'O2'), context);
      expect(await shipped()).toEqual([0, 1, 0]);
      expect(await shipped('O2')).toEqual([2]);
      await sales.create(sale('S4', [['P1', '1']], ''), context);
      expect(await shipped()).toEqual([0, 1, 0]);
    });

    it("writes the sale date as the customer's 最近交易日期, later or earlier; orders and deletes leave it", async () => {
      const latest = async () =>
        ((await partners.get('customer', 'C1')) as Record<string, unknown>)
          .latest_transaction_date;
      await sales.create(sale('S1', [], '', '115.10.07'), context);
      expect(await latest()).toBe('115.10.07');
      await sales.create(sale('S2', [], '', '115.09.30'), context);
      expect(await latest()).toBe('115.09.30');
      await sales.remove('S2', context);
      await orders.create(
        { order_no: 'O9', order_date: '115.12.01', customer_code: 'C1' },
        context,
      );
      expect(await latest()).toBe('115.09.30');
      await sales.update('S1', sale('S1', [], '', '99.01.02'), context);
      expect(await latest()).toBe('99.01.02');
    });

    it('files material, thickness, unit and the price for its 代料 on the part', async () => {
      await masters.createPart(
        { drawing_no: 'P1', customer_code: 'C1' },
        context,
      );
      await sales.create(
        {
          ...sale('S1', []),
          items: [
            {
              drawing_no: 'P1',
              material: 'SUS304',
              thickness: '1.5',
              unit: '片',
              outsource: '代折',
              quantity: '2',
              unit_price: '35',
            },
          ],
        },
        context,
      );
      let part = (await masters.getPart('P1')) as Record<string, unknown>;
      expect([
        part.material,
        part.thickness,
        part.unit,
        part.price4,
        part.price_ref,
      ]).toEqual(['SUS304', '1.5', '片', 35, 0]);
      await sales.create(
        {
          ...sale('S2', []),
          items: [
            {
              drawing_no: 'P1',
              material: 'SS41',
              thickness: '12.75',
              unit: '只',
              quantity: '1',
              unit_price: '12',
            },
          ],
        },
        context,
      );
      part = (await masters.getPart('P1')) as Record<string, unknown>;
      // 厚度超過工件欄寬（4）不寫，其他照寫。
      expect([
        part.material,
        part.thickness,
        part.unit,
        part.price_ref,
        part.price4,
      ]).toEqual(['SS41', '1.5', '只', 12, 35]);
      expect(part.latest_sale_date).toBe('115.10.07');
    });

    it('keeps 貨款 as the line total less the tax for 內含', async () => {
      await sales.create(
        {
          sale_no: 'S1',
          sale_date: '115.10.07',
          customer_code: 'C1',
          tax_mode: '內含',
          tax_amount: '50',
          items: [
            { line_no: 1, drawing_no: 'P1', quantity: '1', unit_price: '1050' },
          ],
        },
        context,
      );
      const result = (await sales.get('S1')) as Record<string, unknown>;
      expect([result.amount, result.total_amount]).toEqual([1000, 1050]);
    });

    it('files a receipt discount on an unpaid sale, settles sales and moves the customer balance', async () => {
      await sales.create(
        {
          sale_no: 'S1',
          sale_date: '115.10.01',
          customer_code: 'C1',
          tax_mode: '外加',
          tax_amount: '50',
          items: [
            { line_no: 1, drawing_no: 'P1', quantity: '1', unit_price: '1000' },
          ],
        },
        context,
      );
      expect(
        (
          await receipts.candidates({
            customerCode: 'C1',
            closingDate: '115.09.30',
          })
        ).allocations,
      ).toHaveLength(0);
      expect(
        (
          await receipts.candidates({
            customerCode: 'C1',
            closingDate: '115.10.31',
          })
        ).allocations,
      ).toEqual([
        {
          sale_no: 'S1',
          merchandise: 1000,
          tax: 50,
          discount: 0,
          receivable: 1050,
          unpaid: 1050,
        },
      ]);
      await receipts.create(
        {
          receipt_no: 'R1',
          receipt_date: '115.10.07',
          customer_code: 'C1',
          current_advance: '7',
          allocations: [{ sale_no: 'S1', discount: '20', offset: '1030' }],
        },
        context,
      );
      let result = (await sales.get('S1')) as Record<string, unknown>;
      expect([
        result.discount_amount,
        result.total_amount,
        result.received_amount,
      ]).toEqual([20, 1030, 1030]);
      expect(
        ((await partners.get('customer', 'C1')) as Record<string, unknown>)
          .balance,
      ).toBe(-30);
      expect(
        (await receipts.candidates({ customerCode: 'C1' })).allocations,
      ).toHaveLength(0);
      expect(
        (await receipts.candidates({ customerCode: 'C1', receiptNo: 'R1' }))
          .allocations,
      ).toHaveLength(1);
      expect(
        (await receipts.candidates({ customerCode: 'C1' })).previous_advance,
      ).toBe(7);

      await receipts.update(
        'R1',
        {
          customer_code: 'C1',
          allocations: [{ sale_no: 'S1', offset: '1000' }],
        },
        context,
      );
      result = (await sales.get('S1')) as Record<string, unknown>;
      expect(result.received_amount).toBe(1000);
      expect(
        ((await partners.get('customer', 'C1')) as Record<string, unknown>)
          .balance,
      ).toBe(0);
      await receipts.remove('R1', context);
      result = (await sales.get('S1')) as Record<string, unknown>;
      expect(result.received_amount).toBe(0);
      expect(
        ((await partners.get('customer', 'C1')) as Record<string, unknown>)
          .balance,
      ).toBe(1000);
    });

    it("files a work sheet's date as the part's 最近交易 except for non-laser lines", async () => {
      await masters.createPart(
        { drawing_no: 'P1', customer_code: 'C1' },
        context,
      );
      await masters.createPart(
        { drawing_no: 'P2', customer_code: 'C1' },
        context,
      );
      await works.create(
        {
          work_no: 'W1',
          transfer_date: '115.10.07',
          customer_code: 'C1',
          order_no: 'O7',
          items: [
            { line_no: 1, drawing_no: 'P1', order_quantity: '1' },
            {
              line_no: 2,
              drawing_no: 'P2',
              order_quantity: '1',
              plating_work: 'N',
              order_no: 'O8',
            },
          ],
        },
        context,
      );
      expect(
        ((await masters.getPart('P1')) as Record<string, unknown>).cnc3,
      ).toBe('115.10.07');
      expect(
        ((await masters.getPart('P2')) as Record<string, unknown>).cnc3,
      ).toBe('');
      const work = (await works.get('W1')) as {
        items: Record<string, unknown>[];
      };
      expect(work.items.map((item) => item.order_no)).toEqual(['O7', 'O8']);
    });

    it('refuses a work sheet the CNC check rejects', async () => {
      works.useCncCheck(async () => ['P1尚未完成CNC檔']);
      try {
        await expect(
          works.create(
            { work_no: 'W1', items: [{ drawing_no: 'P1' }] },
            context,
          ),
        ).rejects.toThrow('P1尚未完成CNC檔');
        expect(await works.get('W1')).toBeNull();
      } finally {
        works.useCncCheck(async () => []);
      }
    });

    it('moves the customer and its documents to a new code, and refuses a code in use', async () => {
      await partners.create(
        { kind: 'customer', code: 'C2', full_name: '乙' },
        context,
      );
      await masters.createPart(
        { drawing_no: 'P1', customer_code: 'C1' },
        context,
      );
      await orders.create(
        {
          order_no: 'O1',
          customer_code: 'C1',
          items: [{ drawing_no: 'P1', quantity: '1' }],
        },
        context,
      );
      await groups.create(
        { group_no: 'G1', customer_code: 'C1', items: [{ drawing_no: 'P1' }] },
        context,
      );
      await expect(
        partners.renameCustomer('C1', 'C2', context),
      ).rejects.toThrow('客戶編號C2已經存在');
      await partners.renameCustomer('C1', 'C9', context);
      expect(await partners.get('customer', 'C1')).toBeNull();
      expect(
        ((await masters.getPart('P1')) as Record<string, unknown>)
          .customer_code,
      ).toBe('C9');
      const order = (await orders.get('O1')) as Record<string, unknown> & {
        items: Record<string, unknown>[];
      };
      expect([order.customer_code, order.items[0].legacy_factor_no]).toEqual([
        'C9',
        'C9',
      ]);
      const group = (await groups.get('G1')) as Record<string, unknown> & {
        items: Record<string, unknown>[];
      };
      expect([
        group.customer_code,
        group.items[0].customer_code,
        group.items[0].line_no,
      ]).toEqual(['C9', 'C9', '1']);
    });

    it('numbers a new document by its date and the day’s next serial, and browses in text order', async () => {
      for (const no of ['15100701', '15100702', '1510070A', '9912310']) {
        await quotes.create(
          { quote_no: no, quote_date: '115.10.07', customer_code: 'C1' },
          context,
        );
      }
      expect(await browse.nextNumber('quotes', { date: '115.10.07' })).toEqual({
        number: '15100703',
      });
      expect(await browse.nextNumber('quotes', { date: '115.10.08' })).toEqual({
        number: '15100801',
      });
      expect(await browse.nextNumber('quotes', { date: 'x' })).toEqual({
        number: '',
      });
      expect(await browse.navigate('quotes', { direction: 'first' })).toEqual({
        number: '15100701',
      });
      expect(await browse.navigate('quotes', { direction: 'last' })).toEqual({
        number: '9912310',
      });
      expect(
        await browse.navigate('quotes', {
          direction: 'next',
          from: '1510070A',
        }),
      ).toEqual({ number: '9912310' });
      expect(
        await browse.navigate('quotes', {
          direction: 'previous',
          from: '1510070',
        }),
      ).toEqual({ number: null });
      await expect(
        browse.navigate('nope', { direction: 'first' }),
      ).rejects.toThrow('找不到資料類別');
    });

    it('lists F1 employees from staff with a legacy code who are still employed', async () => {
      await query(
        `INSERT INTO public.staff (id, name, stop_work, legacy_crm_code) VALUES
         ('S1', '王一', NULL, 'E02'), ('S2', '李二', '2020-01-31', 'E01'), ('S3', '陳三', NULL, NULL), ('S4', '林四', NULL, 'E10')`,
      );
      expect((await browse.assist('employee')).items).toEqual([
        { code: 'E02', name: '王一' },
        { code: 'E10', name: '林四' },
      ]);
      expect((await browse.assist('employee', { prefix: 'E1' })).items).toEqual(
        [{ code: 'E10', name: '林四' }],
      );
    });

    it('writes one write_log row per change with user, staff, before, after and side effects', async () => {
      await query(
        `INSERT INTO public.staff (id, "userId", name) VALUES ('S7', 7, '測試')`,
      );
      await orders.create(
        {
          order_no: 'O1',
          customer_code: 'C1',
          items: [{ drawing_no: 'P1', quantity: '2' }],
        },
        context,
      );
      await sales.create(sale('S1', [['P1', '1']]), context);
      await sales.remove('S1', context);
      const rows = await query(
        `SELECT entity_type, entity_key, action, user_id, staff_id, before IS NOT NULL AS has_before,
              after IS NOT NULL AS has_after, side_effects
       FROM legacy_crm.write_log WHERE entity_type <> 'partner' ORDER BY id`,
      );
      expect(
        rows.map((row: Record<string, unknown>) => [
          row.entity_type,
          row.action,
          row.has_before,
          row.has_after,
        ]),
      ).toEqual([
        ['order_document', 'create', false, true],
        ['sales_document', 'create', false, true],
        ['sales_document', 'delete', true, false],
      ]);
      expect(
        rows.every(
          (row: Record<string, unknown>) =>
            row.user_id === 7 && row.staff_id === 'S7',
        ),
      ).toBe(true);
      expect(rows[1].side_effects.shipments[0]).toMatchObject({
        order_no: 'O1',
        drawing_no: 'P1',
        delta_units: 10000,
      });
      expect(rows[2].side_effects.shipments[0]).toMatchObject({
        delta_units: -10000,
      });
    });

    it('rolls back the write and its log when a step fails', async () => {
      await expect(
        orders.create(
          {
            order_no: 'O1',
            customer_code: 'C1',
            items: [
              { line_no: 1, drawing_no: 'a' },
              { line_no: 1, drawing_no: 'b' },
            ],
          },
          context,
        ),
      ).rejects.toThrow('訂單項次不可重複');
      await orders.create({ order_no: 'O1', customer_code: 'C1' }, context);
      await expect(
        orders.create({ order_no: 'O1', customer_code: 'C1' }, context),
      ).rejects.toThrow('已有相同訂單編號');
      const [{ count }] = await query(
        "SELECT count(*)::int AS count FROM legacy_crm.write_log WHERE entity_key = 'O1'",
      );
      expect(count).toBe(1);
    });
  },
);

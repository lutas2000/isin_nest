import { DataSource } from 'typeorm';
import { LegacyRequestContext } from '../common/legacy-access';
import { LegacyNotFoundError } from '../common/legacy-errors';
import { LegacyValidationError } from '../common/legacy-validation.error';
import {
  finishReportRow,
  listReportCatalog,
  REPORTS,
} from './report-definitions';
import { LegacyReportsService } from './reports.service';

type Query = { sql: string; params: unknown[] };

/** 依 SQL 內容回傳假資料的 DataSource，並記下每次查詢。 */
function fakeDataSource(
  respond: (sql: string, params: unknown[]) => unknown[] = () => [],
) {
  const queries: Query[] = [];
  const manager = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return respond(sql, params);
    }),
  };
  return { dataSource: { manager } as unknown as DataSource, queries };
}

const context: LegacyRequestContext = {
  userId: 7,
  requestId: '00000000-0000-4000-8000-000000000001',
  client: { ip: '127.0.0.1', userAgent: 'jest', frontendVersion: null },
};

describe('report catalog', () => {
  it('lists every report with unique keys and the isin_vb6 filter shape', () => {
    const keys = REPORTS.map((report) => report.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(31);
    const sales = listReportCatalog('sales-reports');
    expect(sales.map((report) => report.key)).toEqual([
      'sales-journal',
      'sales-work-summary',
      'sales-work-detail',
      'sales-date-summary',
      'sales-date-detail',
      'sales-customer-summary',
      'sales-customer-detail',
    ]);
    expect(sales[0].filters[0]).toEqual({
      type: 'range',
      from: 'date_from',
      to: 'date_to',
      key: undefined,
      label: '銷貨日期',
      placeholder: '例：115.01.31',
      lookup: '',
    });
    expect(listReportCatalog('supplier-reports')[0].filters).toHaveLength(1);
    expect(listReportCatalog('nope')).toEqual([]);
  });

  it('turns units into numbers and ROC dates into the displayed text, keeping column order', () => {
    const row = finishReportRow({
      sale_date: '2010-12-31',
      sale_date_raw: null,
      odd_date: '1914-10-15',
      odd_date_raw: '03.10.15',
      blank_date: null,
      blank_date_raw: null,
      quantity__units: '12345',
      tax__units: null,
      line_no: 2,
    });
    expect(row).toEqual({
      sale_date: '99.12.31',
      odd_date: '03.10.15',
      blank_date: '',
      quantity: 1.2345,
      tax: null,
      line_no: 2,
    });
    expect(Object.keys(row)).toEqual([
      'sale_date',
      'odd_date',
      'blank_date',
      'quantity',
      'tax',
      'line_no',
    ]);
  });
});

describe('LegacyReportsService', () => {
  it('compares legacy dates as dates and treats blank dates as the earliest', async () => {
    const { dataSource, queries } = fakeDataSource();
    const service = new LegacyReportsService(dataSource);
    await service.run('sales-journal', {
      date_from: ' 99.12.20 ',
      date_to: '100.01.10',
      customer_from: 'A',
      item_to: 'Z',
    });
    const [{ sql, params }] = queries;
    expect(params).toEqual(['2010-12-20', '2011-01-10', 'Z', 'A']);
    expect(sql).toContain('d.sale_date >= $1');
    expect(sql).toContain(
      '(d.sale_date <= $2 OR (d.sale_date IS NULL AND d.sale_date_raw IS NULL))',
    );
    expect(sql).toContain('i.drawing_no <= $3');
    expect(sql).toContain('d.customer_code >= $4');
    expect(sql).toContain(
      'ORDER BY d.sale_date NULLS FIRST, d.sale_no, i.line_no LIMIT 5001',
    );
  });

  it('rejects unparseable dates and over-long filters like isin_vb6 input errors', async () => {
    const service = new LegacyReportsService(fakeDataSource().dataSource);
    await expect(
      service.run('sales-journal', { date_from: '115.02.30' }),
    ).rejects.toThrow(LegacyValidationError);
    await expect(
      service.run('receivable-detail', { date_to: 'abc' }),
    ).rejects.toThrow('出貨日期「abc」不是有效日期');
    await expect(
      service.run('invoice-brief', { date_from: '115.1.1' }),
    ).rejects.toThrow(LegacyValidationError);
    await expect(
      service.run('sales-journal', { customer_from: 'x'.repeat(21) }),
    ).rejects.toThrow('篩選條件不得超過 20 個字元');
    await expect(
      service.run('order-shipped', { order_no: 'x'.repeat(51) }),
    ).rejects.toThrow('篩選條件不得超過 50 個字元');
    await expect(service.run('nope')).rejects.toThrow(LegacyNotFoundError);
  });

  it('adds the partner kind and returns the empty report without querying', async () => {
    const { dataSource, queries } = fakeDataSource();
    const service = new LegacyReportsService(dataSource);
    await service.run('supplier-contacts-postal', { supplier_from: 'S1' });
    expect(queries[0].params).toEqual(['S1', 'supplier']);
    expect(queries[0].sql).toContain('ORDER BY p.postal_code, p.code');
    const empty = await service.run('work-register', {
      date_from: '115.01.01',
    });
    expect(empty).toEqual({
      reportKey: 'work-register',
      items: [],
      count: 0,
      limit: 5000,
      truncated: false,
      columns: expect.any(Array),
    });
    expect(queries).toHaveLength(1);
  });

  it('computes the sales journal summary in units', async () => {
    const { dataSource } = fakeDataSource(() => [
      {
        sale_no: 'S1',
        line_total__units: '1',
        tax_amount__units: null,
        total_amount__units: null,
        received_amount__units: null,
      },
      {
        sale_no: '',
        line_total__units: '2',
        tax_amount__units: '5',
        total_amount__units: '8',
        received_amount__units: null,
      },
    ]);
    const result = await new LegacyReportsService(dataSource).run(
      'sales-journal',
      {},
    );
    expect(result.summary).toEqual({
      line_total: 0.0003,
      tax_amount: 0.0005,
      total_amount: 0.0008,
      received_amount: 0,
    });
    expect(result.count).toBe(2);
  });

  it('adds earlier unpaid balances to the receivable summary and lists customers with only earlier balances', async () => {
    const { dataSource, queries } = fakeDataSource((sql) =>
      sql.includes('GROUP BY d.customer_code')
        ? [
            {
              customer_code: 'B',
              customer_name: '乙',
              amount_units: '10000',
              tax_units: '500',
              total_units: '10500',
              received_units: '500',
            },
          ]
        : [
            { customer_code: 'A', customer_name: '甲', units: '20000' },
            { customer_code: 'B', customer_name: '乙', units: '30000' },
          ],
    );
    const result = await new LegacyReportsService(dataSource).run(
      'receivable-summary',
      {
        date_from: '115.09.01',
        customer_to: 'C',
      },
    );
    expect(queries[1].params).toEqual(['2026-09-01', 'C']);
    expect(queries[1].sql).toContain(
      '(sale_date < $1 OR (sale_date IS NULL AND sale_date_raw IS NULL))',
    );
    expect(result.items).toEqual([
      {
        customer_code: 'B',
        customer_name: '乙',
        previous_unpaid: 3,
        amount: 1,
        tax: 0.05,
        receivable: 4.05,
        received: 0.05,
        unpaid: 4,
      },
      {
        customer_code: 'A',
        customer_name: '甲',
        previous_unpaid: 2,
        amount: 0,
        tax: 0,
        receivable: 2,
        received: 0,
        unpaid: 2,
      },
    ]);
    expect(result.summary).toEqual({
      previous_unpaid: 5,
      amount: 1,
      tax: 0.05,
      receivable: 6.05,
      received: 0.05,
      unpaid: 6,
    });
  });

  it('builds one invoice page per customer with earlier unpaid and the latest advance', async () => {
    const { dataSource } = fakeDataSource((sql) => {
      if (sql.includes('FROM legacy_crm.sales_documents d'))
        return [
          {
            sale_no: 'S1',
            sale_date: '2026-09-02',
            sale_date_raw: null,
            customer_code: 'A',
            customer_name: '甲',
            invoice_number: '',
            amount_units: '10000',
            tax_units: '500',
            discount_units: '0',
            total_units: '10500',
            received_units: '0',
          },
        ];
      if (sql.includes('FROM legacy_crm.partners'))
        return [
          {
            code: 'A',
            full_name: '甲公司',
            address: '地址',
            tax_id: '1',
            phone1: '2',
          },
        ];
      if (sql.includes('SUM(total_units - received_units)'))
        return [{ customer_code: 'A', units: '20000' }];
      if (sql.includes('current_advance_units'))
        return [{ customer_code: 'A', units: '1000' }];
      if (sql.includes('FROM legacy_crm.sales_items'))
        return [
          {
            sale_no: 'S1',
            drawing_no: 'P1',
            material: 'SS41',
            thickness: '3',
            outsource: '',
            quantity_units: '20000',
            unit_price_units: '5000',
            line_total_units: '10000',
          },
        ];
      return [];
    });
    const result = await new LegacyReportsService(dataSource).run(
      'invoice-detail',
      { date_from: '115.09.01' },
    );
    expect(result).toMatchObject({
      reportKey: 'invoice-detail',
      items: [],
      columns: [],
      count: 1,
      truncated: false,
      period: { from: '115.09.01', to: '' },
    });
    const [page] = result.pages as Record<string, unknown>[];
    expect(page.customer).toEqual({
      code: 'A',
      name: '甲公司',
      address: '地址',
      tax_id: '1',
      phone: '2',
    });
    expect(page.sales).toEqual([
      {
        sale_date: '115.09.02',
        sale_no: 'S1',
        invoice_number: '',
        amount: 1,
        tax: 0.05,
        received: 0,
        unpaid: 1.05,
        items: [
          {
            drawing_no: 'P1',
            material: 'SS41',
            thickness: '3',
            outsource: '',
            quantity: 2,
            unit_price: 0.5,
            amount: 1,
          },
        ],
      },
    ]);
    expect(page.totals).toEqual({
      amount: 1,
      tax: 0.05,
      received: 0,
      unpaid: 1.05,
      previous_unpaid: 2,
      advance: 0.1,
      receivable: 2.95,
    });
  });

  it('logs each preview into print_log with the applied filters', async () => {
    const { dataSource, queries } = fakeDataSource((sql) =>
      sql.includes('public.staff')
        ? [{ id: 'ST01' }]
        : sql.includes('FROM legacy_crm.receipt_documents')
          ? [{ receipt_no: 'R1' }]
          : [],
    );
    const result = await new LegacyReportsService(dataSource).preview(
      'receipt-register',
      {
        date_from: '115.09.01',
        date_to: '',
        customer_to: ' C9 ',
        unrelated: 'x',
      },
      context,
    );
    expect(result.count).toBe(1);
    const insert = queries.find((query) =>
      query.sql.includes('INSERT INTO legacy_crm.print_log'),
    );
    expect(insert?.params).toEqual([
      7,
      'ST01',
      context.requestId,
      JSON.stringify(context.client),
      'report_query',
      'receipt-register',
      null,
      JSON.stringify({ date_from: '115.09.01', customer_to: 'C9' }),
      1,
      null,
    ]);
  });

  it('does not log a preview that fails validation', async () => {
    const { dataSource, queries } = fakeDataSource();
    await expect(
      new LegacyReportsService(dataSource).preview(
        'sales-journal',
        { date_from: 'x' },
        context,
      ),
    ).rejects.toThrow(LegacyValidationError);
    expect(queries).toHaveLength(0);
  });
});

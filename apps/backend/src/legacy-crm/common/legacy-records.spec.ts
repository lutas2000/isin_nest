import { LegacyValidationError } from './legacy-validation.error';
import {
  checkLayoutFromColumns,
  normalizeBank,
  normalizeDrawingGroup,
  normalizeOrder,
  normalizePart,
  normalizePartner,
  normalizeQuote,
  normalizeReceipt,
  normalizeSale,
} from './legacy-records';
import { multiplyUnits, toUnits } from './units';

describe('units', () => {
  it('stores amounts as integers times 10,000', () => {
    expect(toUnits('金額', '12.3456')).toBe(123456);
    expect(toUnits('金額', '')).toBe(0);
    expect(toUnits('金額', null)).toBe(0);
    expect(() => toUnits('金額', 'abc')).toThrow('金額必須是有效金額');
    expect(() => toUnits('金額', 900_000_000_001)).toThrow(
      LegacyValidationError,
    );
  });

  it('rounds quantity times price half up', () => {
    expect(multiplyUnits(toUnits('', 3), toUnits('', 1.5))).toBe(45000);
    expect(multiplyUnits(15000, 15000)).toBe(22500);
    expect(multiplyUnits(1, 5000)).toBe(1);
  });
});

describe('legacy-records', () => {
  it('trims partner text and checks the legacy limits', () => {
    const row = normalizePartner(
      { code: ' C001 ', full_name: ' 測試 ', credit_limit: '100' },
      { kind: 'customer' },
    );
    expect(row).toMatchObject({
      kind: 'customer',
      code: 'C001',
      full_name: '測試',
      credit_limit_units: 1_000_000,
    });
    expect(() =>
      normalizePartner({ code: '', full_name: 'x' }, { kind: 'customer' }),
    ).toThrow('編號不可空白');
    expect(() =>
      normalizePartner(
        { code: '12345678901', full_name: 'x' },
        { kind: 'customer' },
      ),
    ).toThrow('編號最多 10 個字元');
    expect(() =>
      normalizePartner({ code: 'C', full_name: 'x' }, { kind: 'vendor' }),
    ).toThrow('類型無效');
  });

  it('splits dates leniently for migration and strictly for entry', () => {
    const input = {
      code: 'C',
      full_name: 'x',
      start_date: ' 96.01.02',
      latest_transaction_date: '115.13.01',
    };
    expect(
      normalizePartner(input, { kind: 'customer', dates: 'lenient' }),
    ).toMatchObject({
      start_date: '2007-01-02',
      start_date_raw: null,
      latest_transaction_date: null,
      latest_transaction_date_raw: '115.13.01',
    });
    expect(() => normalizePartner(input, { kind: 'customer' })).toThrow(
      '最近交易日期不是有效日期',
    );
  });

  it('counts characters, not bytes, against the limits', () => {
    expect(
      normalizePart({ drawing_no: 'A1', drawing_name: '一'.repeat(30) })
        .drawing_name,
    ).toHaveLength(30);
    expect(() =>
      normalizePart({ drawing_no: 'A1', drawing_name: '一'.repeat(31) }),
    ).toThrow('圖名最多 30 個字元');
  });

  it('fills order line legacy fields from the header and rejects duplicate SN', () => {
    const order = normalizeOrder({
      order_no: 'O1',
      order_date: '115.10.08',
      customer_code: 'C1',
      items: [
        { drawing_no: 'D1', quantity: '2' },
        { line_no: '', legacy_sn: '', drawing_no: '' },
      ],
    });
    expect(order.lines.items).toHaveLength(1);
    expect(order.lines.items[0]).toMatchObject({
      order_no: 'O1',
      line_no: 1,
      legacy_sn: '1',
      legacy_date_r: '2026-10-08',
      legacy_factor_no: 'C1',
      quantity_units: 20000,
    });
    expect(() =>
      normalizeOrder({
        order_no: 'O1',
        items: [
          { line_no: 1, legacy_sn: '7', drawing_no: 'a' },
          { line_no: 2, legacy_sn: '7', drawing_no: 'b' },
        ],
      }),
    ).toThrow('訂單明細 SN 不可重複');
  });

  it('recomputes sale amounts on entry and keeps source amounts on migration', () => {
    const input = {
      sale_no: 'S1',
      tax_mode: '內含',
      tax_amount: '5',
      amount: '999',
      total_amount: '999',
      items: [{ quantity: '2', unit_price: '52.5', line_total: '1' }],
    };
    const entered = normalizeSale(input);
    expect(entered.lines.items[0].line_total_units).toBe(1_050_000);
    expect(entered.header).toMatchObject({
      amount_units: 1_000_000,
      tax_units: 50_000,
      total_units: 1_050_000,
    });
    const migrated = normalizeSale(input, { preserveSourceAmounts: true });
    expect(migrated.lines.items[0].line_total_units).toBe(10_000);
    expect(migrated.header).toMatchObject({
      amount_units: 9_990_000,
      total_units: 9_990_000,
    });
  });

  it('keeps quote notes that are not blank', () => {
    const quote = normalizeQuote({
      quote_no: 'Q1',
      notes: [{ note: 'a' }, { note: ' ' }, 'b'],
    });
    expect(quote.lines.notes.map((line) => [line.line_no, line.note])).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it('allows up to 999 allocation lines on a receipt', () => {
    const allocations = Array.from({ length: 999 }, (_, index) => ({
      sale_no: `S${index}`,
      offset: '1',
    }));
    expect(
      normalizeReceipt({ receipt_no: 'R1', allocations }).lines.allocations,
    ).toHaveLength(999);
    expect(() =>
      normalizeReceipt({
        receipt_no: 'R1',
        allocations: [...allocations, { sale_no: 'x' }],
      }),
    ).toThrow('沖帳明細最多 999 列');
  });

  it('keeps any two characters in the drawing group laser flag', () => {
    const group = normalizeDrawingGroup({
      group_no: 'G1',
      customer_code: 'C1',
      items: [{ is_laser: '漆' }],
    });
    expect(group.lines.items[0]).toMatchObject({
      line_no: 1,
      customer_code: 'C1',
      is_laser: '漆',
    });
  });

  it('builds the bank check layout from one column per coordinate', () => {
    const bank = normalizeBank({
      code: 'B1',
      check_layout: checkLayoutFromColumns({
        check_year_x: '12',
        check_payee_y2: '3.5',
        check_correction_x: '',
      }),
    });
    const layout = bank.check_layout as {
      corrections: unknown;
      fields: Record<string, any>;
    };
    expect(layout.fields.year.layout1).toEqual({ x: 12, y: '' });
    expect(layout.fields.payee.layout2).toEqual({ x: '', y: 3.5 });
    expect(layout.corrections).toEqual({ x: '', y: '' });
  });
});

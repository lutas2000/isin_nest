import {
  columns,
  containsPattern,
  prefixPattern,
  present,
  units,
} from './legacy-db';
import { rocText } from '../documents/document-sql';

describe('legacy-db helpers', () => {
  it('casts date columns to text in select lists', () => {
    expect(columns('order_documents', 'd', ['order_no', 'order_date'])).toBe(
      'd."order_no", d."order_date"::text AS "order_date"',
    );
    expect(columns('phrases')).toBe('*');
    expect(columns('parts')).toBe('*, "drawing_date"::text AS "drawing_date"');
  });

  it('presents dates as ROC text, prefers the original text and drops *_raw', () => {
    const row = present('order_documents', {
      order_no: 'O1',
      order_date: '2007-01-02',
      order_date_raw: null,
      delivery_date: null,
      delivery_date_raw: '096.13.01',
      note: 'x',
    });
    expect(row).toEqual({
      order_no: 'O1',
      order_date: '96.01.02',
      delivery_date: '096.13.01',
      note: 'x',
    });
    expect(present('sales_items', { line_total_units: '123456' })).toEqual({
      line_total_units: 123456,
    });
  });

  it('converts units and escapes LIKE patterns with !', () => {
    expect(units('123456')).toBe(12.3456);
    expect(units(null)).toBe(0);
    expect(containsPattern('5%_!')).toBe('%5!%!_!!%');
    expect(prefixPattern('A_')).toBe('A!_%');
  });

  it('builds the ROC text expression used by keyword search', () => {
    expect(rocText('d.sale_date')).toContain('coalesce(d.sale_date_raw');
  });
});

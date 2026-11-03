import { DataSource } from 'typeorm';
import { LegacyBrowseService } from './browse.service';

// 瀏覽器測試使用模擬 API；這裡另保護實際後端查詢條件與日期轉換。
describe('LegacyBrowseService drawing assists', () => {
  const query = jest.fn();
  const service = new LegacyBrowseService({
    manager: { query },
  } as unknown as DataSource);

  beforeEach(() => query.mockReset());

  it.each(['part', 'part-model'])(
    '%s binds a trimmed, exact customer separately from the escaped prefix',
    async (kind) => {
      query.mockResolvedValue([]);
      await service.assist(kind, { prefix: ' 東海%_ ', customer: ' FVA ' });
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('p.customer_code = $1');
      expect(sql).toContain(
        `p.${kind === 'part' ? 'drawing_no' : 'customer_model'} ILIKE $2`,
      );
      expect(params).toEqual(['FVA', '東海\\%\\_%']);
      expect(sql).toContain('d.customer_code = p.customer_code');
      expect(sql).toContain('i.drawing_no = p.drawing_no');
      expect(sql).toContain(
        'ORDER BY latest.order_date DESC NULLS LAST, p.drawing_no DESC',
      );
    },
  );

  it('presents the latest date as ROC text, preserves raw dates and leaves missing dates blank', async () => {
    query.mockResolvedValue([
      {
        drawing_no: 'D1',
        last_order_date: '2026-10-30',
        last_order_date_raw: null,
      },
      {
        drawing_no: 'D2',
        last_order_date: null,
        last_order_date_raw: '114.03',
      },
      { drawing_no: 'D3', last_order_date: null, last_order_date_raw: null },
    ]);
    expect((await service.assist('part', { prefix: 'D' })).items).toEqual([
      { drawing_no: 'D1', last_order_date: '115.10.30' },
      { drawing_no: 'D2', last_order_date: '114.03' },
      { drawing_no: 'D3', last_order_date: '' },
    ]);
  });

  it.each(['part', 'part-model'])(
    '%s preserves unscoped drawing order',
    async (kind) => {
      query.mockResolvedValue([]);
      await service.assist(kind, { prefix: 'D' });
      const [sql, params] = query.mock.calls[0];
      expect(sql).not.toContain('p.customer_code = $');
      expect(sql).toContain('ORDER BY p.drawing_no DESC');
      expect(params).toEqual(['D%']);
    },
  );

  it('preserves explicit ascending drawing order', async () => {
    query.mockResolvedValue([]);
    await service.assist('part', { customer: 'FVA', order: 'asc' });
    expect(query.mock.calls[0][0]).toContain('ORDER BY p.drawing_no ASC');
  });

  it('preserves empty lookup guards and permits customer-only drawing lookup', async () => {
    expect((await service.assist('part')).items).toEqual([]);
    expect(
      (await service.assist('part-model', { customer: 'FVA' })).items,
    ).toEqual([]);
    expect(query).not.toHaveBeenCalled();
    query.mockResolvedValue([]);
    await service.assist('part', { customer: 'FVA' });
    expect(query.mock.calls[0][1]).toEqual(['FVA']);
  });
});

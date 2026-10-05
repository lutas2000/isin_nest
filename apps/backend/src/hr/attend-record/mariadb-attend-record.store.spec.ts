import { MariadbAttendRecordStore } from './mariadb-attend-record.store';
import { taipeiWallClockToDate } from '../taipei-time';

/** 以 mock 的 MariaDB 連線驗證查詢條件是台北牆上時間字串，讀回的時間轉成帶 +08:00 的 Date。 */
function harness() {
  const calls: { sql: string; values: unknown[] }[] = [];
  const query = jest.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.includes('COUNT(*)')) return [{ total: 78705 }];
    return [{ id: '1791187236.0黃雅惠', staff_id: 'A12', staff_name: '黃雅惠', create_time: '2026-10-05 08:00:36', input_type: '人臉', attend_type: 1 }];
  });
  return { store: new MariadbAttendRecordStore({ query } as never), calls };
}

describe('MariadbAttendRecordStore', () => {
  it('pages newest first and maps legacy columns', async () => {
    const h = harness();
    const { data, total } = await h.store.findPage(3, 50);
    expect(total).toBe(78705);
    expect(h.calls[0].sql).toContain('ORDER BY attend_record.create_time DESC');
    expect(h.calls[0].values).toEqual([50, 100]);
    expect(data[0]).toMatchObject({ id: '1791187236.0黃雅惠', staffId: 'A12', staffName: '黃雅惠', inputType: '人臉', attendType: 1 });
    expect(data[0].createTime.toISOString()).toBe('2026-10-05T00:00:36.000Z');
  });

  it('combines filters with wall-clock range bounds', async () => {
    const h = harness();
    await h.store.find({ staffId: 'A12', start: taipeiWallClockToDate('2026-10-01 00:00:00'), end: taipeiWallClockToDate('2026-10-05 23:59:59') });
    expect(h.calls[0].sql).toContain('WHERE staff_id = ? AND attend_record.create_time >= ? AND attend_record.create_time <= ?');
    expect(h.calls[0].values).toEqual(['A12', '2026-10-01 00:00:00', '2026-10-05 23:59:59']);
    await h.store.find({ attendType: 2 });
    expect(h.calls[1].values).toEqual([2]);
    await h.store.find({});
    expect(h.calls[2].sql).not.toContain('WHERE');
  });

  it('returns null for an unknown id', async () => {
    const query = jest.fn(async () => []);
    const store = new MariadbAttendRecordStore({ query } as never);
    expect(await store.findOne('missing')).toBeNull();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), ['missing']);
  });
});

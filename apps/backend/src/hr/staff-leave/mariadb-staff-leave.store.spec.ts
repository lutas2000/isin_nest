import { MariadbStaffLeaveStore } from './mariadb-staff-leave.store';
import { taipeiWallClockToDate } from '../taipei-time';

/**
 * 以 mock 的 MariaDB 連線驗證 SQL 參數：寫入與查詢條件一律是台北牆上時間字串，
 * 讀回的 datetime 字串轉成帶 +08:00 的 Date。
 */
function harness() {
  const calls: { sql: string; values: unknown[] }[] = [];
  const query = jest.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.startsWith('INSERT')) return { insertId: 100 + calls.filter((c) => c.sql.startsWith('INSERT')).length };
    if (sql.includes('COUNT(*)')) return [{ total: 3 }];
    if (sql.includes('SUM(time)')) return [{ total: '12.5' }];
    if (sql.includes('FROM staff_segment')) {
      return [{ id: 9, name: '張三', begain_time: '20:00:00', end_time: '05:00:00', cross_day: 1, duty: 0, night_work: 1, rest_time: 60, rest_time2: null, create_date: '2024-01-01' }];
    }
    if (sql.includes('FROM staff ')) return [{ id: 'A01', name: '張三', begain_work: '2020-03-15' }];
    if (sql.includes('FROM staff_leave')) {
      return [{ id: 5, name: '張三', type: '特休', start_time: '2026-06-01 08:00:00', end_time: '2026-06-01 17:00:00', time: 8, verify: '王主管' }];
    }
    return [];
  });
  const db = { query, transaction: jest.fn(async (work: (c: { query: typeof query }) => Promise<unknown>) => work({ query })) };
  return { store: new MariadbStaffLeaveStore(db as never), calls, db };
}

describe('MariadbStaffLeaveStore', () => {
  it('reads datetime strings as Taipei wall clock', async () => {
    const h = harness();
    const [row] = await h.store.findByName('張三');
    expect(row.id).toBe(5);
    expect(row.start_time.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(row.end_time.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    expect(row.time).toBe(8);
    expect(h.calls[0].values).toEqual(['張三']);
  });

  it('queries ranges with wall-clock strings and optional name filter', async () => {
    const h = harness();
    await h.store.findStartingBetween(taipeiWallClockToDate('2026-06-01 00:00:00'), taipeiWallClockToDate('2026-06-30 23:59:59'), '張三');
    expect(h.calls[0].sql).toContain('AND name = ?');
    expect(h.calls[0].values).toEqual(['2026-06-01 00:00:00', '2026-06-30 23:59:59', '張三']);
    await h.store.findStartingBetween(taipeiWallClockToDate('2026-06-01 00:00:00'), taipeiWallClockToDate('2026-06-30 23:59:59'));
    expect(h.calls[1].sql).not.toContain('name = ?');
    expect(h.calls[1].values).toHaveLength(2);
    expect(await h.store.sumHours('張三', '特休', taipeiWallClockToDate('2026-03-15 00:00:00'), taipeiWallClockToDate('2027-03-14 23:59:59'))).toBe(12.5);
    expect(h.calls[2].values).toEqual(['張三', '特休', '2026-03-15 00:00:00', '2027-03-14 23:59:59']);
  });

  it('inserts every row inside one transaction and returns the generated ids', async () => {
    const h = harness();
    const base = { name: '張三', type: '事假', time: 4, verify: '王主管' };
    const rows = await h.store.insertMany([
      { ...base, start_time: taipeiWallClockToDate('2026-06-01 08:00:00'), end_time: taipeiWallClockToDate('2026-06-01 12:00:00') },
      { ...base, start_time: taipeiWallClockToDate('2026-06-02 08:00:00'), end_time: taipeiWallClockToDate('2026-06-02 12:00:00') },
    ]);
    expect(h.db.transaction).toHaveBeenCalledTimes(1);
    expect(rows.map((row) => row.id)).toEqual([101, 102]);
    expect(h.calls[0].values).toEqual(['張三', '事假', '2026-06-01 08:00:00', '2026-06-01 12:00:00', 4, '王主管']);
    expect(h.calls[1].values[2]).toBe('2026-06-02 08:00:00');
  });

  it('updates and deletes by id with wall-clock values', async () => {
    const h = harness();
    const [row] = await h.store.findByName('張三');
    row.end_time = taipeiWallClockToDate('2026-06-01 12:00:00');
    row.time = 4;
    await h.store.update(row);
    expect(h.calls[1].sql).toMatch(/^UPDATE staff_leave SET/);
    expect(h.calls[1].values).toEqual(['特休', '2026-06-01 08:00:00', '2026-06-01 12:00:00', 4, '王主管', 5]);
    await h.store.delete(5);
    expect(h.calls[2].sql).toBe('DELETE FROM staff_leave WHERE id = ?');
    expect(h.calls[2].values).toEqual([5]);
  });

  it('reads staff and the latest segment as plain strings and numbers', async () => {
    const h = harness();
    expect(await h.store.findStaffByName('張三')).toEqual({ id: 'A01', name: '張三', begain_work: '2020-03-15' });
    expect(await h.store.findStaffById('A01')).toEqual({ id: 'A01', name: '張三', begain_work: '2020-03-15' });
    const segment = await h.store.latestSegment('張三', '2026-06-01');
    expect(segment).toMatchObject({ id: 9, begain_time: '20:00:00', end_time: '05:00:00', cross_day: 1, night_work: 1, rest_time: 60, rest_time2: 0 });
    expect(h.calls[2].values).toEqual(['張三', '2026-06-01']);
    expect(h.calls[2].sql).toContain('ORDER BY create_date DESC, id DESC LIMIT 1');
  });
});

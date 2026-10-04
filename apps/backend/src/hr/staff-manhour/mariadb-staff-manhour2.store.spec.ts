import { MariadbStaffManhour2Store } from './mariadb-staff-manhour2.store';
import { taipeiWallClockToDate } from '../taipei-time';

/** 以 mock 的 MariaDB 連線驗證 SQL 參數與台北牆上時間轉換。 */
function harness() {
  const calls: { sql: string; values: unknown[] }[] = [];
  const query = jest.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.startsWith('INSERT')) return { insertId: 200 + calls.filter((c) => c.sql.startsWith('INSERT')).length };
    if (sql.includes('COUNT(*)')) return [{ total: 2 }];
    if (sql.includes('FROM staff_manhour ')) {
      return [
        { start_time: '2026-06-01 07:58:00', end_time: '2026-06-01 17:03:00' },
        { start_time: '2026-06-02 08:00:00', end_time: null },
      ];
    }
    if (sql.includes('FROM staff_manhour2')) {
      return [{ id: 3, name: '張三', start_time: '2026-06-01 08:00:00', end_time: null, work_time: 0 }];
    }
    return [];
  });
  const db = { query, transaction: jest.fn(async (work: (c: { query: typeof query }) => Promise<unknown>) => work({ query })) };
  return { store: new MariadbStaffManhour2Store(db as never), calls, db };
}

describe('MariadbStaffManhour2Store', () => {
  it('reads datetime strings as Taipei wall clock and null end as undefined', async () => {
    const h = harness();
    const [row] = await h.store.findByName('張三');
    expect(row).toMatchObject({ id: 3, name: '張三', work_time: 0 });
    expect(row.start_time?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(row.end_time).toBeUndefined();
  });

  it('builds search conditions only for the given filters', async () => {
    const h = harness();
    await h.store.search(undefined, undefined, undefined);
    expect(h.calls[0].sql).not.toContain('WHERE');
    await h.store.search('張三', taipeiWallClockToDate('2026-06-01 00:00:00'), taipeiWallClockToDate('2026-06-30 23:59:59'));
    expect(h.calls[1].sql).toContain('WHERE name = ? AND start_time >= ? AND start_time <= ?');
    expect(h.calls[1].values).toEqual(['張三', '2026-06-01 00:00:00', '2026-06-30 23:59:59']);
    await h.store.search(undefined, taipeiWallClockToDate('2026-06-01 00:00:00'));
    expect(h.calls[2].sql).toContain('WHERE start_time >= ? ORDER BY');
  });

  it('inserts, updates and deletes with wall-clock strings and null end times', async () => {
    const h = harness();
    const row = await h.store.insert({ name: '張三', start_time: taipeiWallClockToDate('2026-06-05 08:00:00'), end_time: undefined, work_time: 0 });
    expect(h.db.transaction).toHaveBeenCalledTimes(1);
    expect(row.id).toBe(201);
    expect(h.calls[0].values).toEqual(['張三', '2026-06-05 08:00:00', null, 0]);
    row.end_time = taipeiWallClockToDate('2026-06-05 17:30:00');
    row.work_time = 9.5;
    await h.store.update(row);
    expect(h.calls[1].sql).toMatch(/^UPDATE staff_manhour2 SET/);
    expect(h.calls[1].values).toEqual(['2026-06-05 08:00:00', '2026-06-05 17:30:00', 9.5, 201]);
    await h.store.delete(201);
    expect(h.calls[2].sql).toBe('DELETE FROM staff_manhour2 WHERE id = ?');
    expect(h.calls[2].values).toEqual([201]);
  });

  it('reads official manhours for copying with an open end as null', async () => {
    const h = harness();
    const spans = await h.store.findManhourStartingBetween('張三', taipeiWallClockToDate('2026-06-01 00:00:00'), taipeiWallClockToDate('2026-06-30 23:59:59'));
    expect(h.calls[0].sql).toContain('FROM staff_manhour WHERE name = ? AND start_time BETWEEN ? AND ?');
    expect(h.calls[0].values).toEqual(['張三', '2026-06-01 00:00:00', '2026-06-30 23:59:59']);
    expect(spans[0].start_time.toISOString()).toBe('2026-05-31T23:58:00.000Z');
    expect(spans[1].end_time).toBeNull();
  });
});

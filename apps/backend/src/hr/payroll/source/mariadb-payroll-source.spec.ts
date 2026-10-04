import { loadPayrollSourceFromMariadb } from './mariadb-payroll-source';

describe('loadPayrollSourceFromMariadb', () => {
  function harness(variant: 'official' | 'fake') {
    const query = jest.fn(async (sql: string, _values?: unknown[]) => {
      if (sql.includes('FROM staff ')) {
        return [
          { id: 'A01', name: '張三', department: '生產部', wage: 30000, allowance: 3000, organizer: 0,
            labor_insurance: 0, health_insurance: 0, pension: 0, is_foreign: 0, benifit: 1, need_check: 1,
            have_fake: 1, begain_work: '2020-01-01', stop_work: null },
          { id: 'A02', name: '李四', department: '銷管部', wage: 40000, allowance: null, organizer: 0,
            labor_insurance: 0, health_insurance: 0, pension: 0, is_foreign: 1, benifit: 0, need_check: 0,
            have_fake: 0, begain_work: '2021-05-01', stop_work: '2026-06-15' },
        ];
      }
      if (sql.includes('FROM staff_segment')) {
        return [{ id: 7, name: '張三', begain_time: '08:00:00', end_time: '17:00:00', cross_day: 0, duty: 0,
          night_work: 1, rest_time: 60, rest_time2: null, create_date: '2020-01-01' }];
      }
      if (sql.includes('FROM staff_manhour2')) {
        return [{ name: '張三', start_time: '2026-06-01 08:00:00', end_time: '2026-06-01 16:00:00' }];
      }
      if (sql.includes('FROM staff_manhour')) {
        return [
          { name: '張三', start_time: '2026-06-01 08:00:00', end_time: '2026-06-01 19:00:00' },
          { name: '李四', start_time: '2026-06-01 09:00:00', end_time: null },
        ];
      }
      if (sql.includes('FROM staff_leave')) {
        return [{ name: '張三', type: '事假', start_time: '2026-06-02 08:00:00', end_time: '2026-06-02 12:00:00' }];
      }
      if (sql.includes('FROM staff_vacation')) {
        return [{ date: '2026-06-06', pay: 1 }, { date: '2026-06-07', pay: 0 }];
      }
      throw new Error(`unexpected sql: ${sql}`);
    });
    return { query, load: () => loadPayrollSourceFromMariadb({ query }, { start: '2026-06-01', end: '2026-06-30' }, variant) };
  }

  it('maps MariaDB rows to typed PayrollSourceData', async () => {
    const h = harness('official');
    const data = await h.load();
    expect(data.period).toEqual({ start: '2026-06-01', end: '2026-06-30' });
    expect(data.staff[0]).toMatchObject({ id: 'A01', is_foreign: false, need_check: true, have_fake: true, stop_work: null });
    expect(data.staff[1]).toMatchObject({ allowance: 0, is_foreign: true, stop_work: '2026-06-15' });
    expect(data.segments[0]).toMatchObject({ id: 7, night_work: true, rest_time2: 0 });
    expect(data.manhours).toEqual([
      { name: '張三', start_time: '2026-06-01 08:00:00', end_time: '2026-06-01 19:00:00' },
      { name: '李四', start_time: '2026-06-01 09:00:00', end_time: null },
    ]);
    expect(data.leaves).toHaveLength(1);
    expect(data.vacations).toEqual({ '2026-06-06': 1, '2026-06-07': 0 });
    expect(h.query.mock.calls.some(([sql]) => sql.includes('staff_manhour2'))).toBe(false);
    const manhourCall = h.query.mock.calls.find(([sql]) => sql.includes('FROM staff_manhour '));
    expect(manhourCall?.[1]).toEqual(['2026-06-01 00:00:00', '2026-06-30 23:59:59']);
  });

  it('fake variant swaps staff_manhour2 in for have_fake staff only', async () => {
    const data = await harness('fake').load();
    expect(data.variant).toBe('fake');
    expect(data.manhours).toEqual([
      { name: '李四', start_time: '2026-06-01 09:00:00', end_time: null },
      { name: '張三', start_time: '2026-06-01 08:00:00', end_time: '2026-06-01 16:00:00' },
    ]);
  });
});

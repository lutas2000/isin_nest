import { BadRequestException, ConflictException } from '@nestjs/common';
import { StaffLeaveService } from './staff-leave.service';
import { StaffLeave } from './entities/staff-leave.entity';

/** 以 Map 模擬 repository；時間比對一律轉回台北牆上時間。 */
function harness(options: { finalDates?: string[]; segment?: Partial<{ rest_time: number; rest_time2: number; begain_time: string; end_time: string; cross_day: number }> | null } = {}) {
  let nextId = 1;
  const stored: StaffLeave[] = [];
  const segment = options.segment === null ? null : { id: 1, name: '張三', begain_time: '08:00:00', end_time: '17:00:00', cross_day: 0, rest_time: 60, rest_time2: 60, create_date: '2020-01-01', ...options.segment };

  const leaves = {
    findOne: jest.fn(async ({ where }: { where: { id: number } }) => stored.find((row) => row.id === where.id) ?? null),
    find: jest.fn(async () => stored),
    save: jest.fn(async (row: StaffLeave) => { if (!row.id) { row.id = nextId++; stored.push(row); } return row; }),
    remove: jest.fn(async (row: StaffLeave) => { stored.splice(stored.indexOf(row), 1); }),
    createQueryBuilder: jest.fn(() => {
      const params: Record<string, unknown> = {};
      const qb = {
        select: () => qb,
        where: (_s: string, p: Record<string, unknown>) => (Object.assign(params, p), qb),
        andWhere: (_s: string, p: Record<string, unknown>) => (Object.assign(params, p), qb),
        orderBy: () => qb,
        getRawOne: async () => {
          const total = stored
            .filter((row) => row.name === params.name && row.type === params.type)
            .filter((row) => row.start_time >= (params.start as Date) && row.start_time <= (params.end as Date))
            .reduce((sum, row) => sum + row.time, 0);
          return { total: String(total) };
        },
      };
      return qb;
    }),
  };
  const staff = { findOne: jest.fn(async ({ where }: { where: { name: string } }) => (where.name === '張三' ? { id: 'A01', name: '張三', begain_work: '2020-03-15' } : null)) };
  const segments = { createQueryBuilder: jest.fn(() => { const qb = { where: () => qb, andWhere: () => qb, orderBy: () => qb, addOrderBy: () => qb, getOne: async () => segment }; return qb; }) };
  const users = { findOne: jest.fn(async ({ where }: { where: { id: number } }) => (where.id === 7 ? { id: 7, userName: 'hr', staff: { name: '王主管' } } : { id: 8, userName: 'admin', staff: null })) };
  const payroll = { hasFinalRunCovering: jest.fn(async (date: string) => (options.finalDates ?? []).includes(date)) };
  const dataSource = { transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) => work({ save: async (_entity: unknown, rows: StaffLeave[]) => Promise.all(rows.map((row) => leaves.save(row))) })) };

  const service = new StaffLeaveService(leaves as never, staff as never, segments as never, users as never, payroll as never, dataSource as never);
  return { service, stored, payroll };
}

const taipei = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

describe('StaffLeaveService', () => {
  it('creates one record per day for a cross-day leave with half-hour-floored hours and the verifier name', async () => {
    const h = harness();
    const rows = await h.service.create({ name: '張三', type: '特休', start_time: '2026-06-29 08:00', end_time: '2026-07-01 17:20' } as never, 7);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => taipei(row.start_time))).toEqual(['2026-06-29 08:00', '2026-06-30 08:00', '2026-07-01 08:00']);
    expect(rows.map((row) => taipei(row.end_time))).toEqual(['2026-06-29 17:20', '2026-06-30 17:20', '2026-07-01 17:20']);
    expect(rows.map((row) => row.time)).toEqual([8, 8, 8]); // 9h20 → 9 (捨去) − 1h 午休
    expect(rows.every((row) => row.verify === '王主管' && row.type === '特休')).toBe(true);
  });

  it('falls back to the account name when the user has no staff, and rejects unknown staff or inverted spans', async () => {
    const h = harness();
    const [row] = await h.service.create({ name: '張三', type: '病假', start_time: '2026-06-01 13:00', end_time: '2026-06-01 15:00' } as never, 8);
    expect(row.verify).toBe('admin');
    expect(row.time).toBe(2);
    await expect(h.service.create({ name: '李四', type: '病假', start_time: '2026-06-01 13:00', end_time: '2026-06-01 15:00' } as never, 8)).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.create({ name: '張三', type: '病假', start_time: '2026-06-01 15:00', end_time: '2026-06-01 13:00' } as never, 8)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to create, update or delete inside a finalized payroll period', async () => {
    const h = harness({ finalDates: ['2026-06-02'] });
    const [row] = await h.service.create({ name: '張三', type: '事假', start_time: '2026-06-03 08:00', end_time: '2026-06-03 12:00' } as never, 7);
    await expect(h.service.create({ name: '張三', type: '事假', start_time: '2026-06-01 08:00', end_time: '2026-06-02 12:00' } as never, 7)).rejects.toBeInstanceOf(ConflictException);
    await expect(h.service.update(row.id, { start_time: '2026-06-02 08:00', end_time: '2026-06-02 12:00' }, 7)).rejects.toBeInstanceOf(ConflictException);
    expect(h.stored).toHaveLength(1);
    const updated = await h.service.update(row.id, { end_time: '2026-06-03 17:00' }, 7);
    expect(updated.time).toBe(8);
    await h.service.remove(row.id);
    expect(h.stored).toHaveLength(0);
  });

  it('requires a segment to compute hours', async () => {
    const h = harness({ segment: null });
    await expect(h.service.create({ name: '張三', type: '事假', start_time: '2026-06-03 08:00', end_time: '2026-06-03 12:00' } as never, 7)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('balance sums annual leave in the anniversary period and sick leave in the calendar year', async () => {
    const h = harness();
    await h.service.create({ name: '張三', type: '特休', start_time: '2026-03-14 08:00', end_time: '2026-03-14 17:00' } as never, 7); // 前一個週年
    await h.service.create({ name: '張三', type: '特休', start_time: '2026-04-01 08:00', end_time: '2026-04-01 12:00' } as never, 7);
    await h.service.create({ name: '張三', type: '病假', start_time: '2025-12-31 08:00', end_time: '2025-12-31 17:00' } as never, 7);
    await h.service.create({ name: '張三', type: '病假', start_time: '2026-01-05 13:00', end_time: '2026-01-05 15:00' } as never, 7);
    const balance = await h.service.balance({ name: '張三', date: '2026-06-01' });
    expect(balance.annualLeave).toEqual({ periodStart: '2026-03-15', periodEnd: '2027-03-14', usedHours: 4 });
    expect(balance.sickLeave).toEqual({ year: 2026, usedHours: 2 });
  });

  it('defaults come from the latest segment including cross-day end', async () => {
    const h = harness({ segment: { begain_time: '20:00:00', end_time: '05:00:00', cross_day: 1 } });
    const defaults = await h.service.defaults('張三', '2026-06-01');
    expect(defaults).toMatchObject({ start_time: '2026-06-01 20:00:00', end_time: '2026-06-02 05:00:00' });
  });
});

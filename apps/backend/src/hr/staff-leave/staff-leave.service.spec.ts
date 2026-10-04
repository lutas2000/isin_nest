import { BadRequestException, ConflictException } from '@nestjs/common';
import { StaffLeaveService } from './staff-leave.service';
import { StaffLeave } from './entities/staff-leave.entity';
import { LeaveSegment, StaffLeaveStore } from './staff-leave.store';

/** 以陣列模擬 StaffLeaveStore；時間比對一律轉回台北牆上時間。 */
function harness(options: { finalDates?: string[]; segment?: Partial<LeaveSegment> | null } = {}) {
  let nextId = 1;
  const stored: StaffLeave[] = [];
  const segment: LeaveSegment | null = options.segment === null ? null : { id: 1, name: '張三', begain_time: '08:00:00', end_time: '17:00:00', cross_day: 0, duty: 0, night_work: 0, rest_time: 60, rest_time2: 60, create_date: '2020-01-01', ...options.segment };

  const store: StaffLeaveStore = {
    findPage: async () => ({ data: stored, total: stored.length }),
    findOne: async (id) => stored.find((row) => row.id === id) ?? null,
    findByName: async (name) => stored.filter((row) => row.name === name),
    findByType: async (type) => stored.filter((row) => row.type === type),
    findStartingBetween: async (start, end, name) => stored.filter((row) => row.start_time >= start && row.start_time <= end && (!name || row.name === name)),
    findWithin: async (start, end) => stored.filter((row) => row.start_time >= start && row.end_time <= end),
    sumHours: async (name, type, start, end) => stored
      .filter((row) => row.name === name && row.type === type && row.start_time >= start && row.start_time <= end)
      .reduce((sum, row) => sum + row.time, 0),
    insertMany: async (rows) => rows.map((row) => { const saved = Object.assign(new StaffLeave(), row, { id: nextId++ }); stored.push(saved); return saved; }),
    update: async (row) => { stored.splice(stored.findIndex((item) => item.id === row.id), 1, row); return row; },
    delete: async (id) => { stored.splice(stored.findIndex((item) => item.id === id), 1); },
    findStaffByName: async (name) => (name === '張三' ? { id: 'A01', name: '張三', begain_work: '2020-03-15' } : null),
    findStaffById: async (id) => (id === 'A01' ? { id: 'A01', name: '張三', begain_work: '2020-03-15' } : null),
    latestSegment: async () => segment,
  };
  const users = { findOne: jest.fn(async ({ where }: { where: { id: number } }) => (where.id === 7 ? { id: 7, userName: 'hr', staff: { name: '王主管' } } : { id: 8, userName: 'admin', staff: null })) };
  const payroll = { hasFinalRunCovering: jest.fn(async (date: string) => (options.finalDates ?? []).includes(date)) };

  const service = new StaffLeaveService(store, users as never, payroll as never);
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

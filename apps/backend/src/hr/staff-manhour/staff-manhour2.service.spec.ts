import { BadRequestException, ConflictException } from '@nestjs/common';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { StaffManhour2Service } from './staff-manhour2.service';
import { StaffManhour2Store } from './staff-manhour2.store';

const at = (wallClock: string) => new Date(`${wallClock.replace(' ', 'T')}:00+08:00`);

function harness(options: { finalDates?: string[]; source?: Array<{ start: string; end?: string }> } = {}) {
  let nextId = 1;
  const stored: StaffManhour2[] = [];
  const inRange = (row: StaffManhour2, start?: Date, end?: Date) =>
    !!row.start_time && (!start || row.start_time >= start) && (!end || row.start_time <= end);
  const store: StaffManhour2Store = {
    findPage: async () => ({ data: stored, total: stored.length }),
    findOne: async (id) => stored.find((row) => row.id === id) ?? null,
    findByName: async (name) => stored.filter((row) => row.name === name),
    search: async (name, start, end) => stored.filter((row) => (!name || row.name === name) && inRange(row, start, end)),
    insert: async (row) => { const saved = Object.assign(new StaffManhour2(), row, { id: nextId++ }); stored.push(saved); return saved; },
    insertMany: async (rows) => rows.map((row) => { const saved = Object.assign(new StaffManhour2(), row, { id: nextId++ }); stored.push(saved); return saved; }),
    update: async (row) => { stored.splice(stored.findIndex((item) => item.id === row.id), 1, row); return row; },
    delete: async (id) => { stored.splice(stored.findIndex((item) => item.id === id), 1); },
    findManhourStartingBetween: async () => (options.source ?? []).map((row) => ({ start_time: at(row.start), end_time: row.end ? at(row.end) : null })),
  };
  const payroll = { hasFinalRunCovering: jest.fn(async (date: string) => (options.finalDates ?? []).includes(date)) };
  const service = new StaffManhour2Service(store, payroll as never);
  return { service, stored };
}

describe('StaffManhour2Service', () => {
  it('creates, updates and deletes rows with Taipei wall-clock input', async () => {
    const h = harness();
    const row = await h.service.create({ name: '張三', start_time: '2026-06-01 08:00', end_time: '2026-06-01 17:30' });
    expect(row.start_time?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(row.work_time).toBe(9.5);
    const updated = await h.service.update(row.id, { end_time: '2026-06-01 12:00' });
    expect(updated.work_time).toBe(4);
    await expect(h.service.update(row.id, { end_time: '2026-06-01 07:00' })).rejects.toBeInstanceOf(BadRequestException);
    await h.service.remove(row.id);
    expect(h.stored).toHaveLength(0);
  });

  it('blocks changes inside a finalized payroll period', async () => {
    const h = harness({ finalDates: ['2026-06-01'] });
    await expect(h.service.create({ name: '張三', start_time: '2026-06-01 08:00' })).rejects.toBeInstanceOf(ConflictException);
    await expect(h.service.copyFromManhour({ name: '張三', from: '2026-06-01', to: '2026-06-30' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('copies official manhours into the fake table without overwriting existing starts', async () => {
    const h = harness({ source: [{ start: '2026-06-01 08:00', end: '2026-06-01 17:00' }, { start: '2026-06-02 08:00', end: '2026-06-02 17:00' }, { start: '2026-06-03 08:00' }] });
    await h.service.create({ name: '張三', start_time: '2026-06-02 08:00', end_time: '2026-06-02 16:00' });
    const result = await h.service.copyFromManhour({ name: '張三', from: '2026-06-01', to: '2026-06-30' });
    expect(result).toMatchObject({ copied: 2, skipped: 1 });
    expect(h.stored).toHaveLength(3);
    expect(h.stored.find((row) => row.start_time?.getTime() === at('2026-06-02 08:00').getTime())?.work_time).toBe(8); // 既有列未被覆寫
    expect(h.stored.find((row) => row.start_time?.getTime() === at('2026-06-03 08:00').getTime())?.work_time).toBe(0);
  });
});
